<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    tone?: 'warm' | 'cool'
  }>(),
  { label: '', tone: 'warm' },
)
</script>

<template>
  <div
    data-loading-orbit
    class="inline-flex flex-col items-center gap-3"
    :class="tone === 'cool' ? 'text-[#c5c0eb]' : 'text-[#f0cc8b]'"
  >
    <div class="orbital-loader relative grid h-16 w-16 place-items-center">
      <span class="absolute inset-0 rounded-full bg-current/[.035] shadow-[0_0_38px_currentColor]" />
      <span class="orbital-loader__ellipse absolute inset-[7px] rounded-[50%] border border-current/25" />
      <span class="orbital-loader__track absolute inset-[5px] rounded-full border border-current/15">
        <span
          class="absolute left-1/2 top-[-2px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current shadow-[0_0_12px_currentColor]"
        />
      </span>
      <MatrixMark :size="25" class="relative text-paper/85" />
    </div>
    <p
      v-if="label"
      class="text-[9px] font-medium uppercase tracking-[.22em] text-paper/55"
    >
      {{ label }}
    </p>
  </div>
</template>

<style scoped>
.orbital-loader__ellipse {
  transform: rotate(-31deg) scaleY(0.46);
}

.orbital-loader__track {
  animation: matrix-orbit 2.8s linear infinite;
  will-change: transform;
}

@keyframes matrix-orbit {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .orbital-loader__track {
    animation: none;
    transform: rotate(38deg);
  }
}
</style>
