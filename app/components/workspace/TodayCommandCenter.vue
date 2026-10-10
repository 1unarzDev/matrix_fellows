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
const clickLockedDate = ref<string | null>(null)
let clickUnlockTimer: ReturnType<typeof setTimeout> | null = null
const days = computed(() => {
  const base = new Date(`${props.today}T12:00:00Z`)
  return Array.from({ length: 19 }, (_, index) => {
    const date = new Date(base)
    date.setUTCDate(date.getUTCDate() + index - 5)
    const key = date.toISOString().slice(0, 10)
    return {
      date: key,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      day: date.getUTCDate(),
      isToday: key === props.today,
    }
  })
})
const activeDate = computed(() => selectedDate.value)
const activeDay = computed(() => days.value.find((day) => day.date === activeDate.value) || days.value[5])
const dayTasks = computed(() => props.tasks.filter((task) => task.dueDate === activeDate.value || overlaps(task, activeDate.value)))
const dayMilestones = computed(() => props.pursuits.flatMap((pursuit) =>
  pursuit.officialDates.filter((point) => point.localDate === activeDate.value).map((point) => ({ pursuit, point })),
))
const dayEvents = computed(() => props.events.filter((event) => eventDate(event.start) === activeDate.value || eventDate(event.end) === activeDate.value))
const activeProjects = computed(() => props.activities.filter((activity) => activity.status === 'active'))
const trackedProjects = computed(() => props.activities)
const todayTasks = computed(() => props.tasks.filter((task) => task.dueDate === props.today || overlaps(task, props.today)))
const completedCount = computed(() => dayTasks.value.filter((task) => task.status === 'done').length)
onMounted(() => nextTick(() => scrollTo(props.today, 'auto')))
onBeforeUnmount(() => {
  if (clickUnlockTimer) clearTimeout(clickUnlockTimer)
})

function overlaps(task: PlanTask, date: string) {
  if (!task.scheduledStart || !task.scheduledEnd) return false
  const from = Date.parse(`${date}T00:00:00Z`)
  const to = from + 86400000
  return Date.parse(task.scheduledStart) < to && Date.parse(task.scheduledEnd) > from
}
function dateLabel(date: string) {
  if (date === props.today) return 'Today'
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
}
function eventDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(value))
}
function choose(date: string, lockScroll = false) {
  selectedDate.value = date
  if (!lockScroll) return
  clickLockedDate.value = date
  if (clickUnlockTimer) clearTimeout(clickUnlockTimer)
  clickUnlockTimer = setTimeout(() => {
    clickLockedDate.value = null
  }, 450)
}
function onRailScroll() {
  const element = rail.value
  if (!element) return
  const center = element.scrollTop + element.clientHeight / 2
  const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-day]'))
  const nearest = cards.reduce((best, card) => {
    const distance = Math.abs(card.offsetTop + card.offsetHeight / 2 - center)
    return distance < best.distance ? { card, distance } : best
  }, { card: cards[0], distance: Number.POSITIVE_INFINITY })
  if (clickLockedDate.value) return
  if (nearest.card?.dataset.day) selectedDate.value = nearest.card.dataset.day
}
function scrollTo(date: string, behavior: ScrollBehavior = 'smooth') {
  const card = rail.value?.querySelector<HTMLElement>(`[data-day="${date}"]`)
  card?.scrollIntoView({ behavior, block: 'center' })
  choose(date)
}
function markerCount(date: string) {
  return props.tasks.filter((task) => task.dueDate === date || overlaps(task, date)).length + props.pursuits.reduce((count, pursuit) => count + pursuit.officialDates.filter((point) => point.localDate === date).length, 0)
}
</script>

