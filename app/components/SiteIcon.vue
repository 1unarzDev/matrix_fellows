<script setup lang="ts">
defineProps<{
  name?: 'atom' | 'arrow' | 'right' | 'down' | 'plus' | 'close' | 'search' | 'globe' | 'spark' | 'compass'
  size?: number
}>()
</script>

<template>
  <svg
    :width="size || 20"
    :height="size || 20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <g v-if="name === 'atom'">
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </g>
    <g v-else-if="name === 'compass'">
      <circle cx="12" cy="12" r="9" stroke-dasharray="2 4" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </g>
    <g v-else-if="name === 'down'"><path d="M12 4v16m-6-6 6 6 6-6" /></g>
    <g v-else-if="name === 'right'"><path d="M4 12h16m-6-6 6 6-6 6" /></g>
    <g v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14" /></g>
    <g v-else-if="name === 'close'"><path d="m6 6 12 12M6 18 18 6" /></g>
    <g v-else-if="name === 'search'">
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5 5" />
    </g>
    <g v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </g>
    <g v-else-if="name === 'spark'">
      <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z" />
    </g>
    <g v-else><path d="M5 19 19 5M5 5h14v14" /></g>
  </svg>
</template>
