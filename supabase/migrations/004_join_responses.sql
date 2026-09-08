begin;
create table public.join_responses (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 2 and 100),
  email text not null unique check (length(email) <= 254),
  school text not null check (length(school) between 2 and 150),
  interests text[] not null,
  goals text[] not null,
  stage text not null,
  note text not null default '' check (length(note) <= 1000),
  consent_version text not null default 'join-v1'
);
alter table public.join_responses enable row level security;
revoke all on public.join_responses from anon, authenticated;
grant select, delete on public.join_responses to authenticated;
grant all on public.join_responses to service_role;
grant usage, select on sequence public.join_responses_id_seq to service_role;
create policy "Editors read responses" on public.join_responses for select to authenticated using (public.is_editor());
create policy "Editors delete responses" on public.join_responses for delete to authenticated using (public.is_editor());

create table public.join_rate_limits (
  key text primary key,
  started_at timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.join_rate_limits enable row level security;
revoke all on public.join_rate_limits from anon, authenticated;
grant all on public.join_rate_limits to service_role;

create function public.submit_join_response(payload jsonb, rate_key text) returns void
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
  insert into public.join_responses (request_id, name, email, school, interests, goals, stage, note)
  values ((payload->>'requestId')::uuid, payload->>'name', lower(payload->>'email'), payload->>'school',
    array(select jsonb_array_elements_text(payload->'interests')),
    array(select jsonb_array_elements_text(payload->'goals')), payload->>'stage', payload->>'note')
  on conflict do nothing;
end; $$;
revoke all on function public.submit_join_response(jsonb,text) from public, anon, authenticated;
grant execute on function public.submit_join_response(jsonb,text) to service_role;

create function public.join_response_analytics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_editor() then raise exception 'Unauthorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'total', (select count(*) from public.join_responses),
    'recent', (select count(*) from public.join_responses where created_at > now() - interval '30 days'),
    'interests', (select coalesce(jsonb_agg(t), '[]') from (select unnest(interests) as label, count(*) as count from public.join_responses group by label order by count(*) desc) t),
    'stages', (select coalesce(jsonb_agg(t), '[]') from (select stage as label, count(*) as count from public.join_responses group by stage order by count(*) desc) t),
    'goals', (select coalesce(jsonb_agg(t), '[]') from (select unnest(goals) as label, count(*) as count from public.join_responses group by label order by count(*) desc) t)
  );
end; $$;
revoke all on function public.join_response_analytics() from public, anon;
grant execute on function public.join_response_analytics() to authenticated;
commit;
