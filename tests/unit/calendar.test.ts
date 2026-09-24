import { describe, expect, it } from 'vitest'
import { projectOpportunityCalendar, qualifyOpportunityPeriods } from '../../shared/utils/calendar'
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

  it('qualifies explicit and unambiguous continuous periods without spanning application windows', () => {
    const ranged: Opportunity = {
      ...opportunity,
      milestones: [
        {
          label: 'TXSEF begins', date: '2027-03-26', kind: 'event', timezone: null,
          evidence: 'TXSEF takes place March 26–28, 2027.', url: 'https://example.edu/txsef',
        },
        {
          label: 'TXSEF concludes', date: '2027-03-28', kind: 'event', timezone: null,
          evidence: 'TXSEF takes place March 26–28, 2027.', url: 'https://example.edu/txsef',
        },
        {
          label: 'Summer institute', date: '2027-06-20', endDate: '2027-07-30',
          rangeDisplay: 'span', kind: 'event', timezone: null,
          evidence: 'The institute runs from June 20 through July 30, 2027.',
          url: 'https://example.edu/summer',
        },
        {
          label: 'Applications open', date: '2026-10-01', kind: 'opens', timezone: null,
          evidence: 'Applications open October 1, 2026.', url: 'https://example.edu/apply',
        },
        {
          label: 'Applications due', date: '2027-01-10', kind: 'deadline', timezone: null,
          evidence: 'Applications are due January 10, 2027.', url: 'https://example.edu/apply',
        },
      ],
    }
    const periods = qualifyOpportunityPeriods(ranged.id, ranged.milestones)
    expect(periods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ startDate: '2027-03-26', endDate: '2027-03-28', display: 'span' }),
        expect.objectContaining({ startDate: '2027-06-20', endDate: '2027-07-30', display: 'span' }),
      ]),
    )
    expect(periods).toHaveLength(2)
    const entries = projectOpportunityCalendar([ranged], [selection], { savedIds: [ranged.id] })
    expect(entries.filter((entry) => entry.kind === 'event')).toHaveLength(2)
    expect(entries.filter((entry) => entry.saved)).toHaveLength(entries.length)
  })

  it('keeps ambiguous event checkpoints as independent points', () => {
    expect(
      qualifyOpportunityPeriods(opportunity.id, [
        { label: 'Orientation starts', date: '2027-05-01', kind: 'event', timezone: null, evidence: 'Orientation is May 1, 2027.', url: 'https://example.edu/a' },
        { label: 'Final showcase ends', date: '2027-06-01', kind: 'event', timezone: null, evidence: 'The showcase is June 1, 2027.', url: 'https://example.edu/b' },
      ]),
    ).toEqual([])
  })

  it('projects non-continuous verified boundaries as separate endpoints', () => {
    const endpointOpportunity: Opportunity = {
      ...opportunity,
      milestones: [{
        label: 'Required campus checkpoints', date: '2027-05-01', endDate: '2027-06-01',
        rangeDisplay: 'endpoints', kind: 'event', timezone: null,
        evidence: 'Orientation is May 1, 2027; the final showcase is June 1, 2027.',
        url: 'https://example.edu/checkpoints',
      }],
    }
    const entries = projectOpportunityCalendar([endpointOpportunity], [selection])
    expect(entries.map(({ date, period }) => ({ date, period }))).toEqual([
      { date: '2027-05-01', period: expect.objectContaining({ display: 'endpoints' }) },
      { date: '2027-06-01', period: undefined },
    ])
  })
})
