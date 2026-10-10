import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { createClient } from '@supabase/supabase-js'
import {
  CuratedDiscoveryProvider,
  PublicGeminiResearchModel,
  ReviewedSourceReader,
} from './research-providers'
import { compileTechnicalContext } from '../shared/utils/research-context'
import type { SourceSnapshot } from '../shared/types/workspace-providers'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  OUTREACH_ENABLED?: string
  GEMINI_TERMS_CONFIRMED?: string
  GEMINI_FREE_PROJECT_CONFIRMED?: string
  GEMINI_PROVIDER_MODE?: string
  GEMINI_PAID_PROJECT_CONFIRMED?: string
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
        const suppression = await db
          .from('outreach_suppressions')
          .select('canonical_url')
          .eq('canonical_url', result.data.canonical_url)
          .maybeSingle()
        if (suppression.error || suppression.data) throw new Error('Target suppressed')
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
    const reader = new ReviewedSourceReader()
    const model = new PublicGeminiResearchModel({
      key: this.env.GEMINI_API_KEY || '',
      model: this.env.GEMINI_MODEL || 'gemini-2.5-flash',
      mode:
        this.env.GEMINI_PROVIDER_MODE === 'authorized_context'
          ? 'authorized_context'
          : 'unpaid_public',
      termsConfirmed: this.env.GEMINI_TERMS_CONFIRMED === 'true',
      projectModeConfirmed:
        this.env.GEMINI_PROVIDER_MODE === 'authorized_context'
          ? this.env.GEMINI_PAID_PROJECT_CONFIRMED === 'true'
          : this.env.GEMINI_FREE_PROJECT_CONFIRMED === 'true',
    })
    const dependencyIds: string[] = []
    const hashKey = async (value: string) =>
      Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
      )
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
    const stage = async <T>(
      name: string,
      inputKey: string,
      resource: 'source' | 'model' | 'local',
      execute: () => Promise<T>,
    ): Promise<T> => {
      await currentContext()
      const reserved = await db.rpc('outreach_reserve_stage', {
        p_job: job.id,
        p_claim: job.claim_token,
        p_stage: name,
        p_input_key: inputKey,
        p_resource: resource,
        p_dependencies: [...dependencyIds],
        p_metadata: {
          promptVersion: 'bounded-contribution-v1',
          modelVersion: resource === 'model' ? this.env.GEMINI_MODEL || 'gemini-2.5-flash' : null,
        },
      })
      if (reserved.error)
        throw new Error(
          reserved.error.message.includes('budget')
            ? 'Research resource budget exhausted'
            : 'Could not reserve research stage',
        )
      if (reserved.data.cached) {
        dependencyIds.push(reserved.data.id)
        return reserved.data.result as T
      }
      // A stage that was interrupted after submission never silently replays
      // within this attempt; the database is the sole retry authority.
      if (reserved.data.resumed)
        throw new Error('Interrupted research stage requires bounded job retry')
      try {
        const value = await execute()
        await currentContext()
        const saved = await db.rpc('outreach_finish_stage', {
          p_id: reserved.data.id,
          p_job: job.id,
          p_claim: job.claim_token,
          p_result: value,
          p_error: null,
          p_usage: { resource, accounting: 'reserved-upper-bound' },
        })
        if (saved.error || !saved.data) throw new Error('Research lease expired; stage not applied')
        dependencyIds.push(reserved.data.id)
        return value
      } catch (error) {
        await db.rpc('outreach_finish_stage', {
          p_id: reserved.data.id,
          p_job: job.id,
          p_claim: job.claim_token,
          p_result: {},
          p_error: error instanceof Error ? error.message.slice(0, 300) : 'Stage failed',
          p_usage: { resource, accounting: 'unknown-cost-reservation-retained' },
        })
        throw error
      }
    }
    try {
      const evidence = await step.do('acquire-cited-first-party-evidence', bounded, async () => {
        const context = await currentContext()
        const url = context.target?.canonical_url || context.source.url
        return stage<SourceSnapshot>('acquire', url, 'source', () =>
          reader.read(url, context.source.allowed_hosts, AbortSignal.timeout(30000)),
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
                  kind: /program|outreach|mentor|tour/i.test(link.name)
                    ? 'program'
                    : /\/(faculty|people|profile|person)(\/|$)/i.test(
                          new URL(link.canonical_url).pathname,
                        )
                      ? 'pi'
                      : 'lab',
                  organization: new URL(link.canonical_url).hostname,
                  description:
                    'Directory discovery; research relevance and participation availability have not been verified.',
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
        // assertion that publication lists establish participation eligibility.
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
              return await stage<SourceSnapshot>(
                `related-${index}`,
                link.canonical_url,
                'source',
                () =>
                  reader.read(
                    link.canonical_url,
                    context.source.allowed_hosts,
                    AbortSignal.timeout(30000),
                  ),
              )
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
              model.status().configured
            if (!(
              ai &&
              context.source.ai_reviewed &&
              context.source.ai_excerpt &&
              evidence.url === context.source.url &&
              evidence.text.includes(context.source.ai_excerpt)
            ))
              return null
            if (context.source.ai_snapshot_hash !== evidence.hash) return null
            const packet = compileTechnicalContext({
              snapshotHash: evidence.hash,
              snapshotText: evidence.text,
              reviewedHash: context.source.ai_snapshot_hash,
              reviewedExcerpt: context.source.ai_excerpt,
              reviewed: context.source.ai_reviewed,
            })
            return stage(
              'analyze',
              `${evidence.hash}:${await hashKey(context.source.ai_excerpt)}`,
              'model',
              () =>
                model.analyze({
                  approvedPublicExcerpt: packet.excerpt,
                  schemaVersion: 'public-research-v1',
                  promptVersion: 'bounded-contribution-v1',
                  signal: AbortSignal.timeout(35000),
                }),
            )
          },
        )
        const identity = await step.do(
          'resolve-supported-identity-and-contact-unknowns',
          bounded,
          async () =>
            stage('identity', evidence.hash, 'local', async () => ({
              schemaVersion: 'identity-evidence-v1',
              canonicalUrl: evidence.url,
              sourceHashes: pages.map((page) => page.hash),
              possibleContacts: pages.flatMap((page) =>
                page.contacts.map((address) => ({
                  address,
                  sourceUrl: page.url,
                  snapshotHash: page.hash,
                  reviewed: false,
                })),
              ),
              entities: evidence.entities,
              unknowns: [
                'A page address is not verified as the intended recipient.',
                'Current affiliation and mentoring openness require officer review.',
              ],
              retrievedAt: evidence.retrievedAt,
            })),
        )
        result = {
          acquisition: {
            pages,
            identity,
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
            .select('id,url,allowed_hosts')
            .eq('enabled', true)
            .eq('kind', 'directory')
          // Prefer sources without recent completed work; review capacity gates discovery.
          const active = await db
            .from('outreach_targets')
            .select('id', { count: 'exact', head: true })
            .in('status', ['needs_review', 'ready'])
          const history = await db
            .from('outreach_jobs')
            .select('source_id,updated_at')
            .eq('kind', 'discover')
            .eq('status', 'completed')
            .order('updated_at', { ascending: false })
            .limit(250)
          const latest = new Map<string, string>()
          for (const item of history.data || [])
            if (item.source_id && !latest.has(item.source_id))
              latest.set(item.source_id, item.updated_at)
          const all = (sources.data || []).sort(
            (a, b) =>
              (latest.get(a.id) || '').localeCompare(latest.get(b.id) || '') ||
              a.id.localeCompare(b.id),
          )
          const profiles = await db
            .from('outreach_profiles')
            .select('interests')
            .eq('consent_to_share', true)
            .limit(100)
          const interests = [
            ...new Set((profiles.data || []).flatMap((profile) => profile.interests || [])),
          ]
          const provider = new CuratedDiscoveryProvider(
            all.map((source) => ({
              url: source.url,
              hosts: source.allowed_hosts,
              fields: /cs|cse/.test(source.id)
                ? ['Robotics', 'Computer Science', 'Artificial Intelligence']
                : /utsw/.test(source.id)
                  ? ['Biology', 'Medicine']
                  : [],
            })),
          )
          const urls =
            active.error || (active.count || 0) >= settings.data.queue_limit
              ? []
              : await provider.discover({
                  interests,
                  permittedSources: all.map((source) => source.url),
                  limit: 1,
                  signal: AbortSignal.timeout(5000),
                })
          const selected = all.filter((source) => urls.includes(source.url))
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
