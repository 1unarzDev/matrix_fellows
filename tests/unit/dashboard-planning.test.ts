import { expect, it } from 'vitest'
import {
  taskInputSchema,
  pursueSchema,
  planDateSchema,
  pursuitPatchSchema,
  planCalendar,
  planWorkload,
} from '../../shared/utils/dashboard-planning'
import type { DashboardPlan, PlanTask, PlanDate, PlanPursuit } from '../../shared/types/dashboard'
it('accepts the catalog text identity rather than requiring a fabricated UUID', () => {
  expect(
    pursueSchema.safeParse({
      opportunityId: 'catalog:stars-summer-research',
      cycleId: '2027',
      title: 'STARS',
      eligibility: 'unknown',
      acknowledgedUncertainty: true,
      reviewedTasks: [],
    }).success,
  ).toBe(true)
})
const task: PlanTask = {
  id: 'task-1',
  title: 'Résumé, review',
  notes: '',
  pursuitId: null,
  activityId: null,
  status: 'todo',
  dueDate: '2026-11-01',
  scheduledStart: '2026-10-08T12:00:00Z',
  scheduledEnd: '2026-10-08T14:00:00Z',
  estimatedHours: 2,
  dependsOn: [],
  version: 1,
  createdAt: '2026-10-07T00:00:00Z',
  updatedAt: '2026-10-07T00:00:00Z',
}
const plan: DashboardPlan = {
  tasks: [task],
  events: [],
  pursuits: [],
  activities: [],
  capacityHours: 6,
}
it('rejects invalid date-only and incomplete scheduled sessions', () => {
  expect(taskInputSchema.safeParse({ title: 'Review', dueDate: '2026-02-30' }).success).toBe(false)
  expect(
    taskInputSchema.safeParse({ title: 'Review', scheduledStart: '2026-10-08T12:00:00Z' }).success,
  ).toBe(false)
  expect(taskInputSchema.safeParse({ title: 'Review', dueDate: '2026-11-01' }).success).toBe(true)
})
it('requires eligibility acknowledgement and explicit external submission confirmation', () => {
  const input = {
    opportunityId: '11111111-1111-4111-8111-111111111111',
    cycleId: '2027',
    title: 'STARS',
    reviewedTasks: [],
  }
  expect(
    pursueSchema.safeParse({ ...input, eligibility: 'excluded', acknowledgedUncertainty: true })
      .success,
  ).toBe(false)
  expect(pursueSchema.safeParse({ ...input, eligibility: 'unknown' }).success).toBe(false)
  expect(
    pursueSchema.safeParse({ ...input, eligibility: 'unknown', acknowledgedUncertainty: true })
      .success,
  ).toBe(true)
  expect(pursuitPatchSchema.safeParse({ expectedVersion: 1, status: 'submitted' }).success).toBe(
    false,
  )
  expect(
    pursuitPatchSchema.safeParse({
      expectedVersion: 1,
      status: 'submitted',
      confirmedSubmission: true,
    }).success,
  ).toBe(true)
})
it('does not invent a precise midnight cutoff from an imprecise source', () => {
  const d = {
    type: 'application_cutoff',
    wording: 'November',
    precision: 'month',
    localDate: '2026-11',
    timezone: null,
    instant: null,
    sourceUrl: 'https://example.edu',
    conflict: null,
  }
  expect(planDateSchema.safeParse(d).success).toBe(true)
  expect(planDateSchema.safeParse({ ...d, instant: '2026-11-01T00:00:00Z' }).success).toBe(false)
})
it('preserves DST and AoE and rejects fabricated timezone precision', () => {
  const d = {
    type: 'application_cutoff',
    wording: 'Nov 1',
    precision: 'instant',
    localDate: '2026-11-01',
    timezone: 'America/Chicago',
    instant: '2026-11-02T05:59:00Z',
    sourceUrl: 'https://example.edu',
    conflict: null,
  }
  expect(planDateSchema.safeParse(d).success).toBe(true)
  expect(planDateSchema.safeParse({ ...d, timezone: 'guess/zone' }).success).toBe(false)
  expect(planDateSchema.safeParse({ ...d, instant: '2026-11-03T05:59:00Z' }).success).toBe(false)
  expect(
    planDateSchema.safeParse({ ...d, timezone: 'AoE', instant: '2026-11-02T11:59:00Z' }).success,
  ).toBe(true)
})
it('counts allocations once and keeps unscheduled estimates and unknowns separate', () => {
  const p = {
    ...plan,
    tasks: [
      task,
      { ...task, id: '2', estimatedHours: null, scheduledStart: null, scheduledEnd: null },
      { ...task, id: '3', estimatedHours: 3, scheduledStart: null, scheduledEnd: null },
    ],
    events: [
      {
        id: 'e',
        taskId: task.id,
        title: 'same allocation',
        type: 'work_session' as const,
        start: task.scheduledStart!,
        end: task.scheduledEnd!,
        version: 1,
      },
    ],
  }
  expect(planWorkload(p, '2026-10-08T00:00:00Z', '2026-10-09T00:00:00Z')).toEqual({
    scheduledHours: 2,
    unscheduledHours: 3,
    unknownEstimates: 1,
    capacityHours: 6,
  })
})
it('exports stable independent work-session and date-only target IDs without login providers', () => {
  const ics = planCalendar(plan, '2026-10-07T12:00:00Z')
  expect(ics).toContain('UID:task-session-task-1@matrixfellows.com')
  expect(ics).toContain('DTSTART;VALUE=DATE:20261101')
  expect(ics).toContain('Résumé\\, review')
  expect(ics).not.toContain('DTSTART:20261101T235900')
  expect(planCalendar(plan, '2026-10-07T12:00:00Z')).toBe(ics)
})
it('keeps distinct same-type facts on the same page, with order-independent legacy identities', () => {
  const first: PlanDate = {
    type: 'application_cutoff',
    wording: 'Round one',
    precision: 'date',
    localDate: '2027-01-15',
    timezone: null,
    instant: null,
    sourceUrl: 'https://example.edu/call',
    conflict: null,
  }
  const second: PlanDate = { ...first, wording: 'Round two', localDate: '2027-03-15' }
  const pursuit: PlanPursuit = {
    id: 'p',
    opportunityId: 'catalog:program',
    cycleId: '2027',
    title: 'Program',
    status: 'preparing',
    outcome: 'pending',
    eligibility: 'unknown',
    officialDates: [first, second],
    submissionReceipt: '',
    version: 1,
    createdAt: '2026-10-07T00:00:00Z',
    updatedAt: '2026-10-07T00:00:00Z',
  }
  const uids = (p: PlanPursuit) =>
    planCalendar({ ...plan, tasks: [], pursuits: [p] }, '2026-10-07T00:00:00Z')
      .split('\r\n')
      .filter((line) => line.startsWith('UID:'))
      .sort()
  const before = uids(pursuit)
  expect(before).toHaveLength(2)
  expect(new Set(before).size).toBe(2)
  expect(uids({ ...pursuit, officialDates: [second, first] })).toEqual(before)
  expect(planDateSchema.safeParse(first).success).toBe(true)
  expect(uids({ ...pursuit, officialDates: [first, first] })).toHaveLength(1)
})
it('explicit source fact IDs preserve calendar identity across date revisions', () => {
  const fact: PlanDate = {
    type: 'application_cutoff',
    wording: 'Round one',
    precision: 'date',
    localDate: '2027-01-15',
    timezone: null,
    instant: null,
    sourceUrl: 'https://example.edu/call',
    sourceFactId: 'program:2027:round-one:cutoff',
    conflict: null,
  }
  const pursuit: PlanPursuit = {
    id: 'p',
    opportunityId: 'catalog:program',
    cycleId: '2027',
    title: 'Program',
    status: 'preparing',
    outcome: 'pending',
    eligibility: 'unknown',
    officialDates: [fact],
    submissionReceipt: '',
    version: 1,
    createdAt: '2026-10-07T00:00:00Z',
    updatedAt: '2026-10-07T00:00:00Z',
  }
  const uid = (d: PlanDate) =>
    planCalendar(
      { ...plan, tasks: [], pursuits: [{ ...pursuit, officialDates: [d] }] },
      '2026-10-07T00:00:00Z',
    )
      .split('\r\n')
      .find((line) => line.startsWith('UID:'))
  expect(uid({ ...fact, localDate: '2027-02-15', wording: 'Round one extended' })).toBe(uid(fact))
  expect(planDateSchema.parse(fact).sourceFactId).toBe(fact.sourceFactId)
})
