begin;
alter table public.import_sources drop constraint import_sources_kind_check;
alter table public.import_sources add constraint import_sources_kind_check check (kind in ('json','rss','official'));

create table public.import_candidates (
  id text primary key,
  source_id text not null references public.import_sources(id),
  data jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','dismissed')),
  fetched_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.import_candidates enable row level security;
create policy "Owner import review" on public.import_candidates for select to authenticated using (public.is_editor());
revoke all on public.import_candidates from anon, authenticated;
grant select on public.import_candidates to authenticated;
grant all on public.import_candidates to service_role;

-- Changing upstream HTML can only propose changes. Last approved data survives
-- missing fields, parse failures, and unattended scheduled runs.
create function public.stage_import(items jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare item jsonb; stored jsonb; imported integer := 0;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 500 then raise exception 'Invalid import batch'; end if;
  for item in select value from jsonb_array_elements(items) loop
    if not exists(select 1 from public.import_sources where id=item->>'sourceId' and kind='official' and enabled) then raise exception 'Official source not enabled'; end if;
    if item->>'id' is distinct from ((item->>'sourceId') || ':' || (item->>'externalId')) or item->'provenance'->>'contentHash' is null then raise exception 'Invalid candidate'; end if;
    select data into stored from public.opportunities where id=item->>'id';
    if stored is not null and (stored-'verifiedAt'-'provenance'-'published')=(item-'verifiedAt'-'provenance'-'published') then
      update public.opportunities set data=data || jsonb_build_object('verifiedAt',item->'verifiedAt','provenance',item->'provenance') where id=item->>'id';
      -- A proposal may revert to the already-approved facts before review.
      update public.import_candidates set status='approved',data=item,fetched_at=now() where id=item->>'id';
    else
      insert into public.import_candidates(id,source_id,data) values(item->>'id',item->>'sourceId',item)
      on conflict(id) do update set
        status=case when (import_candidates.data-'verifiedAt'-'provenance')=(excluded.data-'verifiedAt'-'provenance') then import_candidates.status else 'pending' end,
        data=excluded.data,fetched_at=now();
    end if;
    imported:=imported+1;
  end loop;
  return imported;
end; $$;
revoke all on function public.stage_import(jsonb) from public, anon, authenticated;
grant execute on function public.stage_import(jsonb) to service_role;

create function public.review_import(candidate_id text, expected_hash text, approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare candidate public.import_candidates;
begin
  if not public.is_editor() then raise exception 'Unauthorized' using errcode='42501'; end if;
  select * into candidate from public.import_candidates where id=candidate_id for update;
  if not found or candidate.status <> 'pending' then raise exception 'Candidate no longer pending'; end if;
  if candidate.data->'provenance'->>'contentHash' is distinct from expected_hash then raise exception 'Source changed; reload review before approving'; end if;
  if approve then
    if not exists(select 1 from public.import_sources where id=candidate.source_id and enabled) then raise exception 'Source disabled'; end if;
    if exists(select 1 from public.opportunities where canonical_url=candidate.data->>'url' and id<>candidate_id) then raise exception 'URL already belongs to another listing'; end if;
    perform public.apply_import(jsonb_build_array(candidate.data));
  end if;
  update public.import_candidates set status=case when approve then 'approved' else 'dismissed' end,reviewed_at=now() where id=candidate_id;
end; $$;
revoke all on function public.review_import(text,text,boolean) from public, anon;
grant execute on function public.review_import(text,text,boolean) to authenticated;

insert into public.import_sources(id,name,kind,url,enabled) values
('isef-2027','Regeneron ISEF 2027','official','https://www.societyforscience.org/isef/affiliated-fair-network/',true),
('davidson-fellows-2027','Davidson Fellows Scholarship 2027','official','https://www.davidsongifted.org/gifted-programs/fellows-scholarship/',true),
('queer-ai-neurips-2026','Queer in AI at NeurIPS 2026','official','https://www.queerinai.com/neurips-2026',true),
('neurips-2026','NeurIPS 2026','official','https://neurips.cc/Conferences/2026/Dates',true),
('cvpr-2027','IEEE/CVF CVPR 2027','official','https://cvpr.thecvf.com/Conferences/2027/Dates',true),
('icra-2027','IEEE ICRA 2027','official','https://2027.ieee-icra.org/contribute/call-for-icra-2027-papers-now-accepting-submissions/',true),
('regeneron-sts-2027','Regeneron Science Talent Search 2027','official','https://www.societyforscience.org/regeneron-sts/application-requirements/',true)
on conflict(id) do nothing;
commit;
