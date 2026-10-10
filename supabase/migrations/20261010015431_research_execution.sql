-- Code-controlled stages. Reservations are conservative maximums: interrupted
-- submissions retain their charge, and retries reserve independently.
alter table public.outreach_sources add column ai_snapshot_hash text;
alter table public.outreach_settings
 add column source_request_limit integer not null default 60 check(source_request_limit between 1 and 1000),
 add column source_byte_limit bigint not null default 30720000 check(source_byte_limit between 512000 and 512000000),
 add column model_request_limit integer not null default 15 check(model_request_limit between 0 and 1000),
 add column model_token_limit integer not null default 90000 check(model_token_limit between 0 and 10000000),
 add column stage_limit integer not null default 12 check(stage_limit between 1 and 30);
create table public.research_resource_usage (
 day date primary key, source_requests integer not null default 0,
 source_bytes bigint not null default 0, model_requests integer not null default 0,
 model_tokens integer not null default 0, updated_at timestamptz not null default now()
);
create table public.research_stage_runs (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.outreach_jobs(id),
 stage text not null, input_key text not null, dependency_ids uuid[] not null default '{}', metadata jsonb not null default '{}', schema_version text not null default 'research-stage-v1',
 attempt integer not null, claim_token uuid not null, status text not null check(status in ('running','completed','failed','waiting_quota','submission_unknown')),
 reservation jsonb not null, usage jsonb not null default '{}', result jsonb, error text,
 created_at timestamptz not null default now(), completed_at timestamptz,
 unique(job_id,stage,input_key,attempt)
);
create index research_stage_cache on public.research_stage_runs(job_id,stage,input_key) where status='completed';
alter table public.research_stage_runs enable row level security;
alter table public.research_resource_usage enable row level security;
revoke all on public.research_stage_runs,public.research_resource_usage from public,anon,authenticated;
grant all on public.research_stage_runs,public.research_resource_usage to service_role;
grant select on public.research_stage_runs,public.research_resource_usage to authenticated;
create policy stages_officer_read on public.research_stage_runs for select to authenticated using(public.outreach_is_officer());
create policy usage_officer_read on public.research_resource_usage for select to authenticated using(public.outreach_is_officer());
create function public.outreach_reserve_stage(p_job uuid,p_claim uuid,p_stage text,p_input_key text,p_resource text,p_dependencies uuid[] default '{}',p_metadata jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare j outreach_jobs; cfg outreach_settings; u research_resource_usage; cached research_stage_runs; r research_stage_runs;
 sr integer:=0; sb bigint:=0; mr integer:=0; mt integer:=0;
begin
 select * into j from outreach_jobs where id=p_job and claim_token=p_claim and status='running' and lease_until>now() for update;
 if not found then raise exception 'Research lease expired'; end if;
 select * into cfg from outreach_settings where id=true;
 if cfg.paused then raise exception 'Research paused';end if;
 if j.source_id is not null and not exists(select 1 from outreach_sources where id=j.source_id and enabled) then raise exception 'Source disabled';end if;
 if j.target_id is not null and exists(select 1 from outreach_targets where id=j.target_id and status in ('deferred','rejected','contacted')) then raise exception 'Target unavailable';end if;
 select * into cached from research_stage_runs where job_id=p_job and stage=p_stage and input_key=p_input_key and status='completed' order by completed_at desc limit 1;
 if found then return jsonb_build_object('cached',true,'id',cached.id,'result',cached.result); end if;
 select * into r from research_stage_runs where job_id=p_job and stage=p_stage and input_key=p_input_key and claim_token=p_claim;
 if found then return jsonb_build_object('cached',false,'id',r.id,'resumed',true,'status',r.status);end if;
 if (select count(distinct stage||':'||input_key) from research_stage_runs where job_id=p_job)>=cfg.stage_limit then raise exception 'Per-run stage budget exhausted';end if;
 if p_resource='source' then sr:=1; sb:=512000;
 elsif p_resource='model' then mr:=1; mt:=14000;
 elsif p_resource<>'local' then raise exception 'Unsupported research resource';end if;
 insert into research_resource_usage(day) values((now() at time zone 'UTC')::date) on conflict do nothing;
 select * into u from research_resource_usage where day=(now() at time zone 'UTC')::date for update;
 if u.source_requests+sr>cfg.source_request_limit or u.source_bytes+sb>cfg.source_byte_limit or u.model_requests+mr>cfg.model_request_limit or u.model_tokens+mt>cfg.model_token_limit then raise exception 'Research resource budget exhausted';end if;
 update research_resource_usage set source_requests=source_requests+sr,source_bytes=source_bytes+sb,model_requests=model_requests+mr,model_tokens=model_tokens+mt,updated_at=now() where day=u.day;
 update research_stage_runs set status='submission_unknown',error='Prior claim ended before durable stage completion; reservation retained' where job_id=p_job and stage=p_stage and input_key=p_input_key and status='running' and claim_token<>p_claim;
 insert into research_stage_runs(job_id,stage,input_key,dependency_ids,metadata,attempt,claim_token,status,reservation) values(p_job,left(p_stage,120),left(p_input_key,300),p_dependencies,p_metadata,(select coalesce(max(attempt),0)+1 from research_stage_runs where job_id=p_job and stage=p_stage and input_key=p_input_key),p_claim,'running',jsonb_build_object('sourceRequests',sr,'sourceBytes',sb,'modelRequests',mr,'modelTokens',mt)) returning * into r;
 return jsonb_build_object('cached',false,'id',r.id,'resumed',false);
end $$;
create function public.outreach_finish_stage(p_id uuid,p_job uuid,p_claim uuid,p_result jsonb,p_error text default null,p_usage jsonb default '{}')
returns boolean language plpgsql security definer set search_path=public as $$
begin
 perform 1 from outreach_jobs where id=p_job and claim_token=p_claim and status='running' and lease_until>now() for update;
 if not found or (select paused from outreach_settings where id=true) then return false;end if;
 if exists(select 1 from outreach_jobs j join outreach_sources s on s.id=j.source_id where j.id=p_job and not s.enabled) or exists(select 1 from outreach_jobs j join outreach_targets t on t.id=j.target_id where j.id=p_job and (t.status in ('deferred','rejected','contacted') or exists(select 1 from outreach_suppressions x where x.canonical_url=t.canonical_url))) then return false;end if;
 update research_stage_runs set status=case when p_error is null then 'completed' when p_error ilike '%quota exhausted%' or p_error ilike '%budget exhausted%' then 'waiting_quota' else 'failed' end,result=p_result,error=left(p_error,500),usage=p_usage,completed_at=now() where id=p_id and job_id=p_job and claim_token=p_claim and status='running';
 return found;
end $$;
revoke all on function public.outreach_reserve_stage(uuid,uuid,text,text,text,uuid[],jsonb),public.outreach_finish_stage(uuid,uuid,uuid,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.outreach_reserve_stage(uuid,uuid,text,text,text,uuid[],jsonb),public.outreach_finish_stage(uuid,uuid,uuid,jsonb,text,jsonb) to service_role;

create table public.outreach_matches (
 id uuid primary key default gen_random_uuid(),target_id uuid not null references public.outreach_targets(id),
 profile_id uuid references public.outreach_profiles(id),created_by uuid not null references auth.users(id),
 input_versions jsonb not null,plan jsonb not null,created_at timestamptz not null default now()
);
create index outreach_matches_owner on public.outreach_matches(created_by,created_at desc);
alter table public.outreach_matches enable row level security;
revoke all on public.outreach_matches from public,anon,authenticated;
grant all on public.outreach_matches to service_role;
grant select on public.outreach_matches to authenticated;
create policy match_owner_read on public.outreach_matches for select to authenticated using(created_by=(select auth.uid()) and public.outreach_is_officer());

-- Bound all waiting work, including repeated manual refreshes.
alter table public.outreach_settings add column job_queue_limit integer not null default 60 check(job_queue_limit between 2 and 300);
create function public.outreach_job_queue_guard() returns trigger language plpgsql set search_path=public as $$
declare cfg outreach_settings;
begin
 if TG_OP='UPDATE' or new.status not in ('queued','running') or exists(select 1 from outreach_jobs where work_key=new.work_key) then return new;end if;
 select * into cfg from outreach_settings where id=true for update;
 if (select count(*) from outreach_jobs where status in ('queued','running'))>=cfg.job_queue_limit then raise exception 'Research job queue capacity exhausted';end if;
 return new;
end $$;
create trigger outreach_jobs_queue_capacity before insert on public.outreach_jobs for each row execute function public.outreach_job_queue_guard();

alter table public.outreach_jobs add column failure_kind text;
create function public.outreach_classify_job_failure() returns trigger language plpgsql set search_path=public as $$
begin
 new.failure_kind:=case when new.error is null then null when new.error ilike '%quota exhausted%' or new.error ilike '%budget exhausted%' then 'quota_wait' when new.error like '%(401)%' or new.error like '%(403)%' then 'provider_auth' when new.error like '%Source unavailable%' then 'source_access' else 'stage_failure' end;
 if new.failure_kind='quota_wait' and new.status='queued' then new.available_at:=greatest(new.available_at,now()+interval '15 minutes');end if;
 return new;
end $$;
create trigger outreach_jobs_failure_kind before update on public.outreach_jobs for each row execute function public.outreach_classify_job_failure();
create function public.outreach_retry_job(p_job uuid,p_actor uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare j outreach_jobs; cfg outreach_settings;
begin
 if not exists(select 1 from outreach_members where user_id=p_actor and enabled and role='admin') then raise exception 'Administrator authorization required';end if;
 select * into cfg from outreach_settings where id=true for update;
 if cfg.paused then raise exception 'Research paused';end if;
 select * into j from outreach_jobs where id=p_job for update;
 if not found or j.status not in ('queued','failed') or j.error is null then raise exception 'Only waiting or failed jobs can be retried';end if;
 if j.status='failed' and (select count(*) from outreach_jobs where status in ('queued','running'))>=cfg.job_queue_limit then raise exception 'Research job queue capacity exhausted';end if;
 update outreach_jobs set status='queued',attempts=0,available_at=now(),claim_token=null,lease_until=null,error=null where id=p_job;
 insert into outreach_logs(actor_id,action,target_id,details)values(p_actor,'research_retry',j.target_id,jsonb_build_object('job_id',p_job,'previous_attempts',j.attempts,'reservations_retained',true));
 return true;
end $$;
revoke all on function public.outreach_retry_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.outreach_retry_job(uuid,uuid) to service_role;
