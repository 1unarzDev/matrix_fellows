<script setup lang="ts">
import type { Opportunity } from '#shared/types/content'
import { deadlineTimestamp, displayDate } from '#shared/utils/opportunities'
import {
  getOpportunityState,
  getTimeline,
  nextTimelineIndex,
} from '#shared/utils/opportunity-lifecycle'
const props = defineProps<{ item: Opportunity; now: number }>()
const id = useId()
const state = computed(() => getOpportunityState(props.item, props.now))
const timeline = computed(() => getTimeline(props.item))
const nextIndex = computed(() => nextTimelineIndex(timeline.value, props.now))
const selected = ref(nextIndex.value)
const checkpoint = computed(() => timeline.value[selected.value])
const rail = ref<HTMLElement>()
const isFuture = (date: string) => deadlineTimestamp(date) >= props.now
function reveal(smooth = true) {
  const container = rail.value
  const tab = container?.querySelectorAll<HTMLElement>('[role="tab"]')[selected.value]
  if (!container || !tab) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  container.scrollTo({
    left: tab.offsetLeft - (container.clientWidth - tab.clientWidth) / 2,
    behavior: smooth && !reduced ? 'smooth' : 'instant',
  })
}
async function select(index: number, focus = false) {
  selected.value = Math.max(0, Math.min(timeline.value.length - 1, index))
  await nextTick()
  if (focus)
    rail.value
      ?.querySelectorAll<HTMLElement>('[role="tab"]')
      [selected.value]?.focus({ preventScroll: true })
  reveal()
}
function keyboard(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  void select(
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? timeline.value.length - 1
        : selected.value + (event.key === 'ArrowRight' ? 1 : -1),
    true,
  )
}
watch(timeline, () => {
  void select(nextIndex.value)
})
watch(nextIndex, (next, previous) => {
  if (selected.value === previous) void select(next)
})
onMounted(() => {
  reveal(false)
})
</script>

