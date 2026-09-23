<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <h3
    :id="id"
    class="relative mb-4 mt-10 scroll-mt-8 pl-4 font-display text-xl leading-snug tracking-[-.025em] text-paper sm:text-2xl"
  >
    <span
      aria-hidden="true"
      class="absolute left-0 top-[.58em] h-1.5 w-1.5 rounded-full bg-acid/80 shadow-[0_0_10px_color-mix(in_srgb,var(--color-acid)_30%,transparent)]"
    />
    <slot />
  </h3>
</template>
