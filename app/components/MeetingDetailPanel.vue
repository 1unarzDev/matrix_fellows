<script setup lang="ts">
import type { MeetingDisplayStatus, MeetingEvent } from '#shared/types/content'
import { meetingStatusLabel } from '#shared/data/meetings'
import { displayDate } from '#shared/utils/opportunities'

defineProps<{
  meeting: MeetingEvent
  status: MeetingDisplayStatus
  compact?: boolean
}>()
</script>

<template>
  <article
    class="meeting-detail"
    :class="[`meeting-detail--${status}`, { 'meeting-detail--compact': compact }]"
  >
    <div class="meeting-detail__glow" aria-hidden="true" />
    <div class="relative">
      <div class="meeting-detail__header flex flex-wrap items-center justify-between gap-3">
        <p class="meeting-detail__status">
          <span class="meeting-detail__signal" aria-hidden="true" />{{ meetingStatusLabel(status) }}
        </p>
        <time :datetime="meeting.date" class="text-[10px] tracking-[.08em] text-paper/42">
          {{ displayDate(meeting.date) }}
        </time>
      </div>
      <h3 class="mt-5 font-display text-2xl leading-tight tracking-[-.04em] text-paper sm:text-3xl">
        {{ meeting.title }}
      </h3>
      <p class="mt-4 text-sm leading-6 text-paper/58">{{ meeting.summary }}</p>

      <dl class="mt-6 grid grid-cols-2 gap-4 text-xs">
        <div>
          <dt class="meeting-detail__label">When</dt>
          <dd class="mt-2 leading-5 text-paper/72">{{ meeting.time }}</dd>
        </div>
        <div>
          <dt class="meeting-detail__label">Where</dt>
          <dd class="mt-2 leading-5 text-paper/72">{{ meeting.location }}</dd>
        </div>
      </dl>

      <div class="meeting-detail__section">
        <p class="meeting-detail__label">
          {{ status === 'past' ? 'What we covered' : 'Planned discussion' }}
        </p>
        <ul class="mt-4 space-y-3">
          <li
            v-for="topic in meeting.topics"
            :key="topic"
            class="flex gap-3 text-sm leading-6 text-paper/68"
          >
            <span
              class="mt-[.58rem] h-1 w-1 shrink-0 rounded-full bg-current text-[#e4bb72] shadow-[0_0_8px_currentColor]"
            />
            <span>{{ topic }}</span>
          </li>
        </ul>
      </div>

      <div v-if="meeting.resources.length" class="meeting-detail__section">
        <p class="meeting-detail__label">Resources</p>
        <div class="mt-3 grid gap-2">
          <NuxtLink
            v-for="resource in meeting.resources"
            :key="resource.url"
            :to="resource.url"
            :target="resource.url.startsWith('http') ? '_blank' : undefined"
            :rel="resource.url.startsWith('http') ? 'noopener noreferrer' : undefined"
            class="meeting-resource group"
          >
            <span class="min-w-0">
              <span class="block text-xs font-medium text-paper/78">{{ resource.title }}</span>
              <span class="mt-1 block text-[11px] leading-5 text-paper/42">{{
                resource.note
              }}</span>
            </span>
            <SiteIcon
              :size="13"
              class="mt-1 shrink-0 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
            />
          </NuxtLink>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.meeting-detail {
  --meeting-accent: #e4bb72;
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--meeting-accent) 18%, transparent);
  border-radius: 1.5rem;
  padding: clamp(1.15rem, 3vw, 2rem);
  background: color-mix(in srgb, var(--color-paper) 3.6%, transparent);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 5%),
    0 18px 55px rgb(0 0 0 / 12%);
  backdrop-filter: blur(18px) saturate(118%);
}
.meeting-detail--tentative {
  --meeting-accent: #b7a2e2;
  border-style: dashed;
}
.meeting-detail--past {
  --meeting-accent: #89938f;
}
.meeting-detail__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    28rem 18rem at 100% 0%,
    color-mix(in srgb, var(--meeting-accent) 9%, transparent),
    transparent 70%
  );
}
.meeting-detail__status {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--meeting-accent) 82%, var(--color-paper));
}
.meeting-detail__signal {
  width: 0.36rem;
  height: 0.36rem;
  border: 1px solid currentColor;
  border-radius: 999px;
  background: color-mix(in srgb, var(--meeting-accent) 45%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--meeting-accent) 48%, transparent);
}
.meeting-detail--tentative .meeting-detail__signal {
  border-radius: 0.08rem;
  background: transparent;
  transform: rotate(45deg);
}
.meeting-detail--past .meeting-detail__signal {
  box-shadow: none;
}
.meeting-detail__label {
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-paper) 38%, transparent);
}
.meeting-detail__section {
  margin-top: 1.5rem;
  padding-top: 1.35rem;
  background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--meeting-accent) 18%, transparent),
      transparent
    )
    top / 100% 1px no-repeat;
}
.meeting-resource {
  display: flex;
  min-height: 3.75rem;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 1rem;
  padding: 0.8rem 0.9rem;
  color: color-mix(in srgb, var(--meeting-accent) 76%, var(--color-paper));
  background: color-mix(in srgb, var(--color-paper) 2.6%, transparent);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 3%);
  transition:
    color 220ms ease,
    background-color 280ms ease,
    transform 480ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 420ms ease;
}
.meeting-resource:hover,
.meeting-resource:focus-visible {
  color: var(--color-paper);
  background: color-mix(in srgb, var(--meeting-accent) 5%, transparent);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 5%),
    0 10px 28px rgb(0 0 0 / 10%);
  transform: translate3d(0, -1px, 0);
}
@media (max-width: 639px) {
  .meeting-detail--compact {
    border-radius: 1.25rem;
    padding: 1rem;
  }
  .meeting-detail--compact h3 {
    font-size: 1.2rem;
  }
  .meeting-detail--compact .meeting-detail__section {
    margin-top: 1.15rem;
    padding-top: 1rem;
  }
  .meeting-detail--compact li {
    font-size: 0.75rem;
    line-height: 1.2rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .meeting-resource,
  .meeting-resource :deep(svg) {
    transform: none !important;
    transition: none;
  }
}
</style>
