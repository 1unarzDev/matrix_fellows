<script setup lang="ts">
import type { CalendarOpportunityEntry, MeetingEvent } from '#shared/types/content'
import { meetingDisplayStatus } from '#shared/data/meetings'

const props = withDefaults(
  defineProps<{
    meetings: MeetingEvent[]
    calendarEntries?: CalendarOpportunityEntry[]
    initialMeetingId?: string
    showArchiveLink?: boolean
  }>(),
  { showArchiveLink: true, calendarEntries: () => [] },
)
const emit = defineEmits<{ select: [meeting: MeetingEvent] }>()

const sorted = computed(() => [...props.meetings].sort((a, b) => a.date.localeCompare(b.date)))
const initial = computed(
  () => sorted.value.find((meeting) => meeting.id === props.initialMeetingId) || sorted.value[0],
)
const cursor = ref(new Date(`${initial.value?.date || '2026-09-01'}T12:00:00Z`))
const direction = ref<'forward' | 'backward'>('forward')
type CalendarDialogItem = { type: 'meeting'; meeting: MeetingEvent } | { type: 'opportunity'; entry: CalendarOpportunityEntry }
const dialogItem = ref<CalendarDialogItem | null>(null)
const dialogDateItems = ref<CalendarDialogItem[]>([])
const closeButton = ref<HTMLButtonElement | null>(null)
const mounted = ref(false)
let returnTarget: HTMLElement | null = null
let previousBodyOverflow = ''
let appWasInert = false
let modalActive = false

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    cursor.value,
  ),
)
const monthKey = computed(
  () =>
    `${cursor.value.getUTCFullYear()}-${String(cursor.value.getUTCMonth() + 1).padStart(2, '0')}`,
)
const meetingsByDate = computed(
  () => new Map(props.meetings.map((meeting) => [meeting.date, meeting])),
)
const entriesByDate = computed(() => {
  const result = new Map<string, CalendarOpportunityEntry[]>()
  for (const entry of props.calendarEntries) result.set(entry.date, [...(result.get(entry.date) || []), entry])
  return result
})
const nextMeetingId = computed(
  () => sorted.value.find((meeting) => meetingDisplayStatus(meeting) !== 'past')?.id,
)
const days = computed(() => {
  const year = cursor.value.getUTCFullYear()
  const month = cursor.value.getUTCMonth()
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: Array<{ date: string; day: number; meeting?: MeetingEvent; entries: CalendarOpportunityEntry[] } | null> = Array.from(
    { length: firstWeekday },
    () => null,
  )
  for (let day = 1; day <= count; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ date, day, meeting: meetingsByDate.value.get(date), entries: entriesByDate.value.get(date) || [] })
  }
  while (cells.length % 7) cells.push(null)
  return cells
})

