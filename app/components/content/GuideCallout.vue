<script setup lang="ts">
const props = withDefaults(defineProps<{ title: string; tone?: 'action' | 'warning' | 'note' }>(), {
  tone: 'note',
})
const treatment = computed(() =>
  props.tone === 'warning'
    ? 'border-amber-200/25 bg-amber-200/[.045]'
    : props.tone === 'action'
      ? 'border-acid/30 bg-acid/[.045]'
      : 'border-[#aab9e6]/20 bg-[#8fa4d8]/[.04]',
)
</script>

<template>
  <aside class="my-8 rounded-2xl border p-5 sm:p-6" :class="treatment">
    <p class="text-[10px] uppercase tracking-[.18em] text-paper/42">{{ title }}</p>
    <div class="mt-3 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"><slot /></div>
  </aside>
</template>
