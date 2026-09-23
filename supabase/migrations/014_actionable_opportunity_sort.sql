begin;

create or replace function public.search_opportunities(
  p_query text default '', p_disciplines text[] default '{}', p_kinds text[] default '{}',
  p_high_school text[] default '{}', p_stages text[] default '{}', p_statuses text[] default '{}',
  p_modes text[] default '{}', p_free_submission boolean default false,
  p_archival boolean default null, p_sort text default 'relevance',
  p_limit integer default 12, p_offset integer default 0
)
returns table(id text,slug text,item jsonb,relevance real,total bigint,facets jsonb,search_version bigint)
language sql stable security invoker set search_path = '' as $$
  with query_terms as (
    select distinct term from unnest(regexp_split_to_array(lower(trim(p_query)),'[^a-z0-9]+')) term
    where length(term)>=3 and term not in ('with','from','that','this','without','have','into','about','research')
  ), term_stats as (select count(*)::integer n from query_terms), source as (
    select o.id,o.slug,o.data||o.overrides item,o.search_document,o.catalog_version,
      public.opportunity_effective_status(o.data||o.overrides) status
    from public.opportunities o where o.published and not o.suppressed
  ), scored as (
    select s.*,
      (lower(s.item->>'title')=lower(trim(p_query)) or exists(
        select 1 from jsonb_array_elements_text(coalesce(s.item->'aliases','[]')) a
        where lower(a)=lower(trim(p_query)))) exact,
      (case when trim(p_query)='' then false else
        to_tsvector('simple',s.search_document)@@websearch_to_tsquery('simple',trim(p_query)) end) full_text,
      (select count(*) from query_terms q where to_tsvector('english',s.search_document)@@plainto_tsquery('english',q.term))::integer term_hits,
      case when trim(p_query)='' then 0 else extensions.word_similarity(lower(trim(p_query)),lower(s.search_document)) end fuzzy
    from source s
  ), ranked as (
    select s.*,(case when exact then 100 else 0 end + case when full_text then 30 else 0 end +
      case when ts.n>0 then term_hits::real/ts.n*12 else 0 end +
      case when ts.n<=2 then fuzzy*5 else 0 end)::real relevance
    from scored s cross join term_stats ts
    where trim(p_query)='' or exact or full_text or
      (ts.n=1 and fuzzy>=0.48) or (ts.n>=2 and term_hits>=2 and term_hits::real/ts.n>=0.5)
  ), matching as (
    select * from ranked s where
      (cardinality(p_disciplines)=0 or exists(select 1 from jsonb_array_elements_text(coalesce(s.item->'disciplines',jsonb_build_array(s.item->>'discipline'))) d where lower(d)=any(select lower(v) from unnest(p_disciplines) v)))
      and (cardinality(p_kinds)=0 or s.item->>'kind'=any(p_kinds))
      and (cardinality(p_high_school)=0 or coalesce(s.item->>'highSchoolPolicy','not-stated')=any(p_high_school))
      and (cardinality(p_stages)=0 or exists(select 1 from jsonb_array_elements_text(coalesce(s.item->'preparationStages','[]')) v where v=any(p_stages)))
      and (cardinality(p_statuses)=0 or s.status=any(p_statuses))
      and (cardinality(p_modes)=0 or exists(select 1 from jsonb_array_elements_text(coalesce(s.item->'participationModes','[]')) v where v=any(p_modes)))
      and (not p_free_submission or lower(coalesce(s.item->'costs'->>'submission','')) ~ '(^|\m)(free|no (submission )?fee)(\M|$)')
      and (p_archival is null or (s.item->>'archival')::boolean=p_archival)
  ), summary as (
    select count(*)::bigint total,jsonb_build_object(
      'kind',coalesce((select jsonb_object_agg(k,n) from (select item->>'kind' k,count(*) n from matching group by 1) v),'{}'),
      'highSchoolPolicy',coalesce((select jsonb_object_agg(k,n) from (select coalesce(item->>'highSchoolPolicy','not-stated') k,count(*) n from matching group by 1) v),'{}'),
      'status',coalesce((select jsonb_object_agg(k,n) from (select status k,count(*) n from matching group by 1) v),'{}'),
      'discipline',coalesce((select jsonb_object_agg(k,n) from (select d k,count(distinct id) n from matching cross join lateral jsonb_array_elements_text(coalesce(item->'disciplines',jsonb_build_array(item->>'discipline'))) d group by d) v),'{}')
    ) facets,coalesce(max(catalog_version),1) version from matching
  )
  select m.id,m.slug,m.item,m.relevance,s.total,s.facets,s.version from matching m cross join summary s
  order by
    case when p_sort='actionable' then case m.status
      when 'open' then 0 when 'rolling' then 1 when 'upcoming' then 2
      when 'awaiting-announcement' then 3 when 'closed' then 4
      when 'historical' then 5 else 6 end end asc nulls last,
    case when p_sort in ('next-deadline','actionable') then (
      select min(point->>'date') from jsonb_array_elements(coalesce(m.item->'milestones','[]')) point
      where point->>'kind'='deadline' and coalesce((point->>'superseded')::boolean,false)=false
        and (point->>'date')::date>=current_date) end asc nulls last,
    case when p_sort='verified' then m.item->>'verifiedAt' end desc nulls last,
    case when p_sort='relevance' then m.relevance end desc,
    coalesce((m.item->>'priority')::integer,0) desc,lower(m.item->>'title'),m.id
  limit least(greatest(p_limit,1),50) offset greatest(p_offset,0);
$$;

commit;
