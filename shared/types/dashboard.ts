/** Private, application-owned planning records. Published facts never move with tasks. */
export interface PlanDate {
  type:
    | 'application_open'
    | 'application_cutoff'
    | 'abstract_cutoff'
    | 'paper_cutoff'
    | 'registration_cutoff'
    | 'notification'
    | 'program_start'
    | 'program_end'
  wording: string
  precision: 'instant' | 'date' | 'month' | 'approximate' | 'unknown'
  localDate: string | null
  timezone: string | null
  instant: string | null
  sourceUrl: string
  /** Stable identity assigned by source extraction; not the current date value. */
  sourceFactId?: string
  conflict: string | null
}
export type EligibilityState = 'eligible' | 'excluded' | 'unknown' | 'conflict'
export interface PlanPursuit {
  id: string
  opportunityId: string
  cycleId: string
  title: string
  status: 'preparing' | 'waiting' | 'ready' | 'submitted' | 'outcome'
  outcome: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'waitlisted'
  eligibility: EligibilityState
  officialDates: PlanDate[]
  submissionReceipt: string
  version: number
  createdAt: string
  updatedAt: string
}
export interface PlanTask {
  id: string
  title: string
  notes: string
  pursuitId: string | null
  activityId: string | null
  status: 'todo' | 'doing' | 'done'
  dueDate: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  estimatedHours: number | null
  dependsOn: string[]
  version: number
  createdAt: string
  updatedAt: string
  legacyContext?: {
    itemId: string
    dueAt: string | null
    targetId: string | null
    profileId: string | null
    opportunityId: string | null
  } | null
}
export interface PlanContribution {
  id: string
  description: string
  learned: string
  artifactUrl: string | null
  createdAt: string
}
export interface PlanActivity {
  id: string
  title: string
  goal: string
  role: string
  milestone: string
  status: 'active' | 'paused' | 'completed'
  contributions: PlanContribution[]
  version: number
  createdAt: string
  updatedAt: string
}
export interface PlanEvent {
  id: string
  title: string
  type: 'appointment' | 'work_session' | 'program'
  start: string
  end: string
  taskId: string | null
  version: number
}
export interface DashboardPlan {
  pursuits: PlanPursuit[]
  activities: PlanActivity[]
  tasks: PlanTask[]
  events: PlanEvent[]
  capacityHours: number | null
}
