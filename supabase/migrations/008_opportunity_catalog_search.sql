begin;

create extension if not exists pg_trgm with schema extensions;

alter table public.opportunities
  add column if not exists slug text,
  add column if not exists search_document text not null default '',
  add column if not exists catalog_version bigint not null default 1;

create or replace function public.opportunity_slug(value text, identity text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from left(regexp_replace(lower(coalesce(value,'')), '[^a-z0-9]+', '-', 'g'), 150))
    || '-' || left(md5(identity), 8);
$$;

create or replace function public.sync_opportunity_catalog()
returns trigger language plpgsql set search_path = '' as $$
declare effective jsonb := new.data || new.overrides;
begin
  new.slug := coalesce(
    nullif(effective->>'slug',''),
    nullif(new.slug,''),
    public.opportunity_slug(effective->>'title', new.id)
  );
  new.search_document := concat_ws(' ',
    effective->>'title',
    effective->>'organizer',
    effective->>'discipline',
    effective->>'description',
    effective->>'contributionFormat',
    effective->>'eligibility',
    effective->>'highSchoolEvidence',
    effective->'series'->>'name',
    effective->'parent'->>'name',
    (select string_agg(value, ' ') from jsonb_array_elements_text(coalesce(effective->'aliases','[]'))),
    (select string_agg(value, ' ') from jsonb_array_elements_text(coalesce(effective->'disciplines','[]'))),
    (select string_agg(value, ' ') from jsonb_array_elements_text(coalesce(effective->'topics','[]'))),
    (select string_agg(value, ' ') from jsonb_array_elements_text(coalesce(effective->'prerequisites','[]')))
  );
  new.catalog_version := case
    when tg_op = 'UPDATE' and (old.data,old.overrides,old.published,old.suppressed)
      is distinct from (new.data,new.overrides,new.published,new.suppressed)
      then old.catalog_version + 1
    else coalesce(new.catalog_version,1)
  end;
  return new;
end;
$$;

drop trigger if exists opportunity_catalog_sync on public.opportunities;
create trigger opportunity_catalog_sync before insert or update of data,overrides,published,suppressed
on public.opportunities for each row execute function public.sync_opportunity_catalog();

update public.opportunities set
  slug = coalesce(nullif((data || overrides)->>'slug',''), public.opportunity_slug((data || overrides)->>'title', id)),
  search_document = concat_ws(' ',
    (data || overrides)->>'title',
    (data || overrides)->>'organizer',
    (data || overrides)->>'discipline',
    (data || overrides)->>'description',
    (data || overrides)->>'contributionFormat',
    (data || overrides)->>'eligibility',
    (data || overrides)->>'highSchoolEvidence',
    (data || overrides)->'series'->>'name',
    (data || overrides)->'parent'->>'name',
    (select string_agg(value, ' ') from jsonb_array_elements_text(coalesce((data || overrides)->'aliases','[]'))),
    (select string_agg(value, ' ') from jsonb_array_elements_text(coalesce((data || overrides)->'disciplines','[]'))),
    (select string_agg(value, ' ') from jsonb_array_elements_text(coalesce((data || overrides)->'topics','[]'))),
    (select string_agg(value, ' ') from jsonb_array_elements_text(coalesce((data || overrides)->'prerequisites','[]')))
  );

alter table public.opportunities alter column slug set not null;
create unique index if not exists opportunities_slug_idx on public.opportunities(slug);
create index if not exists opportunities_search_fts_idx on public.opportunities
  using gin (to_tsvector('simple', search_document));
create index if not exists opportunities_search_trgm_idx on public.opportunities
  using gin (search_document extensions.gin_trgm_ops);

create or replace function public.opportunity_effective_status(item jsonb, at_time timestamptz default now())
returns text language sql stable set search_path = '' as $$
  select case
    when item->>'lifecycle' = 'rolling' then 'rolling'
    when item->>'lifecycle' = 'awaiting-announcement' then 'awaiting-announcement'
    when item->>'lifecycle' in ('discontinued','replaced') then 'historical'
    when exists (
      select 1 from jsonb_array_elements(coalesce(item->'milestones','[]')) point
      where coalesce((point->>'superseded')::boolean,false)=false
        and case when point->>'date' ~ '^\\d{4}-\\d{2}-\\d{2}$'
          then (point->>'date')::date >= at_time::date
          else (point->>'date')::timestamptz >= at_time end
        and point->>'kind' = 'deadline'
    ) then 'open'
    when item->>'lifecycle' = 'announced' then 'upcoming'
    when jsonb_array_length(coalesce(item->'milestones','[]')) > 0 then 'closed'
    else 'unknown'
  end;
$$;

