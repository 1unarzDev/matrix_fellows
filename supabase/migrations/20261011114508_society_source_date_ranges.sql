-- Preserve an optional end date for society source periods selected in the
-- source calendar. The existing source_date remains the period start.
begin;

alter table public.outreach_society_sources
  add column if not exists source_end_date date;

alter table public.outreach_society_sources
  add constraint outreach_society_sources_date_order
  check (source_end_date is null or source_date is null or source_end_date >= source_date);

commit;
