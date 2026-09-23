begin;

create extension if not exists vector with schema extensions;

create table public.opportunity_source_registry (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  name text not null,
  authoritative_hub text not null check (authoritative_hub like 'https://%'),
  permitted_host text not null,
  permitted_path_prefix text not null default '/',
  source_type text not null check (source_type in ('official-html','official-api','directory','openreview-api')),
  parent_id text references public.opportunity_source_registry(id),
  discovery_method text not null,
  parser_version text not null,
  scope text not null,
  publication_policy text not null check (publication_policy in ('monitor-confirmed','review-required','discovery-only')),
  enabled boolean not null default true,
  reviewed_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.opportunity_source_registry enable row level security;
create policy "Owner source registry" on public.opportunity_source_registry for all to authenticated
  using (public.is_editor()) with check (public.is_editor());
revoke all on public.opportunity_source_registry from anon,authenticated;
grant select,insert,update on public.opportunity_source_registry to authenticated;
grant all on public.opportunity_source_registry to service_role;

create table public.opportunity_api_evidence (
  id bigint generated always as identity primary key,
  opportunity_id text not null,
  source_registry_id text not null references public.opportunity_source_registry(id),
  endpoint text not null check (endpoint like 'https://%'),
  object_id text not null,
  json_field text not null,
  raw_value jsonb not null,
  interpreted_at timestamptz,
  semantic_role text not null check (semantic_role in ('opens','abstract','submission','camera-ready','event','results','technical-expiry')),
  retrieved_at timestamptz not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  unique(source_registry_id,object_id,json_field,content_hash)
);
alter table public.opportunity_api_evidence enable row level security;
create policy "Owner API evidence" on public.opportunity_api_evidence for select to authenticated using(public.is_editor());
revoke all on public.opportunity_api_evidence from anon,authenticated;
grant select on public.opportunity_api_evidence to authenticated;
grant all on public.opportunity_api_evidence to service_role;

create table public.opportunity_discoveries (
  id text primary key,
  source_registry_id text not null references public.opportunity_source_registry(id),
  source_object_id text not null,
  canonical_hint text not null,
  data jsonb not null,
  evidence jsonb not null,
  review_status text not null default 'pending' check (review_status in ('pending','approved','dismissed')),
  discovered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(source_registry_id,source_object_id)
);
alter table public.opportunity_discoveries enable row level security;
create policy "Owner discoveries" on public.opportunity_discoveries for select to authenticated using(public.is_editor());
revoke all on public.opportunity_discoveries from anon,authenticated;
grant select on public.opportunity_discoveries to authenticated;
grant all on public.opportunity_discoveries to service_role;

create table public.opportunity_embeddings (
  opportunity_id text primary key references public.opportunities(id) on delete cascade,
  model text not null,
  model_version text not null,
  schema_version integer not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  embedding extensions.vector(768) not null,
  updated_at timestamptz not null default now()
);
alter table public.opportunity_embeddings enable row level security;
revoke all on public.opportunity_embeddings from anon,authenticated;
grant all on public.opportunity_embeddings to service_role;

create index opportunity_embeddings_exact_idx on public.opportunity_embeddings(opportunity_id);

create table public.opportunity_jobs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('embedding','discovery','confirmation','monitor')),
  opportunity_id text,
  source_registry_id text references public.opportunity_source_registry(id),
  status text not null default 'queued' check (status in ('queued','running','complete','failed')),
  priority integer not null default 50,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  last_error text,
  payload jsonb not null default '{}',
  unique(kind,opportunity_id,source_registry_id)
);
alter table public.opportunity_jobs enable row level security;
create policy "Owner opportunity jobs" on public.opportunity_jobs for select to authenticated using(public.is_editor());
revoke all on public.opportunity_jobs from anon,authenticated;
grant select on public.opportunity_jobs to authenticated;
grant all on public.opportunity_jobs to service_role;

create or replace function public.opportunity_queue_health()
returns table(kind text,queued bigint,running bigint,failed bigint,oldest_queued_at timestamptz)
language sql stable security definer set search_path='' as $$
  select j.kind,
    count(*) filter(where status='queued'),
    count(*) filter(where status='running'),
    count(*) filter(where status='failed'),
    min(available_at) filter(where status='queued')
  from public.opportunity_jobs j group by j.kind;
$$;
revoke all on function public.opportunity_queue_health() from public,anon;
grant execute on function public.opportunity_queue_health() to authenticated,service_role;

commit;
