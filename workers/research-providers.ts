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
          input.interests.some((interest) => interest.toLowerCase() === field.toLowerCase()),
        ),
      }))
      .sort((a, b) => Number(b.relevant) - Number(a.relevant) || a.index - b.index)
      .slice(0, Math.max(0, Math.min(5, input.limit)))
      .map(({ source }) => source.url)
  }
}
export class ReviewedSourceReader implements SourceReader {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
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
      suitableAudienceAuthorized: boolean
      fetcher?: typeof fetch
    },
  ) {}
  status(): ProviderCapability {
    const ready = Boolean(this.options.key && this.options.suitableAudienceAuthorized)
    return {
      configured: ready,
      state: ready ? 'ready' : 'unavailable',
      capabilities: ready ? ['approved_public_excerpt'] : [],
    }
  }
  async analyze(input: Parameters<ResearchModel['analyze']>[0]) {
    if (!this.status().configured)
      throw new Error(
        'Model activation requires suitable audience authorization and server credentials.',
      )
    if (
      input.schemaVersion !== 'public-research-v1' ||
      input.promptVersion !== 'bounded-contribution-v1'
    )
      throw new Error('Unsupported model contract version.')
    input.signal.throwIfAborted()
    const fetcher = this.options.fetcher || fetch
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
    return {
      themes: output.themes,
      proposals: output.proposalOptions.map((proposal) => ({
        title: proposal.title,
        deliverable: proposal.deliverable,
        supportingQuote: proposal.quote,
      })),
      unknowns: output.unknowns,
    }
  }
}
