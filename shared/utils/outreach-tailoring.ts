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
  const observation = evidence
    ? `Your work caught our attention: “[REVIEW: add a specific observation supported by ${evidence.url}]”.`
    : '[REVIEW: add one verified research-specific observation and its source].'
  const asks: Record<ProposalStyle, string> = {
    conversation:
      'Would you consider a short conversation with our society about [REVIEW: specific research question]? We would prepare students and coordinate scheduling.',
    visit:
      'Would an approved school visit focused on [REVIEW: relevant topic] be possible? We would first arrange the required school sponsorship, permissions and transport.',
    feedback:
      'Would you be open to a brief feedback session on [REVIEW: actual project and focused question]? We can send a one-page summary beforehand.',
    replication:
      'We would like to reproduce [REVIEW: named baseline] using permitted public code/data and investigate [REVIEW: bounded question]. Would that scope be useful, and what supervision or eligibility requirements would apply?',
    validation:
      'We could pilot [REVIEW: bounded validation task] and return a reproducible error report with [REVIEW: quality checks]. Would this address a useful question for your group?',
    annotation:
      'If useful to your group, we could explore a small annotation pilot on permitted data, with your rubric, training and agreement checks. What task and supervision would make such a pilot worthwhile?',
    collaboration:
      'Would you be willing to discuss [REVIEW: scoped contribution and deliverable] as a small collaboration? We would establish supervision, data permissions and contribution expectations before work begins.',
  }
  const introduction =
    kind === 'student' && profile
      ? `${profile.introduction || `I’m ${profile.fullName}, involved with ${society.name}.`} My interests include ${profile.interests.slice(0, 3).join(', ') || '[REVIEW: research interests]'}.${affiliation ? ` Relevant affiliation: ${affiliation}.` : ''}`
      : `I’m ${input.senderName || '[REVIEW: sender name]'}, writing on behalf of ${society.name}, a research society at Martin High School.`
  const relevant =
    kind === 'student' && sample
      ? `My work on ${sample.sample.title}: ${sample.sample.contribution}\nWork sample: ${sample.sample.url}`
      : accomplishments[0]
        ? `Relevant society work: ${accomplishments[0].item.description}\n${accomplishments[0].item.url}`
        : ''
  const availability =
    kind === 'student' && profile?.availability ? `I can commit ${profile.availability}.` : ''
  return {
    subject:
      `${style === 'visit' ? 'School research visit' : style === 'conversation' ? 'Research discussion' : `${style[0]!.toUpperCase()}${style.slice(1)} pilot`} — ${target.disciplines[0] || target.organization || target.name}`.slice(
        0,
        180,
      ),
    body: [
      `Hello ${target.name},`,
      introduction,
      observation,
      relevant,
      achievement ? `${achievement.description}\n${achievement.url}` : '',
      availability,
      asks[style],
      `Thank you,\n${profile?.signature || profile?.fullName || input.senderName || '[REVIEW: sender name]'}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    notices: [
      'Complete every REVIEW placeholder before approval; no reading or contribution is invented.',
      ...(sample && sample.score === 0
        ? [
            'The selected work sample has no detected topical overlap; choose a better artifact or explain its relevance.',
          ]
        : []),
      'Local matching is a transparent drafting aid, not evidence of research eligibility or an acceptance probability.',
    ],
  }
}
