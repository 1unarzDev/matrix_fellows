import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import {
  createApp,
  createRouter,
  toNodeListener,
  defineEventHandler,
  createError,
  readBody,
  getRouterParam,
  getQuery,
  setHeader,
} from 'h3'
import { PostgresSupabaseTransport } from '../helpers/postgres-supabase-transport'
import { sealWorkspace, WORKSPACE_COOKIE } from '../../server/utils/workspace-auth'
import { protectMailboxToken } from '../../server/utils/workspace-mail'

// Actual HTTP H3 handlers, actual Supabase SDK, actual auth/session validation,
// and full-chain PostgreSQL persistence. Identity/research/mail providers are fixtures.
const nativeFetch = globalThis.fetch
const transport = new PostgresSupabaseTransport()
const member = '11111111-1111-4111-8111-111111111111',
  a = '22222222-2222-4222-8222-222222222222',
  b = '33333333-3333-4333-8333-333333333333'
const config = {
  workspaceSessionSecret: 'local-session-key-'.repeat(3),
  workspaceMailboxEncryptionKey: 'local-mailbox-key-'.repeat(3),
  supabaseServiceRoleKey: 'local-service-key',
  googleOAuthClientId: 'fixture-client',
  googleOAuthClientSecret: 'fixture-secret',
  public: {
    supabaseUrl: 'https://persistence.supabase.test',
    supabaseAnonKey: 'local-anon-key',
    siteUrl: 'http://matrix.test',
  },
}
let server: Server,
  base: string,
  profileId: string,
  targetId: string,
  proposal: any,
  relationshipId: string,
  followup: any
const cookies = new Map<string, string>(),
  mailboxes = new Map<string, string>()
