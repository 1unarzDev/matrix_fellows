<script setup lang="ts">
const surface = ref<HTMLElement>()
const coarsePointer = ref(false)
const touchRevealed = ref(false)
let pointerQuery: MediaQueryList | undefined
let syncPointer: (() => void) | undefined

const particles = [
  { x: '-48%', y: '-13%', size: '2px', delay: '-1.8s', duration: '5.8s', tone: 'blue' },
  { x: '-43%', y: '23%', size: '1px', delay: '-4.3s', duration: '7.1s', tone: 'blue' },
  { x: '-34%', y: '37%', size: '1.5px', delay: '-3.1s', duration: '6.4s', tone: 'gold' },
  { x: '-19%', y: '-46%', size: '2px', delay: '-0.7s', duration: '5.2s', tone: 'blue' },
  { x: '-4%', y: '-51%', size: '1px', delay: '-3.7s', duration: '6.9s', tone: 'blue' },
  { x: '14%', y: '-48%', size: '1.5px', delay: '-2.4s', duration: '6.1s', tone: 'gold' },
  { x: '33%', y: '-37%', size: '1px', delay: '-4.8s', duration: '7.4s', tone: 'blue' },
  { x: '44%', y: '-22%', size: '2px', delay: '-1.1s', duration: '5.6s', tone: 'blue' },
  { x: '50%', y: '1%', size: '1px', delay: '-3.6s', duration: '6.8s', tone: 'blue' },
  { x: '45%', y: '22%', size: '2px', delay: '-2.2s', duration: '5.9s', tone: 'gold' },
  { x: '34%', y: '37%', size: '1px', delay: '-5.1s', duration: '7.2s', tone: 'blue' },
  { x: '20%', y: '46%', size: '1.5px', delay: '-0.2s', duration: '5.4s', tone: 'blue' },
  { x: '1%', y: '51%', size: '1px', delay: '-4.2s', duration: '6.6s', tone: 'blue' },
  { x: '-17%', y: '47%', size: '1px', delay: '-1.4s', duration: '7.3s', tone: 'gold' },
  { x: '-48%', y: '7%', size: '1.5px', delay: '-0.9s', duration: '5.7s', tone: 'blue' },
  { x: '-37%', y: '-34%', size: '1px', delay: '-3.9s', duration: '6.5s', tone: 'blue' },
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
  setRevealPosition(event.clientX, event.clientY)
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
        <p
          class="discovery-reveal__eyebrow text-[10px] uppercase tracking-[.24em] text-[#b7dce3]/75"
        >
          Under the surface
        </p>
        <h3 class="discovery-reveal__heading font-display text-5xl leading-[1.02] sm:text-7xl">
          <span>Try what you</span>
          <em>don’t know.</em>
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
      <span class="discovery-reveal__wave discovery-reveal__wave--outer" />
      <span class="discovery-reveal__wave discovery-reveal__wave--inner" />
      <span
        v-for="(particle, index) in particles"
        :key="index"
        class="discovery-reveal__particle"
        :class="`is-${particle.tone}`"
        :style="`--particle-x:${particle.x};--particle-y:${particle.y};--particle-size:${particle.size};--particle-delay:${particle.delay};--particle-duration:${particle.duration}`"
      />
      <span class="discovery-reveal__lens-core" />
    </span>

    <svg aria-hidden="true" class="discovery-reveal__filters" width="0" height="0">
      <defs>
        <filter
          id="discovery-liquid-edge"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.035"
            numOctaves="2"
            seed="17"
            result="edgeNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="edgeNoise"
            scale="18"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
      </defs>
    </svg>

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
        <span class="discovery-reveal__touch-copy">
          <span class="discovery-reveal__touch-copy-beneath">Tap to look beneath</span>
          <span class="discovery-reveal__touch-copy-surface">Return to the surface</span>
        </span>
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
  --lens-size: clamp(14rem, 29vw, 25rem);
  --lens-height: calc(var(--lens-size) * 0.88);
  --reveal-radius-x: 0px;
  --reveal-radius-y: 0px;
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
  clip-path: ellipse(
    var(--reveal-radius-x) var(--reveal-radius-y) at calc(var(--reveal-x) + var(--xray-overreach))
      calc(var(--reveal-y) + var(--xray-overreach))
  );
  -webkit-mask-image: radial-gradient(
    ellipse calc(var(--lens-size) / 2) calc(var(--lens-height) / 2) at
      calc(var(--reveal-x) + var(--xray-overreach)) calc(var(--reveal-y) + var(--xray-overreach)),
    #000 0,
    #000 68%,
    rgb(0 0 0 / 0.76) 82%,
    transparent 100%
  );
  mask-image: radial-gradient(
    ellipse calc(var(--lens-size) / 2) calc(var(--lens-height) / 2) at
      calc(var(--reveal-x) + var(--xray-overreach)) calc(var(--reveal-y) + var(--xray-overreach)),
    #000 0,
    #000 68%,
    rgb(0 0 0 / 0.76) 82%,
    transparent 100%
  );
  background:
    radial-gradient(
      ellipse calc(var(--lens-size) * 0.54) calc(var(--lens-height) * 0.56) at
        calc(var(--reveal-x) + var(--xray-overreach) - 1.4rem)
        calc(var(--reveal-y) + var(--xray-overreach) - 1.8rem),
      rgb(186 213 211 / 0.12),
      transparent 66%
    ),
    radial-gradient(
      ellipse calc(var(--lens-size) * 0.42) calc(var(--lens-height) * 0.38) at
        calc(var(--reveal-x) + var(--xray-overreach) + 1.8rem)
        calc(var(--reveal-y) + var(--xray-overreach) + 2rem),
      rgb(226 190 123 / 0.1),
      transparent 72%
    ),
    radial-gradient(
      ellipse calc(var(--lens-size) / 2) calc(var(--lens-height) / 2) at
        calc(var(--reveal-x) + var(--xray-overreach)) calc(var(--reveal-y) + var(--xray-overreach)),
      rgb(27 38 36 / 0.26),
      rgb(45 52 46 / 0.16) 54%,
      rgb(53 66 58 / 0.08) 76%,
      transparent 100%
    );
  -webkit-backdrop-filter: blur(9px) saturate(76%) brightness(84%);
  backdrop-filter: blur(9px) saturate(76%) brightness(84%);
  transition: clip-path 720ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: clip-path;
}

