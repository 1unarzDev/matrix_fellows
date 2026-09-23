<script setup lang="ts">
defineProps<{ href?: string; target?: string }>()
</script>

<template>
  <a
    :href="href"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    class="font-medium text-acid underline decoration-acid/35 underline-offset-4 hover:decoration-acid"
    ><slot
  /></a>
</template>
