<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <h3
    :id="id"
    class="mb-4 mt-10 scroll-mt-8 font-display text-xl leading-snug tracking-[-.025em] text-paper sm:text-2xl"
  >
    <slot />
  </h3>
</template>
