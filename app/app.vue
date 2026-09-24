<script setup lang="ts">
const route = useRoute()
const showCatalogHeader = computed(
  () => route.path.startsWith('/opportunities') || route.path.startsWith('/guides'),
)
const pageTransition = {
  name: 'matrix-page',
  mode: 'out-in' as const,
}
</script>

<template>
  <RouteVeil />
  <Transition name="catalog-header">
    <CatalogHeader v-if="showCatalogHeader" />
  </Transition>
  <NuxtPage :transition="pageTransition" />
</template>

<style>
.catalog-header-enter-active,
.catalog-header-leave-active {
  transition: opacity 180ms ease;
}

.catalog-header-enter-from,
.catalog-header-leave-to {
  opacity: 0;
}

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
  .matrix-page-leave-active,
  .catalog-header-enter-active,
  .catalog-header-leave-active {
    transition: none;
  }

  .matrix-page-enter-from,
  .matrix-page-leave-to {
    transform: none;
  }
}
</style>
