import { describe, expect, it } from 'vitest'
import { internshipAdditions } from '../../shared/data/internship-additions'
import { enrichInternship } from '../../shared/data/internship-catalog'
import { catalogSeeds, approvedSource } from '../../workers/catalog'
import { opportunitySchema } from '../../shared/utils/validation'
import {
  projectOpportunityCalendar,
  DEFAULT_CALENDAR_SELECTIONS,
} from '../../shared/utils/calendar'

describe('reviewed internship catalog', () => {
  it('validates additions and preserves one identity per existing placement', () => {
    internshipAdditions.forEach((item) =>
      expect(opportunitySchema.safeParse(item).success).toBe(true),
    )
    const ids = catalogSeeds.map((seed) => seed.item.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of [
      'catalog:navy-seap-2027',
      'catalog:gmu-assip-2026',
      'catalog:bu-rise',
      'catalog:nasa-sees',
      'catalog:stanford-simr',
      'catalog:md-anderson-king-summer-2026',
    ]) {
      const item = catalogSeeds.find((seed) => seed.item.id === id)!.item
      expect(item.internship?.texasEligibility).toBe('conditional')
      expect(enrichInternship(item)).toEqual(item)
    }
  })
  it('keeps unknown deadlines out of the calendar and conflicts as endpoints', () => {
    const entries = projectOpportunityCalendar(internshipAdditions, DEFAULT_CALENDAR_SELECTIONS)
    expect(entries.filter((entry) => entry.opportunityTitle.includes('Stripe'))).toEqual([])
    const methodist = entries.filter((entry) =>
      entry.opportunityTitle.includes('Houston Methodist'),
    )
    expect(methodist.filter((entry) => entry.kind === 'event').map((entry) => entry.date)).toEqual([
      '2027-06-07',
      '2027-08-06',
    ])
    expect(methodist[0]?.requirements.length).toBe(4)
    expect(methodist[0]?.internshipAccess).toContain('Texas')
  })
  it('does not permit unrelated jobs within newly approved employer domains', () => {
    expect(approvedSource(internshipAdditions[0]!.url)).toBe(true)
    expect(approvedSource('https://stripe.com/jobs/listing/graduate-role/123')).toBe(false)
    expect(approvedSource('https://stripe.com.evil.example/jobs/')).toBe(false)
  })
})
