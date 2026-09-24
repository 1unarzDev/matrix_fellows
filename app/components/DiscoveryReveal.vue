<script setup lang="ts">
const surface = ref<HTMLElement>()
const coarsePointer = ref(false)
const touchRevealed = ref(false)
let pointerQuery: MediaQueryList | undefined
let syncPointer: (() => void) | undefined

const particles = [
  { x: '-47%', y: '-16%', size: '2px', delay: '-1.8s', duration: '5.8s', tone: 'blue' },
  { x: '-38%', y: '31%', size: '1.5px', delay: '-3.1s', duration: '6.4s', tone: 'gold' },
  { x: '-18%', y: '-47%', size: '2px', delay: '-0.7s', duration: '5.2s', tone: 'blue' },
  { x: '12%', y: '-49%', size: '1.5px', delay: '-2.4s', duration: '6.1s', tone: 'gold' },
  { x: '39%', y: '-30%', size: '2px', delay: '-1.1s', duration: '5.6s', tone: 'blue' },
  { x: '49%', y: '-5%', size: '1px', delay: '-3.6s', duration: '6.8s', tone: 'blue' },
  { x: '43%', y: '24%', size: '2px', delay: '-2.2s', duration: '5.9s', tone: 'gold' },
  { x: '22%', y: '44%', size: '1.5px', delay: '-0.2s', duration: '5.4s', tone: 'blue' },
  { x: '-6%', y: '50%', size: '1px', delay: '-4.2s', duration: '6.6s', tone: 'blue' },
  { x: '-31%', y: '39%', size: '2px', delay: '-2.8s', duration: '6.2s', tone: 'gold' },
  { x: '-50%', y: '8%', size: '1.5px', delay: '-0.9s', duration: '5.7s', tone: 'blue' },
  { x: '31%', y: '38%', size: '1px', delay: '-3.9s', duration: '6.5s', tone: 'blue' },
]

function setRevealPosition(clientX: number, clientY: number) {
  if (!surface.value) return
  const bounds = surface.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(bounds.width, clientX - bounds.left))
  const y = Math.max(0, Math.min(bounds.height, clientY - bounds.top))
  surface.value.style.setProperty('--reveal-x', `${x}px`)
  surface.value.style.setProperty('--reveal-y', `${y}px`)
}

function positionReveal(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  setRevealPosition(event.clientX, event.clientY)
}

function positionTouchReveal(event: PointerEvent) {
  if (!coarsePointer.value || touchRevealed.value || !surface.value) return
  const bounds = surface.value.getBoundingClientRect()
  const x = Math.max(
    bounds.width * 0.35,
    Math.min(bounds.width * 0.65, event.clientX - bounds.left),
  )
  const y = Math.max(
    bounds.height * 0.32,
    Math.min(bounds.height * 0.52, event.clientY - bounds.top),
  )
  surface.value.style.setProperty('--reveal-x', `${x}px`)
  surface.value.style.setProperty('--reveal-y', `${y}px`)
}

function toggleTouchReveal() {
  if (!coarsePointer.value) return
  touchRevealed.value = !touchRevealed.value
}

onMounted(() => {
  pointerQuery = window.matchMedia('(hover: none), (pointer: coarse)')
  syncPointer = () => {
    coarsePointer.value = Boolean(pointerQuery?.matches)
    if (!coarsePointer.value) touchRevealed.value = false
  }
  syncPointer()
  pointerQuery.addEventListener('change', syncPointer)
})

onBeforeUnmount(() => {
  if (syncPointer) pointerQuery?.removeEventListener('change', syncPointer)
})
</script>

