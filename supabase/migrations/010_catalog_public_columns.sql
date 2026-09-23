begin;
-- RLS still limits rows to published, unsuppressed records. These derived
-- columns are required by the security-invoker search/read functions.
grant select (id,data,overrides,published,suppressed,slug,search_document,catalog_version)
  on public.opportunities to anon;
grant select (slug,search_document,catalog_version)
  on public.opportunities to authenticated;
commit;
