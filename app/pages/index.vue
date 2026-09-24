<script setup lang="ts">
// The cinematic homepage remains isolated from the static catalog routes.
import MatrixMark from '~/components/MatrixMark.vue'
import { defaultContent, defaultOpportunities } from '#shared/data/defaults'
import type { PublicContent } from '#shared/types/content'
import { displayDate } from '#shared/utils/opportunities'

const publicConfig = useRuntimeConfig().public
const siteUrl = publicConfig.siteUrl
const socialImage = new URL('/social-card.png?v=horizon-2', siteUrl).href
const canonicalUrl = 'https://matrixfellows.com/'
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      key: 'organization-schema',
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${canonicalUrl}#organization`,
            name: 'Matrix Fellows',
            url: canonicalUrl,
            description:
              'A student-founded research initiative connecting students through research, collaboration, and science fair opportunities.',
            email: 'contact@matrixfellows.com',
            subOrganization: { '@id': `${canonicalUrl}#martin-research-society` },
            logo: `${canonicalUrl}favicon.svg`,
          },
          {
            '@type': 'Organization',
            '@id': `${canonicalUrl}#martin-research-society`,
            name: 'Martin High School Research Society',
            alternateName: 'MHS Research Society',
            description: 'The Matrix Fellows student research community at Martin High School.',
            parentOrganization: { '@id': `${canonicalUrl}#organization` },
            sameAs: ['https://www.instagram.com/mhs_research_society/'],
            logo: `${canonicalUrl}favicon.svg`,
          },
          {
            '@type': 'WebSite',
            '@id': `${canonicalUrl}#website`,
            url: canonicalUrl,
            name: 'Matrix Fellows',
            inLanguage: 'en',
            publisher: { '@id': `${canonicalUrl}#organization` },
          },
        ],
      }),
    },
  ],
})
useSeoMeta({
  ogImage: socialImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogImageAlt: 'Matrix Fellows — Beyond what we know. A student-founded research society.',
  ogSiteName: 'Matrix Fellows',
  ogUrl: new URL('/', siteUrl).href,
  twitterCard: 'summary_large_image',
  twitterTitle: 'Matrix Fellows — Beyond what we know.',
  twitterDescription: 'Independent minds. Shared horizons. A student-founded research society.',
  twitterImage: socialImage,
  twitterImageAlt: 'Matrix Fellows — Beyond what we know.',
})

const { data, refresh } = await useFetch<PublicContent>('/api/content', {
  default: () => ({
    content: defaultContent,
    opportunities: defaultOpportunities,
    configured: false,
  }),
})
const content = computed(() => data.value?.content || defaultContent)
const meetingDate = computed(() =>
  content.value.meeting.date ? displayDate(content.value.meeting.date) : 'Date forthcoming',
)
const progress = ref(0)
const hydrated = ref(false)
const sceneStatus = ref<'pending' | 'ready' | 'fallback'>('pending')
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
const onSceneStatus = (status: 'ready' | 'fallback') => {
  sceneStatus.value = status
  clearTimeout(loadingTimeout)
  if (status === 'fallback' && pendingAnchor) {
    const target = document.getElementById(pendingAnchor)
    pendingAnchor = null
    const handled =
      target &&
      !window.dispatchEvent(
        new CustomEvent('matrix:navigate', { detail: target, cancelable: true }),
      )
    if (!handled) {
      target?.scrollIntoView({ behavior: 'instant' })
      target?.focus({ preventScroll: true })
    }
  }
}
let cinematicReady = false
let pendingAnchor: string | null = null
const onCinematicReady = () => {
  cinematicReady = true
  const requestedAnchor = pendingAnchor
  const id = requestedAnchor || window.location.hash.slice(1)
  if (id) {
    const target = document.getElementById(id)
    const touchLayout = window.matchMedia('(pointer: coarse)').matches
    const handled =
      requestedAnchor &&
      target &&
      !touchLayout &&
      !window.dispatchEvent(
        new CustomEvent('matrix:navigate', { detail: target, cancelable: true }),
      )
    if (!handled)
      target?.scrollIntoView({
        behavior:
          requestedAnchor &&
          !touchLayout &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'smooth'
            : 'instant',
      })
    if (requestedAnchor && !handled) target?.focus({ preventScroll: true })
  }
  pendingAnchor = null
}
const adminOpen = ref(false)
const joinOpen = ref(false)
const sections = [
  { id: 'beginning', label: 'The question', short: 'Begin' },
  { id: 'discovery', label: 'Discovery', short: 'Discover' },
  { id: 'research', label: 'Our research', short: 'Research' },
  { id: 'frontiers', label: 'Go deeper', short: 'Depths' },
  { id: 'connection', label: 'Connected', short: 'Connect' },
  { id: 'community', label: 'Your next step', short: 'Join us' },
]
const active = computed(() => Math.min(5, Math.floor(progress.value + 0.28)))
const pillPositions = [
  'translate-x-0',
  'translate-x-full',
  'translate-x-[200%]',
  'translate-x-[300%]',
  'translate-x-[400%]',
  'translate-x-[500%]',
]
const projectOpen = ref<string | null>(null)
const scrollTo = (event: Event, id: string) => {
  event.preventDefault()
  history.replaceState(null, '', `#${id}`)
  if (!cinematicReady && sceneStatus.value !== 'fallback') {
    pendingAnchor = id
    return
  }
  const target = document.getElementById(id)
  if (
    target &&
    !window.dispatchEvent(new CustomEvent('matrix:navigate', { detail: target, cancelable: true }))
  )
    return
  target?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
  target?.focus({ preventScroll: true })
}
const keydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyE') {
    event.preventDefault()
    adminOpen.value = !adminOpen.value
  }
}
onMounted(() => {
  hydrated.value = true
  // Choose the arrival palette before the lazy scene initializes on deep links
  // or browser-restored scroll positions.
  const anchorIndex = sections.findIndex((section) => `#${section.id}` === window.location.hash)
  if (anchorIndex > 0) progress.value = anchorIndex
  else
    sections.forEach((section, index) => {
      const el = document.getElementById(section.id)
      if (el && window.scrollY >= el.offsetTop && index > 0) progress.value = index
    })
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) sceneStatus.value = 'fallback'
  loadingTimeout = setTimeout(() => {
    if (sceneStatus.value === 'pending') sceneStatus.value = 'fallback'
  }, 12000)
  window.addEventListener('keydown', keydown)
  const url = new URL(window.location.href)
  // Complete email sign-in quietly, without opening the editor or leaving a
  // persistent auto-open flag on reload. Keep other query parameters and hashes.
  if (url.searchParams.has('admin')) {
    url.searchParams.delete('admin')
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }
  if (
    (new URLSearchParams(url.hash.slice(1)).has('access_token') || url.searchParams.has('code')) &&
    publicConfig.supabaseUrl &&
    publicConfig.supabaseAnonKey
  ) {
    void import('~/lib/admin-client')
      .then(({ getAdminClient }) =>
        getAdminClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey).auth.getSession(),
      )
      .catch(() => {
        /* The editor will report sign-in problems when opened. */
      })
  }
})
onBeforeUnmount(() => {
  clearTimeout(loadingTimeout)
  window.removeEventListener('keydown', keydown)
})
</script>