async function request(actor: string, path: string, method = 'GET', body?: unknown) {
  const response = await nativeFetch(base + '/api/workspace' + path, {
    method,
    headers: {
      origin: config.public.siteUrl,
      cookie: `${WORKSPACE_COOKIE}=${cookies.get(actor) || ''}`,
      'content-type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json()
  return { status: response.status, data }
}
async function ok(actor: string, path: string, method = 'GET', body?: unknown) {
  const result = await request(actor, path, method, body)
  expect(
    result.status,
    JSON.stringify({ response: result.data, dbErrors: transport.errors.slice(-3) }),
  ).toBe(200)
  return result.data
}
async function selectMailbox(actor: string, draft: any) {
  return ok(actor, `/proposals/${draft.id}`, 'PATCH', {
    targetId: draft.targetId,
    profileId: draft.profileId,
    kind: draft.kind,
    recipient: draft.recipient,
    subject: draft.subject,
    body: draft.body,
    mailboxId: mailboxes.get(actor),
    revision: draft.revision,
  })
}
beforeAll(async () => {
  await transport.initialize()
  await transport.addIdentity(member, 'member@example.com', 'member-token')
  await transport.addIdentity(a, 'officer-a@example.com', 'a-token', 'officer')
  await transport.addIdentity(b, 'officer-b@example.com', 'b-token', 'officer')
  await transport.db.exec(
    `insert into join_responses values(1,'member@example.com','Research Member',array['Robotics & engineering'],array['Learn reproducible evaluation'],'Some project experience','','PRIVATE-STUDENT-ID','PRIVATE-GUARDIAN','PRIVATE-FEEDBACK');`,
  )
  for (const [actor, token] of [
    [member, 'member-token'],
    [a, 'a-token'],
    [b, 'b-token'],
  ])
    cookies.set(
      actor!,
      await sealWorkspace(
        {
          access_token: token,
          refresh_token: 'fixture-refresh',
          expires_at: Date.now() + 3600000,
          authenticated_at: Date.now(),
        },
        config.workspaceSessionSecret,
        WORKSPACE_COOKIE,
      ),
    )
  for (const actor of [a, b]) {
    const email = actor === a ? 'officer-a@example.com' : 'officer-b@example.com'
    const row: any = (
      await transport.db.query(
        "insert into outreach_mailboxes(owner_id,email,expires_at)values($1,$2,now()+interval '1 hour')returning id",
        [actor, email],
      )
    ).rows[0]
    mailboxes.set(actor, row.id)
    await transport.db.query(
      'update outreach_mailboxes set access_token_encrypted=$1 where id=$2',
      [
        await protectMailboxToken(
          'fixture-access',
          config.workspaceMailboxEncryptionKey,
          row.id,
          'access',
        ),
        row.id,
      ],
    )
  }
  for (const [name, value] of Object.entries({
    defineEventHandler,
    createError,
    readBody,
    getRouterParam,
    getQuery,
    setHeader,
    useRuntimeConfig: () => config,
  }))
    vi.stubGlobal(name, value)
  vi.stubGlobal('fetch', transport.fetch)
  const app = createApp(),
    router = createRouter()
  const routes: [string, string, string][] = [
    ['get', '/', 'index.get.ts'],
    ['get', '/auth/session', 'auth/session.get.ts'],
    ['get', '/research-profile/shared', 'research-profile/shared.get.ts'],
    ['get', '/research-profile/projects', 'research-profile/projects.get.ts'],
    ['get', '/officers', 'officers.get.ts'],
    ['get', '/voice', 'voice/index.get.ts'],
    ['put', '/voice', 'voice/index.put.ts'],
    ['get', '/research', 'research.get.ts'],
    ['post', '/research', 'research.post.ts'],
    ['get', '/research/sources/:id', 'research/sources/[id].get.ts'],
    ['get', '/mailboxes', 'mailboxes/index.get.ts'],
    ['get', '/catalog-saves', 'catalog-saves.get.ts'],
    ['get', '/assignments', 'assignments.get.ts'],
    ['get', '/opportunity-decisions', 'opportunity-decisions/index.get.ts'],
    ['get', '/research-profile', 'research-profile/index.get.ts'],
    ['post', '/research-profile/artifacts', 'research-profile/artifacts.post.ts'],
    ['post', '/research-profile/corrections', 'research-profile/corrections.post.ts'],
    ['get', '/research-profile/preferences', 'research-profile/preferences.get.ts'],
    ['post', '/research-profile/preferences', 'research-profile/preferences.post.ts'],
    ['patch', '/profiles/:id', 'profiles/[id].patch.ts'],
    ['post', '/matches', 'matches.post.ts'],
    ['post', '/planner', 'planner.post.ts'],
    ['patch', '/proposals/:id', 'proposals/[id].patch.ts'],
    ['post', '/proposals/:id/approve', 'proposals/[id]/approve.post.ts'],
    ['post', '/proposals/:id/handoff', 'proposals/[id]/handoff.post.ts'],
    ['post', '/proposals/:id/revise', 'proposals/[id]/revise.post.ts'],
    ['get', '/proposals/:id/revisions', 'proposals/[id]/revisions.get.ts'],
    ['post', '/relationships', 'relationships/index.post.ts'],
    ['get', '/relationships', 'relationships.get.ts'],
    ['post', '/send', 'send.post.ts'],
    ['get', '/plan', 'plan/index.get.ts'],
    ['post', '/mailboxes/reconcile', 'mailboxes/reconcile.post.ts'],
    ['delete', '/mailboxes/:id', 'mailboxes/[id].delete.ts'],
    ['get', '/mailboxes/outbox', 'mailboxes/outbox.get.ts'],
  ]
  for (const [method, path, file] of routes) {
    const handler = (await import('../../server/api/workspace/' + file)).default
    ;(router as any)[method]('/api/workspace' + path, handler)
  }
  router.get('/api/workspace', (await import('../../server/api/workspace/index.get.ts')).default)
  app.use(router)
  server = createServer(toNodeListener(app))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  base = 'http://127.0.0.1:' + address.port
})
afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  vi.unstubAllGlobals()
  await transport.db.close()
})
it('concurrent real authenticated profile loads converge and import only narrowly mapped join fields', async () => {
  const profiles = await Promise.all([
    ok(member, '/research-profile'),
    ok(member, '/research-profile'),
  ])
  expect(profiles[0].profile.profileId).toBe(profiles[1].profile.profileId)
  profileId = profiles[0].profile.profileId
  expect(profiles[0].profile).toMatchObject({
    displayName: 'Research Member',
    declaredInterests: ['Robotics & engineering'],
    goals: 'Learn reproducible evaluation',
    providerEligibility: 'local-only',
  })
  expect(JSON.stringify(profiles)).not.toMatch(/PRIVATE-|guardian|student_id/)
  expect(
    (
      await transport.db.query('select id from outreach_profiles where subject_user_id=$1', [
        member,
      ])
    ).rows,
  ).toHaveLength(1)
  expect(
    (
      await request(member, '/research-profile/artifacts', 'POST', {
        url: 'https://github.com/team/robot-evaluation',
        userId: a,
      })
    ).status,
  ).toBe(400)
})
it('research link acquisition persists immutable evidence without claiming repository authorship, and corrections/sharing survive reload', async () => {
  const artifact = await ok(member, '/research-profile/artifacts', 'POST', {
    url: 'https://github.com/team/robot-evaluation',
    relationship: 'contributed',
    contribution: 'I wrote repeatable robot simulation tests.',
  })
  let view = await ok(member, '/research-profile')
  expect(view.artifacts.find((r: any) => r.id === artifact.id)).toMatchObject({
    state: 'ready',
    summary: 'Robot simulation evaluation tools',
  })
  const snapshots = (
    await transport.db.query<any>('select * from research_source_snapshots where artifact_id=$1', [
      artifact.id,
    ])
  ).rows
  expect(snapshots).toHaveLength(1)
  expect(snapshots[0].metadata).toMatchObject({
    adapter: 'github-metadata-v1',
    readmePath: 'README.md',
    readmeVersion: 'fixture-readme-v1',
  })
  expect(snapshots[0].metadata.attribution).toMatch(/does not establish/)
  const contribution = view.claims.find((c: any) => c.predicate === 'contribution')
  await ok(member, '/research-profile/corrections', 'POST', {
    claimId: contribution.id,
    action: 'edit',
    statement:
      'I wrote robot simulation regression tests; other contributors implemented the simulator.',
  })
  view = await ok(member, '/research-profile')
  const corrected = view.claims.find(
    (c: any) => c.predicate === 'contribution' && c.withdrawn_at === null,
  )
  expect(corrected).toMatchObject({ origin: 'member', support_state: 'self_reported' })
  await ok(member, '/research-profile/corrections', 'POST', {
    claimId: corrected.id,
    action: 'share',
  })
  const row: any = (
    await transport.db.query('select * from outreach_profiles where id=$1', [profileId])
  ).rows[0]
  await ok(member, `/profiles/${profileId}`, 'PATCH', {
    fullName: row.full_name,
    interests: row.interests,
    skills: [],
    availability: '',
    location: 'Arlington',
    workSamples: [],
    goals: row.goals,
    consentToShare: true,
    expectedUpdatedAt: row.updated_at,
  })
  expect(
    (await ok(member, '/research-profile')).claims.find((c: any) => c.id === corrected.id),
  ).toMatchObject({ sharing_scope: 'officer', statement: corrected.statement })
  expect(
    (await transport.db.query('select project_id from research_project_contributors')).rows,
  ).toHaveLength(1)
})
it('ordinary members cannot prepare/read/revise drafts; officers obtain a local-only selected projection and persistent technical match', async () => {
  const quote = 'Our laboratory studies reproducible robot simulation evaluation.'
  const row: any = (
    await transport.db.query(
      "insert into outreach_targets(name,kind,organization,discipline,canonical_url,status,contact_email,location,mode,dossier)values('Robotics Lab','lab','UTA',array['Robotics'],'https://uta.edu/robot-lab','ready','pi@example.com','Arlington','in_person',$1)returning id",
      [
        JSON.stringify({
          evidence: [
            {
              url: 'https://uta.edu/robot-lab',
              claim: 'Robot evaluation research',
              quote,
              retrievedAt: new Date().toISOString(),
              confidence: 'verified',
            },
          ],
          acquisition: {
            pages: [
              {
                url: 'https://uta.edu/robot-lab',
                text: quote,
                hash: 'fixture-source-v1',
                retrievedAt: new Date().toISOString(),
                title: 'Robotics laboratory',
                contacts: ['pi@example.com'],
                links: [],
              },
            ],
            publicAnalysis: {
              proposalOptions: [
                {
                  title: 'Robot simulation evaluation',
                  task: 'reproduce a documented simulation benchmark',
                  deliverable: 'a small reproducible benchmark report',
                  quote,
                  supervisionQuestions: ['Which public benchmark is appropriate?'],
                },
              ],
              unknowns: ['No recruiting evidence.'],
            },
          },
        }),
      ],
    )
  ).rows[0]
  targetId = row.id
  expect(
    (await request(member, '/planner', 'POST', { targetId, profileId, kind: 'student' })).status,
  ).toBe(403)
  await ok(member, '/research-profile/preferences', 'POST', {
    lens: 'nearby',
    reachableLocations: ['Arlington', 'Dallas'],
  })
  await ok(member, '/research-profile/preferences', 'POST', {
    lens: 'nearby',
    reachableLocations: ['Arlington'],
  })
  expect((await ok(member, '/research-profile/preferences')).reachableLocations).toEqual([
    'Arlington',
  ])
  const matches = await ok(a, '/matches', 'POST', { targetId, profileId, contributionOption: 0 })
  expect(matches.items).toHaveLength(1)
  expect(matches.items[0].plan.provenance).toBe('reviewed-model-analysis')
  expect((await transport.db.query('select id from outreach_matches')).rows).toHaveLength(1)
  proposal = (
    await ok(a, '/planner', 'POST', {
      targetId,
      profileId,
      kind: 'student',
      style: 'feedback',
      contributionOption: 0,
      matchId: matches.items[0].id,
    })
  ).proposal
  expect(proposal.body).toContain('writing on behalf of Research Member')
  expect(proposal.body).toContain(quote)
  expect(proposal.body).not.toMatch(/PRIVATE-|expert|university student/i)
  const stored: any = (
    await transport.db.query(
      'select profile_version_id,evidence_claim_ids,proposal_plan from outreach_proposals where id=$1',
      [proposal.id],
    )
  ).rows[0]
  expect(stored.profile_version_id).toBeTruthy()
  expect(stored.evidence_claim_ids.length).toBeGreaterThan(0)
  expect((await ok(a, '/research-profile/shared')).profiles.map((p: any) => p.id)).toContain(
    profileId,
  )
  const aggregate = await ok(member, '')
  expect(aggregate.primaryProfileId).toBe(profileId)
  expect(aggregate.proposals).toEqual([])
  expect(aggregate.mailboxes).toEqual([])
  expect(stored.proposal_plan.sentenceSupports).toBeTruthy()
  expect(stored.proposal_plan.matchId).toBe(matches.items[0].id)
  expect((await request(member, `/proposals/${proposal.id}/revisions`)).status).toBe(403)
  expect(
    (
      await request(member, `/proposals/${proposal.id}/revise`, 'POST', {
        revision: proposal.revision,
        action: 'shorten',
      })
    ).status,
  ).toBe(403)
  expect((await request(b, `/proposals/${proposal.id}/revisions`)).status).toBe(404)
})
it('exact approval and owner handoff preserve authorship, invalidate the former approval, and require the new owner mailbox', async () => {
  const preview = await ok(a, `/proposals/${proposal.id}/revise`, 'POST', {
    revision: proposal.revision,
    action: 'direct',
  })
  expect(preview).toMatchObject({ baseRevision: proposal.revision, mode: 'local' })
  expect(
    (
      await transport.db.query<any>('select revision from outreach_proposals where id=$1', [
        proposal.id,
      ])
    ).rows[0].revision,
  ).toBe(proposal.revision)
  const stale = { ...proposal }
  proposal = await selectMailbox(a, proposal)
  expect(
    (
      await request(a, `/proposals/${proposal.id}`, 'PATCH', {
        targetId: stale.targetId,
        profileId: stale.profileId,
        kind: stale.kind,
        recipient: stale.recipient,
        subject: preview.subject,
        body: preview.body,
        mailboxId: mailboxes.get(a),
        revision: preview.baseRevision,
      })
    ).status,
  ).toBe(409)
  const approval = await ok(a, `/proposals/${proposal.id}/approve`, 'POST', {
    revision: proposal.revision,
  })
  expect(approval.fingerprint).toMatch(/^[a-f0-9]{64}$/)
  await ok(a, `/proposals/${proposal.id}/handoff`, 'POST', { ownerId: b })
  const stored: any = (
    await transport.db.query('select * from outreach_proposals where id=$1', [proposal.id])
  ).rows[0]
  expect(stored).toMatchObject({
    created_by: a,
    current_owner_id: b,
    status: 'draft',
    mailbox_id: null,
    approved_by: null,
  })
  expect(
    (
      await request(a, '/send', 'POST', {
        proposalId: proposal.id,
        revision: proposal.revision,
        fingerprint: approval.fingerprint,
        mailboxId: mailboxes.get(a),
      })
    ).status,
  ).toBe(409)
  proposal = { ...proposal, revision: stored.revision }
  proposal = await selectMailbox(b, proposal)
  const approved = await ok(b, `/proposals/${proposal.id}/approve`, 'POST', {
    revision: proposal.revision,
  })
  const body = {
    proposalId: proposal.id,
    revision: proposal.revision,
    fingerprint: approved.fingerprint,
    mailboxId: mailboxes.get(b),
  }
  const sends = await Promise.all([
    request(b, '/send', 'POST', body),
    request(b, '/send', 'POST', body),
  ])
  expect(sends.map((r) => r.status).sort()).toEqual([200, 409])
  expect(sends.find((r) => r.status === 200)?.data.status).toBe('accepted')
  expect(
    transport.providerRequests.filter((url) => url.includes('gmail.googleapis.com')),
  ).toHaveLength(1)
  expect(
    (
      await transport.db.query<any>('select status from outreach_outbox where id=$1', [
        approved.outboxId,
      ])
    ).rows[0].status,
  ).toBe('sent')
})
it('manual reply and promised follow-up persist in existing planner, while explicit follow-up permits a new separately approved message', async () => {
  relationshipId = (
    await ok(b, '/relationships', 'POST', {
      targetId,
      kind: 'reply',
      note: 'Manual fixture reply: send one focused benchmark question next week.',
      occurredAt: new Date().toISOString(),
      dueDate: '2026-10-20',
    })
  ).id
  const relationships = await ok(b, `/relationships?targetId=${targetId}`)
  expect(relationships.relationships[0]).toMatchObject({
    id: relationshipId,
    owner_id: b,
    stage: 'active',
  })
  expect(relationships.events).toHaveLength(1)
  const plan = await ok(b, '/plan')
  expect(
    plan.tasks.some(
      (t: any) => t.dueDate === '2026-10-20' && t.legacyContext?.relationshipId === relationshipId,
    ),
  ).toBe(true)
  followup = (
    await ok(b, '/planner', 'POST', {
      targetId,
      profileId,
      kind: 'student',
      relationshipId,
      messageKind: 'follow_up',
      style: 'feedback',
    })
  ).proposal
  followup = await selectMailbox(b, followup)
  const approval = await ok(b, `/proposals/${followup.id}/approve`, 'POST', {
    revision: followup.revision,
  })
  transport.mailOutcome = 'uncertain'
  const result = await ok(b, '/send', 'POST', {
    proposalId: followup.id,
    revision: followup.revision,
    fingerprint: approval.fingerprint,
    mailboxId: mailboxes.get(b),
  })
  expect(result.status).toBe('uncertain')
  expect(
    (
      await transport.db.query<any>('select status from outreach_outbox where id=$1', [
        approval.outboxId,
      ])
    ).rows[0].status,
  ).toBe('uncertain')
})
it('demotion blocks privileged actions but preserves narrow ambiguous-send reconciliation and disconnection', async () => {
  await transport.db.query("update outreach_members set role='member'where user_id=$1", [b])
  expect(
    (await request(b, '/planner', 'POST', { targetId, profileId, kind: 'student' })).status,
  ).toBe(403)
  expect(
    (await request(b, `/proposals/${followup.id}/approve`, 'POST', { revision: followup.revision }))
      .status,
  ).toBe(403)
  const outbox = await ok(b, '/mailboxes/outbox')
  expect(outbox.items).toHaveLength(1)
  expect(outbox.items[0]).not.toHaveProperty('body')
  expect(outbox.items[0]).not.toHaveProperty('subject')
  expect(outbox.items[0]).not.toHaveProperty('recipient')
  await ok(b, '/mailboxes/reconcile', 'POST', {
    outboxId: outbox.items[0].id,
    outcome: 'not_sent',
    note: 'Fixture Sent-mail inspection confirms no submitted message.',
  })
  await ok(b, `/mailboxes/${mailboxes.get(b)}`, 'DELETE')
  expect(
    (
      await transport.db.query<any>(
        'select enabled,access_token_encrypted from outreach_mailboxes where id=$1',
        [mailboxes.get(b)],
      )
    ).rows[0],
  ).toEqual({ enabled: false, access_token_encrypted: '' })
  expect(
    transport.providerRequests.filter((url) => url.includes('gmail.googleapis.com')),
  ).toHaveLength(2)
})

it('member evidence withdrawal prevents unsent approval reuse without modifying immutable sent history', async () => {
  const firstSent: any = (
    await transport.db.query("select body from outreach_outbox where status='sent'limit 1")
  ).rows[0]
  const target: any = (
    await transport.db.query(
      "insert into outreach_targets(name,kind,canonical_url,status,contact_email,discipline,dossier)select name,kind,'https://uta.edu/robot-second','ready','second-pi@example.com',discipline,dossier from outreach_targets where id=$1 returning id",
      [targetId],
    )
  ).rows[0]
  let draft = (
    await ok(a, '/planner', 'POST', {
      targetId: target.id,
      profileId,
      kind: 'student',
      style: 'feedback',
    })
  ).proposal
  draft = await selectMailbox(a, draft)
  const approved = await ok(a, `/proposals/${draft.id}/approve`, 'POST', {
    revision: draft.revision,
  })
  const claim: any = (
    await transport.db.query(
      "select id from research_claims where profile_id=$1 and predicate='contribution'and adoption='accepted'and sharing_scope='officer'and withdrawn_at is null",
      [profileId],
    )
  ).rows[0]
  await ok(member, '/research-profile/corrections', 'POST', {
    claimId: claim.id,
    action: 'exclude',
  })
  expect(
    (await request(a, `/proposals/${draft.id}/approve`, 'POST', { revision: draft.revision }))
      .status,
  ).toBe(409)
  expect(
    (
      await request(a, '/send', 'POST', {
        proposalId: draft.id,
        revision: draft.revision,
        fingerprint: approved.fingerprint,
        mailboxId: mailboxes.get(a),
      })
    ).status,
  ).toBe(409)
  expect(
    (await transport.db.query<any>("select body from outreach_outbox where status='sent'limit 1"))
      .rows[0].body,
  ).toBe(firstSent.body)
  await transport.db.exec(`set role authenticated;set request.jwt.claim.sub='${member}'`)
  try {
    expect((await transport.db.query('select * from outreach_proposals')).rows).toHaveLength(0)
    expect(
      (await transport.db.query('select * from outreach_proposal_revisions')).rows,
    ).toHaveLength(0)
  } finally {
    await transport.db.exec('reset role')
  }
  expect(
    transport.providerRequests.filter((url) => url.includes('gmail.googleapis.com')),
  ).toHaveLength(2)
})

it('source pagination beyond forty preserves snapshot review and retries only failed dependent work', async () => {
  await transport.db.exec(
    `insert into outreach_sources(id,url,allowed_hosts,kind)select 'journey-source-'||lpad(n::text,3,'0'),'https://uta.edu/journey-source-'||n,array['uta.edu'],'directory'from generate_series(1,45)n`,
  )
  const source = 'journey-source-045'
  const job: any = (
    await transport.db.query(
      "insert into outreach_jobs(work_key,kind,source_id,status,attempts,error)values('journey-retry-source','discover',$1,'failed',3,'Source unavailable fixture')returning id",
      [source],
    )
  ).rows[0]
  const hash = 'b'.repeat(64),
    excerpt =
      'The laboratory studies reproducible robot simulation benchmarks and public evaluation methods.'
  await transport.db.query(
    "insert into research_stage_runs(job_id,stage,input_key,attempt,claim_token,status,reservation,result)values($1,'acquire','fixture-source-version',1,$2,'completed','{}',$3)",
    [
      job.id,
      crypto.randomUUID(),
      JSON.stringify({ hash, text: excerpt, url: 'https://uta.edu/journey-source-45' }),
    ],
  )
  const first = await ok(a, '/research?limit=40&sourceOffset=0'),
    second = await ok(a, '/research?limit=40&sourceOffset=40')
  expect(first.sources).toHaveLength(40)
  expect(second.sources).toHaveLength(5)
  expect(first.pagination.sourceTotal).toBe(45)
  expect(second.pagination.sourceTotal).toBe(45)
  expect(second.sources.some((s: any) => s.id === source)).toBe(true)
  const detail = await ok(a, '/research/sources/' + source)
  expect(detail.source.snapshot).toMatchObject({ hash, text: excerpt })
  expect((await request(member, '/research/sources/' + source)).status).toBe(403)
  await transport.db.query("update outreach_members set role='admin' where user_id=$1", [a])
  await ok(a, '/research', 'POST', {
    action: 'source',
    sourceId: source,
    enabled: true,
    aiExcerpt: excerpt,
    aiReviewed: true,
    snapshotHash: hash,
  })
  expect(
    (
      await transport.db.query<any>(
        'select ai_reviewed,ai_snapshot_hash from outreach_sources where id=$1',
        [source],
      )
    ).rows[0],
  ).toEqual({ ai_reviewed: true, ai_snapshot_hash: hash })
  await transport.db.exec('update outreach_settings set paused=false where id=true')
  await ok(a, '/research', 'POST', { action: 'retry', jobId: job.id })
  expect(
    (
      await transport.db.query<any>('select status,attempts,error from outreach_jobs where id=$1', [
        job.id,
      ])
    ).rows[0],
  ).toEqual({ status: 'queued', attempts: 0, error: null })
  expect((await ok(a, '/research/sources/' + source)).source.snapshot.hash).toBe(hash)
  await transport.db.exec('update outreach_settings set paused=true where id=true')
  await transport.db.query("update outreach_members set role='officer' where user_id=$1", [a])
})

it('selected relationship history pages beyond two hundred events without exposing another officer notes', async () => {
  const relationships = (
    await transport.db.query<any>(
      "insert into outreach_relationships(identity_key,target_id,owner_id) values('journey-history-owned',$1,$2),('journey-history-noise',$1,$2),('journey-history-private',$1,$3) returning id,identity_key",
      [targetId, a, b],
    )
  ).rows
  const owned = relationships.find((r) => r.identity_key === 'journey-history-owned')!.id
  const noise = relationships.find((r) => r.identity_key === 'journey-history-noise')!.id
  const privateId = relationships.find((r) => r.identity_key === 'journey-history-private')!.id
  for (const [id, actor, label, days] of [
    [owned, a, 'older-owned', 10],
    [noise, a, 'recent-noise', 0],
    [privateId, b, 'PRIVATE-OTHER-OFFICER', 0],
  ] as const)
    await transport.db.query(
      "insert into outreach_relationship_events(relationship_id,kind,note,actor_id,occurred_at) select $1,'reply',$3||'-'||n,$2,now()-($4::integer*interval '1 day')-(n*interval '1 minute') from generate_series(1,205)n",
      [id, actor, label, days],
    )
  const overview = await ok(a, '/relationships')
  expect(overview.events).toHaveLength(200)
  expect(overview.eventHasMore).toBe(true)
  expect(overview.eventCoverage).toBe('bounded-overview')
  const notes: string[] = []
  for (let page = 0; page < 5; page++) {
    const history = await ok(a, `/relationships?relationshipId=${owned}&eventPage=${page}`)
    expect(history.eventCoverage).toBe('selected-relationship')
    expect(history.eventPage).toBe(page)
    expect(history.events).toHaveLength(page === 4 ? 5 : 50)
    expect(history.eventHasMore).toBe(page < 4)
    expect(
      history.events.every(
        (e: any) => e.relationship_id === owned && e.note.startsWith('older-owned-'),
      ),
    ).toBe(true)
    notes.push(...history.events.map((e: any) => e.note))
  }
  expect(new Set(notes).size).toBe(205)
  expect(notes).toContain('older-owned-205')
  const other = await ok(a, `/relationships?relationshipId=${privateId}&eventPage=0`)
  expect(other.events).toEqual([])
  expect(other.eventHasMore).toBe(false)
  expect(other.eventCoverage).toBe('private-or-unavailable')
  expect(JSON.stringify(other)).not.toContain('PRIVATE-OTHER-OFFICER')
  expect((await request(member, `/relationships?relationshipId=${owned}`)).status).toBe(403)
  expect((await request(a, '/relationships?relationshipId=not-an-identity')).status).toBe(400)
})

it.runIf(Boolean(process.env.RESEARCH_BROWSER_BASE_URL))(
  'opt-in browser: profile link and local officer revision persist through actual HTTP handlers and PostgreSQL',
  async () => {
    const { chromium } = await import('@playwright/test')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    page.setDefaultTimeout(10000)
    let actor = member
    const clientErrors: string[] = []
    page.on('pageerror', (error) => clientErrors.push(error.message))
    page.on('requestfailed', (request) =>
      clientErrors.push(request.url() + ' ' + (request.failure()?.errorText || 'failed')),
    )
    page.on('console', (message) => {
      if (message.type() === 'error') clientErrors.push(message.text())
    })
    const proxyErrors: string[] = [],
      implementedRequests: string[] = [],
      unrelatedFixtures: string[] = []
    await page.route('**/api/**', async (route) => {
      const incoming = route.request(),
        url = new URL(incoming.url())
      if (url.pathname.startsWith('/api/workspace')) {
        const response = await nativeFetch(base + url.pathname + url.search, {
          method: incoming.method(),
          headers: {
            origin: config.public.siteUrl,
            cookie: `${WORKSPACE_COOKIE}=${cookies.get(actor) || ''}`,
            'content-type': 'application/json',
          },
          ...(incoming.postData() ? { body: incoming.postData()! } : {}),
        })
        const body = await response.text()
        implementedRequests.push(incoming.method() + ' ' + url.pathname)
        if (response.status >= 400)
          proxyErrors.push(response.status + ' ' + url.pathname + ' ' + body)
        await route.fulfill({ status: response.status, contentType: 'application/json', body })
      } else {
        unrelatedFixtures.push(url.pathname)
        await route.fulfill({ json: { items: [], page: 1, pageCount: 1, total: 0 } })
      }
    })
    const preview = process.env.RESEARCH_BROWSER_BASE_URL!
    try {
      await page.goto(preview + '/dashboard?section=profiles')
      await page.getByRole('heading', { name: 'Your research overview', exact: true }).waitFor()
      expect(await page.locator('.research-overview').innerText()).toContain('Research Member')
      await page
        .getByLabel('Add your research', { exact: true })
        .fill('https://github.com/team/browser-research')
      await page.getByLabel(/^Your connection/).selectOption('contributed')
      await page
        .getByLabel('What was your contribution?', { exact: true })
        .fill('Browser fixture: I wrote robot evaluation regression checks.')
      await page.getByRole('button', { name: 'Add research link', exact: true }).click()
      await page
        .getByRole('link', { name: 'https://github.com/team/browser-research', exact: true })
        .waitFor()
      const claim = page
        .locator('.research-claim')
        .filter({ hasText: 'Browser fixture: I wrote robot evaluation regression checks.' })
      await claim
        .getByRole('button', { name: 'Share with officers for proposals', exact: true })
        .click()
      await claim
        .getByRole('button', { name: 'Exclude from society proposals', exact: true })
        .waitFor()
      await page.reload()
      await page
        .getByRole('link', { name: 'https://github.com/team/browser-research', exact: true })
        .waitFor()
      expect(await claim.innerText()).toContain(
        'Browser fixture: I wrote robot evaluation regression checks.',
      )
      const artifact: any = (
        await transport.db.query(
          "select id,state from research_artifacts where canonical_url='https://github.com/team/browser-research'",
        )
      ).rows[0]
      expect(artifact.state).toBe('ready')
      expect(
        (
          await transport.db.query(
            'select id from research_source_snapshots where artifact_id=$1',
            [artifact.id],
          )
        ).rows,
      ).toHaveLength(1)
      await page.screenshot({ path: '/tmp/matrix-browser-persisted-profile.png', fullPage: true })
      actor = a
      const target: any = (
        await transport.db.query(
          "select id from outreach_targets where canonical_url='https://uta.edu/robot-second'",
        )
      ).rows[0]
      await page.goto(preview + '/dashboard?section=queue&target=' + target.id)
      await page.getByRole('button', { name: /^Who is the connection for\?/ }).click()
      await page.getByRole('option', { name: 'Personal inquiry', exact: true }).click()
      await page.getByRole('button', { name: /^Research profile:/ }).click()
      await page.getByRole('option', { name: 'Research Member', exact: true }).click()
      await page.getByRole('button', { name: 'Review connection plan', exact: true }).click()
      await page.getByRole('region', { name: 'Selected connection plan', exact: true }).waitFor()
      await page.getByRole('button', { name: /^Shape a proposal/ }).click()
      await page.getByRole('heading', { name: 'Messages to review', exact: true }).waitFor()
      await page.locator('.candidate-list .candidate').first().click()
      await page.getByRole('heading', { name: 'Review your inquiry', exact: true }).waitFor()
      const body = page.getByLabel('Email', { exact: true })
      await page.getByRole('button', { name: 'Make the ask smaller', exact: true }).click()
      await page.getByRole('region', { name: 'Proposed revision preview', exact: true }).waitFor()
      expect(
        await page.getByRole('region', { name: 'Proposed revision preview' }).innerText(),
      ).toContain('Local editing')
      await page.getByRole('button', { name: 'Use proposed edit', exact: true }).click()
      const save = page.getByRole('button', { name: 'Save changes', exact: true })
      if (await save.isEnabled()) await save.click()
      await vi.waitFor(
        async () => {
          const rows = (
            await transport.db.query<any>(
              'select body from outreach_proposals where current_owner_id=$1 and target_id=$2 order by created_at desc limit 1',
              [a, target.id],
            )
          ).rows
          expect(rows[0]?.body).toContain('one focused question by email')
        },
        { timeout: 8000 },
      )
      const proposal: any = (
        await transport.db.query(
          'select id,body,revision,proposal_plan from outreach_proposals where current_owner_id=$1 and target_id=$2 order by created_at desc limit 1',
          [a, target.id],
        )
      ).rows[0]
      expect(proposal.body).toContain('one focused question by email')
      expect(proposal.revision).toBeGreaterThan(1)
      expect(proposal.proposal_plan.matchId).toBeTruthy()
      await page.reload()
      await page.getByRole('heading', { name: 'Messages to review', exact: true }).waitFor()
      await page.locator('.candidate-list .candidate').first().click()
      await page.getByRole('heading', { name: 'Review your inquiry', exact: true }).waitFor()
      expect(await body.inputValue()).toBe(proposal.body)
      await page.screenshot({
        path: '/tmp/matrix-browser-persisted-officer-draft.png',
        fullPage: true,
      })
      expect(
        implementedRequests.some((r) => r === 'POST /api/workspace/research-profile/artifacts'),
      ).toBe(true)
      expect(implementedRequests.some((r) => r === 'POST /api/workspace/planner')).toBe(true)
      expect(implementedRequests.some((r) => r.startsWith('PATCH /api/workspace/proposals/'))).toBe(
        true,
      )
      expect(proxyErrors, proxyErrors.join('\n')).toEqual([])
      expect(
        transport.providerRequests.filter((url) => url.includes('gmail.googleapis.com')),
      ).toHaveLength(2)
    } catch (error) {
      await page
        .screenshot({ path: '/tmp/matrix-browser-persistence-failure.png', fullPage: true })
        .catch(() => {})
      const detail = (
        await page
          .locator('body')
          .innerText()
          .catch(() => '')
      ).slice(-3500)
      throw new Error(
        (error instanceof Error ? error.message : String(error)) +
          '\nProxy errors: ' +
          proxyErrors.join('\n') +
          '\nClient errors: ' +
          clientErrors.join('\n') +
          '\nWorkspace requests: ' +
          implementedRequests.join(', ') +
          '\nVisible UI: ' +
          detail,
      )
    } finally {
      await browser.close()
    }
  },
  60000,
)
