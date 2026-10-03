-- Durable, human-approved sending. Research workers cannot claim an email without
-- an attributed approval matching the exact revision and sender snapshot.
begin;
alter table public.outreach_outbox add column if not exists recipient text not null default '';
alter table public.outreach_outbox add column if not exists subject text not null default '';
alter table public.outreach_outbox add column if not exists body text not null default '';
alter table public.outreach_outbox add column if not exists sender_email text not null default '';
alter table public.outreach_outbox add column if not exists relationship_key text not null default '';

-- Profile and society changes invalidate approvals instead of silently sending
-- claims the officer never approved. In-flight outcomes must be settled first.
create function public.outreach_invalidate_context() returns trigger language plpgsql set search_path='' as $$
declare proposal public.outreach_proposals;
begin
 for proposal in select * from public.outreach_proposals where status='approved' and
  (TG_TABLE_NAME='outreach_society' or profile_id=old.id) for update loop
  if exists(select 1 from public.outreach_outbox where proposal_id=proposal.id and status in ('sending','uncertain')) then raise exception 'Resolve active sending before changing outreach context';end if;
  update public.outreach_proposals set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where id=proposal.id;
  update public.outreach_outbox set status='failed',error='Profile or society context changed; review and approve again',updated_at=now() where proposal_id=proposal.id and status='queued';
 end loop;
 return new;
end $$;
-- The society singleton uses a boolean ID; separate functions avoid mixed ID types.
create function public.outreach_invalidate_society() returns trigger language plpgsql set search_path='' as $$
declare proposal public.outreach_proposals;
begin
 if new is not distinct from old then return new;end if;
 for proposal in select * from public.outreach_proposals where status='approved' for update loop
  if exists(select 1 from public.outreach_outbox where proposal_id=proposal.id and status in ('sending','uncertain')) then raise exception 'Resolve active sending before changing society context';end if;
  update public.outreach_proposals set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where id=proposal.id;
  update public.outreach_outbox set status='failed',error='Society context changed; review and approve again',updated_at=now() where proposal_id=proposal.id and status='queued';
 end loop;
 return new;
end $$;
create trigger outreach_profile_approval_reset before update on public.outreach_profiles for each row execute function public.outreach_invalidate_context();
create trigger outreach_society_approval_reset before update on public.outreach_society for each row execute function public.outreach_invalidate_society();

create function public.outreach_invalidate_target() returns trigger language plpgsql set search_path='' as $$
declare proposal public.outreach_proposals;
begin
 if (new.name,new.organization,new.canonical_url,new.contact_email,new.dossier-'acquisition',new.assessment)
  is not distinct from (old.name,old.organization,old.canonical_url,old.contact_email,old.dossier-'acquisition',old.assessment) then return new;end if;
 for proposal in select * from public.outreach_proposals where target_id=new.id and status='approved' for update loop
  if exists(select 1 from public.outreach_outbox where proposal_id=proposal.id and status in ('sending','uncertain')) then raise exception 'Resolve active sending before changing target context';end if;
  update public.outreach_proposals set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where id=proposal.id;
  update public.outreach_outbox set status='failed',error='Target context changed; review and approve again',updated_at=now() where proposal_id=proposal.id and status='queued';
 end loop;
 return new;
end $$;
create trigger outreach_target_approval_reset before update on public.outreach_targets for each row execute function public.outreach_invalidate_target();

