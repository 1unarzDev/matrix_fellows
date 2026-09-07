import { expect, it } from 'vitest'
import { defaultOpportunities } from '../../shared/data/defaults'
import {
  getOpportunityState,
  getTimeline,
  nextTimelineIndex,
} from '../../shared/utils/opportunity-lifecycle'
const now = Date.parse('2026-09-07T12:00:00Z')
const base = {
  ...defaultOpportunities[0]!,
  verifiedAt: '2026-09-07',
  deadline: null,
  eventDate: null,
}
it('shows rolling publications without fabricated future checkpoints', () => {
  expect(getOpportunityState({ ...base, lifecycle: 'rolling' }, now)).toMatchObject({
    key: 'rolling',
    label: 'Rolling submissions',
  })
})
it('does not highlight superseded upcoming dates', () => {
  const item = {
    ...base,
    milestones: [
      {
        label: 'Old deadline',
        date: '2026-09-10',
        kind: 'deadline' as const,
        timezone: null,
        url: base.url,
        evidence: 'Original date',
        superseded: true,
      },
      {
        label: 'New deadline',
        date: '2026-09-20',
        kind: 'deadline' as const,
        timezone: null,
        url: base.url,
        evidence: 'New date',
      },
    ],
  }
  expect(nextTimelineIndex(getTimeline(item), now)).toBe(1)
  expect(getOpportunityState(item, now).key).toBe('upcoming')
})
it('does not treat an unreachable page as discontinuation', () => {
  expect(
    getOpportunityState(
      {
        ...base,
        monitoring: { lastCheckedAt: '2026-09-07', lastSuccessAt: '2026-09-01', issue: true },
      },
      now,
    ),
  ).toMatchObject({ key: 'unknown', stale: true })
})
it('keeps unannounced cycles discoverable and marks old confirmations stale', () => {
  expect(
    getOpportunityState(
      { ...base, lifecycle: 'awaiting-announcement', verifiedAt: '2026-09-01' },
      now,
    ),
  ).toMatchObject({ key: 'awaiting', stale: true })
})
it('updates completed status from the clock without an import', () => {
  expect(getOpportunityState({ ...base, deadline: '2026-09-06' }, now).key).toBe('completed')
})
