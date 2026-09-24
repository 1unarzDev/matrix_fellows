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
const tocLinks = computed(() => guide.value?.toc?.links || [])
const { activeSection, navigateToSection } = useSectionNavigation(() =>
  tocLinks.value.map((link) => link.id),
)
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
    <GuideAtmosphere />
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
        <article class="guide-article min-w-0">
          <MDCRenderer :body="guide.body" :data="guide" :components="guideComponents" />
          <GuideResources v-if="guide.resources.length" :resources="guide.resources" />
        </article>
        <aside class="hidden lg:block">
          <nav aria-label="On this page" class="guide-toc sticky top-8">
            <p class="guide-toc__eyebrow">On this page</p>
            <ul class="guide-toc__links">
              <li v-for="link in tocLinks" :key="link.id">
                <a
                  :href="`#${link.id}`"
                  class="guide-toc__link"
                  :class="{ 'guide-toc__link--active': activeSection === link.id }"
                  :aria-current="activeSection === link.id ? 'location' : undefined"
                  @click="navigateToSection($event, link.id)"
                >
                  <span class="guide-toc__node" aria-hidden="true" />
                  <span>{{ link.text }}</span>
                </a>
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
    radial-gradient(62% 44% at 84% 3%, rgba(111, 91, 151, 0.17), transparent 72%),
    radial-gradient(48% 42% at 2% 38%, rgba(142, 104, 49, 0.095), transparent 72%),
    radial-gradient(38% 30% at 63% 76%, rgba(137, 101, 165, 0.065), transparent 76%);
}
.guide-page::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.25;
  background-image:
    radial-gradient(circle at 17% 23%, rgb(255 255 255 / 34%) 0 0.65px, transparent 1px),
    radial-gradient(circle at 68% 16%, rgb(185 164 239 / 38%) 0 0.75px, transparent 1.1px),
    radial-gradient(circle at 46% 77%, rgb(224 183 104 / 28%) 0 0.65px, transparent 1px);
  background-size:
    23rem 19rem,
    29rem 27rem,
    37rem 31rem;
  mask-image: linear-gradient(to bottom, black, transparent 86%);
}
.guide-article {
  text-wrap: pretty;
}
.guide-toc {
  padding: 1rem 0.75rem 1rem 0;
}
.guide-toc::before {
  content: '';
  position: absolute;
  top: 1rem;
  bottom: 1rem;
  left: 0;
  width: 1px;
  background: linear-gradient(
    transparent,
    color-mix(in srgb, var(--color-paper) 13%, transparent) 12%,
    color-mix(in srgb, var(--color-paper) 13%, transparent) 88%,
    transparent
  );
}
.guide-toc__eyebrow {
  padding-left: 1.25rem;
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-paper) 32%, transparent);
}
.guide-toc__links {
  margin-top: 0.9rem;
}
.guide-toc__link {
  position: relative;
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.5rem 0.5rem 1.25rem;
  border-radius: 0 0.75rem 0.75rem 0;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: color-mix(in srgb, var(--color-paper) 46%, transparent);
  transition:
    color 200ms ease,
    background-color 260ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 320ms ease;
}
.guide-toc__link:hover,
.guide-toc__link:focus-visible {
  color: var(--color-paper);
  transform: translate3d(4px, 0, 0);
}
.guide-toc__link--active {
  color: var(--color-paper);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-acid) 7%, transparent),
    transparent
  );
  box-shadow: inset 1px 0 0 color-mix(in srgb, var(--color-acid) 44%, transparent);
}
.guide-toc__node {
  width: 0.25rem;
  height: 0.25rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.35;
  transition:
    opacity 200ms ease,
    background-color 200ms ease,
    box-shadow 300ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.guide-toc__link--active .guide-toc__node {
  opacity: 1;
  background: var(--color-acid);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-acid) 68%, transparent);
  transform: scale(1.25);
}
@media (prefers-reduced-motion: reduce) {
  .guide-toc__link,
  .guide-toc__node {
    transition: none;
  }
}
</style>
