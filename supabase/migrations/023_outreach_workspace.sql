-- Private officer workspace. No public catalog access and no self-enrolment.
create table public.outreach_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique, role text not null default 'officer' check(role in ('officer','admin')),
 enabled boolean not null default true, created_at timestamptz not null default now()
);
create function public.outreach_is_officer() returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from outreach_members where user_id=auth.uid() and enabled);
$$;
create table public.outreach_profiles (
 id uuid primary key default gen_random_uuid(), full_name text not null, interests text[] not null default '{}',skills text[] not null default '{}',availability text not null default '',location text not null default '',work_samples jsonb not null default '[]',goals text not null default '',consent_to_share boolean not null default false,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.outreach_society (
 id boolean primary key default true check(id),name text not null default 'Matrix Fellows',description text not null default 'Student research society at Martin High School.',capabilities text[] not null default '{}',accomplishments jsonb not null default '[]',sponsor text not null default '',updated_at timestamptz not null default now()
);
alter table outreach_profiles add column affiliations text[] not null default '{}',add column achievements jsonb not null default '[]',add column introduction text not null default '',add column signature text not null default '';
insert into public.outreach_society(id) values(true);
alter table outreach_society add column revision integer not null default 1;
create table public.outreach_targets (
 id uuid primary key default gen_random_uuid(),name text not null,kind text not null check(kind in ('pi','lab','postdoc','phd','program','student')),organization text not null default '',discipline text[] not null default '{}',canonical_url text not null unique check(canonical_url like 'https://%'),contact_email text,location text not null default '',mode text not null default 'unknown' check(mode in ('remote','in_person','hybrid','unknown')),status text not null default 'needs_review' check(status in ('needs_review','ready','deferred','rejected','contacted')),scope text not null default 'both' check(scope in ('society','student','both')),description text not null default '',dossier jsonb not null default '{"evidence":[]}',assessment jsonb not null default '{}',created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.outreach_mailboxes (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),provider text not null default 'gmail' check(provider in ('gmail','outlook')),email text not null,access_token_encrypted text not null default '',refresh_token_encrypted text not null default '',expires_at timestamptz,enabled boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(owner_id,email)
);
alter table outreach_targets add column notes text not null default '',add column defer_until timestamptz,add column rejection_reason text not null default '';
create table public.outreach_catalog_saves (user_id uuid not null references auth.users(id) on delete cascade,opportunity_id text not null,created_at timestamptz not null default now(),primary key(user_id,opportunity_id));
alter table outreach_catalog_saves enable row level security;
revoke all on outreach_catalog_saves from anon,authenticated;
grant all on outreach_catalog_saves to service_role;
grant select on outreach_catalog_saves to authenticated;
create policy catalog_save_owner on outreach_catalog_saves for select to authenticated using(user_id=auth.uid() and outreach_is_officer());
create table public.outreach_planner_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),title text not null,target_id uuid references outreach_targets(id),profile_id uuid references outreach_profiles(id),opportunity_id text,due_at timestamptz,notes text not null default '',completed boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table outreach_planner_items enable row level security;
revoke all on outreach_planner_items from anon,authenticated;
grant all on outreach_planner_items to service_role;
grant select on outreach_planner_items to authenticated;
create policy planner_owner on outreach_planner_items for select to authenticated using(user_id=auth.uid() and outreach_is_officer());
create table public.outreach_proposals (
 id uuid primary key default gen_random_uuid(),target_id uuid not null references outreach_targets(id),profile_id uuid references outreach_profiles(id),kind text not null check(kind in ('society','student')),recipient text not null,subject text not null,body text not null,mailbox_id uuid references outreach_mailboxes(id),revision integer not null default 1,status text not null default 'draft' check(status in ('draft','approved','sent','archived')),approved_revision integer,approved_fingerprint text,approved_by uuid references auth.users(id),approved_at timestamptz,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.outreach_proposal_revisions (proposal_id uuid not null references outreach_proposals(id),revision integer not null,recipient text not null,subject text not null,body text not null,mailbox_id uuid,created_by uuid,created_at timestamptz not null default now(),primary key(proposal_id,revision));
create table public.outreach_outbox (
 id uuid primary key default gen_random_uuid(),proposal_id uuid not null references outreach_proposals(id),revision integer not null,fingerprint text not null,mailbox_id uuid not null references outreach_mailboxes(id),status text not null default 'queued' check(status in ('queued','sending','sent','uncertain','failed')),provider_message_id text,error text,claim_token uuid,claimed_at timestamptz,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(proposal_id,revision)
);
create table public.outreach_saves (user_id uuid not null references auth.users(id) on delete cascade,target_id uuid not null references outreach_targets(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,target_id));
create table public.outreach_settings (
 id boolean primary key default true check(id),paused boolean not null default true,ai_enabled boolean not null default false,terms_confirmed boolean not null default false,weekly_limit integer not null default 15 check(weekly_limit between 1 and 100),batch_limit integer not null default 5 check(batch_limit between 1 and 15),queue_limit integer not null default 45 check(queue_limit between 1 and 250),concurrency integer not null default 2 check(concurrency between 1 and 2),week_started date not null default date_trunc('week',now())::date,weekly_admitted integer not null default 0,updated_at timestamptz not null default now()
);
insert into outreach_settings(id) values(true);
create table public.outreach_sources (id text primary key,url text not null check(url like 'https://%'),allowed_hosts text[] not null,enabled boolean not null default true,kind text not null check(kind in ('directory','target')),ai_excerpt text not null default '',ai_reviewed boolean not null default false);
create table public.outreach_jobs (
 id uuid primary key default gen_random_uuid(),work_key text not null unique,kind text not null check(kind in ('discover','research')),target_id uuid references outreach_targets(id),source_id text references outreach_sources(id),status text not null default 'queued' check(status in ('queued','running','completed','failed')),attempts integer not null default 0,available_at timestamptz not null default now(),lease_until timestamptz,claim_token uuid,worker_id text,payload jsonb not null default '{}',result jsonb,error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.outreach_suppressions (canonical_url text primary key,reason text not null,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create table public.outreach_admissions(batch_key text not null,target_id uuid not null references outreach_targets(id),created_at timestamptz not null default now(),primary key(batch_key,target_id));
alter table outreach_admissions enable row level security;revoke all on outreach_admissions from public,anon,authenticated;grant all on outreach_admissions to service_role;
create table public.outreach_logs (id bigint generated always as identity primary key,actor_id uuid,action text not null,target_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now());
create index outreach_jobs_claim on outreach_jobs(status,available_at);
create index outreach_target_status on outreach_targets(status,created_at);

create function public.outreach_proposal_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' then
  if old.status='sent' and (new.recipient,new.subject,new.body,new.mailbox_id,new.profile_id,new.target_id,new.kind,new.status) is distinct from (old.recipient,old.subject,old.body,old.mailbox_id,old.profile_id,old.target_id,old.kind,old.status) then raise exception 'Sent proposals are immutable'; end if;
  if (new.recipient,new.subject,new.body,new.mailbox_id,new.profile_id,new.target_id,new.kind) is distinct from (old.recipient,old.subject,old.body,old.mailbox_id,old.profile_id,old.target_id,old.kind) then
   if exists(select 1 from outreach_outbox where proposal_id=old.id and status in ('sending','uncertain')) then raise exception 'Resolve the sending outcome before editing'; end if;
   new.revision=old.revision+1; new.status='draft';new.approved_revision=null;new.approved_fingerprint=null;new.approved_by=null;new.approved_at=null;
  else new.revision=old.revision; end if;
 end if;
 new.updated_at=now();return new;
end $$;
create trigger outreach_proposal_guard before insert or update on outreach_proposals for each row execute function outreach_proposal_guard();
create function public.outreach_revision_snapshot() returns trigger language plpgsql set search_path=public as $$ begin
 insert into outreach_proposal_revisions(proposal_id,revision,recipient,subject,body,mailbox_id,created_by) values(new.id,new.revision,new.recipient,new.subject,new.body,new.mailbox_id,new.created_by) on conflict do nothing;return new;end $$;
create trigger outreach_revision_snapshot after insert or update on outreach_proposals for each row execute function outreach_revision_snapshot();
create function public.outreach_target_suppression() returns trigger language plpgsql set search_path=public as $$ begin
 if new.status='rejected' then insert into outreach_suppressions(canonical_url,reason,created_by) values(new.canonical_url,coalesce(nullif(new.rejection_reason,''),'Rejected by officer'),new.created_by) on conflict(canonical_url) do nothing;end if;new.updated_at=now();return new;end $$;
create trigger outreach_target_suppression before insert or update on outreach_targets for each row execute function outreach_target_suppression();

-- Worker admissions and leases serialize on the singleton settings row.
create function public.outreach_admit_target(p_payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare cfg outreach_settings; inserted uuid; u text; batch text; research_source text; parent_source outreach_sources;
begin
 select * into cfg from outreach_settings where id=true for update;
 u=p_payload->>'canonical_url';
 batch=p_payload->>'batch_key';if batch is null or length(batch)>200 or length(batch)<1 then return jsonb_build_object('admitted',false,'reason','missing_batch_key');end if;
 if cfg.paused then return jsonb_build_object('admitted',false,'reason','paused');end if;
 if p_payload->>'source_id' is not null then
  select * into parent_source from outreach_sources where id=p_payload->>'source_id' and enabled for share;
  if not found then return jsonb_build_object('admitted',false,'reason','source_disabled');end if;
 end if;
 if p_payload ? 'job_id' and not exists(select 1 from outreach_jobs where id=(p_payload->>'job_id')::uuid and claim_token=(p_payload->>'claim_token')::uuid and status='running' and lease_until>now() and kind='discover') then return jsonb_build_object('admitted',false,'reason','stale_lease');end if;
 if exists(select 1 from outreach_suppressions where canonical_url=u) then return jsonb_build_object('admitted',false,'reason','suppressed');end if;
 if exists(select 1 from outreach_targets where canonical_url=u) then return jsonb_build_object('admitted',false,'reason','duplicate');end if;
 if cfg.week_started<>date_trunc('week',now())::date then update outreach_settings set week_started=date_trunc('week',now())::date,weekly_admitted=0 where id=true;cfg.weekly_admitted=0;end if;
 if cfg.weekly_admitted>=cfg.weekly_limit then return jsonb_build_object('admitted',false,'reason','weekly_limit');end if;
 if (select count(*) from outreach_admissions where batch_key=batch)>=cfg.batch_limit then return jsonb_build_object('admitted',false,'reason','batch_limit');end if;
 if (select count(*) from outreach_targets where status in ('needs_review','ready'))>=cfg.queue_limit then return jsonb_build_object('admitted',false,'reason','queue_limit');end if;
 insert into outreach_targets(name,kind,organization,discipline,canonical_url,contact_email,location,mode,scope,description,dossier,assessment) values(p_payload->>'name',p_payload->>'kind',coalesce(p_payload->>'organization',''),array(select jsonb_array_elements_text(coalesce(p_payload->'discipline','[]'))),u,p_payload->>'contact_email',coalesce(p_payload->>'location',''),coalesce(p_payload->>'mode','unknown'),coalesce(p_payload->>'scope','both'),coalesce(p_payload->>'description',''),coalesce(p_payload->'dossier','{"evidence":[]}'),coalesce(p_payload->'assessment','{}')) returning id into inserted;
 update outreach_settings set weekly_admitted=weekly_admitted+1 where id=true;
 insert into outreach_admissions(batch_key,target_id) values(batch,inserted);
 research_source=p_payload->>'source_id';
 if research_source is not null then
  -- New target pages inherit only the reviewed parent host policy. Their AI
  -- excerpts still start unreviewed, so officers can screen them individually.
  research_source='target-'||inserted::text;
  insert into outreach_sources(id,url,allowed_hosts,enabled,kind) values(research_source,u,parent_source.allowed_hosts,true,'target');
 end if;
 insert into outreach_jobs(work_key,kind,target_id,source_id,payload) values('research:'||inserted::text,'research',inserted,research_source,jsonb_build_object('stage','research'));
 insert into outreach_logs(action,target_id) values('worker_admitted',inserted);
 return jsonb_build_object('admitted',true,'target_id',inserted);
end $$;
create function public.outreach_claim_jobs(p_worker_key text,p_limit integer) returns setof outreach_jobs language plpgsql security definer set search_path=public as $$
declare cfg outreach_settings; slots integer;
begin
 select * into cfg from outreach_settings where id=true for update;if cfg.paused then return;end if;
 update outreach_jobs set status=case when attempts>=3 then 'failed' else 'queued' end,claim_token=null,lease_until=null,error='Lease expired; bounded retry',available_at=now()+interval '1 minute' where status='running' and lease_until<now();
 slots=least(greatest(p_limit,0),cfg.batch_limit,cfg.concurrency-(select count(*)::integer from outreach_jobs where status='running'));
 if slots<=0 then return;end if;
 return query update outreach_jobs j set status='running',attempts=j.attempts+1,claim_token=gen_random_uuid(),worker_id=left(p_worker_key,120),lease_until=now()+interval '5 minutes',updated_at=now() where j.id in (select q.id from outreach_jobs q left join outreach_targets t on t.id=q.target_id left join outreach_sources s on s.id=q.source_id where q.status='queued' and q.available_at<=now() and q.attempts<3 and (q.source_id is null or s.enabled) and (q.target_id is null or t.status not in ('deferred','rejected','contacted')) order by q.created_at for update of q skip locked limit slots) returning j.*;
end $$;
create function public.outreach_complete_job(p_id uuid,p_claim_token uuid,p_result jsonb,p_error text default null) returns boolean language plpgsql security definer set search_path=public as $$
declare j outreach_jobs;
begin
 select * into j from outreach_jobs where id=p_id and claim_token=p_claim_token and status='running' and lease_until>now() for update;if not found then return false;end if;
 if p_error is null and j.kind='research' and j.target_id is not null then
  -- Acquisition is worker-owned. Never replace an officer's concurrent edits,
  -- ratings, contact verification, research interpretation or queue decision.
  if p_result ? 'acquisition' then
   update outreach_targets set dossier=jsonb_set(dossier,'{acquisition}',p_result->'acquisition',true) where id=j.target_id and status not in ('deferred','rejected','contacted') and canonical_url=p_result#>>'{acquisition,pages,0,url}';
   if not found and exists(select 1 from outreach_targets where id=j.target_id and status not in ('deferred','rejected','contacted')) then return false;end if;
  end if;
 end if;
 update outreach_jobs set status=case when p_error is null then 'completed' when attempts<3 then 'queued' else 'failed' end,result=p_result,error=left(p_error,2000),claim_token=null,lease_until=null,available_at=now()+make_interval(mins=>attempts*2),updated_at=now() where id=p_id;
 insert into outreach_logs(action,target_id,details) values(case when p_error is null then 'job_completed' else 'job_failed' end,j.target_id,jsonb_build_object('job_id',p_id,'attempt',j.attempts));return true;
end $$;

-- Officers read ordinary records through RLS; sensitive mail and all mutations
-- go through authenticated server handlers so approval cannot be bypassed.
do $$ declare t text;begin
 foreach t in array array['outreach_members','outreach_profiles','outreach_society','outreach_targets','outreach_mailboxes','outreach_proposals','outreach_proposal_revisions','outreach_outbox','outreach_saves','outreach_settings','outreach_sources','outreach_jobs','outreach_suppressions','outreach_logs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['outreach_society','outreach_targets','outreach_settings','outreach_sources','outreach_jobs','outreach_suppressions','outreach_logs'] loop
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy officer_read on public.%I for select to authenticated using (public.outreach_is_officer())',t);
 end loop;
end $$;
grant select on outreach_profiles to authenticated;
create policy profile_owner on outreach_profiles for select to authenticated using(created_by=auth.uid() and outreach_is_officer());
grant select on outreach_proposals,outreach_proposal_revisions to authenticated;
create policy proposal_visibility on outreach_proposals for select to authenticated using(outreach_is_officer() and (kind='society' or created_by=auth.uid()));
create policy revision_visibility on outreach_proposal_revisions for select to authenticated using(exists(select 1 from outreach_proposals p where p.id=proposal_id));
grant select on outreach_members,outreach_saves to authenticated;
create policy member_self_read on outreach_members for select to authenticated using(user_id=auth.uid());
create policy save_self_read on outreach_saves for select to authenticated using(user_id=auth.uid() and outreach_is_officer());
grant usage,select on sequence outreach_logs_id_seq to service_role;
revoke all on function outreach_admit_target(jsonb),outreach_claim_jobs(text,integer),outreach_complete_job(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function outreach_admit_target(jsonb),outreach_claim_jobs(text,integer),outreach_complete_job(uuid,uuid,jsonb,text) to service_role;
revoke all on function outreach_is_officer() from public,anon;
grant execute on function outreach_is_officer() to authenticated,service_role;

create function public.outreach_audit_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into outreach_logs(actor_id,action,target_id,details) values(auth.uid(),TG_TABLE_NAME||'.'||lower(TG_OP),case when TG_TABLE_NAME='outreach_targets' then coalesce(new.id,old.id) else null end,jsonb_build_object('record_id',coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id')));return coalesce(new,old);
end $$;
create trigger outreach_target_audit after insert or update on outreach_targets for each row execute function outreach_audit_change();
create trigger outreach_profile_audit after insert or update or delete on outreach_profiles for each row execute function outreach_audit_change();
create trigger outreach_proposal_audit after insert or update on outreach_proposals for each row execute function outreach_audit_change();

create function public.outreach_society_revision() returns trigger language plpgsql set search_path=public as $$ begin
 if (new.name,new.description,new.capabilities,new.accomplishments,new.sponsor) is distinct from (old.name,old.description,old.capabilities,old.accomplishments,old.sponsor) then new.revision=old.revision+1;update outreach_proposals set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where kind='society' and status='approved';end if;return new;end $$;
create trigger outreach_society_revision before update on outreach_society for each row execute function outreach_society_revision();
