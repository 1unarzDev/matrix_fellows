<script setup lang="ts">
const props = withDefaults(
  defineProps<{ title: string; count?: number; defaultOpen?: boolean }>(),
  { count: 0, defaultOpen: false },
)
const id = useId()
const open = ref(props.defaultOpen)
</script>

<template>
  <section class="disclosure" :class="{ 'disclosure--open': open }">
    <button
      type="button"
      class="disclosure__trigger flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left text-[10px] uppercase tracking-[.16em] text-paper/50"
      :aria-expanded="open"
      :aria-controls="id"
      @click="open = !open"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span>{{ title }}</span>
        <span
          v-if="count"
          class="rounded-full border border-acid/25 bg-acid/[.06] px-1.5 py-0.5 text-[8px] tabular-nums text-acid"
          >{{ count }}</span
        >
      </span>
      <SiteIcon name="down" :size="13" class="disclosure__chevron shrink-0 text-acid/75" />
    </button>
    <div :id="id" class="disclosure__region grid" :aria-hidden="!open" :inert="!open">
      <div class="min-h-0 overflow-hidden">
        <div class="disclosure__content pb-2 pt-1"><slot /></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.disclosure__trigger {
  transition:
    color 220ms ease,
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}
.disclosure__trigger:hover,
.disclosure__trigger:focus-visible,
.disclosure--open .disclosure__trigger {
  color: color-mix(in srgb, var(--color-acid) 88%, var(--color-paper));
}
.disclosure__trigger:hover {
  transform: translate3d(2px, 0, 0);
}
.disclosure__chevron {
  transform: rotate(0deg);
  transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
}
.disclosure--open .disclosure__chevron {
  transform: rotate(180deg);
}
.disclosure__region {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translate3d(0, -5px, 0);
  transition:
    grid-template-rows 440ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 240ms ease,
    transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.disclosure--open .disclosure__region {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translate3d(0, 0, 0);
}
.disclosure__content {
  transform-origin: top;
  transition: transform 440ms cubic-bezier(0.22, 1, 0.36, 1);
  transform: scale(0.985);
}
.disclosure--open .disclosure__content {
  transform: scale(1);
}
@media (prefers-reduced-motion: reduce) {
  .disclosure__trigger,
  .disclosure__chevron,
  .disclosure__region,
  .disclosure__content {
    transform: none !important;
    transition: none !important;
  }
}
</style>
