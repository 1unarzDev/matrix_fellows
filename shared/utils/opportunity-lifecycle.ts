import type { Opportunity, OpportunityMilestone } from '../types/content'
import { deadlineTimestamp } from './opportunities'

export function getTimeline(item: Opportunity): OpportunityMilestone[] {
  const points = [...(item.milestones || [])]
  for (const [kind, date] of [
    ['deadline', item.deadline],
    ['event', item.eventDate],
  ] as const) {
    if (date && !points.some((p) => p.date === date && p.kind === kind))
      points.push({
        label: kind === 'deadline' ? 'Submission deadline' : 'Event begins',
        date,
        kind,
        timezone: item.timezone,
        url: item.url,
        evidence: '',
      })
  }
  return [...new Map(points.map((p) => [`${p.date}:${p.kind}:${p.label}`, p])).values()].sort(
    (a, b) => deadlineTimestamp(a.date) - deadlineTimestamp(b.date),
  )
}
export function nextTimelineIndex(points: OpportunityMilestone[], now: number): number {
  const index = points.findIndex((p) => !p.superseded && deadlineTimestamp(p.date) >= now)
  return index < 0 ? Math.max(0, points.length - 1) : index
}
export function getOpportunityState(item: Opportunity, now: number) {
  const checked = item.monitoring ? item.monitoring.lastSuccessAt : item.verifiedAt
  const stale =
    !checked || now - Date.parse(checked) > 72 * 3600000 || Boolean(item.monitoring?.issue)
  const points = getTimeline(item)
  const base =
    item.lifecycle === 'discontinued'
      ? { key: 'discontinued', label: 'Discontinued' }
      : item.lifecycle === 'replaced'
        ? { key: 'changed', label: 'Program changed' }
        : item.lifecycle === 'rolling'
          ? { key: 'rolling', label: 'Rolling submissions' }
          : points.some((p) => !p.superseded && deadlineTimestamp(p.date) >= now)
            ? { key: 'upcoming', label: 'Upcoming checkpoints' }
            : item.lifecycle === 'awaiting-announcement'
              ? { key: 'awaiting', label: 'Awaiting announcement' }
              : points.length
                ? { key: 'completed', label: 'Latest cycle completed' }
                : {
                    key: 'unknown',
                    label:
                      item.kind === 'Publication'
                        ? 'Check submission guidance'
                        : 'Dates not confirmed',
                  }
  return { ...base, stale }
}
