import { stableResearchTopics } from '../shared/utils/research-topics'
import type {
  DiscoveryProvider,
  ProviderCapability,
  ResearchModel,
  SourceReader,
} from '../shared/types/workspace-providers'
import {
  analyzePublicResearch,
  fetchOutreachEvidence,
  permittedOutreachUrl,
} from './outreach-research'

/** A registry is useful without a broad-web search key. Directory expansion is
 * still performed by the existing bounded acquisition job, not Search grounding. */
export class CuratedDiscoveryProvider implements DiscoveryProvider {
  constructor(private readonly sources: { url: string; hosts: string[]; fields: string[] }[]) {}
  status(): ProviderCapability {
    return { configured: true, state: 'ready', capabilities: ['curated_sources'] }
  }
  async discover(input: Parameters<DiscoveryProvider['discover']>[0]) {
    input.signal.throwIfAborted()
    const allowed = new Set(input.permittedSources)
    return this.sources
      .filter((source) => allowed.has(source.url))
      .filter((source) => {
        try {
          permittedOutreachUrl(source.url, source.hosts)
          return true
        } catch {
          return false
        }
      })
      .map((source, index) => ({
        source,
        index,
        relevant: source.fields.some((field) =>
          stableResearchTopics(input.interests).some(topic=>stableResearchTopics([field]).includes(topic)),
        ),
      }))
      .sort((a, b) => Number(b.relevant) - Number(a.relevant) || a.index - b.index)
      .slice(0, Math.max(0, Math.min(5, input.limit)))
      .map(({ source }) => source.url)
  }
}
export class ReviewedSourceReader implements SourceReader {
  constructor(
    private readonly fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init),
  ) {}
  async read(url: string, permittedHosts: string[], signal: AbortSignal) {
    signal.throwIfAborted()
    return fetchOutreachEvidence(url, permittedHosts, (input, init) =>
      this.fetcher(input, {
        ...init,
        signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]),
      }),
    )
  }
}
export class PublicGeminiResearchModel implements ResearchModel {
  constructor(
    private readonly options: {
      key: string
      model: string
      termsConfirmed: boolean
      mode: 'unpaid_public' | 'authorized_context'
      projectModeConfirmed: boolean
      fetcher?: typeof fetch
    },
  ) {}
  status(): ProviderCapability {
    const ready = Boolean(
      this.options.key && this.options.termsConfirmed && this.options.projectModeConfirmed,
    )
    return {
      configured: ready,
      state: ready ? 'ready' : 'unavailable',
      capabilities: ready ? ['approved_public_excerpt'] : [],
    }
  }
  async analyze(input: Parameters<ResearchModel['analyze']>[0]) {
    if (!this.status().configured)
      throw new Error(
        'Model activation requires confirmed terms, project mode and server credentials.',
      )
    if (
      input.schemaVersion !== 'public-research-v1' ||
      !['bounded-contribution-v1', 'bounded-contribution-v2'].includes(input.promptVersion)
    )
      throw new Error('Unsupported model contract version.')
    input.signal.throwIfAborted()
    // Cloudflare's global fetch is host-bound. Keep the provider seam
    // injectable for tests while ensuring the live default retains its
    // receiver when passed through the adapter.
    const fetcher = this.options.fetcher || ((input: RequestInfo | URL, init?: RequestInit) =>
      globalThis.fetch(input, init))
    const output = await analyzePublicResearch(
      input.approvedPublicExcerpt,
      this.options.key,
      this.options.model,
      (url, init) =>
        fetcher(url, {
          ...init,
          signal: AbortSignal.any([input.signal, ...(init?.signal ? [init.signal] : [])]),
        }),
    )
    return output
  }
}
