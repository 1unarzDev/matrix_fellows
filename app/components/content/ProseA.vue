<script setup lang="ts">
defineProps<{ href?: string; target?: string }>()
</script>

<template>
  <a
    :href="href"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    class="inline font-medium text-acid underline decoration-acid/35 underline-offset-4 transition-[color,text-decoration-color,text-shadow] duration-300 hover:text-[#f4d69e] hover:decoration-acid hover:[text-shadow:0_0_14px_color-mix(in_srgb,var(--color-acid)_22%,transparent)] focus-visible:rounded-sm"
    ><slot
  /></a>
</template>
