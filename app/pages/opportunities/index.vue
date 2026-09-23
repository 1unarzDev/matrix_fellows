<script setup lang="ts">
import type { OpportunitySearchResult } from '#shared/types/content'

const route = useRoute()
const router = useRouter()
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
const disciplines = [
  'Biomedical engineering',
  'Robotics',
  'Electrical engineering',
  'Mechanical engineering',
  'Biology',
  'Chemistry',
  'AI & machine learning',
  'Computer science',
  'Mathematics',
  'Physics',
  'Materials science',
  'Environmental science',
]
const kinds = ['Competition', 'Conference', 'Workshop', 'Publication', 'Program']
const stages = [
  ['idea', 'Idea or proposal'],
  ['prototype', 'Prototype'],
  ['preliminary-results', 'Preliminary results'],
  ['completed-research', 'Completed research'],
  ['learning-team-practice', 'Learning / team practice'],
]
const statuses = [
  ['open', 'Open'],
  ['upcoming', 'Upcoming'],
  ['awaiting-announcement', 'Awaiting announcement'],
  ['rolling', 'Rolling'],
  ['closed', 'Closed'],
  ['historical', 'Historical'],
]
const asArray = (value: unknown) =>
  (Array.isArray(value) ? value : value ? [value] : []).map(String)
