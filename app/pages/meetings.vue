<script setup lang="ts">
import { defaultContent, defaultOpportunities } from '#shared/data/defaults'
import {
  buildMeetingSchedule,
  meetingDisplayStatus,
  meetingStatusLabel,
} from '#shared/data/meetings'
import type { MeetingEvent, PublicContent } from '#shared/types/content'

const { data } = await useFetch<PublicContent>('/api/content', {
  default: () => ({
    content: defaultContent,
    opportunities: defaultOpportunities,
    meetings: buildMeetingSchedule(defaultContent.meeting),
    configured: false,
  }),
})
const meetings = computed(() =>
  data.value?.meetings?.length
    ? data.value.meetings
    : buildMeetingSchedule(data.value?.content.meeting || defaultContent.meeting),
)
const selected = ref<MeetingEvent>(meetings.value[0]!)
watch(meetings, (next) => {
  selected.value = next.find((meeting) => meeting.id === selected.value.id) || next[0]!
})

const showMeeting = (meeting: MeetingEvent) => {
  selected.value = meeting
  if (!import.meta.client) return

  nextTick(() => {
    document.getElementById('calendar-heading')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  })
}

const canonical = 'https://matrixfellows.com/meetings'
useSeoMeta({
  title: 'Research society meetings | Matrix Fellows',
  description:
    'Browse confirmed, projected, and past Matrix Fellows gatherings, including agendas, meeting details, and research resources.',
  ogTitle: 'Matrix Fellows meetings',
  ogDescription: 'See upcoming research-society gatherings, agendas, and resources.',
})
useHead({
  htmlAttrs: { class: 'guide-scroll' },
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Matrix Fellows',
            item: 'https://matrixfellows.com/',
          },
          { '@type': 'ListItem', position: 2, name: 'Meetings', item: canonical },
        ],
      }),
    },
  ],
})
</script>