<template>
  <div
    :data-ready="hydrated"
    class="min-h-screen bg-ink font-sans text-paper selection:bg-acid selection:text-ink [&_button]:cursor-pointer [&_a]:outline-offset-8 [&_button]:outline-offset-4 [&_input]:outline-offset-4"
  >
    <a
      href="#main"
      class="fixed left-4 top-4 z-[100] -translate-y-24 rounded bg-acid px-5 py-3 text-ink focus:translate-y-0"
      >Skip to content</a
    >
    <div
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_78%_26%,#26303a_0%,#152426_55%,#0a1118_100%)]"
    />
    <div
      data-horizon-preview
      :data-scene-state="sceneStatus"
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none"
      :class="sceneStatus === 'ready' || progress > 0.2 ? 'opacity-0' : 'opacity-100'"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_76%_27%,#d8a36866,transparent_42%),radial-gradient(ellipse_at_50%_76%,#b2734a38,transparent_52%),linear-gradient(180deg,#45352d_0%,#84573f_57%,#272522_100%)]"
      />
      <div
        class="absolute inset-x-0 bottom-0 h-[44%] bg-linear-to-b from-transparent via-[#191b1a]/20 to-[#101413]/72"
      />
      <div
        class="absolute left-[12%] right-[8%] top-[58%] h-px bg-linear-to-r from-transparent via-[#f0c982]/20 to-transparent shadow-[0_0_34px_8px_#eac27912]"
      />
      <OrbitalLoader
        v-if="sceneStatus === 'pending' && progress <= 0.2"
        class="absolute right-6 top-32 xl:right-[19%] xl:top-1/2"
      />
    </div>
    <CinematicWorld
      @progress="progress = $event"
      @ready="onCinematicReady"
      @scene="onSceneStatus"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 z-[1] bg-linear-to-r from-black/30 via-transparent to-black/5"
    />

    <header
      class="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pb-7 pt-[max(1.75rem,env(safe-area-inset-top))] sm:px-10 lg:px-16 lg:py-9"
    >
      <a
        href="#beginning"
        class="group flex items-center gap-3"
        aria-label="Matrix Fellows home"
        @click="scrollTo($event, 'beginning')"
      >
        <MatrixMark :size="42" />
        <span class="font-display text-lg font-bold tracking-[-0.06em] leading-[1.06]"
          >MATRIX<br />FELLOWS</span
        >
      </a>
      <p class="hidden text-[10px] uppercase tracking-[.24em] text-paper/65 lg:block">
        Independent minds. Shared horizons.
      </p>
      <a
        href="#community"
        class="tactile group flex items-center gap-6 rounded-full border border-paper/35 px-5 py-3 text-xs hover:bg-paper hover:text-ink sm:px-6"
        @click="scrollTo($event, 'community')"
        >Find your people <SiteIcon :size="14"
      /></a>
    </header>

    <nav
      aria-label="Journey sections"
      class="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-6 lg:flex"
    >
      <a
        v-for="(section, i) in sections"
        :key="section.id"
        :href="`#${section.id}`"
        :aria-label="section.label"
        :aria-current="active === i ? 'location' : undefined"
        class="group flex min-h-6 items-center gap-3"
        @click="scrollTo($event, section.id)"
      >
        <span
          class="text-[9px] uppercase tracking-[.14em] transition-opacity"
          :class="
            active === i
              ? 'opacity-75'
              : 'opacity-0 group-hover:opacity-75 group-focus-visible:opacity-100'
          "
          >{{ section.short }}</span
        >
        <span
          class="block rounded-full transition-all duration-500"
          :class="active === i ? 'h-1.5 w-5 bg-acid' : 'h-1 w-1 bg-paper/45 group-hover:bg-paper'"
        />
      </a>
    </nav>
    <nav
      aria-label="Mobile sections"
      class="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-30 rounded-full border border-white/20 bg-white/[.055] p-1.5 shadow-[inset_0_1px_0_#ffffff26,0_8px_32px_#0000001a] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
    >
      <div class="relative grid grid-cols-6">
        <span
          aria-hidden="true"
          data-nav-pill
          class="pointer-events-none absolute inset-y-0 left-0 w-1/6 rounded-full border border-white/30 bg-white/15 shadow-[inset_0_1px_0_#ffffff40,0_2px_10px_#00000014] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
          :class="pillPositions[active]"
        />
        <a
          v-for="(section, i) in sections"
          :key="section.id"
          :href="`#${section.id}`"
          :aria-current="active === i ? 'location' : undefined"
          class="relative z-10 rounded-full py-3 text-center text-[10px] font-medium sm:text-xs"
          :class="active === i ? 'text-white' : 'text-white/65'"
          @click="scrollTo($event, section.id)"
          >{{ section.short }}</a
        >
      </div>
    </nav>

    <main id="main" class="relative z-10 overflow-x-clip [&>section]:perspective-[1200px]">
      <section
        id="beginning"
        data-chapter
        tabindex="-1"
        aria-labelledby="hero-title"
        class="relative flex min-h-[850px] min-h-svh flex-col justify-center px-6 pb-36 pt-36 outline-none sm:px-10 sm:pt-44 lg:px-16"
      >
        <div class="max-w-[1400px]">
          <div
            class="mb-7 flex items-center gap-3 text-[9px] uppercase tracking-[.23em] text-paper/75 sm:mb-10 sm:text-[10px] sm:tracking-[.25em]"
          >
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full bg-acid shadow-[0_0_12px_var(--color-acid)]"
            />
            For the endlessly curious
          </div>
          <h1
            id="hero-title"
            class="max-w-[1060px] font-display text-[clamp(2.9rem,8.7vw,9rem)] font-medium leading-[.99] tracking-[-.065em]"
          >
            Beyond what<br />we
            <span
              class="font-normal text-[#efd5a3]/90 [text-shadow:0_0_24px_#eac27950,0_0_60px_#eac2792b]"
              >know.</span
            >
          </h1>
          <div class="mt-8 max-w-[24rem] sm:mt-10 lg:mt-11">
            <div>
              <p class="text-sm leading-relaxed text-paper/75 sm:text-base">
                The world is full of unanswered questions.<br />We’re learning to ask the next
                one—together.
              </p>
              <a
                href="#discovery"
                class="group mt-6 inline-flex items-center gap-5 border-b border-paper/45 pb-2 text-xs"
                @click="scrollTo($event, 'discovery')"
                >Follow your curiosity
                <SiteIcon
                  name="down"
                  :size="16"
                  class="transition-transform group-hover:translate-y-1"
              /></a>
            </div>
            <div
              data-hero-meeting
              class="group/meeting relative mt-6 overflow-hidden rounded-xl border border-[#f4d39b]/45 bg-[linear-gradient(135deg,rgba(124,84,43,.56)_0%,rgba(130,96,59,.34)_58%,rgba(222,190,131,.08)_100%)] px-4 py-3.5 shadow-[0_16px_44px_rgba(72,43,24,.1),inset_0_1px_0_#fff4] backdrop-blur-md transition-[transform,border-color,box-shadow] duration-[620ms] ease-[cubic-bezier(.16,1.28,.3,1)] hover:-translate-y-[3px] hover:scale-[1.01] hover:border-[#f4d39b]/60 hover:shadow-[0_22px_54px_rgba(72,43,24,.19),0_0_30px_rgba(234,194,121,.09),inset_0_1px_0_#fff5] focus-within:-translate-y-[3px] focus-within:scale-[1.01] focus-within:border-[#f4d39b]/60 focus-within:shadow-[0_22px_54px_rgba(72,43,24,.19),0_0_30px_rgba(234,194,121,.09),inset_0_1px_0_#fff5] motion-reduce:transform-none motion-reduce:transition-none sm:px-5 sm:py-4"
            >
              <span
                aria-hidden="true"
                class="absolute inset-y-0 left-0 w-px origin-center bg-linear-to-b from-transparent via-[#f4ca7b]/85 to-transparent transition-[transform,filter] duration-[620ms] ease-[cubic-bezier(.16,1.28,.3,1)] group-hover/meeting:scale-y-[1.14] group-hover/meeting:brightness-125 group-focus-within/meeting:scale-y-[1.14] group-focus-within/meeting:brightness-125 motion-reduce:transform-none motion-reduce:transition-none"
              />
              <span
                aria-hidden="true"
                class="absolute -right-10 -top-14 h-28 w-28 rounded-full bg-[#f3c779]/12 blur-2xl transition-[transform,opacity] duration-1000 ease-[cubic-bezier(.22,1,.36,1)] group-hover/meeting:-translate-x-2 group-hover/meeting:translate-y-2 group-hover/meeting:scale-110 group-hover/meeting:opacity-90 group-focus-within/meeting:-translate-x-2 group-focus-within/meeting:translate-y-2 group-focus-within/meeting:scale-110 group-focus-within/meeting:opacity-90 motion-reduce:transform-none motion-reduce:transition-none"
              />
              <div class="relative">
                <p
                  class="flex items-center gap-2 text-[9px] font-medium uppercase tracking-[.2em] text-[#f4ce89]"
                >
                  <span
                    class="h-1 w-1 rounded-full bg-[#f4ce89] shadow-[0_0_8px_#f4ce89] transition-[transform,box-shadow] duration-[620ms] ease-[cubic-bezier(.16,1.28,.3,1)] group-hover/meeting:scale-[1.7] group-hover/meeting:shadow-[0_0_13px_#f4ce89] group-focus-within/meeting:scale-[1.7] group-focus-within/meeting:shadow-[0_0_13px_#f4ce89] motion-reduce:transform-none motion-reduce:transition-none"
                  />
                  Meetings
                </p>
                <p class="mt-2 text-sm font-medium leading-snug text-paper">
                  {{ meetingDate }} · {{ content.meeting.time || 'Time forthcoming' }}
                </p>
                <div class="mt-0.5 flex items-center justify-between gap-3">
                  <p class="whitespace-nowrap text-[11px] text-paper/80 sm:text-xs">
                    {{ content.meeting.location || 'Location forthcoming' }}
                  </p>
                  <a
                    href="#meeting-details"
                    class="group inline-flex min-h-10 shrink-0 items-center gap-2 text-[11px] font-medium text-[#f4ce89]"
                    @click="scrollTo($event, 'meeting-details')"
                    >Meeting details
                    <SiteIcon
                      :size="12"
                      class="transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0.5 group-hover/meeting:translate-x-0.5 group-focus-within/meeting:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                  /></a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          data-hero-detail
          class="absolute bottom-24 left-6 right-6 flex items-end justify-between border-t border-paper/20 pt-5 sm:left-10 sm:right-10 lg:bottom-9 lg:left-16 lg:right-16"
        >
          <div class="flex items-center gap-4">
            <span class="font-mono text-[10px] text-paper/45">01 / 05</span>
            <p class="text-[10px] uppercase tracking-[.2em] text-paper/65">
              It begins with a question
            </p>
          </div>
          <span
            data-hero-society
            class="hidden items-center gap-2 text-[9px] uppercase tracking-[.17em] text-paper/50 sm:flex"
            ><span class="h-1 w-1 rounded-full bg-acid" /> MHS Research Society · Martin</span
          >
        </div>
        <div data-hero-detail class="absolute right-[16%] top-[48%] hidden xl:block">
          <UnexploredMarker v-if="sceneStatus !== 'pending'" />
        </div>
      </section>

      <section
        id="discovery"
        data-chapter
        tabindex="-1"
        aria-labelledby="discovery-title"
        class="relative flex min-h-[110svh] items-center px-6 py-32 outline-none sm:px-10 lg:px-16"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -inset-x-0 inset-y-0 bg-[radial-gradient(ellipse_at_35%_50%,#101a17d9,transparent_72%)] sm:hidden"
        />
        <div
          class="relative w-full max-w-5xl max-sm:[text-shadow:0_2px_18px_#06100de6] max-sm:[&_p]:text-paper/90"
        >
          <p class="mb-8 text-[10px] uppercase tracking-[.25em] text-acid">
            02 — A first discovery
          </p>
          <DiscoveryReveal />
          <DiscoveryCompass class="mt-8 sm:mt-10" />
        </div>
      </section>

      <section
        id="research"
        data-chapter
        tabindex="-1"
        aria-labelledby="research-title"
        class="min-h-[175svh] px-6 py-32 outline-none sm:px-10 lg:px-16 lg:pr-36"
      >
        <div data-ocean-intro class="relative mb-10 min-h-[65svh] motion-reduce:min-h-0">
          <div
            class="sticky top-[20svh] flex flex-col justify-between gap-8 md:flex-row md:items-end motion-reduce:static"
          >
            <div>
              <p class="mb-7 text-[10px] uppercase tracking-[.25em] text-acid">
                03 — An ocean of possibility
              </p>
              <h2
                id="research-title"
                class="font-display text-5xl font-medium leading-[1.08] tracking-[-.055em] sm:text-7xl"
              >
                Every answer.<br />Another horizon.
              </h2>
            </div>
            <p class="max-w-xs text-sm leading-relaxed text-paper/65">
              Our research starts small and looks further.<br />Three projects. Many more
              questions.<br /><span class="mt-3 inline-block text-xs text-paper/70"
                >Project details are being prepared.</span
              >
            </p>
          </div>
        </div>
        <div class="border-t border-paper/30">
          <article
            v-for="(project, index) in content.projects"
            :key="project.id"
            class="border-b border-paper/20"
          >
            <button
              class="group relative grid w-full grid-cols-[32px_1fr_24px] items-center gap-3 py-8 text-left before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_30%_50%,#b6d4de0d,transparent_65%)] before:opacity-0 before:blur-xl before:transition-opacity before:duration-800 before:ease-[cubic-bezier(.4,0,.2,1)] hover:before:opacity-100 focus-visible:before:opacity-100 motion-reduce:before:transition-none sm:grid-cols-[70px_1fr_1fr_32px] sm:gap-6 sm:py-10"
              :aria-expanded="projectOpen === project.id"
              :aria-controls="`project-${project.id}`"
              @click="projectOpen = projectOpen === project.id ? null : project.id"
            >
              <span class="self-start pt-1 font-mono text-xs text-paper/45">0{{ index + 1 }}</span>
              <div
                class="origin-left transition-transform duration-800 ease-[cubic-bezier(.4,0,.2,1)] group-hover:translate-x-1.5 group-hover:scale-[1.015] group-focus-visible:translate-x-1.5 motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span class="mb-3 block text-[9px] uppercase tracking-[.2em] text-acid/80">{{
                  project.field
                }}</span>
                <h3 class="font-display text-xl tracking-[-.03em] sm:text-2xl">
                  {{ project.title }}
                </h3>
                <span class="mt-3 block text-[10px] text-paper/50">{{ project.status }}</span>
              </div>
              <p class="hidden max-w-sm text-sm leading-relaxed text-paper/60 sm:block">
                {{ project.summary }}
              </p>
              <SiteIcon
                name="plus"
                :size="24"
                class="rounded-full text-paper/60 transition-[transform,scale,rotate,color,background-color,box-shadow] duration-1000 ease-[cubic-bezier(.4,0,.2,1)] group-hover:scale-110 group-hover:bg-paper/10 group-hover:text-paper group-hover:shadow-[0_0_0_8px_#f4f1e90a] motion-reduce:transform-none motion-reduce:scale-100 motion-reduce:transition-none"
                :class="projectOpen === project.id ? 'rotate-45 text-acid' : 'rotate-0'"
              />
            </button>
            <div
              :id="`project-${project.id}`"
              :aria-hidden="projectOpen !== project.id"
              :inert="projectOpen !== project.id"
              class="grid transition-[grid-template-rows,opacity] duration-600 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
              :class="
                projectOpen === project.id
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              "
            >
              <div class="min-h-0 overflow-hidden">
                <div
                  class="max-w-3xl pb-9 pl-11 transition-transform duration-500 ease-out motion-reduce:transition-none sm:pl-24"
                  :class="projectOpen === project.id ? 'translate-y-0' : '-translate-y-3'"
                >
                  <p class="whitespace-pre-line text-sm leading-relaxed text-paper/75">
                    {{ project.details }}
                  </p>
                  <a
                    v-if="project.url"
                    :href="project.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="tactile mt-5 inline-flex items-center gap-3 text-xs text-acid"
                    >Explore project <SiteIcon :size="14"
                  /></a>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        id="frontiers"
        data-chapter
        tabindex="-1"
        aria-labelledby="frontiers-title"
        class="relative flex min-h-[120svh] items-center justify-end px-6 py-36 outline-none sm:px-10 lg:px-36"
      >
        <div
          data-depths-panel
          class="depths-panel relative isolate max-w-xl overflow-visible px-0 py-8 sm:px-8 sm:py-10"
          :class="{ 'depths-panel--active': active === 3 }"
        >
          <div aria-hidden="true" class="depths-panel__light absolute inset-0 -z-10" />
          <p class="mb-8 text-[10px] uppercase tracking-[.25em] text-acid">
            04 — Beneath the surface
          </p>
          <h2
            id="frontiers-title"
            class="font-display text-5xl font-medium leading-[1.08] tracking-[-.055em] sm:text-7xl"
          >
            <span class="depths-title-line"
              >The
              <span class="font-serif font-normal italic tracking-[-.065em] text-[#c4dadd]"
                >unknown</span
              ></span
            ><br /><span class="depths-title-line depths-title-line--second"
              >is an invitation.</span
            >
          </h2>
          <div class="depths-copy">
            <p class="mt-8 max-w-md text-base leading-relaxed text-paper/70">
              Research asks us to stay with the difficult questions. To look closer when the answer
              isn’t obvious. To try again when an idea doesn’t hold.
            </p>
            <p class="mt-5 max-w-md text-base leading-relaxed text-paper/70">
              You don’t need to have it all figured out. You need curiosity, a little courage, and
              people willing to go deeper with you.
            </p>
          </div>
        </div>
      </section>

      <section
        id="connection"
        data-chapter
        tabindex="-1"
        aria-labelledby="connection-title"
        class="flex min-h-[115svh] items-center justify-center px-6 py-36 text-center outline-none sm:px-10"
      >
        <div class="max-w-4xl">
          <p class="mb-9 text-[10px] uppercase tracking-[.25em] text-acid">
            05 — No discovery exists alone
          </p>
          <h2
            id="connection-title"
            class="font-display text-5xl font-medium leading-[1.07] tracking-[-.055em] sm:text-7xl lg:text-8xl"
          >
            One curious mind.<br /><span
              class="bg-linear-to-r from-[#ddd6f2] via-[#e7dff7] to-[#d2c4ee] bg-clip-text text-transparent drop-shadow-[0_0_22px_#b79de83d] sm:from-[#b6e4ee] sm:via-[#e2d4f7] sm:to-[#c7b5ed]"
              >Infinite connections.</span
            >
          </h2>
          <p class="mx-auto mt-9 max-w-lg text-base leading-relaxed text-paper/70">
            Ideas connect. Disciplines overlap. One person’s question becomes another person’s
            breakthrough. That is how knowledge moves forward. Together.
          </p>
          <a
            href="#community"
            class="tactile mt-10 inline-flex items-center gap-8 rounded-full bg-acid px-7 py-4 text-sm font-medium text-ink [transition-duration:1s,1s,1s,200ms,200ms,200ms,1s] hover:bg-acid/90 hover:shadow-[0_6px_24px_color-mix(in_srgb,var(--color-acid)_18%,transparent)]"
            @click="scrollTo($event, 'community')"
            >There’s a place for you here <SiteIcon :size="17"
          /></a>
        </div>
      </section>

      <section
        id="community"
        data-chapter
        tabindex="-1"
        aria-labelledby="community-title"
        class="relative isolate bg-linear-to-b from-transparent via-ink/85 to-ink/80 px-6 pb-14 pt-28 outline-none sm:px-10 lg:px-16 lg:pr-36"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_90%,#74658e26,transparent_55%),radial-gradient(ellipse_at_0%_100%,#44616e20,transparent_50%)] [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]"
        />
        <div
          class="flex flex-col justify-between gap-8 border-b border-paper/15 pb-12 md:flex-row md:items-end"
        >
          <div>
            <p class="mb-6 text-[10px] uppercase tracking-[.25em] text-acid">Your next chapter</p>
            <h2
              id="community-title"
              class="font-display text-5xl font-medium tracking-[-.055em] sm:text-7xl"
            >
              Come curious.
            </h2>
          </div>
          <p class="max-w-xs text-sm leading-relaxed text-paper/55">
            Bring an idea, a question, or simply yourself.<br />Let’s find out what comes next.
          </p>
        </div>
        <MeetingCard :meeting="content.meeting" />
        <div class="grid gap-12 border-t border-paper/15 py-16 lg:grid-cols-[1fr_2fr]">
          <div>
            <p class="text-[10px] uppercase tracking-[.2em] text-paper/45">Room to grow</p>
            <h3 class="mt-5 font-display text-3xl tracking-[-.04em]">
              A little support.<br />A lot of possibility.
            </h3>
          </div>
          <div class="grid gap-x-10 gap-y-12 sm:grid-cols-2">
            <article v-for="(benefit, index) in content.benefits" :key="index">
              <span class="text-xs text-acid/70">0{{ index + 1 }} /</span>
              <h4 class="mt-4 text-base font-medium">{{ benefit.title }}</h4>
              <p class="mt-3 text-sm leading-relaxed text-paper/55">{{ benefit.description }}</p>
              <a
                v-if="benefit.url"
                :href="benefit.url"
                target="_blank"
                rel="noopener noreferrer"
                class="tactile mt-4 inline-flex items-center gap-3 text-xs text-acid"
                >Get involved <SiteIcon :size="13"
              /></a>
            </article>
          </div>
        </div>
        <GuidePreview />
        <OpportunityBoard :opportunities="data?.opportunities || defaultOpportunities" />
        <div
          data-closing-cta
          class="pointer-events-none relative isolate mt-16 overflow-hidden rounded-2xl border border-paper/15 bg-paper/[.025] px-7 py-10 text-[#edf1ff] shadow-[inset_0_1px_0_#d3daed0d] sm:p-12 lg:p-16"
        >
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_20%,#8790ac14,transparent_70%)]"
          />
          <div
            aria-hidden="true"
            class="pointer-events-none absolute -right-14 -top-28 -z-10 h-72 w-72 rounded-full bg-[#b0bad4]/[.045] blur-3xl"
          />
          <div class="flex items-center gap-3">
            <span
              aria-hidden="true"
              class="h-1.5 w-1.5 rounded-full bg-[#aebeff] shadow-[0_0_12px_#aebeff66]"
            />
            <p class="text-[9px] uppercase tracking-[.2em] text-[#b0bdd8]">
              The next question starts with you
            </p>
          </div>
          <div
            class="mt-8 flex flex-col items-start justify-between gap-9 lg:flex-row lg:items-end lg:gap-12"
          >
            <h3
              class="max-w-2xl font-display text-4xl font-medium leading-[1.08] tracking-[-.05em] sm:text-5xl xl:text-6xl"
            >
              Let’s explore<br /><span
                class="bg-linear-to-r from-[#aeeaff] via-[#e0ccff] to-[#e6adfa] bg-clip-text text-transparent drop-shadow-[0_0_18px_#ae95ee50]"
                >what’s possible.</span
              >
            </h3>
            <button
              @click="joinOpen = true"
              class="tactile pointer-events-auto group inline-flex min-h-12 shrink-0 items-center gap-7 rounded-full border border-[#c4ccef]/45 bg-transparent px-6 py-4 text-sm font-medium text-[#dce5ff] hover:border-[#dce5ff]/80 hover:bg-[#c4ccef]/[.035] hover:shadow-[0_0_28px_#b7c8ff14] focus-visible:outline-[#b7c8ff]"
            >
              Join Matrix Fellows
              <span
                class="transition-transform duration-[900ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                ><SiteIcon :size="16"
              /></span>
            </button>
          </div>
        </div>
        <p v-if="data?.unavailable" role="status" class="mt-6 text-xs text-paper/45">
          Live updates are temporarily unavailable. Showing our introductory information.
        </p>
      </section>
    </main>

    <footer
      class="site-footer relative isolate z-10 px-6 pb-28 pt-20 sm:px-10 sm:pt-24 lg:px-16 lg:pb-12"
    >
      <div class="footer-inner relative z-[1] mx-auto max-w-[90rem]">
        <div
          class="grid gap-12 border-b border-paper/[.09] pb-12 sm:grid-cols-2 sm:gap-x-12 lg:grid-cols-[minmax(18rem,1.45fr)_minmax(12rem,.75fr)_minmax(15rem,1fr)] lg:gap-x-20"
        >
          <div class="sm:col-span-2 lg:col-span-1">
            <a
              href="#beginning"
              class="tactile inline-flex items-center gap-3 font-display text-base font-medium tracking-[-.025em]"
              @click="scrollTo($event, 'beginning')"
              ><MatrixMark :size="34" /> Matrix Fellows</a
            >
            <p class="mt-5 max-w-sm text-sm leading-6 text-paper/48">
              Matrix Fellows is the broader student-research initiative. The Martin High School
              Research Society is its community at Martin.
            </p>
            <p class="mt-6 text-[10px] uppercase tracking-[.18em] text-acid/75">
              Independent minds · shared horizons
            </p>
          </div>

          <nav aria-label="Footer resources">
            <h3 class="footer-heading">Explore</h3>
            <div class="mt-4 grid gap-1">
              <NuxtLink to="/guides" class="footer-action group">
                <span class="footer-action__icon"><SiteIcon name="spark" :size="14" /></span>
                <span>Research guides</span>
              </NuxtLink>
              <NuxtLink to="/opportunities" class="footer-action group">
                <span class="footer-action__icon"><SiteIcon name="compass" :size="15" /></span>
                <span>Opportunities</span>
              </NuxtLink>
              <a
                href="#community"
                class="footer-action group"
                @click="scrollTo($event, 'community')"
              >
                <span class="footer-action__icon"><SiteIcon name="calendar" :size="15" /></span>
                <span>Next meeting</span>
              </a>
            </div>
          </nav>

          <div>
            <h3 class="footer-heading">Connect</h3>
            <div class="mt-4 grid gap-1">
              <button class="footer-action group text-left" @click="joinOpen = true">
                <span class="footer-action__icon"><SiteIcon name="plus" :size="15" /></span>
                <span>Open join form</span>
              </button>
              <a href="mailto:contact@matrixfellows.com" class="footer-action group">
                <span class="footer-action__icon"><SiteIcon name="mail" :size="15" /></span>
                <span class="min-w-0 [overflow-wrap:anywhere]">contact@matrixfellows.com</span>
              </a>
              <a
                href="https://www.instagram.com/mhs_research_society/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Matrix Fellows on Instagram, @mhs_research_society (opens in a new tab)"
                class="footer-action group"
              >
                <span class="footer-action__icon"><SiteIcon name="instagram" :size="15" /></span>
                <span>@mhs_research_society</span>
              </a>
            </div>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 pt-5 text-[11px] sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-paper/30">Student-founded. Built on curiosity.</p>
          <div class="flex items-center gap-4">
            <button class="footer-utility" @click="adminOpen = true">
              <SiteIcon name="lock" :size="13" /> Member admin
            </button>
            <span class="footer-utility-separator" aria-hidden="true">·</span>
            <a href="#beginning" class="footer-utility" @click="scrollTo($event, 'beginning')"
              >Back to top <SiteIcon name="up" :size="13"
            /></a>
          </div>
        </div>
      </div>
    </footer>
    <LazyJoinForm v-if="joinOpen" @close="joinOpen = false" />
    <LazyAdminPanel
      v-if="adminOpen"
      :initial-content="content"
      :opportunities="data?.opportunities || []"
      @close="adminOpen = false"
      @saved="refresh()"
    />
  </div>
