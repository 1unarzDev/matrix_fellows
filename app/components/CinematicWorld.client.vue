<script setup lang="ts">
import type { World } from '~/lib/scene/world'
import { getTimelineAssist } from '~/lib/timeline-assist'
import { createWheelInputPolicy } from '~/lib/wheel-input'

const emit = defineEmits<{
  progress: [value: number]
  ready: []
  scene: [value: 'ready' | 'fallback']
}>()
const canvas = ref<HTMLCanvasElement>()
const failed = ref(false)
const ready = ref(false)
const profiling = ref(false)
const reportCopied = ref(false)
const diagnosticDrawingPaused = ref(false)
const runtimeConfig = useRuntimeConfig()

function performanceReport() {
  // Explicit opt-in and user action only. Never collect page/form content,
  // storage, authentication state or reliable-looking power-mode guesses.
  return JSON.stringify({
    capturedAt: new Date().toISOString(),
    buildId: runtimeConfig.app.buildId,
    url: location.href,
    userAgent: navigator.userAgent,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    powerMode: 'not detected; provide manually',
    assets: [...document.scripts].map((script) => script.src).filter(Boolean),
    canvas: { ...canvas.value?.dataset },
    state: window.__matrixWorldDebug?.snapshot(),
    profile: window.__matrixWorldProfile,
  })
}

