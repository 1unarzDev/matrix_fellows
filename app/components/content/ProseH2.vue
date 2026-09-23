<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <h2
    :id="id"
    class="mb-5 mt-14 scroll-mt-8 font-display text-3xl tracking-[-.045em] text-paper sm:text-4xl"
  >
    <slot />
  </h2>
</template>
