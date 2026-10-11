import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  rows: {} as Record<string, any>,
  calls: [] as { name: string; input: any }[],
  stages: new Map<string, any>(),
  reservations: [] as { resource: string; stage: string }[],
  onRpc: (_name: string, _input: any) => {},
  fetchEvidence: vi.fn(),
  analyze: vi.fn(),
  admission: vi.fn(),
  onStep: (_name: string) => {},
}))
vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {
    env: any
    constructor(_ctx: any, env: any) {
      this.env = env
    }
  },
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const query: any = {
        select: () => query,
        eq: () => query,
        single: async () => ({ data: state.rows[table], error: null }),
        maybeSingle: async () => ({ data: state.rows[table], error: null }),
        update: (data: any) => {
          Object.assign(state.rows[table], data)
          return query
        },
        then: (resolve: any) =>
          Promise.resolve({ data: [state.rows[table]], error: null }).then(resolve),
      }
      return query
    },
    rpc: async (name: string, input: any) => {
      state.calls.push({ name, input })
      state.onRpc(name, input)
      if (name === 'outreach_reserve_stage') {
        const key = [input.p_job, input.p_stage, input.p_input_key].join(':')
        const previous = state.stages.get(key)
        if (previous?.status === 'completed')
          return { data: { cached: true, id: previous.id, result: previous.result }, error: null }
        const stage = { id: crypto.randomUUID(), key, status: 'running', result: null }
        state.stages.set(key, stage)
        state.reservations.push({ resource: input.p_resource, stage: input.p_stage })
        return { data: { cached: false, id: stage.id, resumed: false }, error: null }
      }
      if (name === 'outreach_finish_stage') {
        const stage = [...state.stages.values()].find((stage) => stage.id === input.p_id)!
        Object.assign(stage, {
          status: input.p_error ? 'failed' : 'completed',
          result: input.p_result,
        })
      }
      if (name === 'outreach_complete_job' && !input.p_error && input.p_result.acquisition)
        state.rows.outreach_targets.dossier.acquisition = input.p_result.acquisition
      return { data: name === 'outreach_admit_target' ? state.admission(input) : true, error: null }
    },
  }),
}))
import { OutreachResearchWorkflow } from '../../workers/outreach'

