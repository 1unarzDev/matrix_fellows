import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

let db: PGlite
const owner = '11111111-1111-4111-8111-111111111111'
const outsider = '22222222-2222-4222-8222-222222222222'

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${owner}'),('${outsider}');
  `)
  await db.exec(
    await readFile(
      new URL('../../supabase/migrations/001_matrix_fellows.sql', import.meta.url),
      'utf8',
    ),
  )
  await db.exec(
    `insert into public.editors values ('${owner}'); insert into public.site_content (id,data,draft,published) values ('main','{"title":"public"}','{"secret":"draft"}',true);`,
  )
})
afterAll(async () => {
  await db?.close()
})

it('stages official facts for owner review and preserves approved data on changes', async () => {
  await db.exec(
    await readFile(
      new URL('../../supabase/migrations/002_official_imports.sql', import.meta.url),
      'utf8',
    ),
  )
  const item = {
    id: 'isef-2027:main',
    sourceId: 'isef-2027',
    externalId: 'main',
    url: 'https://example.org/isef',
    title: 'ISEF',
    provenance: { contentHash: 'a'.repeat(64) },
  }
  await db.exec('set role service_role')
  await db.query('select public.stage_import($1)', [JSON.stringify([item])])
  await db.exec('reset role')
  expect(
    (await db.query("select * from public.opportunities where id='isef-2027:main'")).rows,
  ).toHaveLength(0)
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${outsider}'`)
  await expect(
    db.query('select public.review_import($1,$2,true)', [item.id, item.provenance.contentHash]),
  ).rejects.toThrow(/Unauthorized/)
  await db.exec(`set request.jwt.claim.sub='${owner}'`)
  await expect(
    db.query('select public.review_import($1,$2,true)', [item.id, null]),
  ).rejects.toThrow(/Source changed/)
  await db.query('select public.review_import($1,$2,true)', [item.id, item.provenance.contentHash])
  await db.query('select public.edit_opportunity($1,$2,false)', [
    item.id,
    JSON.stringify({ title: 'Owner title' }),
  ])
  await db.exec('reset role; set role service_role')
  await db.query('select public.stage_import($1)', [JSON.stringify([item])])
  await db.exec('reset role')
  expect(
    (await db.query('select status from public.import_candidates where id=$1', [item.id])).rows[0],
  ).toEqual({ status: 'approved' })
  await db.exec('set role service_role')
  await db.query('select public.stage_import($1)', [
    JSON.stringify([{ ...item, title: 'Changed', provenance: { contentHash: 'b'.repeat(64) } }]),
  ])
  await db.exec('reset role')
  expect(
    (
      await db.query('select data,overrides,suppressed from public.opportunities where id=$1', [
        item.id,
      ])
    ).rows[0],
  ).toMatchObject({
    data: { title: 'ISEF' },
    overrides: { title: 'Owner title' },
    suppressed: true,
  })
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'`)
  await db.query('select public.review_import($1,$2,false)', [item.id, 'b'.repeat(64)])
  await db.exec('reset role; set role service_role')
  await db.query('select public.stage_import($1)', [
    JSON.stringify([{ ...item, title: 'Changed', provenance: { contentHash: 'b'.repeat(64) } }]),
  ])
  await db.exec('reset role')
  expect(
    (await db.query('select status from public.import_candidates where id=$1', [item.id])).rows[0],
  ).toEqual({ status: 'dismissed' })
})

describe('database authorization and publication', () => {
  it('lets anonymous visitors read published data but never drafts or writes', async () => {
    await db.exec('set role anon')
    expect((await db.query('select data from public.site_content')).rows).toEqual([
      { data: { title: 'public' } },
    ])
    await expect(db.query('select draft from public.site_content')).rejects.toThrow(
      /permission denied/,
    )
    await expect(db.query('update public.site_content set published=false')).rejects.toThrow(
      /permission denied/,
    )
    await db.exec('reset role')
  })
  it('rejects authenticated non-owner edits and source changes', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${outsider}'`)
    expect((await db.query('select public.is_editor() as allowed')).rows).toEqual([
      { allowed: false },
    ])
    await expect(
      db.query(
        "insert into public.import_sources (id,name,kind,url) values ('evil','Evil','json','https://example.org')",
      ),
    ).rejects.toThrow(/row-level security/)
    await expect(db.query("select public.edit_opportunity('x','{}',true)")).rejects.toThrow(
      /Unauthorized/,
    )
    expect((await db.query('select data,draft from public.site_content')).rows).toHaveLength(0)
    await db.exec('reset role')
  })
  it('saves owner drafts without changing published data', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}'`)
    await db.query('update public.site_content set draft = \'{"title":"next"}\' where id=\'main\'')
    expect((await db.query('select data,draft from public.site_content')).rows).toEqual([
      { data: { title: 'public' }, draft: { title: 'next' } },
    ])
    await db.exec('reset role')
  })
  it('preserves overrides and suppression through imports and deduplicates other sources', async () => {
    const item = {
      id: 'test:one',
      sourceId: 'test',
      externalId: 'one',
      url: 'https://example.org/event',
      title: 'Original',
    }
    await db.exec('set role service_role')
    await db.query('select public.apply_import($1::jsonb)', [JSON.stringify([item])])
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${owner}'`)
    await db.query(
      'select public.edit_opportunity(\'test:one\',\'{"title":"Owner correction"}\',false)',
    )
    await db.exec('reset role; set role service_role')
    await db.query('select public.apply_import($1::jsonb)', [
      JSON.stringify([
        { ...item, title: 'Updated source' },
        { ...item, id: 'other:two', sourceId: 'other', externalId: 'two' },
      ]),
    ])
    await db.exec('reset role')
    const rows = (
      await db.query(
        "select data,overrides,published,suppressed from public.opportunities where source_id in ('test','other')",
      )
    ).rows
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      data: { title: 'Updated source' },
      overrides: { title: 'Owner correction' },
      published: false,
      suppressed: true,
    })
    await db.exec('set role anon')
    expect((await db.query('select data from public.opportunities')).rows).toHaveLength(0)
    await db.exec('reset role')
  })
})
