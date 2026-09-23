begin;
create or replace function public.opportunity_queue_health()
returns table(kind text,queued bigint,running bigint,failed bigint,oldest_queued_at timestamptz)
language sql stable security definer set search_path='' as $$
  select j.kind,
    count(*) filter(where status='queued'),
    count(*) filter(where status='running'),
    count(*) filter(where status='failed'),
    min(available_at) filter(where status='queued')
  from public.opportunity_jobs j
  where public.is_editor()
  group by j.kind;
$$;
commit;
