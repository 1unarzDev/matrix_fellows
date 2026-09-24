begin;

-- Editorial inclusion is stored separately from monitored opportunity facts.
-- This lets imports move verified dates without overwriting an organizer's
-- decision about which routes belong on the club calendar.
create table if not exists public.calendar_opportunity_selections (
  opportunity_id text primary key check (length(opportunity_id) between 1 and 650),
  enabled boolean not null default true,
  include_deadlines boolean not null default true,
  include_events boolean not null default true,
  priority smallint not null default 50 check (priority between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (include_deadlines or include_events)
);

alter table public.calendar_opportunity_selections enable row level security;
drop policy if exists "Public enabled calendar selections" on public.calendar_opportunity_selections;
create policy "Public enabled calendar selections"
  on public.calendar_opportunity_selections for select to anon using (enabled);
drop policy if exists "Owner calendar selections" on public.calendar_opportunity_selections;
create policy "Owner calendar selections"
  on public.calendar_opportunity_selections for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

revoke all on public.calendar_opportunity_selections from public, anon, authenticated;
grant select (opportunity_id,enabled,include_deadlines,include_events,priority)
  on public.calendar_opportunity_selections to anon;
grant select,insert,update,delete on public.calendar_opportunity_selections to authenticated;
grant all on public.calendar_opportunity_selections to service_role;

drop trigger if exists calendar_opportunity_selections_updated
  on public.calendar_opportunity_selections;
create trigger calendar_opportunity_selections_updated
before update on public.calendar_opportunity_selections
for each row execute function public.touch_updated_at();

insert into public.calendar_opportunity_selections
  (opportunity_id,enabled,include_deadlines,include_events,priority)
values
  ('catalog:fort-worth-regional-science-fair',true,true,true,100),
  ('catalog:txsef',true,true,true,99),
  ('isef-2027:main',true,true,true,98),
  ('catalog:hosa-medical-innovation-2026-27',true,true,true,93),
  ('catalog:conrad-challenge',true,true,true,96),
  ('catalog:jshs',true,true,true,95),
  ('catalog:texas-jshs',true,true,true,97),
  ('davidson-fellows-2027:main',true,true,true,95),
  ('catalog:rsi',true,true,true,91),
  ('catalog:mit-bwsi-2027',true,true,true,90),
  ('catalog:mites-summer',true,true,true,89),
  ('catalog:clark-scholars-2026',true,true,true,88),
  ('catalog:promys',true,true,true,87),
  ('catalog:iowa-sstp-2027',true,true,true,86),
  ('catalog:stanford-simr',true,true,true,85),
  ('catalog:navy-seap-2027',true,true,true,94),
  ('catalog:bu-rise',true,true,true,84),
  ('catalog:cmu-ai-scholars-2027',true,true,true,83)
on conflict (opportunity_id) do nothing;

commit;
