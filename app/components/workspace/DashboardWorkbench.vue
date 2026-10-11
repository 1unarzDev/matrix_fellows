<script setup lang="ts">
import DashboardDialog from './DashboardDialog.vue'
import DashboardUrlCapture from './DashboardUrlCapture.vue'
import DashboardTaskToggle from './DashboardTaskToggle.vue'
import TodayCommandCenter from './TodayCommandCenter.vue'
import SocietyConnectionCloud from './SocietyConnectionCloud.vue'
import type {
  OpportunityDecision,
  OpportunityCapturePreview,
} from '#shared/types/dashboard-opportunities'
import type { OutreachWorkspace } from '#shared/types/outreach'
import type { Opportunity, OpportunitySearchResult } from '#shared/types/content'
import { getTimeline } from '#shared/utils/opportunity-lifecycle'
import type { DashboardPlan, PlanTask, PlanActivity, PlanDate, PlanPursuit } from '#shared/types/dashboard'
import { planWorkload, publishedTimezone } from '#shared/utils/dashboard-planning'
import {
  opportunityDisciplines,
  opportunityKinds,
  opportunityStages,
  opportunityStatuses,
  opportunityFilterLabels,
} from '#shared/data/opportunity-filters'

const props = defineProps<{
  workspace: OutreachWorkspace
  section: 'today' | 'opportunities'
}>()
const canManageSources = computed(() => ['officer', 'admin'].includes(props.workspace.member.role))
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
} = useFetch<DashboardPlan>('/api/workspace/plan', { server: false })
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
const catalogTransition = ref<'next' | 'previous'>('next')
const catalogResultsStage = ref<HTMLElement | null>(null)
const catalogResultsStageHeight = ref<string | undefined>(undefined)
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
  window.removeEventListener('pointermove', quickDateFromPoint)
  window.removeEventListener('pointerup', finishQuickDrag)
  window.removeEventListener('pointercancel', finishQuickDrag)
})
const includeClosed = ref(queryText('past') === '1')
const savedOnly = ref(queryText('saved') === '1')
const showPassed = ref(queryText('passed') === '1')
const filtersOpen = ref(false)
const filterKeys = Object.keys(opportunityFilterLabels)
const filterRouteKey = (key: string) => (key === 'mode' ? 'participation' : key)
const filterValues = (key: string) => {
  const value = route.query[filterRouteKey(key)]
  return (Array.isArray(value) ? value : value ? [value] : []).map(String)
}
const filterSelected = (key: string, value: string) => filterValues(key).includes(value)
function toggleFilter(key: string, value: string) {
  const values = filterValues(key)
  queryPatch({
    [filterRouteKey(key)]: values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value],
  })
}
const activeFilters = computed(() =>
  filterKeys.flatMap((key) =>
    filterValues(key).map((value) => ({
      key,
      value,
      label: opportunityFilterLabels[key]?.[value] || value,
      id: `${key}:${value}`,
    }))
  ),
)
function clearFilters() {
  queryPatch(Object.fromEntries(filterKeys.map((key) => [filterRouteKey(key), undefined])))
}
watch(
  () => filterKeys.map((key) => filterValues(key).join('|')).join(';'),
  () => void loadCatalog(1),
)
const lastDecision = ref<OpportunityDecision | null>(null)
const { data: decisionData, refresh: refreshDecisions } = useFetch<{
  decisions: OpportunityDecision[]
}>('/api/workspace/opportunity-decisions', { server: false })
const decisions = computed(() => decisionData.value?.decisions || [])
const selected = ref<Opportunity | null>(null)
const pursuing = ref(false)
const acknowledgedUncertainty = ref(false)
const proposedTasks = ref<{ title: string }[]>([])
const taskEditor = ref<any>(null)
const taskDialog = ref<{ celebrate: () => void; close: () => void } | null>(null)
const taskParent = computed({
  get: () =>
    taskEditor.value?.activityId
      ? `activity:${taskEditor.value.activityId}`
      : taskEditor.value?.pursuitId
        ? `pursuit:${taskEditor.value.pursuitId}`
        : taskEditor.value?.opportunityId
          ? `opportunity:${taskEditor.value.opportunityId}`
          : '',
  set: (value: string) => {
    if (!taskEditor.value) return
    if (value !== taskParent.value) taskEditor.value.milestoneKey = null
    taskEditor.value.activityId = value.startsWith('activity:') ? value.slice(9) : null
    taskEditor.value.pursuitId = value.startsWith('pursuit:') ? value.slice(8) : null
    taskEditor.value.opportunityId = value.startsWith('opportunity:') ? value.slice(12) : null
    taskEditor.value.connectionDirty = true
  },
})
const taskMilestone = computed({
  get: () => taskEditor.value?.milestoneKey || '',
  set: (value: string) => {
    if (!taskEditor.value) return
    taskEditor.value.milestoneKey = value || null
    taskEditor.value.connectionDirty = true
    const [date] = value.split('|')
    if (!date) return
    selectQuickDate(date)
    setTaskCalendarMonth(date)
  },
})
const eventEditor = ref<any>(null)
const quickSelecting = ref(false)
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
    if (searchChanged) await loadCatalog(1, restoredSearch)
    await restoreSelection()
  },
)
const savedOpportunities = useSavedOpportunities()
const saves = savedOpportunities.ids
const taskSavedOpportunityRecords = ref<Opportunity[]>([])
const savedTaskOpportunities = computed(() =>
  [...new Set([...saves.value, taskEditor.value?.opportunityId].filter(Boolean) as string[])]
    .map((id) => {
      const item =
        catalog.value.find((candidate) => candidate.id === id) ||
        taskSavedOpportunityRecords.value.find((candidate) => candidate.id === id)
      return { id, title: item?.title || 'Saved opportunity' }
    })
    .filter((item) => !pursuits.value.some((pursuit) => pursuit.opportunityId === item.id)),
)
async function loadTaskSavedOpportunities() {
  try {
    const result = await $fetch<{ items: Opportunity[] }>('/api/workspace/catalog-saves', {
      query: { page: 1, pageSize: 50 },
    })
    taskSavedOpportunityRecords.value = result.items || []
  } catch {
    // Existing IDs remain selectable with a compact fallback label.
  }
}
watch(
  () => [props.workspace.member.userId, props.workspace.catalogSaves] as const,
  ([owner, value]) => {
    savedOpportunities.setAccount(owner, value || [])
  },
  { immediate: true },
)
watch(savedOnly, () => void loadCatalog(1))
watch(
  () => [saves.value.join('|'), savedOpportunities.pending.value] as const,
  () => {
    if (savedOnly.value && !savedOpportunities.pending.value) void loadCatalog(1)
  },
)
const tasks = computed(() => ledger.value?.tasks || [])
const pursuits = computed(() => ledger.value?.pursuits || [])
const activities = computed(() => ledger.value?.activities || [])
const events = computed(() => ledger.value?.events || [])
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
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
const quickCalendarDays = computed<(typeof calendarDays.value[number] | null)[]>(() => {
  const first = new Date(`${calendarMonth.value.toISOString().slice(0, 7)}-01T12:00:00Z`)
  return [...Array.from({ length: first.getUTCDay() }, () => null), ...calendarDays.value]
})
const selectedPursuit = computed(() => {
  const id = taskEditor.value?.pursuitId
  return id ? pursuits.value.find((p) => p.id === id) || null : null
})
const taskMilestones = computed(() => {
  const opportunity = [...catalog.value, ...taskSavedOpportunityRecords.value].find(
    (item) => item.id === taskEditor.value?.opportunityId,
  )
  const savedMilestones = opportunity
    ? getTimeline(opportunity)
        .filter((point) => !point.superseded && /^\d{4}-\d{2}-\d{2}$/.test(point.date))
        .map((point) => ({ value: `${point.date}|${point.label}`, date: point.date, label: point.label }))
    : []
  const milestones = selectedPursuit.value ? (selectedPursuit.value.officialDates || [])
    .filter((point) => point.localDate && /^\d{4}-\d{2}-\d{2}$/.test(point.localDate))
    .map((point) => ({
      value: `${point.localDate}|${point.wording}`,
      date: point.localDate as string,
      label: point.wording,
    })) : savedMilestones
  const existing = taskEditor.value?.milestoneKey
  if (existing && !milestones.some((milestone) => milestone.value === existing)) {
    const [date, ...label] = existing.split('|')
    milestones.unshift({ value: existing, date, label: label.join('|') || 'Saved milestone' })
  }
  return milestones
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
const scheduledHours = computed(() => {
  const end = new Date(`${today}T12:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 7)
  return ledger.value
    ? planWorkload(ledger.value, chicagoMidnight(today), chicagoMidnight(end.toISOString().slice(0, 10))).scheduledHours
    : 0
})
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
  return 'No date set'
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
  if (page !== catalogPage.value) {
    catalogTransition.value = page > catalogPage.value ? 'next' : 'previous'
  }
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
      query: {
        q: search,
        page,
        pageSize: 30,
        ...Object.fromEntries(filterKeys.map((key) => [key, filterValues(key)])),
      },
      signal: catalogAbort.signal,
    })
    const personal = savedMode
      ? { items: [] as Opportunity[] }
      : await $fetch<{ items: Opportunity[] }>('/api/workspace/capture/personal', {
          query: { q: search },
          signal: catalogAbort.signal,
        })
    if (version !== catalogRequestVersion) return
    if (result.unavailable)
      throw new Error('Catalog is temporarily unavailable. Try again or open the public catalog.')
    catalog.value = [...personal.items, ...result.items]
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
          (includeClosed.value || filterValues('status').length > 0 || actionable(o)) &&
          (showPassed.value ||
            !decisions.value.some((d) => d.opportunityId === o.id && d.decision === 'pass')),
      ),
)
function holdCatalogResultsStage() {
  const stage = catalogResultsStage.value
  if (!stage) return
  catalogResultsStageHeight.value = `${Math.ceil(stage.getBoundingClientRect().height)}px`
}
function releaseCatalogResultsStage() {
  catalogResultsStageHeight.value = undefined
}
function releaseCatalogResultsStageIfEmpty() {
  if (!results.value.length) releaseCatalogResultsStage()
}
onMounted(async () => {
  window.addEventListener('pointermove', quickDateFromPoint)
  window.addEventListener('pointerup', finishQuickDrag)
  window.addEventListener('pointercancel', finishQuickDrag)
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
    },
    ...(item.internship?.applicationMaterials || [])
      .slice(0, 5)
      .map((title) => ({ title: `Prepare ${title}` })),
    {
      title: 'Review requirements and complete the external submission',
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
      .map((t) => ({ title: t.title })),
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
  void loadTaskSavedOpportunities()
  if (task) {
    const dueDate = task.dueDate || localDay(task.scheduledStart)
    const rangeEnd = task.scheduledEnd
      ? localDay(new Date(Date.parse(task.scheduledEnd) - 1).toISOString())
      : dueDate
    taskEditor.value = {
      ...task,
      quick: true,
      expectedVersion: task.version,
      originalDueDate: task.dueDate || null,
      dueDate,
      rangeEnd: rangeEnd || dueDate,
      milestoneKey: task.milestoneKey || null,
      connectionDirty: false,
      calendarDirty: false,
      saved: false,
    }
    setTaskCalendarMonth(dueDate)
    return
  }
  taskEditor.value = {
    quick: true,
    title: '',
    dueDate: '',
    rangeEnd: '',
    activityId: activityId || null,
    pursuitId: null,
    opportunityId: null,
    milestoneKey: null,
    connectionDirty: true,
    calendarDirty: false,
    saved: false,
    status: 'todo',
  }
  setTaskCalendarMonth(today)
}
function editQuickTask(date = today) {
  void loadTaskSavedOpportunities()
  taskEditor.value = {
    quick: true,
    title: '',
    dueDate: date,
    rangeEnd: date,
    status: 'todo',
    activityId: null,
    pursuitId: null,
    opportunityId: null,
    milestoneKey: null,
    connectionDirty: true,
    calendarDirty: true,
    saved: false,
  }
  setTaskCalendarMonth(date)
}
function setTaskCalendarMonth(date: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
  const target = new Date(`${date}T12:00:00Z`)
  const base = new Date(`${today.slice(0, 7)}-01T12:00:00Z`)
  calendarOffset.value =
    (target.getUTCFullYear() - base.getUTCFullYear()) * 12 +
    target.getUTCMonth() - base.getUTCMonth()
}
const quickDragAnchor = ref('')
const quickDragMoved = ref(false)
function toggleQuickDrag(date: string) {
  if (!quickSelecting.value) return
  if (!taskEditor.value) return
  const anchor = quickDragAnchor.value || taskEditor.value.dueDate || date
  if (date !== anchor) quickDragMoved.value = true
  if (date < anchor) {
    taskEditor.value.dueDate = date
    taskEditor.value.rangeEnd = anchor
  } else {
    taskEditor.value.dueDate = anchor
    taskEditor.value.rangeEnd = date
  }
  taskEditor.value.calendarDirty = true
}
function finishQuickDrag() {
  quickSelecting.value = false
  quickDragAnchor.value = ''
  window.setTimeout(() => {
    quickDragMoved.value = false
  }, 0)
}
function selectQuickDate(date: string) {
  if (!taskEditor.value) return
  taskEditor.value.dueDate = date
  taskEditor.value.rangeEnd = date
  taskEditor.value.calendarDirty = true
}
function beginQuickDrag(event: PointerEvent, date: string) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  quickDragAnchor.value = date
  quickDragMoved.value = false
  quickSelecting.value = true
  selectQuickDate(date)
}
function quickDateFromPoint(event: PointerEvent) {
  if (!quickSelecting.value) return
  const element = document.elementFromPoint(event.clientX, event.clientY)
  const day = element?.closest<HTMLElement>('[data-quick-date]')?.dataset.quickDate
  if (day) toggleQuickDrag(day)
}
function quickTaskDate(date: string) {
  selectQuickDate(date)
}
function clickQuickDate(event: MouseEvent, date: string) {
  if (event.detail === 0 || !quickDragMoved.value) selectQuickDate(date)
}
function quickTaskIsSelected(date: string) {
  if (!taskEditor.value) return false
  const start = taskEditor.value.dueDate || ''
  const end = taskEditor.value.rangeEnd || start
  return date >= start && date <= end
}
function quickTaskCellClass(date: string) {
  if (!quickTaskIsSelected(date)) return {}
  const start = taskEditor.value.dueDate
  const end = taskEditor.value.rangeEnd || start
  const day = new Date(`${date}T12:00:00Z`)
  const last = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate()
  return {
    'quick-calendar__cell--selected': true,
    'quick-calendar__cell--range': start !== end,
    'quick-calendar__cell--start': date === start || day.getUTCDay() === 0 || day.getUTCDate() === 1,
    'quick-calendar__cell--end': date === end || day.getUTCDay() === 6 || day.getUTCDate() === last,
  }
}
function quickTaskRangeClass(date: string) {
  if (!taskEditor.value || !quickTaskIsSelected(date)) return {}
  const start = taskEditor.value.dueDate || ''
  const end = taskEditor.value.rangeEnd || start
  return {
    'quick-calendar__day--range-start': date === start,
    'quick-calendar__day--range-end': date === end,
  }
}
function quickTaskSession(task: any) {
  if (!task.dueDate) return
  const endDate = task.rangeEnd || task.dueDate
  const start = chicagoMidnight(task.dueDate)
  const following = new Date(`${endDate}T12:00:00Z`)
  following.setUTCDate(following.getUTCDate() + 1)
  return { scheduledStart: start, scheduledEnd: chicagoMidnight(following.toISOString().slice(0, 10)) }
}
async function saveTask() {
  const task = taskEditor.value
  if (!task?.title.trim() || task.saving || task.saved) return
  task.saving = true
  // The composer intentionally sends only the fields a person can act on. The
  // database keeps legacy planning columns for existing records, while their
  // editor no longer asks people to manage estimates, statuses or work sessions.
  const selectedDueDate = task.id && !task.calendarDirty
    ? task.originalDueDate || task.dueDate || null
    : task.rangeEnd || task.dueDate || null
  const input: Record<string, unknown> = task.id
    ? {
        ...taskInput(task),
        title: task.title,
        dueDate: selectedDueDate,
        ...(task.calendarDirty ? quickTaskSession(task) || {} : {}),
      }
    : { title: task.title, dueDate: selectedDueDate, ...(quickTaskSession(task) || {}) }
  const connections = {
    opportunityId: task.opportunityId || null,
    pursuitId: task.pursuitId || null,
    activityId: task.activityId || null,
    milestoneKey: task.milestoneKey || null,
  }
  const body = task.id
    ? {
        expectedVersion: task.version,
        task: input,
        ...(task.connectionDirty ? connections : {}),
      }
    : { task: input, ...connections }
  const saved = await request(
    task.id ? `/plan/tasks/${task.id}` : '/plan/tasks',
    task.id ? 'PATCH' : 'POST',
    body,
  )
  if (taskEditor.value !== task) return
  task.saving = false
  if (saved) {
    task.saved = true
    taskDialog.value?.celebrate()
    notice.value = 'Task saved.'
    window.setTimeout(() => {
      if (taskEditor.value === task) taskDialog.value?.close()
    }, 420)
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
async function toggleActivityStatus(activity: PlanActivity) {
  await request(`/plan/activities/${activity.id}`, 'PATCH', {
    expectedVersion: activity.version,
    activity: {
      title: activity.title,
      goal: activity.goal,
      role: activity.role,
      milestone: activity.milestone,
      status: activity.status === 'active' ? 'paused' : 'active',
    },
  })
  notice.value = activity.status === 'active' ? 'Project paused. You can bring it back whenever you need it.' : 'Project returned to your active orbit.'
}
function openPursuitOpportunity(pursuit: PlanPursuit) {
  mode.value = 'plan'
  view.value = 'timeline'
  emit('navigate', 'opportunities')
  notice.value = `${pursuit.title} is in your plan. Its milestones are now visible in the timeline.`
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
function pursuitTasks(id: string) {
  return tasks.value.filter((t) => t.pursuitId === id)
}
function sessionInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function openTask(task: any) {
  editTask(task)
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
function localDay(value?: string | Date | null) {
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
              : 'Opportunities'
          }}
        </h2>
        <p class="wb-muted">
          {{
            section === 'today'
              ? 'Due dates and tasks for the day.'
              : 'Review saved opportunities and plan the next step.'
          }}
        </p>
      </div>
      <button v-if="section === 'opportunities'" class="wb-button wb-primary" @click="editQuickTask()">
        + Add task
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

    <TodayCommandCenter
      v-if="section === 'today'"
      :tasks="tasks"
      :pursuits="pursuits"
      :activities="activities"
      :events="events"
      :today="today"
      :saved-opportunity-count="saves.length"
      @add-task="editQuickTask"
      @open-task="openTask"
      @toggle-task="completeTask"
      @toggle-activity="toggleActivityStatus"
      @open-opportunity="openPursuitOpportunity"
    />

    <template v-if="section === 'opportunities'">
      <div class="wb-toolbar">
        <div class="wb-segments" aria-label="Opportunity mode">
          <button :aria-pressed="mode === 'discover'" @click="mode = 'discover'">Discover</button
          ><button :aria-pressed="mode === 'plan'" @click="mode = 'plan'">My plan</button>
        </div>
        <div class="wb-toolbar__actions">
          <a v-if="mode === 'plan'" class="wb-button" href="/api/workspace/plan/export" download
            >Export calendar ↓</a
          >
          <DashboardUrlCapture v-else @inspect="inspectOpportunity" @saved="notice = $event" />
          <SocietyConnectionCloud
            v-if="canManageSources"
            :officer="canManageSources"
            trigger-only
          />
        </div>
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
          ><button type="button" class="wb-button" @click="filtersOpen = true">
            <SiteIcon name="filter" :size="15" />Filters<span v-if="activeFilters.length">
              · {{ activeFilters.length }}</span
            >
          </button>
          <label class="wb-toggle"
            ><input v-model="includeClosed" type="checkbox" />Include past cycles</label
          >
          <label class="wb-toggle"><input v-model="savedOnly" type="checkbox" />Saved only</label>
          <label class="wb-toggle" v-if="decisions.some((decision) => decision.decision === 'pass')"
            ><input v-model="showPassed" type="checkbox" />Include previously passed</label
          >
        </form>
        <TransitionGroup
          name="wb-filter-chip"
          tag="div"
          class="wb-filter-chips"
          aria-label="Active opportunity filters"
        >
          <button
            v-for="filter in activeFilters"
            :key="filter.id"
            type="button"
            class="wb-filter-chip"
            :aria-label="`Remove ${filter.label} filter`"
            @click="toggleFilter(filter.key, filter.value)"
          >
            {{ filter.label }}<SiteIcon name="close" :size="12" aria-hidden="true" />
          </button>
        </TransitionGroup>
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
        <div
          ref="catalogResultsStage"
          class="wb-results-stage"
          :style="catalogResultsStageHeight ? { minHeight: catalogResultsStageHeight } : undefined"
        >
          <Transition
            :name="`wb-results-${catalogTransition}`"
            mode="out-in"
            @before-leave="holdCatalogResultsStage"
            @after-leave="releaseCatalogResultsStageIfEmpty"
            @after-enter="releaseCatalogResultsStage"
            @enter-cancelled="releaseCatalogResultsStage"
            @leave-cancelled="releaseCatalogResultsStage"
          >
            <div
              v-if="results.length"
              :key="`${catalogSource}:${savedOnly}:${catalogPage}:${results.map((item) => item.id).join(',')}`"
              class="wb-results"
              :aria-busy="catalogPending"
            >
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
                  <div class="wb-card-actions">
                    <button type="button" class="wb-inspect" @click="inspectOpportunity(item)">
                      Details <SiteIcon name="right" :size="14" aria-hidden="true" />
                    </button>
                    <button
                      v-if="decisions.some((d) => d.opportunityId === item.id && d.decision === 'pass')"
                      class="wb-text"
                      :disabled="busy"
                      @click="decideOpportunity(item, 'clear')"
                    >
                      Undo pass
                    </button>
                    <OpportunitySaveButton :id="item.id" compact />
                  </div>
                </template>
              </OpportunityCard>
            </div>
          </Transition>
        </div>
        <div v-if="!catalogPending && !results.length" class="wb-surface wb-empty">
          <h3>No actionable results in this set.</h3>
          <p>Try another field, or include past cycles to watch for their next announcement.</p>
          <NuxtLink class="wb-text" to="/opportunities">Open the full catalog ↗</NuxtLink>
        </div>
        <div v-if="catalogSource === (savedOnly ? 'saved' : 'all')" class="wb-pagination">
          <button
            class="wb-pagination-control"
            aria-label="Previous opportunity page"
            :disabled="catalogPage <= 1 || catalogPending"
            @click="loadCatalog(catalogPage - 1)"
          ><SiteIcon name="right" :size="15" aria-hidden="true" class="wb-pagination-control__icon--previous" /><span
              >Previous</span
            ></button
          ><span>Page {{ catalogPage }} of {{ catalogPages }}</span
          ><button
            class="wb-pagination-control"
            aria-label="Next opportunity page"
            :disabled="catalogPage >= catalogPages || catalogPending"
            @click="loadCatalog(catalogPage + 1)"
          ><span>Next</span><SiteIcon name="right" :size="15" aria-hidden="true" /></button>
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
            <DashboardTaskToggle
              :checked="task.status === 'done'"
              :label="`${task.status === 'done' ? 'Reopen' : 'Complete'} ${task.title}`"
              :disabled="busy"
              @toggle="completeTask(task)"
            /><button class="wb-task-title" @click="openTask(task)">
              <strong>{{ task.title }}</strong
              ><span>{{ taskReason(task) }}</span></button>
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
        <form class="wb-form" @submit.prevent="confirmPursuit">
          <label class="wb-acknowledgement"
            ><input v-model="acknowledgedUncertainty" type="checkbox" required />I understand that
            eligibility and availability are unconfirmed. My first step is to verify them before
            investing in an application.</label
          >
          <fieldset v-for="(task, index) in proposedTasks" :key="index" class="wb-review-task">
            <legend>Step {{ index + 1 }}</legend>
            <label>Task<input v-model="task.title" required maxlength="240" /></label>
            <button type="button" class="wb-text" @click="proposedTasks.splice(index, 1)">
              Remove suggestion
            </button>
          </fieldset>
          <button
            type="button"
            class="wb-button"
            @click="proposedTasks.push({ title: '' })"
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
      v-if="filtersOpen && section === 'opportunities'"
      title="Opportunity filters"
      compact
      @close="filtersOpen = false"
      ><div class="wb-filter-panel">
        <OpportunityFilterFields
          :disciplines="opportunityDisciplines"
          :kinds="opportunityKinds"
          :stages="opportunityStages"
          :statuses="opportunityStatuses"
          :selected="filterSelected"
          @toggle="toggleFilter"
        />
        <div class="wb-filter-footer">
          <button type="button" class="wb-button" @click="clearFilters">Clear filters</button>
          <button type="button" class="wb-button wb-primary" @click="filtersOpen = false">
            Show results
          </button>
        </div>
      </div></DashboardDialog
    >
    <DashboardDialog
      ref="taskDialog"
      v-if="taskEditor"
      :title="taskEditor.id ? 'Edit task' : 'Add task'"
      compact
      @close="taskEditor = null"
      ><form class="quick-task-form" @submit.prevent="saveTask">
        <label class="quick-task-form__title">Task name<input v-model="taskEditor.title" required maxlength="240" autofocus placeholder="Name this task" :disabled="taskEditor.saving || taskEditor.saved" /></label>
        <label class="quick-task-form__field">Connect to an opportunity <select v-model="taskParent" :disabled="taskEditor.saving || taskEditor.saved"><option value="">Personal task</option><option v-for="p in pursuits" :key="p.id" :value="`pursuit:${p.id}`">{{ p.title }}</option><option v-for="opportunity in savedTaskOpportunities" :key="`saved-${opportunity.id}`" :value="`opportunity:${opportunity.id}`">{{ opportunity.title }}<template v-if="opportunity.title === 'Saved opportunity'"> · {{ opportunity.id }}</template></option><optgroup v-if="activities.length" label="Projects"><option v-for="a in activities" :key="a.id" :value="`activity:${a.id}`">{{ a.title }}{{ a.milestone ? ` · ${a.milestone}` : '' }}</option></optgroup></select></label>
        <label v-if="taskMilestones.length" class="quick-task-form__field">Milestone <select v-model="taskMilestone" :disabled="taskEditor.saving || taskEditor.saved"><option value="">Choose a milestone (optional)</option><option v-for="milestone in taskMilestones" :key="milestone.value" :value="milestone.value">{{ milestone.label }} · {{ dateLabel(milestone.date) }}</option></select></label>
        <div class="quick-calendar" @pointermove="quickDateFromPoint" @pointerup="finishQuickDrag" @pointercancel="finishQuickDrag">
          <div class="quick-calendar__head"><button type="button" class="quick-calendar__arrow" aria-label="Previous month" :disabled="taskEditor.saving || taskEditor.saved" @click="calendarOffset--">←</button><strong>{{ calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }}</strong><button type="button" class="quick-calendar__arrow" aria-label="Next month" :disabled="taskEditor.saving || taskEditor.saved" @click="calendarOffset++">→</button></div>
          <div class="quick-calendar__grid"><span v-for="(label, index) in ['S','M','T','W','T','F','S']" :key="`${label}-${index}`" class="quick-calendar__label">{{ label }}</span><span v-for="(day, index) in quickCalendarDays" :key="day ? day.date : `quick-blank-${index}`" class="quick-calendar__cell" :class="day ? quickTaskCellClass(day.date) : {}"><button v-if="day" :data-quick-date="day.date" :data-date="day.date" :aria-label="`Select ${day.date}`" :aria-pressed="quickTaskIsSelected(day.date)" type="button" class="quick-calendar__day" :disabled="taskEditor.saving || taskEditor.saved" :class="{ 'quick-calendar__day--selected': quickTaskIsSelected(day.date), 'quick-calendar__day--today': day.date === today, ...quickTaskRangeClass(day.date) }" @pointerdown.prevent="beginQuickDrag($event, day.date)" @click="clickQuickDate($event, day.date)">{{ Number(day.date.slice(-2)) }}</button></span></div>
          <p class="quick-calendar__range">{{ dateLabel(taskEditor.dueDate) }}<span v-if="taskEditor.rangeEnd && taskEditor.rangeEnd !== taskEditor.dueDate"> → {{ dateLabel(taskEditor.rangeEnd) }}</span></p>
        </div>
        <p v-if="error" class="wb-message wb-error" role="alert">{{ error }}</p>
        <button class="quick-task-form__save" :disabled="busy || taskEditor.saving || taskEditor.saved">{{ taskEditor.saved ? 'Saved ✓' : busy || taskEditor.saving ? 'Saving…' : 'Save task' }}</button>
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
.wb-toolbar__actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;min-width:0}.wb-toolbar__actions .society-cloud{flex:0 0 auto}
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
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 11px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 20px;
  background:
    radial-gradient(32rem 10rem at 100% 0%, rgb(216 185 119 / 8%), transparent 70%),
    linear-gradient(135deg, rgb(244 241 233 / 5%), rgb(185 163 237 / 3%) 55%, transparent 90%),
    rgb(19 20 27 / 70%);
  box-shadow: inset 0 1px rgb(255 255 255 / 8%), 0 16px 44px rgb(5 5 10 / 18%);
  backdrop-filter: blur(22px) saturate(118%);
  transition: border-color 280ms ease, box-shadow 360ms ease, transform 360ms cubic-bezier(.22,1,.36,1);
}
.wb-search::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: url('/textures/glass-grain.svg') repeat;
  opacity: .09;
  mix-blend-mode: soft-light;
}
.wb-search:focus-within {
  border-color: rgb(216 185 119 / 42%);
  box-shadow: inset 0 1px rgb(255 255 255 / 10%), 0 0 0 4px rgb(216 185 119 / 8%), 0 20px 55px rgb(5 5 10 / 23%);
  transform: translateY(-1px);
}
.wb-search > * {
  position: relative;
  z-index: 1;
}
.workbench input:not([type='checkbox']),
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
.wb-form input:not([type='checkbox']),
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
  width: 22px;
  height: 22px;
  min-height: 22px;
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
  min-height: 48px;
  border-color: rgb(255 255 255 / 12%);
  border-radius: 14px;
  background: rgb(7 8 13 / 48%);
  box-shadow: inset 0 1px rgb(255 255 255 / 6%);
  transition: border-color 240ms ease, background 240ms ease, box-shadow 300ms ease;
}
.wb-search > input:hover {
  border-color: rgb(216 185 119 / 28%);
  background: rgb(7 8 13 / 60%);
}
.wb-search > input:focus {
  outline: none;
  border-color: rgb(216 185 119 / 62%);
  background: rgb(7 8 13 / 72%);
  box-shadow: 0 0 0 3px rgb(216 185 119 / 10%), inset 0 1px rgb(255 255 255 / 8%);
}
.wb-search > input::placeholder {
  color: rgb(176 173 184 / 72%);
}
.wb-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--wb-muted);
  white-space: nowrap;
  min-height: 44px;
}
.wb-toggle input {
  margin: 0;
}
.wb-filter-panel {
  max-width: 420px;
  margin: 0 auto;
}
.wb-filter-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 18px 0;
  border-top: 1px solid var(--wb-line);
  background: #191a22;
}
.wb-filter-chips {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.wb-filter-chips:has(button) {
  margin-top: 16px;
}
.wb-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid rgb(228 199 151 / 24%);
  border-radius: 999px;
  background: linear-gradient(135deg, rgb(244 241 233 / 4%), rgb(196 178 238 / 3%));
  color: var(--wb-ink);
  font-size: 12px;
  transition:
    border-color 220ms ease,
    color 220ms ease;
}
.wb-filter-chip:hover {
  border-color: var(--wb-gold);
  color: var(--wb-gold);
}
.wb-filter-chip-enter-active,
.wb-filter-chip-move {
  transition:
    opacity 200ms ease,
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.wb-filter-chip-leave-active {
  position: absolute;
  pointer-events: none;
  transition:
    opacity 160ms ease,
    transform 220ms ease;
}
.wb-filter-chip-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
.wb-filter-chip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .wb-filter-chip-enter-active,
  .wb-filter-chip-leave-active,
  .wb-filter-chip-move {
    transition: none;
    transform: none;
  }
}
.wb-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}
.wb-results-stage {
  min-height: clamp(260px, 28vw, 390px);
}
.wb-results-next-enter-active,
.wb-results-next-leave-active,
.wb-results-previous-enter-active,
.wb-results-previous-leave-active {
  transition:
    opacity 260ms ease,
    transform 440ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 260ms ease;
}
.wb-results-next-enter-from,
.wb-results-next-leave-to,
.wb-results-previous-enter-from,
.wb-results-previous-leave-to {
  opacity: 0;
  filter: blur(2px);
}
.wb-results-next-enter-from { transform: translate3d(18px, 0, 0); }
.wb-results-next-leave-to { transform: translate3d(-18px, 0, 0); }
.wb-results-previous-enter-from { transform: translate3d(-18px, 0, 0); }
.wb-results-previous-leave-to { transform: translate3d(18px, 0, 0); }
.wb-inspect {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--wb-line);
  border-radius: 999px;
  background: rgb(255 255 255 / 2%);
  color: var(--wb-gold);
  font-size: 12px;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}
.wb-card-actions {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.wb-inspect:hover {
  border-color: color-mix(in srgb, var(--wb-gold) 40%, transparent);
  background: color-mix(in srgb, var(--wb-gold) 5%, transparent);
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
  .wb-results-next-enter-active,
  .wb-results-next-leave-active,
  .wb-results-previous-enter-active,
  .wb-results-previous-leave-active,
  .wb-pagination-control,
  .wb-pagination-control svg {
    transition: none;
  }
  .wb-results-next-enter-from,
  .wb-results-next-leave-to,
  .wb-results-previous-enter-from,
  .wb-results-previous-leave-to {
    filter: none;
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
.wb-pagination-control {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 17px;
  border: 1px solid rgb(244 240 231 / 16%);
  border-radius: 999px;
  color: rgb(244 240 231 / 72%);
  background: linear-gradient(145deg, rgb(244 240 231 / 5.5%), rgb(13 27 36 / 32%));
  box-shadow: inset 0 1px rgb(255 255 255 / 4.5%);
  font-size: 12px;
  cursor: pointer;
  transition:
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 420ms ease,
    color 420ms ease,
    background-color 420ms ease,
    box-shadow 420ms ease;
}
.wb-pagination-control:not(:disabled):hover,
.wb-pagination-control:not(:disabled):focus-visible {
  transform: translate3d(0, -1px, 0) scale(1.02);
  border-color: color-mix(in srgb, var(--wb-gold) 48%, transparent);
  color: var(--wb-gold);
  background: linear-gradient(145deg, rgb(244 240 231 / 8%), rgb(216 185 119 / 7%));
  box-shadow: 0 8px 24px rgb(0 0 0 / 15%), 0 0 18px rgb(216 185 119 / 6%);
}
.wb-pagination-control:not(:disabled):active {
  transform: translate3d(0, 0, 0) scale(0.96);
  transition-duration: 80ms;
}
.wb-pagination-control:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}
.wb-pagination-control svg {
  transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.wb-pagination-control:not(:disabled):hover svg,
.wb-pagination-control:not(:disabled):focus-visible svg {
  transform: translate3d(3px, 0, 0);
}
.wb-pagination-control:not(:disabled):hover .wb-pagination-control__icon--previous,
.wb-pagination-control:not(:disabled):focus-visible .wb-pagination-control__icon--previous {
  transform: translate3d(-3px, 0, 0) rotate(180deg);
}
.wb-pagination-control__icon--previous {
  transform: rotate(180deg);
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
.quick-task-form { display:flex; flex-direction:column; gap:17px; min-width:min(100%,430px); padding:4px 2px 2px; }
.quick-task-form__title,.quick-task-form__field { position:relative; z-index:1; display:flex; flex-direction:column; gap:8px; color:#bcb5c8; font-size:11px; }
.quick-task-form__title input,.quick-task-form__field select { width:100%; min-height:48px; padding:0 14px; border:1px solid rgb(211 196 239 / 18%); border-radius:13px; background:rgb(255 255 255 / 4%); color:#f2edf5; font:inherit; outline:none; transition:border-color .3s,box-shadow .3s,background .3s; }
.quick-task-form__title input { font-size:13px; }.quick-task-form__title input::placeholder { color:#767180; }.quick-task-form__title input:focus,.quick-task-form__field select:focus { border-color:#d8b97780; background:rgb(216 185 119 / 6%); box-shadow:0 0 0 4px rgb(216 185 119 / 8%); }
.quick-task-form__field select option { background:#1d1a27; color:#f2edf5; }
.quick-calendar { position:relative; z-index:1; isolation:isolate; overflow:hidden; padding:17px; border:1px solid rgb(228 187 114 / 20%); border-radius:20px; background:radial-gradient(26rem 13rem at 100% 0%,rgb(228 187 114 / 8%),transparent 70%),rgb(244 241 233 / 3.5%); box-shadow:inset 0 1px rgb(255 255 255 / 6%),0 18px 45px rgb(0 0 0 / 12%); backdrop-filter:blur(18px) saturate(118%); }
.quick-calendar::before { content:''; position:absolute; inset:0; z-index:-1; pointer-events:none; background:url('/textures/glass-grain.svg') repeat; opacity:.1; mix-blend-mode:soft-light; }
.quick-calendar__head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; color:#e8d09b; font-size:12px; }.quick-calendar__arrow { display:grid; place-items:center; width:30px; height:30px; border:1px solid rgb(216 185 119 / 20%); border-radius:50%; background:transparent; color:#d8b977; cursor:pointer; transition:transform .3s,background .3s; }.quick-calendar__arrow:hover { transform:scale(1.1); background:rgb(216 185 119 / 10%); }
.quick-calendar__grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:5px; touch-action:none; }.quick-calendar__label { color:#777280; font-size:9px; text-align:center; }.quick-calendar__cell { position:relative; display:grid; place-items:center; min-height:34px; }.quick-calendar__cell--selected::before { content:''; position:absolute; inset:3px -3px; background:linear-gradient(180deg,rgb(228 187 114 / 18%),rgb(228 187 114 / 9%)); border-block:1px solid rgb(228 187 114 / 28%); pointer-events:none; transition:background .22s ease,box-shadow .22s ease; box-shadow:0 0 16px rgb(228 187 114 / 7%); }
.quick-calendar__cell--start::before { left:0; border-radius:9px 0 0 9px; }
.quick-calendar__cell--end::before { right:0; border-radius:0 9px 9px 0; }
.quick-calendar__cell--start.quick-calendar__cell--end::before { border-radius:9px; }
.quick-calendar__cell--range .quick-calendar__day--selected { border-color:transparent; background:transparent; box-shadow:none; }
.quick-calendar__cell--range .quick-calendar__day--range-start,.quick-calendar__cell--range .quick-calendar__day--range-end { border-color:rgb(228 187 114 / 55%); background:rgb(228 187 114 / 13%); box-shadow:0 0 15px rgb(228 187 114 / 12%); }.quick-calendar__day { position:relative; display:grid; place-items:center; width:100%; min-height:34px; border:1px solid transparent; border-radius:9px; background:transparent; color:#c3bdca; font-size:11px; cursor:pointer; transition:transform .3s,background .3s,border-color .3s,color .3s; }.quick-calendar__day:hover { transform:translateY(-2px); border-color:rgb(228 187 114 / 42%); color:#fff3ce; }.quick-calendar__day:focus-visible { outline:2px solid rgb(228 187 114 / 74%); outline-offset:2px; }.quick-calendar__day--selected { background:rgb(228 187 114 / 13%); border-color:rgb(228 187 114 / 55%); color:#fff0c5; box-shadow:0 0 15px rgb(228 187 114 / 12%),inset 0 1px rgb(255 255 255 / 8%); }.quick-calendar__day--range-start::before,.quick-calendar__day--range-end::after { content:''; position:absolute; top:50%; width:8px; height:2px; background:#e7c779; box-shadow:0 0 9px #e7c779aa; }.quick-calendar__day--range-start::before { left:-7px; }.quick-calendar__day--range-end::after { right:-7px; }.quick-calendar__day--today { box-shadow:inset 0 -2px #d8b977; }.quick-calendar__range { min-height:17px; margin:13px 0 0; color:#a79ead; font-size:10px; }.quick-calendar__range span { color:#e2c486; }
.quick-task-form__save { position:relative; z-index:1; display:flex; align-items:center; justify-content:center; gap:9px; min-height:49px; border:1px solid rgb(216 185 119 / 57%); border-radius:15px; background:linear-gradient(110deg,rgb(216 185 119 / 25%),rgb(185 163 237 / 16%)); color:#f5dfaf; font-size:12px; cursor:pointer; box-shadow:0 0 25px rgb(216 185 119 / 10%); transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s,background .45s; }.quick-task-form__save:hover:not(:disabled) { transform:translateY(-3px); background:linear-gradient(110deg,rgb(216 185 119 / 34%),rgb(185 163 237 / 23%)); box-shadow:0 12px 30px rgb(216 185 119 / 17%); }.quick-task-form__save:active:not(:disabled) { transform:scale(.98); }.quick-task-form__save-star { font-size:17px; }
@media (prefers-reduced-motion:reduce) { .quick-task-form__save,.quick-calendar__day,.quick-calendar__arrow { transition:none; } }
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
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 10px;
    border-radius: 18px;
  }
  .wb-search > input {
    grid-column: 1 / -1;
    width: 100%;
  }
  .wb-search > .wb-button {
    width: 100%;
    justify-content: center;
  }
  .wb-toggle {
    width: auto;
    padding: 0;
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
