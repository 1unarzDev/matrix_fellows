begin;

-- Migration 015 added the funding-aware signature. Remove the superseded
-- overload so callers that rely on defaults (including older deployments of
-- /api/content) resolve the current function unambiguously.
drop function if exists public.search_opportunities(
  text, text[], text[], text[], text[], text[], text[], boolean, boolean, text, integer, integer
);

commit;
