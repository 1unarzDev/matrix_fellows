-- Verified public identities may enroll only as ordinary members. Explicitly
-- disabled memberships are never revived; privilege remains administratively assigned.
begin;
alter table outreach_members drop constraint outreach_members_role_check;
alter table outreach_members add constraint outreach_members_role_check check(role in ('member','officer','admin'));
alter table outreach_members alter column role set default 'member';
create function outreach_is_member() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.outreach_members where user_id=auth.uid() and enabled)$$;
create function outreach_enroll_member(p_user_id uuid,p_email text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null and lower(email)=lower(p_email)) then raise exception 'Verified identity required';end if;
 insert into public.outreach_members(user_id,email,role) values(p_user_id,lower(p_email),'member') on conflict(user_id) do nothing;
 if not exists(select 1 from public.outreach_members where user_id=p_user_id and enabled and lower(email)=lower(p_email)) then raise exception 'Account disabled or identity changed';end if;
end $$;
revoke all on function outreach_enroll_member(uuid,text) from public,anon,authenticated;
grant execute on function outreach_enroll_member(uuid,text) to service_role;
revoke all on function outreach_is_member() from public,anon;
grant execute on function outreach_is_member() to authenticated,service_role;
-- The older officer function must not treat any enabled membership as an officer.
create or replace function outreach_is_officer() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.outreach_members where user_id=auth.uid() and enabled and role in ('officer','admin')) $$;
drop policy profile_owner on outreach_profiles;
create policy profile_owner on outreach_profiles for select to authenticated using(created_by=auth.uid() and outreach_is_member());
drop policy proposal_visibility on outreach_proposals;
create policy proposal_visibility on outreach_proposals for select to authenticated using(created_by=auth.uid() and outreach_is_member());
drop policy save_self_read on outreach_saves;
create policy save_self_read on outreach_saves for select to authenticated using(user_id=auth.uid() and outreach_is_member());
drop policy catalog_save_owner on outreach_catalog_saves;
create policy catalog_save_owner on outreach_catalog_saves for select to authenticated using(user_id=auth.uid() and outreach_is_member());
drop policy planner_owner on outreach_planner_items;
create policy planner_owner on outreach_planner_items for select to authenticated using(user_id=auth.uid() and outreach_is_member());
create policy member_society on outreach_society for select to authenticated using(outreach_is_member());
create table outreach_assignments (
 target_id uuid not null references outreach_targets(id) on delete cascade,
 user_id uuid not null references outreach_members(user_id) on delete cascade,
 assigned_by uuid not null references outreach_members(user_id),
 created_at timestamptz not null default now(),primary key(target_id,user_id)
);
alter table outreach_assignments enable row level security;
grant select on outreach_assignments to authenticated;
grant all on outreach_assignments to service_role;
create policy assignment_read on outreach_assignments for select to authenticated using(outreach_is_officer() or (user_id=auth.uid() and outreach_is_member()));
create function outreach_member_target_access(p_user_id uuid,p_target_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.outreach_members m join public.outreach_assignments a on a.user_id=m.user_id join public.outreach_targets t on t.id=a.target_id where m.user_id=p_user_id and m.enabled and t.id=p_target_id and t.status='ready' and not exists(select 1 from public.outreach_suppressions s where s.canonical_url=t.canonical_url))
$$;
revoke all on function outreach_member_target_access(uuid,uuid) from public,anon,authenticated;
grant execute on function outreach_member_target_access(uuid,uuid) to service_role;
-- Raw targets include private acquisition/review notes; members read a projection.
create view outreach_ready_targets with(security_barrier=true) as
 select id,name,kind,organization,discipline,canonical_url,contact_email,location,mode,status,scope,description,
 jsonb_build_object('evidence',coalesce(dossier->'evidence','[]'::jsonb),'research',dossier->'research','opportunities',dossier->'opportunities','eligibility',dossier->'eligibility','proposalAngles',dossier->'proposalAngles') as dossier,created_at,updated_at
 from outreach_targets t where status='ready' and outreach_is_member() and (outreach_is_officer() or exists(select 1 from outreach_assignments a where a.target_id=t.id and a.user_id=auth.uid())) and not exists(select 1 from outreach_suppressions s where s.canonical_url=t.canonical_url);
revoke all on outreach_ready_targets from public,anon;grant select on outreach_ready_targets to authenticated,service_role;
-- Existing audited mail RPCs retain their locking/snapshot mechanics. A trigger
-- enforces actual ownership for every role, including service-mediated approvals.
create function outreach_mail_owner_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='approved' then
  if new.created_by is distinct from new.approved_by or not exists(select 1 from public.outreach_members where user_id=new.approved_by and enabled and role in ('member','officer','admin')) then raise exception 'Approve your own proposal';end if;
  if exists(select 1 from public.outreach_members where user_id=new.created_by and role='member') and (new.kind<>'student' or not public.outreach_member_target_access(new.created_by,new.target_id)) then raise exception 'Assigned personal inquiry required';end if;
 end if;
 return new;
end $$;
create trigger outreach_member_approval_owner before insert or update on outreach_proposals for each row execute function outreach_mail_owner_guard();
-- Block any cross-owner service-mediated revision, even before approval.
create function outreach_proposal_profile_guard() returns trigger language plpgsql set search_path='' as $$begin
 if TG_OP='INSERT' or (new.target_id,new.kind,new.profile_id,new.recipient,new.subject,new.body) is distinct from (old.target_id,old.kind,old.profile_id,old.recipient,old.subject,old.body) then
  if exists(select 1 from public.outreach_members where user_id=new.created_by and role='member') and (new.kind<>'student' or not public.outreach_member_target_access(new.created_by,new.target_id)) then raise exception 'Assigned personal inquiry required';end if;
 end if;
 if new.kind='student' and not exists(select 1 from public.outreach_profiles where id=new.profile_id and created_by=new.created_by) then raise exception 'Your own profile required';end if;
 if new.kind='society' and new.profile_id is not null then raise exception 'Society drafts cannot include private profiles';end if;return new;end $$;
create trigger outreach_member_profile_ownership before insert or update on outreach_proposals for each row execute function outreach_proposal_profile_guard();
-- Check assignment at the transactional send claim, not only at draft/approval.
-- Lock the assignment until claim commits so revocation and claim serialize.
create function outreach_assignment_send_guard() returns trigger language plpgsql set search_path='' as $$
declare p public.outreach_proposals;
begin
 if new.status='sending' and old.status is distinct from new.status then
  select * into p from public.outreach_proposals where id=new.proposal_id;
  if exists(select 1 from public.outreach_members where user_id=new.created_by and role='member') then
   perform 1 from public.outreach_assignments where user_id=new.created_by and target_id=p.target_id for update;
   if not found or p.kind<>'student' or not public.outreach_member_target_access(new.created_by,p.target_id) then raise exception 'Assigned personal inquiry required';end if;
  end if;
 end if;return new;
end $$;
create trigger outreach_member_send_assignment before update on outreach_outbox for each row execute function outreach_assignment_send_guard();
commit;
