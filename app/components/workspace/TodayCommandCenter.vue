<script setup lang="ts">
import type { PlanActivity, PlanEvent, PlanPursuit, PlanTask } from '#shared/types/dashboard'

const props = defineProps<{
  tasks: PlanTask[]
  pursuits: PlanPursuit[]
  activities: PlanActivity[]
  events: PlanEvent[]
  today: string
  savedOpportunityCount: number
}>()
const emit = defineEmits<{
  addTask: [date: string]
  openTask: [task: PlanTask]
  toggleTask: [task: PlanTask]
  toggleActivity: [activity: PlanActivity]
  openOpportunity: [pursuit: PlanPursuit]
}>()

const rail = ref<HTMLElement | null>(null)
const selectedDate = ref(props.today)
let snapTimer: ReturnType<typeof setTimeout> | null = null
const days = computed(() => {
  const base = new Date(`${props.today}T12:00:00Z`)
  return Array.from({ length: 19 }, (_, index) => {
    const date = new Date(base)
    date.setUTCDate(date.getUTCDate() + index - 5)
    const key = date.toISOString().slice(0, 10)
    const previous = new Date(date)
    previous.setUTCDate(previous.getUTCDate() - 1)
    return {
      date: key,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      day: date.getUTCDate(),
      isToday: key === props.today,
      monthBoundary: index === 0 || date.getUTCMonth() !== previous.getUTCMonth(),
    }
  })
})
const activeDate = computed(() => selectedDate.value)
const dayTasks = computed(() => props.tasks.filter((task) => task.dueDate === activeDate.value || overlaps(task, activeDate.value)))
const dayMilestones = computed(() => props.pursuits.flatMap((pursuit) =>
  pursuit.officialDates.filter((point) => point.localDate === activeDate.value).map((point) => ({ pursuit, point })),
))
const dayEvents = computed(() => props.events.filter((event) => eventDate(event.start) === activeDate.value || eventDate(event.end) === activeDate.value))
const activeProjects = computed(() => props.activities.filter((activity) => activity.status === 'active'))
const trackedProjects = computed(() => props.activities)
onMounted(() => nextTick(() => scrollTo(props.today, 'auto')))
onBeforeUnmount(() => {
  if (snapTimer) clearTimeout(snapTimer)
})

function overlaps(task: PlanTask, date: string) {
  if (!task.scheduledStart || !task.scheduledEnd) return false
  const from = Date.parse(`${date}T00:00:00Z`)
  const to = from + 86400000
  return Date.parse(task.scheduledStart) < to && Date.parse(task.scheduledEnd) > from
}
function dateLabel(date: string) {
  if (date === props.today) return 'Today'
  const value = new Date(`${date}T12:00:00Z`)
  const weekday = value.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const month = date.slice(0, 7) === props.today.slice(0, 7)
    ? ''
    : ` ${value.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}`
  return `${weekday}${month} ${value.getUTCDate()}`
}
function eventDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(value))
}
function onRailScroll() {
  const element = rail.value
  if (!element) return
  const center = element.scrollTop + element.clientHeight / 2
  const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-day]'))
  if (!cards.length) return
  const nearest = cards.reduce((best, card) => {
    const distance = Math.abs(card.offsetTop - element.offsetTop + card.offsetHeight / 2 - center)
    return distance < best.distance ? { card, distance } : best
  }, { card: cards[0], distance: Number.POSITIVE_INFINITY })
  if (nearest.card?.dataset.day) selectedDate.value = nearest.card.dataset.day

  // Native scroll snap handles most input, while this short settle pass keeps
  // trackpad and keyboard scrolling centered on a real day card.
  if (snapTimer) clearTimeout(snapTimer)
  snapTimer = setTimeout(() => {
    const current = rail.value
    if (!current || !nearest.card) return
    const nextCenter = nearest.card.offsetTop - current.offsetTop + nearest.card.offsetHeight / 2
    if (Math.abs(nextCenter - (current.scrollTop + current.clientHeight / 2)) > 2) {
      current.scrollTo({ top: nextCenter - current.clientHeight / 2, behavior: scrollBehavior() })
    }
  }, 120)
}
function scrollTo(date: string, behavior: ScrollBehavior = 'smooth') {
  const card = rail.value?.querySelector<HTMLElement>(`[data-day="${date}"]`)
  if (!card || !rail.value) return
  rail.value.scrollTo({
    top: card.offsetTop - rail.value.offsetTop + card.offsetHeight / 2 - rail.value.clientHeight / 2,
    behavior: behavior === 'smooth' ? scrollBehavior() : behavior,
  })
}
function scrollBehavior(): ScrollBehavior {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}
function markerCount(date: string) {
  return props.tasks.filter((task) => task.dueDate === date || overlaps(task, date)).length
    + props.pursuits.reduce((count, pursuit) => count + pursuit.officialDates.filter((point) => point.localDate === date).length, 0)
    + props.events.filter((event) => eventDate(event.start) === date || eventDate(event.end) === date).length
}
const openTasks = computed(() => dayTasks.value.filter((task) => task.status !== 'done'))
const allTasksComplete = computed(() => dayTasks.value.length > 0 && openTasks.value.length === 0)
</script>

