<script setup lang="ts">
import type { GuideSummary } from '#shared/data/guides'

defineProps<{ guide: GuideSummary; number?: number }>()
</script>

<template>
  <NuxtLink
    :to="`/guides/${guide.slug}`"
    class="group grid min-h-48 gap-8 border-t border-paper/14 py-7 outline-offset-8 transition-colors duration-200 hover:border-acid/35 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-start"
  >
    <p class="text-[10px] uppercase tracking-[.2em] text-paper/32">
      {{ String(number ?? guide.order).padStart(2, '0') }} / {{ guide.category }}
    </p>
    <div>
      <h2 class="font-display text-2xl tracking-[-.04em] text-paper group-hover:text-acid">
        {{ guide.title }}
      </h2>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-paper/52">{{ guide.description }}</p>
      <p class="mt-5 text-[10px] uppercase tracking-[.14em] text-paper/35">
        {{ guide.stage }} · {{ guide.readingMinutes }} min
      </p>
    </div>
    <span
      class="self-center text-sm text-acid transition-transform duration-200 group-hover:translate-x-1"
      >Read →</span
    >
  </NuxtLink>
</template>