<template>
  <div
    ref="surface"
    data-discovery-reveal
    :data-touch-revealed="touchRevealed || undefined"
    :class="{ 'is-touch-revealed': touchRevealed }"
    :tabindex="coarsePointer ? -1 : 0"
    class="discovery-reveal relative w-full max-w-2xl outline-none focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-acid/55"
    @pointerenter="positionReveal"
    @pointermove="positionReveal"
    @pointerdown="positionTouchReveal"
  >
    <div class="discovery-reveal__original max-w-xl">
      <h2
        id="discovery-title"
        class="font-display text-5xl font-medium leading-[1.08] tracking-[-.055em] sm:text-7xl"
      >
        Curiosity finds<br />a way.
      </h2>
      <p class="mt-8 max-w-md text-base leading-relaxed text-paper/75">
        A question can feel like a vast, empty landscape. Then something shifts. A conversation. An
        observation. A possibility you hadn’t seen before.
      </p>
      <p class="mt-5 max-w-md text-base leading-relaxed text-paper/75">
        Matrix Fellows is a student-founded research society at Martin High School, built around
        that moment. We bring curious people together to turn a first idea into meaningful inquiry.
      </p>
    </div>

    <div aria-hidden="true" class="discovery-reveal__xray absolute inset-0">
      <div class="discovery-reveal__alternate max-w-xl">
        <p class="mb-4 text-[10px] uppercase tracking-[.24em] text-[#b7dce3]/75">
          Under the surface
        </p>
        <h3
          class="font-display text-5xl font-medium leading-[1.08] tracking-[-.055em] text-[#f1d59d] sm:text-7xl"
        >
          Try what you<br />don’t know.
        </h3>
        <p class="mt-8 max-w-md text-base leading-relaxed text-paper/90">
          Unfamiliar methods, awkward questions, and imperfect first attempts are not detours from
          research.
        </p>
        <p class="mt-5 max-w-md text-base leading-relaxed text-paper/90">
          They reveal what matters, what breaks, and what is worth investigating next.
        </p>
      </div>
    </div>

    <span aria-hidden="true" class="discovery-reveal__lens">
      <span
        v-for="(particle, index) in particles"
        :key="index"
        class="discovery-reveal__particle"
        :class="`is-${particle.tone}`"
        :style="`--particle-x:${particle.x};--particle-y:${particle.y};--particle-size:${particle.size};--particle-delay:${particle.delay};--particle-duration:${particle.duration}`"
      />
      <span class="discovery-reveal__lens-core" />
    </span>

    <button
      v-show="coarsePointer"
      type="button"
      class="discovery-reveal__touch-target"
      :aria-pressed="touchRevealed"
      :aria-label="
        touchRevealed
          ? 'Return to the original discovery note'
          : 'Reveal a field note beneath the discovery'
      "
      @click="toggleTouchReveal"
    >
      <span class="discovery-reveal__touch-prompt" aria-hidden="true">
        <span class="discovery-reveal__touch-icon">
          <span />
        </span>
        {{ touchRevealed ? 'Return to the surface' : 'Tap to look beneath' }}
      </span>
    </button>

    <p class="sr-only">
      Trying something new is part of research: unfamiliar methods and imperfect first attempts
      reveal what matters, what fails, and what to investigate next.
    </p>
  </div>
</template>

<style scoped>
.discovery-reveal {
  --reveal-x: min(15rem, 42%);
  --reveal-y: 42%;
  --lens-size: clamp(13rem, 25vw, 22rem);
  --reveal-radius: 0px;
  --xray-overreach: calc(var(--lens-size) / 2 + 1rem);
  isolation: isolate;
}

.discovery-reveal__original {
  position: relative;
  z-index: 0;
  transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.discovery-reveal__xray {
  z-index: 1;
  inset: calc(var(--xray-overreach) * -1);
  overflow: visible;
  pointer-events: none;
  padding: var(--xray-overreach);
  clip-path: circle(
    var(--reveal-radius) at calc(var(--reveal-x) + var(--xray-overreach))
      calc(var(--reveal-y) + var(--xray-overreach))
  );
  -webkit-mask-image: radial-gradient(
    circle calc(var(--lens-size) / 2) at calc(var(--reveal-x) + var(--xray-overreach))
      calc(var(--reveal-y) + var(--xray-overreach)),
    #000 0,
    #000 calc(100% - 1rem),
    transparent 100%
  );
  mask-image: radial-gradient(
    circle calc(var(--lens-size) / 2) at calc(var(--reveal-x) + var(--xray-overreach))
      calc(var(--reveal-y) + var(--xray-overreach)),
    #000 0,
    #000 calc(100% - 1rem),
    transparent 100%
  );
  background:
    radial-gradient(
      circle var(--lens-size) at calc(var(--reveal-x) + var(--xray-overreach))
        calc(var(--reveal-y) + var(--xray-overreach)),
      rgb(105 158 171 / 0.16),
      rgb(36 82 93 / 0.08) 52%,
      transparent 72%
    ),
    rgb(16 46 54 / 0.82);
  transition: clip-path 620ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: clip-path;
}

.discovery-reveal__alternate {
  position: relative;
  z-index: 1;
}

.discovery-reveal__lens {
  position: absolute;
  z-index: 2;
  top: var(--reveal-y);
  left: var(--reveal-x);
  width: var(--lens-size);
  height: var(--lens-size);
  border: 1px solid rgb(165 205 213 / 0.16);
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  scale: 0.12;
  translate: -50% -50%;
  background:
    radial-gradient(circle at 38% 32%, rgb(177 218 226 / 0.085), transparent 25%),
    radial-gradient(circle, transparent 55%, rgb(151 199 209 / 0.055) 76%, transparent);
  box-shadow:
    0 0 0 1px rgb(183 220 226 / 0.045),
    0 0 42px rgb(116 172 185 / 0.12),
    inset 0 0 48px rgb(8 34 42 / 0.1);
  transition:
    opacity 180ms ease,
    scale 620ms cubic-bezier(0.22, 1, 0.36, 1);
}

.discovery-reveal__lens::before,
.discovery-reveal__lens::after {
  content: '';
  position: absolute;
  background: rgb(236 198 120 / 0.38);
}

.discovery-reveal__lens::before {
  top: 50%;
  right: -0.22rem;
  left: -0.22rem;
  height: 1px;
  mask-image: linear-gradient(
    90deg,
    #000 0 0.45rem,
    transparent 0.45rem calc(100% - 0.45rem),
    #000 0
  );
}

.discovery-reveal__lens::after {
  top: -0.22rem;
  bottom: -0.22rem;
  left: 50%;
  width: 1px;
  mask-image: linear-gradient(#000 0 0.45rem, transparent 0.45rem calc(100% - 0.45rem), #000 0);
}

.discovery-reveal__lens-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.3rem;
  height: 0.3rem;
  border: 1px solid rgb(182 218 224 / 0.48);
  border-radius: 50%;
  translate: -50% -50%;
  box-shadow: 0 0 12px rgb(151 201 211 / 0.24);
}

.discovery-reveal__lens-core::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--lens-size) + 2.5rem);
  height: calc(var(--lens-size) + 2.5rem);
  border-radius: 50%;
  translate: -50% -50%;
  background: radial-gradient(
    circle,
    transparent 59%,
    rgb(127 183 195 / 0.045) 65%,
    rgb(108 164 178 / 0.075) 70%,
    transparent 78%
  );
  filter: blur(7px);
}

