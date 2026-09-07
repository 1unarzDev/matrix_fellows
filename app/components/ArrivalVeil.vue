<script setup lang="ts">
const props = defineProps<{ status: 'pending' | 'ready' | 'fallback'; progress: number }>()
const canvas = ref<HTMLCanvasElement>()
const finished = ref(false)
const painted = ref(false)
let cleanup = () => {}
onMounted(() => {
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  if (media.matches) {
    finished.value = true
    return
  }
  const el = canvas.value!
  const ctx = el.getContext('2d')
  if (!ctx) {
    finished.value = true
    return
  }
  let width = innerWidth,
    height = innerHeight,
    frame = 0,
    last = 0
  let release: number | undefined
  const destinations = ['beginning', 'discovery', 'research', 'frontiers', 'connection', 'community']
  const destination = destinations.indexOf(location.hash.slice(1))
  const arrivalStage = destination > 0 ? destination : props.progress
  let seed = 1743
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const grains = Array.from({ length: innerWidth < 600 ? 320 : 650 }, () => ({
    x: random(),
    y: random(),
    depth: random(),
    phase: random() * 6.28,
  }))
  const resize = () => {
    width = innerWidth
    height = innerHeight
    // Deliberately soft, low-resolution atmosphere; no high-DPR allocation.
    el.width = Math.ceil(width * 0.75)
    el.height = Math.ceil(height * 0.75)
    ctx.setTransform(0.75, 0, 0, 0.75, 0, 0)
  }
  resize()
  const end = () => {
    cleanup()
    finished.value = true
  }
  const draw = (now: number) => {
    if (media.matches) {
      end()
      return
    }
    frame = requestAnimationFrame(draw)
    if (now - last < 1000 / 30) return
    last = now
    if (props.status !== 'pending' && release === undefined)
      release = now
    const t = release === undefined ? 0 : Math.max(0, Math.min(1, (now - release) / 1800))
    const clear = t * t * (3 - 2 * t)
    const coverage = 1 - clear
    if (t === 1) {
      end()
      return
    }
    ctx.clearRect(0, 0, width, height)
    const ocean = arrivalStage >= 1 && arrivalStage < 3.5
    const cosmic = arrivalStage >= 3.5
    const color = cosmic ? '117,103,157' : ocean ? '92,132,140' : '185,137,83'
    const shade = cosmic ? '27,24,39' : ocean ? '22,34,39' : '55,43,32'
    // Cover the complete composition, including DOM text, before dispersing.
    ctx.fillStyle = `rgba(${shade},${coverage})`
    ctx.fillRect(0, 0, width, height)
    // A continuous veil hides the render handoff, then breaks into drifting dust.
    const haze = ctx.createLinearGradient(0, height, width, 0)
    haze.addColorStop(0, `rgba(${color},${0.32 * coverage})`)
    haze.addColorStop(0.55, `rgba(${color},${0.12 * coverage})`)
    haze.addColorStop(1, `rgba(${color},${0.25 * coverage})`)
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, width, height)
    for (const grain of grains) {
      const drift = now * 0.000018 * (0.4 + grain.depth) + clear * (0.2 + grain.depth * 0.5)
      const x = (((grain.x + drift) % 1.2) - 0.1) * width
      const y =
        (grain.y + Math.sin(now * 0.00035 + grain.phase) * 0.022 - clear * 0.15 * grain.depth) *
        height
      ctx.fillStyle = `rgba(${color},${(0.12 + grain.depth * 0.32) * coverage})`
      ctx.beginPath()
      ctx.ellipse(x, y, 1 + grain.depth * 2.5, 0.7 + grain.depth, -0.3, 0, Math.PI * 2)
      ctx.fill()
    }
    painted.value = true
  }
  frame = requestAnimationFrame(draw)
  window.addEventListener('resize', resize)
  media.addEventListener('change', end)
  cleanup = () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
    media.removeEventListener('change', end)
  }
})
onBeforeUnmount(() => cleanup())
</script>

<template>
  <div
    v-if="!finished"
    data-arrival-shell
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-[90] hidden animate-arrival-safety in-[.has-js]:block motion-reduce:hidden!"
    :class="painted ? 'bg-transparent' : 'bg-[#292825]'"
  >
  <canvas
    ref="canvas"
    data-arrival-veil
    aria-hidden="true"
    class="h-full w-full"
  />
  </div>
</template>
