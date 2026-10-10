-- Append-only society memory cloud.
-- Officers submit source material; a bounded agent pipeline may derive context
-- entries later. Raw submissions and derived entries stay behind the service
-- role so a member cannot browse private relationship notes through RLS.
begin;

create table public.outreach_society_sources (
  id uuid primary key default gen_random_uuid(),
  society_id boolean not null default true references public.outreach_society(id),
  submitted_by uuid references auth.users(id),
  kind text not null check (kind in ('text', 'file')),
  title text not null check (length(title) between 1 and 200),
  content_text text not null default '',
  content_base64 text not null default '',
  file_name text,
  mime_type text,
  byte_size integer,
  source_date date,
  chapter text,
  relationship_hint text,
  processing_status text not null default 'queued' check (processing_status in ('queued', 'processing', 'processed', 'failed')),
  processing_error text,
  processor_version text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  check (kind = 'text' or file_name is not null),
  check (kind = 'file' or length(content_text) > 0),
  check (length(content_base64) <= 12000000)
);

create table public.outreach_society_context_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.outreach_society_sources(id) on delete cascade,
  stage text not null default 'extract' check (stage in ('extract', 'resolve', 'project')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  claim_token uuid,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, stage)
);

create table public.outreach_society_context_entries (
  id uuid primary key default gen_random_uuid(),
  society_id boolean not null default true references public.outreach_society(id),
  source_id uuid references public.outreach_society_sources(id),
  kind text not null check (kind in ('connection', 'person', 'lab', 'institution', 'project', 'opportunity', 'chapter', 'milestone', 'note')),
  title text not null check (length(title) between 1 and 240),
  summary text not null default '',
  organization text,
  person_name text,
  chapter text,
  connection_date date,
  project_url text,
  status text not null default 'possible' check (status in ('possible', 'introduced', 'connected', 'active', 'closed')),
  confidence text not null default 'unreviewed' check (confidence in ('unreviewed', 'low', 'medium', 'high')),
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outreach_society_sources_queue on public.outreach_society_sources(processing_status, created_at);
create index outreach_society_context_jobs_queue on public.outreach_society_context_jobs(status, available_at);
create index outreach_society_context_entries_date on public.outreach_society_context_entries(connection_date desc nulls last, created_at desc);
create index outreach_society_context_entries_source on public.outreach_society_context_entries(source_id);

alter table public.outreach_society_sources enable row level security;
alter table public.outreach_society_context_jobs enable row level security;
alter table public.outreach_society_context_entries enable row level security;
revoke all on public.outreach_society_sources from anon, authenticated;
revoke all on public.outreach_society_context_jobs from anon, authenticated;
revoke all on public.outreach_society_context_entries from anon, authenticated;
grant all on public.outreach_society_sources to service_role;
grant all on public.outreach_society_context_jobs to service_role;
grant all on public.outreach_society_context_entries to service_role;

create function public.outreach_society_context_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger outreach_society_context_jobs_touch
before update on public.outreach_society_context_jobs
for each row execute function public.outreach_society_context_touch();
create trigger outreach_society_context_entries_touch
before update on public.outreach_society_context_entries
for each row execute function public.outreach_society_context_touch();

commit;