<template>
  <section class="today-command" aria-label="Today command center">
    <div class="today-command__hero">
      <div>
        <p class="today-command__eyebrow">Your orbit · America/Chicago</p>
        <h3>Make room for the work that matters.</h3>
        <p class="today-command__lede">A calm view of the next few days, your active projects, and the one useful move waiting nearby.</p>
      </div>
      <button class="today-command__add" type="button" @click="emit('addTask', activeDate)">
        <span class="today-command__add-orbit" aria-hidden="true">+</span>
        <span><strong>Add a task</strong><small>Choose a day in seconds</small></span>
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
            @mouseenter="choose(day.date)"
            @focus="choose(day.date)"
            @click="choose(day.date, true)"
          >
            <span class="day-orbit__dot" aria-hidden="true" />
            <span class="day-orbit__date"><small>{{ day.weekday }}</small><strong>{{ day.day }}</strong><small>{{ day.month }}</small></span>
            <span class="day-orbit__caption">{{ day.isToday ? 'Today' : index < 5 ? 'Past' : 'Ahead' }}</span>
            <span v-if="markerCount(day.date)" class="day-orbit__markers" :aria-label="`${markerCount(day.date)} planned item${markerCount(day.date) === 1 ? '' : 's'}`">
              <i v-for="n in Math.min(markerCount(day.date), 4)" :key="n" />
            </span>
          </button>
        </div>
        <div class="day-rail__hint"><span>Scroll to explore</span><span class="day-rail__hint-line" /></div>
      </div>

      <Transition name="day-panel" mode="out-in">
        <aside :key="activeDate" class="day-panel">
          <div class="day-panel__topline">
            <div><p class="today-command__eyebrow">Daily focus</p><p class="day-panel__date">{{ dateLabel(activeDate) }}</p></div>
            <button type="button" class="day-panel__jump" @click="scrollTo(props.today)">{{ activeDate === props.today ? 'Current day' : 'Jump to today' }}</button>
          </div>
          <div class="day-panel__summary"><strong>{{ completedCount }}/{{ dayTasks.length }}</strong><span>{{ dayTasks.length === 1 ? 'task' : 'tasks' }} complete</span><span v-if="dayMilestones.length">· {{ dayMilestones.length }} milestone{{ dayMilestones.length === 1 ? '' : 's' }}</span></div>
          <div class="day-panel__items">
            <button v-for="task in dayTasks" :key="task.id" type="button" class="day-task" :class="{ 'day-task--done': task.status === 'done' }" @click="emit('openTask', task)">
              <span class="day-task__check" @click.stop="emit('toggleTask', task)">{{ task.status === 'done' ? '✓' : '' }}</span><span><strong>{{ task.title }}</strong><small>{{ task.status === 'done' ? 'Complete' : task.pursuitId ? 'Opportunity plan' : 'Personal task' }}</small></span><span class="day-task__arrow">↗</span>
            </button>
            <button v-for="milestone in dayMilestones" :key="`${milestone.pursuit.id}:${milestone.point.wording}`" type="button" class="day-milestone" @click="emit('openOpportunity', milestone.pursuit)"><span class="day-milestone__glyph">✦</span><span><strong>{{ milestone.point.wording }}</strong><small>{{ milestone.pursuit.title }}</small></span></button>
            <div v-for="event in dayEvents" :key="event.id" class="day-event"><span class="day-event__glyph">◌</span><span><strong>{{ event.title }}</strong><small>{{ event.type.replace('_', ' ') }}</small></span></div>
            <button v-if="!dayTasks.length && !dayMilestones.length && !dayEvents.length" type="button" class="day-empty" @click="emit('addTask', activeDate)"><span>Nothing pinned here yet.</span><strong>Shape a small next step <span>＋</span></strong></button>
          </div>
          <div class="day-panel__footer"><span v-if="activeDate === props.today">{{ todayTasks.length ? 'Your active work is close at hand.' : 'A clear day is useful too.' }}</span><span v-else>Plan lightly. Keep the day flexible.</span><button type="button" @click="emit('addTask', activeDate)">Add to {{ activeDate === props.today ? 'today' : activeDay?.weekday || 'day' }} <span>＋</span></button></div>
        </aside>
      </Transition>
    </div>

    <section class="project-pulse" aria-label="Active projects">
      <div class="project-pulse__heading"><div><p class="today-command__eyebrow">Project pulse</p><h4>What you’re carrying forward</h4></div><span>{{ activeProjects.length }} active</span></div>
      <div class="project-pulse__list">
        <button v-for="activity in trackedProjects" :key="activity.id" type="button" class="project-card" :class="{ 'project-card--paused': activity.status !== 'active' }" @click="emit('toggleActivity', activity)"><span class="project-card__orb" aria-hidden="true" /><span><strong>{{ activity.title }}</strong><small>{{ activity.milestone || 'Choose the next milestone' }}</small></span><span class="project-card__state">{{ activity.status === 'active' ? 'Active · pause' : 'Paused · resume' }}</span></button>
        <button v-if="!trackedProjects.length" type="button" class="project-card project-card--empty" @click="emit('addTask', activeDate)"><span class="project-card__orb" aria-hidden="true" /><span><strong>Start with one meaningful thread</strong><small>Tasks can stay personal until a project emerges.</small></span></button>
      </div>
    </section>
    <p class="today-command__saved"><span class="today-command__saved-star">✦</span>{{ savedOpportunityCount }} saved opportunity{{ savedOpportunityCount === 1 ? '' : 'ies' }} in your orbit. Due dates and plans surface here automatically.</p>
  </section>