const excerpt = 'Public robot manipulation experiments measure grasp accuracy over repeated trials.'
const job = {
  id: 'job',
  kind: 'research',
  target_id: 'target',
  source_id: 'source',
  claim_token: 'claim',
}
const env = {
  OUTREACH_ENABLED: 'true',
  SUPABASE_URL: 'https://db.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  GEMINI_TERMS_CONFIRMED: 'true',
  GEMINI_FREE_PROJECT_CONFIRMED: 'true',
  GEMINI_API_KEY: 'key',
}
async function run(value = job, config = env) {
  const workflow = new OutreachResearchWorkflow({} as never, config as never)
  const step = {
    do: async (name: string, options: any, callback?: any) => {
      state.onStep(name)
      return (callback || options)()
    },
  }
  return workflow.run({ payload: { job: value } } as never, step as never)
}
beforeEach(async () => {
  state.calls = []
  state.stages.clear()
  state.reservations = []
  state.onRpc = () => {}
  vi.stubGlobal(
    'fetch',
    vi.fn((url, init) =>
      String(url).includes('generativelanguage.googleapis.com')
        ? state.analyze(url, init)
        : state.fetchEvidence(url, init),
    ),
  )
  state.onStep = () => {}
  state.admission.mockReset().mockReturnValue({ admitted: true })
  state.fetchEvidence
    .mockReset()
    .mockImplementation(() =>
      Promise.resolve(
        new Response(
          `<main><p>${excerpt}</p><a href="/robotics">Robotics laboratory</a><a href="mailto:pi@uta.edu">Contact</a></main>`,
          { headers: { 'content-type': 'text/html' } },
        ),
      ),
    )
  state.analyze.mockReset().mockImplementation(() =>
    Promise.resolve(
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    themes: ['Robotics'],
                    unknowns: ['Eligibility'],
                    proposalOptions: [
                      {
                        title: 'Validation',
                        task: 'Test public baseline',
                        deliverable: 'Report',
                        supervisionQuestions: [],
                        quote: excerpt,
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    ),
  )
  state.rows = {
    outreach_jobs: {
      status: 'running',
      claim_token: 'claim',
      lease_until: new Date(Date.now() + 300000).toISOString(),
    },
    outreach_settings: { paused: false, ai_enabled: true, terms_confirmed: true, batch_limit: 5 },
    outreach_targets: {
      status: 'needs_review',
      discipline: ['Robotics'],
      canonical_url: 'https://uta.edu/lab',
      dossier: { evidence: [] },
      assessment: {},
    },
    outreach_sources: {
      enabled: true,
      url: 'https://uta.edu/lab',
      allowed_hosts: ['uta.edu'],
      ai_reviewed: true,
      ai_excerpt: excerpt,
      ai_snapshot_hash: Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(
              `<main><p>${excerpt}</p><a href="/robotics">Robotics laboratory</a><a href="mailto:pi@uta.edu">Contact</a></main>`,
            ),
          ),
        ),
      )
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(''),
    },
  }
})
it('executes acquisition, screened analysis and claim-token-bound completion without private profiles', async () => {
  expect(await run()).toEqual({ completed: true })
  expect(state.analyze).toHaveBeenCalledOnce()
  const payload = JSON.parse(state.analyze.mock.calls[0]![1].body)
  expect(payload.contents[0].parts).toEqual([{ text: excerpt }])
  expect(JSON.stringify(payload)).not.toContain('pi@uta.edu')
  const completion = state.calls.find((call) => call.name === 'outreach_complete_job')!
  expect(completion.input.p_claim_token).toBe('claim')
  expect(completion.input.p_result.acquisition.publicAnalysis.unknowns).toEqual(['Eligibility'])
})
it('blocks stale leases, paused acquisition and human suppression before fetching', async () => {
  state.rows.outreach_jobs.claim_token = 'other'
  expect((await run()).completed).toBe(false)
  expect(state.fetchEvidence).not.toHaveBeenCalled()
  state.rows.outreach_jobs.claim_token = 'claim'
  state.rows.outreach_settings.paused = true
  expect((await run()).completed).toBe(false)
  state.rows.outreach_settings.paused = false
  state.rows.outreach_targets.status = 'rejected'
  expect((await run()).completed).toBe(false)
  expect(state.fetchEvidence).not.toHaveBeenCalled()
})
it('never analyzes unreviewed excerpts or directory excerpts for a different target page', async () => {
  state.rows.outreach_sources.ai_reviewed = false
  expect((await run()).completed).toBe(true)
  state.rows.outreach_sources.ai_reviewed = true
  state.rows.outreach_sources.url = 'https://uta.edu/directory'
  expect((await run()).completed).toBe(true)
  expect(state.analyze).not.toHaveBeenCalled()
})
it('preserves configured AI and completed acquisition while retrying only quota-dependent work', async () => {
  state.analyze.mockImplementationOnce(() => Promise.resolve(new Response(null, { status: 429 })))
  expect((await run()).completed).toBe(false)
  expect(state.rows.outreach_settings.ai_enabled).toBe(true)
  expect(state.calls.at(-1)?.input.p_error).toContain('quota exhausted')
  expect(state.stages.values().next().value.status).toBe('completed')
  const acquisitions = state.fetchEvidence.mock.calls.length
  state.rows.outreach_jobs.claim_token = 'retry-claim'
  expect((await run({ ...job, claim_token: 'retry-claim' })).completed).toBe(true)
  expect(state.fetchEvidence.mock.calls.length).toBe(acquisitions)
  expect(state.analyze).toHaveBeenCalledTimes(2)
  expect(state.reservations.filter((value) => value.resource === 'source')).toHaveLength(1)
  expect(state.reservations.filter((value) => value.resource === 'model')).toHaveLength(2)
})
it('admits discovery through the atomic batch budget and never treats a link as mentoring proof', async () => {
  expect((await run({ ...job, kind: 'discover', target_id: undefined } as any)).completed).toBe(
    true,
  )
  const admission = state.calls.find((call) => call.name === 'outreach_admit_target')!
  expect(admission.input.p_payload).toMatchObject({
    batch_key: 'job',
    source_id: 'source',
    kind: 'lab',
  })
  expect(admission.input.p_payload.dossier.evidence[0].claim).toContain(
    'does not establish mentoring',
  )
  expect(state.analyze).not.toHaveBeenCalled()
})
it('continues beyond existing directory entries until the successful-admission budget is full', async () => {
  state.fetchEvidence.mockImplementation(() =>
    Promise.resolve(
      new Response(
        `<main>${Array.from({ length: 12 }, (_, index) => `<a href="/lab/${index}">Robotics lab ${index}</a>`).join('')}</main>`,
        { headers: { 'content-type': 'text/html' } },
      ),
    ),
  )
  state.admission.mockImplementation((input) =>
    Number(input.p_payload.canonical_url.split('/').at(-1)) < 5
      ? { admitted: false, reason: 'duplicate' }
      : { admitted: true },
  )
  expect((await run({ ...job, kind: 'discover', target_id: undefined } as any)).completed).toBe(
    true,
  )
  expect(state.calls.filter((call) => call.name === 'outreach_admit_target')).toHaveLength(10)
})
it('rejects model submission and checkpointing if the target identity changes mid-run', async () => {
  state.onStep = (name) => {
    if (name === 'analyze-reviewed-non-personal-excerpt')
      state.rows.outreach_targets.canonical_url = 'https://uta.edu/new-lab'
  }
  expect((await run()).completed).toBe(false)
  expect(state.analyze).not.toHaveBeenCalled()
  expect(state.calls.at(-1)?.input.p_error).toContain('identity changed')
})
it('rechecks revoked excerpt approval and pause immediately before model submission', async () => {
  state.onStep = (name) => {
    if (name === 'analyze-reviewed-non-personal-excerpt')
      state.rows.outreach_sources.ai_reviewed = false
  }
  expect((await run()).completed).toBe(true)
  expect(state.analyze).not.toHaveBeenCalled()
  state.onStep = (name) => {
    if (name === 'analyze-reviewed-non-personal-excerpt') state.rows.outreach_settings.paused = true
  }
  expect((await run()).completed).toBe(false)
  expect(state.analyze).not.toHaveBeenCalled()
})

