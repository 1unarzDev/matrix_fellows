import { describe, expect, it } from 'vitest'
import { projectOpportunityCalendar } from '../../shared/utils/calendar'
import type { CalendarOpportunitySelection, Opportunity } from '../../shared/types/content'

const opportunity: Opportunity = {
  id: 'catalog:test-route', sourceId: 'test', externalId: '2027', title: 'Test Research Route',
  kind: 'Competition', discipline: 'STEM', description: 'A verified route.', eventDate: null,
  deadline: null, timezone: null, location: 'Texas', eligibility: 'High school',
  url: 'https://example.edu/route', verifiedAt: '2026-09-24T12:00:00Z', priority: 90,
  published: true, slug: 'test-route', contributionFormat: 'Research poster',
  prerequisites: ['Submit an abstract before the poster.'],
  milestones: [
    { label: 'Poster due', date: '2027-01-10T23:59:00-06:00', kind: 'deadline', timezone: 'America/Chicago', originalTimezone: '11:59 p.m. CST', precision: 'exact', evidence: 'Official call states the cutoff.', url: 'https://example.edu/call' },
    { label: 'Fair day', date: '2027-02-03', kind: 'event', timezone: null, precision: 'date-only', evidence: 'Official schedule lists fair day.', url: 'https://example.edu/schedule', tentative: true },
    { label: 'Old deadline', date: '2026-12-01', kind: 'deadline', timezone: null, evidence: 'Old.', url: 'https://example.edu/old', superseded: true },
    { label: 'Results', date: '2027-02-10', kind: 'results', timezone: null, evidence: 'Results.', url: 'https://example.edu/results' },
  ],
}
const selection: CalendarOpportunitySelection = { opportunityId: opportunity.id, enabled: true, includeDeadlines: true, includeEvents: true, priority: 98 }

describe('opportunity calendar projection', () => {
  it('preserves typed deadline/event provenance and excludes superseded/non-calendar milestones', () => {
    const entries = projectOpportunityCalendar([opportunity], [selection])
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ kind: 'deadline', date: '2027-01-10', timezone: 'America/Chicago', originalTimezone: '11:59 p.m. CST', precision: 'exact', state: 'confirmed' })
    expect(entries[1]).toMatchObject({ kind: 'event', date: '2027-02-03', precision: 'date-only', state: 'tentative' })
    expect(entries[0]?.requirements).toEqual(['Submit an abstract before the poster.'])
  })

  it('honors editorial milestone-kind and publication gates without inventing dates', () => {
    expect(projectOpportunityCalendar([opportunity], [{ ...selection, includeEvents: false }])).toHaveLength(1)
    expect(projectOpportunityCalendar([{ ...opportunity, published: false }], [selection])).toEqual([])
    expect(projectOpportunityCalendar([{ ...opportunity, milestones: [] }], [selection])).toEqual([])
  })
})
