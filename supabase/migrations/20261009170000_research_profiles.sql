begin;
alter table public.outreach_profiles add column subject_user_id uuid references auth.users(id);
alter table public.outreach_members add column primary_profile_id uuid references public.outreach_profiles(id);
create unique index outreach_profile_subject_unique on public.outreach_profiles(subject_user_id) where subject_user_id is not null;
create table public.research_profile_imports(profile_id uuid primary key references public.outreach_profiles(id),subject_user_id uuid not null references auth.users(id),join_response_id bigint,import_version text not null default 'join-research-v1',captured_fields jsonb not null default '{}',created_at timestamptz not null default now());
create table public.research_projects(id uuid primary key default gen_random_uuid(),canonical_url text not null unique,title text not null,created_at timestamptz not null default now());
create table public.research_artifacts(id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.outreach_profiles(id),owner_id uuid not null references auth.users(id),canonical_url text not null,kind text not null check(kind in('repository','publication','page','reference')),relationship text not null default 'interest' check(relationship in('interest','contributed','created')),contribution text not null default '',state text not null default 'pending' check(state in('pending','processing','ready','reference','failed')),summary text not null default '',error_code text,project_id uuid references public.research_projects(id),updated_at timestamptz not null default now(),created_at timestamptz not null default now(),unique(profile_id,canonical_url));
create index research_artifacts_owner on public.research_artifacts(owner_id);
create table public.research_source_snapshots(id uuid primary key default gen_random_uuid(),artifact_id uuid not null references public.research_artifacts(id),owner_id uuid not null references auth.users(id),content_hash text not null,text_content text not null,metadata jsonb not null default '{}',retrieved_at timestamptz not null default now(),source_date timestamptz,extraction_version text not null default 'local-v1',unique(artifact_id,content_hash));
create index research_snapshots_owner on public.research_source_snapshots(owner_id);
create table public.research_project_contributors(project_id uuid references public.research_projects(id),profile_id uuid references public.outreach_profiles(id),relationship text not null,contribution text not null default '',primary key(project_id,profile_id));
create table public.research_claims(id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.outreach_profiles(id),owner_id uuid not null references auth.users(id),project_id uuid references public.research_projects(id),artifact_id uuid references public.research_artifacts(id),snapshot_id uuid references public.research_source_snapshots(id),statement text not null,predicate text not null,origin text not null check(origin in('join','member','source','inference')),support_state text not null check(support_state in('self_reported','supported','uncertain','conflicting')),adoption text not null default 'candidate' check(adoption in('candidate','accepted','rejected','superseded')),sharing_scope text not null default 'private' check(sharing_scope in('private','officer')),provenance jsonb not null default '{}',evidence_date timestamptz not null default now(),version integer not null default 1,supersedes uuid references public.research_claims(id),withdrawn_at timestamptz,created_at timestamptz not null default now());
create index research_claims_profile on public.research_claims(profile_id);
create index research_claims_owner on public.research_claims(owner_id);
create table public.research_profile_versions(id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.outreach_profiles(id),owner_id uuid not null references auth.users(id),projection_kind text not null check(projection_kind in('self','matching','officer')),input_hash text not null,claim_ids uuid[] not null default '{}',packet jsonb not null,schema_version text not null default 'research-context-v1',created_at timestamptz not null default now(),unique(profile_id,projection_kind,input_hash));
create index research_versions_owner on public.research_profile_versions(owner_id);
-- No historical profile is relabeled: created_by is authorship, not subject identity.
create function public.ensure_member_research_profile(p_user_id uuid,p_email text) returns uuid language plpgsql set search_path='' as $$
declare m public.outreach_members;pid uuid;j record;captured jsonb:='{}';begin
 if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null and lower(email)=lower(p_email))then raise exception 'Verified account required';end if;
 select * into m from public.outreach_members where user_id=p_user_id and enabled for update;
 if not found then raise exception 'Enabled membership required';end if;
 if m.primary_profile_id is not null then
  if not exists(select 1 from public.outreach_profiles where id=m.primary_profile_id and subject_user_id=p_user_id)then raise exception 'Invalid primary profile identity';end if;
  return m.primary_profile_id;end if;
 select id into pid from public.outreach_profiles where subject_user_id=p_user_id;
 if pid is not null then update public.outreach_members set primary_profile_id=pid where user_id=p_user_id;return pid;end if;
 if to_regclass('public.join_responses') is not null then
  if (select count(*) from public.join_responses where lower(email)=lower(p_email))>1 then raise exception 'Ambiguous join association requires review';end if;
  execute 'select id,name,interests,goals,stage,to_jsonb(r)->>''interest_other'' interest_other from public.join_responses r where lower(email)=lower($1)' into j using p_email;
  if j.id is not null then captured:=jsonb_build_object('name',j.name,'interests',j.interests,'goals',j.goals,'stage',j.stage,'interestOther',coalesce(j.interest_other,''));end if;
 end if;
 insert into public.outreach_profiles(full_name,interests,goals,created_by,subject_user_id)values(coalesce(captured->>'name',split_part(p_email,'@',1)),coalesce(array(select jsonb_array_elements_text(captured->'interests')),'{}'),coalesce((select string_agg(value,'; ') from jsonb_array_elements_text(captured->'goals')),''),p_user_id,p_user_id)returning id into pid;
 update public.outreach_members set primary_profile_id=pid where user_id=p_user_id;
 insert into public.research_profile_imports(profile_id,subject_user_id,join_response_id,captured_fields)values(pid,p_user_id,case when captured='{}' then null else j.id end,captured);
 insert into public.research_claims(profile_id,owner_id,statement,predicate,origin,support_state,adoption,provenance)
 select pid,p_user_id,value::text,key,'join','self_reported','accepted',jsonb_build_object('internalSource','join','importVersion','join-research-v1','field',key,'value',value)from jsonb_each(captured);
 return pid;