function savePerformanceReport() {
  const url = URL.createObjectURL(new Blob([performanceReport()], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `matrix-performance-${runtimeConfig.app.buildId}.json`
  link.click()
  // Allow the browser to consume the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function copyPerformanceReport() {
  try {
    await navigator.clipboard.writeText(performanceReport())
    reportCopied.value = true
  } catch {
    savePerformanceReport()
  }
}

function toggleDiagnosticDrawing() {
  const debug = window.__matrixWorldDebug
  if (!debug) return
  diagnosticDrawingPaused.value = !diagnosticDrawingPaused.value
  debug.pauseDrawing(diagnosticDrawingPaused.value)
}
let world: World | undefined
let cleanup: (() => void) | undefined
let disposed = false
let idle: ReturnType<typeof setTimeout>
let media: MediaQueryList
let mediaChanged: () => void
const mountedAt = typeof performance === 'undefined' ? 0 : performance.now()
const SCROLL_INTENT_IDLE_MS = 240

function updateScrollIntentVelocity(previous: number, distance: number, elapsed: number) {
  const magnitude = Math.abs(distance)
  if (elapsed > SCROLL_INTENT_IDLE_MS)
    return magnitude >= 45 ? Math.min(2_400, Math.max(900, magnitude * 12.5)) : 0

  const instantaneous = (magnitude / Math.max(16, elapsed)) * 1000
  return previous * 0.62 + instantaneous * 0.38
}

async function yieldToMain() {
  const browserScheduler = (
    globalThis as typeof globalThis & {
      scheduler?: { yield?: () => Promise<void> }
    }
  ).scheduler
  if (browserScheduler?.yield) await browserScheduler.yield()
  else await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

onMounted(() => {
  profiling.value = new URLSearchParams(location.search).has('matrixProfile')
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (media.matches) emit('scene', 'fallback')
  const init = async () => {
    const touchLayout = window.matchMedia('(pointer: coarse)').matches
    // A secondary mouse/trackpad can exist on a touch-primary laptop or tablet.
    // Layout and renderer stay unchanged; only wheel interaction gains Lenis.
    const wheelCapable = !touchLayout || window.matchMedia('(any-pointer: fine)').matches
    // Fetch the world while the animation libraries initialize. Construction
    // still waits for stable layout, but its large module no longer sits behind
    // font/layout work on the critical path.
    const worldModule = media.matches ? undefined : import('~/lib/scene/world')
    const [{ gsap }, { ScrollTrigger }, lenisModule] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      wheelCapable ? import('lenis') : Promise.resolve(undefined),
    ])
    if (canvas.value) canvas.value.dataset.importMs = (performance.now() - mountedAt).toFixed(1)
    await yieldToMain()
    if (disposed) return
    gsap.registerPlugin(ScrollTrigger)
    ScrollTrigger.config({ ignoreMobileResize: true })
    // One clock and one smoothed scroll position for both the DOM and camera.
    // Touch keeps its native inertia; nested menus/dialogs keep their own scroll.
    const wheelInput = createWheelInputPolicy()
    let wheelMode: 'native' | 'smooth' = 'native'
    if (canvas.value && wheelCapable) canvas.value.dataset.wheelMode = wheelMode
    let cancelWheelSettle = () => {}
    const smoothScroll = lenisModule
      ? new lenisModule.default({
          autoRaf: false,
          duration: 0.7,
          wheelMultiplier: 0.7,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          syncTouch: false,
          allowNestedScroll: false,
          virtualScroll: ({ event }) => {
            if (!(event instanceof WheelEvent) || event.ctrlKey) return false
            // This hook precedes Lenis' prevented-container check. Nested UI
            // must neither classify the page's device nor cancel its animation.
            if (
              event
                .composedPath()
                .some(
                  (node) =>
                    node instanceof HTMLElement &&
                    node.matches(
                      '[role="dialog"], [role="listbox"], input, textarea, select, [contenteditable="true"], [data-lenis-prevent]',
                    ),
                )
            )
              return false
            const next = wheelInput.observe(event, performance.now())
            if (next !== wheelMode) {
              wheelMode = next
              if (canvas.value) canvas.value.dataset.wheelMode = next
            }
            if (next === 'native') {
              // Stop the old easing tail at the actual document position; do
              // not jump to the wheel's pending target or reset native inertia.
              if (smoothScroll?.isScrolling === 'smooth')
                smoothScroll.scrollTo(smoothScroll.actualScroll, { immediate: true, force: true })
              cancelWheelSettle()
              return false
            }
            return true
          },
          prevent: (node: HTMLElement) =>
            node.matches(
              '[role="dialog"], [role="listbox"], input, textarea, select, [contenteditable="true"]',
            ),
        })
      : undefined
    const tickScroll = smoothScroll ? () => smoothScroll.raf(performance.now()) : undefined
    if (smoothScroll && tickScroll) {
      smoothScroll.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(tickScroll)
    }
    let navigatingChapter = false
    let navigationRelease: ReturnType<typeof setTimeout> | undefined
    const chapterOffset = (target: HTMLElement) =>
      target.id === 'research' && !media.matches
        ? Math.max(0, (document.getElementById('frontiers')!.offsetTop - target.offsetTop) * 0.13)
        : 0
    const mobileNavigationOffset = (target: HTMLElement) =>
      touchLayout && ['discovery', 'frontiers', 'connection'].includes(target.id)
        ? Math.min(84, Math.max(52, window.innerHeight * 0.085))
        : 0
    const navigate = (event: Event) => {
      const target = (event as CustomEvent<HTMLElement>).detail
      if (!target?.isConnected) return
      event.preventDefault()
      navigatingChapter = true
      clearTimeout(navigationRelease)
      // These centered chapters read low when their raw top edge is aligned to
      // a compact viewport. Advance selector navigation slightly into them;
      // normal touch scrolling and timeline rest stops remain unchanged.
      const offset = chapterOffset(target) + mobileNavigationOffset(target)
      if (smoothScroll)
        smoothScroll.scrollTo(target, {
          duration: 1.4,
          offset,
          onComplete: () => {
            navigatingChapter = false
            target.focus({ preventScroll: true })
          },
        })
      else {
        window.scrollTo({ top: target.offsetTop + offset, behavior: 'smooth' })
        navigationRelease = setTimeout(() => {
          navigatingChapter = false
          target.focus({ preventScroll: true })
        }, 750)
      }
    }
    const cancelChapterNavigation = () => {
      navigatingChapter = false
      clearTimeout(navigationRelease)
    }
    window.addEventListener('matrix:navigate', navigate)
    window.addEventListener('wheel', cancelChapterNavigation, { passive: true })
    window.addEventListener('touchstart', cancelChapterNavigation, { passive: true })
    const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
    // Never animate an inherited custom property on the document root: that
    // invalidates every offscreen resource card. Keep visible neighbors in the
    // same palette so chapter handoffs and persistent navigation stay coherent.
    const accentRegions = Array.from(
      document.querySelectorAll<HTMLElement>('[data-chapter], [data-cinematic-accent]'),
    ).map((el) => ({
      el,
      fixed: el.dataset.cinematicAccent === 'fixed',
      top: 0,
      height: 0,
      accent: '',
    }))
    const main = document.querySelector('main')
    const accentColors = ['#eac279', '#89edc5', '#79c9f3', '#7ddfea', '#c3a4f4', '#c3a4f4']
    const heroDetails = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-detail]'))
    let previousHeroOpacity = -1
    let previousPublishedState = ''
    let previousAppliedScroll = -1
    const layers = chapters
      .flatMap((chapter) =>
        Array.from(
          chapter.querySelectorAll<HTMLElement>(
            chapter.id === 'research'
              ? ':scope > div:first-child, article'
              : ':scope > div, :scope > article, :scope > section',
          ),
        ).filter(
          (el) =>
            !el.hasAttribute('aria-hidden') &&
            !el.hasAttribute('data-depth-static') &&
            !el.classList.contains('absolute'),
        ),
      )
      .map((el) => ({
        el,
        top: 0,
        height: 0,
        inactive: false,
        discovery: Boolean(el.closest('#discovery')),
        beginning: Boolean(el.closest('#beginning')),
        entry: -1,
        exit: -1,
      }))
    const documentTop = (element: HTMLElement) => {
      let top = 0
      for (
        let node: HTMLElement | null = element;
        node;
        node = node.offsetParent as HTMLElement | null
      )
        top += node.offsetTop
      return top
    }
    let measuredHeight = 0
    let maxScroll = 1
    let stops: number[] = []
    let restStops: number[] = []
    let viewportHeight = window.innerHeight
    let lastNativeY = window.scrollY
    let lastNativeAt = performance.now()
    let nativeIntentVelocity = 0
    const state = { position: 0 }
    const measure = () => {
      viewportHeight = window.innerHeight
      stops = chapters.map((el) => el.offsetTop)
      stops[0] = 0
      restStops = chapters.map((el) => el.offsetTop + chapterOffset(el))
      restStops[0] = 0
      measuredHeight = main?.offsetHeight || 0
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      accentRegions.forEach((region) => {
        region.top = documentTop(region.el)
        region.height = region.el.offsetHeight
      })
      layers.forEach((layer) => {
        layer.top = documentTop(layer.el)
        layer.height = layer.el.offsetHeight
        layer.inactive = false
        layer.entry = -1
        layer.exit = -1
        layer.el.dataset.depthLayer = ''
      })
    }
    measure()
    const apply = () => {
      const scroll = state.position * maxScroll
      let stage = 0
      for (let i = 0; i < stops.length - 1; i++) {
        if (scroll >= stops[i]!)
          stage = i + Math.min(1, (scroll - stops[i]!) / Math.max(1, stops[i + 1]! - stops[i]!))
      }
      // Linger at the ocean surface before descending. This remap meets the
      // neighboring chapters with matching speed and retains reversible scroll.
      const oceanTime = Math.max(0, Math.min(1, stage - 2))
      const worldStage = stage - 3.2 * oceanTime ** 2 * (1 - oceanTime) ** 2
      world?.setProgress(worldStage, scroll !== previousAppliedScroll)
      previousAppliedScroll = scroll
      // The parent consumes only chapter and arrival thresholds, not continuous
      // camera coordinates. Avoid rerendering the entire homepage each tick.
      const publishedState = `${Math.min(5, Math.floor(stage + 0.28))}:${stage > 0.2}`
      if (publishedState !== previousPublishedState) {
        previousPublishedState = publishedState
        emit('progress', stage)
      }
      const index = Math.min(4, Math.floor(stage))
      const accent = gsap.utils.interpolate(
        accentColors[index]!,
        accentColors[index + 1]!,
        Math.round((stage - index) * 64) / 64,
      )
      for (const region of accentRegions) {
        if (
          !region.fixed &&
          (region.top > scroll + viewportHeight * 1.4 ||
            region.top + region.height < scroll - viewportHeight * 0.4)
        )
          continue
        if (region.accent === accent) continue
        region.accent = accent
        region.el.style.setProperty('--color-acid', accent)
      }
      const ease = (value: number) => {
        const t = Math.max(0, Math.min(1, value))
        return t * t * (3 - 2 * t)
      }
      layers.forEach((layer) => {
        if (media.matches) return
        const top = layer.top - scroll,
          bottom = top + layer.height
        const inactive = top > viewportHeight * 1.15 || bottom < -viewportHeight * 0.6
        if (inactive && layer.inactive) return
        layer.inactive = inactive
        let entry = ease(
          (viewportHeight * 0.98 - top) / (viewportHeight * (touchLayout ? 0.3 : 0.43)),
        )
        if (layer.discovery) entry *= ease((stage - 0.62) / 0.25)
        if (layer.el.hasAttribute('data-ocean-intro')) entry *= ease((stage - 2.01) / 0.12)
        let exit = ease((viewportHeight * 0.22 - bottom) / (viewportHeight * 0.5))
        if (layer.beginning) exit = Math.max(exit, ease((stage - 0.08) / 0.3))
        if (entry === layer.entry && exit === layer.exit) return
        layer.entry = entry
        layer.exit = exit
        gsap.set(layer.el, {
          opacity: entry * (1 - exit),
          z: touchLayout ? 0 : -240 * (1 - entry) + 90 * exit,
          rotationX: touchLayout ? 0 : 14 * (1 - entry) - 9 * exit,
          y: (touchLayout ? 24 : 64) * (1 - entry) - (touchLayout ? 16 : 40) * exit,
          scale: touchLayout ? 1 : 0.9 + 0.1 * entry,
          transformOrigin: '50% 50%',
          force3D: true,
        })
      })
      const heroOpacity = 1 - ease((stage - 0.08) / 0.3)
      if (!media.matches && heroOpacity !== previousHeroOpacity) {
        previousHeroOpacity = heroOpacity
        gsap.set(heroDetails, { opacity: heroOpacity })
      }
    }
    const settleTimeline = (value: number, direction: number, velocity: number) => {
      const scroll = value * maxScroll
      const communityStart = stops.at(-1)
      if (!communityStart || scroll >= communityStart - 2)
        return { destination: value, mode: 'none' as const, duration: 0 }

      // A focused control or open overlay is a stronger statement of intent
      // than the cinematic timeline. Never move it out from under the user.
      const focused = document.activeElement
      if (
        document.querySelector('[role="dialog"]') ||
        (focused instanceof HTMLElement &&
          focused !== document.body &&
          focused.matches('input, textarea, select, [contenteditable="true"]'))
      )
        return { destination: value, mode: 'none' as const, duration: 0 }

      let interval = 0
      for (let index = 0; index < stops.length - 1; index++) {
        if (scroll >= stops[index]!) interval = index
      }
      const start = stops[interval]!
      const end = stops[interval + 1]!
      const position = (scroll - start) / Math.max(1, end - start)

      if (navigatingChapter) return { destination: value, mode: 'none' as const, duration: 0 }

      const assist = getTimelineAssist({
        interval,
        position,
        direction,
        velocity,
        scroll,
        start,
        end,
        restStart: restStops[interval]!,
        restEnd: restStops[interval + 1]!,
      })
      return { ...assist, destination: assist.destination / maxScroll }
    }
    const trackNativeIntent = () => {
      const now = performance.now()
      const elapsed = now - lastNativeAt
      const distance = Math.abs(window.scrollY - lastNativeY)
      nativeIntentVelocity = updateScrollIntentVelocity(nativeIntentVelocity, distance, elapsed)
      lastNativeY = window.scrollY
      lastNativeAt = now
    }
    if (!smoothScroll && !touchLayout)
      window.addEventListener('scroll', trackNativeIntent, { passive: true })
    let smoothSettleTimer: ReturnType<typeof setTimeout> | undefined
    let smoothSettleDirection = 0
    let smoothIntentVelocity = 0
    let lastSmoothInputAt = 0
    cancelWheelSettle = () => {
      clearTimeout(smoothSettleTimer)
      smoothIntentVelocity = 0
    }
    const scheduleSmoothSettle = () => {
      if (!smoothScroll || media.matches || wheelMode !== 'smooth') return
      clearTimeout(smoothSettleTimer)
      smoothSettleTimer = setTimeout(() => {
        // Decide from Lenis' requested destination, not its still-easing visual
        // position. This lets a wheel gesture finish before choosing a frame.
        const assist = settleTimeline(
          smoothScroll.targetScroll / maxScroll,
          smoothSettleDirection,
          smoothIntentVelocity,
        )
        const destination = assist.destination * maxScroll
        if (Math.abs(destination - smoothScroll.targetScroll) < 2) {
          smoothIntentVelocity = 0
          return
        }
        smoothScroll.scrollTo(destination, {
          duration: assist.duration,
          easing: (value: number) => 1 - Math.pow(1 - value, 3),
          userData: { timelineSnap: true },
          onComplete: () => {
            smoothIntentVelocity = 0
          },
        })
      }, 180)
    }
    const removeSmoothSettle = smoothScroll?.on('virtual-scroll', ({ deltaY }) => {
      const now = performance.now()
      const elapsed = now - lastSmoothInputAt
      smoothIntentVelocity = updateScrollIntentVelocity(smoothIntentVelocity, deltaY, elapsed)
      lastSmoothInputAt = now
      smoothSettleDirection = Math.sign(deltaY)
      scheduleSmoothSettle()
    })
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: document.documentElement,
        start: 0,
        end: () => maxScroll,
        // Lenis already smooths document movement; extra scrub lag separates
        // camera/text from the visible page and makes navigation feel delayed.
        scrub: true,
        snap:
          media.matches || smoothScroll || touchLayout
            ? undefined
            : {
                snapTo: (value, trigger) =>
                  settleTimeline(value, trigger?.direction || 0, nativeIntentVelocity).destination,
                delay: 0.18,
                duration: { min: 0.36, max: 0.78 },
                ease: 'power3.out',
                inertia: false,
                directional: false,
                onComplete: () => {
                  nativeIntentVelocity = 0
                },
                onInterrupt: () => {
                  nativeIntentVelocity = 0
                },
              },
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onRefresh: () => {
          // Refresh can revert the timeline and invoke onUpdate while GSAP is
          // restoring styles. Those values were computed, not necessarily
          // applied. Recommit the DOM state once refresh has finished reverting.
          layers.forEach((layer) => {
            layer.inactive = false
            layer.entry = -1
            layer.exit = -1
          })
          previousHeroOpacity = -1
          apply()
        },
      },
    })
    timeline.fromTo(
      state,
      { position: 0 },
      { position: 1, duration: 1, ease: 'none', onUpdate: apply },
    )
    let layoutRefresh: ReturnType<typeof setTimeout> | undefined
    const resizeObserver = new ResizeObserver(() => {
      if (main && main.offsetHeight !== measuredHeight) {
        clearTimeout(layoutRefresh)
        layoutRefresh = setTimeout(() => {
          if (!disposed) ScrollTrigger.refresh()
        }, 90)
      }
    })
    if (main) resizeObserver.observe(main)
    // Only the faces that establish the narrative geometry gate measurement;
    // icon/metadata faces must not delay the renderer handoff.
    const criticalFonts = Promise.all([
      document.fonts.load('400 1em "DM Sans"'),
      document.fonts.load('500 1em "Manrope"'),
    ])
    const layoutReady = criticalFonts.then(
      () =>
        new Promise<void>((resolve) => {
          if (disposed) {
            resolve()
            return
          }
          ScrollTrigger.refresh()
          requestAnimationFrame(() => {
            if (disposed) {
              resolve()
              return
            }
            emit('ready')
            // The parent restores the hash destination while the static preview
            // is present. Synchronize the camera before its first visible frame.
            requestAnimationFrame(() => {
              if (!disposed) {
                ScrollTrigger.refresh()
                timeline.progress(Math.max(0, Math.min(1, window.scrollY / maxScroll)))
                apply()
              }
              resolve()
            })
          })
        }),
    )
    const initWorld = async () => {
      if (media.matches || disposed || world || failed.value) return
      try {
        const { createWorld } = await (worldModule || import('~/lib/scene/world'))
        await layoutReady
        await yieldToMain()
        if (disposed || media.matches || !canvas.value) return
        const constructionStarted = performance.now()
        world = createWorld(
          canvas.value,
          () => {
            failed.value = true
            ready.value = false
            world?.dispose()
            world = undefined
            emit('scene', 'fallback')
          },
          () => {
            if (disposed || media.matches) return
            if (canvas.value)
              canvas.value.dataset.firstSceneMs = (performance.now() - mountedAt).toFixed(1)
            ready.value = true
            emit('scene', 'ready')
          },
        )
        canvas.value.dataset.constructionMs = (performance.now() - constructionStarted).toFixed(1)
        apply()
      } catch {
        failed.value = true
        ready.value = false
        emit('scene', 'fallback')
      }
    }
    mediaChanged = () => {
      previousHeroOpacity = -1
      layers.forEach((layer) => {
        layer.entry = -1
        layer.exit = -1
        layer.inactive = false
      })
      if (media.matches) {
        gsap.set('[data-hero-detail]', { clearProps: 'opacity' })
        layers.forEach((layer) =>
          gsap.set(layer.el, { clearProps: 'transform,opacity,transformOrigin' }),
        )
        world?.dispose()
        world = undefined
        ready.value = false
        emit('scene', 'fallback')
      } else void initWorld()
    }
    media.addEventListener('change', mediaChanged)
    void initWorld()
    cleanup = () => {
      window.removeEventListener('matrix:navigate', navigate)
      window.removeEventListener('wheel', cancelChapterNavigation)
      window.removeEventListener('touchstart', cancelChapterNavigation)
      if (tickScroll) gsap.ticker.remove(tickScroll)
      smoothScroll?.destroy()
      removeSmoothSettle?.()
      window.removeEventListener('scroll', trackNativeIntent)
      clearTimeout(navigationRelease)
      clearTimeout(smoothSettleTimer)
      clearTimeout(layoutRefresh)
      gsap.set('[data-hero-detail]', { clearProps: 'opacity' })
      timeline.scrollTrigger?.kill()
      timeline.kill()
      resizeObserver.disconnect()
      layers.forEach((layer) =>
        gsap.set(layer.el, { clearProps: 'transform,opacity,transformOrigin' }),
      )
      accentRegions.forEach((region) => region.el.style.removeProperty('--color-acid'))
      media.removeEventListener('change', mediaChanged)
    }
  }
  idle = setTimeout(() => {
    void init().catch(() => {
      if (disposed) return
      failed.value = true
      emit('scene', 'fallback')
      const sync = () => {
        const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
        let stage = 0
        chapters.forEach((chapter, index) => {
          if (window.scrollY >= chapter.offsetTop - 1) stage = index
        })
        emit('progress', stage)
      }
      window.addEventListener('scroll', sync, { passive: true })
      cleanup = () => window.removeEventListener('scroll', sync)
      emit('ready')
      sync()
    })
  }, 100)
})

