begin;
create table public.dashboard_opportunity_decisions (
 user_id uuid not null references public.outreach_members(user_id),
 opportunity_id text not null references public.opportunities(id),
 decision text not null check(decision in ('pass','clear')),reason text not null default '' check(length(reason)<=1000),
 version integer not null default 1 check(version>0),updated_at timestamptz not null default now(),primary key(user_id,opportunity_id)
);
create index dashboard_decisions_opportunity on public.dashboard_opportunity_decisions(opportunity_id);
create table public.dashboard_opportunity_references (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.outreach_members(user_id),
 url text not null check(length(url)<=2000),title text not null check(length(title) between 1 and 240),
 verification text not null default 'user-supplied' check(verification='user-supplied'),created_at timestamptz not null default now(),unique(user_id,url)
);
do $$declare t text;begin
 foreach t in array array['dashboard_opportunity_decisions','dashboard_opportunity_references'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy private_read on public.%I for select to authenticated using(user_id=(select auth.uid()) and public.outreach_is_member())',t);
 end loop;
end $$;
-- Keeping a clear tombstone allows reliable Undo and prevents stale tabs from
-- resurrecting a decision. Serialization avoids an insert-vs-update race.
create function public.dashboard_decide_opportunity(p_user_id uuid,p_opportunity_id text,p_decision text,p_reason text,p_expected_version integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare d public.dashboard_opportunity_decisions;
begin
 perform 1 from public.outreach_members where user_id=p_user_id and enabled for update;
 if not found then raise exception 'Enabled membership required';end if;
 if p_decision='pass' and not exists(select 1 from public.opportunities where id=p_opportunity_id and published and not suppressed) then raise exception 'Published opportunity required';end if;
 select * into d from public.dashboard_opportunity_decisions where user_id=p_user_id and opportunity_id=p_opportunity_id for update;
 if coalesce(d.version,0)<>p_expected_version then raise exception 'Decision changed elsewhere';end if;
 if p_decision='clear' and d.user_id is null then raise exception 'Decision changed elsewhere';end if;
 insert into public.dashboard_opportunity_decisions(user_id,opportunity_id,decision,reason)
 values(p_user_id,p_opportunity_id,p_decision,case when p_decision='clear' then '' else p_reason end)
 on conflict(user_id,opportunity_id) do update set decision=excluded.decision,reason=excluded.reason,version=dashboard_opportunity_decisions.version+1,updated_at=now() returning * into d;
 return to_jsonb(d);
end $$;
revoke all on function public.dashboard_decide_opportunity(uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.dashboard_decide_opportunity(uuid,text,text,text,integer) to service_role;
commit;