<template>
  <article
    :aria-labelledby="`${id}-title`"
    class="min-w-0 overflow-hidden rounded-2xl border border-paper/15 bg-paper/[.015] transition-[border-color,background-color,box-shadow] duration-1000 ease-[cubic-bezier(.22,1,.36,1)] hover:border-paper/30 hover:bg-paper/[.025] hover:shadow-[0_16px_48px_#00000012] motion-reduce:transition-none"
  >
    <div class="p-6 sm:p-7">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-[9px] uppercase tracking-[.16em] text-paper/55"
          >{{ item.kind }}
          <span v-if="item.edition" class="text-paper/30">/ {{ item.edition }}</span></span
        >
        <span
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px]"
          :class="
            state.key === 'upcoming' ? 'border-acid/25 text-acid' : 'border-paper/15 text-paper/55'
          "
          ><span class="h-1 w-1 rounded-full bg-current" aria-hidden="true" />{{
            state.label
          }}</span
        >
      </div>
      <p class="mt-6 text-[9px] uppercase tracking-[.14em] text-paper/40">{{ item.discipline }}</p>
      <h4 :id="`${id}-title`" class="mt-2 text-xl font-medium tracking-[-.025em] sm:text-2xl">
        {{ item.title }}
      </h4>
      <p class="mt-3 text-sm leading-relaxed text-paper/55">{{ item.description }}</p>
      <div class="mt-5 flex items-start gap-2 text-xs leading-relaxed text-paper/60">
        <SiteIcon name="globe" :size="13" class="mt-0.5 shrink-0" />{{ item.location }}
      </div>
      <p class="mt-3 text-[11px] leading-relaxed text-paper/45">
        <span class="text-paper/70">Who it’s for · </span>{{ item.eligibility }}
      </p>
      <p v-if="item.cost || item.effort" class="mt-2 text-[11px] leading-relaxed text-paper/45">
        {{ [item.cost, item.effort].filter(Boolean).join(' · ') }}
      </p>
      <details
        v-if="item.lifecycleEvidence && timeline.length"
        class="mt-3 text-[10px] text-paper/50"
      >
        <summary class="w-fit cursor-pointer focus-visible:outline-acid">
          About this edition’s status
        </summary>
        <p class="mt-2 leading-relaxed">{{ item.lifecycleEvidence }}</p>
      </details>
    </div>
    <div class="border-t border-paper/10">
      <div class="flex items-center justify-between gap-3 px-6 pt-5 sm:px-7">
        <p class="text-[9px] uppercase tracking-[.16em] text-paper/40">
          The timeline
          <span v-if="timeline.length" class="ml-2 text-paper/25"
            >{{ selected + 1 }} / {{ timeline.length }}</span
          >
        </p>
        <div v-if="timeline.length > 1" class="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous checkpoint"
            :disabled="selected <= 0"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-paper/15 text-paper/65 transition-colors duration-700 hover:border-acid/50 hover:text-acid focus-visible:outline-2 focus-visible:outline-acid disabled:cursor-default disabled:opacity-20 motion-reduce:transition-none"
            @click="select(selected - 1)"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next checkpoint"
            :disabled="selected >= timeline.length - 1"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-paper/15 text-paper/65 transition-colors duration-700 hover:border-acid/50 hover:text-acid focus-visible:outline-2 focus-visible:outline-acid disabled:cursor-default disabled:opacity-20 motion-reduce:transition-none"
            @click="select(selected + 1)"
          >
            →
          </button>
        </div>
      </div>
      <div
        v-if="timeline.length"
        ref="rail"
        role="tablist"
        :aria-label="`${item.title} checkpoints`"
        class="relative mt-4 flex snap-x snap-proximity overflow-x-auto overscroll-x-contain px-6 pb-3 [scrollbar-width:thin] [scrollbar-color:var(--color-acid)_transparent] sm:px-7"
        @keydown="keyboard"
      >
        <button
          v-for="(milestone, index) in timeline"
          :id="`${id}-tab-${index}`"
          :key="`${milestone.date}-${milestone.label}`"
          type="button"
          role="tab"
          :aria-selected="selected === index"
          :aria-controls="`${id}-panel`"
          :tabindex="selected === index ? 0 : -1"
          class="group relative w-40 shrink-0 snap-center pb-2 pr-5 pt-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-acid"
          @click="select(index)"
        >
          <span class="absolute left-0 right-0 top-[13px] h-px bg-paper/15" aria-hidden="true" />
          <span
            class="relative block h-3 w-3 rounded-full border transition-[background-color,border-color,box-shadow] duration-700 motion-reduce:transition-none"
            :class="
              selected === index
                ? 'border-acid bg-acid shadow-[0_0_18px_#d4f57130]'
                : 'border-paper/35 bg-ink group-hover:border-acid/60'
            "
            aria-hidden="true"
          />
          <span
            class="mt-3 block text-[9px] uppercase tracking-wider"
            :class="index === nextIndex && isFuture(milestone.date) ? 'text-acid' : 'text-paper/35'"
            >{{
              milestone.superseded
                ? 'Superseded date'
                : index === nextIndex && isFuture(milestone.date)
                  ? 'Up next'
                  : isFuture(milestone.date)
                    ? 'Ahead'
                    : 'Past checkpoint'
            }}</span
          >
          <span
            class="mt-1 block text-xs transition-colors duration-700 motion-reduce:transition-none"
            :class="selected === index ? 'text-paper' : 'text-paper/45'"
            >{{ displayDate(milestone.date, milestone.timezone || 'UTC') }}</span
          >
          <span class="mt-1 block text-[10px] leading-relaxed text-paper/45">{{
            milestone.label
          }}</span>
        </button>
      </div>
      <div
        :id="`${id}-panel`"
        role="tabpanel"
        :aria-labelledby="checkpoint ? `${id}-tab-${selected}` : undefined"
        :tabindex="checkpoint ? 0 : undefined"
        class="mx-6 mb-6 mt-2 min-h-40 rounded-xl border border-paper/10 bg-paper/[.025] p-4 focus-visible:outline-acid sm:mx-7"
      >
        <Transition
          mode="out-in"
          enter-active-class="transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
          enter-from-class="translate-y-1 opacity-0 motion-reduce:translate-y-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition-opacity duration-700 motion-reduce:transition-none"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="checkpoint" :key="`${checkpoint.date}-${checkpoint.label}`">
            <p class="text-[9px] uppercase tracking-wider text-paper/40">{{ checkpoint.kind }}</p>
            <p v-if="checkpoint.superseded" class="mt-2 text-xs text-paper/50">
              Historical date · replaced by a newer checkpoint
            </p>
            <p class="mt-2 text-sm text-paper/85">{{ checkpoint.label }}</p>
            <p class="mt-1 text-xs text-acid/85">
              {{ displayDate(checkpoint.date, checkpoint.timezone || 'UTC') }}
            </p>
            <p class="mt-2 text-[10px] leading-relaxed text-paper/40">
              {{ checkpoint.timezone || 'Date only · confirm the exact cutoff with the organizer' }}
            </p>
            <details class="mt-3 text-[10px] text-paper/50">
              <summary class="w-fit cursor-pointer text-paper/65 focus-visible:outline-acid">
                Date evidence &amp; source
              </summary>
              <p class="mt-2 leading-relaxed">
                {{ checkpoint.evidence || 'Confirm this checkpoint on the official website.' }}
              </p>
              <a
                :href="checkpoint.url || item.url"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-block text-acid underline underline-offset-4"
                >View checkpoint source ↗</a
              >
            </details>
          </div>
          <div v-else key="unannounced">
            <p class="text-sm text-paper/75">{{ state.label }}</p>
            <p class="mt-2 text-xs leading-relaxed text-paper/45">
              {{
                item.lifecycleEvidence ||
                'No confirmed dates yet. Explore the official source for the current cycle.'
              }}
            </p>
          </div>
        </Transition>
      </div>
    </div>
    <div
      class="flex flex-wrap items-center justify-between gap-4 border-t border-paper/10 px-6 py-5 sm:px-7"
    >
      <div class="text-[9px] leading-relaxed text-paper/35">
        <p v-if="!item.monitoring || item.monitoring.lastSuccessAt">
          Source checked
          {{ displayDate(item.monitoring ? item.monitoring.lastSuccessAt : item.verifiedAt) }}
        </p>
        <p v-else>Source verification pending</p>
        <p v-if="state.stale || item.monitoring?.issue" class="mt-1 text-paper/55">
          {{
            item.monitoring?.issue
              ? 'Latest check unavailable · confirm with organizer'
              : 'Source needs a fresh check'
          }}
        </p>
      </div>
      <a
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group inline-flex items-center gap-3 text-xs text-acid transition-colors duration-700 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acid motion-reduce:transition-none"
        >Official website
        <span
          aria-hidden="true"
          class="transition-transform duration-700 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          >↗</span
        ><span class="sr-only">for {{ item.title }} (opens in a new tab)</span></a
      >
    </div>
  </article>
</template>