create or replace function public.search_opportunities(
  p_query text default '',
  p_disciplines text[] default '{}',
  p_kinds text[] default '{}',
  p_high_school text[] default '{}',
  p_stages text[] default '{}',
  p_statuses text[] default '{}',
  p_modes text[] default '{}',
  p_free_submission boolean default false,
  p_archival boolean default null,
  p_sort text default 'relevance',
  p_limit integer default 12,
  p_offset integer default 0
)
returns table(id text,slug text,item jsonb,relevance real,total bigint,facets jsonb,search_version bigint)
language sql stable security invoker set search_path = '' as $$
  with source as (
    select o.id,o.slug,o.data || o.overrides as item,o.search_document,o.catalog_version,
      public.opportunity_effective_status(o.data || o.overrides) as status
    from public.opportunities o
    where o.published and not o.suppressed
  ), scored as (
    select s.*,
      case when trim(p_query)='' then 0
        else greatest(
          case when lower(s.item->>'title')=lower(trim(p_query))
            or exists(select 1 from jsonb_array_elements_text(coalesce(s.item->'aliases','[]')) a where lower(a)=lower(trim(p_query)))
            then 100 else 0 end,
          ts_rank_cd(to_tsvector('simple',s.search_document),websearch_to_tsquery('simple',trim(p_query)))*20,
          extensions.similarity(lower(s.search_document),lower(trim(p_query)))*5
        ) end::real as relevance
    from source s
  ), matching as (
    select * from scored s where
      (trim(p_query)='' or relevance >= 0.12 or to_tsvector('simple',s.search_document) @@ websearch_to_tsquery('simple',trim(p_query)))
      and (cardinality(p_disciplines)=0 or exists(
        select 1 from jsonb_array_elements_text(coalesce(s.item->'disciplines',jsonb_build_array(s.item->>'discipline'))) d
        where lower(d)=any(select lower(value) from unnest(p_disciplines) value)))
      and (cardinality(p_kinds)=0 or s.item->>'kind'=any(p_kinds))
      and (cardinality(p_high_school)=0 or coalesce(s.item->>'highSchoolPolicy','not-stated')=any(p_high_school))
      and (cardinality(p_stages)=0 or exists(select 1 from jsonb_array_elements_text(coalesce(s.item->'preparationStages','[]')) v where v=any(p_stages)))
      and (cardinality(p_statuses)=0 or s.status=any(p_statuses))
      and (cardinality(p_modes)=0 or exists(select 1 from jsonb_array_elements_text(coalesce(s.item->'participationModes','[]')) v where v=any(p_modes)))
      and (not p_free_submission or lower(coalesce(s.item->'costs'->>'submission','')) ~ '(^|\\m)(free|no (submission )?fee)(\\M|$)')
      and (p_archival is null or (s.item->>'archival')::boolean=p_archival)
  ), summary as (
    select count(*)::bigint as total,
      jsonb_build_object(
        'kind',coalesce((select jsonb_object_agg(kind,n) from (select item->>'kind' kind,count(*) n from matching group by 1) k),'{}'),
        'highSchoolPolicy',coalesce((select jsonb_object_agg(policy,n) from (select coalesce(item->>'highSchoolPolicy','not-stated') policy,count(*) n from matching group by 1) h),'{}'),
        'status',coalesce((select jsonb_object_agg(status,n) from (select status,count(*) n from matching group by 1) x),'{}')
      ) facets,
      coalesce(max(catalog_version),1) version
    from matching
  )
  select m.id,m.slug,m.item,m.relevance,s.total,s.facets,s.version
  from matching m cross join summary s
  order by
    case when p_sort='next-deadline' then (
      select min(point->>'date') from jsonb_array_elements(coalesce(m.item->'milestones','[]')) point
      where point->>'kind'='deadline' and coalesce((point->>'superseded')::boolean,false)=false
        and (point->>'date')::date >= current_date) end asc nulls last,
    case when p_sort='verified' then m.item->>'verifiedAt' end desc nulls last,
    case when p_sort='relevance' then m.relevance end desc,
    coalesce((m.item->>'priority')::integer,0) desc,
    lower(m.item->>'title'),m.id
  limit least(greatest(p_limit,1),50) offset greatest(p_offset,0);
$$;

create or replace function public.get_opportunity_by_slug(p_slug text)
returns table(id text,slug text,item jsonb,search_version bigint)
language sql stable security invoker set search_path = '' as $$
  select o.id,o.slug,o.data || o.overrides,o.catalog_version
  from public.opportunities o
  where o.slug=p_slug and o.published and not o.suppressed;
$$;

revoke all on function public.search_opportunities(text,text[],text[],text[],text[],text[],text[],boolean,boolean,text,integer,integer) from public;
grant execute on function public.search_opportunities(text,text[],text[],text[],text[],text[],text[],boolean,boolean,text,integer,integer) to anon,authenticated,service_role;
revoke all on function public.get_opportunity_by_slug(text) from public;
grant execute on function public.get_opportunity_by_slug(text) to anon,authenticated,service_role;

commit;
