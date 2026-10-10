import type { OutreachTarget } from '../types/outreach'
import type { EligibilityState } from '../types/dashboard'
export interface EligibilityRule {
  id: string
  fact: string
  allowed: (string | number | boolean)[]
  description: string
  source: string
  excerpt: string
  verifiedAt: string
  /** Published cycle, if known. A retrieval date is never a cycle. */
  cycle?: string
}
export interface EligibilityFact {
  value: string | number | boolean
  origin: 'member' | 'artifact' | 'source'
}
export interface EligibilityCheck {
  state: EligibilityState
  checks: { rule: EligibilityRule; state: EligibilityState; explanation: string }[]
  verificationTasks: string[]
}

/** Explicit rule evaluation, not an inference from school name or reputation.
 * An empty rule set cannot establish eligibility. Conflicting facts remain
 * visible even when another rule excludes the member. */
export function assessResearchEligibility(
  rules: EligibilityRule[],
  facts: Record<string, EligibilityFact[] | undefined>,
): EligibilityCheck {
  const checks = rules.map((rule) => {
    const values = [...new Set((facts[rule.fact] || []).map((fact) => fact.value))]
    const state: EligibilityState =
      values.length > 1
        ? 'conflict'
        : values.length === 0
          ? 'unknown'
          : rule.allowed.includes(values[0]!)
            ? 'eligible'
            : 'excluded'
    return {
      rule,
      state,
      explanation:
        state === 'unknown'
          ? `Confirm: ${rule.description}`
          : state === 'conflict'
            ? `Resolve conflicting information: ${rule.description}`
            : state === 'excluded'
              ? `Does not meet: ${rule.description}`
              : `Meets: ${rule.description}`,
    }
  })
  const state: EligibilityState = checks.some((c) => c.state === 'conflict')
    ? 'conflict'
    : checks.some((c) => c.state === 'excluded')
      ? 'excluded'
      : !checks.length || checks.some((c) => c.state === 'unknown')
        ? 'unknown'
        : 'eligible'
  return {
    state,
    checks,
    verificationTasks: checks
      .filter((c) => ['unknown', 'conflict'].includes(c.state))
      .map((c) => c.explanation),
  }
}

/** First-party policy extracts checked 2026-10-07. These are requirements,
 * not proof of an open cycle, accepted placement, or full program eligibility. */
export const researchProgramRules: Record<'stars' | 'clark', EligibilityRule[]> = {
  stars: [
    {
      id: 'stars-no-prior-research',
      fact: 'priorResearchExperience',
      allowed: [false],
      description: 'No prior research experience',
      source:
        'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html',
      excerpt: 'students with prior research experience are not eligible',
      verifiedAt: '2026-10-07',
    },
    {
      id: 'stars-junior',
      fact: 'currentGrade',
      allowed: [11],
      description: 'Currently classified as a high-school junior',
      source:
        'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html',
      excerpt: 'be currently classified as a junior, and be enrolled in high school',
      verifiedAt: '2026-10-07',
    },
    {
      id: 'stars-enrolled',
      fact: 'highSchoolEnrolled',
      allowed: [true],
      description: 'Enrolled in high school',
      source:
        'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html',
      excerpt: 'be enrolled in high school',
      verifiedAt: '2026-10-07',
    },
    {
      id: 'stars-age',
      fact: 'atLeast16ByProgramJune1',
      allowed: [true],
      description: 'At least 16 by June 1 before the program',
      source:
        'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html',
      excerpt: 'Applicants must be at least 16 years old by June 1',
      verifiedAt: '2026-10-07',
    },
    {
      id: 'stars-work-eligibility',
      fact: 'usCitizenNationalOrWorkEligible',
      allowed: [true],
      description: 'US citizen/national or eligible to work in the US',
      source:
        'https://www.utsouthwestern.edu/education/nondegree-programs/stars/programs/summer-research-opportunities.html',
      excerpt:
        'All citizens or nationals of the United States or those eligible to work in the United States are eligible',
      verifiedAt: '2026-10-07',
    },
  ],
  clark: [
    {
      id: 'clark-incoming-utd',
      fact: 'incomingFirstYearUtd',
      allowed: [true],
      description: 'Incoming first-year UT Dallas student',
      source: 'https://honors.utdallas.edu/research/clark-program-faq/',
      excerpt:
        'The Clark Summer Research Program is open to incoming, first-year UT Dallas students.',
      verifiedAt: '2026-10-07',
    },
  ],
}

