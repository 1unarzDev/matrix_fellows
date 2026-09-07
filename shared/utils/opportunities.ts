import type { Opportunity } from '../types/content'

export function deadlineTimestamp(end: string): number {
  // Date-only records remain visible through that calendar day in UTC.
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(end) ? `${end}T23:59:59.999Z` : end
  return new Date(timestamp).getTime()
}

export function isUpcoming(item: Opportunity, now = new Date()): boolean {
  const end = item.deadline || item.eventDate
  return !end || deadlineTimestamp(end) >= now.getTime()
}

export function sortOpportunities(items: Opportunity[]): Opportunity[] {
  const us = (item: Opportunity) => Number(/United States|\bUSA?\b|\bU\.S\./i.test(item.location))
  return [...items].sort(
    (a, b) => b.priority - a.priority || us(b) - us(a) || a.title.localeCompare(b.title),
  )
}

export function displayDate(value: string | null, timezone = 'UTC'): string {
  if (!value) return 'Check official dates'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : timezone,
  }).format(date)
}
