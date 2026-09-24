<script setup lang="ts">
useHead({ htmlAttrs: { class: 'guide-scroll' } })
</script>

<template>
  <div class="guide-atmosphere" aria-hidden="true">
    <svg viewBox="0 0 760 520" fill="none">
      <ellipse
        class="guide-atmosphere__orbit guide-atmosphere__orbit--wide"
        cx="408"
        cy="236"
        rx="318"
        ry="126"
      />
      <ellipse class="guide-atmosphere__orbit" cx="408" cy="236" rx="238" ry="86" />
      <path
        class="guide-atmosphere__path"
        d="M102 345c88-112 179-62 251-151 77-95 177-114 307-35"
      />
      <circle
        class="guide-atmosphere__node guide-atmosphere__node--violet"
        cx="157"
        cy="292"
        r="4"
      />
      <circle class="guide-atmosphere__node" cx="353" cy="194" r="5" />
      <circle
        class="guide-atmosphere__node guide-atmosphere__node--copper"
        cx="540"
        cy="126"
        r="3.5"
      />
      <circle class="guide-atmosphere__node" cx="649" cy="157" r="2.5" />
      <circle class="guide-atmosphere__core" cx="408" cy="236" r="19" />
      <circle class="guide-atmosphere__core-ring" cx="408" cy="236" r="31" />
    </svg>
  </div>
</template>

<style scoped>
:global(html.guide-scroll) {
  scroll-behavior: smooth;
  scroll-padding-top: 2rem;
}
.guide-atmosphere {
  position: fixed;
  z-index: 0;
  top: 4rem;
  right: -5rem;
  width: min(50rem, 63vw);
  pointer-events: none;
  color: var(--color-acid);
  opacity: 0.24;
  filter: drop-shadow(0 0 14px color-mix(in srgb, var(--color-acid) 14%, transparent));
  animation: guide-atmosphere-drift 28s ease-in-out infinite alternate;
}
.guide-atmosphere svg {
  display: block;
  width: 100%;
  height: auto;
}
.guide-atmosphere__orbit {
  stroke: color-mix(in srgb, var(--color-acid) 60%, transparent);
  stroke-width: 0.7;
  stroke-dasharray: 2 9;
  transform: rotate(-13deg);
  transform-origin: 408px 236px;
}
.guide-atmosphere__orbit--wide {
  stroke: color-mix(in srgb, #b9a4ef 55%, transparent);
  stroke-dasharray: 1 12;
}
.guide-atmosphere__path {
  stroke: color-mix(in srgb, #e0b768 62%, transparent);
  stroke-width: 0.8;
}
.guide-atmosphere__node {
  fill: var(--color-acid);
}
.guide-atmosphere__node--violet {
  fill: #b9a4ef;
}
.guide-atmosphere__node--copper {
  fill: #e0b768;
}
.guide-atmosphere__core {
  fill: color-mix(in srgb, var(--color-acid) 8%, transparent);
  stroke: color-mix(in srgb, var(--color-acid) 62%, transparent);
  stroke-width: 0.8;
}
.guide-atmosphere__core-ring {
  stroke: color-mix(in srgb, #b9a4ef 35%, transparent);
  stroke-width: 0.7;
}
@keyframes guide-atmosphere-drift {
  from {
    opacity: 0.18;
    transform: translate3d(0, 0, 0) rotate(-1deg);
  }
  to {
    opacity: 0.27;
    transform: translate3d(-12px, 8px, 0) rotate(1deg);
  }
}
@media (max-width: 639px) {
  .guide-atmosphere {
    top: 4.25rem;
    right: -16rem;
    width: 39rem;
    opacity: 0.14;
  }
}
@media (prefers-reduced-motion: reduce) {
  :global(html.guide-scroll) {
    scroll-behavior: auto;
  }
  .guide-atmosphere {
    animation: none;
  }
}
</style>
