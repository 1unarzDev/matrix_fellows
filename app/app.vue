<script setup lang="ts">
import MatrixMark from '~/components/MatrixMark.vue'
import ArrivalVeil from '~/components/ArrivalVeil.vue'
import { defaultContent, defaultOpportunities } from '#shared/data/defaults'
import type { PublicContent } from '#shared/types/content'

const publicConfig = useRuntimeConfig().public
const siteUrl = publicConfig.siteUrl
const socialImage = new URL('/social-card.png?v=horizon-2', siteUrl).href
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
const progress = ref(0)
const hydrated = ref(false)
const sceneStatus = ref<'pending' | 'ready' | 'fallback'>('pending')
let loadingTimeout: ReturnType<typeof setTimeout> | undefined
const onSceneStatus = (status: 'ready' | 'fallback') => {
  sceneStatus.value = status
  clearTimeout(loadingTimeout)
}
let cinematicReady = false
let pendingAnchor: string | null = null
const onCinematicReady = () => {
  cinematicReady = true
  const id = pendingAnchor || window.location.hash.slice(1)
  if (id && sections.some((section) => section.id === id)) {
    const target = document.getElementById(id)
    target?.scrollIntoView({
      behavior:
        pendingAnchor && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'smooth'
          : 'instant',
    })
    if (pendingAnchor) target?.focus({ preventScroll: true })
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
  if (!cinematicReady) {
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
      class="pointer-events-none fixed inset-0 transition-opacity duration-[1800ms] ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none"
      :class="sceneStatus === 'ready' || progress > 0.2 ? 'opacity-0' : 'opacity-100'"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_30%,#d8a36870,transparent_45%),linear-gradient(#45352d,#9c6647_55%,#372a25)]"
      />
      <div class="absolute left-0 right-0 top-[53%] h-20 bg-[#eac279]/15 blur-3xl" />
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="none"
        class="absolute inset-0 h-full w-full"
      >
        <path d="M0 680C220 590 380 580 650 640S1160 520 1600 600V1000H0Z" class="fill-[#634631]" />
        <path d="M0 740C340 530 520 590 780 750S1290 780 1600 670V1000H0Z" class="fill-[#443328]" />
        <path d="M0 850C330 710 700 760 960 900S1400 820 1600 860V1000H0Z" class="fill-[#282320]" />
      </svg>
    </div>
    <CinematicWorld
      @progress="progress = $event"
      @ready="onCinematicReady"
      @scene="onSceneStatus"
    />
    <ArrivalVeil :status="sceneStatus" :progress="progress" />
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
        <MatrixMark :size="42" :loading="sceneStatus === 'pending'" />
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
        class="relative flex min-h-[850px] min-h-svh flex-col justify-center px-6 pb-36 pt-44 outline-none sm:px-10 lg:px-16"
      >
        <div class="max-w-[1400px]">
          <div
            class="mb-9 flex items-center gap-3 text-[10px] uppercase tracking-[.25em] text-paper/75 sm:mb-10"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-acid shadow-[0_0_12px_var(--color-acid)]" /> A
            society for the endlessly curious
          </div>
          <h1
            id="hero-title"
            class="max-w-[1060px] font-display text-[clamp(3.4rem,8.7vw,9rem)] font-medium leading-[.99] tracking-[-.065em]"
          >
            Beyond what<br />we
            <span
              class="font-normal text-[#efd5a3]/90 [text-shadow:0_0_24px_#eac27950,0_0_60px_#eac2792b]"
              >know.</span
            >
          </h1>
          <div class="mt-9 max-w-sm sm:mt-11">
            <p class="text-sm leading-relaxed text-paper/75 sm:text-base">
              The world is full of unanswered questions.<br />We’re a community of researchers<br
                class="hidden sm:block"
              />
              learning to ask the next one.
            </p>
            <a
              href="#discovery"
              class="group mt-7 inline-flex items-center gap-5 border-b border-paper/45 pb-2 text-xs"
              @click="scrollTo($event, 'discovery')"
              >Follow your curiosity
              <SiteIcon
                name="down"
                :size="16"
                class="transition-transform group-hover:translate-y-1"
            /></a>
          </div>
        </div>
        <div
          data-hero-detail
          class="absolute bottom-12 left-6 right-6 flex items-end justify-between border-t border-paper/20 pt-5 sm:left-10 sm:right-10 lg:bottom-9 lg:left-16 lg:right-16"
        >
          <div class="flex items-center gap-4">
            <span class="font-mono text-[10px] text-paper/45">01 / 05</span>
            <p class="text-[10px] uppercase tracking-[.2em] text-paper/65">
              It begins with a question
            </p>
          </div>
          <span
            class="hidden items-center gap-2 text-[9px] uppercase tracking-[.17em] text-paper/50 sm:flex"
            ><span class="h-1 w-1 rounded-full bg-acid" /> Student-founded. Open-minded.</span
          >
        </div>
        <div
          aria-hidden="true"
          data-hero-detail
          class="absolute right-[16%] top-[48%] hidden xl:block"
        >
          <UnexploredMarker />
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
          class="relative max-w-xl max-sm:[text-shadow:0_2px_18px_#06100de6] max-sm:[&_p]:text-paper/90"
        >
          <p class="mb-8 text-[10px] uppercase tracking-[.25em] text-acid">
            02 — A first discovery
          </p>
          <h2
            id="discovery-title"
            class="font-display text-5xl font-medium leading-[1.08] tracking-[-.055em] sm:text-7xl"
          >
            Curiosity finds<br />a way.
          </h2>
          <p class="mt-8 max-w-md text-base leading-relaxed text-paper/75">
            A question can feel like a vast, empty landscape. Then something shifts. A conversation.
            An observation. A possibility you hadn’t seen before.
          </p>
          <p class="mt-5 max-w-md text-base leading-relaxed text-paper/75">
            Matrix Fellows is a student-founded research society built around that moment. We bring
            curious people together to turn a first idea into meaningful inquiry.
          </p>
          <div class="mt-10 flex items-center gap-4 text-xs text-paper/65">
            <SiteIcon name="compass" :size="32" class="shrink-0 text-acid/80" /><span
              >Different disciplines. A shared instinct to explore.</span
            >
          </div>
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
              questions.<br /><span class="mt-3 inline-block text-xs text-paper/45"
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
        <div class="max-w-xl">
          <p class="mb-8 text-[10px] uppercase tracking-[.25em] text-acid">
            04 — Beneath the surface
          </p>
          <h2
            id="frontiers-title"
            class="font-display text-5xl font-medium leading-[1.08] tracking-[-.055em] sm:text-7xl"
          >
            The
            <span class="font-serif font-normal italic tracking-[-.065em] text-[#c4dadd]"
              >unknown</span
            ><br />is an invitation.
          </h2>
          <p class="mt-8 max-w-md text-base leading-relaxed text-paper/70">
            Research asks us to stay with the difficult questions. To look closer when the answer
            isn’t obvious. To try again when an idea doesn’t hold.
          </p>
          <p class="mt-5 max-w-md text-base leading-relaxed text-paper/70">
            You don’t need to have it all figured out. You need curiosity, a little courage, and
            people willing to go deeper with you.
          </p>
          <div class="mt-12 h-px w-20 bg-acid/60" />
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
        <OpportunityBoard :opportunities="data?.opportunities || defaultOpportunities" />
        <div
          data-closing-cta
          class="relative isolate mt-16 overflow-hidden rounded-2xl border border-paper/15 bg-paper/[.025] px-7 py-10 text-[#edf1ff] shadow-[inset_0_1px_0_#d3daed0d] sm:p-12 lg:p-16"
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
              class="tactile group inline-flex min-h-12 shrink-0 items-center gap-7 rounded-full bg-[#dce5ff] px-6 py-4 text-sm font-medium text-[#182238] hover:bg-white hover:shadow-[0_8px_32px_#b7c8ff20] focus-visible:outline-[#b7c8ff]"
            >
              Join Matrix Fellows
              <span
                class="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
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
      class="relative z-10 bg-linear-to-b from-ink/80 to-ink/85 px-6 pb-28 pt-6 sm:px-10 lg:px-16 lg:pb-10 lg:pr-36"
    >
      <div
        class="grid grid-cols-2 items-start gap-x-6 gap-y-6 pb-6 pt-2 sm:gap-x-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]"
      >
        <div class="col-span-2 lg:col-span-1">
          <a
            href="#beginning"
            class="tactile inline-flex items-center gap-3 text-sm font-medium"
            @click="scrollTo($event, 'beginning')"
            ><MatrixMark :size="32" /> Matrix Fellows</a
          >
          <p class="mt-3 text-[11px] leading-relaxed text-paper/40">
            Student-founded. Built on curiosity.
          </p>
        </div>
        <div class="grid min-w-0 grid-rows-[auto_minmax(44px,auto)_auto]">
          <h3 class="text-xs font-medium text-paper/85">Become a fellow</h3>
          <button
            @click="joinOpen = true"
            class="tactile inline-flex min-h-11 w-fit items-center gap-2 py-2 text-[11px] text-paper/75 hover:text-acid"
          >
            Open join form <SiteIcon :size="14" />
          </button>
          <a
            href="#community"
            class="tactile flex min-h-11 w-fit items-center gap-2 py-2 text-[11px] text-paper/65 hover:text-paper"
            @click="scrollTo($event, 'community')"
            >Next meeting <SiteIcon :size="13"
          /></a>
        </div>
        <div class="grid min-w-0 grid-rows-[auto_minmax(44px,auto)_auto]">
          <h3 class="text-xs font-medium text-paper/85">Get in touch</h3>
          <a
            href="mailto:contact@matrixfellows.com"
            class="tactile inline-flex min-h-11 max-w-full items-center py-2 text-[11px] text-paper/75 hover:text-acid"
            ><span class="[overflow-wrap:anywhere]">contact@matrixfellows.com</span></a
          >
          <a
            href="#community"
            class="tactile flex min-h-11 w-fit items-center gap-2 py-2 text-[11px] text-paper/65 hover:text-paper"
            @click="scrollTo($event, 'community')"
            >Opportunities <SiteIcon :size="13"
          /></a>
        </div>
      </div>
      <div
        class="grid grid-cols-2 items-center gap-x-6 border-t border-paper/[.07] pt-3 sm:gap-x-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]"
      >
        <button
          class="tactile min-h-11 w-fit py-2 text-left text-[11px] text-paper/35 hover:text-paper lg:col-start-2"
          @click="adminOpen = true"
        >
          Member admin</button
        ><a
          href="#beginning"
          class="tactile inline-flex min-h-11 w-fit items-center py-2 text-[11px] text-paper/60 hover:text-paper"
          @click="scrollTo($event, 'beginning')"
          >Back to top ↑</a
        >
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
