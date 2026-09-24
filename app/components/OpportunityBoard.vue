<script setup lang="ts">
import type { Opportunity } from '#shared/types/content'
import { selectHomepageOpportunities } from '#shared/utils/opportunities'
const props = defineProps<{ opportunities: Opportunity[] }>()
const preview = computed(() => selectHomepageOpportunities(props.opportunities))
const now = useState('opportunity-clock', () => Date.now())
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
      <p class="max-w-sm text-xs leading-relaxed text-paper/48">
        Search specific poster, paper, workshop, challenge, publication, and research-program
        routes. Dates and eligibility stay tied to their sources.
      </p>
    </div>
    <form
      action="/opportunities"
      method="get"
      class="mt-8 flex min-h-14 items-center rounded-xl border border-paper/15 px-4 focus-within:border-acid/60"
    >
      <SiteIcon name="search" :size="17" class="mr-3 shrink-0 text-paper/40" />
      <label for="home-opportunity-search" class="sr-only">Search all research opportunities</label>
      <input
        id="home-opportunity-search"
        name="q"
        type="search"
        placeholder="robot learning, biomedical imaging, or a workshop name"
        class="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-paper/35"
      />
      <button type="submit" class="min-h-11 px-3 text-xs text-acid">Search</button>
    </form>
    <div class="mt-8 grid items-stretch gap-5 xl:grid-cols-2">
      <OpportunityCard v-for="item in preview" :key="item.id" :item="item" :now="now" />
    </div>
    <div class="mt-9 flex justify-center">
      <NuxtLink
        to="/opportunities"
        class="tactile inline-flex min-h-12 items-center rounded-full border border-acid/35 px-6 text-xs text-acid hover:border-acid/70"
        >Browse the full catalog →</NuxtLink
      >
    </div>
  </section>
</template>
