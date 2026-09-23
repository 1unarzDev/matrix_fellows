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

  it('keeps funding filters evidence-positive and supports the new program kinds', async () => {
    await db.exec(
      await readFile(
        new URL('../../supabase/migrations/015_program_catalog_filters.sql', import.meta.url),
        'utf8',
      ),
    )
    const records = [
      {
        id: 'paid-internship',
        kind: 'Internship',
        costs: { compensation: '$3,600 stipend.', program: null, aid: null },
      },
      {
        id: 'unknown-costs',
        kind: 'Summer program',
        costs: { compensation: null, program: null, aid: null },
      },
      {
        id: 'aid-program',
        kind: 'Summer program',
        costs: {
          compensation: null,
          program: '$4,000',
          aid: 'Need-based tuition waiver available.',
        },
      },
      {
        id: 'free-program',
        kind: 'Summer program',
        costs: { compensation: null, program: 'No participation cost.', aid: null },
      },
    ]
    for (const record of records) {
      const item = {
        ...record,
        title: record.id,
        status: 'open',
        discipline: 'Biomedical engineering',
        disciplines: ['Biomedical engineering'],
        priority: 0,
      }
      await db.query(`insert into public.opportunities(id,slug,data) values ($1,$1,$2::jsonb)`, [
        record.id,
        JSON.stringify(item),
      ])
    }
    const ids = async (funding: string) =>
      (
        await db.query<{ id: string }>(
          `select id from public.search_opportunities(p_funding => array[$1]) order by id`,
          [funding],
        )
      ).rows.map((row) => row.id)

    expect(await ids('paid')).toEqual(['paid-internship'])
    expect(await ids('aid')).toEqual(['aid-program'])
    expect(await ids('no-program-fee')).toEqual(['free-program'])
  })

  it('uses reviewed discipline fit before global prominence without displacing exact intent', async () => {
    await db.exec(
      await readFile(
        new URL('../../supabase/migrations/017_discipline_relevance.sql', import.meta.url),
        'utf8',
      ),
    )
    await db.exec(
      await readFile(
        new URL('../../supabase/migrations/018_drop_legacy_search_overload.sql', import.meta.url),
        'utf8',
      ),
    )
    const records = [
      {
        id: 'biomedical-prototype',
        title: 'Biomedical Prototype Challenge',
        aliases: ['BPC'],
        discipline: 'Biomedical engineering',
        disciplines: ['Biomedical engineering', 'Mechanical engineering'],
        disciplineAffinity: { 'Biomedical engineering': 100, 'Mechanical engineering': 25 },
        priority: 99,
      },
      {
        id: 'mechanical-design',
        title: 'Mechanical Design Research',
        aliases: ['MDR'],
        discipline: 'Mechanical engineering',
        disciplines: ['Mechanical engineering'],
        disciplineAffinity: { 'Mechanical engineering': 100 },
        priority: 70,
      },
      {
        id: 'broad-fair',
        title: 'Regional Science Fair',
        aliases: ['RSF'],
        discipline: 'Multidisciplinary STEM',
        disciplines: ['Mechanical engineering'],
        disciplineAffinity: { 'Mechanical engineering': 90 },
        priority: 75,
      },
    ]
    for (const record of records) {
      const item = { ...record, kind: 'Competition', status: 'open' }
      await db.query(
        `insert into public.opportunities(id,slug,data,search_document)
         values ($1,$1,$2::jsonb,$3) on conflict (id) do update set data=excluded.data,search_document=excluded.search_document`,
        [record.id, JSON.stringify(item), `${record.title} ${(record.aliases || []).join(' ')}`],
      )
    }

    const filtered = await db.query<{ id: string }>(
      `select id from public.search_opportunities(
        p_disciplines => array['Mechanical engineering'], p_sort => 'relevance')`,
    )
    const ordered = filtered.rows.map((row) => row.id)
    expect(ordered.indexOf('mechanical-design')).toBeLessThan(ordered.indexOf('broad-fair'))
    expect(ordered.indexOf('broad-fair')).toBeLessThan(ordered.indexOf('biomedical-prototype'))

    const exact = await db.query<{ id: string }>(
      `select id from public.search_opportunities(
        p_query => 'Biomedical Prototype Challenge',
        p_disciplines => array['Mechanical engineering'], p_sort => 'relevance')`,
    )
    expect(exact.rows[0]?.id).toBe('biomedical-prototype')
  })
})
