<script setup lang="ts">
const surface = ref<HTMLElement>()

function positionReveal(event: PointerEvent) {
  if (!surface.value || event.pointerType === 'touch') return
  const bounds = surface.value.getBoundingClientRect()
  surface.value.style.setProperty('--reveal-x', `${event.clientX - bounds.left}px`)
  surface.value.style.setProperty('--reveal-y', `${event.clientY - bounds.top}px`)
}
</script>

<template>
  <div
    ref="surface"
    data-discovery-reveal
    tabindex="0"
    class="discovery-reveal relative max-w-xl rounded-[2rem] outline-none focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-acid/55"
    @pointerenter="positionReveal"
    @pointermove="positionReveal"
  >
    <div class="discovery-reveal__original">
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

    <div aria-hidden="true" class="discovery-reveal__bloom absolute inset-[-1rem] sm:inset-[-1.5rem]" />

    <div aria-hidden="true" class="discovery-reveal__alternate absolute inset-0">
      <p class="mb-4 text-[10px] uppercase tracking-[.24em] text-acid/75">A field note</p>
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

    <span aria-hidden="true" class="discovery-reveal__point" />
    <p class="sr-only">
      Trying something new is part of research: unfamiliar methods and imperfect first attempts
      reveal what matters, what fails, and what to investigate next.
    </p>
  </div>
</template>

<style scoped>
.discovery-reveal {
  --reveal-x: 38%;
  --reveal-y: 42%;
  isolation: isolate;
}

.discovery-reveal__original {
  transition:
    opacity 180ms ease,
    transform 620ms cubic-bezier(0.22, 1, 0.36, 1);
}

.discovery-reveal__bloom {
  z-index: -1;
  pointer-events: none;
  clip-path: circle(0 at var(--reveal-x) var(--reveal-y));
  border: 1px solid rgb(230 193 115 / 0.13);
  border-radius: 2.25rem;
  background:
    radial-gradient(
      circle at var(--reveal-x) var(--reveal-y),
      rgb(232 194 112 / 0.12),
      transparent 34%
    ),
    linear-gradient(125deg, rgb(18 41 35 / 0.86), rgb(23 31 30 / 0.7) 62%, rgb(46 36 27 / 0.52));
  box-shadow:
    0 20px 60px rgb(3 13 12 / 0.16),
    inset 0 1px rgb(255 255 255 / 0.035);
  transition: clip-path 720ms cubic-bezier(0.22, 1, 0.36, 1);
}

.discovery-reveal__alternate {
  pointer-events: none;
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 260ms ease,
    transform 680ms cubic-bezier(0.22, 1, 0.36, 1);
}

.discovery-reveal__point {
  position: absolute;
  z-index: 2;
  left: var(--reveal-x);
  top: var(--reveal-y);
  width: 5px;
  height: 5px;
  border-radius: 999px;
  pointer-events: none;
  opacity: 0;
  scale: 0;
  translate: -50% -50%;
  background: #f0c875;
  box-shadow: 0 0 0 1px rgb(240 200 117 / 0.28), 0 0 18px rgb(240 200 117 / 0.72);
  transition:
    opacity 180ms ease,
    scale 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

@media (hover: hover) and (pointer: fine) {
  .discovery-reveal:hover .discovery-reveal__original,
  .discovery-reveal:focus-visible .discovery-reveal__original {
    opacity: 0;
    transform: translateY(-4px);
  }

  .discovery-reveal:hover .discovery-reveal__bloom,
  .discovery-reveal:focus-visible .discovery-reveal__bloom {
    clip-path: circle(150% at var(--reveal-x) var(--reveal-y));
  }

  .discovery-reveal:hover .discovery-reveal__alternate,
  .discovery-reveal:focus-visible .discovery-reveal__alternate {
    opacity: 1;
    transform: translateY(0);
    transition-delay: 150ms;
  }

  .discovery-reveal:hover .discovery-reveal__point,
  .discovery-reveal:focus-visible .discovery-reveal__point {
    opacity: 1;
    scale: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .discovery-reveal__original,
  .discovery-reveal__bloom,
  .discovery-reveal__alternate,
  .discovery-reveal__point {
    transition: none;
  }
}
</style>
