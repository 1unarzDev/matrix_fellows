<script setup lang="ts">
import type { Opportunity } from '#shared/types/content'
import { displayDate } from '#shared/utils/opportunities'
import { getOpportunityState, getTimeline } from '#shared/utils/opportunity-lifecycle'

const route = useRoute()
const slug = String(route.params.slug || '')
const { data, error } = await useFetch<{ item: Opportunity; version: string }>(
  `/api/opportunities/${encodeURIComponent(slug)}`,
)
if (error.value || !data.value?.item)
  throw createError({ statusCode: 404, statusMessage: 'Opportunity not found' })
const item = computed(() => data.value!.item)
const now = Date.now()
const timeline = computed(() => getTimeline(item.value))
const next = computed(() =>
  timeline.value.find(
    (point) =>
      !point.superseded &&
      Date.parse(point.date.length === 10 ? `${point.date}T23:59:59Z` : point.date) >= now,
  ),
)
const state = computed(() => getOpportunityState(item.value, now))
const canonical = `https://matrixfellows.com/opportunities/${slug}`
useSeoMeta({
  title: () => `${item.value.title} | Matrix Fellows opportunities`,
  description: () => item.value.description.slice(0, 155),
  ogTitle: () => item.value.title,
  ogDescription: () => item.value.description,
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
const policyLabel = computed(
  () =>
    ({
      supported: 'Explicitly supports high-school participants',
      excluded: 'High-school participants are excluded',
      'not-stated': 'The organizer does not state a high-school policy',
    })[item.value.highSchoolPolicy || 'not-stated'],
)
</script>

<template>
  <div class="catalog-detail min-h-screen bg-ink text-paper">
    <CatalogHeader />
    <main class="relative z-[1] mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-8 lg:pt-18">
      <NuxtLink
        to="/opportunities"
        class="inline-flex min-h-11 items-center text-xs text-paper/55 hover:text-acid"
        >← All opportunities</NuxtLink
      >
      <header class="mt-7 border-b border-paper/15 pb-10">
        <p class="text-[10px] uppercase tracking-[.17em] text-acid">
          {{ item.kind }}<span v-if="item.edition"> · {{ item.edition }}</span>
        </p>
        <h1 class="mt-5 max-w-4xl font-display text-4xl tracking-[-.055em] sm:text-6xl">
          {{ item.title }}
        </h1>
        <p v-if="item.parent?.name || item.series?.name" class="mt-4 text-sm text-paper/45">
          Part of {{ item.parent?.name || item.series?.name }}
        </p>
        <p class="mt-6 max-w-3xl text-base leading-8 text-paper/62">{{ item.description }}</p>
        <div class="mt-7 flex flex-wrap gap-3">
          <OpportunitySaveButton :id="item.id" /><a
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="tactile inline-flex min-h-11 items-center rounded-full border border-acid/40 bg-acid/10 px-5 text-xs text-acid"
            >Official call ↗</a
          >
        </div>
      </header>

      <div class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div class="space-y-12">
          <section aria-labelledby="next-action">
            <p class="text-[10px] uppercase tracking-[.16em] text-paper/40">Next action</p>
            <h2 id="next-action" class="mt-3 font-display text-2xl">
              {{ next?.label || state.label }}
            </h2>
            <p v-if="next" class="mt-3 text-lg text-acid">
              {{ displayDate(next.date, next.timezone || 'UTC') }}
            </p>
            <p class="mt-3 text-sm leading-6 text-paper/55">
              {{
                next?.evidence ||
                item.lifecycleEvidence ||
                'No current deadline has been confirmed. Check the official source before planning around a date.'
              }}
            </p>
            <p v-if="next?.originalTimezone || next?.precision" class="mt-2 text-xs text-paper/38">
              {{
                next.originalTimezone ||
                (next.precision === 'date-only'
                  ? 'Date only; exact cutoff not stated'
                  : next.timezone)
              }}
            </p>
          </section>

          <section aria-labelledby="requirements">
            <h2 id="requirements" class="font-display text-2xl">
              Requirements before the deadline
            </h2>
            <p class="mt-4 text-sm leading-7 text-paper/60">
              {{ policyLabel }}. {{ item.highSchoolEvidence || item.eligibility }}
            </p>
            <ul v-if="item.prerequisites?.length" class="mt-5 space-y-3 text-sm text-paper/62">
              <li v-for="requirement in item.prerequisites" :key="requirement" class="flex gap-3">
                <span class="text-acid" aria-hidden="true">—</span><span>{{ requirement }}</span>
              </li>
            </ul>
            <p v-else class="mt-4 text-sm text-paper/45">
              No structured prerequisite list has been verified; consult the organizer’s full
              eligibility and submission rules.
            </p>
          </section>

          <section aria-labelledby="timeline">
            <h2 id="timeline" class="font-display text-2xl">Edition timeline</h2>
            <ol v-if="timeline.length" class="mt-6 border-l border-paper/15 pl-5">
              <li
                v-for="point in timeline"
                :key="`${point.date}:${point.label}`"
                class="relative pb-7 last:pb-0"
              >
                <span
                  class="absolute -left-[1.42rem] top-1 h-2 w-2 rounded-full border border-acid bg-ink"
                  aria-hidden="true"
                />
                <p class="text-sm text-paper/80">{{ point.label }}</p>
                <p class="mt-1 text-xs text-acid/80">
                  {{ displayDate(point.date, point.timezone || 'UTC')
                  }}<span v-if="point.superseded" class="text-paper/40"> · superseded</span>
                </p>
                <details class="mt-2 text-xs text-paper/45">
                  <summary class="cursor-pointer">Evidence and source</summary>
                  <p class="mt-2 leading-5">{{ point.evidence }}</p>
                  <a
                    :href="point.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-2 inline-block text-acid underline underline-offset-4"
                    >View source ↗</a
                  >
                </details>
              </li>
            </ol>
            <p v-else class="mt-4 text-sm text-paper/45">
              The next cycle has not announced typed milestones yet.
            </p>
          </section>

          <section aria-labelledby="costs">
            <h2 id="costs" class="font-display text-2xl">Costs and participation</h2>
            <dl class="mt-5 grid gap-4 sm:grid-cols-2">
              <div
                v-for="entry in Object.entries(item.costs || {})"
                :key="entry[0]"
                class="border-t border-paper/12 pt-3"
              >
                <dt class="text-[10px] uppercase tracking-[.14em] text-paper/38">
                  {{ entry[0].replace(/([A-Z])/g, ' $1') }}
                </dt>
                <dd class="mt-2 text-sm text-paper/62">{{ entry[1] || 'Not stated' }}</dd>
              </div>
            </dl>
            <p v-if="!item.costs" class="mt-4 text-sm text-paper/45">
              Costs are unknown, not assumed free. Confirm submission, registration, travel, and
              attendance costs independently.
            </p>
            <p v-if="item.participationModes?.length" class="mt-4 text-sm text-paper/60">
              Modes: {{ item.participationModes.join(' · ').replaceAll('-', ' ') }}
            </p>
          </section>

          <section v-if="item.outcomes?.length" aria-labelledby="outcomes">
            <h2 id="outcomes" class="font-display text-2xl">What participation can lead to</h2>
            <ul class="mt-5 space-y-3 text-sm text-paper/60">
              <li v-for="outcome in item.outcomes" :key="outcome">— {{ outcome }}</li>
            </ul>
          </section>
        </div>

        <aside class="space-y-7 text-xs">
          <div>
            <p class="uppercase tracking-[.14em] text-paper/35">Disciplines</p>
            <p class="mt-2 leading-5 text-paper/65">
              {{ (item.disciplines?.length ? item.disciplines : [item.discipline]).join(' · ') }}
            </p>
          </div>
          <div>
            <p class="uppercase tracking-[.14em] text-paper/35">Contribution</p>
            <p class="mt-2 leading-5 text-paper/65">
              {{ item.contributionFormat || item.routeType || 'See official call' }}
            </p>
          </div>
          <div>
            <p class="uppercase tracking-[.14em] text-paper/35">Eligibility</p>
            <p class="mt-2 leading-5 text-paper/65">{{ item.eligibility }}</p>
          </div>
          <div>
            <p class="uppercase tracking-[.14em] text-paper/35">Location</p>
            <p class="mt-2 leading-5 text-paper/65">{{ item.location }}</p>
          </div>
          <div>
            <p class="uppercase tracking-[.14em] text-paper/35">Last confirmation</p>
            <p class="mt-2 leading-5 text-paper/65">
              {{ displayDate(item.monitoring?.lastSuccessAt || item.verifiedAt) }}
            </p>
            <p v-if="state.stale" class="mt-2 text-paper/45">
              Evidence may be stale; verify before acting.
            </p>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped>
.catalog-detail::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(60% 45% at 85% 0%, rgba(74, 113, 125, 0.11), transparent 72%);
}
</style>
