import { expect, it } from 'vitest'
import { groupOpportunityPathways } from '../../shared/utils/opportunity-pathways'
import { defaultOpportunities } from '../../shared/data/defaults'
import { getTimeline, nextTimelineIndex } from '../../shared/utils/opportunity-lifecycle'
const base = {
  ...defaultOpportunities[0]!,
  published: true,
  deadline: null,
  eventDate: null,
  milestones: [],
  verifiedAt: '2026-09-07',
}
it('combines fair checkpoints without losing provenance or next local deadline', () => {
  const input = [
    {
      ...base,
      id: 'isef-2027:main',
      eventDate: '2027-05-08',
      url: 'https://societyforscience.org/',
    },
    { ...base, id: 'catalog:txsef', eventDate: '2027-04-02', url: 'https://txsef.tamu.edu/' },
    {
      ...base,
      id: 'catalog:fort-worth-regional-science-fair',
      deadline: '2027-01-21',
      url: 'https://fwrsef.org/',
    },
  ]
  const result = groupOpportunityPathways(input)
  expect(result).toHaveLength(1)
  const points = getTimeline(result[0]!)
  expect(points.map((point) => point.label.split(' · ')[0])).toEqual(['FWRSEF', 'TXSEF', 'ISEF'])
  expect(points[nextTimelineIndex(points, Date.parse('2026-09-07'))]?.url).toBe(
    'https://fwrsef.org/',
  )
  expect(input[0]!.title).toBe(base.title)
})
it('does not resurrect unpublished fairs and surfaces any source failure', () => {
  const result = groupOpportunityPathways([
    { ...base, id: 'catalog:txsef', published: false },
    {
      ...base,
      id: 'catalog:fort-worth-regional-science-fair',
      monitoring: { lastSuccessAt: null, lastCheckedAt: null, issue: true },
    },
    { ...base, id: 'isef-2027:main' },
    { ...base, id: 'unrelated' },
  ])
  expect(result).toHaveLength(2)
  expect(result.find((item) => item.id === 'pathway:martin-isef')?.monitoring).toMatchObject({
    issue: true,
    lastSuccessAt: null,
  })
})
