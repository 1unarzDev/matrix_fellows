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
  <article class="group border-b border-paper/12 py-7 first:border-t sm:py-9">
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
        <h2 class="mt-3 font-display text-xl tracking-[-.03em] text-paper sm:text-2xl">
          <NuxtLink :to="`/opportunities/${item.slug}`" class="hover:text-acid">{{
            item.title
          }}</NuxtLink>
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
          class="inline-flex min-h-11 items-center text-xs text-acid"
          >Details →</NuxtLink
        >
      </div>
    </div>
  </article>
</template>