it('persists a dependent conservative identity result with source contacts requiring human review', async () => {
  expect((await run()).completed).toBe(true)
  const identity = [...state.stages.values()].find(
    (stage) => stage.result?.schemaVersion === 'identity-evidence-v1',
  )!
  expect(identity.status).toBe('completed')
  expect(identity.result.possibleContacts[0]).toMatchObject({
    address: 'pi@uta.edu',
    sourceUrl: 'https://uta.edu/lab',
    reviewed: false,
  })
  const reservation = state.calls.find(
    (call) => call.name === 'outreach_reserve_stage' && call.input.p_stage === 'identity',
  )!
  expect(reservation.input.p_dependencies.length).toBeGreaterThan(0)
  expect(state.rows.outreach_targets.dossier.acquisition.identity).toEqual(identity.result)
})
it('blocks source review revoked during reservation before any model submission', async () => {
  state.onRpc = (name, input) => {
    if (name === 'outreach_reserve_stage' && input.p_resource === 'model')
      state.rows.outreach_sources.ai_reviewed = false
  }
  expect((await run()).completed).toBe(false)
  expect(state.analyze).not.toHaveBeenCalled()
})
it('retains acquisition but rejects model output when excerpt permission is withdrawn during submission', async () => {
  const previous = state.analyze.getMockImplementation()!
  state.analyze.mockImplementation((...args) => {
    state.rows.outreach_sources.ai_reviewed = false
    return previous(...args)
  })
  expect((await run()).completed).toBe(false)
  expect(state.analyze).toHaveBeenCalledOnce()
  expect([...state.stages.values()].find((stage) => stage.key.includes(':acquire:'))?.status).toBe(
    'completed',
  )
  expect([...state.stages.values()].find((stage) => stage.key.includes(':analyze:'))?.status).toBe(
    'failed',
  )
  expect(state.rows.outreach_targets.dossier.acquisition).toBeUndefined()
})