end$$;
revoke all on function public.ensure_member_research_profile(uuid,text) from public,anon,authenticated;
grant execute on function public.ensure_member_research_profile(uuid,text) to service_role;
create function public.research_guard_primary()returns trigger language plpgsql set search_path='' as $$begin
 if new.primary_profile_id is not null and not exists(select 1 from public.outreach_profiles where id=new.primary_profile_id and subject_user_id=new.user_id)then raise exception 'Primary profile must represent the authenticated member';end if;return new;end$$;
create trigger research_primary_identity before insert or update on public.outreach_members for each row execute function public.research_guard_primary();
create function public.research_guard_subject()returns trigger language plpgsql set search_path='' as $$begin
 if old.subject_user_id is not null and (new.subject_user_id is distinct from old.subject_user_id or new.created_by is distinct from old.created_by)then raise exception 'Canonical self-profile identity is immutable';end if;return new;end$$;
create trigger research_subject_identity before update on public.outreach_profiles for each row execute function public.research_guard_subject();
-- Claim corrections and sharing withdrawals are durable. Snapshots and projections are append-only.
create function public.research_immutable()returns trigger language plpgsql as $$begin raise exception 'Research evidence versions are immutable';end$$;
create trigger research_snapshot_immutable before update or delete on public.research_source_snapshots for each row execute function public.research_immutable();
create trigger research_version_immutable before update or delete on public.research_profile_versions for each row execute function public.research_immutable();
-- Raw evidence remains private. Officers receive only selected shared projections through server allowlists.
alter table public.research_projects enable row level security;
alter table public.research_project_contributors enable row level security;
revoke all on public.research_projects,public.research_project_contributors from anon,authenticated;
grant all on public.research_projects,public.research_project_contributors to service_role;
alter table public.research_profile_imports enable row level security;
revoke all on public.research_profile_imports from anon,authenticated;
grant all on public.research_profile_imports to service_role;
do $$declare t text;begin foreach t in array array['research_artifacts','research_source_snapshots','research_claims','research_profile_versions']loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy research_owner_read on public.%I for select to authenticated using(owner_id=(select auth.uid()) and public.outreach_is_member())',t);
 end loop;end$$;
