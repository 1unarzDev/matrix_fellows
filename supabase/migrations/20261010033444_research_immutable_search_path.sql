-- Pin the trigger-only helper's resolution path; preserve immutable evidence.
begin;
alter function public.research_immutable() set search_path = '';
commit;
