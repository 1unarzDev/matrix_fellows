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
): CalendarOpportunityEntry[] {
  const byId = new Map(opportunities.filter((item) => item.published).map((item) => [item.id, item]))

  return selections
    .filter((selection) => selection.enabled)
    .flatMap((selection) => {
      const opportunity = byId.get(selection.opportunityId)
      if (!opportunity) return []
      return (opportunity.milestones || []).flatMap((milestone, index) => {
        if (milestone.superseded) return []
        if (milestone.kind === 'deadline' && !selection.includeDeadlines) return []
        if (milestone.kind === 'event' && !selection.includeEvents) return []
        if (milestone.kind !== 'deadline' && milestone.kind !== 'event') return []
        const date = milestone.date.slice(0, 10)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
        return [
          {
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
          } satisfies CalendarOpportunityEntry,
        ]
      })
    })
    .sort((a, b) => a.date.localeCompare(b.date) || b.priority - a.priority || a.id.localeCompare(b.id))
}
