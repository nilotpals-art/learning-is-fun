create table if not exists public.admin_notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete restrict,
  notification_id uuid not null,
  notification_type text not null,
  audience text not null check (audience in ('students','parents','both')),
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  portal_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  batch_ids uuid[] not null default '{}',
  student_ids uuid[] not null default '{}',
  resolved_student_count integer not null default 0,
  portal_recipient_count integer not null default 0,
  whatsapp_recipient_count integer not null default 0,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint admin_notification_campaign_notification_fkey foreign key (notification_id,institute_id) references public.notifications(id,institute_id) on delete restrict,
  constraint admin_notification_campaign_creator_fkey foreign key (created_by,institute_id) references public.profiles(id,institute_id) on delete restrict
);

create table if not exists public.admin_notification_whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete restrict,
  campaign_id uuid not null references public.admin_notification_campaigns(id) on delete cascade,
  notification_id uuid not null,
  user_id uuid,
  recipient_role text not null check (recipient_role in ('Student','Parent')),
  student_id uuid references public.students(id) on delete restrict,
  parent_id uuid references public.parents(id) on delete restrict,
  phone_number text not null,
  message text not null,
  status text not null default 'queued' check (status in ('queued','processing','sent','failed','skipped')),
  provider text,
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_notification_whatsapp_notification_fkey foreign key (notification_id,institute_id) references public.notifications(id,institute_id) on delete restrict
);

create index if not exists admin_notification_campaigns_institute_created_idx on public.admin_notification_campaigns(institute_id,created_at desc);
create index if not exists admin_notification_whatsapp_outbox_campaign_idx on public.admin_notification_whatsapp_outbox(campaign_id,status);

alter table public.admin_notification_campaigns enable row level security;
alter table public.admin_notification_whatsapp_outbox enable row level security;

create policy admin_notification_campaigns_admin_select on public.admin_notification_campaigns for select to authenticated using (
  exists(select 1 from public.profiles p left join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.institute_id=admin_notification_campaigns.institute_id and p.is_active is true and coalesce(nullif(btrim(p.role),''),r.name) in ('admin','Super Admin','Institute Admin'))
);
create policy admin_notification_whatsapp_admin_select on public.admin_notification_whatsapp_outbox for select to authenticated using (
  exists(select 1 from public.profiles p left join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.institute_id=admin_notification_whatsapp_outbox.institute_id and p.is_active is true and coalesce(nullif(btrim(p.role),''),r.name) in ('admin','Super Admin','Institute Admin'))
);

