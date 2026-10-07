<script setup lang="ts">
// Deterministic stars keep hydration stable. SVG stays sharp at every display density.
const stars = Array.from({ length: 74 }, (_, i) => ({
  x: (i * 137.508 + 19) % 1000,
  y: (i * 93.731 + 37) % 700,
  r: i % 9 === 0 ? 1.1 : 0.55,
  opacity: 0.14 + (i % 5) * 0.055,
}))
const paused = ref(false)
const visibility = () => {
  paused.value = document.hidden
}
onMounted(() => {
  visibility()
  document.addEventListener('visibilitychange', visibility)
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', visibility))
</script>

<template>
  <div class="access-cosmos" :class="{ 'is-paused': paused }" aria-hidden="true">
    <svg class="cosmos-stars" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice">
      <circle
        v-for="(star, i) in stars"
        :key="i"
        :cx="star.x"
        :cy="star.y"
        :r="star.r"
        fill="#e9e3f3"
        :opacity="star.opacity"
      />
    </svg>
    <div class="gravity-field">
      <svg class="gravity-scene" viewBox="0 0 1000 650" fill="none">
        <defs>
          <linearGradient
            id="access-disk"
            x1="100"
            y1="330"
            x2="900"
            y2="330"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#ad92d3" stop-opacity="0" />
            <stop offset=".22" stop-color="#c8a671" stop-opacity=".3" />
            <stop offset=".5" stop-color="#f2dcab" stop-opacity=".8" />
            <stop offset=".78" stop-color="#bd9add" stop-opacity=".4" />
            <stop offset="1" stop-color="#9b85c7" stop-opacity="0" />
          </linearGradient>
          <radialGradient id="access-corona">
            <stop offset=".47" stop-color="#07090f" />
            <stop offset=".5" stop-color="#07090f" />
            <stop offset=".52" stop-color="#e6c58f" stop-opacity=".5" />
            <stop offset=".59" stop-color="#b78fd4" stop-opacity=".08" />
            <stop offset="1" stop-color="#b78fd4" stop-opacity="0" />
          </radialGradient>
          <filter id="access-bloom" x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id="access-soft"><feGaussianBlur stdDeviation="1.2" /></filter>
        </defs>
        <g class="accretion-flow">
          <ellipse
            cx="500"
            cy="337"
            rx="398"
            ry="58"
            stroke="url(#access-disk)"
            stroke-width="14"
            filter="url(#access-bloom)"
          />
          <ellipse
            v-for="i in 12"
            :key="i"
            cx="500"
            cy="337"
            :rx="225 + i * 14"
            :ry="24 + i * 2.8"
            stroke="url(#access-disk)"
            :opacity="0.12 + (12 - i) * 0.018"
            :stroke-width="i % 3 === 0 ? 2 : 0.8"
          />
        </g>
        <ellipse
          class="disk-current"
          cx="500"
          cy="337"
          rx="315"
          ry="40"
          stroke="url(#access-disk)"
          stroke-width="1.4"
          stroke-dasharray="24 160 58 110"
          opacity=".26"
        />
        <circle cx="500" cy="325" r="204" fill="url(#access-corona)" />
        <!-- Lensed upper and lower disk arcs curve around the shadow. -->
        <g opacity=".45">
          <path
            v-for="i in 9"
            :key="i"
            d="M126 337C310 334 366 329 379 280C395 215 435 195 500 195C565 195 605 215 621 280C634 329 704 334 874 337"
            :transform="`translate(0 ${i * 1.7})`"
            stroke="url(#access-disk)"
            :stroke-width="i % 3 === 0 ? 1.7 : 0.7"
            :opacity="1 - i * 0.075"
          />
        </g>
        <path
          d="M126 337C310 334 366 329 379 280C395 215 435 195 500 195C565 195 605 215 621 280C634 329 704 334 874 337"
          stroke="url(#access-disk)"
          stroke-width="10"
          opacity=".35"
          filter="url(#access-bloom)"
        />
        <path
          d="M126 337C310 334 366 329 379 280C395 215 435 195 500 195C565 195 605 215 621 280C634 329 704 334 874 337"
          stroke="url(#access-disk)"
          stroke-width="2"
          opacity=".6"
          filter="url(#access-soft)"
        />
        <path
          d="M300 344C396 347 414 435 500 440C589 443 606 348 700 344"
          stroke="url(#access-disk)"
          stroke-width="3"
          opacity=".22"
          filter="url(#access-soft)"
        />
        <ellipse
          cx="500"
          cy="350"
          rx="364"
          ry="5"
          fill="url(#access-disk)"
          opacity=".38"
          filter="url(#access-soft)"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.access-cosmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  background: radial-gradient(ellipse at 78% 44%, #39294030, transparent 55%), #090c12;
}
.cosmos-stars {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.gravity-field {
  position: absolute;
  width: min(1050px, 90vw);
  right: -14%;
  top: 50%;
  transform: translateY(-50%) rotate(-13deg);
  opacity: 0.8;
}
.gravity-scene {
  width: 100%;
  overflow: visible;
  animation: gravity-drift 26s ease-in-out infinite alternate;
}
.accretion-flow {
  transform-origin: 500px 337px;
  animation: disk-breathe 12s ease-in-out infinite alternate;
}
@keyframes gravity-drift {
  from {
    transform: translateY(-5px) rotate(-1deg);
  }
  to {
    transform: translateY(5px) rotate(1deg);
  }
}
@keyframes disk-breathe {
  from {
    opacity: 0.7;
    transform: scaleX(0.985);
  }
  to {
    opacity: 1;
    transform: scaleX(1.015);
  }
}
@media (max-width: 700px) {
  .gravity-field {
    width: 950px;
    right: auto;
    left: 50%;
    top: 35%;
    transform: translate(-50%, -50%) rotate(-18deg);
    opacity: 0.48;
  }
}
@media (prefers-reduced-motion: reduce) {
  .gravity-scene,
  .accretion-flow {
    animation: none;
  }
}
.is-paused .gravity-scene,
.is-paused .accretion-flow,
.is-paused .disk-current {
  animation-play-state: paused;
}
.disk-current {
  animation: accretion-current 16s ease-in-out infinite alternate;
}
@keyframes accretion-current {
  from {
    opacity: 0.12;
  }
  to {
    opacity: 0.26;
  }
}
@media (prefers-reduced-motion: reduce) {
  .disk-current {
    animation: none;
  }
}
</style>