create function public.outreach_approve_email(p_proposal_id uuid,p_revision integer,p_fingerprint text,p_user_id uuid,p_recipient text,p_subject text,p_body text,p_sender_email text)
returns public.outreach_outbox language plpgsql security definer set search_path='' as $$
declare proposal public.outreach_proposals; mailbox public.outreach_mailboxes; target public.outreach_targets; result public.outreach_outbox; relationship text;
begin
 if not exists(select 1 from public.outreach_members where user_id=p_user_id and enabled) then raise exception 'Officer access required';end if;
 select * into proposal from public.outreach_proposals where id=p_proposal_id for update;
 if not found or proposal.revision<>p_revision or proposal.status not in ('draft','approved') then raise exception 'Proposal changed; reload before approval';end if;
 if (proposal.recipient,proposal.subject,proposal.body) is distinct from (p_recipient,p_subject,p_body) or p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Content changed';end if;
 if p_body ~* '\[REVIEW:' or p_subject ~* '\[REVIEW:' then raise exception 'Resolve review placeholders before approval';end if;
 select * into target from public.outreach_targets where id=proposal.target_id for update;
 if not found or target.status<>'ready' or exists(select 1 from public.outreach_suppressions where canonical_url=target.canonical_url) then raise exception 'Review and mark this target ready before approval';end if;
 if lower(proposal.recipient)<>lower(coalesce(target.contact_email,'')) then raise exception 'Verify this recipient on the target first';end if;
 relationship=coalesce(nullif(target.dossier->>'labUrl',''),target.canonical_url);
 if proposal.kind='student' and (proposal.created_by is distinct from p_user_id or not exists(select 1 from public.outreach_profiles where id=proposal.profile_id and consent_to_share and created_by=p_user_id)) then raise exception 'Your own consented student profile and proposal are required';end if;
 select * into mailbox from public.outreach_mailboxes where id=proposal.mailbox_id and enabled and owner_id=p_user_id for update;
 if not found or mailbox.email<>p_sender_email then raise exception 'Connect your own mailbox before approval';end if;
 if exists(select 1 from public.outreach_outbox where proposal_id=p_proposal_id and status in ('sending','sent','uncertain')) then raise exception 'Resolve the prior sending outcome first';end if;
 -- Serialize all approvals on the singleton to prevent two officers opening
 -- simultaneous approaches to the same verified lab/contact under different IDs.
 perform 1 from public.outreach_settings where id=true for update;
 if exists(select 1 from public.outreach_outbox o join public.outreach_proposals p on p.id=o.proposal_id where o.proposal_id<>p_proposal_id and (o.status in ('sending','sent','uncertain') or o.status='queued' and p.status='approved' and p.approved_revision=o.revision) and (o.relationship_key=relationship or lower(o.recipient)=lower(p_recipient))) then raise exception 'An outreach conversation already exists for this lab or contact';end if;
 update public.outreach_proposals set status='approved',approved_revision=p_revision,approved_fingerprint=p_fingerprint,approved_by=p_user_id,approved_at=now() where id=p_proposal_id;
 insert into public.outreach_outbox(proposal_id,revision,fingerprint,mailbox_id,recipient,subject,body,sender_email,relationship_key,created_by)
 values(p_proposal_id,p_revision,p_fingerprint,proposal.mailbox_id,p_recipient,p_subject,p_body,p_sender_email,relationship,p_user_id)
 on conflict(proposal_id,revision) do update set fingerprint=excluded.fingerprint,mailbox_id=excluded.mailbox_id,recipient=excluded.recipient,subject=excluded.subject,body=excluded.body,sender_email=excluded.sender_email,created_by=excluded.created_by,status='queued',error=null,claim_token=null,claimed_at=null,updated_at=now()
 returning * into result;
 insert into public.outreach_logs(actor_id,action,target_id,details) values(p_user_id,'email_approved',proposal.target_id,jsonb_build_object('proposal_id',p_proposal_id,'revision',p_revision,'outbox_id',result.id));
 return result;
end $$;

create function public.outreach_claim_send(p_proposal_id uuid,p_revision integer,p_fingerprint text,p_mailbox_id uuid,p_user_id uuid)
returns public.outreach_outbox language plpgsql security definer set search_path='' as $$
declare proposal public.outreach_proposals; result public.outreach_outbox;
begin
 if not exists(select 1 from public.outreach_members where user_id=p_user_id and enabled) then raise exception 'Officer access required';end if;
 select * into proposal from public.outreach_proposals where id=p_proposal_id for update;
 if not found or proposal.status<>'approved' or proposal.revision<>p_revision or proposal.approved_revision<>p_revision or proposal.approved_fingerprint<>p_fingerprint or proposal.mailbox_id<>p_mailbox_id or proposal.approved_by<>p_user_id then raise exception 'Approve the exact email before sending';end if;
 if not exists(select 1 from public.outreach_targets where id=proposal.target_id and status='ready') then raise exception 'Target is no longer ready';end if;
 if exists(select 1 from public.outreach_targets t join public.outreach_suppressions s on s.canonical_url=t.canonical_url where t.id=proposal.target_id) then raise exception 'Target is suppressed';end if;
 if proposal.kind='student' and (proposal.created_by is distinct from p_user_id or not exists(select 1 from public.outreach_profiles where id=proposal.profile_id and consent_to_share and created_by=p_user_id)) then raise exception 'Student consent or ownership changed';end if;
 if not exists(select 1 from public.outreach_targets where id=proposal.target_id and lower(contact_email)=lower(proposal.recipient)) then raise exception 'Recipient changed; verify and approve again';end if;
 if not exists(select 1 from public.outreach_mailboxes where id=p_mailbox_id and enabled and owner_id=p_user_id) then raise exception 'Mailbox owner required';end if;
 select * into result from public.outreach_outbox where proposal_id=p_proposal_id and revision=p_revision for update;
 if not found or result.status not in ('queued','failed') or result.fingerprint<>p_fingerprint or result.mailbox_id<>p_mailbox_id or result.created_by<>p_user_id or (result.recipient,result.subject,result.body) is distinct from (proposal.recipient,proposal.subject,proposal.body) then raise exception 'This email is already sending or needs reconciliation';end if;
 if result.sender_email<>(select email from public.outreach_mailboxes where id=p_mailbox_id) then raise exception 'Sender changed';end if;
 update public.outreach_outbox set status='sending',claim_token=gen_random_uuid(),claimed_at=now(),updated_at=now(),error=null where id=result.id returning * into result;
 insert into public.outreach_logs(actor_id,action,target_id,details) values(p_user_id,'email_send_claimed',proposal.target_id,jsonb_build_object('outbox_id',result.id));
 return result;
