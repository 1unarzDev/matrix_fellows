begin;

-- Existing responses remain intact. New join-v2 submissions capture the
-- student-provided parent/guardian permission contact and school ID privately.
alter table public.join_responses
  add column if not exists interest_other text not null default '' check (length(interest_other) <= 160),
  add column if not exists student_id text not null default 'Not collected' check (length(student_id) between 3 and 32),
  add column if not exists parent_name text not null default 'Not collected' check (length(parent_name) between 2 and 100),
  add column if not exists parent_email text not null default 'Not collected' check (length(parent_email) <= 254),
  add column if not exists parent_permission_confirmed boolean not null default false;

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
  if coalesce((payload->>'parentPermission')::boolean, false) is not true then
    raise exception 'Parent or guardian permission is required';
  end if;
  if coalesce((payload->>'consent')::boolean, false) is not true then
    raise exception 'Contact and storage consent is required';
  end if;
  if length(trim(coalesce(payload->>'studentId', ''))) not between 3 and 32
    or length(trim(coalesce(payload->>'parentName', ''))) not between 2 and 100
    or length(trim(coalesce(payload->>'parentEmail', ''))) not between 3 and 254 then
    raise exception 'Missing parent permission details';
  end if;
  insert into public.join_responses (
    request_id, name, email, school, grade, interests, interest_other, goals, stage, note,
    student_id, parent_name, parent_email, parent_permission_confirmed, consent_version
  ) values (
    (payload->>'requestId')::uuid, payload->>'name', lower(payload->>'email'),
    'Not collected', payload->>'grade',
    array(select jsonb_array_elements_text(payload->'interests')),
    coalesce(payload->>'interestOther', ''),
    array(select jsonb_array_elements_text(payload->'goals')),
    payload->>'stage', coalesce(payload->>'note', ''), trim(payload->>'studentId'),
    trim(payload->>'parentName'), lower(trim(payload->>'parentEmail')), true, 'join-v2'
  ) on conflict do nothing;
end; $$;

commit;
