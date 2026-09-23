<script setup lang="ts">
const props = defineProps<{ id: string; compact?: boolean }>()
const { ready, available, toggle, isSaved } = useSavedOpportunities()
const saved = computed(() => isSaved(props.id))
const burst = ref(0)
const springing = ref(false)
const action = ref<'save' | 'remove'>('save')
const particles = [
  ['-24px', '-17px', '0ms'],
  ['-8px', '-26px', '18ms'],
  ['13px', '-23px', '8ms'],
  ['27px', '-8px', '28ms'],
  ['23px', '15px', '12ms'],
  ['5px', '25px', '32ms'],
  ['-18px', '20px', '20ms'],
  ['-28px', '2px', '38ms'],
] as const

async function activate() {
  if (!ready.value || !available.value) return
  action.value = saved.value ? 'remove' : 'save'
  toggle(props.id)
  burst.value++
  springing.value = false
  await nextTick()
  springing.value = true
}
</script>

<template>
  <button
    type="button"
    :disabled="!ready || !available"
    :aria-pressed="saved"
    :aria-label="
      !available
        ? 'Saving unavailable'
        : saved
          ? 'Remove saved opportunity'
          : 'Save opportunity on this device'
    "
    :title="available ? 'Saved only in this browser' : 'Browser storage is unavailable'"
    class="save-control"
    :class="{
      'save-control--saved': saved,
      'save-control--compact': compact,
      'save-control--springing': springing,
    }"
    :data-action="action"
    @click="activate"
  >
    <span class="save-control__surface" @animationend.self="springing = false">
      <span class="save-control__mark" aria-hidden="true" />
      <span v-if="!compact" class="save-control__labels" aria-hidden="true">
        <span :class="{ 'save-control__label--visible': !saved && available }">Save</span>
        <span :class="{ 'save-control__label--visible': saved && available }"
          >Saved on this device</span
        >
        <span :class="{ 'save-control__label--visible': !available }">Saving unavailable</span>
      </span>
    </span>

    <span v-if="burst" :key="burst" class="save-control__particles" aria-hidden="true">
      <i
        v-for="([x, y, delay], index) in particles"
        :key="index"
        :style="`--particle-x:${x};--particle-y:${y};--particle-delay:${delay}`"
      />
    </span>
  </button>
</template>

<style scoped>
.save-control {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  overflow: visible;
  border: 1px solid color-mix(in srgb, var(--color-paper) 15%, transparent);
  border-radius: 9999px;
  padding: 0 1rem;
  color: color-mix(in srgb, var(--color-paper) 65%, transparent);
  font-size: 0.75rem;
  background: color-mix(in srgb, var(--color-paper) 1.5%, transparent);
  box-shadow: 0 0 0 0 transparent;
  transform: translate3d(0, 0, 0) scale(1);
  transition:
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    color 260ms ease,
    border-color 320ms ease,
    background-color 320ms ease,
    box-shadow 420ms ease;
}

.save-control:hover:not(:disabled) {
  color: var(--color-acid);
  border-color: color-mix(in srgb, var(--color-acid) 48%, transparent);
  background: color-mix(in srgb, var(--color-acid) 6%, transparent);
  box-shadow:
    0 8px 24px rgb(0 0 0 / 14%),
    0 0 24px color-mix(in srgb, var(--color-acid) 8%, transparent);
  transform: translate3d(0, -2px, 0) scale(1.018);
}

.save-control:active:not(:disabled) {
  transform: translate3d(0, 0, 0) scale(0.965);
  transition-duration: 90ms;
}

.save-control:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.save-control--saved {
  color: var(--color-acid);
  border-color: color-mix(in srgb, var(--color-acid) 34%, transparent);
  background: color-mix(in srgb, var(--color-acid) 7%, transparent);
  box-shadow: inset 0 0 16px color-mix(in srgb, var(--color-acid) 3%, transparent);
}

.save-control--compact {
  width: 2.75rem;
  padding: 0;
  justify-content: center;
}

.save-control__surface {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  transform-origin: 1rem 50%;
}

.save-control--springing .save-control__surface {
  animation: save-control-spring 560ms cubic-bezier(0.2, 0.9, 0.25, 1.2) both;
}

.save-control__mark {
  width: 0.55rem;
  height: 0.55rem;
  flex: none;
  border: 1px solid currentColor;
  border-radius: 1px;
  background: transparent;
  box-shadow: 0 0 0 transparent;
  transform: rotate(45deg) scale(1);
  transition:
    background-color 260ms ease,
    box-shadow 360ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.save-control:hover:not(:disabled) .save-control__mark {
  transform: rotate(135deg) scale(1.08);
}

.save-control--saved .save-control__mark {
  background: currentColor;
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-acid) 48%, transparent);
  transform: rotate(225deg) scale(1.03);
}

.save-control--saved:hover:not(:disabled) .save-control__mark {
  transform: rotate(315deg) scale(1.1);
}

.save-control__labels {
  display: inline-grid;
  min-width: 7.3rem;
  text-align: left;
}

.save-control__labels > span {
  grid-area: 1 / 1;
  opacity: 0;
  transform: translate3d(0, 4px, 0);
  transition:
    opacity 180ms ease,
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.save-control__labels > .save-control__label--visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.save-control__particles {
  position: absolute;
  z-index: -1;
  top: 50%;
  left: 1.25rem;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.save-control--compact .save-control__particles {
  left: 50%;
}

.save-control__particles i {
  position: absolute;
  top: -1px;
  left: -1px;
  width: 3px;
  height: 3px;
  border-radius: 9999px;
  background: var(--color-acid);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-acid) 55%, transparent);
  opacity: 0;
  will-change: transform, opacity;
  animation: save-particle-out 580ms cubic-bezier(0.16, 0.8, 0.3, 1) var(--particle-delay) both;
}

.save-control[data-action='remove'] .save-control__particles i {
  background: color-mix(in srgb, var(--color-paper) 72%, transparent);
  box-shadow: none;
  animation-name: save-particle-in;
  animation-duration: 420ms;
}

@keyframes save-control-spring {
  0% {
    transform: scale(0.92);
  }
  38% {
    transform: scale(1.075);
  }
  62% {
    transform: scale(0.985);
  }
  82% {
    transform: scale(1.018);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes save-particle-out {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(0.4);
  }
  24% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--particle-x), var(--particle-y), 0) scale(0.1);
  }
}

@keyframes save-particle-in {
  0% {
    opacity: 0;
    transform: translate3d(var(--particle-x), var(--particle-y), 0) scale(0.1);
  }
  35% {
    opacity: 0.45;
  }
  100% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(0.25);
  }
}

@media (prefers-reduced-motion: reduce) {
  .save-control,
  .save-control__surface,
  .save-control__mark,
  .save-control__labels > span {
    animation: none !important;
    transform: none !important;
    transition: none !important;
  }

  .save-control__particles {
    display: none;
  }
}
</style>
