import type {
  CalendarOpportunityEntry,
  CalendarOpportunitySelection,
  Opportunity,
} from '../types/content'

const safePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72)

const calendarDay = (value: string) => value.slice(0, 10)
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
const dayNumber = (value: string) => Date.parse(`${value}T12:00:00Z`) / 86_400_000
const endWords = /\b(?:ends?|concludes?|finishes?|departure|departures|final day)\b/i
const startWords = /\b(?:begins?|starts?|commences?|arrival|arrivals|opening day)\b/i
const periodKey = (label: string) =>
  label
    .toLowerCase()
    .replace(new RegExp(endWords.source, 'gi'), ' ')
    .replace(new RegExp(startWords.source, 'gi'), ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(?:the|on|programs?|events?|dates?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export interface QualifiedOpportunityPeriod {
  id: string
  startIndex: number
  endIndex?: number
  startDate: string
  endDate: string
  display: 'span' | 'endpoints'
}

/**
 * Qualifies only explicit continuous periods or unambiguous start/end event pairs.
 * Opening-to-deadline windows and unrelated milestones intentionally remain points.
 */
export function qualifyOpportunityPeriods(
  opportunityId: string,
  milestones: Opportunity['milestones'] = [],
): QualifiedOpportunityPeriod[] {
  const result: QualifiedOpportunityPeriod[] = []
  const claimedEnds = new Set<number>()
  milestones.forEach((milestone, startIndex) => {
    if (milestone.superseded || milestone.kind !== 'event') return
    const startDate = calendarDay(milestone.date)
    if (!validDay(startDate)) return
    if (milestone.endDate) {
      const endDate = calendarDay(milestone.endDate)
      const duration = dayNumber(endDate) - dayNumber(startDate)
      if (!validDay(endDate) || duration < 1 || duration > 120) return
      const endIndex = milestones.findIndex(
        (candidate, index) =>
          index !== startIndex &&
          !candidate.superseded &&
          candidate.kind === 'event' &&
          calendarDay(candidate.date) === endDate &&
          endWords.test(candidate.label),
      )
      if (endIndex >= 0) claimedEnds.add(endIndex)
      result.push({
        id: milestone.periodId || `${safePart(opportunityId)}-${safePart(milestone.label)}-${startDate}`,
        startIndex,
        ...(endIndex >= 0 ? { endIndex } : {}),
        startDate,
        endDate,
        display: milestone.rangeDisplay || 'span',
      })
      return
    }
    if (endWords.test(milestone.label)) return
    if (!startWords.test(milestone.label)) return
    const key = periodKey(milestone.label)
    if (!key) return
    const endIndex = milestones.findIndex((candidate, index) => {
      if (index === startIndex || claimedEnds.has(index) || candidate.superseded) return false
      if (candidate.kind !== 'event' || !endWords.test(candidate.label)) return false
      const endDate = calendarDay(candidate.date)
      const duration = dayNumber(endDate) - dayNumber(startDate)
      return periodKey(candidate.label) === key && duration >= 1 && duration <= 120
    })
    if (endIndex < 0) return
    claimedEnds.add(endIndex)
    result.push({
      id: `${safePart(opportunityId)}-${safePart(key)}-${startDate}`,
      startIndex,
      endIndex,
      startDate,
      endDate: calendarDay(milestones[endIndex]!.date),
      display: 'span',
    })
  })
  return result
}

export const DEFAULT_CALENDAR_SELECTIONS: CalendarOpportunitySelection[] = [
  'catalog:fort-worth-regional-science-fair',
  'catalog:txsef',
  'isef-2027:main',
  'catalog:hosa-medical-innovation-2026-27',
  'catalog:conrad-challenge',
  'catalog:jshs',
  'catalog:texas-jshs',
  'davidson-fellows-2027:main',
  'catalog:rsi',
  'catalog:mit-bwsi-2027',
  'catalog:mites-summer',
  'catalog:clark-scholars-2026',
  'catalog:promys',
  'catalog:iowa-sstp-2027',
  'catalog:stanford-simr',
  'catalog:navy-seap-2027',
  'catalog:bu-rise',
  'catalog:cmu-ai-scholars-2027',
].map((opportunityId, index) => ({
  opportunityId,
  enabled: true,
  includeDeadlines: true,
  includeEvents: true,
  priority: 100 - index,
}))

export function projectOpportunityCalendar(
  opportunities: Opportunity[],
  selections: CalendarOpportunitySelection[],
  options: { savedIds?: string[] } = {},
): CalendarOpportunityEntry[] {
  const byId = new Map(opportunities.filter((item) => item.published).map((item) => [item.id, item]))
  const savedIds = new Set(options.savedIds || [])

  return selections
    .filter((selection) => selection.enabled)
    .flatMap((selection) => {
      const opportunity = byId.get(selection.opportunityId)
      if (!opportunity) return []
      const periods = qualifyOpportunityPeriods(opportunity.id, opportunity.milestones)
      const periodByStart = new Map(periods.map((period) => [period.startIndex, period]))
      const hiddenEnds = new Set(
        periods.flatMap((period) =>
          period.display === 'span' && period.endIndex !== undefined ? [period.endIndex] : [],
        ),
      )
      return (opportunity.milestones || []).flatMap((milestone, index) => {
        if (milestone.superseded) return []
        if (hiddenEnds.has(index)) return []
        if (milestone.kind === 'deadline' && !selection.includeDeadlines) return []
        if (milestone.kind === 'event' && !selection.includeEvents) return []
        if (milestone.kind !== 'deadline' && milestone.kind !== 'event') return []
        const date = calendarDay(milestone.date)
        if (!validDay(date)) return []
        const period = periodByStart.get(index)
        const base = {
            id: `${safePart(opportunity.id)}-${safePart(milestone.label)}-${date}-${index}`,
            opportunityId: opportunity.id,
            ...(opportunity.slug ? { opportunitySlug: opportunity.slug } : {}),
            opportunityTitle: opportunity.title,
            milestoneTitle: milestone.label,
            summary: opportunity.description,
            date,
            timezone: milestone.timezone,
            originalTimezone: milestone.originalTimezone,
            precision: milestone.precision || (milestone.date.length === 10 ? 'date-only' : 'exact'),
            location: opportunity.location,
            kind: milestone.kind,
            state: milestone.tentative ? 'tentative' : 'confirmed',
            requirements: opportunity.prerequisites || [],
            contributionFormat: opportunity.contributionFormat,
            officialUrl: milestone.url || opportunity.url,
            submissionUrl: opportunity.submissionUrl,
            detailUrl: opportunity.slug ? `/opportunities/${opportunity.slug}` : undefined,
            evidence: milestone.evidence,
            conflict: milestone.conflict,
            verifiedAt:
              opportunity.monitoring?.lastSuccessAt || opportunity.verifiedAt,
            priority: selection.priority,
            saved: savedIds.has(opportunity.id),
            ...(period
              ? {
                  period: {
                    id: period.id,
                    startDate: period.startDate,
                    endDate: period.endDate,
                    display: period.display,
                  },
                }
              : {}),
          } satisfies CalendarOpportunityEntry
        if (period?.display === 'endpoints' && !period.endIndex) {
          return [
            base,
            {
              ...base,
              id: `${base.id}-end`,
              milestoneTitle: `${milestone.label} ends`,
              date: period.endDate,
              period: undefined,
            },
          ]
        }
        return [base]
      })
    })
    .sort((a, b) => a.date.localeCompare(b.date) || b.priority - a.priority || a.id.localeCompare(b.id))
}
