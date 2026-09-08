begin;
-- Preserve legacy fields without collecting them in the lean form.
alter table public.join_responses add column grade text not null default 'Not specified';
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
  if attempts > 10 then raise exception 'Please try again later.' using errcode = 'P0001'; end if;
  if payload->>'grade' is null or payload->>'grade' not in ('9th grade', '10th grade', '11th grade', '12th grade', 'Other / not in high school') then
    raise exception 'Invalid grade';
  end if;
  insert into public.join_responses (request_id, name, email, school, grade, interests, goals, stage, note)
  values ((payload->>'requestId')::uuid, payload->>'name', lower(payload->>'email'), 'Not collected', payload->>'grade',
    array(select jsonb_array_elements_text(payload->'interests')),
    array(select jsonb_array_elements_text(payload->'goals')), payload->>'stage', '')
  on conflict do nothing;
end; $$;
create or replace function public.join_response_analytics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_editor() then raise exception 'Unauthorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'total', (select count(*) from public.join_responses),
    'recent', (select count(*) from public.join_responses where created_at > now() - interval '30 days'),
    'interests', (select coalesce(jsonb_agg(t), '[]') from (select unnest(interests) as label, count(*) as count from public.join_responses group by label order by count(*) desc) t),
    'stages', (select coalesce(jsonb_agg(t), '[]') from (select stage as label, count(*) as count from public.join_responses group by stage order by count(*) desc) t),
    'grades', (select coalesce(jsonb_agg(t), '[]') from (select grade as label, count(*) as count from public.join_responses group by grade order by grade) t),
    'goals', (select coalesce(jsonb_agg(t), '[]') from (select unnest(goals) as label, count(*) as count from public.join_responses group by label order by count(*) desc) t)
  );
end; $$;
commit;
