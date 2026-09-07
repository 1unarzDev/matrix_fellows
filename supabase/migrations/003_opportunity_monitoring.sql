begin;
create table public.opportunity_monitors (
  id text primary key,
  url text not null unique check (url like 'https://%'),
  seed jsonb not null,
  enabled boolean not null default true,
  discovered boolean not null default false,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  next_check_at timestamptz not null default now(),
  last_error text,
  accepted_fingerprint text,
  created_at timestamptz not null default now()
);
create table public.opportunity_observations (
  monitor_id text not null references public.opportunity_monitors(id),
  fingerprint text not null,
  data jsonb not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  observations integer not null default 1,
  published_at timestamptz,
  primary key(monitor_id,fingerprint)
);
alter table public.opportunity_monitors enable row level security;
alter table public.opportunity_observations enable row level security;
create policy "Owner monitors" on public.opportunity_monitors for all to authenticated using(public.is_editor()) with check(public.is_editor());
create policy "Owner observations" on public.opportunity_observations for select to authenticated using(public.is_editor());
revoke all on public.opportunity_monitors,public.opportunity_observations from anon,authenticated;
grant select,update on public.opportunity_monitors to authenticated;
grant select on public.opportunity_observations to authenticated;
grant all on public.opportunity_monitors,public.opportunity_observations to service_role;

create function public.claim_opportunity_monitors(batch_size integer default 8)
returns setof public.opportunity_monitors language sql security definer set search_path='' as $$
  update public.opportunity_monitors set last_attempt_at=now(),next_check_at=now()+interval '24 hours'
  where id in (select id from public.opportunity_monitors where enabled and next_check_at<=now()
    order by next_check_at limit least(greatest(batch_size,1),10) for update skip locked)
  returning *;
$$;
revoke all on function public.claim_opportunity_monitors(integer) from public,anon,authenticated;
grant execute on function public.claim_opportunity_monitors(integer) to service_role;

-- Only evidence-validated Worker output crosses this seam. Two observations,
-- separated by six hours, are required before changed/new facts auto-publish.
create function public.record_opportunity_observation(monitor_id text,item jsonb,fingerprint text)
returns boolean language plpgsql security definer set search_path='' as $$
declare monitor public.opportunity_monitors; observation public.opportunity_observations; approved boolean;
begin
  select * into monitor from public.opportunity_monitors where id=monitor_id for update;
  if not found or not monitor.enabled then raise exception 'Monitor not enabled'; end if;
  if item->>'id' is distinct from monitor.seed->>'id' or item->>'sourceId' is distinct from monitor.seed->>'sourceId'
    or item->>'externalId' is distinct from monitor.seed->>'externalId'
    or fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Invalid observation identity'; end if;
  insert into public.opportunity_observations as observations(monitor_id,fingerprint,data)
  values(monitor_id,fingerprint,item)
  on conflict on constraint opportunity_observations_pkey do update
    set last_seen=now(),observations=observations.observations+1,data=excluded.data
  returning * into observation;
  approved := monitor.accepted_fingerprint=fingerprint or
    (observation.observations>=2 and observation.first_seen<=now()-interval '6 hours');
  if coalesce(approved,false) then
    if exists(select 1 from public.opportunities where canonical_url=item->>'url' and id<>item->>'id') then raise exception 'Duplicate canonical listing'; end if;
    perform public.apply_import(jsonb_build_array(item));
    update public.opportunity_monitors set accepted_fingerprint=record_opportunity_observation.fingerprint,
      last_success_at=now(),last_error=null where id=monitor_id;
    update public.opportunity_observations set published_at=now() where opportunity_observations.monitor_id=record_opportunity_observation.monitor_id
      and opportunity_observations.fingerprint=record_opportunity_observation.fingerprint;
  else
    update public.opportunity_monitors set last_error=null,next_check_at=now()+interval '6 hours' where id=monitor_id;
  end if;
  return coalesce(approved,false);
end; $$;
revoke all on function public.record_opportunity_observation(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_opportunity_observation(text,jsonb,text) to service_role;

-- Public callers receive health, never credentials, raw errors or pending facts.
create function public.opportunity_monitor_health()
returns table(id text,last_checked_at timestamptz,last_success_at timestamptz,issue boolean)
language sql stable security definer set search_path='' as $$
  select m.seed->>'id',m.last_attempt_at,m.last_success_at,(m.last_error is not null or not m.enabled)
  from public.opportunity_monitors m where exists(select 1 from public.opportunities o where o.id=m.seed->>'id' and o.published and not o.suppressed);
$$;
revoke all on function public.opportunity_monitor_health() from public;
grant execute on function public.opportunity_monitor_health() to anon,authenticated,service_role;
commit;
