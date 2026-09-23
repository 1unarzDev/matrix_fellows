begin;

-- Field-level metadata is observed by the Worker before publication. Stamp it
-- confirmed only after the same six-hour/two-observation gate as deadlines.
create or replace function public.record_opportunity_observation(monitor_id text,item jsonb,fingerprint text)
returns boolean language plpgsql security definer set search_path='' as $$
declare monitor public.opportunity_monitors; observation public.opportunity_observations; approved boolean; confirmed_item jsonb;
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
    confirmed_item := item;
    if jsonb_typeof(item->'fieldEvidence')='array' then
      confirmed_item := jsonb_set(
        item,
        '{fieldEvidence}',
        coalesce(
          (
            select jsonb_agg(
              case when nullif(entry->>'confirmedAt','') is null
                then entry || jsonb_build_object('confirmedAt',now())
                else entry end
            )
            from jsonb_array_elements(item->'fieldEvidence') entry
          ),
          '[]'::jsonb
        )
      );
    end if;
    perform public.apply_import(jsonb_build_array(confirmed_item));
    update public.opportunity_monitors set accepted_fingerprint=record_opportunity_observation.fingerprint,
      last_success_at=now(),last_error=null where id=monitor_id;
    update public.opportunity_observations set published_at=now(),data=confirmed_item where opportunity_observations.monitor_id=record_opportunity_observation.monitor_id
      and opportunity_observations.fingerprint=record_opportunity_observation.fingerprint;
  else
    update public.opportunity_monitors set last_error=null,next_check_at=now()+interval '6 hours' where id=monitor_id;
  end if;
  return coalesce(approved,false);
end; $$;
revoke all on function public.record_opportunity_observation(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_opportunity_observation(text,jsonb,text) to service_role;

commit;
