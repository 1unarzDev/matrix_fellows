begin;
-- Reapproval is not permission to reuse withdrawn or superseded context.
create function public.research_validate_proposal_context(p public.outreach_proposals) returns void
language plpgsql set search_path='' as $$
declare claim_id uuid;c public.research_claims;profile public.outreach_profiles;packet jsonb;
begin
 if p.profile_id is not null then
  select * into profile from public.outreach_profiles where id=p.profile_id for share;
  if not found or not profile.consent_to_share or profile.subject_user_id is null then raise exception 'Shared member evidence needs review';end if;
  perform 1 from public.outreach_members where user_id=profile.subject_user_id and enabled for share;
  if not found then raise exception 'Represented member is inactive';end if;
  if p.profile_version_id is not null then
   select v.packet into packet from public.research_profile_versions v where v.id=p.profile_version_id;
   if packet->>'displayName' is distinct from profile.full_name or packet->'declaredInterests' is distinct from to_jsonb(profile.interests) then raise exception 'Selected profile context changed; rebuild the proposal';end if;
  end if;
  if p.profile_version_id is not null and not exists(select 1 from public.research_profile_versions where id=p.profile_version_id and profile_id=p.profile_id and owner_id=profile.subject_user_id and projection_kind='officer')then raise exception 'Profile evidence version mismatch';end if;
 end if;
 foreach claim_id in array p.evidence_claim_ids loop
  select * into c from public.research_claims where id=claim_id for share;
  if not found or c.adoption<>'accepted' or c.sharing_scope<>'officer' or c.withdrawn_at is not null or c.support_state in('uncertain','conflicting')then raise exception 'Consumed research evidence is no longer valid; rebuild the proposal';end if;
  if p.profile_id is not null and c.profile_id<>p.profile_id then raise exception 'Evidence subject mismatch';end if;
  perform 1 from public.outreach_members where user_id=c.owner_id and enabled for share;
  if not found then raise exception 'Evidence member is inactive';end if;
 end loop;
end $$;
revoke all on function public.research_validate_proposal_context(public.outreach_proposals) from public,anon,authenticated;
grant execute on function public.research_validate_proposal_context(public.outreach_proposals) to service_role;
create function public.research_approval_context_guard() returns trigger language plpgsql set search_path='' as $$begin
 if new.status='approved' then perform public.research_validate_proposal_context(new);end if;return new;
end$$;
create trigger research_approval_context before insert or update on public.outreach_proposals for each row execute function public.research_approval_context_guard();
create function public.research_send_context_guard() returns trigger language plpgsql set search_path='' as $$declare p public.outreach_proposals;begin
 if new.status='sending' and old.status is distinct from new.status then
  select * into p from public.outreach_proposals where id=new.proposal_id;
  perform public.research_validate_proposal_context(p);
 end if;return new;
end$$;
create trigger research_send_context before update on public.outreach_outbox for each row execute function public.research_send_context_guard();
commit;
