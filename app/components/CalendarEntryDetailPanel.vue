<script setup lang="ts">
import type { CalendarOpportunityEntry } from '#shared/types/content'
import { calendarEntryOccurrenceTitle } from '#shared/utils/calendar'
import { displayDate } from '#shared/utils/opportunities'

const props = defineProps<{ entry: CalendarOpportunityEntry; occurrenceDate?: string }>()
const occurrenceTitle = computed(() =>
  calendarEntryOccurrenceTitle(props.entry, props.occurrenceDate || props.entry.date),
)
const hasOccurrenceTitle = computed(() => occurrenceTitle.value !== props.entry.milestoneTitle)
const isPast = computed(
  () => (props.entry.period?.endDate || props.entry.date) < new Date().toISOString().slice(0, 10),
)
const dateContext = computed(() => {
  const details = [
    props.entry.period?.display === 'span'
      ? `${displayDate(props.entry.period.startDate)} – ${displayDate(props.entry.period.endDate)}`
      : displayDate(props.entry.date),
  ]
  if (props.entry.originalTimezone) details.push(props.entry.originalTimezone)
  else if (props.entry.timezone) details.push(props.entry.timezone)
  if (props.entry.precision === 'date-only') details.push('date only')
  return details.join(' · ')
})
</script>

<template>
  <article class="calendar-detail" :class="[`calendar-detail--${entry.kind}`, `calendar-detail--${entry.state}`, { 'calendar-detail--saved': entry.saved }]">
    <div class="calendar-detail__glow" aria-hidden="true" />
    <div class="relative">
      <div class="calendar-detail__header">
        <p class="calendar-detail__status">
          <span class="calendar-detail__signal" aria-hidden="true" />
          {{ entry.state === 'tentative' ? 'Projected · awaiting confirmation' : entry.kind === 'deadline' ? 'Verified deadline' : 'Verified event date' }}
        </p>
        <p v-if="entry.saved" class="calendar-detail__saved">
          <span aria-hidden="true" /> Saved on this device
        </p>
        <time :datetime="occurrenceDate || entry.date" class="text-[10px] tracking-[.08em] text-paper/42">{{ dateContext }}</time>
      </div>
      <p class="mt-5 text-[10px] uppercase tracking-[.16em] text-paper/38">{{ entry.opportunityTitle }}</p>
      <h3 class="mt-2 font-display text-2xl leading-tight tracking-[-.04em] text-paper sm:text-3xl">{{ occurrenceTitle }}</h3>
      <p v-if="hasOccurrenceTitle" class="calendar-detail__source-milestone">
        Official milestone: {{ entry.milestoneTitle }}
      </p>
      <p class="mt-4 text-sm leading-6 text-paper/58">{{ entry.summary }}</p>

      <dl class="mt-6 grid gap-4 text-xs sm:grid-cols-2">
        <div>
          <dt class="calendar-detail__label">Participation</dt>
          <dd class="mt-2 leading-5 text-paper/72">{{ entry.contributionFormat || 'See the official route details.' }}</dd>
        </div>
        <div>
          <dt class="calendar-detail__label">Where</dt>
          <dd class="mt-2 leading-5 text-paper/72">{{ entry.location }}</dd>
        </div>
      </dl>

      <section v-if="entry.requirements.length" class="calendar-detail__section">
        <p class="calendar-detail__label">What to prepare first</p>
        <ul class="mt-4 space-y-3">
          <li v-for="requirement in entry.requirements" :key="requirement" class="flex gap-3 text-sm leading-6 text-paper/68">
            <span class="mt-[.58rem] h-1 w-1 shrink-0 rounded-full bg-current text-[#c4b2ee] shadow-[0_0_8px_currentColor]" />
            <span>{{ requirement }}</span>
          </li>
        </ul>
      </section>

      <section class="calendar-detail__section">
        <p class="calendar-detail__label">Source and confidence</p>
        <p class="mt-3 text-xs leading-5 text-paper/55">{{ entry.evidence }}</p>
        <p v-if="entry.conflict" class="mt-3 rounded-xl bg-amber-200/[.06] px-3 py-2 text-xs leading-5 text-amber-100/75">Date conflict: {{ entry.conflict }}</p>
        <p class="mt-3 text-[10px] text-paper/35">Last verified {{ displayDate(entry.verifiedAt.slice(0, 10)) }}</p>
      </section>

      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink v-if="entry.submissionUrl && !isPast" :to="entry.submissionUrl" target="_blank" rel="noopener noreferrer" class="calendar-detail__action">
          Submission portal <SiteIcon name="right" :size="13" />
        </NuxtLink>
        <NuxtLink :to="entry.officialUrl" target="_blank" rel="noopener noreferrer" class="calendar-detail__action">
          {{ isPast ? 'View official record' : 'Open official source' }} <SiteIcon name="right" :size="13" />
        </NuxtLink>
        <NuxtLink v-if="entry.detailUrl" :to="entry.detailUrl" class="calendar-detail__secondary">Full opportunity details</NuxtLink>
      </div>
    </div>
  </article>
