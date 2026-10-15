<script setup lang="ts">
defineProps<{
  src: string
  alt: string
  caption: string
}>()
</script>

<template>
  <figure
    class="guide-screenshot my-8 overflow-hidden rounded-2xl border border-paper/12 bg-paper/[.025] shadow-[inset_0_1px_0_rgb(255_255_255_/_4%),0_16px_42px_rgb(0_0_0_/_8%)]"
  >
    <img
      :src="src"
      :alt="alt"
      loading="lazy"
      decoding="async"
      class="block h-auto w-full"
    />
    <figcaption class="border-t border-paper/10 px-4 py-3 text-xs leading-5 text-paper/45 sm:px-5">
      {{ caption }}
    </figcaption>
  </figure>
</template>