-- Member artifact acquisition has its own atomic bounded queue and fenced completion.
alter table public.research_artifacts add column claim_token uuid,add column lease_expires_at timestamptz,add column attempts integer not null default 0;
create table public.research_acquisition_usage(owner_id uuid references auth.users(id),usage_day date not null,requests integer not null default 0 check(requests<=25),primary key(owner_id,usage_day));
alter table public.research_acquisition_usage enable row level security;
revoke all on public.research_acquisition_usage from anon,authenticated;
grant all on public.research_acquisition_usage to service_role;
create function public.research_add_artifact(p_user_id uuid,p_profile_id uuid,p_url text,p_kind text,p_relationship text,p_contribution text)returns uuid language plpgsql set search_path='' as $$
declare aid uuid;begin
 perform 1 from public.outreach_members where user_id=p_user_id and enabled and primary_profile_id=p_profile_id for update;
 if not found then raise exception 'Enabled canonical account required';end if;
 select id into aid from public.research_artifacts where profile_id=p_profile_id and canonical_url=p_url;
 if aid is not null then return aid;end if;
 if (select count(*) from public.research_artifacts where owner_id=p_user_id)>=50 then raise exception 'Research link limit reached';end if;
 insert into public.research_artifacts(profile_id,owner_id,canonical_url,kind,relationship,contribution)values(p_profile_id,p_user_id,p_url,p_kind,p_relationship,p_contribution)returning id into aid;
 if p_contribution<>'' then insert into public.research_claims(profile_id,owner_id,artifact_id,statement,predicate,origin,support_state,adoption,provenance)values(p_profile_id,p_user_id,aid,p_contribution,'contribution','member','self_reported','accepted',jsonb_build_object('actorId',p_user_id,'artifactId',aid,'relationship',p_relationship,'revision',1));end if;
 return aid;
end$$;
create function public.research_claim_artifact(p_user_id uuid,p_artifact_id uuid)returns jsonb language plpgsql set search_path='' as $$
declare a public.research_artifacts;used integer;cost integer;begin
 perform 1 from public.outreach_members where user_id=p_user_id and enabled for update;if not found then raise exception 'Enabled membership required';end if;
 select * into a from public.research_artifacts where id=p_artifact_id and owner_id=p_user_id for update;
 if found and a.attempts>=3 and (a.state='failed' or (a.state='processing' and a.lease_expires_at<=now()))then update public.research_artifacts set state='failed',error_code='attempts_exhausted',summary='Acquisition attempt limit reached. The saved reference and your contribution remain available.'where id=a.id;return null;end if;
 if not found or a.attempts>=3 or a.state not in('pending','failed','processing') or (a.state='processing' and a.lease_expires_at>now())then return null;end if;
 if a.kind<>'reference' then
  insert into public.research_acquisition_usage(owner_id,usage_day)values(p_user_id,current_date)on conflict do nothing;
  select requests into used from public.research_acquisition_usage where owner_id=p_user_id and usage_day=current_date for update;
  cost:=case when a.kind='repository' then 2 else 1 end;
  if used+cost>25 then update public.research_artifacts set state='pending',error_code='quota_waiting',summary='Waiting for daily source quota; retry after UTC midnight.'where id=a.id;return jsonb_build_object('quotaWaiting',true);end if;
  update public.research_acquisition_usage set requests=requests+cost where owner_id=p_user_id and usage_day=current_date;
 end if;
 update public.research_artifacts set state='processing',error_code=null,claim_token=gen_random_uuid(),lease_expires_at=now()+interval '1 minute',attempts=attempts+1,updated_at=now()where id=a.id returning * into a;
 return to_jsonb(a);