</template>

<style scoped>
.today-command { position: relative; overflow: hidden; padding: clamp(24px, 4vw, 52px); border: 1px solid rgb(255 255 255 / 9%); border-radius: 30px; background: linear-gradient(145deg, rgb(27 25 38 / 78%), rgb(13 14 21 / 84%)); box-shadow: inset 0 1px rgb(255 255 255 / 8%), 0 30px 100px rgb(0 0 0 / 22%); }
.today-command::before { content: ''; position: absolute; inset: -30%; pointer-events: none; background: radial-gradient(ellipse at 71% 20%, rgb(255 159 80 / 13%), transparent 30%), radial-gradient(ellipse at 20% 80%, rgb(119 93 198 / 12%), transparent 36%); filter: blur(10px); animation: command-breathe 14s ease-in-out infinite alternate; }
.today-command__hero,.today-command__layout,.project-pulse,.today-command__saved { position: relative; z-index: 1; }
.today-command__hero { display:flex; justify-content:space-between; align-items:flex-end; gap:28px; margin-bottom:38px; }
.today-command__eyebrow { margin:0 0 8px; color:#d8b977; font-size:10px; letter-spacing:.18em; text-transform:uppercase; }
.today-command h3 { max-width:580px; margin:0; font-family:Manrope,sans-serif; font-size:clamp(28px,4.3vw,54px); font-weight:400; letter-spacing:-.07em; line-height:1.02; }
.today-command__lede { max-width:560px; margin:16px 0 0; color:#a9a5b3; font-size:14px; line-height:1.7; }
.today-command__add { display:flex; align-items:center; gap:12px; min-width:180px; padding:11px 17px 11px 11px; border:1px solid rgb(216 185 119 / 45%); border-radius:18px; background:linear-gradient(135deg,rgb(216 185 119 / 15%),rgb(185 163 237 / 9%)); color:#f2dfb8; text-align:left; box-shadow:0 0 30px rgb(216 185 119 / 9%); transition:transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .45s, border-color .45s; }
.today-command__add:hover { transform:translateY(-3px) scale(1.015); border-color:rgb(216 185 119 / 75%); box-shadow:0 12px 38px rgb(216 185 119 / 15%); }
.today-command__add-orbit { display:grid; place-items:center; width:39px; height:39px; border:1px solid rgb(216 185 119 / 45%); border-radius:50%; font-size:24px; font-weight:200; transition:transform .5s; }
.today-command__add:hover .today-command__add-orbit { transform:rotate(90deg); }
.today-command__add strong,.today-command__add small { display:block; }
.today-command__add strong { font-size:12px; font-weight:500; }.today-command__add small { margin-top:3px; color:#a9a5b3; font-size:10px; }
.today-command__layout { display:grid; grid-template-columns:minmax(260px,.8fr) minmax(360px,1.2fr); gap:clamp(22px,5vw,72px); align-items:stretch; }
.day-rail-wrap { position:relative; min-height:440px; }.day-rail { display:flex; flex-direction:column; gap:9px; height:440px; padding:175px 30px; overflow-y:auto; scroll-snap-type:y mandatory; scrollbar-width:none; overscroll-behavior:contain; mask-image:linear-gradient(transparent 0%,#000 17%,#000 83%,transparent 100%); }.day-rail::-webkit-scrollbar { display:none; }
.day-rail__line { position:absolute; z-index:0; top:32px; bottom:32px; left:59px; width:1px; background:linear-gradient(transparent,rgb(216 185 119 / 52%),transparent); }.day-rail__glow { position:absolute; left:28px; top:calc(50% - 76px); width:62px; height:152px; border-radius:50%; background:radial-gradient(ellipse,rgb(216 185 119 / 12%),transparent 70%); filter:blur(9px); pointer-events:none; }.day-orbit { position:relative; z-index:1; display:grid; grid-template-columns:38px 1fr auto; align-items:center; gap:14px; min-height:64px; padding:9px 14px 9px 0; border:0; border-radius:17px; background:transparent; color:#9f9ba8; text-align:left; scroll-snap-align:center; opacity:.54; transform:scale(.93); transition:opacity .4s,transform .45s cubic-bezier(.2,.8,.2,1),background .4s,color .4s; }.day-orbit:hover,.day-orbit:focus-visible { opacity:.85; background:rgb(255 255 255 / 4%); outline:none; }.day-orbit--active { opacity:1; transform:scale(1.08); color:#f0e9de; background:linear-gradient(90deg,rgb(216 185 119 / 12%),transparent); }.day-orbit--today .day-orbit__date strong { color:#e8c779; }
.day-orbit__dot { width:10px; height:10px; margin-left:25px; border:1px solid rgb(216 185 119 / 55%); border-radius:50%; background:#12131b; box-shadow:0 0 0 5px rgb(216 185 119 / 5%); transition:transform .4s,background .4s,box-shadow .4s; }.day-orbit--active .day-orbit__dot { transform:scale(1.45); background:#e3bc67; box-shadow:0 0 0 7px rgb(216 185 119 / 10%),0 0 22px rgb(216 185 119 / 35%); }.day-orbit__date { display:flex; align-items:baseline; gap:10px; }.day-orbit__date small { font-size:10px; letter-spacing:.08em; text-transform:uppercase; }.day-orbit__date strong { font-size:24px; font-weight:400; letter-spacing:-.04em; }.day-orbit__caption { font-size:10px; text-transform:uppercase; letter-spacing:.12em; }.day-orbit__markers { display:flex; gap:3px; }.day-orbit__markers i { width:4px; height:4px; border-radius:50%; background:#c8a4e8; box-shadow:0 0 8px #c8a4e8; }.day-rail__hint { position:absolute; bottom:4px; left:25px; display:flex; align-items:center; gap:10px; color:#777481; font-size:10px; letter-spacing:.13em; text-transform:uppercase; }.day-rail__hint-line { width:32px; height:1px; background:#777481; }
.day-panel { min-height:380px; padding:26px; border:1px solid rgb(255 255 255 / 11%); border-radius:24px; background:linear-gradient(135deg,rgb(255 255 255 / 8%),rgb(255 255 255 / 2%)); box-shadow:inset 0 1px rgb(255 255 255 / 8%),0 20px 65px rgb(0 0 0 / 18%); backdrop-filter:blur(18px); }.day-panel__topline,.project-pulse__heading { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }.day-panel__date,.project-pulse h4 { margin:0; font-family:Manrope,sans-serif; font-size:23px; font-weight:400; letter-spacing:-.05em; }.day-panel__jump { border:0; background:none; color:#b9a3ed; font-size:10px; cursor:pointer; }.day-panel__summary { display:flex; align-items:center; gap:8px; margin:27px 0 16px; color:#96929f; font-size:11px; }.day-panel__summary strong { color:#efeee8; font-size:20px; font-weight:400; }.day-panel__items { display:flex; flex-direction:column; gap:8px; }.day-task,.day-milestone,.day-empty { display:flex; align-items:center; width:100%; gap:12px; min-height:54px; padding:10px 12px; border:1px solid transparent; border-radius:13px; background:rgb(255 255 255 / 3%); color:#e9e4ee; text-align:left; transition:transform .3s,background .3s,border-color .3s; }.day-task:hover,.day-milestone:hover,.day-empty:hover { transform:translateX(4px); border-color:rgb(216 185 119 / 25%); background:rgb(216 185 119 / 7%); }.day-task__check { display:grid; place-items:center; flex:0 0 23px; width:23px; height:23px; border:1px solid rgb(216 185 119 / 48%); border-radius:50%; color:#e8c779; font-size:12px; }.day-task--done { opacity:.5; text-decoration:line-through; }.day-task span:nth-child(2),.day-milestone span:nth-child(2),.day-empty { min-width:0; }.day-task strong,.day-task small,.day-milestone strong,.day-milestone small,.day-empty strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.day-task strong,.day-milestone strong { font-size:12px; font-weight:500; }.day-task small,.day-milestone small { margin-top:3px; color:#85818e; font-size:10px; }.day-task__arrow { margin-left:auto; color:#756e80; }.day-milestone__glyph { display:grid; place-items:center; width:23px; height:23px; color:#d9b56f; }.day-empty { flex-direction:column; align-items:flex-start; gap:5px; color:#97929f; font-size:11px; }.day-empty strong { color:#d3bb81; font-size:12px; font-weight:400; }.day-empty strong span { font-size:16px; }.day-panel__footer { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:26px; padding-top:16px; border-top:1px solid rgb(255 255 255 / 8%); color:#888491; font-size:11px; }.day-panel__footer button { border:0; background:none; color:#d9bb7b; font-size:11px; cursor:pointer; }.day-panel__footer button span { font-size:16px; vertical-align:-1px; }
.project-pulse { margin-top:34px; padding-top:25px; border-top:1px solid rgb(255 255 255 / 8%); }.project-pulse__heading > span { color:#948e9f; font-size:11px; }.project-pulse__list { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:10px; margin-top:16px; }.project-card { display:flex; align-items:center; gap:12px; min-height:68px; padding:12px 14px; border:1px solid rgb(255 255 255 / 8%); border-radius:16px; background:rgb(255 255 255 / 3%); color:#ece7f0; text-align:left; transition:transform .4s,background .4s,border-color .4s; }.project-card:hover { transform:translateY(-3px); border-color:rgb(185 163 237 / 35%); background:rgb(185 163 237 / 8%); }.project-card__orb { flex:0 0 30px; width:30px; height:30px; border:1px solid rgb(185 163 237 / 50%); border-radius:50%; background:radial-gradient(circle at 35% 30%,#ead8ff,rgb(126 91 191 / 70%) 35%,transparent 68%); box-shadow:0 0 17px rgb(185 163 237 / 24%); }.project-card strong,.project-card small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.project-card strong { font-size:12px; font-weight:500; }.project-card small { margin-top:5px; color:#918b9b; font-size:10px; }.project-card__state { margin-left:auto; color:#b9a3ed; font-size:9px; white-space:nowrap; }.project-card--empty { border-style:dashed; }.today-command__saved { display:flex; align-items:center; gap:8px; margin:20px 0 0; color:#7f7b89; font-size:11px; }.today-command__saved-star { color:#d8b977; }
.project-card--paused { opacity:.7; }.project-card--paused .project-card__orb { filter:saturate(.55); opacity:.7; }.project-card--paused .project-card__state { color:#8e879c; }
.day-event { display:flex; align-items:center; gap:12px; min-height:48px; padding:10px 12px; border:1px solid rgb(185 163 237 / 15%); border-radius:13px; background:rgb(185 163 237 / 5%); color:#e9e4ee; }.day-event__glyph { display:grid; place-items:center; width:23px; height:23px; color:#b9a3ed; }.day-event strong,.day-event small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.day-event strong { font-size:12px; font-weight:500; }.day-event small { margin-top:3px; color:#85818e; font-size:10px; text-transform:capitalize; }
.day-panel-enter-active,.day-panel-leave-active { transition:opacity .25s ease,transform .35s cubic-bezier(.2,.8,.2,1); }.day-panel-enter-from { opacity:0; transform:translateY(12px); }.day-panel-leave-to { opacity:0; transform:translateY(-12px); }
@keyframes command-breathe { from { transform:translate3d(-2%,1%,0) rotate(-2deg) scale(1); } to { transform:translate3d(2%,-1%,0) rotate(2deg) scale(1.06); } }
@media (max-width:800px) { .today-command { padding:22px 16px; border-radius:24px; }.today-command__hero { align-items:flex-start; flex-direction:column; }.today-command__add { width:100%; }.today-command__layout { grid-template-columns:1fr; gap:16px; }.day-rail-wrap,.day-rail { min-height:250px; height:250px; }.day-rail { padding:95px 14px; }.day-rail__line { left:43px; }.day-orbit { grid-template-columns:30px 1fr auto; gap:10px; min-height:48px; }.day-orbit__dot { margin-left:15px; }.day-orbit__date strong { font-size:20px; }.day-orbit__caption { display:none; }.day-panel { min-height:330px; padding:20px; }.project-pulse__list { grid-template-columns:1fr; } }
@media (prefers-reduced-motion: reduce) { .today-command::before { animation:none; }.day-orbit,.day-task,.day-milestone,.project-card,.today-command__add { transition:none; }.day-panel-enter-active,.day-panel-leave-active { transition:none; } }
</style>
