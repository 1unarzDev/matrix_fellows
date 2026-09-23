<script setup lang="ts">
const pageTransition = {
  name: 'matrix-page',
  mode: 'out-in' as const,
}
</script>

<template>
  <RouteVeil />
  <NuxtPage :transition="pageTransition" />
</template>

<style>
.matrix-page-enter-active {
  transition:
    opacity 300ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.matrix-page-leave-active {
  transition:
    opacity 180ms ease-in,
    transform 180ms ease-in;
}

.matrix-page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.matrix-page-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

@media (prefers-reduced-motion: reduce) {
  .matrix-page-enter-active,
  .matrix-page-leave-active {
    transition: none;
  }

  .matrix-page-enter-from,
  .matrix-page-leave-to {
    transform: none;
  }
}
</style>