<template>
  <div class="meetings-page min-h-screen bg-ink text-paper">
    <ScienceAccent theme="biology" />
    <main class="relative z-[1] mx-auto max-w-[86rem] px-5 pb-24 pt-14 sm:px-8 lg:px-12 lg:pt-20">
      <header class="grid gap-8 pb-14 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
        <div>
          <p class="text-[10px] uppercase tracking-[.2em] text-[#e4bb72]">
            Shared work · in motion
          </p>
          <h1
            class="mt-5 max-w-5xl font-display text-5xl leading-[1.02] tracking-[-.06em] sm:text-7xl"
          >
            Meetings are where questions become plans.
          </h1>
        </div>
        <p class="max-w-md text-sm leading-7 text-paper/52">
          Browse confirmed and projected gatherings. Select a marked date for its agenda, location,
          and resources; projected dates remain visibly tentative until confirmed.
        </p>
      </header>

      <section class="meetings-feature" aria-labelledby="calendar-heading">
        <div>
          <p class="text-[9px] uppercase tracking-[.18em] text-paper/35">Schedule</p>
          <h2 id="calendar-heading" class="mt-3 font-display text-3xl tracking-[-.04em]">
            Explore the calendar
          </h2>
          <p class="mt-4 max-w-md text-sm leading-6 text-paper/48">
            Gold marks the next confirmed gathering. Violet diamonds mark projected dates that may
            still move. Muted markers preserve past sessions and their resources.
          </p>
          <MeetingCalendar
            :meetings="meetings"
            :initial-meeting-id="selected.id"
            :show-archive-link="false"
            class="mt-8"
            @select="selected = $event"
          />
        </div>
        <MeetingDetailPanel
          :key="selected.id"
          :meeting="selected"
          :status="meetingDisplayStatus(selected)"
          class="meetings-feature__detail"
        />
      </section>

      <section class="mt-24" aria-labelledby="all-meetings-title">
        <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p class="text-[9px] uppercase tracking-[.18em] text-paper/35">The record</p>
            <h2
              id="all-meetings-title"
              class="mt-3 font-display text-3xl tracking-[-.04em] sm:text-4xl"
            >
              Past and future gatherings
            </h2>
          </div>
          <p class="text-xs text-paper/38">{{ meetings.length }} gatherings currently listed</p>
        </div>
        <div class="mt-8 grid gap-5">
          <article
            v-for="meeting in meetings"
            :id="meeting.id"
            :key="meeting.id"
            class="meeting-row"
            :class="`meeting-row--${meetingDisplayStatus(meeting)}`"
          >
            <div class="meeting-row__date">
              <span class="meeting-row__signal" aria-hidden="true" />
              <span class="text-[9px] uppercase tracking-[.14em] text-paper/35">{{
                new Date(`${meeting.date}T12:00:00Z`).toLocaleDateString('en-US', {
                  month: 'short',
                  timeZone: 'UTC',
                })
              }}</span>
              <span class="mt-1 block font-display text-3xl text-paper">{{
                meeting.date.slice(-2)
              }}</span>
            </div>
            <div class="min-w-0">
              <p class="meeting-row__status text-[9px] uppercase tracking-[.14em]">
                {{ meetingStatusLabel(meetingDisplayStatus(meeting)) }}
              </p>
              <h3
                class="mt-2 font-display text-xl leading-snug tracking-[-.03em] text-paper sm:text-2xl"
              >
                {{ meeting.title }}
              </h3>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-paper/50">{{ meeting.summary }}</p>
            </div>
            <button type="button" class="meeting-row__action" @click="showMeeting(meeting)">
              View details <SiteIcon name="right" :size="13" />
            </button>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.meetings-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(55% 38% at 8% 20%, rgb(224 183 104 / 8%), transparent 72%),
    radial-gradient(50% 40% at 90% 65%, rgb(150 123 194 / 8%), transparent 75%);
}
.meetings-feature {
  display: grid;
  gap: clamp(1.5rem, 4vw, 4rem);
  align-items: start;
  padding: clamp(1rem, 3vw, 2rem);
  border-radius: 2rem;
  background: rgb(244 241 233 / 1.5%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 4%);
}
.meetings-feature__detail {
  animation: meeting-page-detail 480ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes meeting-page-detail {
  from {
    opacity: 0;
    translate: 8px 0;
  }
}
.meeting-row {
  --meeting-row-accent: #e4bb72;
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  padding: 1.25rem;
  border-radius: 1.5rem;
  background: rgb(244 241 233 / 1.8%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 3%);
  transition:
    background-color 260ms ease,
    transform 480ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 420ms ease;
}
.meeting-row--tentative {
  --meeting-row-accent: #b7a2e2;
}
.meeting-row--past {
  --meeting-row-accent: #89938f;
}
.meeting-row:hover {
  background: rgb(244 241 233 / 2.8%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 5%),
    0 16px 44px rgb(0 0 0 / 10%);
  transform: translate3d(0, -1px, 0);
}
.meeting-row__date {
  position: relative;
  display: grid;
  min-height: 4rem;
  place-content: center;
  border-radius: 1.2rem;
  text-align: center;
  background: color-mix(in srgb, var(--meeting-row-accent) 5%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--meeting-row-accent) 16%, transparent);
}
.meeting-row__signal {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 999px;
  background: var(--meeting-row-accent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--meeting-row-accent) 65%, transparent);
}
.meeting-row--tentative .meeting-row__signal {
  border: 1px solid var(--meeting-row-accent);
  border-radius: 0.04rem;
  background: transparent;
  box-shadow: none;
  transform: rotate(45deg);
}
.meeting-row--past .meeting-row__signal {
  width: 0.2rem;
  height: 0.2rem;
  box-shadow: none;
}
.meeting-row__status {
  color: color-mix(in srgb, var(--meeting-row-accent) 82%, var(--color-paper));
}
.meeting-row__action {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.7rem;
  justify-self: start;
  color: rgb(228 187 114 / 72%);
  font-size: 0.7rem;
  transition:
    color 180ms ease,
    gap 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.meeting-row__action:hover,
.meeting-row__action:focus-visible {
  color: #f0cb89;
  gap: 0.9rem;
}
@media (min-width: 768px) {
  .meetings-feature {
    grid-template-columns: minmax(19rem, 0.78fr) minmax(24rem, 1.22fr);
  }
  .meeting-row {
    grid-template-columns: 5rem minmax(0, 1fr) auto;
    align-items: center;
    padding: 1.5rem;
  }
  .meeting-row__action {
    justify-self: end;
  }
}
@media (prefers-reduced-motion: reduce) {
  .meetings-feature__detail {
    animation: none;
  }
  .meeting-row,
  .meeting-row__action {
    transition: none;
    transform: none;
  }
}
</style>
