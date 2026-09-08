begin;
-- Save optional club feedback; existing responses and retry semantics are preserved.
create or replace function public.submit_join_response(payload jsonb, rate_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare attempts integer;
begin
  delete from public.join_rate_limits where started_at < now() - interval '2 hours';
  insert into public.join_rate_limits as limits (key) values (rate_key)
  on conflict (key) do update set
    attempts = case when limits.started_at < now() - interval '1 hour' then 1 else limits.attempts + 1 end,
    started_at = case when limits.started_at < now() - interval '1 hour' then now() else limits.started_at end
  returning limits.attempts into attempts;
  if attempts > 120 then raise exception 'Please try again later.' using errcode = 'P0001'; end if;
  if payload->>'grade' is null or payload->>'grade' not in ('9th grade', '10th grade', '11th grade', '12th grade', 'Other / not in high school') then
    raise exception 'Invalid grade';
  end if;
  insert into public.join_responses (request_id, name, email, school, grade, interests, goals, stage, note)
  values ((payload->>'requestId')::uuid, payload->>'name', lower(payload->>'email'), 'Not collected', payload->>'grade',
    array(select jsonb_array_elements_text(payload->'interests')),
    array(select jsonb_array_elements_text(payload->'goals')), payload->>'stage', coalesce(payload->>'note', ''))
  on conflict do nothing;
end; $$;
commit;
