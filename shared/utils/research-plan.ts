import { z } from 'zod'
import type { OutreachProfile, OutreachTarget } from '../types/outreach'

export interface ContributionPlan {
  schemaVersion: 'contribution-plan-v1'
  mode: 'question' | 'possible_contribution'
  connection: string
  deliverable: string
  question: string
  evidence: { url: string; quote: string; snapshotHash?: string }[]
  unknowns: string[]
  provenance: 'reviewed-model-analysis' | 'local-evidence'
  dimensions: {
    dimension: 'research' | 'participation' | 'contribution' | 'supervision' | 'freshness'
    state: 'supported' | 'unknown' | 'conflict'
    reason: string
  }[]
}
/** Select one source-supported option; a model option does not establish a lab need. */
export function buildContributionPlan(
  target: OutreachTarget,
  profile?: OutreachProfile,
  selectedOption?: number,
): ContributionPlan {
  const parsed = z
    .object({
      pages: z.array(z.object({ url: z.string(), text: z.string(), hash: z.string() })).default([]),
      publicAnalysis: z
        .object({
          proposalOptions: z.array(
            z.object({
              title: z.string(),
              task: z.string(),
              deliverable: z.string(),
              quote: z.string(),
              supervisionQuestions: z.array(z.string()),
            }),
          ),
          unknowns: z.array(z.string()),
        })
        .optional(),
    })
    .safeParse(target.dossier.acquisition)
  const acquisition = parsed.success ? parsed.data : undefined
  const pages = acquisition?.pages || []
  const options = acquisition?.publicAnalysis?.proposalOptions || []
  const interests = (profile?.interests || target.disciplines).join(' ').toLowerCase()
  const ranked = options
    .filter((option) => pages.some((page) => page.text.includes(option.quote)))
    .map((option) => ({
      option,
      overlap: (option.title + ' ' + option.task)
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 3 && interests.includes(word)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap)
  if (
    selectedOption !== undefined &&
    (!Number.isInteger(selectedOption) ||
      selectedOption < 0 ||
      !options[selectedOption] ||
      !pages.some((page) => page.text.includes(options[selectedOption]!.quote)))
  )
    throw new Error('Select a supported contribution option')
  const selected = selectedOption === undefined ? ranked[0]?.option : options[selectedOption]
  const page = selected ? pages.find((page) => page.text.includes(selected.quote)) : undefined
  const evidence = target.dossier.evidence.find(
    (item) => item.confidence === 'verified' && item.quote,
  )
  const demonstrated = Boolean(profile?.workSamples.some((sample) => sample.contribution.trim()))
  return {
    schemaVersion: 'contribution-plan-v1',
    mode: selected && demonstrated ? 'possible_contribution' : 'question',
    connection: selected?.title || target.disciplines[0] || 'your current research',
    deliverable: selected && demonstrated ? selected.deliverable : '',
    question: selected
      ? `${demonstrated ? `Would it be useful to explore a small pilot? A possible scope is to ${selected.task.charAt(0).toLowerCase() + selected.task.slice(1)}.` : `Which public paper or introductory resource would you recommend for understanding ${selected.title}?`}`
      : `Is there a public paper or introductory resource you would recommend for exploring ${target.disciplines[0] || 'this research direction'}?`,
    evidence:
      page && selected
        ? [{ url: page.url, quote: selected.quote, snapshotHash: page.hash }]
        : evidence?.quote
          ? [{ url: evidence.url, quote: evidence.quote }]
          : [],
    unknowns: [
      ...new Set([
        ...(acquisition?.publicAnalysis?.unknowns || []),
        ...(selected?.supervisionQuestions || []),
        'Participation and supervision are unconfirmed.',
        'Current member availability must be confirmed before promising work.',
      ]),
    ],
    provenance: selected ? 'reviewed-model-analysis' : 'local-evidence',
    dimensions: [
      {
        dimension: 'research',
        state: selected || evidence ? 'supported' : 'unknown',
        reason: selected
          ? `Specific connection: ${selected.title}`
          : evidence
            ? 'Reviewed target evidence supplies a research question.'
            : 'A current research source is needed.',
      },
      {
        dimension: 'participation',
        state: target.mode === 'remote' ? 'supported' : 'unknown',
        reason:
          target.mode === 'remote'
            ? 'Remote participation is recorded; specific tasks and eligibility still need confirmation.'
            : `Physical access and travel need confirmation${profile?.location ? ` from ${profile.location}` : ''}.`,
      },
      {
        dimension: 'contribution',
        state: 'unknown',
        reason: demonstrated
          ? 'Member contribution statement is self-reported; review attribution and scope before making an offer.'
          : 'No demonstrated work is selected; start with a focused question.',
      },
      {
        dimension: 'supervision',
        state: 'unknown',
        reason: 'The recipient has not confirmed a need, supervision or recruiting availability.',
      },
      {
        dimension: 'freshness',
        state: 'unknown',
        reason:
          'Retrieval time is recorded separately; current affiliation, openness and availability require review.',
      },
    ],
  }
}