.discovery-reveal__particle {
  position: absolute;
  z-index: 2;
  top: calc(50% + var(--particle-y));
  left: calc(50% + var(--particle-x));
  width: var(--particle-size);
  height: var(--particle-size);
  border-radius: 50%;
  opacity: 0;
  background: rgb(178 219 226 / 0.82);
  box-shadow: 0 0 8px rgb(127 190 203 / 0.3);
  pointer-events: none;
}

.discovery-reveal__particle.is-gold {
  background: rgb(235 204 143 / 0.72);
  box-shadow: 0 0 7px rgb(234 198 120 / 0.24);
}

.discovery-reveal__touch-target {
  position: absolute;
  z-index: 4;
  inset: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  touch-action: pan-y;
}

.discovery-reveal__touch-target:focus-visible {
  outline: 1px solid rgb(234 198 120 / 0.55);
  outline-offset: 0.5rem;
}

.discovery-reveal__touch-prompt {
  position: absolute;
  right: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.58);
}

.discovery-reveal__touch-icon {
  position: relative;
  display: grid;
  width: 1.65rem;
  height: 1.65rem;
  place-items: center;
  border: 1px solid rgb(234 198 120 / 0.26);
  border-radius: 50%;
  transition:
    rotate 620ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 300ms ease;
}

.discovery-reveal__touch-icon::before,
.discovery-reveal__touch-icon::after,
.discovery-reveal__touch-icon span {
  content: '';
  position: absolute;
  width: 0.42rem;
  height: 1px;
  background: rgb(183 220 227 / 0.7);
}

.discovery-reveal__touch-icon::after {
  rotate: 90deg;
}

.is-touch-revealed .discovery-reveal__touch-icon {
  rotate: 45deg;
  border-color: rgb(183 220 227 / 0.38);
}

@media (hover: hover) and (pointer: fine) {
  .discovery-reveal:hover,
  .discovery-reveal:focus-visible {
    --reveal-radius: calc(var(--lens-size) / 2);
  }

  .discovery-reveal:hover .discovery-reveal__lens,
  .discovery-reveal:focus-visible .discovery-reveal__lens {
    opacity: 0.82;
    scale: 1;
  }

  .discovery-reveal:hover .discovery-reveal__particle,
  .discovery-reveal:focus-visible .discovery-reveal__particle {
    animation: discovery-particle-drift var(--particle-duration) ease-in-out var(--particle-delay)
      infinite alternate;
  }
}

@media (hover: none), (pointer: coarse) {
  .discovery-reveal {
    --lens-size: min(112vw, 28rem);
    min-height: 28.5rem;
    padding-bottom: 7.5rem;
  }

  .discovery-reveal.is-touch-revealed {
    --reveal-radius: calc(var(--lens-size) / 2);
  }

  .discovery-reveal.is-touch-revealed .discovery-reveal__original {
    opacity: 0.16;
  }

  .discovery-reveal.is-touch-revealed .discovery-reveal__lens {
    opacity: 0.72;
    scale: 1;
  }

  .discovery-reveal.is-touch-revealed .discovery-reveal__particle {
    animation: discovery-particle-drift var(--particle-duration) ease-in-out var(--particle-delay)
      infinite alternate;
  }

  .discovery-reveal__touch-prompt {
    bottom: 4.75rem;
  }
}

@keyframes discovery-particle-drift {
  0% {
    opacity: 0.12;
    transform: translate3d(0, 3px, 0) scale(0.72);
  }
  55% {
    opacity: 0.68;
  }
  100% {
    opacity: 0.2;
    transform: translate3d(3px, -5px, 0) scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .discovery-reveal__xray,
  .discovery-reveal__original,
  .discovery-reveal__lens,
  .discovery-reveal__touch-icon {
    transition: none;
  }

  .discovery-reveal__particle {
    display: none;
  }
}
</style>