end$$;
create function public.research_complete_artifact(p_user_id uuid,p_artifact_id uuid,p_token uuid,p_result jsonb)returns boolean language plpgsql set search_path='' as $$
declare a public.research_artifacts;pid uuid;sid uuid;begin
 perform 1 from public.outreach_members where user_id=p_user_id and enabled for update;if not found then return false;end if;
 select * into a from public.research_artifacts where id=p_artifact_id and owner_id=p_user_id and claim_token=p_token and lease_expires_at>now()and state='processing'for update;
 if not found then return false;end if;
 if p_result->>'state'='ready' then
  insert into public.research_projects(canonical_url,title)values(a.canonical_url,p_result->>'title')on conflict(canonical_url)do update set title=excluded.title returning id into pid;
  select id into sid from public.research_source_snapshots where artifact_id=a.id and content_hash=p_result->>'contentHash';
  if sid is null then
   insert into public.research_source_snapshots(artifact_id,owner_id,content_hash,text_content,metadata)values(a.id,p_user_id,p_result->>'contentHash',p_result->>'text',p_result->'metadata')returning id into sid;
   insert into public.research_claims(profile_id,owner_id,artifact_id,snapshot_id,project_id,statement,predicate,origin,support_state,adoption,provenance)values(a.profile_id,p_user_id,a.id,sid,pid,p_result->>'title','artifact_title','source','supported','candidate',jsonb_build_object('field','title','adapter',p_result->'metadata'->>'adapter'));
  end if;
  update public.research_claims set project_id=pid where artifact_id=a.id and predicate='contribution' and withdrawn_at is null and adoption='accepted' and project_id is null;
  insert into public.research_project_contributors(project_id,profile_id,relationship,contribution)values(pid,a.profile_id,a.relationship,a.contribution)on conflict(project_id,profile_id)do update set relationship=excluded.relationship,contribution=excluded.contribution;
 end if;
 update public.research_artifacts set state=p_result->>'state',summary=coalesce(p_result->>'summary',''),project_id=coalesce(pid,project_id),error_code=p_result->>'errorCode',claim_token=null,lease_expires_at=null,updated_at=now()where id=a.id;
 return true;
end$$;
revoke all on function public.research_add_artifact(uuid,uuid,text,text,text,text),public.research_claim_artifact(uuid,uuid),public.research_complete_artifact(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.research_add_artifact(uuid,uuid,text,text,text,text),public.research_claim_artifact(uuid,uuid),public.research_complete_artifact(uuid,uuid,uuid,jsonb) to service_role;
-- Bind future approvals to only the evidence they consumed.
alter table public.outreach_proposals add column evidence_claim_ids uuid[] not null default '{}';
alter table public.outreach_proposals add column profile_version_id uuid references public.research_profile_versions(id);
create function public.research_withdraw_consumed_claim()returns trigger language plpgsql set search_path='' as $$begin
 if (new.withdrawn_at is not null and old.withdrawn_at is null) or (old.sharing_scope='officer' and new.sharing_scope='private') then
  update public.outreach_outbox set status='failed',error='Consumed research evidence withdrawn; review again',updated_at=now() where status='queued' and proposal_id in(select id from public.outreach_proposals where old.id=any(evidence_claim_ids));
  update public.outreach_proposals set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where status='approved' and old.id=any(evidence_claim_ids) and not exists(select 1 from public.outreach_outbox o where o.proposal_id=outreach_proposals.id and o.status in('sending','uncertain'));
 end if;return new;end$$;
create trigger research_claim_withdrawal after update on public.research_claims for each row execute function public.research_withdraw_consumed_claim();
create or replace function public.outreach_invalidate_context() returns trigger language plpgsql set search_path='' as $$
declare proposal public.outreach_proposals;begin
 if (to_jsonb(new)-'updated_at')=(to_jsonb(old)-'updated_at')then return new;end if;
 if old.consent_to_share and not new.consent_to_share then
  update public.research_claims set withdrawn_at=coalesce(withdrawn_at,now()),sharing_scope='private' where profile_id=old.id and sharing_scope='officer';
 end if;
 for proposal in select * from public.outreach_proposals where status='approved' and profile_id=old.id for update loop
  -- Existing submissions remain immutable and reconcilable; privacy withdrawal never waits for them.
  if exists(select 1 from public.outreach_outbox where proposal_id=proposal.id and status in('sending','uncertain'))then continue;end if;
  update public.outreach_proposals set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where id=proposal.id;
  update public.outreach_outbox set status='failed',error='Profile context changed; review and approve again',updated_at=now()where proposal_id=proposal.id and status='queued';
 end loop;return new;end$$;
commit;
