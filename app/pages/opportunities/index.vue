<script setup lang="ts">
import type { OpportunitySearchResult } from '#shared/types/content'

const route = useRoute()
const router = useRouter()
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
  if (route.query.highSchool) {
    const query = { ...route.query }
    delete query.highSchool
    void router.replace({ path: '/opportunities', query })
  }
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
const sortOptions = [
  {
    value: 'relevance',
    label: 'Relevance',
    description: 'Strongest match to your search and filters',
  },
  {
    value: 'next-deadline',
    label: 'Next submission',
    description: 'Nearest verified actionable deadline first',
  },
  {
    value: 'verified',
    label: 'Recently verified',
    description: 'Most recently confirmed source evidence',
  },
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
  delete next.highSchool
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
const activeCount = computed(() =>
  ['discipline', 'kind', 'stage', 'status', 'mode', 'free', 'archival'].reduce(
    (n, key) => n + asArray(route.query[key]).length,
    0,
  ),
)
const filterDialog = ref<HTMLDialogElement>()
const filterSnapshot = ref<Record<string, unknown>>({})
const filterVisible = ref(false)
let filterCloseTimer: ReturnType<typeof setTimeout> | undefined
function openFilters() {
  clearTimeout(filterCloseTimer)
  filterSnapshot.value = { ...route.query }
  filterDialog.value?.showModal()
  requestAnimationFrame(() => {
    filterVisible.value = true
  })
}
function closeFilters() {
  filterVisible.value = false
  clearTimeout(filterCloseTimer)
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  filterCloseTimer = setTimeout(() => filterDialog.value?.close(), reducedMotion ? 0 : 320)
}
function cancelFilters() {
  void router.replace({
    path: '/opportunities',
    query: filterSnapshot.value as Record<string, string | string[]>,
  })
  closeFilters()
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
watch(
  () => route.query.q,
  (value) => {
    if (String(value || '') !== queryText.value) queryText.value = String(value || '')
  },
)
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  clearTimeout(filterCloseTimer)
})

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
    <div class="catalog-cosmos" aria-hidden="true">
      <svg viewBox="0 0 720 390" fill="none">
        <path d="M88 278 194 192l116 34 92-132 118 65 109-91" />
        <path d="m310 226 58 88 101-42 51-113" />
        <circle cx="88" cy="278" r="3" />
        <circle cx="194" cy="192" r="4" />
        <circle cx="310" cy="226" r="2.5" />
        <circle cx="402" cy="94" r="3.5" />
        <circle cx="520" cy="159" r="4.5" />
        <circle cx="629" cy="68" r="2.5" />
        <circle cx="368" cy="314" r="2.5" />
        <circle cx="469" cy="272" r="3" />
      </svg>
    </div>
    <main class="relative z-[1] mx-auto max-w-[90rem] px-5 pb-24 pt-14 sm:px-8 lg:px-12 lg:pt-20">
      <div class="catalog-intro max-w-4xl">
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

      <form
        action="/opportunities"
        method="get"
        class="catalog-search mt-10"
        @submit.prevent="commitSearch"
      >
        <label for="catalog-search" class="mb-2 block text-xs text-paper/65"
          >Search opportunities</label
        >
        <div
          class="catalog-search__shell flex min-h-14 items-center rounded-2xl px-4"
          :class="{ 'catalog-search__shell--busy': status === 'pending' }"
        >
          <SiteIcon name="search" :size="18" class="catalog-search__icon mr-3 text-paper/40" />
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
          <button type="submit" class="catalog-search__submit min-h-11 rounded-full px-4 text-xs">
            Search
          </button>
        </div>
      </form>

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
                class="catalog-control min-h-11 rounded-full px-4 text-xs text-paper/70 lg:hidden"
                @click="openFilters"
              >
                Filters<span v-if="activeCount"> ({{ activeCount }})</span>
              </button>
              <ThemedSelect
                :model-value="String(route.query.sort || 'relevance')"
                :options="sortOptions"
                label="Sort opportunities"
                align="right"
                compact
                @update:model-value="replaceQuery({ sort: $event })"
              />
            </div>
          </div>

          <div v-if="data?.unavailable || error" class="catalog-state mt-8 rounded-2xl p-7">
            <h3 class="font-display text-xl">The catalog could not be retrieved.</h3>
            <p class="mt-3 text-sm text-paper/55">
              Your query and filters are still here. Try again shortly; no empty response has been
              treated as authoritative.
            </p>
          </div>
          <div
            v-else-if="!data?.items.length && status !== 'pending'"
            class="catalog-state mt-8 rounded-2xl p-8 text-center"
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
              <OpportunityResultRow
                v-for="(item, index) in data.items"
                :key="item.id"
                :item="item"
                :style="`--row-delay:${Math.min(index, 7) * 26}ms`"
              />
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
              class="catalog-control min-h-11 shrink-0 rounded-full px-4 text-xs disabled:opacity-35"
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
              class="catalog-control min-h-11 shrink-0 rounded-full px-4 text-xs disabled:opacity-35"
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
      class="filter-dialog m-0 ml-auto h-dvh max-h-none w-[min(92vw,25rem)] max-w-none p-0 text-paper"
      :class="{ 'filter-dialog--visible': filterVisible }"
      aria-labelledby="mobile-filters-title"
      @cancel.prevent="cancelFilters"
    >
      <form method="dialog" class="flex h-full flex-col" @submit.prevent="closeFilters">
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
          class="filter-dialog__footer grid grid-cols-2 gap-3 border-t border-paper/15 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
        >
          <button
            type="button"
            class="catalog-control min-h-12 rounded-full text-xs"
            @click="clearFilters"
          >
            Reset</button
          ><button type="submit" class="catalog-apply min-h-12 rounded-full text-xs text-acid">
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
    radial-gradient(65% 48% at 82% 2%, rgba(64, 117, 119, 0.2), transparent 70%),
    radial-gradient(48% 42% at 7% 26%, rgba(102, 68, 128, 0.14), transparent 74%),
    radial-gradient(42% 32% at 68% 72%, rgba(160, 91, 76, 0.065), transparent 76%);
}
.catalog-page::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.34;
  background-image:
    radial-gradient(circle at 14% 18%, rgb(255 255 255 / 38%) 0 0.7px, transparent 1px),
    radial-gradient(circle at 73% 31%, rgb(234 194 121 / 42%) 0 0.8px, transparent 1.1px),
    radial-gradient(circle at 42% 81%, rgb(255 255 255 / 24%) 0 0.6px, transparent 1px);
  background-size:
    19rem 17rem,
    27rem 23rem,
    31rem 29rem;
  mask-image: linear-gradient(to bottom, black, transparent 82%);
}
.catalog-cosmos {
  position: fixed;
  z-index: 0;
  top: 4.5rem;
  right: -3rem;
  width: min(48rem, 68vw);
  pointer-events: none;
  color: var(--color-acid);
  opacity: 0.22;
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--color-acid) 22%, transparent));
  animation: cosmos-drift 24s ease-in-out infinite alternate;
}
.catalog-cosmos svg {
  width: 100%;
  height: auto;
}
.catalog-cosmos path {
  stroke: currentColor;
  stroke-width: 0.65;
  stroke-dasharray: 2 8;
}
.catalog-cosmos circle {
  fill: currentColor;
}
.catalog-intro,
.catalog-search {
  animation: catalog-arrive 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.catalog-search {
  animation-delay: 70ms;
}
.catalog-search__shell {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--color-paper) 19%, transparent);
  background: linear-gradient(
    110deg,
    color-mix(in srgb, var(--color-paper) 4.5%, transparent),
    color-mix(in srgb, var(--color-paper) 1.5%, transparent)
  );
  box-shadow:
    0 18px 60px rgb(0 0 0 / 12%),
    inset 0 1px 0 color-mix(in srgb, var(--color-paper) 3%, transparent);
  transition:
    border-color 260ms ease,
    background-color 260ms ease,
    box-shadow 360ms ease,
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}
.catalog-search__shell:hover {
  border-color: color-mix(in srgb, var(--color-paper) 29%, transparent);
}
.catalog-search__shell:focus-within {
  border-color: color-mix(in srgb, var(--color-acid) 58%, transparent);
  box-shadow:
    0 18px 60px rgb(0 0 0 / 18%),
    0 0 0 3px color-mix(in srgb, var(--color-acid) 7%, transparent),
    0 0 38px color-mix(in srgb, var(--color-acid) 7%, transparent);
  transform: translate3d(0, -1px, 0);
}
.catalog-search__icon {
  transition:
    color 220ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.catalog-search__shell:focus-within .catalog-search__icon {
  color: var(--color-acid);
  transform: rotate(-8deg) scale(1.08);
}
.catalog-search__shell--busy::after {
  content: '';
  position: absolute;
  right: 0.85rem;
  bottom: -1px;
  left: 0.85rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-acid), transparent);
  transform-origin: left;
  animation: search-progress 1.1s ease-in-out infinite;
}
.catalog-search__submit,
.catalog-apply {
  border: 1px solid color-mix(in srgb, var(--color-acid) 36%, transparent);
  color: var(--color-acid);
  background: color-mix(in srgb, var(--color-acid) 7%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-paper) 5%, transparent);
  transition:
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 200ms ease,
    background-color 200ms ease,
    box-shadow 300ms ease;
}
.catalog-search__submit:hover,
.catalog-apply:hover {
  border-color: color-mix(in srgb, var(--color-acid) 68%, transparent);
  background: color-mix(in srgb, var(--color-acid) 12%, transparent);
  box-shadow: 0 7px 24px color-mix(in srgb, var(--color-acid) 9%, transparent);
  transform: translate3d(0, -1px, 0);
}
.catalog-search__submit:active,
.catalog-apply:active,
.catalog-control:active {
  transform: scale(0.97);
  transition-duration: 80ms;
}
.catalog-control {
  border: 1px solid color-mix(in srgb, var(--color-paper) 16%, transparent);
  background: color-mix(in srgb, var(--color-paper) 2%, transparent);
  transition:
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
    color 180ms ease,
    border-color 200ms ease,
    background-color 200ms ease,
    box-shadow 300ms ease;
}
.catalog-control:not(:disabled):hover {
  color: var(--color-acid);
  border-color: color-mix(in srgb, var(--color-acid) 42%, transparent);
  background: color-mix(in srgb, var(--color-paper) 4%, transparent);
  box-shadow: 0 8px 24px rgb(0 0 0 / 15%);
  transform: translate3d(0, -1px, 0);
}
.catalog-state {
  border: 1px solid color-mix(in srgb, var(--color-paper) 14%, transparent);
  background:
    radial-gradient(
      70% 90% at 100% 0%,
      color-mix(in srgb, var(--color-acid) 5%, transparent),
      transparent
    ),
    color-mix(in srgb, var(--color-paper) 2.5%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-paper) 3%, transparent);
}
.catalog-results-enter-active,
.catalog-results-leave-active {
  transition:
    opacity 240ms ease,
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 240ms ease;
}
.catalog-results-enter-from,
.catalog-results-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(8px);
}
.filter-dialog {
  opacity: 0;
  transform: translate3d(2rem, 0, 0) scale(0.985);
  border: 0;
  border-left: 1px solid color-mix(in srgb, var(--color-paper) 13%, transparent);
  background:
    radial-gradient(
      90% 42% at 100% 0%,
      color-mix(in srgb, var(--color-acid) 4.5%, transparent),
      transparent 74%
    ),
    radial-gradient(75% 55% at 0% 48%, rgb(74 113 125 / 5%), transparent 76%),
    color-mix(in srgb, var(--color-paper) 2.5%, var(--color-ink));
  box-shadow:
    -24px 0 70px rgb(0 0 0 / 30%),
    inset 1px 0 0 color-mix(in srgb, var(--color-paper) 3%, transparent);
  transition:
    opacity 220ms ease,
    transform 340ms cubic-bezier(0.22, 1, 0.36, 1);
}
.filter-dialog--visible {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}
.filter-dialog::backdrop {
  background: rgb(0 0 0 / 0%);
  transition: background-color 260ms ease;
}
.filter-dialog--visible::backdrop {
  background: rgb(0 0 0 / 54%);
}
.filter-dialog__footer {
  background: color-mix(in srgb, var(--color-paper) 3.5%, var(--color-ink));
  box-shadow: 0 -16px 36px rgb(0 0 0 / 12%);
}
@keyframes catalog-arrive {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
@keyframes cosmos-drift {
  from {
    opacity: 0.17;
    transform: translate3d(0, 0, 0);
  }
  to {
    opacity: 0.25;
    transform: translate3d(-10px, 7px, 0);
  }
}
@keyframes search-progress {
  0% {
    opacity: 0;
    transform: scaleX(0.08) translateX(-40%);
  }
  45% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: scaleX(0.38) translateX(175%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .catalog-results-enter-active,
  .catalog-results-leave-active {
    transition: none;
  }
  .catalog-results-enter-from,
  .catalog-results-leave-to {
    filter: none;
    transform: none;
  }
  .catalog-intro,
  .catalog-search,
  .catalog-cosmos,
  .catalog-search__shell--busy::after {
    animation: none;
  }
  .catalog-search__shell,
  .catalog-search__icon,
  .catalog-search__submit,
  .catalog-apply,
  .catalog-control {
    transform: none !important;
    transition: none !important;
  }
  .filter-dialog,
  .filter-dialog::backdrop {
    transition: none;
  }
  .filter-dialog {
    transform: none;
  }
}
@media (max-width: 639px) {
  .catalog-cosmos {
    top: 5rem;
    right: -12rem;
    width: 35rem;
    opacity: 0.14;
  }
}
</style>
