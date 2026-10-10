<script setup lang="ts">
import DashboardDialog from './DashboardDialog.vue'
import DashboardUrlCapture from './DashboardUrlCapture.vue'
import type {
  OpportunityDecision,
  OpportunityCapturePreview,
} from '#shared/types/dashboard-opportunities'
import type { OutreachWorkspace } from '#shared/types/outreach'
import type { Opportunity, OpportunitySearchResult } from '#shared/types/content'
import { getTimeline } from '#shared/utils/opportunity-lifecycle'
import type { DashboardPlan, PlanTask, PlanActivity, PlanDate } from '#shared/types/dashboard'
import { planWorkload, publishedTimezone } from '#shared/utils/dashboard-planning'

const props = defineProps<{
  workspace: OutreachWorkspace
  section: 'today' | 'opportunities' | 'activities'
}>()
const catalogNow = Date.now()
const emit = defineEmits<{ navigate: [section: string] }>()
const route = useRoute()
const { patchQuery: queryPatch } = useDashboardNavigation()
function queryText(key: string) {
  return typeof route.query[key] === 'string' ? (route.query[key] as string) : ''
}
function openPlan() {
  mode.value = 'plan'
  emit('navigate', 'opportunities')
}
function inspectOpportunity(item: Opportunity) {
  selected.value = item
  pursuing.value = false
  queryPatch({ opportunity: item.id, opportunitySource: item.url }, true)
}
function closeOpportunity() {
  selected.value = null
  pursuing.value = false
  queryPatch({ opportunity: undefined, opportunitySource: undefined })
}
// The same ledger powers every planner view. Saving a catalog reference never creates a task.
const {
  data: ledger,
  pending,
  error: loadError,
  refresh,
} = await useFetch<DashboardPlan>('/api/workspace/plan', { server: false })
const busy = ref(false)
const error = ref('')
const notice = ref('')
const mode = ref<'discover' | 'plan'>(queryText('mode') === 'plan' ? 'plan' : 'discover')
const view = ref(
  ['agenda', 'calendar', 'timeline', 'board'].includes(queryText('view'))
    ? queryText('view')
    : 'agenda',
)
const calendarOffset = ref(0)
const query = ref(queryText('find'))
const catalog = ref<Opportunity[]>([])
const catalogPending = ref(false)
const catalogError = ref('')
const catalogPage = ref(1)
const catalogPages = ref(1)
const catalogSource = ref<'all' | 'saved' | null>(null)
const savedCollectionInfo = ref<{
  capped: boolean
  limit: number
  unavailableCount: number
} | null>(null)
let catalogRequestVersion = 0
let catalogAbort: AbortController | null = null
onBeforeUnmount(() => {
  catalogRequestVersion++
  catalogAbort?.abort()
})
const includeClosed = ref(queryText('past') === '1')
const savedOnly = ref(queryText('saved') === '1')
const showPassed = ref(queryText('passed') === '1')
const passCandidate = ref<Opportunity | null>(null)
const passReason = ref('')
const lastDecision = ref<OpportunityDecision | null>(null)
const { data: decisionData, refresh: refreshDecisions } = useFetch<{
  decisions: OpportunityDecision[]
}>('/api/workspace/opportunity-decisions', { server: false })
const decisions = computed(() => decisionData.value?.decisions || [])
const selected = ref<Opportunity | null>(null)
const pursuing = ref(false)
const acknowledgedUncertainty = ref(false)
const proposedTasks = ref<
  { title: string; dueDate: string | null; estimatedHours: number | null }[]
