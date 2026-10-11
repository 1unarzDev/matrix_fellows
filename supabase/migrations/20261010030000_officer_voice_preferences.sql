begin;
-- Sender-private, local feature observations. Never stores text or mailbox history.
create table public.officer_voice_observations (
 actor_id uuid not null references public.outreach_members(user_id),
 proposal_id uuid not null references public.outreach_proposals(id),revision integer not null check(revision>0),
 origin text not null check(origin in ('approved_edit','unchanged_or_unattributed')),
 word_count integer not null check(word_count between 0 and 30000),
 formality text not null check(formality in ('conversational','neutral','formal')),
 opening text not null check(opening in ('direct','greeting','formal')),
 request_style text not null check(request_style in ('direct','tentative','unknown')),
 created_at timestamptz not null default now(),primary key(actor_id,proposal_id,revision)
);
create function public.officer_voice_immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Approved voice observations are immutable';end $$;
create trigger officer_voice_observation_immutable before update or delete on public.officer_voice_observations for each row execute function public.officer_voice_immutable();
create index officer_voice_recent on public.officer_voice_observations(actor_id,created_at desc);
create table public.officer_voice_settings (
 actor_id uuid primary key references public.outreach_members(user_id),
 preferences jsonb not null default '{}',updated_at timestamptz not null default now()
);
alter table public.officer_voice_observations enable row level security;
alter table public.officer_voice_settings enable row level security;
revoke all on public.officer_voice_observations,public.officer_voice_settings from public,anon,authenticated;
grant select on public.officer_voice_observations,public.officer_voice_settings to authenticated;
grant all on public.officer_voice_observations,public.officer_voice_settings to service_role;
create policy own_voice_observations on public.officer_voice_observations for select to authenticated using(actor_id=(select auth.uid()) and public.outreach_is_officer());
create policy own_voice_settings on public.officer_voice_settings for select to authenticated using(actor_id=(select auth.uid()) and public.outreach_is_officer());
create function public.outreach_record_approved_voice(p_actor uuid,p_proposal uuid,p_revision integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare p public.outreach_proposals; baseline text; words integer;
begin
 if not exists(select 1 from public.outreach_members where user_id=p_actor and enabled and role in('officer','admin'))then raise exception 'Officer authorization required';end if;
 select * into p from public.outreach_proposals where id=p_proposal for update;
 if not found or p.current_owner_id is distinct from p_actor or p.approved_by is distinct from p_actor or p.status<>'approved' or p.revision<>p_revision or p.approved_revision<>p_revision then raise exception 'Exact owner-approved revision required';end if;
 select body into baseline from public.outreach_proposal_revisions where proposal_id=p.id and revision=1;
 words:=case when btrim(p.body)=''then 0 else cardinality(regexp_split_to_array(btrim(p.body),'\s+'))end;
 insert into public.officer_voice_observations(actor_id,proposal_id,revision,origin,word_count,formality,opening,request_style)
 values(p_actor,p.id,p_revision,case when baseline is not null and baseline<>p.body and p.created_by=p_actor then 'approved_edit' else 'unchanged_or_unattributed' end,words,
 case when p.body ~* '(dear (professor|dr\.)|yours (sincerely|faithfully))'then 'formal' when p.body ~* '(^hi\s|\y(i.m|we.re|you.re)\y)'then 'conversational' else 'neutral'end,
 case when p.body ~* '^dear\s'then 'formal' when p.body ~* '^(hello|hi|greetings)\s'then 'greeting' else 'direct'end,
 case when p.body ~* '(would you|could you|might you|would it be)'then 'tentative' when p.body ~* '(please |can you)'then 'direct' else 'unknown'end)
 on conflict(actor_id,proposal_id,revision) do nothing;
 return found;
end $$;
create function public.outreach_set_officer_voice(p_actor uuid,p_preferences jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.outreach_members where user_id=p_actor and enabled and role in('officer','admin'))then raise exception 'Officer authorization required';end if;
 if jsonb_typeof(p_preferences)<>'object' or p_preferences-'length'-'formality'-'opening'-'requestStyle'<>'{}'::jsonb
 or (p_preferences ? 'length' and not coalesce(p_preferences->>'length' in('short','standard','long'),false))
 or (p_preferences ? 'formality' and not coalesce(p_preferences->>'formality' in('conversational','neutral','formal'),false))
 or (p_preferences ? 'opening' and not coalesce(p_preferences->>'opening' in('direct','greeting','formal'),false))
 or (p_preferences ? 'requestStyle' and not coalesce(p_preferences->>'requestStyle' in('direct','tentative','unknown'),false))then raise exception 'Invalid voice preferences';end if;
 insert into public.officer_voice_settings(actor_id,preferences)values(p_actor,p_preferences)on conflict(actor_id)do update set preferences=excluded.preferences,updated_at=now();return true;
end $$;
revoke all on function public.outreach_record_approved_voice(uuid,uuid,integer),public.outreach_set_officer_voice(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.outreach_record_approved_voice(uuid,uuid,integer),public.outreach_set_officer_voice(uuid,jsonb) to service_role;
commit;