.discovery-reveal__alternate {
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 18px rgb(23 31 29 / 0.28);
}

.discovery-reveal__heading {
  font-weight: 430;
  letter-spacing: -0.06em;
}

.discovery-reveal__heading > span,
.discovery-reveal__heading > em {
  display: block;
}

.discovery-reveal__heading > span {
  color: rgb(244 241 233 / 0.86);
}

.discovery-reveal__heading > em {
  position: relative;
  width: fit-content;
  padding-right: 0.18em;
  font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'URW Palladio L', Georgia, serif;
  font-size: 1.055em;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.045em;
  color: transparent;
  background: linear-gradient(104deg, #f0d49e 4%, #d8dcc9 54%, #add9df 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 8px 32px rgb(205 184 133 / 0.08);
}

.discovery-reveal__heading > em::after {
  position: absolute;
  top: 0.16em;
  right: 0;
  width: 0.09em;
  aspect-ratio: 1;
  border-radius: 50%;
  content: '';
  background: #b7dce3;
  box-shadow: 0 0 0.18em rgb(183 220 227 / 0.48);
}

.discovery-reveal__eyebrow {
  position: absolute;
  bottom: calc(100% + 0.7rem);
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
}

.discovery-reveal__eyebrow::before {
  width: 0.28rem;
  height: 0.28rem;
  border: 1px solid rgb(183 220 227 / 0.72);
  border-radius: 50%;
  content: '';
  box-shadow: 0 0 0.65rem rgb(183 220 227 / 0.2);
}

.discovery-reveal__lens {
  position: absolute;
  z-index: 2;
  top: var(--reveal-y);
  left: var(--reveal-x);
  width: var(--lens-size);
  height: var(--lens-height);
  border: 1px solid rgb(207 226 220 / 0.1);
  border-radius: 48% 52% 46% 54% / 52% 45% 55% 48%;
  pointer-events: none;
  opacity: 0;
  scale: 0.12;
  translate: -50% -50%;
  background:
    radial-gradient(ellipse at 33% 24%, rgb(210 228 221 / 0.07), transparent 27%),
    radial-gradient(ellipse at 68% 76%, rgb(230 196 131 / 0.045), transparent 31%),
    radial-gradient(ellipse, transparent 54%, rgb(183 214 207 / 0.035) 76%, transparent);
  box-shadow:
    0 0 0 1px rgb(229 211 170 / 0.025),
    0 0 54px rgb(147 187 183 / 0.075),
    inset 0 0 56px rgb(27 48 47 / 0.055);
  transition:
    opacity 260ms ease,
    scale 720ms cubic-bezier(0.22, 1, 0.36, 1);
}

.discovery-reveal__lens::before,
.discovery-reveal__lens::after {
  content: '';
  position: absolute;
}

.discovery-reveal__lens::before {
  inset: -0.38rem;
  border-radius: inherit;
  background: conic-gradient(
    from 28deg,
    transparent 0 9%,
    rgb(198 221 216 / 0.16) 13%,
    transparent 18% 42%,
    rgb(227 195 133 / 0.13) 47%,
    transparent 54% 75%,
    rgb(183 214 210 / 0.11) 80%,
    transparent 86% 100%
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 0);
  mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 0);
}