onBeforeUnmount(() => {
  disposed = true
  clearTimeout(idle)
  cleanup?.()
  world?.dispose()
})
</script>

<template>
  <canvas
    ref="canvas"
    aria-hidden="true"
    class="pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh w-full transition-opacity duration-[900ms] ease-[cubic-bezier(.22,.72,.2,1)] motion-reduce:transition-none"
    :class="ready && !failed ? 'opacity-100' : 'opacity-0'"
  />
  <aside
    v-if="profiling"
    aria-label="Performance diagnostics"
    data-lenis-prevent
    class="fixed bottom-4 left-4 z-[100] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/20 bg-black/80 px-4 py-3 text-xs text-white shadow-lg"
  >
    <p class="mb-2">After scrolling, save this report and attach it to the chat.</p>
    <div class="flex flex-wrap gap-3">
      <button
        type="button"
        class="rounded-lg border border-white/30 px-3 py-2 hover:bg-white/10 focus-visible:outline-2"
        @click="savePerformanceReport"
      >
        Save performance report
      </button>
      <button
        type="button"
        class="rounded-lg border border-white/30 px-3 py-2 hover:bg-white/10 focus-visible:outline-2"
        @click="copyPerformanceReport"
      >
        {{ reportCopied ? 'Report copied' : 'Copy report' }}
      </button>
      <button
        type="button"
        :aria-pressed="diagnosticDrawingPaused"
        class="rounded-lg border border-white/30 px-3 py-2 hover:bg-white/10 focus-visible:outline-2"
        @click="toggleDiagnosticDrawing"
      >
        {{ diagnosticDrawingPaused ? 'Resume drawing' : 'Pause drawing (diagnostic)' }}
      </button>
    </div>
  </aside>
</template>
