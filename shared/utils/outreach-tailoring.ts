import type { ContributionPlan } from './research-plan'
import type { OutreachProfile, OutreachSociety, OutreachTarget } from '../types/outreach'

export const proposalStyles = [
  'conversation',
  'visit',
  'feedback',
  'replication',
  'validation',
  'annotation',
  'collaboration',
] as const
export type ProposalStyle = (typeof proposalStyles)[number]
const stop = new Set([
  'research',
  'project',
  'student',
  'students',
  'university',
  'school',
  'with',
  'that',
  'this',
  'from',
  'work',
  'have',
  'their',
  'your',
])
const words = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .match(/[a-z][a-z0-9-]{3,}/g)
      ?.filter((word) => !stop.has(word)) || [],
  )
function matchScore(value: string, context: Set<string>) {
  return [...words(value)].filter((word) => context.has(word)).length
}
export function rankedWorkSamples(profile: OutreachProfile, target: OutreachTarget) {
  const context = words(
    [
      target.name,
      target.organization,
      ...target.disciplines,
      target.description,
      target.dossier.research || '',
    ].join(' '),
  )
  return profile.workSamples
    .map((sample) => ({
      sample,
      score: matchScore(`${sample.title} ${sample.contribution}`, context),
    }))
    .sort((a, b) => b.score - a.score)
}
export function tailorOutreachDraft(input: {
  target: OutreachTarget
  society: OutreachSociety
  profile?: OutreachProfile
  senderName?: string
  kind: 'society' | 'student'
  style: ProposalStyle
  plan?: ContributionPlan
}) {
  const { target, society, profile, kind, style } = input
  const context = words(
    [
      target.name,
      target.organization,
      ...target.disciplines,
      target.description,
      target.dossier.research || '',
    ].join(' '),
  )
  // Only publicly supported society claims may leave the workspace. The
  // structured review status is checked when supplied by the profile editor.
  const accomplishments = society.accomplishments
    .filter((item) => item.url && (item as typeof item & { verified?: boolean }).verified === true)
    .map((item) => ({ item, score: matchScore(`${item.title} ${item.description}`, context) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
  const evidence = target.dossier.evidence.find(
    (item) => item.confidence === 'verified' && item.quote,
  )
  const sample = profile ? rankedWorkSamples(profile, target)[0] : undefined
  const achievement = profile?.achievements
    ?.map((item) => ({ item, score: matchScore(`${item.title} ${item.description}`, context) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item
  const affiliation = profile?.affiliations?.find((item) => matchScore(item, context) > 0)
  const plan = input.plan
  const support = plan?.evidence[0]
  const observation = support
    ? `I noticed this description of your research: “${support.quote}” (${support.url}).`
    : evidence?.quote
      ? `I noticed this description of your research: “${evidence.quote}” (${evidence.url}).`
      : '[REVIEW: add one verified research-specific observation and its source].'
  const asks: Record<ProposalStyle, string> = {
    conversation: 'Would you be open to a brief conversation about this research direction?',
    visit:
      'Would an introductory visit be possible? We would first confirm access requirements and practical arrangements.',
    feedback:
      'Would you be open to one focused question or brief feedback on a short project summary?',
    replication:
      'Would a small replication using permitted public code and data be a useful starting point?',
    validation:
      'Would a bounded evaluation with a reproducible error report be useful? We would first agree on scope and permitted data.',
    annotation:
      'Would a small annotation pilot be useful? We would first establish a rubric, data permission and quality checks.',
    collaboration:
      'Would you be open to discussing a small contribution and what supervision it would require?',
  }
  const introduction =
    kind === 'student' && profile
      ? `I’m ${input.senderName || '[REVIEW: officer name]'}, an officer with ${society.name}, writing on behalf of ${profile.fullName}. They have shared an interest in ${profile.interests.slice(0, 3).join(', ') || 'learning more about this research'}.`
      : `I’m ${input.senderName || '[REVIEW: officer name]'}, writing on behalf of ${society.name}.`
  const relevant =
    kind === 'student' && sample
      ? `They describe their contribution to ${sample.sample.title} as: ${sample.sample.contribution}
Work sample: ${sample.sample.url}`
      : accomplishments[0]
        ? `Relevant society work: ${accomplishments[0].item.description}
${accomplishments[0].item.url}`
        : ''
  // Availability is context to verify, never an automatically approved commitment.
  const ask = plan?.question || asks[style]
  const offer =
    plan?.mode === 'possible_contribution' && plan.deliverable
      ? `One possible starting point is ${plan.deliverable}. We would agree on scope and confirm participation before committing to work.`
      : ''

  return {
    subject:
      `${style === 'visit' ? 'Research visit' : style === 'conversation' ? 'Research discussion' : `${style[0]!.toUpperCase()}${style.slice(1)} pilot`} — ${target.disciplines[0] || target.organization || target.name}`.slice(
        0,
        180,
      ),
    body: [
      `Hello ${target.name},`,
      introduction,
      observation,
      relevant,
      achievement
        ? `They report this past result: ${achievement.description}\n${achievement.url}`
        : '',
      offer,
      ask,
      `Thank you,\n${input.senderName || '[REVIEW: officer name]'}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    notices: [
      plan?.provenance === 'reviewed-model-analysis'
        ? 'Local draft uses a source-supported model contribution suggestion; the lab need and participation remain unconfirmed.'
        : 'Using local evidence-based drafting.',
      'Confirm every factual claim and resolve REVIEW placeholders before approval.',
      ...(sample && sample.score === 0
        ? [
            'The selected work sample has no detected topical overlap; choose a better artifact or explain its relevance.',
          ]
        : []),
      'Local matching is a transparent drafting aid, not evidence of research eligibility or an acceptance probability.',
    ],
  }
}
