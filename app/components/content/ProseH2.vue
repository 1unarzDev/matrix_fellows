<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <h2
    :id="id"
    class="relative mb-6 mt-16 scroll-mt-8 pt-3 font-display text-3xl leading-tight tracking-[-.045em] text-paper sm:mt-20 sm:text-4xl"
  >
    <span
      aria-hidden="true"
      class="absolute left-0 top-0 h-1 w-8 rounded-full bg-linear-to-r from-acid/80 to-[#c4a1ef]/55 shadow-[0_0_14px_color-mix(in_srgb,var(--color-acid)_22%,transparent)]"
    />
    <slot />
  </h2>
</template>