.discovery-reveal__lens::after {
  inset: 9% 7% 12% 11%;
  border: 1px solid rgb(223 205 166 / 0.07);
  border-radius: 53% 47% 51% 49% / 46% 55% 45% 54%;
  rotate: -7deg;
  filter: blur(0.2px);
}

.discovery-reveal__wave {
  position: absolute;
  inset: -0.45rem;
  border: 1px solid rgb(194 220 216 / 0.13);
  border-radius: 50%;
  opacity: 0;
  filter: url('#discovery-liquid-edge');
  transform-origin: 49% 51%;
  will-change: transform, border-radius, opacity;
}

.discovery-reveal__wave--outer {
  border-color: rgb(184 216 214 / 0.19);
  box-shadow:
    0 0 12px rgb(137 185 185 / 0.1),
    0 0 28px rgb(137 185 185 / 0.055),
    inset 0 0 18px rgb(211 229 221 / 0.035);
}

.discovery-reveal__wave--inner {
  inset: 0.15rem;
  border-color: rgb(232 207 155 / 0.09);
  transform-origin: 52% 48%;
}

.discovery-reveal__filters {
  position: absolute;
  overflow: hidden;
  pointer-events: none;
}

.discovery-reveal__lens-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1.45rem;
  height: 0.45rem;
  border-radius: 50%;
  translate: -50% -50%;
  rotate: -14deg;
  opacity: 0.5;
  background: radial-gradient(ellipse, rgb(220 231 218 / 0.34), transparent 72%);
  box-shadow: 0 0 16px rgb(175 207 199 / 0.12);
}

.discovery-reveal__lens-core::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--lens-size) * 0.6);
  height: calc(var(--lens-height) * 0.28);
  border-top: 1px solid rgb(204 223 215 / 0.1);
  border-radius: 50%;
  translate: -50% -50%;
  rotate: 19deg;
  filter: blur(0.3px);
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
  background: rgb(205 226 220 / 0.68);
  box-shadow:
    0 0 7px rgb(157 197 190 / 0.28),
    0 0 14px rgb(157 197 190 / 0.11);
  pointer-events: none;
}

