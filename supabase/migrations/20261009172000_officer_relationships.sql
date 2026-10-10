-- Adult officer workflow. Historical authorship/outbox evidence is retained.
begin;
create table public.outreach_relationships (
 id uuid primary key default gen_random_uuid(), identity_key text not null unique,
 target_id uuid not null references public.outreach_targets(id), owner_id uuid not null references public.outreach_members(user_id),
 stage text not null default 'planned' check(stage in ('planned','approached','active','declined','closed')),
 next_action text not null default '', next_action_date date, suppressed boolean not null default false,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.outreach_relationship_aliases (
 relationship_id uuid not null references public.outreach_relationships(id), identity_key text primary key
);
create table public.outreach_relationship_events (
 id uuid primary key default gen_random_uuid(), relationship_id uuid not null references public.outreach_relationships(id),
 kind text not null check(kind in ('external_email','reply','call','meeting','decline','invitation','introduction','promise','handoff')),
 note text not null check(length(note) between 1 and 3000), source text not null default 'manual' check(source in ('manual','provider')),
 actor_id uuid not null references public.outreach_members(user_id), occurred_at timestamptz not null, recorded_at timestamptz not null default now(),
 task_id uuid references public.dashboard_tasks(id)
);
create index outreach_relationship_owner on public.outreach_relationships(owner_id);
create index outreach_relationship_events_history on public.outreach_relationship_events(relationship_id,occurred_at);
alter table public.outreach_proposals add column current_owner_id uuid references public.outreach_members(user_id);
update public.outreach_proposals set current_owner_id=created_by;
alter table public.outreach_proposals add column proposal_plan jsonb;
alter table public.outreach_outbox add column approved_context jsonb not null default '{}';
alter table public.outreach_proposals add column relationship_id uuid references public.outreach_relationships(id);
alter table public.outreach_proposals add column message_kind text not null default 'cold' check(message_kind in ('cold','follow_up'));
-- Conservative historical coordination import. Conflicting owners remain in
-- historical outbox metadata for explicit resolution; never choose an arbitrary owner.
insert into public.outreach_relationships(identity_key,target_id,owner_id,stage)
select coalesce(nullif(t.dossier->>'labUrl',''),t.canonical_url),min(p.target_id::text)::uuid,min(p.created_by::text)::uuid,
 case when bool_or(o.status='sent')then 'approached' else 'planned' end
from public.outreach_proposals p join public.outreach_targets t on t.id=p.target_id join public.outreach_outbox o on o.proposal_id=p.id
where p.created_by is not null and o.status in('queued','sending','sent','uncertain')
group by coalesce(nullif(t.dossier->>'labUrl',''),t.canonical_url) having count(distinct p.created_by)=1;
insert into public.outreach_relationship_aliases(relationship_id,identity_key)
select id,identity_key from public.outreach_relationships;
insert into public.outreach_relationship_aliases(relationship_id,identity_key)
select min(r.id::text)::uuid,x.identity_key from public.outreach_relationships r join public.outreach_targets t on t.id=r.target_id
cross join lateral unnest(array[t.canonical_url,lower(t.contact_email)])x(identity_key)
where x.identity_key is not null and x.identity_key<>'' group by x.identity_key having count(distinct r.id)=1 on conflict do nothing;
update public.outreach_proposals p set relationship_id=r.id from public.outreach_relationships r,public.outreach_targets t where t.id=p.target_id and r.identity_key=coalesce(nullif(t.dossier->>'labUrl',''),t.canonical_url);
drop policy proposal_visibility on public.outreach_proposals;
create policy proposal_visibility on public.outreach_proposals for select to authenticated using(public.outreach_is_officer() and current_owner_id=auth.uid());
-- Quarantine legacy approvals; never alter immutable submitted outcomes.
update public.outreach_proposals p set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null
 where status='approved' and not exists(select 1 from public.outreach_outbox o where o.proposal_id=p.id and o.status in ('sending','sent','uncertain'));
create or replace function public.outreach_proposal_guard() returns trigger language plpgsql set search_path='' as $$
declare changed boolean;begin
 if TG_OP='UPDATE' then
 changed=(to_jsonb(new)-array['revision','status','approved_revision','approved_fingerprint','approved_by','approved_at','updated_at']) is distinct from (to_jsonb(old)-array['revision','status','approved_revision','approved_fingerprint','approved_by','approved_at','updated_at']);
 if old.status='sent' and (new.recipient,new.subject,new.body,new.mailbox_id,new.profile_id,new.target_id,new.kind,new.status) is distinct from (old.recipient,old.subject,old.body,old.mailbox_id,old.profile_id,old.target_id,old.kind,old.status)then raise exception 'Sent proposals are immutable';end if;
 if changed then
 if exists(select 1 from public.outreach_outbox where proposal_id=old.id and status in ('sending','uncertain'))then raise exception 'Resolve the sending outcome before editing';end if;
 if old.status='sent' and (to_jsonb(new)-array['relationship_id','updated_at']) is distinct from (to_jsonb(old)-array['relationship_id','updated_at'])then raise exception 'Sent context is immutable';end if;
 if old.status<>'sent' then new.revision=old.revision+1;new.status='draft';new.approved_revision=null;new.approved_fingerprint=null;new.approved_by=null;new.approved_at=null;else new.revision=old.revision;end if;
 else new.revision=old.revision;end if;
 end if;
 new.updated_at=now();return new;end $$;
create or replace function public.outreach_mail_owner_guard() returns trigger language plpgsql set search_path='' as $$begin
 if new.status='approved' and (new.current_owner_id is distinct from new.approved_by or not exists(select 1 from public.outreach_members where user_id=new.approved_by and enabled and role in ('officer','admin'))) then raise exception 'Officer owner approval required';end if;
 return new;end $$;
create or replace function public.outreach_proposal_profile_guard() returns trigger language plpgsql set search_path='' as $$begin
 if TG_OP='INSERT' then new.current_owner_id=coalesce(new.current_owner_id,new.created_by);end if;
 if TG_OP='UPDATE' and new.created_by is distinct from old.created_by then raise exception 'Original author is immutable';end if;
 if TG_OP='INSERT' or (new.target_id,new.kind,new.profile_id,new.recipient,new.subject,new.body) is distinct from (old.target_id,old.kind,old.profile_id,old.recipient,old.subject,old.body) then
 if not exists(select 1 from public.outreach_members where user_id=new.current_owner_id and enabled and role in ('officer','admin')) then raise exception 'Officer access required';end if;
 end if;
 if new.kind='student' and not exists(select 1 from public.outreach_profiles where id=new.profile_id and consent_to_share) then raise exception 'Shareable member profile required';end if;
 if new.kind='society' and new.profile_id is not null then raise exception 'Society drafts cannot include private profiles';end if;
 return new;end $$;
create or replace function public.outreach_assignment_send_guard() returns trigger language plpgsql set search_path='' as $$begin
 if new.status='sending' and old.status is distinct from new.status and not exists(select 1 from public.outreach_members where user_id=new.created_by and enabled and role in ('officer','admin')) then raise exception 'Officer access required';end if;
 return new;end $$;
create or replace function public.outreach_approve_email(p_proposal_id uuid,p_revision integer,p_fingerprint text,p_user_id uuid,p_recipient text,p_subject text,p_body text,p_sender_email text)
returns public.outreach_outbox language plpgsql security definer set search_path='' as $$
declare proposal public.outreach_proposals; mailbox public.outreach_mailboxes; target public.outreach_targets; result public.outreach_outbox; relationship text;
begin
 perform 1 from public.outreach_members where user_id=p_user_id and enabled and role in ('officer','admin') for update;
 if not found then raise exception 'Officer access required';end if;
 select * into proposal from public.outreach_proposals where id=p_proposal_id for update;
 if not found or proposal.current_owner_id is distinct from p_user_id or proposal.revision<>p_revision or proposal.status not in ('draft','approved') then raise exception 'Proposal changed; reload before approval';end if;
 if (proposal.recipient,proposal.subject,proposal.body) is distinct from (p_recipient,p_subject,p_body) or p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Content changed';end if;
 if p_body ~* '\[REVIEW:' or p_subject ~* '\[REVIEW:' then raise exception 'Resolve review placeholders before approval';end if;
 select * into target from public.outreach_targets where id=proposal.target_id for update;
 if not found or target.status not in ('ready','contacted') or exists(select 1 from public.outreach_suppressions where canonical_url=target.canonical_url) then raise exception 'Review and mark this target ready before approval';end if;
 if lower(proposal.recipient)<>lower(coalesce(target.contact_email,'')) then raise exception 'Verify this recipient on the target first';end if;
 relationship=coalesce(nullif(target.dossier->>'labUrl',''),target.canonical_url);

 if proposal.message_kind='follow_up' then
  if proposal.relationship_id is null or not exists(select 1 from public.outreach_relationships r join public.outreach_relationship_aliases a on a.relationship_id=r.id where r.id=proposal.relationship_id and r.owner_id=p_user_id and not r.suppressed and r.stage not in ('declined','closed') and a.identity_key=coalesce(nullif((select dossier->>'labUrl' from public.outreach_targets where id=proposal.target_id),''),(select canonical_url from public.outreach_targets where id=proposal.target_id))) then raise exception 'Verified relationship owner required';end if;
 end if;
 if exists(select 1 from public.outreach_relationships r join public.outreach_relationship_aliases a on a.relationship_id=r.id join public.outreach_targets t on t.id=proposal.target_id where r.suppressed and (a.identity_key=t.canonical_url or a.identity_key=t.dossier->>'labUrl' or a.identity_key=lower(proposal.recipient))) then raise exception 'Relationship suppressed';end if;
 if exists(select 1 from public.outreach_relationship_aliases a join public.outreach_suppressions ss on ss.canonical_url=a.identity_key where a.relationship_id in(select aa.relationship_id from public.outreach_relationship_aliases aa join public.outreach_targets tt on tt.id=proposal.target_id where aa.identity_key in(tt.canonical_url,tt.dossier->>'labUrl',lower(proposal.recipient))))then raise exception 'Relationship alias suppressed';end if;
 if proposal.kind='student' and (proposal.current_owner_id is distinct from p_user_id or not exists(select 1 from public.outreach_profiles where id=proposal.profile_id and consent_to_share)) then raise exception 'Your own consented student profile and proposal are required';end if;
 select * into mailbox from public.outreach_mailboxes where id=proposal.mailbox_id and enabled and owner_id=p_user_id for update;
 if not found or mailbox.email<>p_sender_email then raise exception 'Connect your own mailbox before approval';end if;
 if exists(select 1 from public.outreach_outbox where proposal_id=p_proposal_id and status in ('sending','sent','uncertain')) then raise exception 'Resolve the prior sending outcome first';end if;
 -- Serialize all approvals on the singleton to prevent two officers opening
 -- simultaneous approaches to the same verified lab/contact under different IDs.
 perform 1 from public.outreach_settings where id=true for update;
 if exists(select 1 from public.outreach_outbox o join public.outreach_proposals p on p.id=o.proposal_id where o.proposal_id<>p_proposal_id and (o.status in ('sending','sent','uncertain') or o.status='queued' and p.status='approved' and p.approved_revision=o.revision) and (o.relationship_key=relationship or lower(o.recipient)=lower(p_recipient)) and not coalesce((proposal.message_kind='follow_up' and p.relationship_id=proposal.relationship_id and o.status='sent'),false)) then raise exception 'An outreach conversation already exists for this lab or contact';end if;
 update public.outreach_proposals set status='approved',approved_revision=p_revision,approved_fingerprint=p_fingerprint,approved_by=p_user_id,approved_at=now() where id=p_proposal_id;
 insert into public.outreach_outbox(proposal_id,revision,fingerprint,mailbox_id,recipient,subject,body,sender_email,relationship_key,created_by)
 values(p_proposal_id,p_revision,p_fingerprint,proposal.mailbox_id,p_recipient,p_subject,p_body,p_sender_email,relationship,p_user_id)
 on conflict(proposal_id,revision) do update set fingerprint=excluded.fingerprint,mailbox_id=excluded.mailbox_id,recipient=excluded.recipient,subject=excluded.subject,body=excluded.body,sender_email=excluded.sender_email,created_by=excluded.created_by,status='queued',error=null,claim_token=null,claimed_at=null,updated_at=now()
 returning * into result;
 update public.outreach_outbox set approved_context=jsonb_build_object('plan',proposal.proposal_plan,'profileVersion',to_jsonb(proposal)->'profile_version_id','claimIds',to_jsonb(proposal)->'evidence_claim_ids') where id=result.id;
 insert into public.outreach_logs(actor_id,action,target_id,details) values(p_user_id,'email_approved',proposal.target_id,jsonb_build_object('proposal_id',p_proposal_id,'revision',p_revision,'outbox_id',result.id));
 return result;
end $$;

create or replace function public.outreach_claim_send(p_proposal_id uuid,p_revision integer,p_fingerprint text,p_mailbox_id uuid,p_user_id uuid)
returns public.outreach_outbox language plpgsql security definer set search_path='' as $$
declare proposal public.outreach_proposals; result public.outreach_outbox;
begin
 perform 1 from public.outreach_members where user_id=p_user_id and enabled and role in ('officer','admin') for update;
 if not found then raise exception 'Officer access required';end if;
 select * into proposal from public.outreach_proposals where id=p_proposal_id for update;
 if not found or proposal.current_owner_id is distinct from p_user_id or proposal.status<>'approved' or proposal.revision<>p_revision or proposal.approved_revision<>p_revision or proposal.approved_fingerprint<>p_fingerprint or proposal.mailbox_id<>p_mailbox_id or proposal.approved_by<>p_user_id then raise exception 'Approve the exact email before sending';end if;
 if not exists(select 1 from public.outreach_targets where id=proposal.target_id and status in ('ready','contacted')) then raise exception 'Target is no longer ready';end if;
 if exists(select 1 from public.outreach_targets t join public.outreach_suppressions s on s.canonical_url=t.canonical_url where t.id=proposal.target_id) then raise exception 'Target is suppressed';end if;

 if proposal.message_kind='follow_up' then
  if proposal.relationship_id is null or not exists(select 1 from public.outreach_relationships r join public.outreach_relationship_aliases a on a.relationship_id=r.id where r.id=proposal.relationship_id and r.owner_id=p_user_id and not r.suppressed and r.stage not in ('declined','closed') and a.identity_key=coalesce(nullif((select dossier->>'labUrl' from public.outreach_targets where id=proposal.target_id),''),(select canonical_url from public.outreach_targets where id=proposal.target_id))) then raise exception 'Verified relationship owner required';end if;
 end if;
 if exists(select 1 from public.outreach_relationships r join public.outreach_relationship_aliases a on a.relationship_id=r.id join public.outreach_targets t on t.id=proposal.target_id where r.suppressed and (a.identity_key=t.canonical_url or a.identity_key=t.dossier->>'labUrl' or a.identity_key=lower(proposal.recipient))) then raise exception 'Relationship suppressed';end if;
 if exists(select 1 from public.outreach_relationship_aliases a join public.outreach_suppressions ss on ss.canonical_url=a.identity_key where a.relationship_id in(select aa.relationship_id from public.outreach_relationship_aliases aa join public.outreach_targets tt on tt.id=proposal.target_id where aa.identity_key in(tt.canonical_url,tt.dossier->>'labUrl',lower(proposal.recipient))))then raise exception 'Relationship alias suppressed';end if;
 if proposal.kind='student' and (proposal.current_owner_id is distinct from p_user_id or not exists(select 1 from public.outreach_profiles where id=proposal.profile_id and consent_to_share)) then raise exception 'Student consent or ownership changed';end if;
 if not exists(select 1 from public.outreach_targets where id=proposal.target_id and lower(contact_email)=lower(proposal.recipient)) then raise exception 'Recipient changed; verify and approve again';end if;
 if not exists(select 1 from public.outreach_mailboxes where id=p_mailbox_id and enabled and owner_id=p_user_id) then raise exception 'Mailbox owner required';end if;
 select * into result from public.outreach_outbox where proposal_id=p_proposal_id and revision=p_revision for update;
 if not found or result.status not in ('queued','failed') or result.fingerprint<>p_fingerprint or result.mailbox_id<>p_mailbox_id or result.created_by<>p_user_id or (result.recipient,result.subject,result.body) is distinct from (proposal.recipient,proposal.subject,proposal.body) then raise exception 'This email is already sending or needs reconciliation';end if;
 if result.approved_context is distinct from jsonb_build_object('plan',proposal.proposal_plan,'profileVersion',to_jsonb(proposal)->'profile_version_id','claimIds',to_jsonb(proposal)->'evidence_claim_ids')then raise exception 'Evidence context changed; approve again';end if;
 if result.sender_email<>(select email from public.outreach_mailboxes where id=p_mailbox_id) then raise exception 'Sender changed';end if;
 update public.outreach_outbox set status='sending',claim_token=gen_random_uuid(),claimed_at=now(),updated_at=now(),error=null where id=result.id returning * into result;
 insert into public.outreach_logs(actor_id,action,target_id,details) values(p_user_id,'email_send_claimed',proposal.target_id,jsonb_build_object('outbox_id',result.id));
 return result;
end $$;


do $$declare t text;begin
 foreach t in array array['outreach_relationships','outreach_relationship_aliases','outreach_relationship_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy officer_read on public.%I for select to authenticated using(public.outreach_is_officer())',t);
 end loop;end $$;
drop policy officer_read on public.outreach_relationship_events;
create policy relationship_event_owner on public.outreach_relationship_events for select to authenticated using(public.outreach_is_officer() and exists(select 1 from public.outreach_relationships r where r.id=relationship_id and r.owner_id=auth.uid()));
create function public.outreach_handoff(p_proposal_id uuid,p_actor uuid,p_owner uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.outreach_proposals;begin
 select * into p from public.outreach_proposals where id=p_proposal_id for update;
 if not found or p.current_owner_id<>p_actor or not exists(select 1 from public.outreach_members where user_id=p_actor and enabled and role in ('officer','admin')) or not exists(select 1 from public.outreach_members where user_id=p_owner and enabled and role in ('officer','admin')) then raise exception 'Officer owner required';end if;
 if p.status='sent' or exists(select 1 from public.outreach_outbox where proposal_id=p.id and status in ('sending','uncertain','sent')) then raise exception 'Resolve submission before handoff';end if;
 update public.outreach_proposals set current_owner_id=p_owner,mailbox_id=null,status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where id=p.id;
 update public.outreach_outbox set status='failed',error='Ownership changed; fresh approval required' where proposal_id=p.id and status='queued';
 if p.relationship_id is not null then
 update public.outreach_relationships set owner_id=p_owner,version=version+1,updated_at=now() where id=p.relationship_id and owner_id=p_actor;
 insert into public.outreach_relationship_events(relationship_id,kind,note,actor_id,occurred_at)values(p.relationship_id,'handoff','Coordination handed to another officer',p_actor,now());end if;
 end $$;
create function public.outreach_record_relationship(p_target uuid,p_actor uuid,p_kind text,p_note text,p_occurred timestamptz,p_due date default null) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.outreach_relationships;t public.outreach_targets;k text;task uuid;begin
 if not exists(select 1 from public.outreach_members where user_id=p_actor and enabled and role in ('officer','admin')) then raise exception 'Officer access required';end if;
 perform 1 from public.outreach_settings where id=true for update;
 select * into t from public.outreach_targets where id=p_target for update;
 if not found then raise exception 'Target required';end if;
 k=coalesce(nullif(t.dossier->>'labUrl',''),t.canonical_url);
 select rr.* into r from public.outreach_relationships rr join public.outreach_relationship_aliases a on a.relationship_id=rr.id where a.identity_key in (k,t.canonical_url,lower(t.contact_email)) limit 1 for update of rr;
 if r.id is null then insert into public.outreach_relationships(identity_key,target_id,owner_id)values(k,p_target,p_actor)returning * into r;end if;
 if r.owner_id<>p_actor then raise exception 'Contact the relationship owner';end if;
 insert into public.outreach_relationship_aliases(relationship_id,identity_key)select r.id,x from unnest(array[k,t.canonical_url,lower(t.contact_email)])x where x is not null and x<>'' on conflict do nothing;
 update public.outreach_proposals pp set relationship_id=r.id where pp.relationship_id is null and exists(select 1 from public.outreach_targets tt where tt.id=pp.target_id and (coalesce(nullif(tt.dossier->>'labUrl',''),tt.canonical_url)=k or lower(tt.contact_email)=lower(t.contact_email)));
 if p_due is not null then insert into public.dashboard_tasks(user_id,title,notes,due_date,legacy_context)values(p_actor,left(p_note,200),'Relationship follow-up',p_due,jsonb_build_object('relationshipId',r.id))returning id into task;end if;
 insert into public.outreach_relationship_events(relationship_id,kind,note,actor_id,occurred_at,task_id)values(r.id,p_kind,p_note,p_actor,p_occurred,task);
 update public.outreach_relationships set next_action=case when p_due is null then next_action else left(p_note,200) end,next_action_date=coalesce(p_due,next_action_date),stage=case when p_kind='decline' then 'declined' when p_kind in ('reply','meeting','invitation')then 'active' when p_kind='external_email'then 'approached' else stage end,version=version+1,updated_at=now()where id=r.id;
 return r.id;end $$;
create function public.outreach_relationship_handoff(p_relationship uuid,p_actor uuid,p_owner uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform 1 from public.outreach_relationships where id=p_relationship and owner_id=p_actor for update;
 if not found or not exists(select 1 from public.outreach_members where user_id=p_actor and enabled and role in ('officer','admin')) or not exists(select 1 from public.outreach_members where user_id=p_owner and enabled and role in ('officer','admin')) then raise exception 'Officer owner required';end if;
 update public.outreach_relationships set owner_id=p_owner,version=version+1,updated_at=now()where id=p_relationship;
 insert into public.outreach_relationship_events(relationship_id,kind,note,actor_id,occurred_at)values(p_relationship,'handoff','Relationship coordination transferred; existing messages and mailbox rights stay with their owners',p_actor,now());
 end $$;
revoke all on function public.outreach_relationship_handoff(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.outreach_relationship_handoff(uuid,uuid,uuid) to service_role;
revoke all on function public.outreach_handoff(uuid,uuid,uuid),public.outreach_record_relationship(uuid,uuid,text,text,timestamptz,date) from public,anon,authenticated;
grant execute on function public.outreach_handoff(uuid,uuid,uuid),public.outreach_record_relationship(uuid,uuid,text,text,timestamptz,date) to service_role;
commit;
