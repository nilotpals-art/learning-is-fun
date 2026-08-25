alter table public.learning_planner_holiday_settings
  add column if not exists portal_theme_enabled boolean not null default false;
