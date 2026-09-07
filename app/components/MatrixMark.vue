<script setup lang="ts">
withDefaults(defineProps<{ size?: number; loading?: boolean }>(), { size: 40, loading: false })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    class="shrink-0 overflow-visible"
  >
    <path
      d="M9 28C23 15 45 7 54 13"
      pathLength="1"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      class="opacity-45 [stroke-dasharray:.78_.22] [stroke-dashoffset:.1] transition-[stroke-dashoffset,opacity] duration-1200 ease-[cubic-bezier(.4,0,.2,1)] group-hover:[stroke-dashoffset:1.1] group-hover:opacity-80 group-focus-visible:[stroke-dashoffset:1.1] motion-reduce:transition-none motion-reduce:[stroke-dashoffset:.1]!"
    />
    <path
      d="M17 46V22L32 37L47 22V46"
      stroke="currentColor"
      stroke-width="4.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M17 46V22L32 37L47 22V46"
      pathLength="1"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-acid [stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(.4,0,.2,1)] group-hover:[stroke-dashoffset:0] group-focus-visible:[stroke-dashoffset:0] motion-reduce:transition-none"
    />
    <path
      d="M57 24C49 39 22 58 9 51C5 49 5 45 8 41"
      pathLength="1"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      class="opacity-75 [stroke-dasharray:.9_.1] [stroke-dashoffset:0] transition-[stroke-dashoffset,opacity] duration-1200 ease-[cubic-bezier(.4,0,.2,1)] group-hover:[stroke-dashoffset:-1] group-hover:opacity-100 group-focus-visible:[stroke-dashoffset:-1] motion-reduce:transition-none motion-reduce:[stroke-dashoffset:0]!"
    />
    <circle cx="56" cy="17" r="2.2" fill="currentColor" class="text-acid" />
    <path
      v-if="loading"
      data-loading-orbit
      d="M9 28C23 15 45 7 54 13C67 23 24 60 9 51C5 49 5 45 8 41"
      pathLength="1"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      class="text-acid [stroke-dasharray:.12_.88] motion-safe:animate-orbit-trace motion-reduce:hidden"
    />
    <path
      d="M56 10V7M62 17H65"
      pathLength="1"
      stroke="currentColor"
      stroke-width="1.2"
      stroke-linecap="round"
      class="text-acid opacity-0 [stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset,opacity] duration-1000 ease-out group-hover:opacity-70 group-hover:[stroke-dashoffset:0] group-focus-visible:opacity-70 group-focus-visible:[stroke-dashoffset:0] motion-reduce:transition-none"
    />
  </svg>
</template>
