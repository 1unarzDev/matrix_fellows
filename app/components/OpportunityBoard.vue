<script setup lang="ts">
import type { Opportunity } from '#shared/types/content'
import { sortOpportunities } from '#shared/utils/opportunities'
import { getOpportunityState } from '#shared/utils/opportunity-lifecycle'
const props = defineProps<{ opportunities: Opportunity[] }>()
const query = ref('')
const kind = ref('All types')
const status = ref('All statuses')
const limit = ref(6)
const now = useState('opportunity-clock', () => Date.now())
let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  now.value = Date.now()
  clock = setInterval(() => {
    now.value = Date.now()
  }, 60000)
})
onBeforeUnmount(() => clearInterval(clock))
const kinds = ['All types', 'Competition', 'Conference', 'Workshop', 'Publication', 'Program']
const statuses = [
  'All statuses',
  'Upcoming',
  'Awaiting announcement',
  'Completed',
  'Discontinued',
  'Changed',
  'Unknown',
]
const statusKeys: Record<string, string> = {
  Upcoming: 'upcoming',
  'Awaiting announcement': 'awaiting',
  Completed: 'completed',
  Discontinued: 'discontinued',
  Changed: 'changed',
  Unknown: 'unknown',
}
const filtered = computed(() =>
  sortOpportunities(
    props.opportunities.filter(
      (item) =>
        item.published &&
        (kind.value === 'All types' || item.kind === kind.value) &&
        (status.value === 'All statuses' ||
          getOpportunityState(item, now.value).key === statusKeys[status.value]) &&
        `${item.title} ${item.description} ${item.discipline} ${item.eligibility} ${item.location}`
          .toLowerCase()
          .includes(query.value.trim().toLowerCase()),
    ),
  ),
)
watch([query, kind, status], () => {
  limit.value = 6
})
function clearFilters() {
  query.value = ''
  kind.value = 'All types'
  status.value = 'All statuses'
}
</script>

<template>
  <section aria-labelledby="opportunities-title" class="border-t border-paper/15 pt-16">
    <div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div>
        <p class="mb-5 text-[10px] uppercase tracking-[.2em] text-acid">
          Out there, waiting for you
        </p>
        <h3 id="opportunities-title" class="font-display text-3xl tracking-[-.04em] sm:text-4xl">
          Find your next opening.
        </h3>
      </div>
      <p class="max-w-xs text-xs leading-relaxed text-paper/45">
        Explore the whole journey, from first announcement to final results. Always confirm dates
        and eligibility with the organizer.
      </p>
    </div>
    <div class="my-8 flex flex-col gap-3 lg:flex-row">
      <label
        class="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-paper/15 px-4 transition-colors duration-700 focus-within:border-acid/60 motion-reduce:transition-none"
      >
        <SiteIcon name="search" :size="17" class="shrink-0 text-paper/40" /><span class="sr-only"
          >Search opportunities</span
        >
        <input
          v-model="query"
          type="search"
          placeholder="A field, an idea, an opportunity…"
          class="w-full min-w-0 bg-transparent py-3.5 text-sm outline-none placeholder:text-paper/35"
        />
      </label>
      <ThemedSelect v-model="kind" :options="kinds" label="Opportunity type" />
      <ThemedSelect v-model="status" :options="statuses" label="Opportunity status" />
    </div>
    <div class="mb-5 flex flex-wrap justify-between gap-2 text-[10px] text-paper/45">
      <p aria-live="polite">
        {{ filtered.length }} {{ filtered.length === 1 ? 'opportunity' : 'opportunities' }} ·
        showing {{ Math.min(limit, filtered.length) }}
      </p>
      <p>Past editions stay here. New dates appear when confirmed.</p>
    </div>
    <div class="grid items-start gap-5 xl:grid-cols-2">
      <OpportunityCard
        v-for="item in filtered.slice(0, limit)"
        :key="item.id"
        :item="item"
        :now="now"
      />
    </div>
    <div
      v-if="!filtered.length"
      class="rounded-xl border border-dashed border-paper/20 px-6 py-14 text-center"
    >
      <p class="text-base">A little more room to explore.</p>
      <p class="mt-2 text-sm text-paper/50">
        No matches for these filters. Try another field, type, or status.
      </p>
      <button
        type="button"
        class="mt-5 text-xs text-acid underline underline-offset-4"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </div>
    <div v-if="filtered.length > limit" class="mt-8 text-center">
      <button
        type="button"
        class="rounded-full border border-paper/20 px-7 py-3 text-xs transition-colors duration-700 hover:border-acid/50 hover:text-acid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acid motion-reduce:transition-none"
        @click="limit += 6"
      >
        Show {{ Math.min(6, filtered.length - limit) }} more opportunities
        <span aria-hidden="true" class="ml-3">↓</span>
      </button>
    </div>
  </section>
</template>