</template>

<style scoped>
.calendar-detail { --entry-accent:#c4b2ee; position:relative; overflow:hidden; border:1px solid color-mix(in srgb,var(--entry-accent) 18%,transparent); border-radius:1.5rem; padding:clamp(1.15rem,3vw,2rem); background:color-mix(in srgb,var(--color-paper) 3.6%,transparent); backdrop-filter:blur(18px) saturate(118%); }
.calendar-detail--event { --entry-accent:#91b9d9; }
.calendar-detail--tentative { border-style:dashed; }
.calendar-detail--saved { box-shadow:0 0 34px rgb(228 187 114/.055),inset 0 0 0 1px rgb(228 187 114/.08); }
.calendar-detail__glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(28rem 18rem at 100% 0%,color-mix(in srgb,var(--entry-accent) 9%,transparent),transparent 70%); }
.calendar-detail__header { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.75rem; padding-right:3.25rem; }
.calendar-detail__status { display:inline-flex; align-items:center; gap:.55rem; font-size:.5625rem; letter-spacing:.14em; text-transform:uppercase; color:color-mix(in srgb,var(--entry-accent) 82%,var(--color-paper)); }
.calendar-detail__saved { display:inline-flex;align-items:center;gap:.45rem;font-size:.5625rem;letter-spacing:.12em;text-transform:uppercase;color:rgb(228 187 114/72%); }
.calendar-detail__saved span { width:.32rem;height:.32rem;border:1px solid currentColor;border-radius:999px;box-shadow:0 0 8px currentColor; }
.calendar-detail__signal { width:.38rem; height:.38rem; border:1px solid currentColor; transform:rotate(45deg); background:color-mix(in srgb,var(--entry-accent) 25%,transparent); }
.calendar-detail--event .calendar-detail__signal { border-radius:999px; transform:none; box-shadow:0 0 9px color-mix(in srgb,var(--entry-accent) 50%,transparent); }
.calendar-detail--tentative .calendar-detail__signal { background:transparent; border-style:dashed; }
.calendar-detail__label { font-size:.5625rem; letter-spacing:.16em; text-transform:uppercase; color:color-mix(in srgb,var(--color-paper) 38%,transparent); }
.calendar-detail__source-milestone { margin-top:.55rem;font-size:.625rem;line-height:1.25rem;letter-spacing:.04em;color:color-mix(in srgb,var(--color-paper) 38%,transparent); }
.calendar-detail__section { margin-top:1.5rem; padding-top:1.35rem; background:linear-gradient(90deg,color-mix(in srgb,var(--entry-accent) 18%,transparent),transparent) top/100% 1px no-repeat; }
.calendar-detail__action,.calendar-detail__secondary { display:inline-flex; min-height:2.75rem; align-items:center; gap:.65rem; border-radius:999px; padding:.72rem 1rem; font-size:.7rem; transition:transform 420ms cubic-bezier(.16,1,.3,1),background-color 220ms ease,background-position 420ms cubic-bezier(.16,1,.3,1),border-color 220ms ease,box-shadow 320ms ease,color 180ms ease,gap 420ms cubic-bezier(.16,1,.3,1); }
.calendar-detail__action { color:rgb(250 245 235/88%); border:1px solid rgb(228 187 114/20%); background:linear-gradient(112deg,rgb(228 187 114/11%),rgb(196 178 238/10%) 58%,rgb(145 185 217/8%)); background-size:160% 100%; box-shadow:inset 0 1px 0 rgb(255 250 240/5%),0 0 18px rgb(196 178 238/4%); }
.calendar-detail__secondary { color:rgb(244 241 233/55%); }
.calendar-detail__action:hover,.calendar-detail__action:focus-visible { color:#fffaf0; border-color:rgb(228 187 114/34%); transform:translateY(-1px) scale(1.015); gap:.85rem; background-position:100% 0; box-shadow:inset 0 1px 0 rgb(255 250 240/8%),0 7px 24px rgb(0 0 0/12%),0 0 18px rgb(228 187 114/7%); }
.calendar-detail__secondary:hover,.calendar-detail__secondary:focus-visible { color:var(--color-paper); }
@media (prefers-reduced-motion:reduce){.calendar-detail__action,.calendar-detail__secondary{transition:none;transform:none}}
</style>
