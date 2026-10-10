begin;

-- Member-submitted links are kept separate from the public catalog. A shared
-- candidate can be bridged to the existing unpublished discovery queue, while
-- a personal candidate remains usable only by its submitting member.
create table public.dashboard_opportunity_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.outreach_members(user_id) on delete cascade,
  url text not null check(length(url) between 12 and 2000),
  disposition text not null check(disposition in ('personal','shared-review','rejected')),
  title text not null check(length(title) between 1 and 240),
  reason text not null check(length(reason) <= 1200),
  confidence numeric check(confidence >= 0 and confidence <= 1),
  source jsonb not null default '{}',
  candidate jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,url)
);

create table public.dashboard_personal_opportunities (
  id text primary key check(id like 'personal:%'),
  intake_id uuid not null unique references public.dashboard_opportunity_intakes(id) on delete cascade,
  user_id uuid not null references public.outreach_members(user_id) on delete cascade,
  url text not null check(length(url) between 12 and 2000),
  data jsonb not null check(jsonb_typeof(data)='object'),
  created_at timestamptz not null default now(),
  unique(user_id,url)
);

alter table public.dashboard_opportunity_intakes enable row level security;
alter table public.dashboard_personal_opportunities enable row level security;
revoke all on public.dashboard_opportunity_intakes, public.dashboard_personal_opportunities from public,anon,authenticated;
grant select on public.dashboard_opportunity_intakes, public.dashboard_personal_opportunities to authenticated;
grant all on public.dashboard_opportunity_intakes, public.dashboard_personal_opportunities to service_role;
create policy dashboard_intake_owner on public.dashboard_opportunity_intakes for select to authenticated
  using(user_id=(select auth.uid()) and public.outreach_is_member());
create policy dashboard_personal_opportunity_owner on public.dashboard_personal_opportunities for select to authenticated
  using(user_id=(select auth.uid()) and public.outreach_is_member());

commit;
