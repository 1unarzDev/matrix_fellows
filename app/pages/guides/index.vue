<script setup lang="ts">
import { guideSummaries } from '#shared/data/guides'

const guides = guideSummaries
const stages = [
  { id: 'start', label: 'Start', shortLabel: 'Start', description: 'Find direction' },
  { id: 'design', label: 'Design', shortLabel: 'Design', description: 'Shape the work' },
  { id: 'analyze', label: 'Analyze', shortLabel: 'Analyze', description: 'Read the evidence' },
  {
    id: 'communicate',
    label: 'Communicate',
    shortLabel: 'Share',
    description: 'Share it clearly',
  },
] as const
const { activeSection: activeStage, navigateToSection } = useSectionNavigation(() =>
  stages.map((stage) => stage.id),
)
const activeStageIndex = computed(() =>
  Math.max(
    0,
    stages.findIndex((stage) => stage.id === activeStage.value),
  ),
)

const canonical = 'https://matrixfellows.com/guides'
useSeoMeta({
  title: 'Practical student research guides | Matrix Fellows',
  description:
    'Concise, practical guides for high-school students finding mentors, choosing research questions, planning studies, analyzing results, and presenting work.',
  ogTitle: 'Research guides — Matrix Fellows',
  ogDescription: 'Move from curiosity to a careful project with practical student research guides.',
})
useHead({
  htmlAttrs: { class: 'guide-scroll' },
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
    <ScienceAccent theme="astronomy" />
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

      <div
        class="guide-library mt-8 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12 xl:gap-18"
      >
        <aside class="guide-stage-shell">
          <nav
            aria-label="Guide stages"
            class="guide-stage-nav"
            :style="{ '--stage-index': String(activeStageIndex) }"
          >
            <p class="guide-stage-nav__eyebrow">Guide path</p>
            <div class="guide-stage-nav__links">
              <span
                aria-hidden="true"
                class="guide-stage-nav__indicator"
                :style="{ '--stage-index': String(activeStageIndex) }"
              />
              <a
                v-for="stage in stages"
                :key="stage.id"
                :href="`#${stage.id}`"
                class="guide-stage-nav__link"
                :class="{ 'guide-stage-nav__link--active': activeStage === stage.id }"
                :aria-current="activeStage === stage.id ? 'location' : undefined"
                @click="navigateToSection($event, stage.id)"
              >
                <span class="guide-stage-nav__node" aria-hidden="true" />
                <span>
                  <span class="guide-stage-nav__label guide-stage-nav__label--full">{{
                    stage.label
                  }}</span>
                  <span class="guide-stage-nav__label guide-stage-nav__label--compact">{{
                    stage.shortLabel
                  }}</span>
                  <span class="guide-stage-nav__description">{{ stage.description }}</span>
                </span>
              </a>
            </div>
          </nav>
        </aside>

        <div class="min-w-0">
          <section
            v-for="stage in stages"
            :id="stage.id"
            :key="stage.id"
            :aria-labelledby="`${stage.id}-title`"
            class="scroll-mt-28 pt-10 first:pt-6 lg:scroll-mt-8 lg:pt-14 lg:first:pt-10"
          >
            <div class="mb-6 grid gap-2 sm:grid-cols-[5rem_1fr]">
              <p class="text-[10px] uppercase tracking-[.2em] text-paper/30">Stage</p>
              <h2 :id="`${stage.id}-title`" class="font-display text-3xl tracking-[-.04em]">
                {{ stage.label }}
              </h2>
            </div>
            <GuideCard
              v-for="guide in guides.filter((item) => item.category === stage.label)"
              :key="guide.slug"
              :guide="guide"
            />
          </section>
        </div>
      </div>
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
    radial-gradient(62% 44% at 84% 3%, rgba(111, 91, 151, 0.18), transparent 72%),
    radial-gradient(48% 42% at 2% 38%, rgba(142, 104, 49, 0.105), transparent 72%),
    radial-gradient(38% 30% at 63% 76%, rgba(137, 101, 165, 0.07), transparent 76%);
}
.guide-page::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.28;
  background-image:
    radial-gradient(circle at 17% 23%, rgb(255 255 255 / 35%) 0 0.65px, transparent 1px),
    radial-gradient(circle at 68% 16%, rgb(185 164 239 / 40%) 0 0.75px, transparent 1.1px),
    radial-gradient(circle at 46% 77%, rgb(224 183 104 / 30%) 0 0.65px, transparent 1px);
  background-size:
    23rem 19rem,
    29rem 27rem,
    37rem 31rem;
  mask-image: linear-gradient(to bottom, black, transparent 86%);
}
.guide-stage-shell {
  position: sticky;
  z-index: 10;
  top: 0.75rem;
  margin-inline: -0.25rem;
  padding: 0.3rem;
}
.guide-stage-nav {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-paper) 12%, transparent);
  border-radius: 1rem;
  background:
    radial-gradient(
      70% 120% at calc((var(--stage-index, 0) + 0.5) * 25%) 0%,
      color-mix(in srgb, #b9a4ef 4%, transparent),
      transparent 72%
    ),
    color-mix(in srgb, var(--color-ink) 86%, transparent);
  box-shadow:
    0 16px 42px rgb(0 0 0 / 20%),
    0 0 30px color-mix(in srgb, #b9a4ef 2.5%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--color-paper) 4%, transparent);
  backdrop-filter: blur(20px) saturate(118%);
}
.guide-stage-nav__eyebrow {
  display: none;
}
.guide-stage-nav__links {
  position: relative;
  display: flex;
  min-width: 0;
}
.guide-stage-nav__indicator {
  position: absolute;
  top: 0.3rem;
  bottom: 0.3rem;
  left: calc(var(--stage-index) * 25% + 0.3rem);
  width: calc(25% - 0.15rem);
  border: 1px solid color-mix(in srgb, var(--color-acid) 30%, transparent);
  border-radius: 0.75rem;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-acid) 8%, transparent),
      color-mix(in srgb, #b9a4ef 4%, transparent)
    ),
    color-mix(in srgb, var(--color-paper) 1.5%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-paper) 7%, transparent),
    0 7px 18px rgb(0 0 0 / 12%),
    0 0 24px color-mix(in srgb, var(--color-acid) 6%, transparent);
  transform: none;
  transition:
    left 480ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
}
.guide-stage-nav__indicator::before {
  content: '';
  position: absolute;
  top: 0.28rem;
  right: 22%;
  left: 22%;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--color-paper) 24%, transparent),
    transparent
  );
}
.guide-stage-nav__link {
  position: relative;
  z-index: 1;
  display: flex;
  width: 25%;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.75rem;
  color: color-mix(in srgb, var(--color-paper) 46%, transparent);
  transition:
    color 200ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.guide-stage-nav__link:hover,
.guide-stage-nav__link:focus-visible,
.guide-stage-nav__link--active {
  color: var(--color-paper);
}
.guide-stage-nav__link:hover,
.guide-stage-nav__link:focus-visible {
  transform: translate3d(0, -1px, 0);
}
.guide-stage-nav__node {
  display: none;
  transition:
    opacity 200ms ease,
    background-color 200ms ease,
    box-shadow 300ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.guide-stage-nav__link--active .guide-stage-nav__node {
  opacity: 1;
  background: var(--color-acid);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-acid) 68%, transparent);
  transform: scale(1.25);
}
.guide-stage-nav__label {
  display: block;
  font-size: 0.6875rem;
}
.guide-stage-nav__description {
  display: none;
}
.guide-stage-nav__label--compact {
  display: none;
}
@media (max-width: 359px) {
  .guide-stage-nav__label--full {
    display: none;
  }
  .guide-stage-nav__label--compact {
    display: block;
  }
}
@media (min-width: 1024px) {
  .guide-stage-shell {
    top: 2rem;
    align-self: start;
    margin: 0;
    padding: 2.5rem 0 0;
  }
  .guide-stage-nav {
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }
  .guide-stage-nav__eyebrow {
    display: block;
    margin-bottom: 1rem;
    padding-left: 1.25rem;
    font-size: 0.5625rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-paper) 30%, transparent);
  }
  .guide-stage-nav__links {
    display: block;
    min-width: 0;
  }
  .guide-stage-nav__links::before {
    content: '';
    position: absolute;
    top: 0.6rem;
    bottom: 0.6rem;
    left: 0.18rem;
    width: 1px;
    background: color-mix(in srgb, var(--color-paper) 12%, transparent);
  }
  .guide-stage-nav__indicator {
    top: 0;
    bottom: auto;
    left: 0;
    width: 2px;
    height: 3.5rem;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(transparent, var(--color-acid), transparent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-acid) 38%, transparent);
    transform: translate3d(0, calc(var(--stage-index) * 3.5rem), 0);
  }
  .guide-stage-nav__indicator::before {
    top: 50%;
    right: auto;
    left: -0.08rem;
    width: 0.28rem;
    height: 0.28rem;
    border-radius: 50%;
    background: var(--color-acid);
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-acid) 65%, transparent);
    transform: translateY(-50%);
  }
  .guide-stage-nav__link {
    width: 100%;
    min-height: 3.5rem;
    justify-content: flex-start;
    padding: 0.55rem 0.5rem 0.55rem 1.25rem;
  }
  .guide-stage-nav__node {
    display: block;
  }
  .guide-stage-nav__link:hover,
  .guide-stage-nav__link:focus-visible {
    transform: translate3d(4px, 0, 0);
  }
  .guide-stage-nav__link--active {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-acid) 4.5%, transparent),
      transparent 82%
    );
    box-shadow: inset 1px 0 0 color-mix(in srgb, var(--color-acid) 16%, transparent);
  }
  .guide-stage-nav__description {
    display: block;
    margin-top: 0.16rem;
    font-size: 0.5625rem;
    color: color-mix(in srgb, var(--color-paper) 31%, transparent);
  }
  .guide-stage-nav__link--active .guide-stage-nav__description {
    color: color-mix(in srgb, var(--color-acid) 58%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .guide-stage-nav__indicator,
  .guide-stage-nav__link,
  .guide-stage-nav__node {
    transition: none;
  }
}
</style>
