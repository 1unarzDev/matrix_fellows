begin;
alter table public.outreach_matches add column work_key text;
create unique index outreach_matches_work_key on public.outreach_matches(created_by,work_key);
-- Relevant fields drive the selected projection. Background or unrelated raw edits
-- do not reset every draft; withdrawing consent still revokes future use immediately.
create or replace function public.outreach_invalidate_context() returns trigger language plpgsql set search_path='' as $$
declare p public.outreach_proposals;
begin
 if (new.full_name,new.interests,new.goals,new.availability,new.location,new.consent_to_share) is not distinct from (old.full_name,old.interests,old.goals,old.availability,old.location,old.consent_to_share)then return new;end if;
 if old.consent_to_share and not new.consent_to_share then update public.research_claims set withdrawn_at=coalesce(withdrawn_at,now()),sharing_scope='private' where profile_id=old.id and sharing_scope='officer';end if;
 for p in select * from public.outreach_proposals where status='approved' and profile_id=old.id for update loop
  if exists(select 1 from public.outreach_outbox where proposal_id=p.id and status in('sending','uncertain'))then continue;end if;
  update public.outreach_proposals set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where id=p.id;
  update public.outreach_outbox set status='failed',error='Selected profile context changed; review again' where proposal_id=p.id and status='queued';
 end loop;return new;
end$$;
commit;
