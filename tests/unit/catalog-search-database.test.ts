import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create schema extensions;
    create function extensions.word_similarity(text,text) returns real
      language sql immutable as $$ select 0::real $$;
    create table public.opportunities (
      id text primary key,
      slug text not null,
      data jsonb not null,
      overrides jsonb not null default '{}',
      search_document text not null default '',
      catalog_version bigint not null default 1,
      published boolean not null default true,
      suppressed boolean not null default false
    );
    create function public.opportunity_effective_status(item jsonb) returns text
      language sql stable as $$ select item->>'status' $$;
  `)
  await db.exec(
    await readFile(
      new URL('../../supabase/migrations/014_actionable_opportunity_sort.sql', import.meta.url),
      'utf8',
    ),
  )
})

afterAll(async () => {
  await db?.close()
})

describe('catalog search database sorting', () => {
  it('puts open and rolling routes ahead of closed records and orders open deadlines', async () => {
    const future = (days: number) =>
      new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
    const records = [
      { id: 'closed', status: 'closed', milestones: [] },
      { id: 'rolling', status: 'rolling', milestones: [] },
      {
        id: 'open-later',
        status: 'open',
        milestones: [{ kind: 'deadline', date: future(40) }],
      },
      {
        id: 'open-sooner',
        status: 'open',
        milestones: [{ kind: 'deadline', date: future(10) }],
      },
    ]

    for (const record of records) {
      const item = {
        ...record,
        title: record.id,
        kind: 'Competition',
        discipline: 'Robotics',
        disciplines: ['Robotics'],
        priority: 0,
      }
      await db.query(`insert into public.opportunities(id,slug,data) values ($1,$1,$2::jsonb)`, [
        record.id,
        JSON.stringify(item),
      ])
    }

    const result = await db.query<{ id: string }>(
      `select id from public.search_opportunities(p_sort => 'actionable')`,
    )
    expect(result.rows.map((row) => row.id)).toEqual([
      'open-sooner',
      'open-later',
      'rolling',
      'closed',
    ])
  })
})
