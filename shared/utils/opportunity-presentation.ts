import type { Opportunity, OpportunityCost, OpportunityMilestone } from '../types/content'
import { deadlineTimestamp } from './opportunities'

/** A continuous event remains actionable until its verified final day. */
export function nextOpportunityMilestone(points: OpportunityMilestone[], now: number) {
  return points.find(
    (point) => !point.superseded && deadlineTimestamp(point.endDate || point.date) >= now,
  )
}

/** External portals remain accessible without implying that applications are open. */
export function opportunityPortalLabel(item: Opportunity, now: number): string {
  const application = ['Internship', 'Summer program', 'Program'].includes(item.kind)
  const base = application ? 'Application' : 'Submission / registration'
  const deadlines = (item.milestones || []).filter(
    (point) => !point.superseded && point.kind === 'deadline',
  )
  const dates = [...deadlines.map((point) => point.date), ...(item.deadline ? [item.deadline] : [])]
  const hasPastDeadline = dates.some((date) => deadlineTimestamp(date) < now)
  const hasFutureDeadline = dates.some((date) => deadlineTimestamp(date) >= now)
  const inactive =
    ['awaiting-announcement', 'discontinued', 'replaced'].includes(item.lifecycle || '') ||
    (hasPastDeadline && !hasFutureDeadline && item.lifecycle !== 'rolling')
  return `${base} ${inactive ? 'information' : 'portal'} ↗`
}

const labels: Record<keyof OpportunityCost, string> = {
  application: 'Application',
  submission: 'Submission',
  registration: 'Registration',
  program: 'Program / tuition',
  compensation: 'Compensation / stipend',
  accompanyingAdult: 'Accompanying adult',
  travel: 'Travel & lodging',
  materials: 'Materials',
  publication: 'Publication',
  aid: 'Aid & support',
}
const keys = Object.keys(labels) as (keyof OpportunityCost)[]

/** Absence is not a fee, nor proof of free participation. Keep specific pending facts. */
export function opportunityFact(value: string | null | undefined): string | undefined {
  const text = value?.trim()
  if (
    !text ||
    /^(?:unknown|n\/?a|not applicable|not stated|not verified|unverified|not published|not announced|not specified|tbd|to be determined)(?:\s*[—–:.-]\s*.*|\s+(?:in|by|on|yet|in the|by the)\b.*)?[.]?$/i.test(
      text,
    )
  )
    return
  return text
}

export function opportunityCostEntries(item: Opportunity) {
  const rows = keys.flatMap((key) => {
    const value = opportunityFact(item.costs?.[key])
    if (!value) return []
    return [
      {
        key,
        label: labels[key],
        value,
        evidence: item.fieldEvidence?.find((entry) => entry.field === `costs.${key}`),
      },
    ]
  })
  const submission = rows.find((row) => row.key === 'submission')
  const registration = rows.find((row) => row.key === 'registration')
  if (
    submission &&
    registration &&
    submission.value.toLowerCase() === registration.value.toLowerCase() &&
    submission.evidence?.url === registration.evidence?.url &&
    submission.evidence?.quote &&
    submission.evidence.quote === registration.evidence?.quote
  ) {
    submission.label = 'Entry / registration'
    submission.evidence ||= registration.evidence
    return rows.filter((row) => row !== registration)
  }
  return rows
}