end $$;

create function public.outreach_finish_send(p_id uuid,p_claim_token uuid,p_status text,p_provider_message_id text default null,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare item public.outreach_outbox;
begin
 if p_status not in ('sent','uncertain','failed') then raise exception 'Invalid sending outcome';end if;
 select * into item from public.outreach_outbox where id=p_id and status='sending' and claim_token=p_claim_token for update;
 if not found then return false;end if;
 update public.outreach_outbox set status=p_status,provider_message_id=p_provider_message_id,error=left(p_error,1000),updated_at=now() where id=p_id;
 if p_status='sent' then
  update public.outreach_proposals set status='sent' where id=item.proposal_id and revision=item.revision;
  update public.outreach_targets set status='contacted' where id=(select target_id from public.outreach_proposals where id=item.proposal_id);
 end if;
 insert into public.outreach_logs(actor_id,action,target_id,details) select item.created_by,'email_'||p_status,target_id,jsonb_build_object('outbox_id',item.id,'provider_accepted',p_status='sent') from public.outreach_proposals where id=item.proposal_id;
 return true;
end $$;

create function public.outreach_reconcile_send(p_id uuid,p_user_id uuid,p_outcome text,p_note text)
returns boolean language plpgsql security definer set search_path='' as $$
declare item public.outreach_outbox;
begin
 if p_outcome not in ('sent','not_sent') or length(trim(p_note))<15 then raise exception 'Document your Sent-mail check';end if;
 if not exists(select 1 from public.outreach_members where user_id=p_user_id and enabled) then raise exception 'Officer access required';end if;
 select * into item from public.outreach_outbox where id=p_id for update;
 if not found or not exists(select 1 from public.outreach_mailboxes where id=item.mailbox_id and owner_id=p_user_id) then raise exception 'Mailbox owner required';end if;
 if item.status='sending' and item.claimed_at>now()-interval '2 minutes' then raise exception 'Wait for the current provider request to finish';end if;
 if item.status not in ('sending','uncertain') then raise exception 'Only ambiguous sends need reconciliation';end if;
 update public.outreach_outbox set status=case when p_outcome='sent' then 'sent' else 'failed' end,claim_token=null,error='Manually reconciled: '||left(p_note,900),updated_at=now() where id=p_id;
 if p_outcome='sent' then
  update public.outreach_proposals set status='sent' where id=item.proposal_id and revision=item.revision;
  update public.outreach_targets set status='contacted' where id=(select target_id from public.outreach_proposals where id=item.proposal_id);
 end if;
 insert into public.outreach_logs(actor_id,action,details) values(p_user_id,'email_reconciled',jsonb_build_object('outbox_id',p_id,'outcome',p_outcome,'note',p_note));
 return true;
end $$;

revoke all on function public.outreach_approve_email(uuid,integer,text,uuid,text,text,text,text),public.outreach_claim_send(uuid,integer,text,uuid,uuid),public.outreach_finish_send(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.outreach_approve_email(uuid,integer,text,uuid,text,text,text,text),public.outreach_claim_send(uuid,integer,text,uuid,uuid),public.outreach_finish_send(uuid,uuid,text,text,text) to service_role;
revoke all on function public.outreach_reconcile_send(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.outreach_reconcile_send(uuid,uuid,text,text) to service_role;
commit;
