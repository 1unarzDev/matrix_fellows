<script setup lang="ts">
import { guideSummaries } from '#shared/data/guides'

const guides = guideSummaries

const canonical = 'https://matrixfellows.com/guides'
useSeoMeta({
  title: 'Practical student research guides | Matrix Fellows',
  description:
    'Concise, practical guides for high-school students finding mentors, choosing research questions, planning studies, analyzing results, and presenting work.',
  ogTitle: 'Research guides — Matrix Fellows',
  ogDescription: 'Move from curiosity to a careful project with practical student research guides.',
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Matrix Fellows',
            item: 'https://matrixfellows.com/',
          },
          { '@type': 'ListItem', position: 2, name: 'Research guides', item: canonical },
        ],
      }),
    },
  ],
})
</script>

<template>
  <div class="guide-page min-h-screen bg-ink text-paper">
    <CatalogHeader />
    <main class="relative z-[1] mx-auto max-w-[86rem] px-5 pb-24 pt-14 sm:px-8 lg:px-12 lg:pt-20">
      <div
        class="grid gap-8 border-b border-paper/14 pb-14 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end"
      >
        <div>
          <p class="text-[10px] uppercase tracking-[.2em] text-acid">Matrix field notes</p>
          <h1
            class="mt-5 max-w-4xl font-display text-5xl leading-[1.02] tracking-[-.06em] sm:text-7xl"
          >
            Research becomes real through the next clear step.
          </h1>
        </div>
        <p class="max-w-md text-sm leading-7 text-paper/52">
          Use these guides in order or begin where you are stuck. Each one is designed to be read
          quickly, used immediately, and checked against the rules of your actual field or
          opportunity.
        </p>
      </div>

      <nav aria-label="Guide stages" class="flex flex-wrap gap-2 border-b border-paper/10 py-6">
        <a
          v-for="category in ['Start', 'Design', 'Analyze', 'Communicate']"
          :key="category"
          :href="`#${category.toLowerCase()}`"
          class="min-h-11 rounded-full border border-paper/14 px-4 py-3 text-xs text-paper/58 hover:border-acid/35 hover:text-acid"
          >{{ category }}</a
        >
      </nav>

      <section
        v-for="category in ['Start', 'Design', 'Analyze', 'Communicate'] as const"
        :id="category.toLowerCase()"
        :key="category"
        :aria-labelledby="`${category.toLowerCase()}-title`"
        class="scroll-mt-8 pt-14"
      >
        <div class="mb-6 grid gap-2 sm:grid-cols-[5rem_1fr]">
          <p class="text-[10px] uppercase tracking-[.2em] text-paper/30">Stage</p>
          <h2
            :id="`${category.toLowerCase()}-title`"
            class="font-display text-3xl tracking-[-.04em]"
          >
            {{ category }}
          </h2>
        </div>
        <GuideCard
          v-for="guide in guides.filter((item) => item.category === category)"
          :key="guide.slug"
          :guide="guide"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.guide-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(60% 45% at 83% 4%, rgba(94, 91, 127, 0.11), transparent 72%),
    radial-gradient(45% 40% at 3% 38%, rgba(78, 111, 107, 0.08), transparent 70%);
}
</style>
