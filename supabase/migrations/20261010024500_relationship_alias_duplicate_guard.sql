begin;
-- One atomic conversation boundary, including evidence-backed URL/email aliases.
create function public.outreach_validate_alias_conversation(p public.outreach_proposals) returns void
language plpgsql set search_path='' as $$
declare keys text[];related uuid[];
begin
 perform 1 from public.outreach_settings where id=true for update;
 select array[t.canonical_url,t.dossier->>'labUrl',lower(p.recipient)] into keys from public.outreach_targets t where id=p.target_id;
 select array_agg(distinct a.relationship_id) into related from public.outreach_relationship_aliases a where a.identity_key=any(keys);
 if exists(
  select 1 from public.outreach_outbox o join public.outreach_proposals prior on prior.id=o.proposal_id
  join public.outreach_targets pt on pt.id=prior.target_id
  where o.proposal_id<>p.id and (o.status in('sending','sent','uncertain') or o.status='queued' and prior.status='approved' and prior.approved_revision=o.revision)
  and (o.relationship_key=any(keys) or lower(o.recipient)=any(keys) or prior.relationship_id=any(related)
    or exists(select 1 from public.outreach_relationship_aliases a where a.relationship_id=any(related) and a.identity_key in(pt.canonical_url,pt.dossier->>'labUrl',lower(o.recipient),o.relationship_key)))
  and not coalesce((p.message_kind='follow_up' and p.relationship_id=any(related) and o.status='sent'
     and (prior.relationship_id=p.relationship_id or exists(select 1 from public.outreach_relationship_aliases a where a.relationship_id=p.relationship_id and a.identity_key in(pt.canonical_url,pt.dossier->>'labUrl',lower(o.recipient),o.relationship_key)))
     and exists(select 1 from public.outreach_relationships r where r.id=p.relationship_id and r.owner_id=p.current_owner_id and not r.suppressed and r.stage not in('declined','closed'))),false)
 )then raise exception 'An outreach conversation already exists for this relationship; coordinate an approved follow-up';end if;
end$$;
revoke all on function public.outreach_validate_alias_conversation(public.outreach_proposals) from public,anon,authenticated;
grant execute on function public.outreach_validate_alias_conversation(public.outreach_proposals) to service_role;
create function public.outreach_alias_approval_guard() returns trigger language plpgsql set search_path='' as $$begin
 if new.status='approved' then perform public.outreach_validate_alias_conversation(new);end if;return new;
end$$;
create trigger outreach_alias_approval before insert or update on public.outreach_proposals for each row execute function public.outreach_alias_approval_guard();
create function public.outreach_alias_send_guard() returns trigger language plpgsql set search_path='' as $$declare p public.outreach_proposals;begin
 if new.status='sending' and old.status is distinct from new.status then
  select * into p from public.outreach_proposals where id=new.proposal_id;
  perform public.outreach_validate_alias_conversation(p);
 end if;return new;
end$$;
create trigger outreach_alias_send before update on public.outreach_outbox for each row execute function public.outreach_alias_send_guard();
commit;
