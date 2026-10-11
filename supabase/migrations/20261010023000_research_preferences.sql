begin;
create table public.research_preferences (
 user_id uuid primary key references public.outreach_members(user_id),
 lens text not null default 'nearby' check(lens in('nearby','remote','travel')),
 reachable_locations text[] not null default array['Arlington'],
 updated_at timestamptz not null default now(),
 check(cardinality(reachable_locations)<=20)
);
alter table public.research_preferences enable row level security;
create policy research_preferences_owner on public.research_preferences for select to authenticated using(user_id=(select auth.uid()) and public.outreach_is_member());
grant select on public.research_preferences to authenticated;
grant all on public.research_preferences to service_role;
commit;