>([])
const taskEditor = ref<any>(null)
const taskParent = computed({
  get: () =>
    taskEditor.value?.activityId
      ? `activity:${taskEditor.value.activityId}`
      : taskEditor.value?.pursuitId
        ? `pursuit:${taskEditor.value.pursuitId}`
        : '',
  set: (value: string) => {
    if (!taskEditor.value) return
    taskEditor.value.activityId = value.startsWith('activity:') ? value.slice(9) : null
    taskEditor.value.pursuitId = value.startsWith('pursuit:') ? value.slice(8) : null
  },
})
const activityEditor = ref(false)
const editedActivity = ref<PlanActivity | null>(null)
const eventEditor = ref<any>(null)
const selectedActivity = ref(queryText('activity'))
const activityForm = reactive({ title: '', goal: '', role: '', milestone: '', status: 'active' })
const contributionForm = reactive({ summary: '', learning: '', artifactUrl: '' })
const contributionBuffers = new Map<string, typeof contributionForm>()
watch(selectedActivity, (id, previous) => {
  if (previous) contributionBuffers.set(previous, { ...contributionForm })
  Object.assign(
    contributionForm,
    contributionBuffers.get(id) || { summary: '', learning: '', artifactUrl: '' },
  )
  queryPatch({ activity: id || undefined })
})
watch([mode, view, query, includeClosed, savedOnly, showPassed], () =>
  queryPatch({
    mode: mode.value,
    view: view.value,
    find: query.value || undefined,
    past: includeClosed.value ? '1' : undefined,
    saved: savedOnly.value ? '1' : undefined,
    passed: showPassed.value ? '1' : undefined,
  }),
)
watch(
  () => route.query,
  async () => {
    const restoredSearch = queryText('find')
    const searchChanged = restoredSearch !== query.value
    mode.value = queryText('mode') === 'plan' ? 'plan' : 'discover'
    view.value = ['agenda', 'calendar', 'timeline', 'board'].includes(queryText('view'))
      ? queryText('view')
      : 'agenda'
    query.value = restoredSearch
    includeClosed.value = queryText('past') === '1'
    savedOnly.value = queryText('saved') === '1'
    showPassed.value = queryText('passed') === '1'
    selectedActivity.value = queryText('activity')
    if (searchChanged) await loadCatalog(1, restoredSearch)
    await restoreSelection()
  },
)
const savedOpportunities = useSavedOpportunities()
const saves = savedOpportunities.ids
watch(
  () => [props.workspace.member.userId, props.workspace.catalogSaves] as const,
  ([owner, value]) => {
    savedOpportunities.setAccount(owner, value || [])
  },
  { immediate: true },
)
watch(savedOnly, () => void loadCatalog(1))
watch(
  () => saves.value.join('|'),
  () => {
    if (savedOnly.value) void loadCatalog(1)
  },
)
const tasks = computed(() => ledger.value?.tasks || [])
const pursuits = computed(() => ledger.value?.pursuits || [])
const activities = computed(() => ledger.value?.activities || [])
const events = computed(() => ledger.value?.events || [])
const currentActivity = computed(() =>
  activities.value.find((a) => a.id === selectedActivity.value),
)
const activeTasks = computed(() => tasks.value.filter((t) => t.status !== 'done'))
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
const week = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + index)
    return {
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      day: date.getUTCDate(),
    }
  }),
)
const calendarMonth = computed(() => {
  const date = new Date(`${today.slice(0, 7)}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + calendarOffset.value)
  return date
})
const calendarDays = computed(() => {
  const date = calendarMonth.value
  const length = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  return Array.from({ length }, (_, index) => {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), index + 1, 12))
    return {
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    }
  })
})
function chicagoMidnight(date: string) {
  const guess = new Date(`${date}T06:00:00Z`)
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(guess),
  )
  return new Date(guess.getTime() - hour * 3600000).toISOString()
}
const nextActions = computed(() =>
  [...activeTasks.value]
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
    .slice(0, 6),
)
const upcomingCutoffs = computed(() =>
  pursuits.value
    .flatMap((p) =>
      p.officialDates
        .filter(
          (d) =>
            d.type.endsWith('_cutoff') &&
            ['date', 'instant'].includes(d.precision) &&
            d.localDate &&
            d.localDate >= today,
        )
        .map((date, index) => ({ pursuit: p, date, key: `${p.id}:${index}` })),
    )
    .sort((a, b) => (a.date.localDate || '').localeCompare(b.date.localDate || ''))
    .slice(0, 4),
)
const workload = computed(() => {
  const end = new Date(`${today}T12:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 7)
  return ledger.value
    ? planWorkload(
        ledger.value,
        chicagoMidnight(today),
        chicagoMidnight(end.toISOString().slice(0, 10)),
      )
    : { scheduledHours: 0, unscheduledHours: 0, unknownEstimates: 0 }
})
const scheduledHours = computed(() => workload.value.scheduledHours)
const unscheduledHours = computed(() => workload.value.unscheduledHours)
const unknownEffort = computed(() => workload.value.unknownEstimates)
const capacity = ref<number | null>(null)
watch(
  () => ledger.value?.capacityHours,
  (value) => {
    capacity.value = value ?? null
  },
  { immediate: true },
)
const boardStates = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'waiting', label: 'Waiting on someone' },
  { value: 'ready', label: 'Ready to submit' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'outcome', label: 'Outcome recorded' },
]
function dateLabel(value?: string | null) {
  if (!value) return 'No date set'
  if (/^\d{4}-\d{2}$/.test(value)) return `${value} · month only`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
}
function taskReason(t: any) {
  if (t.dueDate && t.dueDate < today) return 'Internal target has passed · review your plan'
  if (t.dueDate === today) return 'Internal target today'
  if (t.dueDate) return `Internal target ${dateLabel(t.dueDate)}`
  return 'Choose a time for this next step'
}
function actionable(item: Opportunity) {
  if (['discontinued', 'replaced', 'awaiting-announcement'].includes(item.lifecycle || ''))
    return false
  if (item.lifecycle === 'rolling') return true
  const deadlines = getTimeline(item).filter((p) => p.kind === 'deadline' && !p.superseded)
  // Later camera-ready, recommendation or registration milestones do not reopen intake.
  const intake = deadlines.filter(
    (p) =>
      ['application', 'submission', 'abstract', 'qualification', 'nomination'].includes(
        p.role || '',
      ) || p.date === item.deadline,
  )
  const gates = intake.length
    ? intake
    : deadlines.filter(
        (p) =>
          !['camera-ready', 'recommendation', 'interview', 'offer', 'results', 'event'].includes(
            p.role || '',
          ),
      )
  return !gates.length || gates.every((p) => p.date.slice(0, 10) >= today)
}
function cycleLabel(item: Opportunity) {
  if (!actionable(item))
    return item.lifecycle === 'awaiting-announcement'
      ? 'Next cycle unannounced'
      : 'Past or inactive cycle'
  if (item.lifecycle === 'rolling') return 'Rolling · verify intake'
  return getTimeline(item).some((p) => p.kind === 'deadline' && !p.superseded)
    ? 'Check cutoff and eligibility'
    : 'Availability unconfirmed'
}
async function request(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  if (busy.value) return false
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await $fetch(`/api/workspace${path}` as string, { method, body: body as any })
    await refresh()
    return true
  } catch (e: any) {
    error.value =
      e?.data?.statusMessage || 'Your change could not be saved. Your edits are still here.'
    return false
  } finally {
    busy.value = false
  }
}
async function loadCatalog(page = 1, search = query.value) {
  const version = ++catalogRequestVersion
  const savedMode = savedOnly.value
  catalogAbort?.abort()
  catalogAbort = new AbortController()
  catalogPending.value = true
  catalogError.value = ''
  try {
    const endpoint = savedMode ? '/api/workspace/catalog-saves' : '/api/opportunities'
    const result = await $fetch<
      Pick<OpportunitySearchResult, 'items' | 'page' | 'pageCount' | 'total'> & {
        unavailable?: boolean
        capped?: boolean
        limit?: number
        unavailableCount?: number
      }
    >(endpoint as string, {
      query: { q: search, page, pageSize: 30 },
      signal: catalogAbort.signal,
    })
    if (version !== catalogRequestVersion) return
    if (result.unavailable)
      throw new Error('Catalog is temporarily unavailable. Try again or open the public catalog.')
    catalog.value = result.items
    catalogSource.value = savedMode ? 'saved' : 'all'
    savedCollectionInfo.value = savedMode
      ? {
          capped: result.capped === true,
          limit: result.limit ?? 500,
          unavailableCount: result.unavailableCount ?? 0,
        }
      : null
    catalogPage.value = result.page
    catalogPages.value = result.pageCount
  } catch (e: any) {
    if (version !== catalogRequestVersion) return
    catalogError.value = e?.message || 'Could not load the catalog.'
  } finally {
    if (version === catalogRequestVersion) catalogPending.value = false
  }
}
const results = computed(() =>
  catalogSource.value !== (savedOnly.value ? 'saved' : 'all')
    ? []
    : catalog.value.filter(
        (o) =>
          (includeClosed.value || actionable(o)) &&
          (showPassed.value ||
            !decisions.value.some((d) => d.opportunityId === o.id && d.decision === 'pass')),
      ),
)
onMounted(async () => {
  await loadCatalog()
  await restoreSelection()
})
async function restoreSelection() {
  const id = queryText('opportunity')
  if (!id) {
    selected.value = null
    pursuing.value = false
    return
  }
  if (selected.value?.id === id) return
  const existing = catalog.value.find((item) => item.id === id)
  if (existing) {
    selected.value = existing
    pursuing.value = false
    return
  }
  const source = queryText('opportunitySource')
  if (!source) return
  try {
    const result = await $fetch<OpportunityCapturePreview>('/api/workspace/capture/preview', {
      method: 'POST',
      body: { url: source },
    })
    if (queryText('opportunity') === id && result.item?.id === id) {
      selected.value = result.item
      pursuing.value = false
    }
  } catch {
    error.value =
      'This linked opportunity could not be restored. Your saved work is unchanged; search for it again.'
  }
}
async function decideOpportunity(item: Opportunity, decision: 'pass' | 'clear', reason = '') {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const previous = decisions.value.find((d) => d.opportunityId === item.id)
    lastDecision.value = await $fetch<OpportunityDecision>('/api/workspace/opportunity-decisions', {
      method: 'POST',
      body: { opportunityId: item.id, decision, reason, expectedVersion: previous?.version || 0 },
    })
    await refreshDecisions()
    passCandidate.value = null
    notice.value =
      decision === 'pass'
        ? 'Passed for now. Existing plans and tasks are unchanged.'
        : 'Pass undone. The opportunity is available in discovery again.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Your decision could not be saved. Try again.'
  } finally {
    busy.value = false
  }
}
function beginPass(item: Opportunity) {
  passCandidate.value = item
  passReason.value = ''
}
async function undoPass() {
  if (!lastDecision.value || lastDecision.value.decision !== 'pass') return
  const item = catalog.value.find((i) => i.id === lastDecision.value!.opportunityId)
  if (item) await decideOpportunity(item, 'clear')
}
async function saveOpportunity(item: Opportunity) {
  const saved = isSaved(item)
  const ok = await savedOpportunities.toggle(item.id)
  if (ok) {
    notice.value = saved
      ? 'Reference removed. Your plan is unchanged.'
      : 'Saved for later. No tasks or commitments added.'
  } else error.value = savedOpportunities.error.value
}
function isSaved(item: Opportunity) {
  return (
    saves.value.includes(item.id) ||
    (catalogSource.value === 'saved' && catalog.value.some((entry) => entry.id === item.id))
  )
}
function reviewPursuit(item: Opportunity) {
  selected.value = item
  pursuing.value = true
  acknowledgedUncertainty.value = false
  proposedTasks.value = [
    {
      title: 'Verify eligibility and the current application cycle',
      dueDate: null,
      estimatedHours: null,
    },
    ...(item.internship?.applicationMaterials || [])
      .slice(0, 5)
      .map((title) => ({ title: `Prepare ${title}`, dueDate: null, estimatedHours: null })),
    {
      title: 'Review requirements and complete the external submission',
      dueDate: null,
      estimatedHours: null,
    },
  ]
}
async function confirmPursuit() {
  if (!selected.value) return
  const item = selected.value
  const ok = await request('/plan/pursuits', 'POST', {
    opportunityId: item.id,
    cycleId: item.edition || 'published-cycle-unconfirmed',
    title: item.title,
    officialDates: snapshotDates(item),
    eligibility: getTimeline(item).some((p) => p.conflict) ? 'conflict' : 'unknown',
    acknowledgedUncertainty: acknowledgedUncertainty.value,
    reviewedTasks: proposedTasks.value
      .filter((t) => t.title.trim())
      .map((t) => ({
        ...t,
        estimatedHours: typeof t.estimatedHours === 'number' ? t.estimatedHours : null,
        dueDate: t.dueDate || null,
      })),
  })
  if (ok) {
    pursuing.value = false
    closeOpportunity()
    mode.value = 'plan'
    notice.value = 'Plan created from the tasks you reviewed. Official dates remain source facts.'
  }
}
function snapshotDates(item: Opportunity): PlanDate[] {
  const points = getTimeline(item).filter((p) => !p.superseded)
  return points.flatMap((p) => {
    const timezone = p.timezone && publishedTimezone(p.timezone) ? p.timezone : null
    const fact: PlanDate = {
      ...(p.sourceRef &&
      p.sourceRef.length <= 240 &&
      points.filter((point) => point.sourceRef === p.sourceRef).length === 1
        ? { sourceFactId: p.sourceRef }
        : {}),
      type:
        p.kind === 'opens'
          ? 'application_open'
          : p.kind === 'results'
            ? 'notification'
            : p.kind === 'event'
              ? 'program_start'
              : p.role === 'abstract'
                ? 'abstract_cutoff'
                : p.role === 'registration'
                  ? 'registration_cutoff'
                  : p.role === 'camera-ready'
                    ? 'paper_cutoff'
                    : 'application_cutoff',
      wording: `${p.label}: ${p.date}${p.timezone ? ` (${p.timezone})` : ''}`,
      ...normalizePublishedDate(p.date, timezone),
      timezone,
      sourceUrl: p.url || item.url,
      conflict: p.conflict || null,
    }
    return p.endDate && p.kind === 'event'
      ? [
          fact,
          {
            ...fact,
            type: 'program_end' as const,
            wording: `${p.label} ends: ${p.endDate}`,
            ...normalizePublishedDate(p.endDate, timezone),
          },
        ]
      : [fact]
  })
}
function normalizePublishedDate(
  value: string,
  timezone: string | null,
): Pick<PlanDate, 'precision' | 'localDate' | 'instant'> {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return { precision: 'date', localDate: value, instant: null }
  if (/^\d{4}-\d{2}$/.test(value)) return { precision: 'month', localDate: value, instant: null }
  const zone = timezone && publishedTimezone(timezone)
  if (zone && /[zZ]|[+-]\d{2}:\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)))
    return {
      precision: 'instant',
      localDate: new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value)),
      instant: new Date(value).toISOString(),
    }
  return { precision: 'approximate', localDate: value, instant: null }
}
function editTask(task?: any, activityId?: string) {
  taskEditor.value = task
    ? { ...task, expectedVersion: task.version }
    : {
        title: '',
        dueDate: '',
        estimatedHours: null,
        status: 'todo',
        activityId: activityId || null,
        pursuitId: null,
        notes: '',
        scheduledStart: '',
        scheduledEnd: '',
      }
}
async function saveTask() {
  const task = taskEditor.value
  if (!task?.title.trim()) return
  const input = taskInput(task)
  const body = task.id
    ? { expectedVersion: task.version, task: input }
    : { task: input, pursuitId: task.pursuitId || null, activityId: task.activityId || null }
  if (
    await request(
      task.id ? `/plan/tasks/${task.id}` : '/plan/tasks',
      task.id ? 'PATCH' : 'POST',
      body,
    )
  ) {
    taskEditor.value = null
    notice.value = 'Task saved across all plan views.'
  }
}
async function completeTask(task: any) {
  if (
    await request(`/plan/tasks/${task.id}`, 'PATCH', {
      expectedVersion: task.version,
      task: { ...taskInput(task), status: task.status === 'done' ? 'todo' : 'done' },
    })
  )
    notice.value = task.status === 'done' ? 'Task reopened.' : 'Task completed.'
}
async function saveActivity() {
  if (!activityForm.title.trim()) return
  if (
    await request(
      editedActivity.value ? `/plan/activities/${editedActivity.value.id}` : '/plan/activities',
      editedActivity.value ? 'PATCH' : 'POST',
      editedActivity.value
        ? { expectedVersion: editedActivity.value.version, activity: { ...activityForm } }
        : { ...activityForm },
    )
  ) {
    activityEditor.value = false
    Object.assign(activityForm, { title: '', goal: '', role: '', milestone: '', status: 'active' })
    notice.value = editedActivity.value
      ? 'Activity updated.'
      : 'Activity created. Add the next useful milestone.'
    editedActivity.value = null
  }
}
function editActivity(activity?: PlanActivity) {
  editedActivity.value = activity || null
  Object.assign(
    activityForm,
    activity
      ? {
          title: activity.title,
          goal: activity.goal,
          role: activity.role,
          milestone: activity.milestone,
          status: activity.status,
        }
      : { title: '', goal: '', role: '', milestone: '', status: 'active' },
  )
  activityEditor.value = true
}
function editEvent(event?: any) {
  eventEditor.value = event
    ? { ...event, start: sessionInput(event.start), end: sessionInput(event.end) }
    : { title: '', type: 'appointment', start: '', end: '' }
}
async function saveEvent() {
  const event = eventEditor.value
  if (!event) return
  const input = {
    title: event.title,
    type: event.type,
    start: new Date(event.start).toISOString(),
    end: new Date(event.end).toISOString(),
    taskId: null,
  }
  if (
    await request(
      event.id ? `/plan/events/${event.id}` : '/plan/events',
      event.id ? 'PATCH' : 'POST',
      event.id ? { expectedVersion: event.version, event: input } : input,
    )
  ) {
    eventEditor.value = null
    notice.value = 'Calendar event saved. No official date changed.'
  }
}
async function recordContribution() {
  if (!currentActivity.value || !contributionForm.summary.trim()) return
  if (
    await request(`/plan/activities/${currentActivity.value.id}/contributions`, 'POST', {
      expectedVersion: currentActivity.value.version,
      description: contributionForm.summary,
      learned: contributionForm.learning,
      artifactUrl: contributionForm.artifactUrl || null,
    })
  ) {
    Object.assign(contributionForm, { summary: '', learning: '', artifactUrl: '' })
    notice.value = 'Contribution recorded. It has not been promoted to a profile achievement.'
  }
}
async function updatePursuit(pursuit: any, status: string) {
  let confirmation = false
  if (status === 'submitted') {
    confirmation = window.confirm(
      'Confirm that you completed the organizer’s external submission. This dashboard does not submit an application for you.',
    )
    if (!confirmation) return
  }
  await request(`/plan/pursuits/${pursuit.id}`, 'PATCH', {
    expectedVersion: pursuit.version,
    status,
    confirmedSubmission: confirmation,
    outcome: pursuit.outcome,
    submissionReceipt: pursuit.submissionReceipt,
  })
}
async function updateOutcome(pursuit: any, outcome: string) {
  await request(`/plan/pursuits/${pursuit.id}`, 'PATCH', {
    expectedVersion: pursuit.version,
    status: 'outcome',
    outcome,
    submissionReceipt: pursuit.submissionReceipt,
    confirmedSubmission: false,
  })
}
function activityTasks(id: string) {
  return tasks.value.filter((t) => t.activityId === id)
}
function pursuitTasks(id: string) {
  return tasks.value.filter((t) => t.pursuitId === id)
}
function sessionInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function openTask(task: any) {
  editTask({
    ...task,
    scheduledStart: sessionInput(task.scheduledStart),
    scheduledEnd: sessionInput(task.scheduledEnd),
  })
}
function taskInput(task: any) {
  return {
    title: task.title,
    notes: task.notes || '',
    status: task.status || 'todo',
    dueDate: task.dueDate || null,
    estimatedHours: typeof task.estimatedHours === 'number' ? task.estimatedHours : null,
    scheduledStart: task.scheduledStart ? new Date(task.scheduledStart).toISOString() : null,
    scheduledEnd: task.scheduledEnd ? new Date(task.scheduledEnd).toISOString() : null,
    dependsOn: task.dependsOn || [],
  }
}
function localDay(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}
function overlapsDay(
  start: string | null | undefined,
  end: string | null | undefined,
  date: string,
) {
  if (!start || !end) return false
  const following = new Date(`${date}T12:00:00Z`)
  following.setUTCDate(following.getUTCDate() + 1)
  const from = Date.parse(chicagoMidnight(date))
  const to = Date.parse(chicagoMidnight(following.toISOString().slice(0, 10)))
  // Half-open intervals: midnight-ending events do not occupy the following day.
  return Date.parse(start) < to && Date.parse(end) > from
}
function calendarFacts(date: string) {
  return pursuits.value.flatMap((p) =>
    p.officialDates
      .filter(
        (d) => d.localDate === date && d.precision !== 'unknown' && d.precision !== 'approximate',
      )
      .map((point, index) => ({ key: `${p.id}:${index}`, title: p.title, point })),
  )
}
</script>