<template>
  <section class="today-command" aria-label="Today command center">
    <div class="today-command__hero">
      <div>
        <p class="today-command__eyebrow">America/Chicago</p>
      </div>
      <button class="today-command__add" type="button" @click="emit('addTask', activeDate)">
        <span class="today-command__add-orbit" aria-hidden="true">+</span>
        <span><strong>Add a task</strong></span>
      </button>
    </div>

    <div class="today-command__layout">
      <div class="day-rail-wrap">
        <div class="day-rail__glow" aria-hidden="true" />
        <div class="day-rail__line" aria-hidden="true" />
        <div ref="rail" class="day-rail" @scroll.passive="onRailScroll">
          <button
            v-for="(day, index) in days"
            :key="day.date"
            :data-day="day.date"
            type="button"
            class="day-orbit"
            :class="{ 'day-orbit--active': day.date === activeDate, 'day-orbit--today': day.isToday }"
            :style="{ '--day-index': index }"
            :aria-label="`${day.weekday}, ${day.month} ${day.day}${markerCount(day.date) ? `, ${markerCount(day.date)} planned item${markerCount(day.date) === 1 ? '' : 's'}` : ''}`"
            :aria-current="day.date === activeDate ? 'date' : undefined"
            @focus="scrollTo(day.date)"
            @click="scrollTo(day.date)"
          >
            <span class="day-orbit__dot" aria-hidden="true" />
            <span class="day-orbit__date">
              <em v-if="day.monthBoundary" class="day-orbit__month">{{ day.monthLabel }}</em>
              <small>{{ day.weekday }}</small><strong>{{ day.day }}</strong>
            </span>
            <span v-if="markerCount(day.date)" class="day-orbit__markers" aria-hidden="true" :title="`${markerCount(day.date)} planned item${markerCount(day.date) === 1 ? '' : 's'}`">
              <i />
            </span>
          </button>
        </div>
        <div class="day-rail__hint"><span>Scroll</span><span class="day-rail__hint-line" /></div>
      </div>

      <Transition name="day-panel" mode="out-in">
        <aside :key="activeDate" class="day-panel">
          <div class="day-panel__topline">
            <div><p class="today-command__eyebrow">Daily focus</p><p class="day-panel__date">{{ dateLabel(activeDate) }}</p></div>
            <button type="button" class="day-panel__jump" @click="scrollTo(props.today)">{{ activeDate === props.today ? 'Current day' : 'Jump to today' }}</button>
          </div>
          <p v-if="allTasksComplete" class="day-panel__clear">All tasks complete</p>

          <div class="day-panel__items">
            <button v-for="task in openTasks" :key="task.id" type="button" class="day-task" @click="emit('openTask', task)">
              <span class="day-task__check" @click.stop="emit('toggleTask', task)" /><span><strong>{{ task.title }}</strong></span>
            </button>
            <button v-for="milestone in dayMilestones" :key="`${milestone.pursuit.id}:${milestone.point.wording}`" type="button" class="day-milestone" @click="emit('openOpportunity', milestone.pursuit)"><span class="day-milestone__glyph">✦</span><span><strong>{{ milestone.point.wording }}</strong><small>{{ milestone.pursuit.title }}</small></span></button>
            <div v-for="event in dayEvents" :key="event.id" class="day-event"><span class="day-event__glyph">◌</span><span><strong>{{ event.title }}</strong><small>{{ event.type.replace('_', ' ') }}</small></span></div>
            <div v-if="!dayTasks.length && !dayMilestones.length && !dayEvents.length" class="day-empty">
              <span class="day-empty__star" aria-hidden="true">✦</span>
              <span><strong>No scheduled work</strong><small>A clear day for the next useful move.</small></span>
            </div>
          </div>
        </aside>
      </Transition>
    </div>

    <section class="project-pulse" aria-label="Active projects">
      <div class="project-pulse__heading"><div><h4>Projects</h4></div><span>{{ activeProjects.length }} active</span></div>
      <div class="project-pulse__list">
        <button v-for="activity in trackedProjects" :key="activity.id" type="button" class="project-card" :class="{ 'project-card--paused': activity.status !== 'active' }" @click="emit('toggleActivity', activity)"><span><strong>{{ activity.title }}</strong><small>{{ activity.milestone || 'Choose the next milestone' }}</small></span><span class="project-card__state">{{ activity.status === 'active' ? 'Active · pause' : 'Paused · resume' }}</span></button>
        <div v-if="!trackedProjects.length" class="project-card project-card--empty"><span><strong>No active projects</strong><small>Active projects will appear here.</small></span></div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.today-command { position: relative; overflow: hidden; padding: clamp(24px, 4vw, 52px); border: 1px solid rgb(255 255 255 / 9%); border-radius: 30px; background: rgb(16 16 21 / 24%); backdrop-filter:blur(22px); box-shadow: inset 0 1px rgb(255 255 255 / 8%), 0 30px 100px rgb(0 0 0 / 22%); }
