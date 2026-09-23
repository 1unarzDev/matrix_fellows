<script setup lang="ts">
const props = withDefaults(
  defineProps<{ modelValue: boolean; label: string; description?: string }>(),
  { description: '' },
)
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const id = useId()
</script>

<template>
  <label :for="id" class="animated-check group relative flex cursor-pointer items-start gap-3.5">
    <input
      :id="id"
      class="peer absolute left-0 top-0 z-10 h-5 w-5 cursor-pointer opacity-0"
      type="checkbox"
      :checked="props.modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="animated-check__control" aria-hidden="true">
      <span class="animated-check__tick"><SiteIcon name="check" :size="13" /></span>
      <span class="animated-check__particles">
        <i v-for="index in 6" :key="index" :style="{ '--particle': index - 1 }" />
      </span>
    </span>
    <span class="min-w-0 pt-0.5">
      <span class="block text-xs leading-relaxed text-paper/74">{{ label }}</span>
      <span v-if="description" class="mt-1 block text-[10px] leading-relaxed text-paper/40">
        {{ description }}
      </span>
    </span>
  </label>
</template>

<style scoped>
.animated-check__control {
  position: relative;
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
  place-items: center;
  overflow: visible;
  border: 1px solid color-mix(in srgb, var(--color-paper) 24%, transparent);
  border-radius: 0.38rem;
  color: var(--color-ink);
  background: color-mix(in srgb, var(--color-paper) 2.5%, transparent);
  transition:
    border-color 220ms ease,
    background-color 260ms ease,
    box-shadow 360ms ease,
    transform 500ms cubic-bezier(0.18, 1.55, 0.35, 1);
}
.animated-check:hover .animated-check__control {
  border-color: color-mix(in srgb, var(--color-acid) 55%, transparent);
  transform: scale(1.06);
}
.peer:focus-visible + .animated-check__control {
  outline: 2px solid var(--color-acid);
  outline-offset: 4px;
}
.peer:checked + .animated-check__control {
  border-color: color-mix(in srgb, var(--color-acid) 85%, transparent);
  background: var(--color-acid);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-acid) 7%, transparent);
  transform: scale(1.04);
}
.animated-check__tick {
  display: grid;
  place-items: center;
  opacity: 0;
  transform: scale(0.25) rotate(-18deg);
  transition:
    opacity 140ms ease,
    transform 500ms cubic-bezier(0.18, 1.6, 0.35, 1);
}
.peer:checked + .animated-check__control .animated-check__tick {
  opacity: 1;
  transform: scale(1) rotate(0);
}
.animated-check__particles {
  position: absolute;
  inset: 50%;
  pointer-events: none;
}
.animated-check__particles i {
  --angle: calc(var(--particle) * 60deg);
  position: absolute;
  width: 0.16rem;
  height: 0.16rem;
  margin: -0.08rem;
  border-radius: 999px;
  opacity: 0;
  background: color-mix(in srgb, var(--color-acid) 80%, white);
  transform: rotate(var(--angle)) translateX(0) scale(0.4);
}
.peer:checked + .animated-check__control .animated-check__particles i {
  animation: check-particle 520ms cubic-bezier(0.2, 0.75, 0.3, 1) both;
  animation-delay: calc(var(--particle) * 15ms);
}
@keyframes check-particle {
  0% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(0) scale(0.3);
  }
  24% {
    opacity: 0.72;
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(0.9rem) scale(0.85);
  }
}
@media (prefers-reduced-motion: reduce) {
  .animated-check__control,
  .animated-check__tick {
    transition: none;
  }
  .peer:checked + .animated-check__control .animated-check__particles i {
    animation: none;
  }
}
</style>