const queryText = ref(String(route.query.q || ''))
const composing = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
const apiQuery = computed(() => ({
  q: route.query.q,
  discipline: route.query.discipline,
  kind: route.query.kind,
  highSchool: route.query.highSchool,
  stage: route.query.stage,
  status: route.query.status,
  mode: route.query.mode,
  free: route.query.free,
  archival: route.query.archival,
  sort: route.query.sort,
  page: route.query.page,
  pageSize: 12,
}))
const { data, status, error } = await useFetch<OpportunitySearchResult>('/api/opportunities', {
  query: apiQuery,
  watch: [apiQuery],
})
const selected = (key: string, value: string) => asArray(route.query[key]).includes(value)
function replaceQuery(changes: Record<string, string | string[] | undefined>, resetPage = true) {
  const next = { ...route.query, ...changes }
  if (resetPage) delete next.page
  for (const key of Object.keys(next))
    if (!next[key] || (Array.isArray(next[key]) && !next[key]!.length)) delete next[key]
  return router.replace({ path: '/opportunities', query: next })
}
function toggle(key: string, value: string) {
  const values = asArray(route.query[key])
  void replaceQuery({
    [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
  })
}
function commitSearch() {
  if (composing.value) return
  clearTimeout(searchTimer)
  void replaceQuery({ q: queryText.value.trim() || undefined })
}
function scheduleSearch() {
  if (composing.value) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(commitSearch, 300)
}
function shortcut(kind: 'school' | 'early' | 'workshops') {
  if (kind === 'school') void replaceQuery({ highSchool: ['supported'] })
  if (kind === 'early') void replaceQuery({ stage: ['idea', 'prototype', 'preliminary-results'] })
  if (kind === 'workshops') void replaceQuery({ kind: ['Workshop'] })
}
const activeCount = computed(() =>
  ['discipline', 'kind', 'highSchool', 'stage', 'status', 'mode', 'free', 'archival'].reduce(
    (n, key) => n + asArray(route.query[key]).length,
    0,
  ),
)
const filterDialog = ref<HTMLDialogElement>()
const filterSnapshot = ref<Record<string, unknown>>({})
function openFilters() {
  filterSnapshot.value = { ...route.query }
  filterDialog.value?.showModal()
}
function cancelFilters() {
  void router.replace({
    path: '/opportunities',
    query: filterSnapshot.value as Record<string, string | string[]>,
  })
  filterDialog.value?.close()
}
function clearFilters() {
  const q = route.query.q
  void router.replace({ path: '/opportunities', query: q ? { q } : {} })
}
function pageTo(page: number) {
  void replaceQuery({ page: page > 1 ? String(page) : undefined }, false)
  if (import.meta.client)
    window.scrollTo({
      top: 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
}
function changeSort(event: Event) {
  void replaceQuery({ sort: (event.target as HTMLSelectElement).value })
}
watch(
  () => route.query.q,
  (value) => {
    if (String(value || '') !== queryText.value) queryText.value = String(value || '')
  },
)
onBeforeUnmount(() => clearTimeout(searchTimer))

const canonical = 'https://matrixfellows.com/opportunities'
useSeoMeta({
  title: 'Research opportunities for students | Matrix Fellows',
  description:
    'Search vetted workshops, conferences, competitions, programs, and publication routes by field, preparation, eligibility, and next action.',
  ogTitle: 'Research opportunity catalog — Matrix Fellows',
  ogDescription: 'Find a specific route for sharing, developing, or publishing student research.',
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  meta: [
    {
      name: 'robots',
      content: route.query.q || activeCount.value ? 'noindex,follow' : 'index,follow',
    },
  ],
})
</script>

<template>
  <div class="catalog-page min-h-screen bg-ink text-paper" :data-catalog-ready="hydrated">
    <CatalogHeader />
    <main class="relative z-[1] mx-auto max-w-[90rem] px-5 pb-24 pt-14 sm:px-8 lg:px-12 lg:pt-20">
      <div class="max-w-4xl">
        <p class="text-[10px] uppercase tracking-[.2em] text-acid">Research discovery</p>
        <h1 class="mt-5 font-display text-4xl tracking-[-.055em] sm:text-6xl">
          Find a route for the work you want to do.
        </h1>
        <p class="mt-5 max-w-2xl text-sm leading-7 text-paper/58">
          Search specific poster, paper, workshop, challenge, and research-program routes.
          Eligibility, costs, and presentation requirements remain explicit when organizers have not
          stated them.
        </p>
      </div>

      <form action="/opportunities" method="get" class="mt-10" @submit.prevent="commitSearch">
        <label for="catalog-search" class="mb-2 block text-xs text-paper/65"
          >Search opportunities</label
        >
        <div
          class="flex min-h-14 items-center rounded-xl border border-paper/20 bg-paper/[.025] px-4 focus-within:border-acid/60"
        >
          <SiteIcon name="search" :size="18" class="mr-3 text-paper/40" />
          <!-- Prettier expands this two-statement Vue handler into an invalid expression. -->
          <!-- prettier-ignore -->
          <input
            id="catalog-search"
            v-model="queryText"
            name="q"
            type="search"
            class="min-w-0 flex-1 bg-transparent py-4 text-base outline-none placeholder:text-paper/32"
            placeholder="robot learning, biomedical imaging, or a workshop name"
            autocomplete="off"
            @input="scheduleSearch"
            @compositionstart="composing = true"
            @compositionend="composing = false; scheduleSearch()"
          />
          <button type="submit" class="min-h-11 px-3 text-xs text-acid">Search</button>
        </div>
      </form>
      <div class="mt-4 flex flex-wrap gap-2" aria-label="Discovery shortcuts">
        <button
          type="button"
          class="tactile min-h-11 rounded-full border border-paper/15 px-4 text-xs text-paper/65 hover:border-acid/40 hover:text-acid"
          @click="shortcut('school')"
        >
          High-school routes
        </button>
        <button
          type="button"
          class="tactile min-h-11 rounded-full border border-paper/15 px-4 text-xs text-paper/65 hover:border-acid/40 hover:text-acid"
          @click="shortcut('early')"
        >
          Share early research
        </button>
        <button
          type="button"
          class="tactile min-h-11 rounded-full border border-paper/15 px-4 text-xs text-paper/65 hover:border-acid/40 hover:text-acid"
          @click="shortcut('workshops')"
        >
          Workshops &amp; calls
        </button>
      </div>

      <div class="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] xl:gap-16">
        <aside class="hidden lg:block" aria-label="Opportunity filters">
          <OpportunityFilterFields
            :disciplines="disciplines"
            :kinds="kinds"
            :stages="stages"
            :statuses="statuses"
            :selected="selected"
            :facets="data?.facets"
            @toggle="toggle"
          />
        </aside>
        <section aria-labelledby="results-title" class="min-w-0">
          <div
            class="flex flex-wrap items-center justify-between gap-4 border-b border-paper/15 pb-5"
          >
            <div>
              <h2 id="results-title" class="font-display text-2xl tracking-[-.035em]">
                Opportunities
              </h2>
              <p class="mt-1 text-xs text-paper/45" aria-live="polite">
                {{ data?.total ?? 0 }} {{ data?.total === 1 ? 'match' : 'matches'
                }}<span v-if="data?.mode === 'fallback'"> · lexical fallback</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="min-h-11 rounded-full border border-paper/15 px-4 text-xs text-paper/70 lg:hidden"
                @click="openFilters"
              >
                Filters<span v-if="activeCount"> ({{ activeCount }})</span>
              </button>
              <label class="sr-only" for="catalog-sort">Sort opportunities</label>
              <select
                id="catalog-sort"
                :value="String(route.query.sort || 'relevance')"
                class="min-h-11 rounded-full border border-paper/15 bg-ink px-4 text-xs text-paper/70"
                @change="changeSort"
              >
                <option value="relevance">Relevance</option>
                <option value="next-deadline">Next submission</option>
                <option value="verified">Recently verified</option>
              </select>
            </div>
          </div>

          <div v-if="data?.unavailable || error" class="mt-8 rounded-xl border border-paper/15 p-7">
            <h3 class="font-display text-xl">The catalog could not be retrieved.</h3>
            <p class="mt-3 text-sm text-paper/55">
              Your query and filters are still here. Try again shortly; no empty response has been
              treated as authoritative.
            </p>
          </div>
          <div
            v-else-if="!data?.items.length && status !== 'pending'"
            class="mt-8 rounded-xl border border-dashed border-paper/20 p-8 text-center"
          >
            <h3 class="font-display text-xl">No supported matches.</h3>
            <p class="mt-3 text-sm text-paper/50">
              A correct empty result is better than silently loosening eligibility, cost, or
              participation requirements.
            </p>
            <button
              type="button"
              class="mt-5 min-h-11 text-xs text-acid underline underline-offset-4"
              @click="clearFilters"
            >
              Remove all filters
            </button>
          </div>
          <Transition name="catalog-results" mode="out-in">
            <div
              v-if="data?.items.length"
              :key="`${route.fullPath}:${data.version}`"
              :aria-busy="status === 'pending'"
            >
              <OpportunityResultRow v-for="item in data.items" :key="item.id" :item="item" />
            </div>
          </Transition>
          <nav
            v-if="data && data.pageCount > 1"
            aria-label="Catalog pages"
            data-mobile-pagination="compact"
            class="mt-9 flex flex-nowrap items-center justify-center gap-3"
          >
            <button
              type="button"
              aria-label="Previous catalog page"
              :disabled="data.page === 1"
              class="min-h-11 shrink-0 rounded-full border border-paper/15 px-4 text-xs disabled:opacity-35"
              @click="pageTo(data.page - 1)"
            >
              <span class="sm:hidden">Prev</span><span class="hidden sm:inline">Previous</span>
            </button>
            <span class="min-w-24 text-center text-xs tabular-nums text-paper/60"
              >Page {{ data.page }} of {{ data.pageCount }}</span
            >
            <button
              type="button"
              aria-label="Next catalog page"
              :disabled="data.page === data.pageCount"
              class="min-h-11 shrink-0 rounded-full border border-paper/15 px-4 text-xs disabled:opacity-35"
              @click="pageTo(data.page + 1)"
            >
              Next
            </button>
          </nav>
        </section>
      </div>
    </main>

    <dialog
      ref="filterDialog"
      class="m-0 ml-auto h-dvh max-h-none w-[min(92vw,25rem)] max-w-none bg-ink p-0 text-paper backdrop:bg-black/65"
      aria-labelledby="mobile-filters-title"
    >
      <form method="dialog" class="flex h-full flex-col" @submit.prevent="filterDialog?.close()">
        <div class="flex items-center justify-between border-b border-paper/15 px-5 py-4">
          <h2 id="mobile-filters-title" class="font-display text-xl">Filters</h2>
          <button type="button" class="min-h-11 px-3 text-xs" @click="cancelFilters">Cancel</button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-5">
          <OpportunityFilterFields
            :disciplines="disciplines"
            :kinds="kinds"
            :stages="stages"
            :statuses="statuses"
            :selected="selected"
            :facets="data?.facets"
            @toggle="toggle"
          />
        </div>
        <div
          class="grid grid-cols-2 gap-3 border-t border-paper/15 bg-ink px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
        >
          <button
            type="button"
            class="min-h-12 rounded-full border border-paper/15 text-xs"
            @click="clearFilters"
          >
            Reset</button
          ><button
            type="submit"
            class="min-h-12 rounded-full border border-acid/40 bg-acid/10 text-xs text-acid"
          >
            Apply {{ data?.total ?? 0 }}
          </button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<style scoped>
.catalog-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(70% 55% at 78% 5%, rgba(74, 113, 125, 0.12), transparent 70%),
    radial-gradient(55% 45% at 8% 30%, rgba(83, 67, 119, 0.1), transparent 72%);
}
.catalog-results-enter-active,
.catalog-results-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}
.catalog-results-enter-from,
.catalog-results-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
@media (prefers-reduced-motion: reduce) {
  .catalog-results-enter-active,
  .catalog-results-leave-active {
    transition: none;
  }
  .catalog-results-enter-from,
  .catalog-results-leave-to {
    transform: none;
  }
}
</style>
