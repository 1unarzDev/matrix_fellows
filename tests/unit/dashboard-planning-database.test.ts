import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
let db: PGlite
const owner = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222',
  opportunity = '33333333-3333-4333-8333-333333333333'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;create table outreach_members(user_id uuid primary key,enabled boolean default true);insert into outreach_members(user_id) values('${owner}'),('${other}');create function outreach_is_member() returns boolean language sql stable as $$select exists(select 1 from outreach_members where user_id=auth.uid() and enabled)$$;grant select on outreach_members to authenticated;create table outreach_planner_items(id uuid primary key,user_id uuid,title text,notes text,completed boolean,due_at timestamptz,created_at timestamptz,updated_at timestamptz);insert into outreach_planner_items values('44444444-4444-4444-8444-444444444444','${owner}','Legacy plan','Keep notes',false,'2026-10-09T00:00:00Z',now(),now());`,
  )
  await db.exec(
    'alter table outreach_planner_items add column target_id uuid;alter table outreach_planner_items add column profile_id uuid;alter table outreach_planner_items add column opportunity_id text;',
  )
  await db.exec('grant select, update on outreach_members to service_role')
  await db.exec(
    await readFile(
      new URL(
        '../../supabase/migrations/20261008005351_dashboard_canonical_plan.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  await db.exec(
    'create table opportunities(id text primary key, published boolean default true, suppressed boolean default false);grant select on opportunities to service_role',
  )
  for (const migration of [
    '20261010123000_dashboard_opportunity_intake.sql',
    '20261011095921_dashboard_task_opportunity_links.sql',
  ])
    await db.exec(
      await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8'),
    )
}, 20000)
afterAll(async () => {
  await db?.close()
})
it('migrates stable legacy IDs without deleting original evidence', async () => {
  expect((await db.query('select id,title,legacy_item_id from dashboard_tasks')).rows[0]).toEqual({
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Legacy plan',
    legacy_item_id: '44444444-4444-4444-8444-444444444444',
  })
  expect((await db.query('select * from outreach_planner_items')).rows).toHaveLength(1)
  expect(
    (await db.query('select due_date::text,notes from dashboard_tasks')).rows[0],
  ).toMatchObject({ due_date: '2026-10-08' })
})
it('creates reviewed tasks atomically exactly once per pursuit key', async () => {
  const input = {
    opportunityId: opportunity,
    cycleId: '2027',
    title: 'Program',
    eligibility: 'unknown',
    officialDates: [],
    reviewedTasks: [
      {
        title: 'Ask coordinator',
        dueDate: null,
        scheduledStart: null,
        scheduledEnd: null,
        estimatedHours: 1,
      },
    ],
  }
  await db.query('select dashboard_pursue($1,$2)', [owner, JSON.stringify(input)])
  await db.query('select dashboard_pursue($1,$2)', [owner, JSON.stringify(input)])
  expect((await db.query('select * from dashboard_pursuits')).rows).toHaveLength(1)
  expect(
    (await db.query('select * from dashboard_tasks where pursuit_id is not null')).rows,
  ).toHaveLength(1)
  await expect(
    db.query('select dashboard_pursue($1,$2)', [
      owner,
      JSON.stringify({
        ...input,
        cycleId: 'bad',
        reviewedTasks: [
          { title: 'Bad', scheduledStart: '2026-10-08T13:00Z', scheduledEnd: '2026-10-08T12:00Z' },
        ],
      }),
    ]),
  ).rejects.toThrow()
  expect((await db.query('select * from dashboard_pursuits')).rows).toHaveLength(1)
})
it('isolates private data and disallows client writes or invoking privileged pursue', async () => {
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${other}'`)
  expect((await db.query('select * from dashboard_tasks')).rows).toHaveLength(0)
  await expect(
    db.query(`insert into dashboard_activities(user_id,title) values('${other}','Bad')`),
  ).rejects.toThrow(/permission denied/)
  await expect(db.query('select dashboard_pursue($1,$2)', [owner, '{}'])).rejects.toThrow(
    /permission denied/,
  )
  await db.exec('reset role')
})
it('rejects cross-owner parents and preserves immutable official dates on task movement', async () => {
  const p = (await db.query<{ id: string }>('select id from dashboard_pursuits')).rows[0]!.id
  await expect(
    db.query(`insert into dashboard_tasks(user_id,pursuit_id,title) values($1,$2,'Private')`, [
      other,
      p,
    ]),
  ).rejects.toThrow(/foreign key/)
  await db.query(
    "update dashboard_tasks set due_date='2026-12-01',version=version+1 where pursuit_id=$1 and version=1",
    [p],
  )
  expect((await db.query('select official_dates from dashboard_pursuits')).rows[0]).toEqual({
    official_dates: [],
  })
  expect(
    (
      await db.query(
        'update dashboard_tasks set title=$1 where pursuit_id=$2 and version=1 returning id',
        ['Stale', p],
      )
    ).rows,
  ).toHaveLength(0)
})
it('enforces dependencies in the database, not just in the editor', async () => {
  const a = (
    await db.query<{ id: string }>(
      "insert into dashboard_tasks(user_id,title) values($1,'A') returning id",
      [owner],
    )
  ).rows[0]!.id
  const b = (
    await db.query<{ id: string }>(
      "insert into dashboard_tasks(user_id,title,depends_on) values($1,'B',array[$2::uuid]) returning id",
      [owner, a],
    )
  ).rows[0]!.id
  await expect(
    db.query('update dashboard_tasks set depends_on=array[$1::uuid] where id=$2', [b, a]),
  ).rejects.toThrow(/Dependency cycle/)
  await expect(
    db.query(
      "insert into dashboard_tasks(user_id,title,depends_on) values($1,'Other',array[$2::uuid])",
      [other, a],
    ),
  ).rejects.toThrow(/private tasks/)
})
it('links a saved opportunity without a pursuit and preserves it after unpublication', async () => {
  await db.query("insert into opportunities(id) values ('catalog:test-workshop')")
  await db.exec('set role service_role')
  const { rows } = await db.query<{ id: string }>(
    "insert into dashboard_tasks(user_id,title,opportunity_id,milestone_key) values($1,'Read workshop requirements','catalog:test-workshop','2027-02-15|Registration') returning id",
    [owner],
  )
  await db.exec('reset role')
  await db.exec("update opportunities set published=false where id='catalog:test-workshop'")
  await db.query("update dashboard_tasks set title='Prepare workshop question' where id=$1", [
    rows[0]!.id,
  ])
  expect(
    (
      await db.query('select opportunity_id,milestone_key from dashboard_tasks where id=$1', [
        rows[0]!.id,
      ])
    ).rows[0],
  ).toEqual({
    opportunity_id: 'catalog:test-workshop',
    milestone_key: '2027-02-15|Registration',
  })
  await expect(
    db.query(
      "insert into dashboard_tasks(user_id,title,opportunity_id) values($1,'Unavailable','catalog:test-workshop')",
      [owner],
    ),
  ).rejects.toThrow(/accessible opportunity/)
})
it('rejects private opportunity references across members and retains owner read isolation', async () => {
  const intake = (
    await db.query<{ id: string }>(
      "insert into dashboard_opportunity_intakes(user_id,url,disposition,title,reason) values($1,'https://example.edu/contest','personal','Contest','Small local contest') returning id",
      [owner],
    )
  ).rows[0]!.id
  await db.query(
    "insert into dashboard_personal_opportunities(id,intake_id,user_id,url,data) values('personal:test-contest',$1,$2,'https://example.edu/contest','{}')",
    [intake, owner],
  )
  const task = (
    await db.query<{ id: string }>(
      "insert into dashboard_tasks(user_id,title,opportunity_id) values($1,'Prepare entry','personal:test-contest') returning id",
      [owner],
    )
  ).rows[0]!.id
  await expect(
    db.query(
      "insert into dashboard_tasks(user_id,title,opportunity_id) values($1,'Other entry','personal:test-contest')",
      [other],
    ),
  ).rejects.toThrow(/accessible opportunity/)
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${other}'`)
  expect((await db.query('select id from dashboard_tasks where id=$1', [task])).rows).toHaveLength(
    0,
  )
  await db.exec('reset role')
  const activity = (
    await db.query<{ id: string }>(
      "insert into dashboard_activities(user_id,title) values($1,'Project') returning id",
      [owner],
    )
  ).rows[0]!.id
  await expect(
    db.query('update dashboard_tasks set activity_id=$1 where id=$2', [activity, task]),
  ).rejects.toThrow(/dashboard_task_one_connection/)
  await db.query(
    'update dashboard_tasks set opportunity_id=null,activity_id=$1,milestone_key=null where id=$2',
    [activity, task],
  )
  expect(
    (await db.query('select activity_id,opportunity_id from dashboard_tasks where id=$1', [task]))
      .rows[0],
  ).toEqual({ activity_id: activity, opportunity_id: null })
})
