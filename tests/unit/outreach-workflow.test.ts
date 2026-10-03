import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  rows: {} as Record<string, any>,
  calls: [] as { name: string; input: any }[],
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
      return { data: name === 'outreach_admit_target' ? state.admission(input) : true, error: null }
    },
  }),
}))
vi.mock('../../workers/outreach-research', () => ({
  fetchOutreachEvidence: (...args: any[]) => state.fetchEvidence(...args),
  analyzePublicResearch: (...args: any[]) => state.analyze(...args),
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
beforeEach(() => {
  state.calls = []
  state.onStep = () => {}
  state.admission.mockReset().mockReturnValue({ admitted: true })
  state.fetchEvidence
    .mockReset()
    .mockResolvedValue({
      url: 'https://uta.edu/lab',
      text: excerpt,
      hash: 'hash',
      retrievedAt: new Date().toISOString(),
      links: [],
      entities: [{ name: 'Robotics laboratory', canonical_url: 'https://uta.edu/robotics' }],
    })
  state.analyze
    .mockReset()
    .mockResolvedValue({
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
    })
  state.rows = {
    outreach_jobs: {
      status: 'running',
      claim_token: 'claim',
      lease_until: new Date(Date.now() + 300000).toISOString(),
    },
    outreach_settings: { paused: false, ai_enabled: true, terms_confirmed: true, batch_limit: 5 },
    outreach_targets: {
      status: 'needs_review',
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
    },
  }
})
it('executes acquisition, screened analysis and claim-token-bound completion without private profiles', async () => {
  expect(await run()).toEqual({ completed: true })
  expect(state.analyze).toHaveBeenCalledWith(excerpt, 'key', 'gemini-2.5-flash')
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
it('disables optional AI on quota exhaustion rather than falling back to paid execution', async () => {
  state.analyze.mockRejectedValue(new Error('Free model quota exhausted; no paid fallback'))
  expect((await run()).completed).toBe(false)
  expect(state.rows.outreach_settings.ai_enabled).toBe(false)
  expect(state.calls.at(-1)?.input.p_error).toContain('quota exhausted')
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
  state.fetchEvidence.mockResolvedValue({
    url: 'https://uta.edu/lab',
    text: excerpt,
    links: [],
    entities: Array.from({ length: 12 }, (_, index) => ({
      name: `Robotics lab ${index}`,
      canonical_url: `https://uta.edu/lab/${index}`,
    })),
  })
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