<template>
  <section :key="section" class="workbench" :aria-label="section">
    <header class="wb-heading">
      <div>
        <p class="wb-kicker">My work <span>· America/Chicago</span></p>
        <h2>
          {{
            section === 'today'
              ? 'Today'
              : section === 'opportunities'
                ? 'Opportunities'
                : 'Activities'
          }}
        </h2>
        <p class="wb-muted">
          {{
            section === 'today'
              ? 'Your commitments, and the next useful step.'
              : section === 'opportunities'
                ? 'Choose deliberately. Keep preparation manageable.'
                : 'Sustained work, with a record of your contribution.'
          }}
        </p>
      </div>
      <button
        class="wb-button wb-primary"
        @click="section === 'activities' ? editActivity() : editTask()"
      >
        {{ section === 'activities' ? '+ Add activity' : '+ Add task' }}
      </button>
    </header>
    <p v-if="error || loadError" class="wb-message wb-error" role="alert">
      {{ error || 'Your plan could not be loaded.' }} <button @click="refresh()">Retry</button>
    </p>
    <p v-if="notice" class="wb-message" role="status">
      {{ notice }}
      <button
        v-if="lastDecision?.decision === 'pass'"
        class="wb-text"
        :disabled="busy"
        @click="undoPass"
      >
        Undo pass
      </button>
    </p>
    <p v-if="pending && !ledger" class="wb-loading" role="status">Loading your commitments…</p>

    <div v-if="section === 'today'" class="wb-today">
      <article class="wb-surface wb-next">
        <p class="wb-kicker">Next action</p>
        <template v-if="nextActions[0]"
          ><h3>{{ nextActions[0].title }}</h3>
          <p class="wb-muted">{{ taskReason(nextActions[0]) }}</p>
          <button class="wb-button wb-primary" @click="openTask(nextActions[0])">
            Open task <span aria-hidden="true">↗</span>
          </button></template
        >
        <template v-else
          ><h3>Your next step is yours to choose.</h3>
          <p class="wb-muted">Choose something worth doing, then add one practical next step.</p>
          <button class="wb-button" @click="emit('navigate', 'opportunities')">
            Find an opportunity
          </button></template
        >
      </article>
      <article class="wb-surface wb-week">
        <div class="wb-row">
          <h3>The coming week</h3>
          <span class="wb-muted">Internal plan</span>
        </div>
        <div class="wb-weekstrip">
          <button
            v-for="day in week"
            :key="day.date"
            @click="
              editTask({
                title: '',
                dueDate: day.date,
                status: 'todo',
                estimatedHours: null,
                notes: '',
              })
            "
          >
            <span>{{ day.label }}</span
            ><strong>{{ day.day }}</strong
            ><i v-if="activeTasks.some((t) => t.dueDate === day.date)" aria-label="Has tasks" />
          </button>
        </div>
        <p>
          {{ scheduledHours.toFixed(1) }}h scheduled
          <span class="wb-muted"
            >· {{ unscheduledHours.toFixed(1) }}h in unscheduled backlog<span v-if="unknownEffort">
              · {{ unknownEffort }} task{{ unknownEffort === 1 ? '' : 's' }} without an
              estimate</span
            ></span
          >
        </p>
        <form
          class="wb-capacity"
          @submit.prevent="request('/plan/settings', 'PATCH', { capacityHours: capacity })"
        >
          <label for="weekly-capacity">Approximate weekly capacity</label>
          <div>
            <input
              id="weekly-capacity"
              v-model.number="capacity"
              type="number"
              min="0"
              max="168"
              step="0.5"
              placeholder="Not set"
            /><span>hours</span><button class="wb-button" :disabled="busy">Save</button>
          </div>
        </form>
        <p v-if="capacity != null && scheduledHours > capacity" class="wb-warning">
          {{ (scheduledHours - capacity).toFixed(1) }}h above your capacity. Reschedule work before
          adding more.
        </p>
      </article>
      <article class="wb-surface wb-queue">
        <div class="wb-row">
          <h3>Action queue</h3>
          <button class="wb-text" @click="openPlan">Open plan ↗</button>
        </div>
        <div v-for="task in nextActions" :key="task.id" class="wb-task">
          <button
            class="wb-check"
            :aria-label="`Complete ${task.title}`"
            :disabled="busy"
            @click="completeTask(task)"
          >
            ○</button
          ><button class="wb-task-title" @click="openTask(task)">
            <strong>{{ task.title }}</strong
            ><span>{{ taskReason(task) }}</span></button
          ><span class="wb-muted">{{
            task.estimatedHours == null ? 'Effort unknown' : `${task.estimatedHours}h estimated`
          }}</span>
        </div>
        <p v-if="!nextActions.length" class="wb-muted">
          Tasks you choose to take on will appear here. Saved references stay in discovery.
        </p>
        <div v-if="upcomingCutoffs.length" class="wb-cutoffs">
          <h4>Next official cutoffs</h4>
          <div v-for="fact in upcomingCutoffs" :key="fact.key" class="wb-task">
            <div class="wb-task-title">
              <strong>{{ fact.pursuit.title }}</strong
              ><span
                >{{ fact.date.wording }} ·
                {{
                  fact.date.precision === 'date'
                    ? 'Exact cutoff time unverified'
                    : fact.date.timezone
                }}</span
              >
            </div>
            <a class="wb-text" :href="fact.date.sourceUrl" target="_blank" rel="noopener noreferrer"
              >Verify source ↗</a
            >
          </div>
        </div>
        <div v-if="workspace.proposals.some((p) => p.status === 'draft')" class="wb-draft-action">
          <p>
            You have an editable research draft. Review its evidence before approving a message.
          </p>
          <button class="wb-button" @click="emit('navigate', 'drafts')">Review drafts</button>
        </div>
      </article>
    </div>

    <template v-if="section === 'opportunities'">
      <div class="wb-toolbar">
        <div class="wb-segments" aria-label="Opportunity mode">
          <button :aria-pressed="mode === 'discover'" @click="mode = 'discover'">Discover</button
          ><button :aria-pressed="mode === 'plan'" @click="mode = 'plan'">My plan</button>
        </div>
        <a v-if="mode === 'plan'" class="wb-button" href="/api/workspace/plan/export" download
          >Export calendar ↓</a
        >
        <DashboardUrlCapture v-else @inspect="inspectOpportunity" @saved="notice = $event" />
      </div>
      <div v-if="mode === 'discover'" class="wb-discovery">
        <form class="wb-search" @submit.prevent="loadCatalog()">
          <label class="wb-sr-only" for="opportunity-search">Search sourced opportunities</label
          ><input
            id="opportunity-search"
            v-model="query"
            type="search"
            placeholder="Search fields, programs, or calls"
          /><button class="wb-button" :disabled="catalogPending">Search</button
          ><label class="wb-toggle"
            ><input v-model="includeClosed" type="checkbox" />Include past cycles</label
          >
          <label class="wb-toggle"><input v-model="savedOnly" type="checkbox" />Saved only</label>
          <label class="wb-toggle"
            ><input v-model="showPassed" type="checkbox" />Include passed</label
          >
        </form>
        <p v-if="savedOnly" class="wb-muted">
          Searching your saved opportunities. Past cycles and passed records remain hidden unless
          you include them.
        </p>
        <template v-if="savedOnly && catalogSource === 'saved' && savedCollectionInfo"
          ><p v-if="savedCollectionInfo.capped" class="wb-message">
            Search includes your newest {{ savedCollectionInfo.limit }} saved records. Older saves
            remain stored but are outside this collection limit.
          </p>
          <p v-if="savedCollectionInfo.unavailableCount" class="wb-muted">
            {{ savedCollectionInfo.unavailableCount }} saved record{{
              savedCollectionInfo.unavailableCount === 1 ? '' : 's'
            }}
            cannot currently be displayed in the published catalog. This does not establish whether
            the organizer is accepting participants.
          </p></template
        >
        <p v-if="catalogError" class="wb-message wb-error" role="alert">
          {{ catalogError }} <button @click="loadCatalog()">Retry</button>
        </p>
        <p v-if="catalogPending" class="wb-muted" role="status">Checking the catalog…</p>
        <OpportunitySaveNotice />
        <div class="wb-results">
          <OpportunityCard
            v-for="item in results"
            :key="item.id"
            :item="item"
            :now="catalogNow"
            compact
            inspect
            @inspect="inspectOpportunity(item)"
          >
            <template #actions>
              <OpportunitySaveButton :id="item.id" compact />
              <button type="button" class="wb-inspect" @click="inspectOpportunity(item)">
                Inspect sources <SiteIcon name="right" :size="14" aria-hidden="true" />
              </button>
              <button
                v-if="decisions.some((d) => d.opportunityId === item.id && d.decision === 'pass')"
                class="wb-text"
                :disabled="busy"
                @click="decideOpportunity(item, 'clear')"
              >
                Undo pass
              </button>
              <button v-else class="wb-text" :disabled="busy" @click="beginPass(item)">Pass</button>
            </template>
          </OpportunityCard>
        </div>
        <div v-if="!catalogPending && !results.length" class="wb-surface wb-empty">
          <h3>No actionable results in this set.</h3>
          <p>Try another field, or include past cycles to watch for their next announcement.</p>
          <NuxtLink class="wb-text" to="/opportunities">Open the full catalog ↗</NuxtLink>
        </div>
        <div v-if="catalogSource === (savedOnly ? 'saved' : 'all')" class="wb-pagination">
          <button
            class="wb-button"
            :disabled="catalogPage <= 1 || catalogPending"
            @click="loadCatalog(catalogPage - 1)"
          >
            Previous</button
          ><span>Page {{ catalogPage }} of {{ catalogPages }}</span
          ><button
            class="wb-button"
            :disabled="catalogPage >= catalogPages || catalogPending"
            @click="loadCatalog(catalogPage + 1)"
          >
            Next
          </button>
        </div>
      </div>
      <template v-else>
        <div class="wb-viewbar" aria-label="Plan view">
          <button
            v-for="v in ['agenda', 'calendar', 'timeline', 'board']"
            :key="v"
            :aria-pressed="view === v"
            @click="view = v"
          >
            {{ v }}
          </button>
        </div>
        <p v-if="!pursuits.length && !tasks.length" class="wb-surface wb-empty">
          Your plan is empty. Save interesting references freely; choose Pursue when you are ready
          to review a real preparation plan.
        </p>
        <div v-if="view === 'agenda'" class="wb-surface">
          <div class="wb-row">
            <h3>Next commitments</h3>
            <span class="wb-muted">Personal targets, not official cutoffs</span>
          </div>
          <div
            v-for="task in [...tasks].sort((a, b) =>
              (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
            )"
            :key="task.id"
            class="wb-task"
            :class="{ 'wb-done': task.status === 'done' }"
          >
            <button
              class="wb-check"
              :aria-label="`${task.status === 'done' ? 'Reopen' : 'Complete'} ${task.title}`"
              :disabled="busy"
              @click="completeTask(task)"
            >
              {{ task.status === 'done' ? '✓' : '○' }}</button
            ><button class="wb-task-title" @click="openTask(task)">
              <strong>{{ task.title }}</strong
              ><span>{{ taskReason(task) }}</span></button
            ><span class="wb-muted">{{
              task.estimatedHours == null ? 'Unknown effort' : `${task.estimatedHours}h`
            }}</span>
          </div>
        </div>
        <template v-if="view === 'calendar'">
          <div class="wb-row wb-month">
            <button class="wb-button" aria-label="Previous month" @click="calendarOffset--">
              ←
            </button>
            <h3>
              {{
                calendarMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                })
              }}
            </h3>
            <button class="wb-button" aria-label="Next month" @click="calendarOffset++">→</button>
          </div>
          <button class="wb-button wb-event-add" @click="editEvent()">
            + Add appointment or program date
          </button>
          <div class="wb-calendar">
            <article v-for="day in calendarDays" :key="day.date" class="wb-surface">
              <p class="wb-kicker">{{ day.label }}</p>
              <h3>{{ dateLabel(day.date) }}</h3>
              <button
                v-for="task in tasks.filter(
                  (t) =>
                    t.dueDate === day.date ||
                    overlapsDay(t.scheduledStart, t.scheduledEnd, day.date),
                )"
                :key="task.id"
                class="wb-calendar-item"
                @click="openTask(task)"
              >
                <span class="wb-label">{{
                  overlapsDay(task.scheduledStart, task.scheduledEnd, day.date)
                    ? 'Work session'
                    : 'Internal target'
                }}</span
                ><strong>{{ task.title }}</strong
                ><small v-if="overlapsDay(task.scheduledStart, task.scheduledEnd, day.date)"
                  >{{
                    localDay(task.scheduledStart) === day.date
                      ? dateLabel(task.scheduledStart)
                      : 'Continues from an earlier day'
                  }}
                  → {{ dateLabel(task.scheduledEnd) }}</small
                >
              </button>
              <button
                v-for="event in events.filter((e) => overlapsDay(e.start, e.end, day.date))"
                :key="event.id"
                class="wb-calendar-item"
                @click="editEvent(event)"
              >
                <span class="wb-label">Appointment / event</span><strong>{{ event.title }}</strong
                ><small
                  >{{
                    localDay(event.start) === day.date
                      ? dateLabel(event.start)
                      : 'Continues from an earlier day'
                  }}
                  → {{ dateLabel(event.end) }}</small
                >
              </button>
              <div
                v-for="fact in calendarFacts(day.date)"
                :key="fact.key"
                class="wb-calendar-item wb-fixed"
              >
                <span class="wb-label">Official {{ fact.point.type.replaceAll('_', ' ') }}</span
                ><strong>{{ fact.title }}</strong
                ><small
                  >{{ fact.point.wording }} ·
                  {{ fact.point.timezone || 'Timezone unpublished' }}</small
                ><a
                  class="wb-text"
                  :href="fact.point.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Source ↗</a
                >
              </div>
              <button
                class="wb-text"
                @click="
                  editTask({
                    title: '',
                    dueDate: day.date,
                    status: 'todo',
                    estimatedHours: null,
                    notes: '',
                  })
                "
              >
                + Add task
              </button>
            </article>
          </div>
        </template>
        <div v-if="view === 'timeline'" class="wb-timeline">
          <article v-for="pursuit in pursuits" :key="pursuit.id" class="wb-surface">
            <div class="wb-row">
              <h3>{{ pursuit.title }}</h3>
              <span class="wb-label">{{ pursuit.status }}</span>
            </div>
            <p class="wb-muted">
              {{ pursuitTasks(pursuit.id).filter((t) => t.status !== 'done').length }} preparation
              steps remaining
            </p>
            <div class="wb-milestones">
              <div
                v-for="point in pursuit.officialDates || []"
                :key="`${point.wording}:${point.localDate}`"
              >
                <span class="wb-label">Official {{ point.type }}</span
                ><strong>{{ point.wording }}</strong
                ><span
                  >{{ dateLabel(point.localDate || '')
                  }}<template v-if="point.timezone"> · {{ point.timezone }}</template
                  ><template
                    v-if="
                      point.precision === 'date' ||
                      /^\d{4}-\d{2}-\d{2}$/.test(point.localDate || '')
                    "
                  >
                    · cutoff time not published</template
                  ></span
                ><a
                  v-if="point.sourceUrl"
                  :href="point.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Source ↗</a
                >
                <p v-if="point.conflict" class="wb-warning">
                  Source conflict: {{ point.conflict }}
                </p>
              </div>
            </div>
            <div v-for="task in pursuitTasks(pursuit.id)" :key="task.id" class="wb-task">
              <button class="wb-task-title" @click="openTask(task)">
                <strong>{{ task.title }}</strong
                ><span>{{ taskReason(task) }}</span>
              </button>
            </div>
          </article>
        </div>
        <div v-if="view === 'board'" class="wb-board">
          <section v-for="column in boardStates" :key="column.value">
            <h3>{{ column.label }}</h3>
            <article
              v-for="pursuit in pursuits.filter((p) => p.status === column.value)"
              :key="pursuit.id"
              class="wb-surface"
            >
              <h4>{{ pursuit.title }}</h4>
              <p class="wb-muted">
                {{ pursuitTasks(pursuit.id).filter((t) => t.status === 'done').length }} of
                {{ pursuitTasks(pursuit.id).length }} steps complete
              </p>
              <label class="wb-sr-only" :for="`stage-${pursuit.id}`">Application stage</label
              ><select
                :id="`stage-${pursuit.id}`"
                :value="pursuit.status"
                :disabled="busy"
                @change="updatePursuit(pursuit, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="state in boardStates" :key="state.value" :value="state.value">
                  {{ state.label }}
                </option>
              </select>
              <p v-if="pursuit.status === 'submitted'" class="wb-muted">
                Member-confirmed external submission.
              </p>
              <label v-if="pursuit.status === 'outcome'" class="wb-outcome"
                >Recorded outcome<select
                  :value="pursuit.outcome"
                  :disabled="busy"
                  @change="updateOutcome(pursuit, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="withdrawn">Withdrawn</option>
                </select></label
              >
            </article>
            <p v-if="!pursuits.some((p) => p.status === column.value)" class="wb-muted">
              No applications in this stage.
            </p>
          </section>
        </div>
      </template>
    </template>

    <div v-if="section === 'activities'" class="wb-activities">
      <div class="wb-activity-list">
        <button
          v-for="activity in activities"
          :key="activity.id"
          class="wb-surface wb-activity"
          :aria-pressed="selectedActivity === activity.id"
          @click="selectedActivity = activity.id"
        >
          <span class="wb-kicker">{{ activity.status || 'Active' }}</span>
          <h3>{{ activity.title }}</h3>
          <p class="wb-muted">{{ activity.milestone || 'Choose the next milestone' }}</p>
        </button>
        <div v-if="!activities.length" class="wb-surface wb-empty">
          <h3>Keep worthwhile work in one place.</h3>
          <p class="wb-muted">
            Research, leadership, employment, volunteering, artistic work, and family
            responsibilities all belong here if you choose to track them.
          </p>
          <button class="wb-button" @click="editActivity()">Add your first activity</button>
        </div>
      </div>
      <article v-if="currentActivity" class="wb-surface wb-activity-detail">
        <p class="wb-kicker">Activity · your work</p>
        <div class="wb-row">
          <h3>{{ currentActivity.title }}</h3>
          <button class="wb-text" @click="editActivity(currentActivity)">Edit activity</button>
        </div>
        <p>{{ currentActivity.goal }}</p>
        <dl class="wb-details">
          <div>
            <dt>Your role</dt>
            <dd>{{ currentActivity.role || 'Not recorded' }}</dd>
          </div>
          <div>
            <dt>Current milestone</dt>
            <dd>{{ currentActivity.milestone || 'Not set' }}</dd>
          </div>
        </dl>
        <div class="wb-row">
          <h4>Next tasks</h4>
          <button class="wb-text" @click="editTask(undefined, currentActivity.id)">
            + Add task
          </button>
        </div>
        <div v-for="task in activityTasks(currentActivity.id)" :key="task.id" class="wb-task">
          <button
            class="wb-check"
            :disabled="busy"
            :aria-label="`Toggle completion: ${task.title}`"
            @click="completeTask(task)"
          >
            {{ task.status === 'done' ? '✓' : '○' }}</button
          ><button class="wb-task-title" @click="openTask(task)">
            <strong>{{ task.title }}</strong
            ><span>{{ taskReason(task) }}</span>
          </button>
        </div>
        <h4 class="wb-subheading">Record a contribution</h4>
        <form class="wb-form" @submit.prevent="recordContribution">
          <label
            >What did you contribute?<textarea
              v-model="contributionForm.summary"
              required
              rows="3"
              placeholder="Describe your own work and what changed."
            /></label
          ><label
            >What did you learn?<textarea v-model="contributionForm.learning" rows="2" /></label
          ><label
            >Supporting artifact URL <span class="wb-muted">optional</span
            ><input v-model="contributionForm.artifactUrl" type="url" placeholder="https://…"
          /></label>
          <p class="wb-muted">
            Private to your account. A note is evidence of work, not an automatic achievement or
            group claim.
          </p>
          <button class="wb-button wb-primary" :disabled="busy">Save contribution</button>
        </form>
        <div
          v-for="contribution in currentActivity.contributions || []"
          :key="contribution.id"
          class="wb-contribution"
        >
          <p>{{ contribution.description }}</p>
          <p v-if="contribution.learned" class="wb-muted">Learned: {{ contribution.learned }}</p>
          <a
            v-if="contribution.artifactUrl"
            class="wb-text"
            :href="contribution.artifactUrl"
            target="_blank"
            rel="noopener noreferrer"
            >View artifact ↗</a
          ><small class="wb-muted">{{ dateLabel(contribution.createdAt) }}</small>
        </div>
      </article>
      <div v-else-if="activities.length" class="wb-surface wb-empty">
        <h3>Select an activity</h3>
        <p class="wb-muted">Review its milestone, next tasks, and contribution evidence.</p>
      </div>
    </div>

    <DashboardDialog
      v-if="selected && section === 'opportunities'"
      :title="pursuing ? 'Review your preparation plan' : selected.title"
      @close="closeOpportunity"
    >
      <template v-if="!pursuing">
        <p class="wb-kicker">{{ selected.kind }} · {{ cycleLabel(selected) }}</p>
        <p>{{ selected.description }}</p>
        <dl class="wb-details">
          <div>
            <dt>Eligibility</dt>
            <dd>{{ selected.eligibility || 'Not yet verified' }}</dd>
          </div>
          <div>
            <dt>Location / access</dt>
            <dd>{{ selected.location || 'Not yet verified' }}</dd>
          </div>
          <div>
            <dt>Effort</dt>
            <dd>
              {{
                selected.effort ||
                selected.internship?.commitment ||
                'Unknown — estimate before committing'
              }}
            </dd>
          </div>
          <div>
            <dt>Last successful source check</dt>
            <dd>{{ dateLabel(selected.monitoring?.lastSuccessAt || selected.verifiedAt) }}</dd>
          </div>
        </dl>
        <div
          v-for="point in getTimeline(selected).filter((p) => !p.superseded)"
          :key="`${point.label}:${point.date}`"
          class="wb-source"
        >
          <strong>{{ point.label }}</strong
          ><span
            >{{ dateLabel(point.date) }} · {{ point.timezone || 'Timezone not published' }}</span
          ><span v-if="/^\d{4}-\d{2}-\d{2}$/.test(point.date)"
            >Date only; exact cutoff unverified</span
          >
          <p v-if="point.conflict" class="wb-warning">{{ point.conflict }}</p>
          <a :href="point.url || selected.url" target="_blank" rel="noopener noreferrer"
            >Official source ↗</a
          >
        </div>
        <a class="wb-text" :href="selected.url" target="_blank" rel="noopener noreferrer"
          >Review organizer requirements ↗</a
        >
        <div class="wb-dialog-actions">
          <button class="wb-button" :disabled="busy" @click="saveOpportunity(selected)">
            {{ isSaved(selected) ? 'Remove save' : 'Save for later' }}</button
          ><button
            class="wb-button wb-primary"
            :disabled="
              !actionable(selected) ||
              selected.highSchoolPolicy === 'excluded' ||
              pursuits.some((p) => p.opportunityId === selected?.id)
            "
            @click="reviewPursuit(selected)"
          >
            {{
              pursuits.some((p) => p.opportunityId === selected?.id)
                ? 'Already in your plan'
                : 'Pursue →'
            }}
          </button>
        </div>
        <p v-if="!actionable(selected)" class="wb-muted">
          This cycle is not actionable. Save it as a reference and check for a new announcement.
        </p>
      </template>
      <template v-else
        ><p>{{ selected.title }}</p>
        <p class="wb-message">
          Eligibility remains unconfirmed until you check every organizer rule. These are suggested
          internal tasks, not official deadlines.
        </p>
        <p class="wb-muted">
          {{ scheduledHours.toFixed(1) }}h already scheduled this week{{
            capacity == null ? ' · capacity not set' : ` of about ${capacity}h available`
          }}. Unknown estimates are not zero.
        </p>
        <form class="wb-form" @submit.prevent="confirmPursuit">
          <label class="wb-acknowledgement"
            ><input v-model="acknowledgedUncertainty" type="checkbox" required />I understand that
            eligibility and availability are unconfirmed. My first step is to verify them before
            investing in an application.</label
          >
          <fieldset v-for="(task, index) in proposedTasks" :key="index" class="wb-review-task">
            <legend>Step {{ index + 1 }}</legend>
            <label>Task<input v-model="task.title" required maxlength="240" /></label>
            <div class="wb-formgrid">
              <label>Internal target<input v-model="task.dueDate" type="date" /></label
              ><label
                >Estimated hours<input
                  v-model.number="task.estimatedHours"
                  type="number"
                  min="0"
                  max="500"
                  step="0.5"
                  placeholder="Unknown"
              /></label>
            </div>
            <button type="button" class="wb-text" @click="proposedTasks.splice(index, 1)">
              Remove suggestion
            </button>
          </fieldset>
          <button
            type="button"
            class="wb-button"
            @click="proposedTasks.push({ title: '', dueDate: null, estimatedHours: null })"
          >
            + Add step
          </button>
          <div class="wb-dialog-actions">
            <button type="button" class="wb-button" @click="pursuing = false">Back</button
            ><button
              class="wb-button wb-primary"
              :disabled="busy || !proposedTasks.length || !acknowledgedUncertainty"
            >
              {{ busy ? 'Saving…' : 'Create reviewed plan' }}
            </button>
          </div>
          <p v-if="error" class="wb-message wb-error" role="alert">{{ error }}</p>
        </form></template
      >
    </DashboardDialog>
    <DashboardDialog
      v-if="passCandidate && section === 'opportunities'"
      title="Pass on this opportunity"
      @close="passCandidate = null"
      ><form
        class="wb-form"
        @submit.prevent="decideOpportunity(passCandidate!, 'pass', passReason)"
      >
        <p>{{ passCandidate.title }}</p>
        <label
          >Reason <span class="wb-muted">optional</span
          ><textarea
            v-model="passReason"
            rows="3"
            maxlength="1000"
            placeholder="For example, travel requirements or not relevant to my work."
          />
        </label>
        <p class="wb-muted">
          This changes your discovery shortlist only. It will not delete an existing application,
          completed work, or tasks. You can undo it.
        </p>
        <p v-if="error" class="wb-message wb-error" role="alert">{{ error }}</p>
        <button class="wb-button wb-primary" :disabled="busy">Pass for now</button>
      </form></DashboardDialog
    >
    <DashboardDialog
      v-if="taskEditor"
      :title="taskEditor.id ? 'Edit task' : 'Add a next step'"
      @close="taskEditor = null"
      ><form class="wb-form" @submit.prevent="saveTask">
        <label>Task<input v-model="taskEditor.title" required maxlength="240" autofocus /></label
        ><label>Notes<textarea v-model="taskEditor.notes" rows="3" /></label>
        <label
          >Related work<select v-model="taskParent" :disabled="Boolean(taskEditor.id)">
            <option value="">Standalone task</option>
            <optgroup label="Applications">
              <option v-for="p in pursuits" :key="p.id" :value="`pursuit:${p.id}`">
                {{ p.title }}
              </option>
            </optgroup>
            <optgroup label="Activities">
              <option v-for="a in activities" :key="a.id" :value="`activity:${a.id}`">
                {{ a.title }}
              </option>
            </optgroup>
          </select></label
        >
        <label v-if="tasks.some((t) => t.id !== taskEditor.id)"
          >Dependencies <span class="wb-muted">optional · choose existing tasks</span
          ><select v-model="taskEditor.dependsOn" multiple size="3">
            <option
              v-for="dependency in tasks.filter((t) => t.id !== taskEditor.id)"
              :key="dependency.id"
              :value="dependency.id"
            >
              {{ dependency.title }}{{ dependency.status === 'done' ? ' · done' : '' }}
            </option>
          </select></label
        >
        <div class="wb-formgrid">
          <label>Internal due date<input v-model="taskEditor.dueDate" type="date" /></label
          ><label
            >Estimated hours<input
              v-model.number="taskEditor.estimatedHours"
              type="number"
              min="0"
              max="500"
              step="0.5"
              placeholder="Unknown"
          /></label>
        </div>
        <label
          >Status<select v-model="taskEditor.status">
            <option value="todo">To do</option>
            <option value="doing">In progress</option>
            <option value="done">Completed</option>
          </select></label
        >
        <fieldset>
          <legend>Optional work session</legend>
          <p class="wb-muted">
            Your browser’s local time. This schedules work; it does not change an official cutoff.
          </p>
          <div class="wb-formgrid">
            <label>Start<input v-model="taskEditor.scheduledStart" type="datetime-local" /></label
            ><label>End<input v-model="taskEditor.scheduledEnd" type="datetime-local" /></label>
          </div>
        </fieldset>
        <p v-if="error" class="wb-message wb-error" role="alert">{{ error }}</p>
        <button class="wb-button wb-primary" :disabled="busy">
          {{ busy ? 'Saving…' : 'Save task' }}
        </button>
      </form></DashboardDialog
    >
    <DashboardDialog
      v-if="activityEditor"
      :title="editedActivity ? 'Edit activity' : 'Add an activity'"
      @close="activityEditor = false"
      ><form class="wb-form" @submit.prevent="saveActivity">
        <label>Name<input v-model="activityForm.title" required maxlength="240" /></label
        ><label>Question or purpose<textarea v-model="activityForm.goal" rows="3" /></label
        ><label>Your role<input v-model="activityForm.role" /></label
        ><label
          >Current milestone<input
            v-model="activityForm.milestone"
            placeholder="A useful next deliverable"
        /></label>
        <label
          >Status<select v-model="activityForm.status">
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select></label
        >
        <p class="wb-muted">
          Applications and project work are separate. Your activity can continue after a submission
          closes.
        </p>
        <p v-if="error" class="wb-message wb-error" role="alert">{{ error }}</p>
        <button class="wb-button wb-primary" :disabled="busy">
          {{ editedActivity ? 'Save activity' : 'Create activity' }}
        </button>
      </form></DashboardDialog
    >
    <DashboardDialog
      v-if="eventEditor"
      :title="eventEditor.id ? 'Edit calendar event' : 'Add calendar event'"
      @close="eventEditor = null"
      ><form class="wb-form" @submit.prevent="saveEvent">
        <label>Title<input v-model="eventEditor.title" required maxlength="240" /></label
        ><label
          >Type<select v-model="eventEditor.type">
            <option value="appointment">Appointment</option>
            <option value="program">Program attendance</option>
          </select></label
        >
        <div class="wb-formgrid">
          <label>Start<input v-model="eventEditor.start" type="datetime-local" required /></label
          ><label>End<input v-model="eventEditor.end" type="datetime-local" required /></label>
        </div>
        <p class="wb-muted">
          Browser-local time. To schedule task work without double counting, use the task editor
          instead.
        </p>
        <p v-if="error" class="wb-message wb-error" role="alert">{{ error }}</p>
        <button class="wb-button wb-primary" :disabled="busy">Save event</button>
      </form></DashboardDialog
    >
  </section>
