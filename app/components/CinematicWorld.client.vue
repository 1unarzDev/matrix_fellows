<script setup lang="ts">
import type { World } from '~/lib/scene/world'

const emit = defineEmits<{
  progress: [value: number]
  ready: []
  scene: [value: 'ready' | 'fallback']
}>()
const canvas = ref<HTMLCanvasElement>()
const failed = ref(false)
const ready = ref(false)
let world: World | undefined
let cleanup: (() => void) | undefined
let disposed = false
let idle: ReturnType<typeof setTimeout>
let media: MediaQueryList
let mediaChanged: () => void
const mountedAt = typeof performance === 'undefined' ? 0 : performance.now()

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
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (media.matches) emit('scene', 'fallback')
  const init = async () => {
    const touchLayout = window.matchMedia('(pointer: coarse)').matches
    // Fetch the world while the animation libraries initialize. Construction
    // still waits for stable layout, but its large module no longer sits behind
    // font/layout work on the critical path.
    const worldModule = media.matches ? undefined : import('~/lib/scene/world')
    const [{ gsap }, { ScrollTrigger }, lenisModule] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      touchLayout ? Promise.resolve(undefined) : import('lenis'),
    ])
    if (canvas.value) canvas.value.dataset.importMs = (performance.now() - mountedAt).toFixed(1)
    await yieldToMain()
    if (disposed) return
    gsap.registerPlugin(ScrollTrigger)
    ScrollTrigger.config({ ignoreMobileResize: true })
    // One clock and one smoothed scroll position for both the DOM and camera.
    // Touch keeps its native inertia; nested menus/dialogs keep their own scroll.
    const smoothScroll = lenisModule
      ? new lenisModule.default({
          autoRaf: false,
          duration: 0.7,
          wheelMultiplier: 0.7,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          syncTouch: false,
          allowNestedScroll: true,
          prevent: (node: HTMLElement) =>
            Boolean(node.closest('[role="dialog"], [role="listbox"]')),
        })
      : undefined
    const tickScroll = smoothScroll
      ? (seconds: number) => smoothScroll.raf(seconds * 1000)
      : undefined
    if (smoothScroll && tickScroll) {
      smoothScroll.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(tickScroll)
    }
    let navigatingChapter = false
    let navigationRelease: ReturnType<typeof setTimeout> | undefined
    const chapterOffset = (target: HTMLElement) =>
      target.id === 'research' && !media.matches
        ? Math.max(
            0,
            (document.getElementById('frontiers')!.offsetTop - target.offsetTop) * 0.13,
          )
        : 0
    const navigate = (event: Event) => {
      const target = (event as CustomEvent<HTMLElement>).detail
      if (!target?.isConnected) return
      event.preventDefault()
      navigatingChapter = true
      clearTimeout(navigationRelease)
      const offset = chapterOffset(target)
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
    const main = document.querySelector('main')
    const accentColors = ['#eac279', '#89edc5', '#79c9f3', '#7ddfea', '#c3a4f4', '#c3a4f4']
    const layers = chapters
      .flatMap((chapter) =>
        Array.from(
          chapter.querySelectorAll<HTMLElement>(
            chapter.id === 'research'
              ? ':scope > div:first-child, article'
              : ':scope > div, :scope > article, :scope > section',
          ),
        ).filter((el) => !el.hasAttribute('aria-hidden') && !el.classList.contains('absolute')),
      )
      .map((el) => ({
        el,
        top: 0,
        height: 0,
        inactive: false,
        discovery: Boolean(el.closest('#discovery')),
        beginning: Boolean(el.closest('#beginning')),
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
    let nativeStrongIntent = false
    const state = { position: 0 }
    const measure = () => {
      viewportHeight = window.innerHeight
      stops = chapters.map((el) => el.offsetTop)
      stops[0] = 0
      restStops = chapters.map((el) => el.offsetTop + chapterOffset(el))
      restStops[0] = 0
      measuredHeight = main?.offsetHeight || 0
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      layers.forEach((layer) => {
        layer.top = documentTop(layer.el)
        layer.height = layer.el.offsetHeight
        layer.inactive = false
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
      world?.setProgress(worldStage)
      emit('progress', stage)
      const index = Math.min(4, Math.floor(stage))
      document.documentElement.style.setProperty(
        '--color-acid',
        gsap.utils.interpolate(accentColors[index]!, accentColors[index + 1]!, stage - index),
      )
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
      if (!media.matches)
        gsap.set('[data-hero-detail]', { opacity: 1 - ease((stage - 0.08) / 0.3) })
    }
    const settleTimeline = (value: number, direction: number, strongIntent: boolean) => {
      const scroll = value * maxScroll
      const communityStart = stops.at(-1)
      if (!communityStart || scroll >= communityStart - 2) return value

      // A focused control or open overlay is a stronger statement of intent
      // than the cinematic timeline. Never move it out from under the user.
      const focused = document.activeElement
      if (
        document.querySelector('[role="dialog"]') ||
        (focused instanceof HTMLElement &&
          focused !== document.body &&
          focused.matches('input, textarea, select, [contenteditable="true"]'))
      )
        return value

      let interval = 0
      for (let index = 0; index < stops.length - 1; index++) {
        if (scroll >= stops[index]!) interval = index
      }
      const start = stops[interval]!
      const end = stops[interval + 1]!
      const position = (scroll - start) / Math.max(1, end - start)

      // Only assist in compact, direction-aware transition windows. Near a
      // settled frame native scrolling wins, so small gestures never feel
      // magnetized. Research has a later downward window for its long project
      // list, while reverse travel catches the visible return from the depths.
      const inTransition =
        direction > 0
          ? interval === 2
            ? position >= 0.68 && position <= 0.86
            : position >= 0.46 && position <= 0.68
          : interval === 2
            ? position >= 0.32 && position <= 0.58
            : position >= 0.32 && position <= 0.58
      if (navigatingChapter || !strongIntent || direction === 0 || !inTransition) return value

      // Continue the gesture the user already made instead of choosing the
      // mathematically nearest frame and potentially reversing their intent.
      return (direction > 0 ? restStops[interval + 1]! : restStops[interval]!) / maxScroll
    }
    const trackNativeIntent = () => {
      const now = performance.now()
      const elapsed = now - lastNativeAt
      const distance = Math.abs(window.scrollY - lastNativeY)
      if (elapsed > 240) nativeStrongIntent = false
      if (distance >= 120 || (elapsed > 0 && (distance / elapsed) * 1000 >= 650))
        nativeStrongIntent = true
      lastNativeY = window.scrollY
      lastNativeAt = now
    }
    if (!smoothScroll) window.addEventListener('scroll', trackNativeIntent, { passive: true })
    let smoothSettleTimer: ReturnType<typeof setTimeout> | undefined
    let smoothSettleDirection = 0
    let smoothStrongIntent = false
    let lastSmoothInputAt = 0
    const scheduleSmoothSettle = () => {
      if (!smoothScroll || media.matches) return
      clearTimeout(smoothSettleTimer)
      smoothSettleTimer = setTimeout(() => {
        // Decide from Lenis' requested destination, not its still-easing visual
        // position. This lets a wheel gesture finish before choosing a frame.
        const destination =
          settleTimeline(
            smoothScroll.targetScroll / maxScroll,
            smoothSettleDirection,
            smoothStrongIntent,
          ) * maxScroll
        if (Math.abs(destination - smoothScroll.targetScroll) < 2) return
        smoothScroll.scrollTo(destination, {
          duration: 0.48,
          easing: (value: number) => 1 - Math.pow(1 - value, 3),
          userData: { timelineSnap: true },
          onComplete: () => {
            smoothStrongIntent = false
          },
        })
      }, 180)
    }
    const removeSmoothSettle = smoothScroll?.on('virtual-scroll', ({ deltaY }) => {
      const now = performance.now()
      const elapsed = now - lastSmoothInputAt
      if (elapsed > 240) smoothStrongIntent = false
      if (Math.abs(deltaY) >= 45 || (elapsed > 0 && (Math.abs(deltaY) / elapsed) * 1000 >= 750))
        smoothStrongIntent = true
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
        snap: media.matches || smoothScroll
          ? undefined
          : {
              snapTo: (value, trigger) =>
                settleTimeline(value, trigger?.direction || 0, nativeStrongIntent),
              delay: 0.18,
              duration: { min: 0.28, max: 0.65 },
              ease: 'power3.out',
              inertia: false,
              directional: false,
              onComplete: () => {
                nativeStrongIntent = false
              },
              onInterrupt: () => {
                nativeStrongIntent = false
              },
            },
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onRefresh: apply,
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
      document.documentElement.style.removeProperty('--color-acid')
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
    class="pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh w-full transition-opacity duration-300 ease-out motion-reduce:transition-none sm:h-dvh"
    :class="ready && !failed ? 'opacity-100' : 'opacity-0'"
  />
</template>
