<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <h3 :id="id" class="mb-3 mt-9 scroll-mt-8 font-display text-xl tracking-[-.025em] text-paper">
    <slot />
  </h3>
</template>