create or replace function public.send_admin_notification_campaign(
  p_notification_type text,
  p_title text,
  p_message text,
  p_priority text,
  p_audience text,
  p_batch_ids uuid[] default '{}',
  p_student_ids uuid[] default '{}',
  p_portal_enabled boolean default true,
  p_whatsapp_enabled boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_profile public.profiles%rowtype;
  v_role text;
  v_notification_id uuid;
  v_campaign_id uuid;
  v_student_count integer := 0;
  v_portal_count integer := 0;
  v_whatsapp_count integer := 0;
begin
  select p.*, coalesce(nullif(btrim(p.role),''),r.name) into v_profile, v_role
  from public.profiles p left join public.roles r on r.id=p.role_id
  where p.id=auth.uid() and p.is_active is true;
  if v_profile.id is null or v_profile.institute_id is null or v_role not in ('admin','Super Admin','Institute Admin') then raise exception 'ADMIN_NOTIFICATION_UNAUTHORIZED'; end if;
  if p_audience not in ('students','parents','both') then raise exception 'ADMIN_NOTIFICATION_AUDIENCE_INVALID'; end if;
  if p_priority not in ('normal','important','urgent') then raise exception 'ADMIN_NOTIFICATION_PRIORITY_INVALID'; end if;
  if not coalesce(p_portal_enabled,false) and not coalesce(p_whatsapp_enabled,false) then raise exception 'ADMIN_NOTIFICATION_CHANNEL_REQUIRED'; end if;
  if nullif(btrim(p_title),'') is null or nullif(btrim(p_message),'') is null then raise exception 'ADMIN_NOTIFICATION_MESSAGE_REQUIRED'; end if;
  if coalesce(cardinality(p_batch_ids),0)=0 and coalesce(cardinality(p_student_ids),0)=0 then raise exception 'ADMIN_NOTIFICATION_TARGET_REQUIRED'; end if;

  create temporary table if not exists pg_temp.admin_notification_students(student_id uuid primary key) on commit drop;
  truncate pg_temp.admin_notification_students;
  insert into pg_temp.admin_notification_students(student_id)
  select distinct s.id
  from public.students s
  where s.institute_id=v_profile.institute_id and s.status='Active' and (
    s.id=any(coalesce(p_student_ids,'{}'::uuid[])) or exists(
      select 1 from public.student_assignments sa
      where sa.institute_id=s.institute_id and sa.student_id=s.id and sa.batch_id=any(coalesce(p_batch_ids,'{}'::uuid[])) and sa.status='Current' and sa.effective_to is null
    )
  );
  select count(*) into v_student_count from pg_temp.admin_notification_students;
  if v_student_count=0 then raise exception 'ADMIN_NOTIFICATION_NO_RECIPIENTS'; end if;

  insert into public.notifications(institute_id,schedule_event_id,notification_type,title,message,priority,created_by)
  values(v_profile.institute_id,null,p_notification_type,btrim(p_title),btrim(p_message),p_priority,v_profile.id)
  returning id into v_notification_id;

  insert into public.admin_notification_campaigns(institute_id,notification_id,notification_type,audience,priority,portal_enabled,whatsapp_enabled,batch_ids,student_ids,resolved_student_count,created_by)
  values(v_profile.institute_id,v_notification_id,p_notification_type,p_audience,p_priority,p_portal_enabled,p_whatsapp_enabled,coalesce(p_batch_ids,'{}'),coalesce(p_student_ids,'{}'),v_student_count,v_profile.id)
  returning id into v_campaign_id;

  if p_portal_enabled and p_audience in ('students','both') then
    insert into public.notification_recipients(institute_id,notification_id,user_id,recipient_role,delivery_channel,delivery_status,sent_at)
    select v_profile.institute_id,v_notification_id,s.profile_id,'Student','in_app','sent',now()
    from public.students s join pg_temp.admin_notification_students t on t.student_id=s.id
    where s.profile_id is not null
    on conflict(notification_id,user_id,delivery_channel) do nothing;
    get diagnostics v_portal_count = row_count;
  end if;
  if p_portal_enabled and p_audience in ('parents','both') then
    insert into public.notification_recipients(institute_id,notification_id,user_id,recipient_role,delivery_channel,delivery_status,sent_at)
    select distinct v_profile.institute_id,v_notification_id,pa.profile_id,'Parent','in_app','sent',now()
    from pg_temp.admin_notification_students t join public.student_parent_links spl on spl.student_id=t.student_id and spl.institute_id=v_profile.institute_id join public.parents pa on pa.id=spl.parent_id and pa.institute_id=spl.institute_id
    where pa.is_active is true and pa.profile_id is not null
    on conflict(notification_id,user_id,delivery_channel) do nothing;
    get diagnostics v_student_count = row_count;
    v_portal_count := v_portal_count + v_student_count;
  end if;

  if p_whatsapp_enabled and p_audience in ('students','both') then
    insert into public.admin_notification_whatsapp_outbox(institute_id,campaign_id,notification_id,user_id,recipient_role,student_id,phone_number,message)
    select v_profile.institute_id,v_campaign_id,v_notification_id,s.profile_id,'Student',s.id,btrim(s.mobile),btrim(p_message)
    from public.students s join pg_temp.admin_notification_students t on t.student_id=s.id where nullif(btrim(s.mobile),'') is not null;
    get diagnostics v_whatsapp_count = row_count;
  end if;
  if p_whatsapp_enabled and p_audience in ('parents','both') then
    insert into public.admin_notification_whatsapp_outbox(institute_id,campaign_id,notification_id,user_id,recipient_role,student_id,parent_id,phone_number,message)
    select distinct v_profile.institute_id,v_campaign_id,v_notification_id,pa.profile_id,'Parent',t.student_id,pa.id,btrim(pa.mobile),btrim(p_message)
    from pg_temp.admin_notification_students t join public.student_parent_links spl on spl.student_id=t.student_id and spl.institute_id=v_profile.institute_id join public.parents pa on pa.id=spl.parent_id and pa.institute_id=spl.institute_id
    where pa.is_active is true and nullif(btrim(pa.mobile),'') is not null;
    get diagnostics v_student_count = row_count;
    v_whatsapp_count := v_whatsapp_count + v_student_count;
  end if;

  update public.admin_notification_campaigns set portal_recipient_count=v_portal_count, whatsapp_recipient_count=v_whatsapp_count where id=v_campaign_id;
  return jsonb_build_object('campaign_id',v_campaign_id,'notification_id',v_notification_id,'student_count',(select count(*) from pg_temp.admin_notification_students),'portal_recipient_count',v_portal_count,'whatsapp_recipient_count',v_whatsapp_count);
end;$function$;

revoke all on function public.send_admin_notification_campaign(text,text,text,text,text,uuid[],uuid[],boolean,boolean) from public;
grant execute on function public.send_admin_notification_campaign(text,text,text,text,text,uuid[],uuid[],boolean,boolean) to authenticated;
