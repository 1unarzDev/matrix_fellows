<script setup lang="ts">
withDefaults(
  defineProps<{
    theme?: 'astronomy' | 'biology' | 'mechanics'
  }>(),
  { theme: 'astronomy' },
)
</script>

<template>
  <div class="science-accent" :class="`science-accent--${theme}`" aria-hidden="true">
    <svg v-if="theme === 'astronomy'" viewBox="0 0 720 390" fill="none">
      <g class="science-accent__primary astronomy-orbits">
        <ellipse cx="400" cy="194" rx="222" ry="72" />
        <ellipse cx="400" cy="194" rx="158" ry="158" transform="rotate(-31 400 194)" />
        <path d="M114 300c98-42 142-118 185-197" />
      </g>
      <g class="science-accent__secondary astronomy-guides">
        <ellipse cx="400" cy="194" rx="278" ry="104" />
        <path d="m106 103 50 29 61-48 64 32" />
        <path d="m156 132 20 62 41-110" />
      </g>
      <g class="science-accent__nodes">
        <circle cx="400" cy="194" r="17" />
        <circle class="science-accent__node--violet" cx="211" cy="155" r="5" />
        <circle cx="541" cy="91" r="4" />
        <circle class="science-accent__node--violet" cx="156" cy="132" r="3.5" />
        <circle cx="217" cy="84" r="2.5" />
        <circle cx="281" cy="116" r="2" />
      </g>
      <g class="science-accent__labels">
        <text x="421" y="190">M</text>
        <text x="548" y="87">v</text>
        <text x="91" y="280">trajectory</text>
      </g>
    </svg>

    <svg v-else-if="theme === 'biology'" viewBox="0 0 720 390" fill="none">
      <g class="science-accent__primary biology-helix">
        <path d="M176 50c190 0 190 290 380 290" />
        <path d="M556 50c-190 0-190 290-380 290" />
      </g>
      <g class="science-accent__secondary biology-backbone">
        <path d="M176 50c-39 63-25 115 42 158 91 59 119 76 338 132" />
        <path d="M556 50c39 63 25 115-42 158-91 59-119 76-338 132" />
      </g>
      <g class="science-accent__rungs">
        <path
          d="m211 67 310 0M251 96h230M285 126h162M303 157h126M307 194h118M291 229h150M261 263h210M220 299h292M181 331h370"
        />
      </g>
      <g class="science-accent__nodes">
        <circle cx="211" cy="67" r="4" />
        <circle class="science-accent__node--violet" cx="481" cy="96" r="4" />
        <circle cx="303" cy="157" r="3" />
        <circle class="science-accent__node--violet" cx="441" cy="229" r="3.5" />
        <circle cx="220" cy="299" r="3" />
        <circle class="science-accent__node--violet" cx="551" cy="331" r="4" />
      </g>
      <g class="science-accent__labels">
        <text x="527" y="63">5′</text>
        <text x="557" y="346">3′</text>
        <text x="323" y="184">A · T</text>
        <text x="326" y="219">G · C</text>
      </g>
    </svg>

    <svg v-else viewBox="0 0 720 390" fill="none">
      <g class="science-accent__primary mechanics-wheel">
        <circle cx="425" cy="194" r="105" />
        <circle cx="425" cy="194" r="49" />
        <path
          d="M425 89v-34m0 278v-34M320 194h-35m280 0h-35M351 120l-24-24m196 196-24-24m0-148 24-24M327 292l24-24"
        />
      </g>
      <g class="science-accent__secondary mechanics-linkage">
        <path d="m124 286 126-92 175 0 113-96" />
        <path d="M124 286h414M250 194v92m175-92v92" />
        <path d="m124 286 16-2-7-14m405-172-15 3 8 12" />
      </g>
      <g class="science-accent__nodes">
        <circle cx="124" cy="286" r="5" />
        <circle class="science-accent__node--violet" cx="250" cy="194" r="6" />
        <circle cx="425" cy="194" r="8" />
        <circle class="science-accent__node--violet" cx="538" cy="98" r="5" />
      </g>
      <g class="science-accent__labels">
        <text x="438" y="187">ω</text>
        <text x="104" y="312">F</text>
        <text x="244" y="181">θ</text>
        <text x="471" y="325">τ = r × F</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.science-accent {
  position: fixed;
  z-index: 0;
  top: 4.5rem;
  right: -3rem;
  width: min(48rem, 68vw);
  pointer-events: none;
  opacity: 0.2;
  filter: drop-shadow(0 0 12px color-mix(in srgb, #e0b768 16%, transparent));
  animation: science-accent-drift 30s ease-in-out infinite alternate;
}
:global(html.guide-scroll) {
  scroll-behavior: smooth;
  scroll-padding-top: 2rem;
}
.science-accent svg {
  display: block;
  width: 100%;
  height: auto;
}
.science-accent__primary,
.science-accent__secondary,
.science-accent__rungs {
  stroke-linecap: round;
  stroke-linejoin: round;
}
.science-accent__primary {
  stroke: color-mix(in srgb, #e0b768 72%, transparent);
  stroke-width: 0.75;
}
.science-accent__secondary {
  stroke: color-mix(in srgb, #b9a4ef 52%, transparent);
  stroke-width: 0.55;
  stroke-dasharray: 2 6;
}
.science-accent__rungs {
  stroke: color-mix(in srgb, #e0b768 43%, transparent);
  stroke-width: 0.6;
  stroke-dasharray: 2 5;
}
.science-accent__nodes circle {
  fill: #e0b768;
}
.science-accent__nodes .science-accent__node--violet {
  fill: #b9a4ef;
}
.science-accent__labels {
  fill: color-mix(in srgb, var(--color-paper) 52%, transparent);
  font-family: var(--font-sans);
  font-size: 10px;
  letter-spacing: 0.08em;
}
.astronomy-orbits ellipse:last-of-type {
  transform-box: fill-box;
  transform-origin: center;
}
.biology-backbone {
  opacity: 0.55;
}
.mechanics-wheel circle:first-child {
  stroke-dasharray: 2 5;
}
.science-accent--mechanics {
  top: 32rem;
  right: auto;
  left: -5rem;
  width: min(42rem, 55vw);
  opacity: 0.14;
}
@keyframes science-accent-drift {
  from {
    transform: translate3d(0, 0, 0) rotate(-0.35deg);
  }
  to {
    transform: translate3d(-10px, 7px, 0) rotate(0.35deg);
  }
}
@media (max-width: 639px) {
  .science-accent {
    top: 4.75rem;
    right: -16rem;
    width: 39rem;
    opacity: 0.14;
  }
  .science-accent--biology {
    right: -14rem;
  }
  .science-accent--mechanics {
    top: 31rem;
    right: auto;
    left: -17rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  :global(html.guide-scroll) {
    scroll-behavior: auto;
  }
  .science-accent {
    animation: none;
  }
}
</style>