</template>

<style scoped>
.depths-panel {
  --depths-drift: 1.4px;
  animation: depths-buoyancy 14s cubic-bezier(0.45, 0.05, 0.3, 1) infinite both paused;
  background: none;
  transform-origin: 72% 58%;
}
.depths-panel--active {
  animation-play-state: running;
}
.depths-panel__light {
  inset: -5rem -7rem;
  background:
    radial-gradient(21rem 14rem at 28% 31%, rgb(116 225 225 / 0.055), transparent 72%),
    radial-gradient(18rem 20rem at 62% 57%, rgb(108 151 202 / 0.03), transparent 78%);
  opacity: 0.72;
  transform: translate3d(-1%, 0, 0);
  transition: opacity 800ms ease;
}
.depths-title-line,
.depths-copy {
  display: inline-block;
  will-change: transform;
  animation: depths-text-drift 11s cubic-bezier(0.45, 0.05, 0.35, 1) infinite both paused;
}
.depths-title-line--second {
  animation-delay: -5.4s;
  animation-duration: 13s;
}
.depths-copy {
  animation-delay: -8.2s;
  animation-duration: 16s;
}
.depths-panel--active .depths-title-line,
.depths-panel--active .depths-copy {
  animation-play-state: running;
}
@keyframes depths-buoyancy {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  36% {
    transform: translate3d(-0.45px, calc(var(--depths-drift) * -1), 0) rotate(-0.025deg);
  }
  68% {
    transform: translate3d(0.35px, calc(var(--depths-drift) * 0.38), 0) rotate(0.018deg);
  }
}
@keyframes depths-text-drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  34% {
    transform: translate3d(0.8px, -1.15px, 0) rotate(-0.018deg);
  }
  69% {
    transform: translate3d(-0.55px, 0.7px, 0) rotate(0.012deg);
  }
}
@media (max-width: 639px) {
  .depths-panel {
    animation: none;
    background: none;
  }
  .depths-panel__light {
    display: none;
  }
}
.site-footer {
  overflow: hidden;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--color-ink) 80%, transparent) 0%,
    color-mix(in srgb, var(--color-ink) 70%, transparent) 22%,
    color-mix(in srgb, var(--color-ink) 52%, transparent) 48%,
    color-mix(in srgb, var(--color-ink) 62%, transparent) 100%
  );
}
.site-footer::after {
  content: '';
  position: absolute;
  z-index: 0;
  inset: 0;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 32%);
  mask-image: linear-gradient(to bottom, transparent, black 32%);
  background:
    radial-gradient(
      40rem 17rem at 18% 4%,
      color-mix(in srgb, var(--color-acid) 4.5%, transparent),
      transparent 72%
    ),
    radial-gradient(
      32rem 14rem at 78% 8%,
      color-mix(in srgb, #9fcfe0 2.5%, transparent),
      transparent 76%
    );
}
.footer-heading {
  font-size: 0.625rem;
  line-height: 1rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-paper) 45%, transparent);
}
.footer-action {
  display: flex;
  min-height: 3rem;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.75rem;
  padding: 0.35rem 0.5rem;
  margin-inline: -0.5rem;
  font-size: 0.75rem;
  line-height: 1.2rem;
  color: color-mix(in srgb, var(--color-paper) 66%, transparent);
  transition:
    color 180ms ease,
    background-color 180ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.footer-action:hover,
.footer-action:focus-visible {
  color: var(--color-paper);
  background: color-mix(in srgb, var(--color-paper) 2.8%, transparent);
  transform: translate3d(3px, 0, 0);
}
.footer-action:active {
  transform: scale(0.985);
  transition-duration: 80ms;
}
.footer-action__icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-paper) 12%, transparent);
  border-radius: 999px;
  color: color-mix(in srgb, var(--color-paper) 48%, transparent);
  background: color-mix(in srgb, var(--color-paper) 2%, transparent);
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease,
    transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms ease;
}
.footer-action:hover .footer-action__icon,
.footer-action:focus-visible .footer-action__icon {
  color: var(--color-acid);
  border-color: color-mix(in srgb, var(--color-acid) 34%, transparent);
  background: color-mix(in srgb, var(--color-acid) 6%, transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--color-acid) 7%, transparent);
  transform: rotate(-4deg) scale(1.04);
}
.footer-utility {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.45rem;
  color: color-mix(in srgb, var(--color-paper) 38%, transparent);
  transition:
    color 180ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.footer-utility:hover,
.footer-utility:focus-visible {
  color: var(--color-acid);
  transform: translate3d(0, -1px, 0);
}
.footer-utility-separator {
  color: color-mix(in srgb, var(--color-paper) 23%, transparent);
  font-size: 0.875rem;
  line-height: 1;
}
@media (prefers-reduced-motion: reduce) {
  .depths-panel,
  .depths-title-line,
  .depths-copy {
    animation: none;
    transform: none;
  }
  .footer-action,
  .footer-action__icon,
  .footer-utility {
    transform: none !important;
    transition: none;
  }
}
</style>
