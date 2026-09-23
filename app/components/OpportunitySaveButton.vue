<script setup lang="ts">
const props = defineProps<{ id: string; compact?: boolean }>()
const { ready, available, toggle, isSaved } = useSavedOpportunities()
const saved = computed(() => isSaved(props.id))
</script>

<template>
  <button
    type="button"
    :disabled="!ready || !available"
    :aria-pressed="saved"
    :title="available ? 'Saved only in this browser' : 'Browser storage is unavailable'"
    class="tactile inline-flex min-h-11 items-center gap-2 rounded-full border border-paper/15 px-4 text-xs text-paper/65 hover:border-acid/40 hover:text-acid disabled:opacity-45"
    @click="toggle(id)"
  >
    <span aria-hidden="true">{{ saved ? '◆' : '◇' }}</span>
    <span v-if="!compact">{{
      !available ? 'Saving unavailable' : saved ? 'Saved on this device' : 'Save'
    }}</span>
    <span v-else class="sr-only">{{
      saved ? 'Remove saved opportunity' : 'Save opportunity on this device'
    }}</span>
  </button>
</template>
