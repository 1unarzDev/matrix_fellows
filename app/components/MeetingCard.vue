<script setup lang="ts">
import type { Meeting, MeetingEvent } from '#shared/types/content'
import { buildMeetingSchedule, meetingDisplayStatus } from '#shared/data/meetings'

const props = defineProps<{ meeting: Meeting }>()
const meetings = computed(() => buildMeetingSchedule(props.meeting))
const selected = ref<MeetingEvent>(meetings.value[0]!)
watch(meetings, (next) => {
  selected.value = next.find((meeting) => meeting.id === selected.value.id) || next[0]!
})
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
              {{ meeting.title }}
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
    <p class="mt-3 text-[10px] text-paper/30 md:hidden">
      Swipe sideways to compare the calendar and gathering details.
    </p>
  </section>
</template>

<style scoped>
.meeting-layout-scroll {
  overflow-x: auto;
  margin-inline: -1rem;
  padding: 0.5rem 1rem 1.25rem;
  scroll-padding-inline: 1rem;
  scroll-snap-type: inline proximity;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-acid) 28%, transparent) transparent;
  overscroll-behavior-inline: contain;
}
.meeting-layout {
  display: grid;
  width: 100%;
  min-width: 39rem;
  grid-template-columns: minmax(17rem, 0.82fr) minmax(20rem, 1.18fr);
  gap: clamp(1rem, 3vw, 2.25rem);
  align-items: start;
}
.meeting-layout__left {
  display: grid;
  gap: 2rem;
  scroll-snap-align: start;
}
.meeting-layout__detail {
  min-height: 100%;
  scroll-snap-align: start;
  animation: meeting-detail-arrive 480ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes meeting-detail-arrive {
  from {
    opacity: 0;
    translate: 8px 0;
  }
}
@media (min-width: 768px) {
  .meeting-layout-scroll {
    overflow: visible;
    margin: 0;
    padding: 0;
  }
  .meeting-layout {
    min-width: 0;
    grid-template-columns: minmax(18rem, 0.86fr) minmax(22rem, 1.14fr);
  }
}
@media (prefers-reduced-motion: reduce) {
  .meeting-layout__detail {
    animation: none;
  }
}
</style>
