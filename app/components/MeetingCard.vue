<script setup lang="ts">
import type { CalendarOpportunityEntry, MeetingEvent } from '#shared/types/content'
import { meetingDisplayStatus, selectNextMeeting } from '#shared/data/meetings'

const props = withDefaults(defineProps<{ meetings: MeetingEvent[]; calendarEntries?: CalendarOpportunityEntry[] }>(), { calendarEntries: () => [] })
const selected = ref<MeetingEvent>(selectNextMeeting(props.meetings) || props.meetings[0]!)
watch(
  () => props.meetings,
  (next) => {
    selected.value = next.find((meeting) => meeting.id === selected.value.id) || next[0]!
  },
)
</script>

<template>
  <section
    id="meeting-details"
    data-depth-static
    class="scroll-mt-[clamp(10rem,22vh,13rem)] py-16"
    aria-labelledby="next-gathering-title"
  >
    <div class="mb-6 flex items-center justify-between gap-5">
      <div class="flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-acid">
        <span class="h-1.5 w-1.5 rounded-full bg-acid shadow-[0_0_8px_currentColor]" />
        Gatherings
      </div>
      <NuxtLink
        to="/meetings"
        class="group inline-flex min-h-11 items-center gap-2 text-[11px] text-paper/45 transition-[color,gap] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:gap-3 hover:text-acid focus-visible:text-acid motion-reduce:transition-none"
      >
        Meeting archive <SiteIcon name="right" :size="13" />
      </NuxtLink>
    </div>

    <div class="meeting-layout-scroll">
      <div data-meeting-layout class="meeting-layout">
        <div class="meeting-layout__left">
          <div>
            <p class="text-[9px] uppercase tracking-[.18em] text-paper/38">Why we gather</p>
            <h3
              id="next-gathering-title"
              class="mt-4 font-display text-3xl leading-tight tracking-[-.04em] sm:text-4xl"
            >
              A place to turn curiosity into momentum.
            </h3>
            <p class="mt-5 max-w-sm text-sm leading-relaxed text-paper/55">
              Gatherings connect students with practical next steps—finding ideas, choosing a route,
              forming teams, and moving thoughtful work forward together.
            </p>
          </div>
          <MeetingCalendar
            :meetings="meetings"
            :calendar-entries="calendarEntries"
            :initial-meeting-id="selected.id"
            @select="selected = $event"
          />
        </div>

        <div class="meeting-layout__detail-wrap">
          <MeetingDetailPanel
            :key="selected.id"
            class="meeting-layout__detail"
            :meeting="selected"
            :status="meetingDisplayStatus(selected)"
            compact
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.meeting-layout-scroll {
  overflow: visible;
  padding-top: 0.5rem;
}
.meeting-layout {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.meeting-layout__left {
  display: grid;
  gap: 2rem;
}
.meeting-layout__detail {
  --meeting-detail-x: 0;
  --meeting-detail-y: 8px;
  min-height: 100%;
  animation: meeting-detail-arrive 480ms cubic-bezier(0.16, 1, 0.3, 1);
}
.meeting-layout__detail-wrap {
  min-width: 0;
}
@keyframes meeting-detail-arrive {
  from {
    opacity: 0;
    translate: var(--meeting-detail-x) var(--meeting-detail-y);
  }
}
@media (min-width: 768px) {
  .meeting-layout-scroll {
    padding: 0;
  }
  .meeting-layout {
    grid-template-columns: minmax(18rem, 0.86fr) minmax(22rem, 1.14fr);
    gap: 0;
    align-items: stretch;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-paper) 12%, transparent);
    border-radius: 1.5rem;
    background:
      radial-gradient(30rem 22rem at 0% 0%, rgb(224 183 104 / 5%), transparent 72%),
      color-mix(in srgb, var(--color-paper) 3.5%, transparent);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 5%),
      0 22px 65px rgb(0 0 0 / 13%);
    backdrop-filter: blur(18px) saturate(116%);
  }
  .meeting-layout__left {
    padding: clamp(1.4rem, 3vw, 2rem);
  }
  .meeting-layout__left :deep(.meeting-calendar),
  :deep(.meeting-layout__detail) {
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }
  .meeting-layout__left :deep(.meeting-calendar) {
    padding: 0;
  }
  .meeting-layout__detail-wrap {
    position: relative;
    display: flex;
  }
  .meeting-layout__detail-wrap::before {
    position: absolute;
    z-index: 2;
    top: 1.5rem;
    bottom: 1.5rem;
    left: 0;
    width: 1px;
    content: '';
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in srgb, var(--color-paper) 13%, transparent) 14%,
      color-mix(in srgb, #e4bb72 16%, transparent) 52%,
      color-mix(in srgb, var(--color-paper) 9%, transparent) 86%,
      transparent
    );
  }
  .meeting-layout__detail {
    --meeting-detail-x: 8px;
    --meeting-detail-y: 0;
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .meeting-layout__detail {
    animation: none;
  }
}
</style>
