<script setup lang="ts">
import type { Opportunity } from '#shared/types/content'
import { displayDate } from '#shared/utils/opportunities'
import { getOpportunityState, getTimeline } from '#shared/utils/opportunity-lifecycle'
const props = defineProps<{ item: Opportunity }>()
const now = Date.now()
const state = computed(() => getOpportunityState(props.item, now))
const next = computed(() =>
  getTimeline(props.item).find(
    (point) =>
      !point.superseded &&
      Date.parse(point.date.length === 10 ? `${point.date}T23:59:59Z` : point.date) >= now,
  ),
)
const policy = computed(
  () =>
    ({
      supported: 'Explicit high-school route',
      excluded: 'High school excluded',
      'not-stated': 'High-school policy not stated',
    })[props.item.highSchoolPolicy || 'not-stated'],
)
</script>

<template>
  <article
    class="opportunity-row group relative border-b border-paper/12 py-7 first:border-t sm:py-9"
  >
    <div class="flex items-start gap-4 sm:gap-7">
      <div class="min-w-0 flex-1">
        <div
          class="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] uppercase tracking-[.14em] text-paper/40"
        >
          <span>{{ item.kind }}</span
          ><span aria-hidden="true">/</span>
          <span>{{ item.edition || 'Current guidance' }}</span>
          <span
            v-if="item.parent?.name || item.series?.name"
            class="normal-case tracking-normal text-paper/55"
            >{{ item.parent?.name || item.series?.name }}</span
          >
        </div>
        <h2
          class="opportunity-row__title mt-3 font-display text-xl tracking-[-.03em] text-paper sm:text-2xl"
        >
          <NuxtLink :to="`/opportunities/${item.slug}`">{{ item.title }}</NuxtLink>
        </h2>
        <p class="mt-3 max-w-3xl text-sm leading-6 text-paper/58">{{ item.description }}</p>
        <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-paper/52">
          <span>{{
            (item.disciplines?.length ? item.disciplines : [item.discipline])
              .slice(0, 3)
              .join(' · ')
          }}</span>
          <span>{{ policy }}</span>
          <span v-if="item.preparationStages?.length">{{
            item.preparationStages.join(' · ').replaceAll('-', ' ')
          }}</span>
        </div>
        <p v-if="next" class="mt-4 text-xs text-paper/70">
          <span class="text-acid">{{ next.label }}</span> ·
          {{ displayDate(next.date, next.timezone || 'UTC') }}
        </p>
        <p v-else class="mt-4 text-xs text-paper/45">
          {{ state.label }} · confirm the next action with the organizer
        </p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-3">
        <OpportunitySaveButton :id="item.id" compact />
        <NuxtLink
          :to="`/opportunities/${item.slug}`"
          class="opportunity-row__details inline-flex min-h-11 items-center rounded-full px-3 text-xs text-acid"
          >Details <span aria-hidden="true">→</span></NuxtLink
        >
      </div>
    </div>
  </article>
</template>

<style scoped>
.opportunity-row {
  isolation: isolate;
  animation: row-arrive 440ms cubic-bezier(0.22, 1, 0.36, 1) var(--row-delay, 0ms) both;
  transition:
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 240ms ease;
}
.opportunity-row::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0 -1rem;
  border-radius: 1rem;
  opacity: 0;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-paper) 3.5%, transparent),
      transparent 76%
    ),
    radial-gradient(
      55% 90% at 0% 50%,
      color-mix(in srgb, var(--color-acid) 5%, transparent),
      transparent
    );
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--color-acid) 36%, transparent);
  transition: opacity 280ms ease;
}
.opportunity-row:hover,
.opportunity-row:focus-within {
  border-color: color-mix(in srgb, var(--color-acid) 22%, transparent);
  transform: translate3d(4px, 0, 0);
}
.opportunity-row:hover::before,
.opportunity-row:focus-within::before {
  opacity: 1;
}
.opportunity-row__title a {
  transition:
    color 200ms ease,
    text-shadow 280ms ease;
}
.opportunity-row:hover .opportunity-row__title a,
.opportunity-row__title a:focus-visible {
  color: var(--color-acid);
  text-shadow: 0 0 24px color-mix(in srgb, var(--color-acid) 12%, transparent);
}
.opportunity-row__details {
  gap: 0.35rem;
  border: 1px solid transparent;
  transition:
    gap 280ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms ease,
    background-color 180ms ease;
}
.opportunity-row__details:hover,
.opportunity-row__details:focus-visible {
  gap: 0.6rem;
  border-color: color-mix(in srgb, var(--color-acid) 26%, transparent);
  background: color-mix(in srgb, var(--color-acid) 6%, transparent);
  transform: translate3d(2px, 0, 0);
}
.opportunity-row__details:active {
  transform: scale(0.97);
  transition-duration: 80ms;
}
@keyframes row-arrive {
  from {
    opacity: 0;
    transform: translate3d(0, 7px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .opportunity-row {
    animation: none;
  }
  .opportunity-row,
  .opportunity-row__title a,
  .opportunity-row__details {
    transform: none !important;
    transition: none !important;
  }
}
</style>
