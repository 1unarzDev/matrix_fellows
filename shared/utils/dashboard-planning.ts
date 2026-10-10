import { z } from 'zod'
import type { DashboardPlan, PlanTask } from '../types/dashboard'

const text = z.string().trim().min(1).max(240)
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`)
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v
  }, 'Choose a valid date.')
  .nullable()
const instant = z.iso.datetime({ offset: true }).nullable()
const safeUrl = z
  .url()
  .max(2000)
  .refine((v) => /^https?:\/\//i.test(v))
export function publishedTimezone(value: string) {
  const zone = value === 'AoE' ? 'Etc/GMT+12' : value
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format()
    return zone
  } catch {
    return null
  }
}
export const planDateSchema = z
  .object({
    type: z.enum([
      'application_open',
      'application_cutoff',
      'abstract_cutoff',
      'paper_cutoff',
      'registration_cutoff',
      'notification',
      'program_start',
      'program_end',
    ]),
    wording: z.string().max(500),
    precision: z.enum(['instant', 'date', 'month', 'approximate', 'unknown']),
    localDate: z.string().max(30).nullable(),
    timezone: z.string().max(100).nullable(),
    instant,
    sourceUrl: safeUrl,
    sourceFactId: z.string().trim().min(1).max(240).optional(),
    conflict: z.string().max(500).nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.precision !== 'instant' && v.instant)
      ctx.addIssue({
        code: 'custom',
        message: 'An imprecise date cannot have an invented instant.',
      })
    if (v.precision === 'instant' && (!v.instant || !v.timezone))
      ctx.addIssue({
        code: 'custom',
        message: 'A precise cutoff needs its published timezone and instant.',
      })
    if (v.precision === 'date' && !dateOnly.safeParse(v.localDate).success)
      ctx.addIssue({ code: 'custom', message: 'A date-only fact needs a valid date.' })
    if (v.precision === 'date' && !v.localDate)
      ctx.addIssue({ code: 'custom', message: 'A date-only fact needs a date.' })
    if (v.precision === 'month' && (!v.localDate || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v.localDate)))
      ctx.addIssue({
        code: 'custom',
        message: 'A month-only fact needs its published year and month.',
      })
    const zone = v.timezone ? publishedTimezone(v.timezone) : null
    if (v.timezone && !zone)
      ctx.addIssue({ code: 'custom', message: 'Keep a valid published IANA timezone or AoE.' })
    if (v.precision === 'instant' && v.instant && zone && v.localDate) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date(v.instant))
      const get = (key: string) => parts.find((p) => p.type === key)?.value
      if (v.localDate !== `${get('year')}-${get('month')}-${get('day')}`)
        ctx.addIssue({
          code: 'custom',
          message: 'The derived instant conflicts with the published local date.',
        })
    }
  })
export const taskInputSchema = z
  .object({
    title: text,
    notes: z.string().max(10000).default(''),
    status: z.enum(['todo', 'doing', 'done']).default('todo'),
    dueDate: dateOnly.default(null),
    scheduledStart: instant.default(null),
    scheduledEnd: instant.default(null),
    estimatedHours: z.number().min(0).max(500).nullable().default(null),
    dependsOn: z.array(z.string().uuid()).max(50).default([]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      !!v.scheduledStart !== !!v.scheduledEnd ||
      (v.scheduledStart &&
        v.scheduledEnd &&
        Date.parse(v.scheduledEnd) <= Date.parse(v.scheduledStart))
    )
      ctx.addIssue({ code: 'custom', message: 'A work session needs a start and a later end.' })
  })
export const pursueSchema = z
  .object({
    opportunityId: z.string().regex(/^[a-z0-9][a-z0-9:_-]{0,199}$/),
    cycleId: z.string().trim().min(1).max(160),
    title: text,
    eligibility: z.enum(['eligible', 'excluded', 'unknown', 'conflict']),
    officialDates: z.array(planDateSchema).max(30).default([]),
    reviewedTasks: z.array(taskInputSchema).max(50),
    acknowledgedUncertainty: z.boolean().default(false),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.eligibility === 'excluded')
      ctx.addIssue({
        code: 'custom',
        message: 'An excluded opportunity cannot become an active application.',
      })
    if (v.eligibility !== 'eligible' && !v.acknowledgedUncertainty)
      ctx.addIssue({
        code: 'custom',
        message: 'Review the unresolved eligibility before pursuing.',
      })
    if (v.reviewedTasks.some((t) => t.dependsOn.length))
      ctx.addIssue({
        code: 'custom',
        message: 'Add dependencies after the reviewed tasks have been created.',
      })
  })
export const activityInputSchema = z
  .object({
    title: text,
    goal: z.string().max(5000).default(''),
    role: z.string().max(1000).default(''),
    milestone: z.string().max(1000).default(''),
    status: z.enum(['active', 'paused', 'completed']).default('active'),
  })
  .strict()
export const contributionSchema = z
  .object({
    description: z.string().trim().min(1).max(5000),
    learned: z.string().max(5000).default(''),
    artifactUrl: safeUrl.nullable().default(null),
    expectedVersion: z.number().int().positive(),
  })
  .strict()
export const eventInputSchema = z
  .object({
    title: text,
    type: z.enum(['appointment', 'work_session', 'program']),
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
    taskId: z.string().uuid().nullable().default(null),
  })
  .strict()
  .refine((v) => Date.parse(v.end) > Date.parse(v.start), 'Choose an end after the start.')
  .refine(
    (v) => v.taskId === null,
    'Schedule task work in the task editor, not as a duplicate event.',
  )
export const taskPatchSchema = z
  .object({ expectedVersion: z.number().int().positive(), task: taskInputSchema })
  .strict()
export const pursuitPatchSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    status: z.enum(['preparing', 'waiting', 'ready', 'submitted', 'outcome']),
    outcome: z
      .enum(['pending', 'accepted', 'declined', 'withdrawn', 'waitlisted'])
      .default('pending'),
    submissionReceipt: z.string().max(2000).default(''),
    confirmedSubmission: z.boolean().default(false),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.status === 'submitted' && !v.confirmedSubmission)
      ctx.addIssue({
        code: 'custom',
        message: 'Confirm that you submitted the external application yourself.',
      })
  })

/** Count canonical allocations once. Unknown estimates remain unknown, not zero. */
export function planWorkload(plan: DashboardPlan, start: string, end: string) {
  const from = Date.parse(start),
    to = Date.parse(end)
  const sessions = new Map<string, { start: number; end: number }>()
  for (const task of plan.tasks)
    if (task.scheduledStart && task.scheduledEnd && task.status !== 'done')
      sessions.set(task.id, {
        start: Date.parse(task.scheduledStart),
        end: Date.parse(task.scheduledEnd),
      })
  let scheduledHours = 0
  for (const s of sessions.values())
    scheduledHours += Math.max(0, Math.min(to, s.end) - Math.max(from, s.start)) / 3600000
  // A linked work-session event is a view of the same allocation, never a second charge.
  for (const e of plan.events)
    if (!e.taskId)
      scheduledHours +=
        Math.max(0, Math.min(to, Date.parse(e.end)) - Math.max(from, Date.parse(e.start))) / 3600000
  const pending = plan.tasks.filter((t) => t.status !== 'done' && !t.scheduledStart)
  return {
    scheduledHours,
    unscheduledHours: pending.reduce((n, t) => n + (t.estimatedHours ?? 0), 0),
    unknownEstimates: pending.filter((t) => t.estimatedHours === null).length,
    capacityHours: plan.capacityHours,
  }
}
// Explicit source identities survive date changes and array reordering. Old
// snapshots have no ID: use their factual content rather than the array index,
// so distinct same-type facts on one page do not collapse. That legacy fallback
// remains stable when reordered, but cannot infer identity across a date edit.
const factKey = (fact: import('../types/dashboard').PlanDate) => {
  const identity = fact.sourceFactId
    ? JSON.stringify([fact.type, fact.sourceUrl, fact.sourceFactId])
    : JSON.stringify([
        fact.type,
        fact.sourceUrl,
        fact.wording,
        fact.precision,
        fact.localDate,
        fact.timezone,
        fact.instant,
      ])
  let h = 2166136261
  let h2 = 5381
  for (const ch of identity) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
    h2 = Math.imul(h2, 33) ^ ch.charCodeAt(0)
  }
  return `${(h >>> 0).toString(16)}${(h2 >>> 0).toString(16).padStart(8, '0')}`
}
const escapeICS = (v: string) =>
  v
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r', '')
const utcICS = (v: string) =>
  new Date(v)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
// Fold by UTF-8 octets; RFC5545 limits content lines to 75 octets.
function foldICS(line: string) {
  const lines: string[] = []
  let part = '',
    bytes = 0
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length
    if (bytes + size > 75) {
      lines.push(part)
      part = ' '
      bytes = 1
    }
    part += ch
    bytes += size
  }
  lines.push(part)
  return lines.join('\r\n')
}
export function planCalendar(plan: DashboardPlan, now = new Date().toISOString()) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Matrix Fellows//Member Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  const add = (
    id: string,
    title: string,
    start: string,
    end: string | null,
    allDay: boolean,
    type: string,
  ) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${id}@matrixfellows.com`,
      `DTSTAMP:${utcICS(now)}`,
      `SUMMARY:${escapeICS(title)}`,
      `CATEGORIES:${type}`,
    )
    if (allDay) lines.push(`DTSTART;VALUE=DATE:${start.replaceAll('-', '')}`)
    else {
      lines.push(`DTSTART:${utcICS(start)}`)
      if (end && Date.parse(end) > Date.parse(start)) lines.push(`DTEND:${utcICS(end)}`)
    }
    lines.push('END:VEVENT')
  }
  for (const t of plan.tasks) {
    if (t.scheduledStart && t.scheduledEnd)
      add(`task-session-${t.id}`, t.title, t.scheduledStart, t.scheduledEnd, false, 'WORK SESSION')
    if (t.dueDate)
      add(
        `task-due-${t.id}`,
        `Internal target: ${t.title}`,
        t.dueDate,
        null,
        true,
        'INTERNAL TARGET',
      )
  }
  for (const e of plan.events)
    if (!e.taskId) add(`event-${e.id}`, e.title, e.start, e.end, false, e.type.toUpperCase())
  for (const p of plan.pursuits) {
    const emittedFacts = new Set<string>()
    p.officialDates.forEach((d) => {
      if (d.conflict) return
      const key = factKey(d)
      // Identical duplicate source claims describe one occurrence, not two.
      if (emittedFacts.has(key)) return
      emittedFacts.add(key)
      if (d.precision === 'date' && d.localDate)
        add(
          `official-${p.id}-${key}`,
          `${p.title}: ${d.type.replaceAll('_', ' ')}`,
          d.localDate,
          null,
          true,
          'OFFICIAL DATE',
        )
      if (d.precision === 'instant' && d.instant)
        add(
          `official-${p.id}-${key}`,
          `${p.title}: ${d.type.replaceAll('_', ' ')}`,
          d.instant,
          d.instant,
          false,
          'OFFICIAL DATE',
        )
    })
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldICS).join('\r\n') + '\r\n'
}
export function taskToRow(
  task: Omit<PlanTask, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'pursuitId' | 'activityId'>,
) {
  return {
    title: task.title,
    notes: task.notes,
    status: task.status,
    due_date: task.dueDate,
    scheduled_start: task.scheduledStart,
    scheduled_end: task.scheduledEnd,
    estimated_hours: task.estimatedHours,
    depends_on: task.dependsOn,
  }
}
