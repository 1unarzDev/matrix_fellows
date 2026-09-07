<script setup lang="ts">
import type { Opportunity } from '#shared/types/content'
import { sortOpportunities } from '#shared/utils/opportunities'
import { getOpportunityState } from '#shared/utils/opportunity-lifecycle'
import { groupOpportunityPathways } from '#shared/utils/opportunity-pathways'
const props = defineProps<{ opportunities: Opportunity[] }>()
const query = ref('')
const kind = ref('All types')
const status = ref('All statuses')
const page = ref(1)
const showAll = ref(false)
const pageSize = 6
const results = ref<HTMLElement>()
const resultViewport = ref<HTMLElement>()
function holdHeight() {
  if (resultViewport.value)
    resultViewport.value.style.height = `${resultViewport.value.getBoundingClientRect().height}px`
}
function resizeResults(element: Element) {
  if (resultViewport.value)
    resultViewport.value.style.height = `${element.getBoundingClientRect().height}px`
}
function releaseHeight() {
  if (resultViewport.value) resultViewport.value.style.height = ''
}
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
  'Rolling submissions',
  'Awaiting announcement',
  'Completed',
  'Discontinued',
  'Changed',
  'Unknown',
]
const statusKeys: Record<string, string> = {
  'Rolling submissions': 'rolling',
  Upcoming: 'upcoming',
  'Awaiting announcement': 'awaiting',
  Completed: 'completed',
  Discontinued: 'discontinued',
  Changed: 'changed',
  Unknown: 'unknown',
}
const filtered = computed(() =>
  sortOpportunities(
    groupOpportunityPathways(props.opportunities).filter(
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
  page.value = 1
})
// Calendar statuses from competitions should not hide undated journals when
// switching categories. Search remains intact; status can be refined again.
watch(kind, () => {
  status.value = 'All statuses'
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
watch(pageCount, (count) => {
  page.value = Math.min(page.value, count)
})
const visible = computed(() =>
  showAll.value
    ? filtered.value
    : filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
const resultKey = computed(
  () => `${query.value.trim()}|${kind.value}|${status.value}|${page.value}|${showAll.value}`,
)
function goToPage(value: number) {
  page.value = Math.max(1, Math.min(pageCount.value, value))
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  results.value?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
}
function toggleAll() {
  showAll.value = !showAll.value
  page.value = 1
}
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
      <div
        class="grid min-w-0 grid-cols-2 gap-3 lg:w-[28rem] lg:shrink-0 [&>div]:min-w-0 [&>div]:w-full"
      >
        <ThemedSelect v-model="kind" :options="kinds" label="Opportunity type" />
        <ThemedSelect v-model="status" :options="statuses" label="Opportunity status" />
      </div>
    </div>
    <p v-if="kind === 'Publication'" class="mb-5 max-w-2xl text-xs leading-relaxed text-paper/55">
      Publication routes often use submission guidelines rather than annual deadlines. Check review
      policies, author requirements, and fees; a preprint is not peer-reviewed journal acceptance.
    </p>
    <div
      ref="results"
      class="mb-5 flex scroll-mt-8 flex-wrap items-center justify-between gap-3 text-[10px] text-paper/45"
    >
      <p aria-live="polite">
        {{ filtered.length }} {{ filtered.length === 1 ? 'opportunity' : 'opportunities' }} ·
        {{
          showAll
            ? 'showing all'
            : `showing ${filtered.length ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, filtered.length)}`
        }}
      </p>
      <div v-if="!showAll && pageCount > 1" class="flex items-center gap-3">
        <button
          type="button"
          aria-label="Previous set of opportunities"
          :disabled="page === 1"
          class="tactile flex h-9 w-9 items-center justify-center rounded-full border border-paper/15 disabled:cursor-default disabled:opacity-25"
          @click="goToPage(page - 1)"
        >
          <SiteIcon name="right" :size="14" class="rotate-180" />
        </button>
        <span class="tabular-nums">Page {{ page }} / {{ pageCount }}</span>
        <button
          type="button"
          aria-label="Next set of opportunities"
          :disabled="page === pageCount"
          class="tactile flex h-9 w-9 items-center justify-center rounded-full border border-paper/15 disabled:cursor-default disabled:opacity-25"
          @click="goToPage(page + 1)"
        >
          <SiteIcon name="right" :size="14" />
        </button>
      </div>
      <button
        v-if="filtered.length > pageSize"
        type="button"
        class="tactile rounded-full border border-paper/15 px-4 py-2 text-paper/70 hover:border-acid/40 hover:text-acid"
        @click="toggleAll"
      >
        {{ showAll ? 'Browse by page' : 'View all opportunities' }}
      </button>
    </div>
    <div
      ref="resultViewport"
      class="transition-[height] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
    >
      <Transition
        mode="out-in"
        @before-leave="holdHeight"
        @enter="resizeResults"
        @after-enter="releaseHeight"
        @enter-cancelled="releaseHeight"
        enter-active-class="transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
        enter-from-class="translate-y-3 opacity-0 motion-reduce:translate-y-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-[opacity,transform] duration-250 ease-in motion-reduce:transition-none"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-1 opacity-0 motion-reduce:translate-y-0"
      >
        <div :key="resultKey" class="grid items-stretch gap-5 xl:grid-cols-2">
          <OpportunityCard v-for="item in visible" :key="item.id" :item="item" :now="now" />
          <div
            v-if="!filtered.length"
            class="rounded-xl border border-dashed border-paper/20 px-6 py-14 text-center xl:col-span-2"
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
        </div>
      </Transition>
    </div>
    <nav
      v-if="!showAll && pageCount > 1"
      aria-label="Opportunity pages"
      class="mt-8 flex flex-wrap items-center justify-center gap-2 pb-2"
    >
      <button
        type="button"
        aria-label="Previous opportunity page"
        :disabled="page === 1"
        class="tactile flex h-10 w-10 items-center justify-center rounded-full border border-paper/15 text-paper/65 disabled:cursor-default disabled:opacity-25"
        @click="goToPage(page - 1)"
      >
        <SiteIcon name="right" :size="16" class="rotate-180" />
      </button>
      <button
        v-for="number in pageCount"
        :key="number"
        type="button"
        :aria-label="`Opportunity page ${number}`"
        :aria-current="number === page ? 'page' : undefined"
        class="tactile h-10 min-w-10 rounded-full border px-3 text-xs"
        :class="
          number === page
            ? 'border-acid/40 bg-acid/10 text-acid'
            : 'border-transparent text-paper/50 hover:border-paper/20 hover:text-paper'
        "
        @click="goToPage(number)"
      >
        {{ number }}
      </button>
      <button
        type="button"
        aria-label="Next opportunity page"
        :disabled="page === pageCount"
        class="tactile flex h-10 w-10 items-center justify-center rounded-full border border-paper/15 text-paper/65 disabled:cursor-default disabled:opacity-25"
        @click="goToPage(page + 1)"
      >
        <SiteIcon name="right" :size="16" />
      </button>
    </nav>
  </section>
</template>
