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

-- The society memory worker uses the same fenced, bounded-stage pattern as
-- outreach research. Raw source material never enters a model prompt here;
-- the first release performs a local structured extraction pass.
create or replace function public.outreach_claim_society_context_jobs(p_worker text, p_limit integer default 2)
returns setof public.outreach_society_context_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.outreach_society_context_jobs j
  set status = 'running', attempts = j.attempts + 1,
      claim_token = gen_random_uuid(), lease_until = now() + interval '5 minutes',
      updated_at = now()
  where j.id in (
    select q.id
    from public.outreach_society_context_jobs q
    join public.outreach_society_sources s on s.id = q.source_id
    where q.stage = 'extract'
      and (q.status = 'queued' or (q.status = 'running' and q.lease_until < now()))
      and q.attempts < 3 and s.processing_status in ('queued', 'processing')
    order by q.created_at
    for update of q skip locked
    limit greatest(1, least(coalesce(p_limit, 2), 5))
  )
  returning j.*;
end $$;

create or replace function public.outreach_finish_society_context_job(
  p_id uuid, p_claim_token uuid, p_result jsonb, p_error text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare j public.outreach_society_context_jobs; e jsonb;
begin
  select * into j from public.outreach_society_context_jobs
  where id = p_id and claim_token = p_claim_token and status = 'running'
    and lease_until > now() for update;
  if not found then return false; end if;
  if p_error is null then
    for e in select value from jsonb_array_elements(coalesce(p_result->'entries', '[]'::jsonb)) loop
      insert into public.outreach_society_context_entries(
        source_id, kind, title, summary, organization, person_name, chapter,
        connection_date, project_url, status, confidence, metadata, created_by
      ) values (
        j.source_id,
        coalesce(nullif(e->>'kind',''), 'note'),
        left(coalesce(nullif(e->>'title',''), 'Society context'), 240),
        left(coalesce(e->>'summary',''), 4000), nullif(e->>'organization',''),
        nullif(e->>'personName',''), nullif(e->>'chapter',''),
        case when e->>'connectionDate' ~ '^\\d{4}-\\d{2}-\\d{2}$' then (e->>'connectionDate')::date else null end,
        nullif(e->>'projectUrl',''), coalesce(nullif(e->>'status',''), 'possible'),
        coalesce(nullif(e->>'confidence',''), 'unreviewed'), coalesce(e->'metadata','{}'::jsonb),
        (select submitted_by from public.outreach_society_sources where id=j.source_id)
      );
    end loop;
    update public.outreach_society_sources set processing_status='processed', processing_error=null, processed_at=now() where id=j.source_id;
    update public.outreach_society_context_jobs set status='completed', result=p_result, error=null, claim_token=null, lease_until=null, updated_at=now() where id=j.id;
  else
    update public.outreach_society_sources set processing_status=case when j.attempts < 3 then 'processing' else 'failed' end, processing_error=left(p_error,1000) where id=j.source_id;
    update public.outreach_society_context_jobs set status=case when j.attempts < 3 then 'queued' else 'failed' end, error=left(p_error,1000), claim_token=null, lease_until=null, available_at=now()+make_interval(mins=>greatest(1,j.attempts*2)), updated_at=now() where id=j.id;
  end if;
  return true;
end $$;

revoke all on function public.outreach_claim_society_context_jobs(text, integer), public.outreach_finish_society_context_job(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.outreach_claim_society_context_jobs(text, integer), public.outreach_finish_society_context_job(uuid, uuid, jsonb, text) to service_role;
