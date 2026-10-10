begin;
create function public.research_society_context_valid(plan jsonb,s public.outreach_society) returns boolean
language sql immutable set search_path='' as $$
 select not(plan ? 'societyContext') or (
  plan->'societyContext'->>'name'=s.name and not exists(
   select 1 from jsonb_array_elements(coalesce(plan->'societyContext'->'accomplishments','[]')) a
   where not exists(select 1 from jsonb_array_elements(s.accomplishments) current_fact where current_fact=a)
  )
 );
$$;
create or replace function public.outreach_invalidate_society() returns trigger language plpgsql set search_path='' as $$
declare p public.outreach_proposals;
begin
 if new is not distinct from old then return new;end if;
 for p in select * from public.outreach_proposals where status='approved' for update loop
  if p.proposal_plan ? 'societyContext' and public.research_society_context_valid(p.proposal_plan,new)then continue;end if;
  if exists(select 1 from public.outreach_outbox where proposal_id=p.id and status in('sending','uncertain'))then continue;end if;
  update public.outreach_proposals set status='draft',approved_revision=null,approved_fingerprint=null,approved_by=null,approved_at=null where id=p.id;
  update public.outreach_outbox set status='failed',error='Selected society evidence changed; review again',updated_at=now()where proposal_id=p.id and status='queued';
 end loop;return new;
end$$;
create function public.research_society_approval_guard() returns trigger language plpgsql set search_path='' as $$declare s public.outreach_society;begin
 if new.status='approved' then select * into s from public.outreach_society where id=true for share;
  if not public.research_society_context_valid(new.proposal_plan,s)then raise exception 'Selected society evidence changed; rebuild proposal';end if;
 end if;return new;
end$$;
create trigger research_society_approval before insert or update on public.outreach_proposals for each row execute function public.research_society_approval_guard();
create function public.research_society_send_guard() returns trigger language plpgsql set search_path='' as $$declare p public.outreach_proposals;s public.outreach_society;begin
 if new.status='sending' and old.status is distinct from new.status then
  select * into p from public.outreach_proposals where id=new.proposal_id;
  select * into s from public.outreach_society where id=true for share;
  if not public.research_society_context_valid(p.proposal_plan,s)then raise exception 'Selected society evidence changed; rebuild proposal';end if;
 end if;return new;
end$$;
create trigger research_society_send before update on public.outreach_outbox for each row execute function public.research_society_send_guard();
commit;
