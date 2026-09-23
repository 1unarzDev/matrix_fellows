<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <h2
    :id="id"
    class="relative mb-6 mt-16 scroll-mt-8 border-t border-paper/12 pt-9 font-display text-3xl leading-tight tracking-[-.045em] text-paper sm:mt-20 sm:text-4xl"
  >
    <span
      aria-hidden="true"
      class="absolute -top-px left-0 h-px w-14 bg-linear-to-r from-acid/80 to-transparent shadow-[0_0_12px_color-mix(in_srgb,var(--color-acid)_28%,transparent)]"
    />
    <slot />
  </h2>
</template>
