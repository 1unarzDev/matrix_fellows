<script setup lang="ts">
import { guideSummaries } from '#shared/data/guides'
import { guideComponents, loadGuide } from '~/lib/guides'

const route = useRoute()
const slug = String(route.params.slug || '')
const path = `/guides/${slug}`
const { data: guide } = await useAsyncData(`guide:${slug}`, () => loadGuide(slug))

if (!guide.value) throw createError({ statusCode: 404, statusMessage: 'Guide not found' })

const related = computed(() => {
  const slugs = new Set(guide.value?.related || [])
  return guideSummaries.filter((item) => slugs.has(item.slug))
})
const canonical = `https://matrixfellows.com${path}`
useSeoMeta({
  title: `${guide.value.title} | Matrix Fellows`,
  description: guide.value.description,
  ogTitle: guide.value.title,
  ogDescription: guide.value.description,
  ogType: 'article',
  articleModifiedTime: guide.value.updated,
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
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Research guides',
            item: 'https://matrixfellows.com/guides',
          },
          { '@type': 'ListItem', position: 3, name: guide.value.title, item: canonical },
        ],
      }),
    },
  ],
})
</script>

<template>
  <div class="guide-page min-h-screen bg-ink text-paper">
    <GuideHeader />
    <main v-if="guide" class="relative z-[1] mx-auto max-w-[86rem] px-5 pb-24 sm:px-8 lg:px-12">
      <header class="border-b border-paper/14 pb-14 pt-14 lg:pb-18 lg:pt-20">
        <NuxtLink to="/guides" class="text-xs text-paper/45 hover:text-acid">← All guides</NuxtLink>
        <div class="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
          <div>
            <p class="text-[10px] uppercase tracking-[.2em] text-acid">
              {{ guide.category }} · {{ guide.stage }}
            </p>
            <h1
              class="mt-5 max-w-5xl font-display text-5xl leading-[1.02] tracking-[-.06em] sm:text-7xl"
            >
              {{ guide.title }}
            </h1>
            <p class="mt-6 max-w-3xl text-base leading-7 text-paper/58">{{ guide.description }}</p>
          </div>
          <dl class="grid grid-cols-2 gap-5 border-l border-paper/12 pl-6 text-xs lg:grid-cols-1">
            <div>
              <dt class="text-[9px] uppercase tracking-[.16em] text-paper/30">Read</dt>
              <dd class="mt-2 text-paper/65">{{ guide.readingMinutes }} minutes</dd>
            </div>
            <div>
              <dt class="text-[9px] uppercase tracking-[.16em] text-paper/30">Updated</dt>
              <dd class="mt-2 text-paper/65">{{ guide.updated }}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div class="grid gap-14 pt-12 lg:grid-cols-[minmax(0,46rem)_16rem] lg:justify-between">
        <article class="min-w-0">
          <MDCRenderer :body="guide.body" :data="guide" :components="guideComponents" />
        </article>
        <aside class="hidden lg:block">
          <nav aria-label="On this page" class="sticky top-8 border-l border-paper/12 pl-5">
            <p class="text-[9px] uppercase tracking-[.16em] text-paper/32">On this page</p>
            <ul class="mt-4 space-y-3 text-xs leading-5 text-paper/48">
              <li v-for="link in guide.toc?.links || []" :key="link.id">
                <a :href="`#${link.id}`" class="hover:text-acid">{{ link.text }}</a>
              </li>
            </ul>
          </nav>
        </aside>
      </div>

      <section
        v-if="related.length"
        aria-labelledby="related-guides"
        class="mt-20 border-t border-paper/14 pt-10"
      >
        <h2 id="related-guides" class="font-display text-3xl tracking-[-.04em]">
          Continue from here
        </h2>
        <div class="mt-6 grid gap-x-10 md:grid-cols-2">
          <GuideCard v-for="item in related" :key="item.slug" :guide="item" />
        </div>
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
    radial-gradient(60% 45% at 82% 3%, rgba(94, 91, 127, 0.1), transparent 72%),
    radial-gradient(50% 45% at 4% 42%, rgba(68, 105, 106, 0.07), transparent 72%);
}
</style>
