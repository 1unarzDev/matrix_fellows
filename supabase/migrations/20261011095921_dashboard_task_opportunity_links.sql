begin;

-- Saved catalog/personal references can be attached without creating an application
-- pursuit. Existing task IDs, dates, notes, ownership and RLS remain unchanged.
alter table public.dashboard_tasks
  add column opportunity_id text,
  add column milestone_key text,
  add constraint dashboard_task_one_connection
    check (num_nonnulls(opportunity_id, pursuit_id, activity_id) <= 1),
  add constraint dashboard_task_opportunity_format
    check (opportunity_id is null or opportunity_id ~ '^[a-z0-9][a-z0-9:_-]{0,199}$'),
  add constraint dashboard_task_milestone_length
    check (milestone_key is null or length(milestone_key) <= 1000);

-- A polymorphic reference must never attach another member's private opportunity.
-- Historical links survive later unpublication; changing/creating the link checks
-- current access. Direct browser writes remain denied by the existing grants.
create function public.dashboard_task_opportunity_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.opportunity_id is not distinct from old.opportunity_id
       and new.user_id = old.user_id then return new; end if;
  end if;
  if new.opportunity_id is not null
    and not exists (select 1 from public.opportunities o
      where o.id = new.opportunity_id and o.published and not o.suppressed)
    and not exists (select 1 from public.dashboard_personal_opportunities o
      where o.id = new.opportunity_id and o.user_id = new.user_id)
  then raise exception 'Choose an accessible opportunity.'; end if;
  return new;
end $$;
create trigger dashboard_task_opportunity_access
  before insert or update of opportunity_id, user_id on public.dashboard_tasks
  for each row execute function public.dashboard_task_opportunity_guard();
revoke all on function public.dashboard_task_opportunity_guard() from public, anon, authenticated;
grant execute on function public.dashboard_task_opportunity_guard() to service_role;

commit;
