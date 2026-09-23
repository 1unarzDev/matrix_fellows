<script setup lang="ts">
import { featuredGuideSummaries } from '#shared/data/guides'
</script>

<template>
  <section aria-labelledby="guides-preview-title" class="border-t border-paper/15 py-16">
    <div class="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <p class="text-[10px] uppercase tracking-[.2em] text-acid">Research guides</p>
        <h3
          id="guides-preview-title"
          class="mt-5 font-display text-3xl tracking-[-.045em] sm:text-4xl"
        >
          Make the next step concrete.
        </h3>
      </div>
      <p class="max-w-sm text-sm leading-6 text-paper/48">
        Short, practical field notes for finding a question, doing careful work, and explaining what
        you found.
      </p>
    </div>
    <div class="mt-10 grid gap-x-10 md:grid-cols-2">
      <NuxtLink
        v-for="guide in featuredGuideSummaries"
        :key="guide.slug"
        :to="`/guides/${guide.slug}`"
        class="group flex min-h-32 items-start justify-between gap-5 border-t border-paper/12 py-6"
      >
        <div>
          <p class="text-[9px] uppercase tracking-[.16em] text-paper/32">
            {{ guide.category }} · {{ guide.readingMinutes }} min
          </p>
          <h4 class="mt-3 font-display text-lg tracking-[-.03em] group-hover:text-acid">
            {{ guide.title }}
          </h4>
        </div>
        <span class="mt-6 text-acid transition-transform duration-200 group-hover:translate-x-1"
          >→</span
        >
      </NuxtLink>
    </div>
    <NuxtLink
      to="/guides"
      class="tactile mt-8 inline-flex min-h-11 items-center gap-4 rounded-full border border-paper/20 px-5 text-xs text-paper/75 hover:border-acid/45 hover:text-acid"
      >Browse all research guides <span aria-hidden="true">→</span></NuxtLink
    >
  </section>
</template>
