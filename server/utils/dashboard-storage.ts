import { createError } from 'h3'
import type {
  DashboardPlan,
  PlanActivity,
  PlanEvent,
  PlanPursuit,
  PlanTask,
} from '#shared/types/dashboard'
import { workspaceResult, workspaceStorage } from './workspace-storage'
export function pursuitFromRow(r: any): PlanPursuit {
  return {
    id: r.id,
    opportunityId: r.opportunity_id,
    cycleId: r.cycle_id,
    title: r.title,
    status: r.status,
    outcome: r.outcome,
    eligibility: r.eligibility,
    officialDates: r.official_dates,
    submissionReceipt: r.submission_receipt,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
export function taskFromRow(r: any): PlanTask {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    opportunityId: r.opportunity_id || null,
    milestoneKey: r.milestone_key || null,
    pursuitId: r.pursuit_id,
    activityId: r.activity_id,
    status: r.status,
    dueDate: r.due_date,
    scheduledStart: r.scheduled_start,
    scheduledEnd: r.scheduled_end,
    estimatedHours: r.estimated_hours === null ? null : Number(r.estimated_hours),
    dependsOn: r.depends_on,
    legacyContext: r.legacy_context || null,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
export function activityFromRow(r: any): PlanActivity {
  return {
    id: r.id,
    title: r.title,
    goal: r.goal,
    role: r.role,
    milestone: r.milestone,
    status: r.status,
    contributions: r.contributions,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
export function eventFromRow(r: any): PlanEvent {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    start: r.starts_at,
    end: r.ends_at,
    taskId: r.task_id,
    version: r.version,
  }
}
export async function readDashboardPlan(
  db: ReturnType<typeof workspaceStorage>,
  userId: string,
): Promise<DashboardPlan> {
  const [p, a, t, e, s] = await Promise.all(
    [
      'dashboard_pursuits',
      'dashboard_activities',
      'dashboard_tasks',
      'dashboard_events',
      'dashboard_settings',
    ].map((table) => db.from(table).select('*').eq('user_id', userId)),
  )
  const settings = workspaceResult(s!)[0]
  return {
    pursuits: workspaceResult(p!).map(pursuitFromRow),
    activities: workspaceResult(a!).map(activityFromRow),
    tasks: workspaceResult(t!).map(taskFromRow),
    events: workspaceResult(e!).map(eventFromRow),
    capacityHours: settings?.capacity_hours == null ? null : Number(settings.capacity_hours),
  }
}
export async function planVersionUpdate(
  db: ReturnType<typeof workspaceStorage>,
  table: string,
  userId: string,
  id: string,
  expectedVersion: number,
  value: Record<string, unknown>,
) {
  const result = await db
    .from(table)
    .update({ ...value, version: expectedVersion + 1, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('version', expectedVersion)
    .select()
    .maybeSingle()
  const row = workspaceResult(result)
  if (!row)
    throw createError({
      statusCode: 409,
      statusMessage:
        'This record changed elsewhere. Reload it before saving; your edits are still available.',
    })
  return row
}