export interface ResearchPreferences {
  lens: 'nearby' | 'remote' | 'travel'
  interests: string[]
  /** Explicit member-approved city/campus list; no synthetic commute times. */
  reachableLocations: string[]
}
export interface ResearchFit {
  access: 'practical' | 'unconfirmed' | 'outside-preference'
  reasons: string[]
  unresolved: string[]
}
const normalize = (value: string) => value.trim().toLocaleLowerCase('en-US')
export function explainResearchFit(
  target: OutreachTarget,
  preferences: ResearchPreferences,
): ResearchFit {
  const relevant = target.disciplines.filter((field) =>
    preferences.interests.some((interest) => normalize(interest) === normalize(field)),
  )
  // Require a word boundary: Dallas must not match a different town's name.
  const locationWords = normalize(target.location)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  const reachable = preferences.reachableLocations.some((location) => {
    const words = normalize(location)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
    return words.length > 0 && words.every((word) => locationWords.includes(word))
  })
  const remote = target.mode === 'remote' || target.mode === 'hybrid'
  const access: ResearchFit['access'] =
    preferences.lens === 'remote'
      ? target.mode === 'remote'
        ? 'practical'
        : target.mode === 'unknown' || target.mode === 'hybrid'
          ? 'unconfirmed'
          : 'outside-preference'
      : preferences.lens === 'travel'
        ? target.mode === 'unknown'
          ? 'unconfirmed'
          : 'practical'
        : reachable && target.mode !== 'unknown'
          ? 'practical'
          : target.mode === 'remote'
            ? 'practical'
            : target.mode === 'unknown' || !target.location
              ? 'unconfirmed'
              : 'outside-preference'
  return {
    access,
    reasons: [
      ...(relevant.length ? [`Shared field: ${relevant.slice(0, 2).join(', ')}`] : []),
      ...(reachable ? [`Listed location: ${target.location}; within your selected locations`] : []),
      ...(remote
        ? [
            `${target.mode === 'hybrid' ? 'Hybrid' : 'Remote'} work is listed; confirm the specific task arrangement`,
          ]
        : []),
    ].slice(0, 3),
    unresolved: [
      ...(preferences.lens === 'remote' && target.mode === 'hybrid'
        ? ['Hybrid participation may require onsite work; remote-only access is unconfirmed.']
        : []),
      ...(target.mode === 'unknown'
        ? ['Participation mode and actual worksite are unconfirmed.']
        : []),
      ...(access === 'outside-preference'
        ? ['Access falls outside your current location or participation preference.']
        : []),
      'Current student availability, supervision, and eligibility need confirmation.',
      ...(target.assessment.blockers || []),
    ],
  }
}

/** Stable partition by practical access then actual shared fields. Unknowns
 * stay inspectable; no probability, prestige weight, or fabricated openness. */
export function orderResearchTargets(
  targets: OutreachTarget[],
  preferences: ResearchPreferences,
): OutreachTarget[] {
  const accessOrder = { practical: 0, unconfirmed: 1, 'outside-preference': 2 }
  return targets
    .map((target, index) => ({ target, index, fit: explainResearchFit(target, preferences) }))
    .sort(
      (a, b) =>
        accessOrder[a.fit.access] - accessOrder[b.fit.access] ||
        Number(!a.fit.reasons.some((r) => r.startsWith('Shared field:'))) -
          Number(!b.fit.reasons.some((r) => r.startsWith('Shared field:'))) ||
        a.index - b.index,
    )
    .map(({ target }) => target)
}
