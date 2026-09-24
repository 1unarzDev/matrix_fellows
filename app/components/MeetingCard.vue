<script setup lang="ts">
import type { MeetingEvent } from '#shared/types/content'
import { meetingDisplayStatus, selectNextMeeting } from '#shared/data/meetings'

const props = defineProps<{ meetings: MeetingEvent[] }>()
const selected = ref<MeetingEvent>(selectNextMeeting(props.meetings) || props.meetings[0]!)
watch(
  () => props.meetings,
  (next) => {
    selected.value = next.find((meeting) => meeting.id === selected.value.id) || next[0]!
  },
)
</script>

<template>
  <section id="meeting-details" class="scroll-mt-24 py-16" aria-labelledby="next-gathering-title">
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
            <p class="text-[9px] uppercase tracking-[.18em] text-paper/38">Next gathering</p>
            <h3
              id="next-gathering-title"
              class="mt-4 font-display text-3xl leading-tight tracking-[-.04em] sm:text-4xl"
            >
              {{ (selectNextMeeting(meetings) || meetings[0])?.title }}
            </h3>
            <p class="mt-5 max-w-sm text-sm leading-relaxed text-paper/55">
              A space to share what you’re working on, explore something new, and ask better
              questions.
            </p>
          </div>
          <MeetingCalendar
            :meetings="meetings"
            :initial-meeting-id="selected.id"
            @select="selected = $event"
          />
        </div>

        <MeetingDetailPanel
          :key="selected.id"
          class="meeting-layout__detail"
          :meeting="selected"
          :status="meetingDisplayStatus(selected)"
          compact
        />
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
    gap: clamp(1rem, 3vw, 2.25rem);
  }
  .meeting-layout__detail {
    --meeting-detail-x: 8px;
    --meeting-detail-y: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .meeting-layout__detail {
    animation: none;
  }
}
</style>
