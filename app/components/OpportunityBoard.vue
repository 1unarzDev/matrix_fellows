<script setup lang="ts">
import type { Opportunity, OpportunityKind } from '#shared/types/content'
import {
  deadlineTimestamp,
  displayDate,
  isUpcoming,
  sortOpportunities,
} from '#shared/utils/opportunities'
const props = defineProps<{ opportunities: Opportunity[] }>()
const query = ref('')
const kind = ref('All opportunities')
function clearFilters() {
  query.value = ''
  kind.value = 'All opportunities'
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
const kinds: Array<OpportunityKind | 'All opportunities'> = [
  'All opportunities',
  'Competition',
  'Conference',
  'Workshop',
  'Publication',
  'Program',
]
const upcoming = computed(() =>
  props.opportunities.filter((item) => item.published && isUpcoming(item, new Date(now.value))),
)
const filtered = computed(() =>
  sortOpportunities(
    upcoming.value.filter(
      (item) =>
        (kind.value === 'All opportunities' || item.kind === kind.value) &&
        `${item.title} ${item.discipline} ${item.eligibility} ${item.location}`
          .toLowerCase()
          .includes(query.value.toLowerCase()),
    ),
  ),
)
const deadlines = computed(() =>
  upcoming.value
    .filter((item) => item.deadline)
    .sort((a, b) => deadlineTimestamp(a.deadline!) - deadlineTimestamp(b.deadline!))
    .slice(0, 4),
)
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
        Fairs, conferences, workshops, and more.<br />Always check the official eligibility and
        dates.
      </p>
    </div>
    <div class="my-8 flex flex-col gap-3 sm:flex-row">
      <label class="flex flex-1 items-center gap-3 rounded-lg border border-paper/15 px-4"
        ><SiteIcon name="search" :size="17" class="text-paper/40" /><span class="sr-only"
          >Search opportunities</span
        ><input
          v-model="query"
          type="search"
          placeholder="A field, an idea, an opportunity…"
          class="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-paper/35"
      /></label>
      <ThemedSelect v-model="kind" :options="kinds" label="Opportunity type" />
    </div>
    <p class="mb-4 text-[10px] text-paper/40" aria-live="polite">
      {{ filtered.length }} {{ filtered.length === 1 ? 'opportunity' : 'opportunities' }}
    </p>
    <div class="grid gap-4 md:grid-cols-2">
      <a
        v-for="item in filtered"
        :key="item.id"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="tactile group flex flex-col rounded-xl border border-paper/15 bg-paper/[.015] p-6 hover:border-acid/40 hover:bg-paper/[.04] hover:shadow-[0_12px_32px_#00000018] sm:p-7"
        ><div class="flex items-center justify-between">
          <span
            class="rounded-full border border-paper/15 px-3 py-1 text-[9px] uppercase tracking-wider text-acid/90"
            >{{ item.kind }}</span
          ><SiteIcon
            :size="17"
            class="text-paper/40 transition-[transform,translate,color] duration-1000 ease-[cubic-bezier(.4,0,.2,1)] group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-acid motion-reduce:transform-none motion-reduce:translate-none motion-reduce:transition-none"
          />
        </div>
        <p class="mt-6 text-[9px] uppercase tracking-[.14em] text-paper/40">
          {{ item.discipline }}
        </p>
        <h4 class="mt-2 text-xl font-medium tracking-[-.02em]">{{ item.title }}</h4>
        <p class="mb-6 mt-3 text-sm leading-relaxed text-paper/55">{{ item.description }}</p>
        <div class="mt-auto border-t border-paper/10 pt-4">
          <p class="flex items-center gap-2 text-xs text-paper/60">
            <SiteIcon name="globe" :size="13" />{{ item.location }}
          </p>
          <p class="mt-2 text-[11px] leading-relaxed text-paper/40">{{ item.eligibility }}</p>
          <p class="mt-4 text-xs" :class="item.deadline ? 'text-acid' : 'text-paper/55'">
            {{
              item.deadline
                ? `Submit by ${displayDate(item.deadline, item.timezone || 'UTC')}`
                : 'Dates vary · Check official source'
            }}
          </p>
          <p v-if="item.eventDate" class="mt-1 text-[11px] text-paper/50">
            Event · {{ displayDate(item.eventDate, item.timezone || 'UTC') }}
          </p>
          <p class="mt-3 text-[9px] text-paper/30">
            Source checked {{ displayDate(item.verifiedAt) }}
          </p>
        </div></a
      >
    </div>
    <div
      v-if="!filtered.length"
      class="rounded-xl border border-dashed border-paper/20 px-6 py-14 text-center"
    >
      <p class="text-base">A little more room to explore.</p>
      <p class="mt-2 text-sm text-paper/50">
        No matching opportunities right now. Try another search or category.
      </p>
      <button class="mt-5 text-xs text-acid underline underline-offset-4" @click="clearFilters">
        Clear filters
      </button>
    </div>
    <div class="mt-10 rounded-xl border border-paper/15 p-6">
      <div class="flex items-center gap-3">
        <SiteIcon name="spark" :size="18" class="text-acid" />
        <h4 class="text-sm">On the horizon</h4>
      </div>
      <ol v-if="deadlines.length" class="mt-5 divide-y divide-paper/10">
        <li
          v-for="item in deadlines"
          :key="item.id"
          class="flex flex-wrap justify-between gap-3 py-3 text-xs"
        >
          <a :href="item.url" target="_blank" rel="noopener noreferrer" class="hover:text-acid"
            >{{ item.title }} ↗</a
          ><span class="text-acid/80">{{
            displayDate(item.deadline, item.timezone || 'UTC')
          }}</span>
        </li>
      </ol>
      <p v-else class="mt-3 text-sm leading-relaxed text-paper/45">
        Confirmed submission deadlines will appear here. Explore the official sources above for
        their current application cycles.
      </p>
    </div>
  </section>
</template>
