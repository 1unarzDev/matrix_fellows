import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { createClient } from '@supabase/supabase-js'
import { analyzePublicResearch, fetchOutreachEvidence } from './outreach-research'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  OUTREACH_ENABLED?: string
  GEMINI_TERMS_CONFIRMED?: string
  GEMINI_FREE_PROJECT_CONFIRMED?: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  OUTREACH_RESEARCH: Workflow<{ job: ResearchJob }>
}
interface ResearchJob {
  id: string
  kind: string
  target_id?: string
  source_id?: string
  claim_token: string
  payload?: Record<string, unknown>
}
const storage = (env: Env) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  })

export class OutreachResearchWorkflow extends WorkflowEntrypoint<Env, { job: ResearchJob }> {
  async run(event: WorkflowEvent<{ job: ResearchJob }>, step: WorkflowStep) {
    const { job } = event.payload
    const db = storage(this.env)
    // No durable cached permission is authorization for a later external call.
    const currentContext = async () => {
      const lease = await db
        .from('outreach_jobs')
        .select('status,claim_token,lease_until')
        .eq('id', job.id)
        .maybeSingle()
      if (
        lease.error ||
        lease.data?.status !== 'running' ||
        lease.data.claim_token !== job.claim_token ||
        !(Date.parse(lease.data.lease_until || '') > Date.now())
      )
        throw new Error('Research lease expired')
      const settings = await db.from('outreach_settings').select('*').eq('id', true).single()
      if (settings.error || settings.data.paused || this.env.OUTREACH_ENABLED !== 'true')
        throw new Error('Research paused')
      let target: Record<string, any> | null = null
      if (job.target_id) {
        const result = await db
          .from('outreach_targets')
          .select('*')
          .eq('id', job.target_id)
          .single()
        if (result.error || ['rejected', 'deferred', 'contacted'].includes(result.data.status))
          throw new Error('Target unavailable or suppressed')
        target = result.data
      }
      const sourceResult = await db
        .from('outreach_sources')
        .select('*')
        .eq(job.source_id ? 'id' : 'url', job.source_id || target?.canonical_url || '')
        .maybeSingle()
      let source = sourceResult.data
      if (!source && target) {
        const host = new URL(target.canonical_url).hostname
        const approved = await db.from('outreach_sources').select('*').eq('enabled', true)
        source = (approved.data || []).find((row) => row.allowed_hosts.includes(host))
      }
      if (!source?.enabled) throw new Error('No enabled reviewed source')
      if (!(Date.parse(lease.data.lease_until) > Date.now() + 30000))
        throw new Error('Research lease has insufficient remaining time')
      return { settings: settings.data, target, source }
    }
    const bounded = {
      retries: { limit: 0, delay: '1 second' as const, backoff: 'constant' as const },
      timeout: '2 minutes' as const,
    }
    try {
      const evidence = await step.do('acquire-cited-first-party-evidence', bounded, async () => {
        const context = await currentContext()
        return fetchOutreachEvidence(
          context.target?.canonical_url || context.source.url,
          context.source.allowed_hosts,
        )
      })

      let result: Record<string, unknown>
      if (job.kind === 'discover') {
        const admitted = await step.do(
          'admit-deduplicated-candidates-with-atomic-budget',
          bounded,
          async () => {
            const context = await currentContext()
            let count = 0
            for (const link of evidence.entities) {
              if (count >= (context.settings.batch_limit || 5)) break
              const response = await db.rpc('outreach_admit_target', {
                p_payload: {
                  batch_key: job.id,
                  source_id: job.source_id,
                  job_id: job.id,
                  claim_token: job.claim_token,
                  ...link,
                  kind: /program|outreach|mentor|tour/i.test(link.name) ? 'program' : 'lab',
                  organization: new URL(link.canonical_url).hostname,
                  description:
                    'Directory discovery; research and high-school openness have not been verified.',
                  scope: 'both',
                  location: '',
                  mode: 'unknown',
                  discipline: [],
                  dossier: {
                    evidence: [
                      {
                        url: evidence.url,
                        claim:
                          'This directory links to the candidate; it does not establish mentoring availability.',
                        quote: link.name,
                        retrievedAt: evidence.retrievedAt,
                        confidence: 'verified',
                      },
                    ],
                  },
                },
              })
              if (response.error) throw new Error('Candidate admission failed')
              if (response.data?.admitted) count++
              else if (!['duplicate', 'suppressed'].includes(response.data?.reason)) break
            }
            return count
          },
        )
        result = { admitted }
      } else {
        const pages = [evidence]
        // At most two related first-party pages: no recursive spider and no
        // assertion that publication lists establish high-school eligibility.
        for (const [index, link] of evidence.links
          .filter(
            (link) =>
              link.canonical_url !== evidence.url &&
              /publication|project|research|resource|join|opportunit/i.test(link.name),
          )
          .slice(0, 2)
          .entries()) {
          const page = await step.do(`acquire-related-page-${index}`, bounded, async () => {
            const context = await currentContext()
            try {
              return await fetchOutreachEvidence(link.canonical_url, context.source.allowed_hosts)
            } catch {
              return null
            } // A missing secondary page never invents facts.
          })
          if (page) pages.push(page)
        }
        // Never send a whole webpage or a private profile. Only explicitly
        // reviewed source text is eligible, and must still exist in the page.
        const analysis = await step.do(
          'analyze-reviewed-non-personal-excerpt',
          bounded,
          async () => {
            const context = await currentContext()
            if ((context.target?.canonical_url || context.source.url) !== evidence.url)
              throw new Error('Target identity changed; acquire fresh evidence')
            const ai =
              context.settings.ai_enabled &&
              context.settings.terms_confirmed &&
              this.env.GEMINI_TERMS_CONFIRMED === 'true' &&
              this.env.GEMINI_FREE_PROJECT_CONFIRMED === 'true'
            if (!(
              ai &&
              context.source.ai_reviewed &&
              context.source.ai_excerpt &&
              evidence.url === context.source.url &&
              evidence.text.includes(context.source.ai_excerpt)
            ))
              return null
            if (!this.env.GEMINI_API_KEY) throw new Error('Free research model is not configured')
            return analyzePublicResearch(
              context.source.ai_excerpt,
              this.env.GEMINI_API_KEY,
              this.env.GEMINI_MODEL || 'gemini-2.5-flash',
            )
          },
        )
        result = {
          acquisition: {
            pages,
            ...(analysis ? { publicAnalysis: analysis } : {}),
            aiState: analysis ? 'reviewed-public-excerpt-analyzed' : 'not-used',
          },
        }
      }
      await step.do('save-research-checkpoint', bounded, async () => {
        const current = await currentContext()
        if ((current.target?.canonical_url || current.source.url) !== evidence.url)
          throw new Error('Target identity changed; acquire fresh evidence')
        const response = await db.rpc('outreach_complete_job', {
          p_id: job.id,
          p_claim_token: job.claim_token,
          p_result: result,
          p_error: null,
        })
        if (response.error || !response.data)
          throw new Error('Research lease expired; result not applied')
        return true
      })
      return { completed: true }
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : 'Research failed'
      await step.do('record-research-failure', bounded, async () => {
        if (message.includes('quota exhausted'))
          await db.from('outreach_settings').update({ ai_enabled: false }).eq('id', true)
        const response = await db.rpc('outreach_complete_job', {
          p_id: job.id,
          p_claim_token: job.claim_token,
          p_result: {},
          p_error: message,
        })
        if (response.error) throw new Error('Could not record failure')
        return true
      })
      return { completed: false, error: message }
    }
  }
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (env.OUTREACH_ENABLED !== 'true' || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
      return
    ctx.waitUntil(
      (async () => {
        const db = storage(env)
        const settings = await db.from('outreach_settings').select('*').eq('id', true).single()
        if (settings.error || settings.data.paused) return
        if (controller.cron === '0 16 * * 1,3,5') {
          const sources = await db
            .from('outreach_sources')
            .select('id')
            .eq('enabled', true)
            .eq('kind', 'directory')
          // One rotated directory per batch keeps the total admission ceiling at
          // five, not five per directory. Database counters enforce the ceiling.
          const all = sources.data || []
          const selected = all.length
            ? [all[Math.floor(controller.scheduledTime / 86400000) % all.length]!]
            : []
          for (const source of selected) {
            const key = `discovery:${source.id}:${new Date(controller.scheduledTime).toISOString().slice(0, 10)}`
            await db
              .from('outreach_jobs')
              .upsert(
                { kind: 'discover', source_id: source.id, work_key: key, status: 'queued' },
                { onConflict: 'work_key', ignoreDuplicates: true },
              )
          }
        }
        const claims = await db.rpc('outreach_claim_jobs', {
          p_worker_key: 'outreach-cron',
          p_limit: 2,
        })
        if (claims.error) throw new Error('Could not claim research jobs')
        for (const job of claims.data || []) {
          try {
            await env.OUTREACH_RESEARCH.create({
              id: `${job.id}-${job.claim_token}`,
              params: { job },
            })
          } catch {
            await db.rpc('outreach_complete_job', {
              p_id: job.id,
              p_claim_token: job.claim_token,
              p_result: {},
              p_error: 'Workflow could not start',
            })
          }
        }
      })(),
    )
  },
  fetch() {
    return new Response('Private research worker. No public trigger.', { status: 404 })
  },
} satisfies ExportedHandler<Env>
