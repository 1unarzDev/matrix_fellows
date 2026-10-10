import { describe, expect, it } from 'vitest'
import {
  nextOpportunityMilestone,
  opportunityCostEntries,
  opportunityPortalLabel,
} from '../../shared/utils/opportunity-presentation'
import type { Opportunity } from '../../shared/types/content'

const item = (patch: Partial<Opportunity>) => ({ kind: 'Competition', ...patch }) as Opportunity
describe('opportunity-specific cost presentation', () => {
  it('retains an ongoing range as the next milestone and ignores superseded dates', () => {
    const points = [
      {
        date: '2026-10-01',
        endDate: '2026-10-05',
        label: 'Program',
        kind: 'event',
        timezone: null,
        url: 'https://example.org',
        evidence: '',
      },
    ] as const
    expect(nextOpportunityMilestone([...points], Date.parse('2026-10-03'))?.label).toBe('Program')
    expect(nextOpportunityMilestone([...points], Date.parse('2026-10-06'))).toBeUndefined()
    expect(
      nextOpportunityMilestone([{ ...points[0], superseded: true }], Date.parse('2026-10-03')),
    ).toBeUndefined()
  })
  it('labels closed-cycle links as information without removing the official portal', () => {
    expect(
      opportunityPortalLabel(
        item({ kind: 'Program', lifecycle: 'awaiting-announcement' }),
        Date.now(),
      ),
    ).toBe('Application information ↗')
    expect(
      opportunityPortalLabel(item({ kind: 'Internship', lifecycle: 'announced' }), Date.now()),
    ).toBe('Application portal ↗')
    const milestones = [
      {
        date: '2026-01-01',
        label: 'Apply',
        kind: 'deadline',
        timezone: null,
        url: 'https://example.org',
        evidence: '',
      },
    ] as const
    expect(
      opportunityPortalLabel(
        item({ kind: 'Internship', milestones: [...milestones] }),
        Date.parse('2026-10-03'),
      ),
    ).toBe('Application information ↗')
  })
  it('omits absent and placeholder costs instead of manufacturing unknown rows', () => {
    expect(opportunityCostEntries(item({}))).toEqual([])
    expect(
      opportunityCostEntries(
        item({
          costs: {
            publication: 'Not applicable',
            travel: 'Unknown',
            materials: 'Not stated in reviewed sources',
          },
        }),
      ),
    ).toEqual([])
  })
  it('keeps explicitly unannounced fees visible without implying free participation', () => {
    const rows = opportunityCostEntries(
      item({
        costs: {
          registration: 'Registration fee applies; 2027 amount not yet announced.',
          submission: 'No submission fee.',
          publication: null,
        },
      }),
    )
    expect(rows.map((row) => row.key)).toEqual(['submission', 'registration'])
    expect(rows[1]!.value).toContain('not yet announced')
  })
  it('merges identical registration/submission facts but retains distinct obligations', () => {
    const rows = opportunityCostEntries(
      item({
        costs: {
          registration: '$25 per team',
          submission: '$25 per team',
          travel: 'Travel is not covered.',
        },
        fieldEvidence: ['submission', 'registration'].map((key) => ({
          field: `costs.${key}`,
          url: 'https://example.org/fees',
          quote: 'Entry and registration are one $25 fee per team.',
          observedAt: '2026-10-03',
        })),
      }),
    )
    expect(rows.map((row) => row.label)).toEqual(['Entry / registration', 'Travel & lodging'])
    expect(
      opportunityCostEntries(item({ costs: { registration: '$25', submission: '$25' } })),
    ).toHaveLength(2)
  })
  it('retains meaningful stipend, aid, and publication facts only when supplied', () => {
    expect(
      opportunityCostEntries(
        item({
          kind: 'Internship',
          costs: {
            compensation: 'Paid; amount not published.',
            program: 'No program fee.',
            aid: 'Housing assistance available.',
          },
        }),
      ).map((row) => row.key),
    ).toEqual(['program', 'compensation', 'aid'])
  })
})
