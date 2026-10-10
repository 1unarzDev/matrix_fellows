-- Additive migration: retain legacy saves, planner rows, profiles and outreach history.
begin;
create table public.dashboard_pursuits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.outreach_members(user_id),
 opportunity_id text not null, cycle_id text not null, title text not null,
 status text not null default 'preparing' check(status in ('preparing','waiting','ready','submitted','outcome')),
 outcome text not null default 'pending' check(outcome in ('pending','accepted','declined','withdrawn','waitlisted')),
 eligibility text not null check(eligibility in ('eligible','unknown','conflict')),
 official_dates jsonb not null default '[]', submission_receipt text not null default '',
 version integer not null default 1 check(version>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,opportunity_id,cycle_id), unique(id,user_id), check(jsonb_typeof(official_dates)='array')
);
create table public.dashboard_activities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.outreach_members(user_id),
 title text not null, goal text not null default '', role text not null default '', milestone text not null default '',
 status text not null default 'active' check(status in ('active','paused','completed')),
 contributions jsonb not null default '[]' check(jsonb_typeof(contributions)='array'),
 version integer not null default 1 check(version>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
create table public.dashboard_tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.outreach_members(user_id),
 pursuit_id uuid, activity_id uuid, legacy_item_id uuid unique, legacy_context jsonb,
 title text not null, notes text not null default '', status text not null default 'todo' check(status in ('todo','doing','done')),
 due_date date, scheduled_start timestamptz, scheduled_end timestamptz, estimated_hours numeric check(estimated_hours>=0 and estimated_hours<=500),
 depends_on uuid[] not null default '{}', version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(pursuit_id,user_id) references public.dashboard_pursuits(id,user_id),
 foreign key(activity_id,user_id) references public.dashboard_activities(id,user_id),
 check(pursuit_id is null or activity_id is null),
 check((scheduled_start is null and scheduled_end is null) or (scheduled_start is not null and scheduled_end>scheduled_start))
);
create index dashboard_tasks_pursuit on public.dashboard_tasks(pursuit_id,user_id);
create index dashboard_tasks_activity on public.dashboard_tasks(activity_id,user_id);
create index dashboard_tasks_owner on public.dashboard_tasks(user_id,due_date);
-- Serialize dependency changes for a member to prevent concurrent A->B/B->A.
create function public.dashboard_task_dependencies_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.outreach_members where user_id=new.user_id for update;
 if cardinality(new.depends_on) <> (select count(distinct id) from unnest(new.depends_on) id)
 or exists(select 1 from unnest(new.depends_on) d where not exists(select 1 from public.dashboard_tasks t where t.id=d and t.user_id=new.user_id))
 then raise exception 'Dependencies must be distinct existing private tasks';end if;
 if exists(with recursive reachable(id) as (
  select unnest(new.depends_on) union select unnest(t.depends_on) from public.dashboard_tasks t join reachable r on r.id=t.id where t.user_id=new.user_id
 ) select 1 from reachable where id=new.id) then raise exception 'Dependency cycle';end if;
 return new;
end $$;
create trigger dashboard_task_dependencies before insert or update of depends_on on public.dashboard_tasks for each row execute function public.dashboard_task_dependencies_guard();
revoke all on function public.dashboard_task_dependencies_guard() from public,anon,authenticated;
grant execute on function public.dashboard_task_dependencies_guard() to service_role;
create index dashboard_activities_owner on public.dashboard_activities(user_id);
create table public.dashboard_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.outreach_members(user_id),
 title text not null, type text not null check(type in ('appointment','work_session','program')),
 starts_at timestamptz not null, ends_at timestamptz not null, task_id uuid,
 version integer not null default 1, foreign key(task_id,user_id) references public.dashboard_tasks(id,user_id), check(ends_at>starts_at), check(task_id is null)
);
create index dashboard_events_owner on public.dashboard_events(user_id,starts_at);
create index dashboard_events_task on public.dashboard_events(task_id,user_id);
create table public.dashboard_settings (
 user_id uuid primary key references public.outreach_members(user_id), capacity_hours numeric check(capacity_hours>=0 and capacity_hours<=168)
);
-- Service-mediated writes with fresh membership checks. Browser access read-only and private.
do $$declare t text; begin
 foreach t in array array['dashboard_pursuits','dashboard_activities','dashboard_tasks','dashboard_events','dashboard_settings'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy private_read on public.%I for select to authenticated using(user_id=(select auth.uid()) and public.outreach_is_member())',t);
 end loop;
end $$;
-- The unique key serializes double-clicks. Task creation is in the same transaction.
create function public.dashboard_pursue(p_user_id uuid,p_input jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p public.dashboard_pursuits; task jsonb;
begin
 if not exists(select 1 from public.outreach_members where user_id=p_user_id and enabled) then raise exception 'Enabled membership required'; end if;
 insert into public.dashboard_pursuits(user_id,opportunity_id,cycle_id,title,eligibility,official_dates)
 values(p_user_id,p_input->>'opportunityId',p_input->>'cycleId',p_input->>'title',p_input->>'eligibility',coalesce(p_input->'officialDates','[]'))
 on conflict(user_id,opportunity_id,cycle_id) do nothing returning * into p;
 if p.id is null then
  select * into p from public.dashboard_pursuits where user_id=p_user_id and opportunity_id=p_input->>'opportunityId' and cycle_id=p_input->>'cycleId';
  return to_jsonb(p);
 end if;
 for task in select value from jsonb_array_elements(p_input->'reviewedTasks') loop
  insert into public.dashboard_tasks(user_id,pursuit_id,title,notes,status,due_date,scheduled_start,scheduled_end,estimated_hours)
  values(p_user_id,p.id,task->>'title',coalesce(task->>'notes',''),coalesce(task->>'status','todo'),(task->>'dueDate')::date,(task->>'scheduledStart')::timestamptz,(task->>'scheduledEnd')::timestamptz,(task->>'estimatedHours')::numeric);
 end loop;
 return to_jsonb(p);
end $$;
revoke all on function public.dashboard_pursue(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dashboard_pursue(uuid,jsonb) to service_role;
-- Preserve stable legacy IDs; due_at remains in the untouched source record. Do
-- not reinterpret an old timestamp as a date-only official deadline.
insert into public.dashboard_tasks(id,user_id,legacy_item_id,legacy_context,title,notes,status,due_date,created_at,updated_at)
select id,user_id,id,jsonb_build_object('itemId',id,'dueAt',due_at,'targetId',target_id,'profileId',profile_id,'opportunityId',opportunity_id),title,coalesce(notes,'') || case when due_at is not null then E'\nOriginal planner due timestamp: ' || due_at::text else '' end,
case when completed then 'done' else 'todo' end,(due_at at time zone 'America/Chicago')::date,created_at,updated_at
from public.outreach_planner_items;
commit;
