<script setup lang="ts">
import type { Opportunity } from '#shared/types/content'
import { selectHomepageOpportunities } from '#shared/utils/opportunities'
const props = defineProps<{ opportunities: Opportunity[] }>()
const preview = computed(() => selectHomepageOpportunities(props.opportunities))
const now = useState('opportunity-clock', () => Date.now())
const rail = ref<HTMLElement>()
const activeIndex = ref(0)
let scrollFrame = 0

function setActiveFromScroll() {
  cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    const container = rail.value
    if (!container) return
    const center = container.scrollLeft + container.clientWidth / 2
    const cards = Array.from(container.children) as HTMLElement[]
    let closest = 0
    let distance = Number.POSITIVE_INFINITY
    cards.forEach((card, index) => {
      const nextDistance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)
      if (nextDistance < distance) {
        closest = index
        distance = nextDistance
      }
    })
    activeIndex.value = closest
  })
}

function show(index: number) {
  const container = rail.value
  if (!container) return
  const next = Math.max(0, Math.min(preview.value.length - 1, index))
  const card = container.children[next] as HTMLElement | undefined
  if (!card) return
  activeIndex.value = next
  container.scrollTo({
    left: card.offsetLeft - container.offsetLeft,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}

function keyboard(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  show(
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? preview.value.length - 1
        : activeIndex.value + (event.key === 'ArrowRight' ? 1 : -1),
  )
}

onBeforeUnmount(() => cancelAnimationFrame(scrollFrame))
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
    <div class="mt-8 flex items-center justify-between gap-4 xl:hidden">
      <p class="text-[10px] uppercase tracking-[.16em] text-paper/45" aria-live="polite">
        Featured route <span class="text-paper/80">{{ activeIndex + 1 }}</span> /
        {{ preview.length }}
      </p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous featured opportunity"
          :disabled="activeIndex === 0"
          class="opportunity-preview-control"
          @click="show(activeIndex - 1)"
        >
          <SiteIcon name="right" :size="16" class="rotate-180" />
        </button>
        <button
          type="button"
          aria-label="Next featured opportunity"
          :disabled="activeIndex === preview.length - 1"
          class="opportunity-preview-control"
          @click="show(activeIndex + 1)"
        >
          <SiteIcon name="right" :size="16" />
        </button>
      </div>
    </div>
    <div
      ref="rail"
      data-home-opportunity-rail
      tabindex="0"
      aria-label="Featured research opportunities"
      class="opportunity-preview-rail mt-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overscroll-x-contain pb-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acid xl:mt-8 xl:grid xl:grid-cols-2 xl:gap-5 xl:overflow-visible xl:pb-0"
      @scroll.passive="setActiveFromScroll"
      @keydown="keyboard"
    >
      <div
        v-for="(item, index) in preview"
        :key="item.id"
        :aria-label="index + 1 + ' of ' + preview.length + ': ' + item.title"
        role="group"
        class="w-[min(84vw,32rem)] shrink-0 snap-start xl:w-auto xl:snap-none"
      >
        <OpportunityCard class="h-full" :item="item" :now="now" compact />
      </div>
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

<style scoped>
.opportunity-preview-rail {
  scrollbar-width: none;
  scroll-padding-inline: 0;
  -webkit-overflow-scrolling: touch;
}
.opportunity-preview-rail::-webkit-scrollbar {
  display: none;
}
.opportunity-preview-control {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(244 240 231 / 0.16);
  border-radius: 999px;
  color: rgb(244 240 231 / 0.72);
  background: linear-gradient(145deg, rgb(244 240 231 / 0.055), rgb(13 27 36 / 0.32));
  box-shadow: inset 0 1px rgb(255 255 255 / 0.045);
  backdrop-filter: blur(14px);
  transition:
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 420ms ease,
    color 420ms ease,
    background-color 420ms ease;
}
.opportunity-preview-control:hover,
.opportunity-preview-control:focus-visible {
  transform: translateY(-1px) scale(1.035);
  border-color: color-mix(in srgb, var(--color-acid) 48%, transparent);
  color: var(--color-acid);
}
.opportunity-preview-control:active {
  transform: translateY(0) scale(0.96);
  transition-duration: 120ms;
}
.opportunity-preview-control:disabled {
  cursor: default;
  opacity: 0.26;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .opportunity-preview-rail {
    scroll-behavior: auto;
  }
  .opportunity-preview-control {
    transition: none;
  }
}
</style>
