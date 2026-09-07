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

onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (media.matches) emit('scene', 'fallback')
  const init = async () => {
    const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('lenis'),
    ])
    if (disposed) return
    gsap.registerPlugin(ScrollTrigger)
    // One clock and one smoothed scroll position for both the DOM and camera.
    // Touch keeps its native inertia; nested menus/dialogs keep their own scroll.
    const smoothScroll = new Lenis({
      autoRaf: false,
      duration: 0.7,
      wheelMultiplier: 0.7,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      syncTouch: false,
      allowNestedScroll: true,
      prevent: (node: HTMLElement) => Boolean(node.closest('[role="dialog"], [role="listbox"]')),
    })
    const tickScroll = (seconds: number) => smoothScroll.raf(seconds * 1000)
    smoothScroll.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(tickScroll)
    const navigate = (event: Event) => {
      const target = (event as CustomEvent<HTMLElement>).detail
      if (!target?.isConnected) return
      event.preventDefault()
      smoothScroll.scrollTo(target, {
        duration: 1.4,
        offset:
          target.id === 'research' && !media.matches
            ? Math.max(
                0,
                (document.getElementById('frontiers')!.offsetTop - target.offsetTop) * 0.13,
              )
            : 0,
        onComplete: () => target.focus({ preventScroll: true }),
      })
    }
    window.addEventListener('matrix:navigate', navigate)
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
      .map((el) => ({ el, top: 0, height: 0 }))
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
    const state = { position: 0 }
    const measure = () => {
      stops = chapters.map((el) => el.offsetTop)
      stops[0] = 0
      measuredHeight = main?.offsetHeight || 0
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      layers.forEach((layer) => {
        layer.top = documentTop(layer.el)
        layer.height = layer.el.offsetHeight
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
        let entry = ease((window.innerHeight * 0.98 - top) / (window.innerHeight * 0.43))
        if (layer.el.closest('#discovery')) entry *= ease((stage - 0.62) / 0.25)
        if (layer.el.hasAttribute('data-ocean-intro')) entry *= ease((stage - 2.01) / 0.12)
        let exit = ease((window.innerHeight * 0.22 - bottom) / (window.innerHeight * 0.5))
        if (layer.el.closest('#beginning')) exit = Math.max(exit, ease((stage - 0.08) / 0.3))
        gsap.set(layer.el, {
          opacity: entry * (1 - exit),
          z: -240 * (1 - entry) + 90 * exit,
          rotationX: 14 * (1 - entry) - 9 * exit,
          y: 64 * (1 - entry) - 40 * exit,
          scale: 0.9 + 0.1 * entry,
          transformOrigin: '50% 50%',
          force3D: true,
        })
      })
      if (!media.matches)
        gsap.set('[data-hero-detail]', { opacity: 1 - ease((stage - 0.08) / 0.3) })
    }
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: document.documentElement,
        start: 0,
        end: () => maxScroll,
        // Lenis already smooths document movement; extra scrub lag separates
        // camera/text from the visible page and makes navigation feel delayed.
        scrub: true,
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
    const layoutReady = document.fonts.ready.then(() => new Promise<void>((resolve) => {
      if (disposed) { resolve(); return }
      ScrollTrigger.refresh()
      requestAnimationFrame(() => {
        if (disposed) { resolve(); return }
        emit('ready')
        // The parent restores the hash destination while the veil is covering
        // the page. Synchronize the camera before its first visible frame.
        requestAnimationFrame(() => {
          if (!disposed) {
            ScrollTrigger.refresh()
            timeline.progress(Math.max(0, Math.min(1, window.scrollY/maxScroll)))
            apply()
          }
          resolve()
        })
      })
    }))
    const initWorld = async () => {
      if (media.matches || disposed || world || failed.value) return
      try {
        const { createWorld } = await import('~/lib/scene/world')
        await layoutReady
        if (disposed || media.matches || !canvas.value) return
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
            ready.value = true
            emit('scene', 'ready')
          },
        )
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
      gsap.ticker.remove(tickScroll)
      smoothScroll.destroy()
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
    class="pointer-events-none fixed inset-0 z-0 h-dvh w-full transition-opacity duration-[1800ms] ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none"
    :class="ready && !failed ? 'opacity-100' : 'opacity-0'"
  />
</template>