.discovery-reveal__particle.is-gold {
  background: rgb(232 205 153 / 0.58);
  box-shadow:
    0 0 7px rgb(222 190 128 / 0.24),
    0 0 13px rgb(222 190 128 / 0.09);
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
  transition:
    color 360ms ease,
    transform 540ms cubic-bezier(0.22, 0.72, 0.2, 1);
}

.discovery-reveal__touch-copy {
  display: grid;
  min-width: 8.95rem;
  align-items: center;
  text-align: left;
}

.discovery-reveal__touch-copy > span {
  grid-area: 1 / 1;
  white-space: nowrap;
  transition:
    opacity 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
    transform 520ms cubic-bezier(0.22, 0.72, 0.2, 1);
}

.discovery-reveal__touch-copy-beneath {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.discovery-reveal__touch-copy-surface {
  opacity: 0;
  transform: translate3d(0, 0.35rem, 0);
}

.is-touch-revealed .discovery-reveal__touch-copy-beneath {
  opacity: 0;
  transform: translate3d(0, -0.3rem, 0);
}

.is-touch-revealed .discovery-reveal__touch-copy-surface {
  opacity: 1;
  transform: translate3d(0, 0, 0);
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
    --reveal-radius-x: calc(var(--lens-size) / 2);
    --reveal-radius-y: calc(var(--lens-height) / 2);
  }

  .discovery-reveal:hover .discovery-reveal__original,
  .discovery-reveal:focus-visible .discovery-reveal__original {
    opacity: 0;
  }

  .discovery-reveal:hover .discovery-reveal__lens,
  .discovery-reveal:focus-visible .discovery-reveal__lens {
    opacity: 0.64;
    scale: 1;
    animation: discovery-lens-morph 9s ease-in-out infinite alternate;
  }

  .discovery-reveal:hover .discovery-reveal__particle,
  .discovery-reveal:focus-visible .discovery-reveal__particle {
    animation: discovery-particle-drift var(--particle-duration) ease-in-out var(--particle-delay)
      infinite alternate;
  }

  .discovery-reveal:hover .discovery-reveal__wave--outer,
  .discovery-reveal:focus-visible .discovery-reveal__wave--outer {
    animation: discovery-edge-flow-a 7.8s ease-in-out -2.1s infinite alternate;
  }

  .discovery-reveal:hover .discovery-reveal__wave--inner,
  .discovery-reveal:focus-visible .discovery-reveal__wave--inner {
    animation: discovery-edge-flow-b 10.6s ease-in-out -6.4s infinite alternate;
  }
}

@media (hover: none), (pointer: coarse) {
  .discovery-reveal {
    --lens-size: 6.5rem;
    --lens-height: 6.5rem;
    min-height: 28.5rem;
    padding-bottom: 7.5rem;
  }

  .discovery-reveal__xray {
    inset: 0;
    overflow: visible;
    padding: 0;
    clip-path: circle(0 at var(--reveal-x) var(--reveal-y));
    -webkit-mask-image: none;
    mask-image: none;
    background: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    transition: clip-path 760ms cubic-bezier(0.22, 0.65, 0.28, 1);
    will-change: auto;
  }

  .discovery-reveal__original {
    transform: translate3d(0, 0, 0);
    transition:
      opacity 520ms cubic-bezier(0.4, 0, 0.2, 1),
      transform 650ms cubic-bezier(0.22, 0.72, 0.2, 1);
    transition-delay: 120ms;
  }

  .discovery-reveal__alternate {
    opacity: 0;
    transform: translate3d(0, 0.5rem, 0);
    transition:
      opacity 480ms cubic-bezier(0.4, 0, 0.2, 1),
      transform 680ms cubic-bezier(0.22, 0.72, 0.2, 1);
  }

  .discovery-reveal.is-touch-revealed .discovery-reveal__xray {
    clip-path: circle(150vmax at var(--reveal-x) var(--reveal-y));
  }

  .discovery-reveal.is-touch-revealed .discovery-reveal__original {
    opacity: 0;
    transform: translate3d(0, -0.25rem, 0);
    transition-delay: 0ms;
  }

  .discovery-reveal.is-touch-revealed .discovery-reveal__alternate {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    transition-delay: 140ms;
  }

  .discovery-reveal.is-touch-revealed .discovery-reveal__lens {
    animation: discovery-touch-origin 760ms cubic-bezier(0.22, 0.65, 0.28, 1) both;
  }

  .discovery-reveal__particle,
  .discovery-reveal__wave,
  .discovery-reveal__lens-core {
    display: none;
  }

  .discovery-reveal__touch-prompt {
    bottom: 4.75rem;
  }

  .discovery-reveal.is-touch-revealed .discovery-reveal__touch-prompt {
    color: rgb(230 239 239 / 0.66);
    transform: translate3d(0, -1px, 0);
  }
}