const moveMonth = (amount: number) => {
  direction.value = amount > 0 ? 'forward' : 'backward'
  cursor.value = new Date(
    Date.UTC(cursor.value.getUTCFullYear(), cursor.value.getUTCMonth() + amount, 1, 12),
  )
}
const selectMeeting = (meeting: MeetingEvent, event?: Event) => {
  returnTarget = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  emit('select', meeting)
  const sameDate: CalendarDialogItem[] = [
    { type: 'meeting', meeting },
    ...(entriesByDate.value.get(meeting.date) || []).map((entry) => ({ type: 'opportunity' as const, entry })),
  ]
  dialogDateItems.value = sameDate
  dialogItem.value = sameDate[0]!
  if (import.meta.client) {
    const app = document.getElementById('__nuxt')
    previousBodyOverflow = document.body.style.overflow
    appWasInert = app?.hasAttribute('inert') || false
    modalActive = true
    app?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    nextTick(() => closeButton.value?.focus())
  }
}
const selectEntries = (entries: CalendarOpportunityEntry[], event?: Event) => {
  if (!entries.length) return
  returnTarget = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  dialogDateItems.value = entries.map((entry) => ({ type: 'opportunity', entry }))
  dialogItem.value = dialogDateItems.value[0]!
  if (import.meta.client) {
    const app = document.getElementById('__nuxt')
    previousBodyOverflow = document.body.style.overflow
    appWasInert = app?.hasAttribute('inert') || false
    modalActive = true
    app?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    nextTick(() => closeButton.value?.focus())
  }
}
const closeDialog = () => {
  dialogItem.value = null
  dialogDateItems.value = []
  if (import.meta.client) {
    const app = document.getElementById('__nuxt')
    if (!appWasInert) app?.removeAttribute('inert')
    document.body.style.overflow = previousBodyOverflow
    modalActive = false
    nextTick(() => returnTarget?.focus())
  }
}
const trapDialogFocus = (event: KeyboardEvent) => {
  if (event.key !== 'Tab') return
  const panel = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
    '[data-meeting-dialog-panel]',
  )
  const controls = panel
    ? [...panel.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')]
    : []
  if (!controls.length) return
  const first = controls[0]!
  const last = controls.at(-1)!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (!modalActive) return
  if (!appWasInert) document.getElementById('__nuxt')?.removeAttribute('inert')
  document.body.style.overflow = previousBodyOverflow
})
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <div class="meeting-calendar-shell" :data-calendar-ready="mounted">
    <section class="meeting-calendar" aria-label="Meeting calendar">
      <div class="meeting-calendar__header">
        <div>
          <p class="text-[9px] uppercase tracking-[.17em] text-paper/35">Gathering calendar</p>
          <p class="mt-1 font-display text-lg tracking-[-.035em] text-paper">{{ monthLabel }}</p>
        </div>
        <div class="flex gap-1">
          <button
            class="meeting-calendar__nav"
            type="button"
            :aria-label="`Previous month from ${monthLabel}`"
            @click="moveMonth(-1)"
          >
            <SiteIcon name="right" :size="14" class="rotate-180" />
          </button>
          <button
            class="meeting-calendar__nav"
            type="button"
            :aria-label="`Next month from ${monthLabel}`"
            @click="moveMonth(1)"
          >
            <SiteIcon name="right" :size="14" />
          </button>
        </div>
      </div>

      <div
        class="mt-5 grid grid-cols-7 gap-1 text-center text-[8px] uppercase tracking-[.08em] text-paper/28"
        aria-hidden="true"
      >
        <span v-for="(day, index) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" :key="`${day}-${index}`">
          {{ day }}
        </span>
      </div>
      <div class="relative mt-2 min-h-[13.4rem] overflow-hidden">
        <Transition :name="`meeting-month-${direction}`" mode="out-in">
          <div
            :key="monthKey"
            class="grid grid-cols-7 gap-1.5"
            role="grid"
            :aria-label="monthLabel"
          >
            <div
              v-for="(cell, index) in days"
              :key="cell?.date || `blank-${index}`"
              class="aspect-square min-w-0"
              role="gridcell"
            >
              <button
                v-if="cell?.meeting || cell?.entries.length"
                type="button"
                class="meeting-day meeting-day--event"
                :class="[
                  cell.meeting ? `meeting-day--${meetingDisplayStatus(cell.meeting)}` : 'meeting-day--opportunity',
                  { 'meeting-day--next': cell.meeting?.id === nextMeetingId },
                ]"
                :aria-label="cell.meeting
                  ? `${cell.meeting.title}, ${cell.date}, ${meetingDisplayStatus(cell.meeting)}${cell.entries.length ? `, plus ${cell.entries.length} opportunity date${cell.entries.length === 1 ? '' : 's'}` : ''}`
                  : `${cell.entries.map((entry) => `${entry.opportunityTitle}: ${entry.milestoneTitle}`).join(', ')}, ${cell.date}`"
                @click="cell.meeting ? selectMeeting(cell.meeting, $event) : selectEntries(cell.entries, $event)"
              >
                <span>{{ cell.day }}</span>
                <span v-if="cell.meeting" class="meeting-day__signal" aria-hidden="true" />
                <span v-if="cell.entries.length" class="meeting-day__opportunity-signals" aria-hidden="true">
                  <span v-if="cell.entries.some((entry) => entry.kind === 'deadline')" class="meeting-day__opportunity meeting-day__opportunity--deadline" />
                  <span v-if="cell.entries.some((entry) => entry.kind === 'event')" class="meeting-day__opportunity meeting-day__opportunity--event" />
                </span>
              </button>
              <span v-else-if="cell" class="meeting-day"
                ><span>{{ cell.day }}</span></span
              >
            </div>
          </div>
        </Transition>
      </div>

      <div class="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[9px] text-paper/40">
        <span class="inline-flex items-center gap-1.5"
          ><span class="legend legend--next" />Next</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="legend legend--tentative" />Projected</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="legend legend--past" />Past</span
        >
        <span class="inline-flex items-center gap-1.5"><span class="legend legend--deadline" />Deadline</span>
        <span class="inline-flex items-center gap-1.5"><span class="legend legend--opportunity-event" />Competition / program</span>
      </div>
      <NuxtLink v-if="showArchiveLink" to="/meetings" class="meeting-calendar__archive"
        >Browse every gathering <SiteIcon name="right" :size="13"
      /></NuxtLink>
    </section>

    <Teleport to="body">
      <Transition name="meeting-dialog">
        <div
          v-if="dialogItem"
          class="meeting-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="dialogItem.type === 'meeting' ? dialogItem.meeting.title : `${dialogItem.entry.opportunityTitle}: ${dialogItem.entry.milestoneTitle}`"
          @keydown.esc.prevent="closeDialog"
          @keydown="trapDialogFocus"
        >
          <button
            class="meeting-dialog__backdrop"
            type="button"
            aria-label="Close meeting details"
            @click="closeDialog"
          />
          <div data-meeting-dialog-panel class="meeting-dialog__panel">
            <button
              ref="closeButton"
              type="button"
              class="meeting-dialog__close"
              aria-label="Close meeting details"
              @click="closeDialog"
            >
              <SiteIcon name="close" :size="17" />
            </button>
            <div v-if="dialogDateItems.length > 1" class="meeting-dialog__switcher" aria-label="Items on this date">
              <button
                v-for="item in dialogDateItems"
                :key="item.type === 'meeting' ? item.meeting.id : item.entry.id"
                type="button"
                class="meeting-dialog__choice"
                :class="{ 'meeting-dialog__choice--active': item === dialogItem }"
                @click="dialogItem = item"
              >
                <span :class="item.type === 'meeting' ? 'choice-signal--meeting' : `choice-signal--${item.entry.kind}`" class="choice-signal" />
                {{ item.type === 'meeting' ? 'Meeting' : item.entry.opportunityTitle }}
              </button>
            </div>
            <MeetingDetailPanel
              v-if="dialogItem.type === 'meeting'"
              :meeting="dialogItem.meeting"
              :status="meetingDisplayStatus(dialogItem.meeting)"
            />
            <CalendarEntryDetailPanel v-else :entry="dialogItem.entry" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.meeting-calendar {
  border: 1px solid color-mix(in srgb, var(--color-paper) 12%, transparent);
  border-radius: 1.5rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  background:
    radial-gradient(22rem 14rem at 0% 0%, rgb(224 183 104 / 6%), transparent 70%),
    color-mix(in srgb, var(--color-paper) 3.5%, transparent);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 5%),
    0 18px 55px rgb(0 0 0 / 12%);
  backdrop-filter: blur(18px) saturate(115%);
}
.meeting-calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.meeting-calendar__nav {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-paper) 12%, transparent);
  color: rgb(244 241 233 / 55%);
  background: color-mix(in srgb, var(--color-paper) 2.5%, transparent);
  transition:
    color 180ms ease,
    border-color 220ms ease,
    background-color 220ms ease,
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 320ms ease;
}
.meeting-calendar__nav:hover,
.meeting-calendar__nav:focus-visible {
  color: #e4bb72;
  border-color: rgb(228 187 114 / 35%);
  background: rgb(228 187 114 / 5%);
  box-shadow: 0 0 20px rgb(228 187 114 / 7%);
  transform: translate3d(0, -1px, 0) scale(1.025);
}
.meeting-day {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  place-items: center;
  border-radius: 999px;
  font-size: 0.65rem;
  color: rgb(244 241 233 / 30%);
}
.meeting-day--event {
  color: rgb(244 241 233 / 82%);
  background: rgb(244 241 233 / 3.5%);
  box-shadow: inset 0 0 0 1px rgb(244 241 233 / 9%);
  transition:
    color 180ms ease,
    background-color 240ms ease,
    transform 500ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 420ms ease;
}
.meeting-day--event:hover,
.meeting-day--event:focus-visible {
  color: #fffaf0;
  background: rgb(228 187 114 / 7%);
  box-shadow:
    inset 0 0 0 1px rgb(228 187 114 / 35%),
    0 0 22px rgb(228 187 114 / 10%);
  transform: translate3d(0, -2px, 0) scale(1.06);
}
.meeting-day__signal {
  position: absolute;
  right: 14%;
  bottom: 14%;
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 999px;
  background: #e4bb72;
  box-shadow: 0 0 8px rgb(228 187 114 / 70%);
}
.meeting-day__opportunity-signals {
  position: absolute;
  left: 12%;
  bottom: 12%;
  display: flex;
  align-items: center;
  gap: 0.18rem;
}
.meeting-day__opportunity {
  display: block;
  width: 0.28rem;
  height: 0.28rem;
}
.meeting-day__opportunity--deadline {
  border: 1px solid #c4b2ee;
  transform: rotate(45deg);
  box-shadow: 0 0 7px rgb(196 178 238 / 32%);
}
.meeting-day__opportunity--event {
  border-radius: 999px;
  background: #91b9d9;
  box-shadow: 0 0 7px rgb(145 185 217 / 44%);
}
.meeting-day--opportunity {
  color: rgb(244 241 233 / 64%);
  background: rgb(196 178 238 / 2.5%);
}
.meeting-day--tentative .meeting-day__signal {
  border: 1px solid #b7a2e2;
  border-radius: 0.06rem;
  background: transparent;
  box-shadow: 0 0 7px rgb(183 162 226 / 35%);
  transform: rotate(45deg);
}
.meeting-day--past .meeting-day__signal {
  width: 0.2rem;
  height: 0.2rem;
  background: #89938f;
  box-shadow: none;
}
.meeting-day--next {
  background: rgb(228 187 114 / 7%);
  box-shadow:
    inset 0 0 0 1px rgb(228 187 114 / 28%),
    0 0 16px rgb(228 187 114 / 6%);
}
.legend {
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 999px;
  background: #e4bb72;
  box-shadow: 0 0 7px rgb(228 187 114 / 55%);
}
.legend--tentative {
  border: 1px solid #b7a2e2;
  border-radius: 0.05rem;
  background: transparent;
  box-shadow: none;
  transform: rotate(45deg);
}
.legend--past {
  width: 0.22rem;
  height: 0.22rem;
  background: #89938f;
  box-shadow: none;
}
.legend--deadline {
  border: 1px solid #c4b2ee;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transform: rotate(45deg);
}
.legend--opportunity-event {
  background: #91b9d9;
  box-shadow: 0 0 7px rgb(145 185 217 / 45%);
}
.meeting-calendar__archive {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1rem;
  font-size: 0.68rem;
  color: rgb(228 187 114 / 75%);
  transition:
    color 180ms ease,
    gap 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.meeting-calendar__archive:hover,
.meeting-calendar__archive:focus-visible {
  color: #f4d49a;
  gap: 0.9rem;
}
.meeting-month-forward-enter-active,
.meeting-month-forward-leave-active,
.meeting-month-backward-enter-active,
.meeting-month-backward-leave-active {
  transition:
    opacity 220ms ease,
    translate 360ms cubic-bezier(0.16, 1, 0.3, 1);
}
.meeting-month-forward-enter-from,
.meeting-month-backward-leave-to {
  opacity: 0;
  translate: 12px 0;
}
.meeting-month-forward-leave-to,
.meeting-month-backward-enter-from {
  opacity: 0;
  translate: -12px 0;
}
.meeting-dialog {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
}
.meeting-dialog__backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: rgb(5 8 8 / 76%);
  backdrop-filter: blur(12px);
}
.meeting-dialog__panel {
  position: relative;
  width: min(46rem, 100%);
  max-height: min(88dvh, 52rem);
  overflow: auto;
  overscroll-behavior: contain;
  filter: drop-shadow(0 30px 70px rgb(0 0 0 / 45%));
}
.meeting-dialog__panel :deep(.meeting-detail__header) {
  padding-right: 3.25rem;
}
.meeting-dialog__switcher {
  position: relative;
  z-index: 3;
  display: flex;
  gap: 0.35rem;
  margin: 0 3.9rem -0.8rem 0.8rem;
  padding-top: 0.8rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.meeting-dialog__switcher::-webkit-scrollbar { display: none; }
.meeting-dialog__choice {
  display: inline-flex;
  min-height: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgb(244 241 233 / 9%);
  border-radius: 999px;
  padding: 0.5rem 0.75rem;
  color: rgb(244 241 233 / 45%);
  background: rgb(10 14 14 / 58%);
  backdrop-filter: blur(12px);
  font-size: 0.6rem;
  transition: color 180ms ease, border-color 220ms ease, background-color 220ms ease, transform 420ms cubic-bezier(.16,1,.3,1);
}
.meeting-dialog__choice:hover,
.meeting-dialog__choice:focus-visible,
.meeting-dialog__choice--active {
  color: rgb(244 241 233 / 85%);
  border-color: rgb(228 187 114 / 24%);
  background: rgb(228 187 114 / 7%);
  transform: translateY(-1px);
}
.choice-signal { width: .32rem; height: .32rem; border: 1px solid currentColor; }
.choice-signal--meeting { border-radius: 999px; color: #e4bb72; background: currentColor; box-shadow: 0 0 7px currentColor; }
.choice-signal--deadline { color: #c4b2ee; transform: rotate(45deg); }
.choice-signal--event { color: #91b9d9; border-radius: 999px; background: currentColor; }
.meeting-dialog__close {
  position: sticky;
  z-index: 2;
  top: 0.8rem;
  float: right;
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0.8rem 0.8rem -3.55rem 0;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgb(244 241 233 / 15%);
  color: rgb(244 241 233 / 68%);
  background: rgb(15 20 19 / 72%);
  backdrop-filter: blur(14px);
  transition:
    color 180ms ease,
    background-color 220ms ease,
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.meeting-dialog__close:hover,
.meeting-dialog__close:focus-visible {
  color: #e4bb72;
  background: rgb(228 187 114 / 8%);
  transform: rotate(5deg) scale(1.04);
}
.meeting-dialog-enter-active,
.meeting-dialog-leave-active {
  transition: opacity 260ms ease;
}
.meeting-dialog-enter-active .meeting-dialog__panel,
.meeting-dialog-leave-active .meeting-dialog__panel {
  transition:
    opacity 260ms ease,
    translate 420ms cubic-bezier(0.16, 1, 0.3, 1),
    scale 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.meeting-dialog-enter-from,
.meeting-dialog-leave-to,
.meeting-dialog-enter-from .meeting-dialog__panel,
.meeting-dialog-leave-to .meeting-dialog__panel {
  opacity: 0;
}
.meeting-dialog-enter-from .meeting-dialog__panel {
  translate: 0 10px;
  scale: 0.985;
}
.meeting-dialog-leave-to .meeting-dialog__panel {
  translate: 0 5px;
  scale: 0.992;
}
@media (max-width: 639px) {
  .meeting-calendar {
    border-radius: 1.25rem;
    padding: 0.9rem;
  }
  .meeting-calendar__nav {
    width: 2.5rem;
    height: 2.5rem;
  }
  .meeting-day {
    font-size: 0.58rem;
  }
  .meeting-dialog {
    padding: 0.55rem;
  }
  .meeting-dialog__switcher { margin-left: .55rem; }
}
@media (prefers-reduced-motion: reduce) {
  .meeting-calendar__nav,
  .meeting-day--event,
  .meeting-calendar__archive,
  .meeting-month-forward-enter-active,
  .meeting-month-forward-leave-active,
  .meeting-month-backward-enter-active,
  .meeting-month-backward-leave-active,
  .meeting-dialog-enter-active,
  .meeting-dialog-leave-active,
  .meeting-dialog-enter-active .meeting-dialog__panel,
  .meeting-dialog-leave-active .meeting-dialog__panel,
  .meeting-dialog__close {
    transition: none;
    transform: none;
    translate: none;
    scale: 1;
  }
  .meeting-dialog__choice { transition: none; transform: none; }
}
</style>
