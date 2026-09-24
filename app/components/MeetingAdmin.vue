<script setup lang="ts">
import type { CalendarOpportunitySelection, MeetingEvent, MeetingResource, Opportunity } from '#shared/types/content'

const emit = defineEmits<{ saved: []; authorized: [] }>()
const unlocked = ref(false)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const message = ref('')
const meetings = ref<MeetingEvent[]>([])
const editing = ref<MeetingEvent | null>(null)
const creating = ref(false)
const confirmingDelete = ref(false)
const topicsText = ref('')
const resourcesText = ref('')
const celebrating = ref(false)
const adminView = ref<'meetings' | 'calendar'>('meetings')
const calendarSearch = ref('')
const calendarItems = ref<Array<{ opportunity: Opportunity; selection: CalendarOpportunitySelection }>>([])
const savingCalendarId = ref('')
const visibleCalendarItems = computed(() => {
  const query = calendarSearch.value.trim().toLowerCase()
  return calendarItems.value.filter(({ opportunity }) => !query || [opportunity.title, opportunity.kind, opportunity.discipline, ...(opportunity.aliases || [])].join(' ').toLowerCase().includes(query))
})

const errorMessage = (cause: unknown) =>
  (cause as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage ||
  (cause as { statusMessage?: string })?.statusMessage ||
  'Something went wrong. Please try again.'

const load = async (showLoading = false) => {
  if (showLoading) loading.value = true
  error.value = ''
  try {
    const [response, calendar] = await Promise.all([
      $fetch<{ meetings: MeetingEvent[] }>('/api/meeting-admin/meetings'),
      $fetch<{ opportunities: Array<{ opportunity: Opportunity; selection: CalendarOpportunitySelection }> }>('/api/meeting-admin/calendar-opportunities'),
    ])
    meetings.value = response.meetings
    calendarItems.value = calendar.opportunities || []
    unlocked.value = true
    emit('authorized')
  } catch (cause) {
    const status =
      (cause as { statusCode?: number; response?: { status?: number } })?.statusCode ||
      (cause as { response?: { status?: number } })?.response?.status
    if (status !== 401) error.value = errorMessage(cause)
    unlocked.value = false
  } finally {
    loading.value = false
  }
}

const unlock = async (pin: string) => {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/meeting-admin/unlock', { method: 'POST', body: { pin } })
    celebrating.value = true
    const reduced = import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches
    await new Promise((resolve) => setTimeout(resolve, reduced ? 120 : 820))
    await load()
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    celebrating.value = false
    busy.value = false
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 88)

const edit = (meeting?: MeetingEvent) => {
  const today = new Date().toISOString().slice(0, 10)
  creating.value = !meeting
  const next: MeetingEvent = meeting
    ? JSON.parse(JSON.stringify(meeting))
    : {
        id: `meeting-${today}`,
        title: '',
        summary: '',
        date: today,
        time: 'During lunch',
        timezone: 'America/Chicago',
        location: 'Martin HS · room to be confirmed',
        state: 'tentative',
        topics: [''],
        resources: [],
        url: '',
        published: true,
      }
  editing.value = next
  topicsText.value = next.topics.join('\n')
  resourcesText.value = next.resources
    .map(({ title, url, note }) => `${title} | ${url} | ${note}`)
    .join('\n')
  confirmingDelete.value = false
  error.value = ''
  message.value = ''
}

const parseResources = (): MeetingResource[] =>
  resourcesText.value.split('\n').flatMap((line) => {
    if (!line.trim()) return []
    const [title = '', url = '', ...note] = line.split('|').map((part) => part.trim())
    return [{ title, url, note: note.join(' | ') }]
  })

const save = async () => {
  if (!editing.value) return
  editing.value.topics = topicsText.value
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
  editing.value.resources = parseResources()
  if (creating.value)
    editing.value.id = `${slugify(editing.value.title) || 'meeting'}-${editing.value.date}`
  busy.value = true
  error.value = ''
  try {
    if (creating.value)
      await $fetch('/api/meeting-admin/meetings', { method: 'POST', body: editing.value })
    else
      await $fetch(`/api/meeting-admin/meetings/${encodeURIComponent(editing.value.id)}`, {
        method: 'PATCH',
        body: editing.value,
      })
    await load()
    editing.value = null
    message.value = creating.value ? 'Meeting scheduled.' : 'Meeting updated.'
    emit('saved')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

const remove = async () => {
  if (!editing.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch(`/api/meeting-admin/meetings/${encodeURIComponent(editing.value.id)}`, {
      method: 'DELETE',
    })
    await load()
    editing.value = null
    message.value = 'Meeting deleted.'
    emit('saved')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

const saveCalendarSelection = async (
  item: { opportunity: Opportunity; selection: CalendarOpportunitySelection },
  changes: Partial<CalendarOpportunitySelection>,
) => {
  const previous = { ...item.selection }
  const next = { ...item.selection, ...changes }
  if (!next.includeDeadlines && !next.includeEvents) {
    if (changes.includeDeadlines === false) next.includeEvents = true
    else next.includeDeadlines = true
  }
  item.selection = next
  savingCalendarId.value = item.opportunity.id
  error.value = ''
  try {
    const response = await $fetch<{ selection: CalendarOpportunitySelection }>(
      `/api/meeting-admin/calendar-opportunities/${encodeURIComponent(item.opportunity.id)}`,
      { method: 'PATCH', body: next },
    )
    item.selection = response.selection
    message.value = next.enabled
      ? `${item.opportunity.title} is shown on the calendar when verified dates are available.`
      : `${item.opportunity.title} is hidden from the calendar.`
    emit('saved')
  } catch (cause) {
    item.selection = previous
    error.value = errorMessage(cause)
  } finally {
    savingCalendarId.value = ''
  }
}

onMounted(() => load(true))
</script>

<template>
  <div>
    <Transition name="meeting-access" mode="out-in">
      <p v-if="loading" key="loading" role="status" class="py-10 text-sm text-paper/48">
        Opening the editing room…
      </p>
      <MeetingPinGate
        v-else-if="!unlocked"
        :busy="busy"
        :error="error"
        :success="celebrating"
        @unlock="unlock"
      />
      <div v-else key="editor" class="meeting-admin-editor">
        <div class="mb-7">
          <p class="text-[9px] uppercase tracking-[.2em] text-acid">Meeting studio</p>
          <h3 class="mt-2 font-display text-2xl tracking-[-.04em]">The gathering schedule.</h3>
        </div>

        <div v-if="!editing" class="meeting-admin-tabs" aria-label="Meeting editor section">
          <button type="button" :class="{ 'meeting-admin-tab--active': adminView === 'meetings' }" class="meeting-admin-tab" @click="adminView = 'meetings'">Meetings</button>
          <button type="button" :class="{ 'meeting-admin-tab--active': adminView === 'calendar' }" class="meeting-admin-tab" @click="adminView = 'calendar'">Calendar opportunities</button>
          <span class="meeting-admin-tabs__glide" :class="{ 'meeting-admin-tabs__glide--calendar': adminView === 'calendar' }" aria-hidden="true" />
        </div>

        <p
          v-if="message"
          role="status"
          class="mb-5 rounded-xl bg-acid/[.07] px-4 py-3 text-xs text-acid"
        >
          {{ message }}
        </p>
        <p
          v-if="error"
          role="alert"
          class="mb-5 rounded-xl bg-rose-300/[.07] px-4 py-3 text-xs text-rose-200"
        >
          {{ error }}
        </p>

        <Transition v-if="adminView === 'meetings' || editing" name="meeting-editor" mode="out-in">
          <form v-if="editing" key="editor" class="space-y-5" @submit.prevent="save">
            <button type="button" class="text-xs text-acid" @click="editing = null">
              ← All meetings
            </button>
            <div class="meeting-admin-surface space-y-4">
              <AdminField v-model="editing.title" label="Meeting title" />
              <AdminField v-model="editing.summary" label="Short summary" multiline />
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminField v-model="editing.date" label="Date" type="date" />
                <AdminField v-model="editing.time" label="Time label" />
              </div>
              <div>
                <p class="mb-2.5 text-[11px] tracking-wide text-paper/55">Status</p>
                <ThemedSelect
                  :model-value="editing.state"
                  :options="[
                    { label: 'Confirmed', value: 'confirmed' },
                    { label: 'Pending · unconfirmed', value: 'tentative' },
                  ]"
                  label="Meeting status"
                  full-width
                  @update:model-value="editing.state = $event as MeetingEvent['state']"
                />
              </div>
              <AdminField v-model="editing.location" label="Location" />
              <AdminField v-model="editing.timezone" label="Timezone" />
              <AdminField v-model="topicsText" label="Meeting points · one per line" multiline />
              <AdminField
                v-model="resourcesText"
                label="Resources · one per line: Title | URL | Note"
                multiline
              />
              <AdminField
                v-model="editing.url"
                label="Optional meeting / RSVP URL"
                placeholder="https://"
              />
              <label class="flex min-h-11 items-center gap-3 text-sm text-paper/65">
                <input v-model="editing.published" type="checkbox" class="h-4 w-4 accent-acid" />
                Visible on the public calendar
              </label>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button
                :disabled="busy"
                class="rounded-full bg-acid px-6 py-3 text-sm text-ink disabled:opacity-40"
              >
                {{ busy ? 'Saving…' : creating ? 'Schedule meeting' : 'Save changes' }}
              </button>
              <template v-if="!creating">
                <button
                  v-if="!confirmingDelete"
                  type="button"
                  class="px-3 py-2 text-xs text-paper/45 hover:text-rose-200"
                  @click="confirmingDelete = true"
                >
                  Delete
                </button>
                <span v-else class="flex flex-wrap items-center gap-2 text-xs text-rose-100">
                  Delete this meeting?
                  <button
                    type="button"
                    class="rounded-full border border-rose-200/30 px-3 py-2"
                    @click="remove"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    class="px-2 py-2 text-paper/55"
                    @click="confirmingDelete = false"
                  >
                    Cancel
                  </button>
                </span>
              </template>
            </div>
          </form>

          <div v-else key="list">
            <button
              class="mb-6 rounded-full border border-acid/35 bg-acid/[.06] px-5 py-3 text-xs text-acid hover:-translate-y-0.5 hover:border-acid/60"
              @click="edit()"
            >
              + Schedule a meeting
            </button>
            <div class="grid gap-3">
              <button
                v-for="meeting in meetings"
                :key="meeting.id"
                type="button"
                class="meeting-admin-row group"
                @click="edit(meeting)"
              >
                <span class="meeting-admin-row__date">{{
                  meeting.date.slice(5).replace('-', '·')
                }}</span>
                <span class="min-w-0 flex-1 text-left">
                  <span class="block truncate text-sm text-paper/85">{{ meeting.title }}</span>
                  <span
                    class="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-paper/38"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :class="
                        meeting.state === 'confirmed'
                          ? 'bg-[#e4bb72] shadow-[0_0_7px_#e4bb72]'
                          : 'rotate-45 rounded-[1px] border border-[#b7a2e2]'
                      "
                    />
                    {{ meeting.state === 'confirmed' ? 'Confirmed' : 'Pending' }} ·
                    {{ meeting.location }}
                  </span>
                </span>
                <SiteIcon
                  :size="13"
                  class="text-paper/35 transition-transform duration-500 group-hover:translate-x-1"
                />
              </button>
            </div>
            <p v-if="!meetings.length" class="py-10 text-center text-sm text-paper/40">
              No meetings yet. Schedule the first one.
            </p>
          </div>
        </Transition>
        <Transition v-else name="meeting-editor" mode="out-in">
          <section key="calendar" aria-labelledby="calendar-opportunity-editor-title">
            <div class="mb-5">
              <h4 id="calendar-opportunity-editor-title" class="font-display text-xl tracking-[-.03em]">Club calendar routes</h4>
              <p class="mt-2 text-xs leading-5 text-paper/45">Choose catalog routes and whether their verified deadlines, presentation dates, or both appear. The opportunity monitor owns the dates.</p>
            </div>
            <label class="meeting-admin-search">
              <SiteIcon name="search" :size="14" />
              <span class="sr-only">Search calendar opportunities</span>
              <input v-model="calendarSearch" type="search" placeholder="Search competitions, internships, programs…" />
            </label>
            <div class="mt-4 grid gap-3">
              <article v-for="item in visibleCalendarItems" :key="item.opportunity.id" class="calendar-admin-row" :class="{ 'calendar-admin-row--enabled': item.selection.enabled }">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h5 class="text-sm text-paper/85">{{ item.opportunity.title }}</h5>
                    <span v-if="!(item.opportunity.milestones || []).some((milestone) => !milestone.superseded && (milestone.kind === 'deadline' || milestone.kind === 'event'))" class="calendar-admin-awaiting">Awaiting official date</span>
                  </div>
                  <p class="mt-1 text-[10px] uppercase tracking-[.11em] text-paper/35">{{ item.opportunity.kind }} · {{ item.opportunity.edition || item.opportunity.lifecycle || 'current route' }}</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" class="calendar-admin-chip" :class="{ 'calendar-admin-chip--active': item.selection.enabled }" :disabled="savingCalendarId === item.opportunity.id" @click="saveCalendarSelection(item, { enabled: !item.selection.enabled })">
                      <span class="calendar-admin-switch"><span /></span>{{ item.selection.enabled ? 'On calendar' : 'Hidden' }}
                    </button>
                    <button type="button" class="calendar-admin-chip" :class="{ 'calendar-admin-chip--active': item.selection.includeDeadlines }" :disabled="savingCalendarId === item.opportunity.id" @click="saveCalendarSelection(item, { includeDeadlines: !item.selection.includeDeadlines })">
                      <span class="choice-signal choice-signal--deadline" />Deadlines
                    </button>
                    <button type="button" class="calendar-admin-chip" :class="{ 'calendar-admin-chip--active': item.selection.includeEvents }" :disabled="savingCalendarId === item.opportunity.id" @click="saveCalendarSelection(item, { includeEvents: !item.selection.includeEvents })">
                      <span class="choice-signal choice-signal--event" />Event dates
                    </button>
                  </div>
                </div>
              </article>
              <p v-if="!visibleCalendarItems.length" class="py-10 text-center text-sm text-paper/40">No catalog routes match that search.</p>
            </div>
          </section>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.meeting-admin-surface {
  border: 1px solid rgb(244 241 233 / 9%);
  border-radius: 1.5rem;
  padding: 1.1rem;
  background: rgb(244 241 233 / 3.5%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 4%);
  backdrop-filter: blur(18px);
}
.meeting-access-enter-active,
.meeting-access-leave-active {
  transition:
    opacity 360ms ease,
    translate 680ms cubic-bezier(0.16, 1.22, 0.3, 1),
    scale 680ms cubic-bezier(0.16, 1.22, 0.3, 1);
}
.meeting-access-enter-from {
  opacity: 0;
  translate: 0 -18px;
  scale: 0.965;
}
.meeting-access-leave-to {
  opacity: 0;
  translate: 0 34px;
  scale: 0.94;
}
.meeting-admin-editor {
  transform-origin: 50% 0;
}
.meeting-admin-tabs { position:relative; display:grid; grid-template-columns:1fr 1.35fr; gap:.2rem; margin-bottom:1.5rem; padding:.25rem; border:1px solid rgb(244 241 233 / 8%); border-radius:999px; background:rgb(244 241 233 / 2.5%); }
.meeting-admin-tab { position:relative; z-index:1; min-height:2.75rem; border-radius:999px; padding:.6rem .9rem; color:rgb(244 241 233 / 42%); font-size:.7rem; transition:color 220ms ease,transform 420ms cubic-bezier(.16,1,.3,1); }
.meeting-admin-tab:hover,.meeting-admin-tab:focus-visible,.meeting-admin-tab--active { color:rgb(244 241 233 / 88%); transform:translateY(-1px); }
.meeting-admin-tabs__glide { position:absolute; top:.25rem; bottom:.25rem; left:.25rem; width:calc((100% - .7rem) / 2.35); border-radius:999px; background:linear-gradient(120deg,rgb(228 187 114 / 10%),rgb(196 178 238 / 7%)); box-shadow:inset 0 0 0 1px rgb(228 187 114 / 16%),0 5px 18px rgb(0 0 0 / 10%); transition:translate 560ms cubic-bezier(.16,1.15,.3,1),width 560ms cubic-bezier(.16,1.15,.3,1); }
.meeting-admin-tabs__glide--calendar { width:calc((100% - .7rem) * 1.35 / 2.35); translate:calc((100% / 1.35) + .2rem) 0; }
.meeting-admin-search { display:flex; min-height:3rem; align-items:center; gap:.7rem; border:1px solid rgb(244 241 233 / 9%); border-radius:1rem; padding:0 1rem; color:rgb(196 178 238 / 65%); background:rgb(244 241 233 / 2.5%); transition:border-color 260ms ease,background-color 260ms ease,box-shadow 340ms ease; }
.meeting-admin-search:focus-within { border-color:rgb(196 178 238 / 28%); background:rgb(196 178 238 / 4%); box-shadow:0 0 24px rgb(196 178 238 / 5%); }
.meeting-admin-search input { min-width:0; flex:1; outline:0; color:rgb(244 241 233 / 85%); background:transparent; font-size:.75rem; }
.meeting-admin-search input::placeholder { color:rgb(244 241 233 / 30%); }
.calendar-admin-row { display:flex; min-width:0; border:1px solid rgb(244 241 233 / 7%); border-radius:1.25rem; padding:1rem; background:rgb(244 241 233 / 2%); transition:transform 480ms cubic-bezier(.16,1,.3,1),border-color 280ms ease,background-color 280ms ease; }
.calendar-admin-row:hover { transform:translateY(-1px); border-color:rgb(196 178 238 / 18%); }
.calendar-admin-row--enabled { background:linear-gradient(120deg,rgb(228 187 114 / 3%),rgb(196 178 238 / 3%)); }
.calendar-admin-awaiting { border:1px dashed rgb(244 241 233 / 13%); border-radius:999px; padding:.25rem .45rem; color:rgb(244 241 233 / 38%); font-size:.55rem; letter-spacing:.08em; text-transform:uppercase; }
.calendar-admin-chip { display:inline-flex; min-height:2.2rem; align-items:center; gap:.45rem; border:1px solid rgb(244 241 233 / 8%); border-radius:999px; padding:.45rem .65rem; color:rgb(244 241 233 / 38%); background:rgb(244 241 233 / 1.5%); font-size:.62rem; transition:color 180ms ease,border-color 220ms ease,background-color 220ms ease,transform 420ms cubic-bezier(.16,1,.3,1); }
.calendar-admin-chip:hover,.calendar-admin-chip:focus-visible { transform:translateY(-1px); color:rgb(244 241 233 / 70%); }
.calendar-admin-chip--active { border-color:rgb(196 178 238 / 20%); color:rgb(244 241 233 / 78%); background:rgb(196 178 238 / 5%); }
.calendar-admin-switch { display:flex; width:1.35rem; height:.72rem; align-items:center; border-radius:999px; padding:.12rem; background:rgb(244 241 233 / 9%); transition:background-color 260ms ease; }
.calendar-admin-switch span { width:.48rem; height:.48rem; border-radius:999px; background:rgb(244 241 233 / 35%); transition:translate 420ms cubic-bezier(.16,1.25,.3,1),background-color 260ms ease,box-shadow 260ms ease; }
.calendar-admin-chip--active .calendar-admin-switch { background:rgb(228 187 114 / 20%); }
.calendar-admin-chip--active .calendar-admin-switch span { translate:.62rem 0; background:#e4bb72; box-shadow:0 0 7px rgb(228 187 114 / 50%); }
.choice-signal { width:.32rem;height:.32rem;border:1px solid currentColor; }
.choice-signal--deadline { color:#c4b2ee;transform:rotate(45deg); }
.choice-signal--event { color:#91b9d9;border-radius:999px;background:currentColor; }
.meeting-admin-row {
  display: flex;
  min-height: 4.75rem;
  width: 100%;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgb(244 241 233 / 8%);
  border-radius: 1.25rem;
  padding: 0.9rem 1rem;
  background: rgb(244 241 233 / 2.5%);
  transition:
    transform 520ms cubic-bezier(0.16, 1.2, 0.3, 1),
    border-color 300ms ease,
    background-color 300ms ease;
}
.meeting-admin-row:hover {
  transform: translateY(-2px);
  border-color: rgb(197 192 235 / 25%);
  background: rgb(197 192 235 / 5%);
}
.meeting-admin-row__date {
  display: grid;
  width: 2.7rem;
  height: 2.7rem;
  place-items: center;
  border-radius: 0.9rem;
  background: rgb(244 241 233 / 4%);
  font-family: var(--font-mono, monospace);
  font-size: 0.67rem;
  color: rgb(244 241 233 / 50%);
}
.meeting-editor-enter-active,
.meeting-editor-leave-active {
  transition:
    opacity 260ms ease,
    transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
}
.meeting-editor-enter-from {
  opacity: 0;
  transform: translateX(10px);
}
.meeting-editor-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .meeting-admin-row,
  .meeting-admin-tab,
  .meeting-admin-tabs__glide,
  .calendar-admin-row,
  .calendar-admin-chip,
  .calendar-admin-switch,
  .calendar-admin-switch span,
  .meeting-access-enter-active,
  .meeting-access-leave-active,
  .meeting-editor-enter-active,
  .meeting-editor-leave-active {
    transition: none;
  }
}
</style>