</template>

<style scoped>
.workbench {
  --wb-ink: #efeee8;
  --wb-muted: #b0adb8;
  --wb-line: #ffffff13;
  --wb-gold: #d8b977;
  color: var(--wb-ink);
  font-family: Manrope, sans-serif;
  min-width: 0;
  animation: workbench-enter 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes workbench-enter {
  from {
    opacity: 0.5;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.wb-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 30px;
}
.wb-heading h2 {
  font-size: clamp(26px, 3vw, 38px);
  font-weight: 500;
  letter-spacing: -0.045em;
  margin: 8px 0;
}
.wb-heading p {
  margin: 0;
}
.wb-kicker {
  font-size: 11px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--wb-gold);
}
.wb-kicker span {
  color: var(--wb-muted);
  letter-spacing: 0;
  text-transform: none;
}
.wb-muted {
  color: var(--wb-muted);
  font-size: 13px;
  line-height: 1.65;
}
.wb-surface {
  background: #191a21ee;
  border: 1px solid var(--wb-line);
  border-radius: 18px;
  padding: 24px;
  box-shadow:
    0 8px 26px #0000000b,
    inset 0 1px 0 #ffffff04;
  min-width: 0;
}
.wb-surface h3 {
  font-size: 18px;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: -0.025em;
  margin: 0 0 12px;
}
.wb-surface h4 {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 12px;
}
.wb-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 44px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #ffffff20;
  border-radius: 10px;
  color: var(--wb-ink);
  background: #ffffff04;
  text-decoration: none;
  cursor: pointer;
  transition:
    background 0.18s,
    transform 0.18s,
    border-color 0.18s;
}
.wb-button:hover:not(:disabled) {
  background: #ffffff0c;
  border-color: #ffffff40;
  transform: translateY(-1px);
}
.wb-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.wb-primary {
  background: #d8b977;
  color: #16141b;
  border-color: #d8b977;
}
.wb-primary:hover:not(:disabled) {
  background: #e7ca8c;
  border-color: #e7ca8c;
}
.wb-text {
  border: 0;
  background: none;
  padding: 6px 0;
  color: var(--wb-gold);
  font-size: 12px;
  min-height: 36px;
  text-decoration: none;
  cursor: pointer;
}
.wb-text:hover {
  text-decoration: underline;
}
.wb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.wb-label {
  font-size: 10px;
  background: #ffffff07;
  border: 1px solid var(--wb-line);
  border-radius: 5px;
  padding: 4px 7px;
  color: #cbc7d3;
  line-height: 1.5;
}
.wb-message {
  background: #d8b9770d;
  border: 1px solid #d8b9772b;
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 20px;
}
.wb-message button {
  margin-left: 8px;
  text-decoration: underline;
}
.wb-error {
  background: #f2959510;
  border-color: #f2959530;
  color: #ffc4b8;
}
.wb-warning {
  color: #e6c491;
  font-size: 12px;
  line-height: 1.6;
}
.wb-loading {
  min-height: 100px;
  color: var(--wb-muted);
}
.wb-today {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 20px;
}
.wb-next {
  background: radial-gradient(ellipse at 100% 0, #9378b619, transparent 70%), #191a21ee;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 285px;
}
.wb-next h3 {
  font-size: 25px;
  max-width: 540px;
  margin-top: 12px;
}
.wb-next .wb-button {
  margin-top: 20px;
}
.wb-weekstrip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin: 20px 0;
}
.wb-weekstrip button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 3px;
  border-radius: 9px;
  background: #ffffff03;
  min-height: 78px;
  border: 1px solid transparent;
  cursor: pointer;
}
.wb-weekstrip button:hover {
  border-color: #d8b97740;
}
.wb-weekstrip span {
  font-size: 10px;
  color: var(--wb-muted);
}
.wb-weekstrip strong {
  font-weight: 400;
  font-size: 17px;
}
.wb-weekstrip i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--wb-gold);
}
.wb-queue {
  grid-column: 1/-1;
}
.wb-task {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 0;
  border-top: 1px solid var(--wb-line);
}
.wb-task:first-of-type {
  margin-top: 14px;
}
.wb-check {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: 1px solid #ffffff17;
  border-radius: 50%;
  background: #ffffff02;
  cursor: pointer;
  color: var(--wb-gold);
  font-size: 21px;
}
.wb-task-title {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  cursor: pointer;
}
.wb-task-title strong {
  font-size: 13px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.wb-task-title span {
  font-size: 11px;
  color: var(--wb-muted);
}
.wb-done .wb-task-title strong {
  text-decoration: line-through;
  color: var(--wb-muted);
}
.wb-draft-action {
  border-top: 1px solid var(--wb-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 12px;
  margin-top: 12px;
  font-size: 13px;
}
.wb-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
  gap: 16px;
}
.wb-segments,
.wb-viewbar {
  display: flex;
  gap: 4px;
  border: 1px solid var(--wb-line);
  background: #12131a99;
  border-radius: 12px;
  padding: 4px;
  width: max-content;
  max-width: 100%;
}
.wb-segments button,
.wb-viewbar button {
  border: 0;
  background: none;
  border-radius: 8px;
  padding: 11px 18px;
  min-height: 42px;
  color: var(--wb-muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  text-transform: capitalize;
}
.wb-segments button[aria-pressed='true'],
.wb-viewbar button[aria-pressed='true'] {
  background: #d8b97713;
  color: var(--wb-gold);
  box-shadow: inset 0 0 0 1px #d8b97722;
}
.wb-viewbar {
  margin-bottom: 20px;
}
.wb-search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.workbench input,
.workbench textarea,
.workbench select {
  border: 1px solid #ffffff1b;
  border-radius: 9px;
  background: #111218;
  color: var(--wb-ink);
  padding: 11px 12px;
  min-height: 44px;
  font: inherit;
  font-size: 13px;
  max-width: 100%;
  color-scheme: dark;
}
.wb-form input,
.wb-form textarea,
.wb-form select {
  border: 1px solid #ffffff1b;
  border-radius: 9px;
  background: #111218;
  color: var(--wb-ink);
  padding: 11px 12px;
  min-height: 44px;
  font: inherit;
  font-size: 13px;
  color-scheme: dark;
}
.wb-form .wb-acknowledgement {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.65;
  padding: 12px;
  border: 1px solid #d8b97725;
  border-radius: 10px;
}
.wb-form .wb-acknowledgement input {
  width: 20px;
  height: 20px;
  min-height: 20px;
  padding: 0;
  flex-shrink: 0;
  accent-color: var(--wb-gold);
}
.wb-form :is(input, textarea, select, button):focus-visible {
  outline: 2px solid var(--wb-gold);
  outline-offset: 3px;
}
.wb-month {
  margin-bottom: 20px;
}
.wb-event-add {
  margin-bottom: 16px;
}
.wb-outcome {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
  color: var(--wb-muted);
}
.wb-fixed {
  border-left: 2px solid #d8b97770;
}
.wb-search > input {
  flex: 1;
  min-width: 0;
}
.wb-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--wb-muted);
  white-space: nowrap;
}
.wb-toggle input {
  min-height: unset;
  accent-color: var(--wb-gold);
}
.wb-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}
.wb-inspect {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  color: var(--wb-gold);
  font-size: 12px;
  transition: color 180ms ease;
}
.wb-inspect svg {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.wb-inspect:hover svg {
  transform: translateX(3px);
}
@media (prefers-reduced-motion: reduce) {
  .wb-inspect svg {
    transition: none;
    transform: none;
  }
}
.wb-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 24px;
  color: var(--wb-muted);
  font-size: 12px;
}
.wb-empty {
  padding: 40px;
  color: var(--wb-muted);
  font-size: 14px;
  line-height: 1.7;
}
.wb-calendar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.wb-calendar .wb-surface {
  padding: 18px;
  min-height: 160px;
}
.wb-calendar-item {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff04;
  border: 1px solid var(--wb-line);
  padding: 12px;
  width: 100%;
  border-radius: 10px;
  margin: 12px 0;
  font-size: 12px;
}
.wb-calendar-item strong {
  font-weight: 500;
}
.wb-calendar-item small {
  color: var(--wb-muted);
}
.wb-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.wb-milestones {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 20px 0;
}
.wb-milestones > div {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  border-left: 2px solid #d8b97744;
  background: #ffffff03;
  flex: 1;
  min-width: 180px;
  font-size: 12px;
}
.wb-milestones > div > span:not(.wb-label) {
  color: var(--wb-muted);
  line-height: 1.6;
}
.wb-milestones a {
  color: var(--wb-gold);
}
.wb-board {
  display: grid;
  grid-template-columns: repeat(5, minmax(180px, 1fr));
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 16px;
}
.wb-board > section > h3 {
  font-size: 12px;
  color: var(--wb-muted);
  font-weight: 500;
  margin: 0 0 15px;
}
.wb-board .wb-surface {
  padding: 16px;
  margin-bottom: 12px;
}
.wb-board select {
  width: 100%;
  font-size: 11px;
}
.wb-activities {
  display: grid;
  grid-template-columns: minmax(230px, 0.8fr) minmax(0, 1.4fr);
  gap: 20px;
  align-items: start;
}
.wb-activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.wb-activity {
  text-align: left;
  width: 100%;
  cursor: pointer;
  transition: border-color 0.2s;
}
.wb-activity[aria-pressed='true'] {
  border-color: #d8b97765;
  background: #d8b97709;
}
.wb-activity-detail > h3 {
  font-size: 25px;
}
.wb-details {
  display: flex;
  flex-direction: column;
  gap: 17px;
  margin: 25px 0;
}
.wb-details > div {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 15px;
  font-size: 13px;
  line-height: 1.65;
}
.wb-details dt {
  color: var(--wb-muted);
}
.wb-details dd {
  margin: 0;
}
.wb-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.wb-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: #d8d4df;
}
.wb-form input,
.wb-form textarea,
.wb-form select {
  width: 100%;
}
.wb-formgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}
.wb-form fieldset {
  padding: 16px;
  border: 1px solid var(--wb-line);
  border-radius: 10px;
}
.wb-form legend {
  font-size: 11px;
  color: var(--wb-muted);
  padding: 0 6px;
}
.wb-review-task {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.wb-dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.wb-source {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 15px 0;
  border-top: 1px solid var(--wb-line);
  font-size: 12px;
}
.wb-source span {
  color: var(--wb-muted);
}
.wb-source a {
  color: var(--wb-gold);
}
.wb-subheading {
  margin-top: 30px !important;
}
.wb-contribution {
  border-top: 1px solid var(--wb-line);
  padding: 20px 0;
  font-size: 13px;
}
.wb-contribution small {
  display: block;
  margin-top: 12px;
}
.wb-capacity {
  font-size: 11px;
  color: var(--wb-muted);
  border-top: 1px solid var(--wb-line);
  padding-top: 12px;
}
.wb-capacity > div {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.wb-capacity input {
  width: 95px;
}
.wb-capacity .wb-button {
  min-height: 38px;
  padding: 5px 12px;
}
.wb-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.workbench :is(button, a, input, select, textarea):focus-visible {
  outline: 2px solid var(--wb-gold);
  outline-offset: 3px;
}
@media (max-width: 1050px) {
  .wb-today {
    grid-template-columns: 1fr;
  }
  .wb-queue {
    grid-column: auto;
  }
  .wb-results {
    grid-template-columns: 1fr;
  }
  .wb-activities {
    grid-template-columns: 1fr;
  }
  .wb-activity-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .wb-calendar {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 560px) {
  .wb-heading {
    align-items: flex-start;
    gap: 12px;
  }
  .wb-heading > .wb-button {
    padding: 9px 12px;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .wb-heading .wb-muted {
    font-size: 12px;
  }
  .wb-surface {
    padding: 19px;
  }
  .wb-search {
    flex-wrap: wrap;
  }
  .wb-toggle {
    width: 100%;
    padding: 5px;
  }
  .wb-task > .wb-muted {
    display: none;
  }
  .wb-row {
    flex-wrap: wrap;
    gap: 8px;
  }
  .wb-calendar,
  .wb-activity-list {
    grid-template-columns: 1fr;
  }
  .wb-formgrid {
    grid-template-columns: 1fr;
  }
  .wb-details > div {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  .wb-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .wb-viewbar {
    width: 100%;
  }
  .wb-viewbar button {
    flex: 1;
    padding: 9px 5px;
    font-size: 11px;
  }
  .wb-draft-action {
    flex-direction: column;
    align-items: flex-start;
  }
  .wb-next h3 {
    font-size: 22px;
  }
  .wb-board {
    grid-template-columns: repeat(5, minmax(220px, 1fr));
  }
  .wb-pagination {
    padding: 20px 0;
    gap: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
  }
  .wb-button:hover:not(:disabled) {
    transform: none;
  }
}
</style>
