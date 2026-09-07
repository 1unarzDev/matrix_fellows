begin;

create table public.editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.editors enable row level security;
revoke all on public.editors from anon, authenticated;

create function public.is_editor() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.editors where user_id = auth.uid()); $$;
revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to authenticated;

create table public.site_content (
  id text primary key check (id = 'main'),
  data jsonb not null default '{}',
  draft jsonb not null default '{}',
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
create policy "Public published content" on public.site_content for select to anon using (published);
create policy "Owner content" on public.site_content for all to authenticated using (public.is_editor()) with check (public.is_editor());
revoke all on public.site_content from anon, authenticated;
grant select (id, data, published) on public.site_content to anon;
grant select, insert, update on public.site_content to authenticated;

create table public.opportunities (
  id text primary key,
  source_id text not null,
  external_id text not null,
  canonical_url text not null unique,
  data jsonb not null,
  overrides jsonb not null default '{}',
  published boolean not null default false,
  suppressed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);
alter table public.opportunities enable row level security;
create policy "Public listings" on public.opportunities for select to anon using (published and not suppressed);
create policy "Owner listings" on public.opportunities for all to authenticated using (public.is_editor()) with check (public.is_editor());
revoke all on public.opportunities from anon, authenticated;
grant select (id, data, overrides, published, suppressed) on public.opportunities to anon;
grant select, insert, update on public.opportunities to authenticated;

create table public.import_sources (
  id text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  name text not null,
  kind text not null check (kind in ('json','rss')),
  url text not null check (url like 'https://%'),
  enabled boolean not null default false,
  last_run timestamptz,
  last_error text,
  last_count integer,
  updated_at timestamptz not null default now()
);
alter table public.import_sources enable row level security;
create policy "Owner sources" on public.import_sources for all to authenticated using (public.is_editor()) with check (public.is_editor());
revoke all on public.import_sources from anon, authenticated;
grant select, insert, update on public.import_sources to authenticated;
grant all on public.site_content, public.opportunities, public.import_sources, public.editors to service_role;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger site_updated before update on public.site_content for each row execute function public.touch_updated_at();
create trigger opportunities_updated before update on public.opportunities for each row execute function public.touch_updated_at();
create trigger sources_updated before update on public.import_sources for each row execute function public.touch_updated_at();

-- Field-level overrides survive imports; unpublishing also suppresses an imported listing.
create function public.edit_opportunity(opportunity_id text, changes jsonb, make_public boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_editor() then raise exception 'Unauthorized' using errcode = '42501'; end if;
  update public.opportunities set
    overrides = overrides || (changes - 'id' - 'sourceId' - 'externalId' - 'published'),
    published = make_public, suppressed = not make_public
  where id = opportunity_id;
  if not found then raise exception 'Listing not found'; end if;
end; $$;
revoke all on function public.edit_opportunity(text,jsonb,boolean) from public;
grant execute on function public.edit_opportunity(text,jsonb,boolean) to authenticated;

-- Only the scheduled Worker may import. Conflicts never reset manual visibility or overrides.
create function public.apply_import(items jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare item jsonb; imported integer := 0;
begin
  for item in select value from jsonb_array_elements(items) loop
    if exists(select 1 from public.opportunities where canonical_url = item->>'url' and (source_id <> item->>'sourceId' or external_id <> item->>'externalId')) then continue; end if;
    insert into public.opportunities (id, source_id, external_id, canonical_url, data, published)
    values (item->>'id', item->>'sourceId', item->>'externalId', item->>'url', item, true)
    on conflict (source_id, external_id) do update
      set data = excluded.data, canonical_url = excluded.canonical_url;
    imported := imported + 1;
  end loop;
  return imported;
end; $$;
revoke all on function public.apply_import(jsonb) from public, anon, authenticated;
grant execute on function public.apply_import(jsonb) to service_role;

commit;
