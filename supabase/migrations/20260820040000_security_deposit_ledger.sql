-- Refundable Security Deposit ledger with controlled adjustment against pending fees.
create table if not exists public.student_security_deposit_entries (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  source_payment_id uuid references public.fee_payments(id) on delete set null,
  source_due_id uuid references public.student_fee_dues(id) on delete set null,
  entry_type text not null check (entry_type in ('credit','adjustment','refund','reversal')),
  amount numeric(12,2) not null check (amount > 0),
  target_due_id uuid references public.student_fee_dues(id) on delete set null,
  reference_no text,
  remarks text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists student_security_deposit_entries_student_idx on public.student_security_deposit_entries(institute_id,student_id,created_at);
create unique index if not exists student_security_deposit_credit_unique on public.student_security_deposit_entries(source_payment_id,source_due_id,entry_type) where entry_type in ('credit','reversal');
alter table public.student_security_deposit_entries enable row level security;
drop policy if exists security_deposit_admin_select on public.student_security_deposit_entries;
create policy security_deposit_admin_select on public.student_security_deposit_entries for select to authenticated using (institute_id in (select p.institute_id from public.profiles p where p.id=(select auth.uid()) and p.is_active is true and p.role in ('admin','Super Admin')));
drop policy if exists security_deposit_admin_insert on public.student_security_deposit_entries;
create policy security_deposit_admin_insert on public.student_security_deposit_entries for insert to authenticated with check (institute_id in (select p.institute_id from public.profiles p where p.id=(select auth.uid()) and p.is_active is true and p.role in ('admin','Super Admin')));
grant select,insert on public.student_security_deposit_entries to authenticated;

create or replace function public.security_deposit_balance(p_student_id uuid) returns numeric language sql stable security invoker set search_path=public as $$
 select coalesce(sum(case when entry_type='credit' then amount else -amount end),0)::numeric from public.student_security_deposit_entries where student_id=p_student_id;
$$;
grant execute on function public.security_deposit_balance(uuid) to authenticated;

create or replace function public.fee_due_outstanding(p_due_id uuid) returns numeric language sql stable set search_path='' as $$
 select greatest(d.net_amount-coalesce(sum(a.amount) filter(where p.status='posted'),0)-coalesce((select sum(s.amount) from public.student_security_deposit_entries s where s.target_due_id=d.id and s.entry_type='adjustment'),0),0)
 from public.student_fee_dues d left join public.fee_payment_allocations a on a.student_fee_due_id=d.id and a.institute_id=d.institute_id left join public.fee_payments p on p.id=a.fee_payment_id and p.institute_id=a.institute_id where d.id=p_due_id group by d.id,d.net_amount;
$$;

create or replace function public.capture_security_deposit_credit() returns trigger language plpgsql security definer set search_path='' as $$
declare v_nature text; v_student uuid; v_status text;
begin
 select h.fee_nature,d.student_id,p.status into v_nature,v_student,v_status from public.student_fee_dues d join public.fee_heads h on h.id=d.fee_head_id join public.fee_payments p on p.id=new.fee_payment_id where d.id=new.student_fee_due_id;
 if v_nature='refundable_deposit' and v_status='posted' then insert into public.student_security_deposit_entries(institute_id,student_id,source_payment_id,source_due_id,entry_type,amount,created_by) values(new.institute_id,v_student,new.fee_payment_id,new.student_fee_due_id,'credit',new.amount,(select received_by from public.fee_payments where id=new.fee_payment_id)) on conflict do nothing; end if;
 return new;
end;$$;
drop trigger if exists capture_security_deposit_credit_trigger on public.fee_payment_allocations;
create trigger capture_security_deposit_credit_trigger after insert on public.fee_payment_allocations for each row execute function public.capture_security_deposit_credit();

create or replace function public.capture_security_deposit_reversal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='posted' and new.status='reversed' then insert into public.student_security_deposit_entries(institute_id,student_id,source_payment_id,source_due_id,entry_type,amount,remarks,created_by) select c.institute_id,c.student_id,c.source_payment_id,c.source_due_id,'reversal',c.amount,coalesce(new.reversal_reason,'Payment reversed'),new.reversed_by from public.student_security_deposit_entries c where c.source_payment_id=new.id and c.entry_type='credit' on conflict do nothing; end if;
 return new;
end;$$;
drop trigger if exists capture_security_deposit_reversal_trigger on public.fee_payments;
create trigger capture_security_deposit_reversal_trigger after update of status on public.fee_payments for each row execute function public.capture_security_deposit_reversal();

create or replace function public.adjust_security_deposit_to_due(p_student_id uuid,p_due_id uuid,p_amount numeric,p_remarks text default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_institute uuid; v_due record; v_balance numeric; v_outstanding numeric;
begin
 select institute_id into v_institute from public.profiles where id=v_uid and is_active is true and role in ('admin','Super Admin'); if v_institute is null then raise exception 'FEES_UNAUTHORIZED'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'SECURITY_DEPOSIT_AMOUNT_INVALID'; end if;
 select d.id,d.student_id,h.fee_nature into v_due from public.student_fee_dues d join public.fee_heads h on h.id=d.fee_head_id where d.id=p_due_id and d.student_id=p_student_id and d.institute_id=v_institute for update; if not found then raise exception 'SECURITY_DEPOSIT_DUE_INVALID'; end if;
 if v_due.fee_nature='refundable_deposit' then raise exception 'SECURITY_DEPOSIT_TARGET_INVALID'; end if;
 select public.security_deposit_balance(p_student_id),public.fee_due_outstanding(p_due_id) into v_balance,v_outstanding; if v_balance<p_amount then raise exception 'SECURITY_DEPOSIT_INSUFFICIENT'; end if; if v_outstanding<=0 then raise exception 'FEES_DUE_NOT_OUTSTANDING'; end if; if p_amount>v_outstanding then raise exception 'SECURITY_DEPOSIT_EXCEEDS_DUE'; end if;
 insert into public.student_security_deposit_entries(institute_id,student_id,entry_type,amount,target_due_id,remarks,created_by) values(v_institute,p_student_id,'adjustment',p_amount,p_due_id,nullif(btrim(p_remarks),''),v_uid); perform public.fee_recalculate_due_status(p_due_id);
 return jsonb_build_object('remainingDeposit',public.security_deposit_balance(p_student_id),'remainingDue',public.fee_due_outstanding(p_due_id));
end;$$;
grant execute on function public.adjust_security_deposit_to_due(uuid,uuid,numeric,text) to authenticated;

create or replace function public.refund_security_deposit(p_student_id uuid,p_amount numeric,p_reference_no text default null,p_remarks text default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_institute uuid; v_balance numeric;
begin
 select institute_id into v_institute from public.profiles where id=v_uid and is_active is true and role in ('admin','Super Admin'); if v_institute is null then raise exception 'FEES_UNAUTHORIZED'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'SECURITY_DEPOSIT_AMOUNT_INVALID'; end if; if not exists(select 1 from public.students where id=p_student_id and institute_id=v_institute) then raise exception 'SECURITY_DEPOSIT_STUDENT_INVALID'; end if;
 select public.security_deposit_balance(p_student_id) into v_balance; if v_balance<p_amount then raise exception 'SECURITY_DEPOSIT_INSUFFICIENT'; end if;
 insert into public.student_security_deposit_entries(institute_id,student_id,entry_type,amount,reference_no,remarks,created_by) values(v_institute,p_student_id,'refund',p_amount,nullif(btrim(p_reference_no),''),nullif(btrim(p_remarks),''),v_uid);
 return jsonb_build_object('remainingDeposit',public.security_deposit_balance(p_student_id));
end;$$;
grant execute on function public.refund_security_deposit(uuid,numeric,text,text) to authenticated;

insert into public.student_security_deposit_entries(institute_id,student_id,source_payment_id,source_due_id,entry_type,amount,created_by,created_at)
select a.institute_id,p.student_id,p.id,d.id,'credit',a.amount,p.received_by,p.created_at from public.fee_payment_allocations a join public.fee_payments p on p.id=a.fee_payment_id and p.status='posted' join public.student_fee_dues d on d.id=a.student_fee_due_id join public.fee_heads h on h.id=d.fee_head_id and h.fee_nature='refundable_deposit' on conflict do nothing;