.today-command::before { content: ''; position:absolute; inset:0; pointer-events:none; opacity:.04; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='.8' filter='url(%23n)'/%3E%3C/svg%3E"); }
.today-command__hero,.today-command__layout,.project-pulse,.today-command__saved { position: relative; z-index: 1; }
.today-command__hero { display:flex; justify-content:space-between; align-items:flex-end; gap:28px; margin-bottom:38px; }
.today-command__eyebrow { margin:0 0 8px; color:#d8b977; font-size:10px; letter-spacing:.18em; text-transform:uppercase; }
.today-command h3 { max-width:580px; margin:0; font-family:Manrope,sans-serif; font-size:clamp(28px,4.3vw,54px); font-weight:400; letter-spacing:-.07em; line-height:1.02; }
.today-command__lede { max-width:560px; margin:16px 0 0; color:#a9a5b3; font-size:14px; line-height:1.7; }
.today-command__add { display:flex; align-items:center; gap:10px; min-width:180px; padding:11px 16px 11px 13px; border:1px solid rgb(255 255 255 / 15%); border-radius:16px; background:rgb(255 255 255 / 3%); color:#eee5d2; text-align:left; box-shadow:inset 0 1px rgb(255 255 255 / 6%); transition:transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s, border-color .35s, background-color .35s; }
.today-command__add:hover { transform:translateY(-1px); border-color:rgb(216 185 119 / 32%); background:rgb(216 185 119 / 5%); box-shadow:0 8px 24px rgb(216 185 119 / 7%),inset 0 1px rgb(255 255 255 / 8%); }
.today-command__add:focus-visible { outline:2px solid rgb(216 185 119 / 58%); outline-offset:4px; }
.today-command__add-orbit { display:grid; place-items:center; width:22px; height:22px; color:#d8b977; font-size:20px; font-weight:300; line-height:1; transition:transform .45s; }
.today-command__add:hover .today-command__add-orbit { transform:rotate(90deg); }
.today-command__add strong,.today-command__add small { display:block; }
.today-command__add strong { font-size:12px; font-weight:500; }.today-command__add small { margin-top:3px; color:#a9a5b3; font-size:10px; }
.today-command__layout { display:grid; grid-template-columns:minmax(260px,.8fr) minmax(360px,1.2fr); gap:clamp(22px,5vw,72px); align-items:stretch; }
.day-rail-wrap { --rail-side:30px; --dot-center:30px; position:relative; min-width:0; min-height:440px; }.day-rail { --rail-height:440px; --day-height:64px; display:flex; flex-direction:column; gap:9px; width:100%; max-width:100%; min-width:0; height:var(--rail-height); box-sizing:border-box; padding:calc((var(--rail-height) - var(--day-height)) / 2) var(--rail-side); overflow-y:auto; overflow-x:hidden; scroll-snap-type:y mandatory; scroll-snap-stop:always; scroll-padding-block:calc((var(--rail-height) - var(--day-height)) / 2); scrollbar-width:none; overscroll-behavior-y:contain; overscroll-behavior-x:none; touch-action:pan-y; mask-image:linear-gradient(transparent 0%,#000 17%,#000 83%,transparent 100%); }.day-rail::-webkit-scrollbar { display:none; }
.day-rail__line { position:absolute; z-index:0; top:32px; bottom:32px; left:calc(var(--rail-side) + var(--dot-center)); width:1px; background:linear-gradient(transparent,rgb(216 185 119 / 52%),transparent); }.day-rail__glow { position:absolute; left:28px; top:calc(50% - 76px); width:62px; height:152px; border-radius:50%; background:radial-gradient(ellipse,rgb(216 185 119 / 12%),transparent 70%); filter:blur(9px); pointer-events:none; }.day-orbit { position:relative; z-index:1; flex-shrink:0; width:100%; min-width:0; height:var(--day-height); box-sizing:border-box; transform-origin:var(--dot-center) center; display:grid; grid-template-columns:38px minmax(0,1fr) 12px; align-items:center; gap:14px; min-height:64px; padding:9px 14px 9px 0; border:0; border-radius:17px; background:transparent; color:#9f9ba8; text-align:left; scroll-snap-align:center; scroll-snap-stop:always; touch-action:pan-y; opacity:.54; transform:scale(.96); transition:opacity .4s,transform .45s cubic-bezier(.2,.8,.2,1),background .4s,color .4s; }.day-orbit:hover { opacity:.8; background:rgb(255 255 255 / 4%); }.day-orbit:focus-visible { opacity:1; outline:2px solid rgb(216 185 119 / 58%); outline-offset:3px; }.day-orbit--active { opacity:1; transform:scale(1.015); color:#f0e9de; background:linear-gradient(90deg,rgb(216 185 119 / 7%),transparent); }.day-orbit--today .day-orbit__date strong { color:#e8c779; }
.day-orbit__dot { width:10px; height:10px; margin-left:25px; border:1px solid rgb(216 185 119 / 55%); border-radius:50%; background:#12131b; box-shadow:0 0 0 5px rgb(216 185 119 / 5%); transition:transform .4s,background .4s,box-shadow .4s; }.day-orbit--active .day-orbit__dot { transform:scale(1.45); background:#e3bc67; box-shadow:0 0 0 7px rgb(216 185 119 / 10%),0 0 22px rgb(216 185 119 / 35%); }.day-orbit__date { position:relative; display:grid; grid-template-columns:34px 2.5rem; align-items:center; gap:10px; min-width:0; line-height:1; }.day-orbit__date small { font-size:10px; letter-spacing:.08em; text-align:right; text-transform:uppercase; }.day-orbit__date strong { font-variant-numeric:tabular-nums; font-size:24px; font-weight:400; letter-spacing:-.04em; line-height:1; }.day-orbit__month { position:absolute; bottom:calc(100% + 5px); left:0; color:#8e8998; font-size:8px; font-style:normal; letter-spacing:.12em; line-height:1; text-transform:uppercase; white-space:nowrap; }.day-orbit__markers { display:grid; place-items:center; width:12px; height:12px; }.day-orbit__markers i { width:5px; height:5px; border-radius:50%; background:#c8a4e8; box-shadow:0 0 8px #c8a4e8; }.day-rail__hint { position:absolute; bottom:4px; left:25px; display:flex; align-items:center; gap:10px; color:#777481; font-size:10px; letter-spacing:.13em; text-transform:uppercase; }.day-rail__hint-line { width:32px; height:1px; background:#777481; }
.day-panel { position:relative; isolation:isolate; overflow:hidden; min-height:380px; padding:26px; border:1px solid rgb(255 255 255 / 10%); border-radius:24px; background:rgb(255 255 255 / 2.5%); box-shadow:inset 0 1px rgb(255 255 255 / 6%),0 16px 48px rgb(0 0 0 / 10%); -webkit-backdrop-filter:blur(22px) saturate(112%); backdrop-filter:blur(22px) saturate(112%); }.day-panel::before { content:''; position:absolute; inset:0; z-index:-1; pointer-events:none; opacity:.045; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='daily-grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23daily-grain)'/%3E%3C/svg%3E"); background-size:160px 160px; mix-blend-mode:soft-light; }.day-panel__topline,.project-pulse__heading { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }.day-panel__date,.project-pulse h4 { margin:0; font-family:Manrope,sans-serif; font-size:23px; font-weight:400; letter-spacing:-.05em; }.day-panel__jump { border:0; background:none; color:#d8b977; font-size:10px; cursor:pointer; }.day-panel__clear { margin:27px 0 16px; color:#d8c58f; font-size:12px; }.day-panel__summary { display:flex; align-items:center; gap:8px; margin:27px 0 16px; color:#96929f; font-size:11px; }.day-panel__summary strong { color:#efeee8; font-size:20px; font-weight:400; }.day-panel__items { display:flex; flex-direction:column; gap:8px; margin-top:22px; }.day-task,.day-milestone,.day-empty { display:flex; align-items:center; width:100%; gap:12px; min-height:54px; padding:10px 12px; border:1px solid transparent; border-radius:13px; background:transparent; color:#e9e4ee; text-align:left; transition:transform .3s,background .3s,border-color .3s; }.day-task:hover,.day-milestone:hover { transform:translateX(4px); border-color:rgb(216 185 119 / 25%); background:rgb(216 185 119 / 7%); }.day-task__check { display:grid; place-items:center; flex:0 0 23px; width:23px; height:23px; border:1px solid rgb(216 185 119 / 48%); border-radius:50%; color:#e8c779; font-size:12px; }.day-task--done { opacity:.5; text-decoration:line-through; }.day-task span:nth-child(2),.day-milestone span:nth-child(2),.day-empty { min-width:0; }.day-task strong,.day-task small,.day-milestone strong,.day-milestone small,.day-empty strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.day-task strong,.day-milestone strong { font-size:12px; font-weight:500; }.day-task small,.day-milestone small { margin-top:3px; color:#85818e; font-size:10px; }.day-task__arrow { margin-left:auto; color:#756e80; }.day-milestone__glyph { display:grid; place-items:center; width:23px; height:23px; color:#d9b56f; }.day-empty { display:grid; justify-items:center; align-content:center; min-height:190px; padding:28px 16px; color:#97929f; font-size:11px; text-align:center; }.day-empty > span:last-child { display:grid; justify-items:center; gap:8px; }.day-empty strong,.day-empty small { display:block; overflow:visible; white-space:normal; }.day-empty strong { color:#ddd5e2; font-size:13px; font-weight:500; }.day-empty small { color:#8e8998; font-size:10px; line-height:1.5; }.day-empty__star { display:grid; width:34px; height:34px; place-items:center; border:1px solid rgb(216 185 119 / 28%); border-radius:50%; color:#d8b977; box-shadow:0 0 20px rgb(216 185 119 / 8%); font-size:16px; }.day-panel__footer { display:flex; align-items:center; gap:12px; margin-top:26px; padding-top:16px; border-top:1px solid rgb(255 255 255 / 8%); color:#888491; font-size:11px; }
.project-pulse { margin-top:34px; padding-top:25px; border-top:1px solid rgb(255 255 255 / 8%); }.project-pulse__heading > span { color:#948e9f; font-size:11px; }.project-pulse__list { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:10px; margin-top:16px; }.project-card { display:flex; align-items:center; gap:12px; min-height:68px; padding:12px 14px; border:1px solid rgb(255 255 255 / 8%); border-radius:16px; background:rgb(255 255 255 / 3%); color:#ece7f0; text-align:left; transition:transform .4s,background .4s,border-color .4s; }.project-card:hover { transform:translateY(-3px); border-color:rgb(216 185 119 / 35%); background:rgb(216 185 119 / 6%); box-shadow:0 0 26px rgb(216 185 119 / 8%); }.project-card strong,.project-card small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.project-card strong { font-size:12px; font-weight:500; }.project-card small { margin-top:5px; color:#918b9b; font-size:10px; }.project-card__state { margin-left:auto; color:#d8b977; font-size:9px; white-space:nowrap; }.project-card--empty { border-style:dashed; }.today-command__saved { display:flex; align-items:center; gap:8px; margin:20px 0 0; color:#7f7b89; font-size:11px; }.today-command__saved-star { color:#d8b977; }
.project-card--paused { opacity:.7; }.project-card--paused .project-card__state { color:#8e879c; }
.day-event { display:flex; align-items:center; gap:12px; min-height:48px; padding:10px 12px; border:1px solid rgb(185 163 237 / 15%); border-radius:13px; background:rgb(185 163 237 / 5%); color:#e9e4ee; }.day-event__glyph { display:grid; place-items:center; width:23px; height:23px; color:#b9a3ed; }.day-event strong,.day-event small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.day-event strong { font-size:12px; font-weight:500; }.day-event small { margin-top:3px; color:#85818e; font-size:10px; text-transform:capitalize; }
.day-panel-enter-active,.day-panel-leave-active { transition:opacity .25s ease,transform .35s cubic-bezier(.2,.8,.2,1); }.day-panel-enter-from { opacity:0; transform:translateY(12px); }.day-panel-leave-to { opacity:0; transform:translateY(-12px); }
@keyframes command-breathe { from { transform:translate3d(-2%,1%,0) rotate(-2deg) scale(1); } to { transform:translate3d(2%,-1%,0) rotate(2deg) scale(1.06); } }
@media (max-width:800px) { .today-command { padding:22px 16px; border-radius:24px; }.today-command__hero { align-items:flex-start; flex-direction:column; }.today-command__add { width:100%; }.today-command__layout { grid-template-columns:1fr; gap:16px; }.day-rail-wrap,.day-rail { min-height:250px; height:250px; }.day-rail-wrap { --rail-side:14px; --dot-center:20px; }.day-rail { --rail-height:250px; --day-height:48px; padding:calc((var(--rail-height) - var(--day-height)) / 2) 14px; scroll-padding-block:calc((var(--rail-height) - var(--day-height)) / 2); }.day-orbit { grid-template-columns:30px minmax(0,1fr) 12px; gap:10px; min-height:48px; }.day-orbit--active { transform:scale(1); }.day-orbit__dot { margin-left:15px; }.day-orbit__date strong { font-size:20px; }.day-panel { min-height:330px; padding:20px; }.project-pulse__list { grid-template-columns:1fr; } }
@media (prefers-reduced-motion: reduce) { .today-command::before { animation:none; }.day-orbit,.day-task,.day-milestone,.project-card,.today-command__add { transition:none; }.day-panel-enter-active,.day-panel-leave-active { transition:none; } }
</style>
