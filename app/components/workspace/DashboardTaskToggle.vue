<script setup lang="ts">
defineProps<{ checked: boolean; disabled?: boolean; label: string }>()
defineEmits<{ toggle: [] }>()
</script>
<template>
  <button
    type="button"
    class="task-toggle"
    :class="{ 'task-toggle--checked': checked }"
    :aria-pressed="checked"
    :aria-label="label"
    :disabled="disabled"
    @click="$emit('toggle')"
  >
    <span class="task-toggle__frame" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4.5 4.5L19 7" pathLength="1" /></svg>
    </span>
  </button>
</template>
<style scoped>
.task-toggle {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  padding: 8px;
  border: 0;
  background: transparent;
  color: var(--color-acid);
  cursor: pointer;
}
.task-toggle__frame {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1.5px solid rgb(244 241 233 / 45%);
  border-radius: 8px;
  transition:
    border-color 220ms ease,
    box-shadow 260ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.task-toggle svg {
  width: 20px;
  height: 20px;
}
.task-toggle path {
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transition:
    stroke-dashoffset 300ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease;
}
.task-toggle--checked .task-toggle__frame {
  border-color: currentColor;
  box-shadow: 0 0 16px color-mix(in srgb, var(--color-acid) 8%, transparent);
}
.task-toggle--checked path {
  stroke-dashoffset: 0;
  opacity: 1;
}
.task-toggle:hover:not(:disabled) .task-toggle__frame {
  border-color: currentColor;
  transform: scale(1.06);
}
.task-toggle:active:not(:disabled) .task-toggle__frame {
  transform: scale(0.94);
}
.task-toggle:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: 12px;
}
.task-toggle:disabled {
  cursor: progress;
}
@media (prefers-reduced-motion: reduce) {
  .task-toggle__frame,
  .task-toggle path {
    transition: none;
    transform: none !important;
  }
}
</style>