@keyframes discovery-touch-origin {
  0% {
    opacity: 0;
    scale: 0.15;
  }
  32% {
    opacity: 0.34;
  }
  100% {
    opacity: 0;
    scale: 1.55;
  }
}

@keyframes discovery-particle-drift {
  0% {
    opacity: 0.12;
    transform: translate3d(0, 3px, 0) scale(0.72);
  }
  55% {
    opacity: 0.82;
  }
  100% {
    opacity: 0.2;
    transform: translate3d(3px, -5px, 0) scale(1.08);
  }
}

@keyframes discovery-lens-morph {
  0% {
    border-radius: 48% 52% 46% 54% / 52% 45% 55% 48%;
  }
  52% {
    border-radius: 53% 47% 51% 49% / 47% 54% 46% 53%;
  }
  100% {
    border-radius: 46% 54% 52% 48% / 55% 48% 52% 45%;
  }
}

@keyframes discovery-edge-flow-a {
  0% {
    border-radius: 46% 54% 48% 52% / 52% 47% 53% 48%;
    opacity: 0.2;
    transform: rotate(-1.5deg) scale(0.99, 1.012);
  }
  29% {
    border-radius: 53% 47% 55% 45% / 46% 56% 44% 54%;
    opacity: 0.62;
    transform: rotate(0.8deg) scale(1.018, 0.994);
  }
  67% {
    border-radius: 49% 51% 44% 56% / 57% 45% 55% 43%;
    opacity: 0.38;
    transform: rotate(2deg) scale(0.996, 1.02);
  }
  100% {
    border-radius: 55% 45% 51% 49% / 48% 53% 47% 52%;
    opacity: 0.56;
    transform: rotate(-0.5deg) scale(1.014, 0.986);
  }
}

@keyframes discovery-edge-flow-b {
  0% {
    border-radius: 54% 46% 51% 49% / 47% 56% 44% 53%;
    opacity: 0.1;
    transform: rotate(2deg) scale(1.012, 0.988);
  }
  38% {
    border-radius: 47% 53% 44% 56% / 55% 46% 54% 45%;
    opacity: 0.4;
    transform: rotate(-1deg) scale(0.992, 1.018);
  }
  73% {
    border-radius: 51% 49% 57% 43% / 44% 54% 46% 56%;
    opacity: 0.18;
    transform: rotate(-2.3deg) scale(1.016, 1.002);
  }
  100% {
    border-radius: 45% 55% 49% 51% / 53% 43% 57% 47%;
    opacity: 0.46;
    transform: rotate(0.4deg) scale(0.984, 1.012);
  }
}

@media (prefers-reduced-motion: reduce) {
  .discovery-reveal__xray,
  .discovery-reveal__original,
  .discovery-reveal__lens,
  .discovery-reveal__touch-icon,
  .discovery-reveal__touch-prompt,
  .discovery-reveal__touch-copy > span,
  .discovery-reveal__alternate {
    transition: none;
  }

  .discovery-reveal__particle {
    display: none;
  }

  .discovery-reveal__wave {
    display: none;
  }

  .discovery-reveal__lens {
    animation: none !important;
  }
}
</style>
