import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

let db: PGlite
const owner = '11111111-1111-4111-8111-111111111111'
const outsider = '22222222-2222-4222-8222-222222222222'
const fingerprint = 'a'.repeat(64)
const changedFingerprint = 'b'.repeat(64)
const item = {
  id: 'monitor-test:main',
  sourceId: 'monitor-test',
  externalId: 'main',
  title: 'Verified competition',
  url: 'https://example.org/competition',
  verifiedAt: '2026-09-07T00:00:00Z',
  provenance: { contentHash: fingerprint },
}

async function asRole<T>(role: string, run: () => Promise<T>, user = outsider): Promise<T> {
  await db.exec(`set role ${role}; set request.jwt.claim.sub='${user}'`)
  try {
    return await run()
  } finally {
    await db.exec('reset role')
  }
}

async function observe(data = item, hash = fingerprint) {
  return asRole('service_role', async () => {
    const result = await db.query<{ accepted: boolean }>(
      'select public.record_opportunity_observation($1,$2::jsonb,$3) as accepted',
      ['test-monitor', JSON.stringify(data), hash],
    )
    return result.rows[0]!.accepted
  })
}

async function publish() {
  expect(await observe()).toBe(false)
  await db.exec("update public.opportunity_observations set first_seen=now()-interval '6 hours'")
  expect(await observe()).toBe(true)
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${owner}'),('${outsider}');
  `)
  for (const migration of [
    '001_matrix_fellows.sql',
    '002_official_imports.sql',
    '003_opportunity_monitoring.sql',
  ]) {
    await db.exec(
      await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8'),
    )
  }
  await db.exec(`
    insert into public.editors values ('${owner}');
    insert into public.import_sources(id,name,kind,url,enabled)
      values ('monitor-test','Monitor test','official','https://example.org/competition',true);
  `)
})

beforeEach(async () => {
  await db.exec(`
    reset role;
    delete from public.opportunity_observations;
    delete from public.opportunity_monitors;
    delete from public.opportunities;
  `)
  await db.query('insert into public.opportunity_monitors(id,url,seed) values ($1,$2,$3::jsonb)', [
    'test-monitor',
    item.url,
    JSON.stringify(item),
  ])
})

afterAll(async () => {
  await db?.close()
})

describe('opportunity monitoring database', () => {
  it('leases each due job only once and excludes disabled and future jobs', async () => {
    await db.exec(`
      insert into public.opportunity_monitors(id,url,seed,enabled,next_check_at) values
        ('disabled','https://example.org/disabled','{}',false,now()),
        ('future','https://example.org/future','{}',true,now()+interval '1 day');
    `)
    await asRole('service_role', async () => {
      const claims = await Promise.all([
        db.query<{ id: string }>('select id from public.claim_opportunity_monitors(8)'),
        db.query<{ id: string }>('select id from public.claim_opportunity_monitors(8)'),
      ])
      expect(claims.flatMap((result) => result.rows)).toEqual([{ id: 'test-monitor' }])
    })
    const lease = await db.query<{ attempted: boolean; leased: boolean }>(`
      select last_attempt_at is not null as attempted,
        next_check_at > now()+interval '23 hours' as leased
      from public.opportunity_monitors where id='test-monitor'
    `)
    expect(lease.rows).toEqual([{ attempted: true, leased: true }])
  })

  it('keeps the first observation private and schedules a six-hour confirmation', async () => {
    expect(await observe()).toBe(false)
    expect((await db.query('select * from public.opportunities')).rows).toHaveLength(0)
    expect(
      (await db.query('select observations,published_at from public.opportunity_observations'))
        .rows,
    ).toEqual([{ observations: 1, published_at: null }])
    const schedule = await db.query<{ delayed: boolean }>(`
      select next_check_at >= now()+interval '5 hours 59 minutes' as delayed
      from public.opportunity_monitors where id='test-monitor'
    `)
    expect(schedule.rows[0]!.delayed).toBe(true)
    await asRole('anon', async () => {
      expect((await db.query('select data from public.opportunities')).rows).toHaveLength(0)
      expect(
        (await db.query('select * from public.opportunity_monitor_health()')).rows,
      ).toHaveLength(0)
    })
  })

  it('does not publish repeat observations before six hours, then publishes at the boundary', async () => {
    expect(await observe()).toBe(false)
    await db.exec("update public.opportunity_observations set first_seen=now()-interval '5 hours'")
    expect(await observe()).toBe(false)
    expect((await db.query('select * from public.opportunities')).rows).toHaveLength(0)
    await db.exec("update public.opportunity_observations set first_seen=now()-interval '6 hours'")
    expect(await observe()).toBe(true)
    await asRole('anon', async () => {
      expect((await db.query('select data from public.opportunities')).rows).toEqual([
        { data: item },
      ])
    })
    expect(
      (await db.query('select accepted_fingerprint from public.opportunity_monitors')).rows,
    ).toEqual([{ accepted_fingerprint: fingerprint }])
  })

  it('requires each changed fingerprint to accumulate its own confirmation period', async () => {
    await publish()
    const changed = { ...item, title: 'New upstream title' }
    expect(await observe(changed, changedFingerprint)).toBe(false)
    expect(await observe(changed, changedFingerprint)).toBe(false)
    expect((await db.query('select data from public.opportunities')).rows).toEqual([{ data: item }])
    await db.query(
      "update public.opportunity_observations set first_seen=now()-interval '6 hours' where fingerprint=$1",
      [changedFingerprint],
    )
    expect(await observe(changed, changedFingerprint)).toBe(true)
    expect((await db.query('select data from public.opportunities')).rows).toEqual([
      { data: changed },
    ])
  })

  it('limits worker mutation RPCs to service_role and hides monitor tables from anonymous visitors', async () => {
    for (const role of ['anon', 'authenticated']) {
      await asRole(
        role,
        async () => {
          await expect(
            db.query('select * from public.claim_opportunity_monitors(1)'),
          ).rejects.toThrow(/permission denied/)
          await expect(
            db.query('select public.record_opportunity_observation($1,$2::jsonb,$3)', [
              'test-monitor',
              JSON.stringify(item),
              fingerprint,
            ]),
          ).rejects.toThrow(/permission denied/)
        },
        owner,
      )
    }
    await asRole('anon', async () => {
      await expect(db.query('select * from public.opportunity_monitors')).rejects.toThrow(
        /permission denied/,
      )
      await expect(db.query('select * from public.opportunity_observations')).rejects.toThrow(
        /permission denied/,
      )
    })
    await asRole('authenticated', async () => {
      expect(
        (await db.query('update public.opportunity_monitors set enabled=false returning id')).rows,
      ).toEqual([])
      expect((await db.query('select * from public.opportunity_observations')).rows).toEqual([])
    })
    expect(await observe()).toBe(false)
  })

  it('returns only public health fields and never raw errors, seeds or pending facts', async () => {
    await publish()
    await db.exec(
      "update public.opportunity_monitors set last_error='private credential-like diagnostic',last_attempt_at=now()",
    )
    await asRole('anon', async () => {
      const result = await db.query('select * from public.opportunity_monitor_health()')
      expect(result.rows).toHaveLength(1)
      expect(Object.keys(result.rows[0]!).sort()).toEqual([
        'id',
        'issue',
        'last_checked_at',
        'last_success_at',
      ])
      expect(result.rows[0]).toMatchObject({ id: item.id, issue: true })
      expect(JSON.stringify(result.rows)).not.toContain('private credential')
    })
    await db.exec('update public.opportunities set suppressed=true')
    await asRole('anon', async () => {
      expect((await db.query('select * from public.opportunity_monitor_health()')).rows).toEqual([])
    })
  })

  it('preserves owner overrides and suppression when confirmed changes are imported', async () => {
    await publish()
    await asRole(
      'authenticated',
      async () => {
        await db.query('select public.edit_opportunity($1,$2::jsonb,false)', [
          item.id,
          JSON.stringify({ title: 'Owner title' }),
        ])
      },
      owner,
    )
    const changed = { ...item, title: 'Changed official title' }
    expect(await observe(changed, changedFingerprint)).toBe(false)
    await db.query(
      "update public.opportunity_observations set first_seen=now()-interval '6 hours' where fingerprint=$1",
      [changedFingerprint],
    )
    expect(await observe(changed, changedFingerprint)).toBe(true)
    expect(
      (await db.query('select data,overrides,published,suppressed from public.opportunities')).rows,
    ).toEqual([
      { data: changed, overrides: { title: 'Owner title' }, published: false, suppressed: true },
    ])
    await asRole('anon', async () => {
      expect((await db.query('select data from public.opportunities')).rows).toEqual([])
    })
  })

  it('refreshes accepted unchanged facts immediately and clears old failures', async () => {
    await publish()
    await db.exec(
      "update public.opportunity_monitors set last_error='transient fetch error',last_success_at=now()-interval '2 days'",
    )
    const refreshed = { ...item, verifiedAt: '2026-09-08T00:00:00Z' }
    expect(await observe(refreshed)).toBe(true)
    expect((await db.query('select data from public.opportunities')).rows).toEqual([
      { data: refreshed },
    ])
    const health = await db.query(
      `select last_error,last_success_at > now()-interval '1 minute' as fresh from public.opportunity_monitors`,
    )
    expect(health.rows).toEqual([{ last_error: null, fresh: true }])
  })
})
