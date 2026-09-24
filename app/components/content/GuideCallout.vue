<script setup lang="ts">
const props = withDefaults(defineProps<{ title: string; tone?: 'action' | 'warning' | 'note' }>(), {
  tone: 'note',
})
const treatment = computed(
  () =>
    ({
      action: { shell: 'callout--action', icon: 'spark' as const, label: 'Try this' },
      warning: {
        shell: 'callout--warning',
        icon: 'warning' as const,
        label: 'Before you begin',
      },
      note: { shell: 'callout--note', icon: 'compass' as const, label: 'Field note' },
    })[props.tone],
)
</script>

<template>
  <aside
    class="callout relative my-9 overflow-hidden rounded-2xl border p-5 sm:p-6"
    :class="treatment.shell"
  >
    <span class="callout__wash pointer-events-none absolute inset-0" aria-hidden="true" />
    <div class="relative flex items-start gap-4">
      <span class="callout__icon grid h-9 w-9 shrink-0 place-items-center rounded-full border">
        <SiteIcon :name="treatment.icon" :size="16" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-[9px] uppercase tracking-[.18em] text-paper/38">{{ treatment.label }}</p>
        <p class="mt-1.5 font-display text-lg font-medium tracking-[-.025em] text-paper">
          {{ title }}
        </p>
        <div class="mt-3 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"><slot /></div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.callout {
  transform: translate3d(0, 0, 0);
  transition:
    transform 520ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 380ms ease,
    box-shadow 520ms cubic-bezier(0.16, 1, 0.3, 1),
    background-color 380ms ease;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 3%),
    0 16px 42px rgb(0 0 0 / 8%);
}
.callout:hover {
  transform: translate3d(0, -2px, 0);
  border-color: color-mix(in srgb, var(--callout-accent) 34%, transparent);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 5%),
    0 19px 48px rgb(0 0 0 / 13%),
    0 0 30px color-mix(in srgb, var(--callout-accent) 5%, transparent);
}
.callout__wash {
  opacity: 0.8;
  background: radial-gradient(26rem 12rem at 0% 0%, var(--callout-glow), transparent 72%);
  transform: scale(1);
  transform-origin: 0 0;
  transition:
    opacity 420ms ease,
    transform 650ms cubic-bezier(0.16, 1, 0.3, 1);
}
.callout:hover .callout__wash {
  opacity: 1;
  transform: scale(1.06);
}
.callout__icon {
  color: var(--callout-accent);
  border-color: color-mix(in srgb, var(--callout-accent) 30%, transparent);
  background: color-mix(in srgb, var(--callout-accent) 7%, transparent);
  box-shadow: 0 0 22px color-mix(in srgb, var(--callout-accent) 9%, transparent);
  transition:
    transform 560ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 420ms ease;
}
.callout:hover .callout__icon {
  transform: translate3d(0, -1px, 0) rotate(-4deg) scale(1.045);
  box-shadow: 0 0 28px color-mix(in srgb, var(--callout-accent) 14%, transparent);
}
.callout--action {
  --callout-accent: var(--color-acid);
  --callout-glow: color-mix(in srgb, var(--color-acid) 9%, transparent);
  border-color: color-mix(in srgb, var(--color-acid) 26%, transparent);
  background: color-mix(in srgb, var(--color-acid) 2.7%, transparent);
}
.callout--warning {
  --callout-accent: #e8a978;
  --callout-glow: rgb(193 101 67 / 10%);
  border-color: rgb(232 169 120 / 24%);
  background: rgb(193 101 67 / 3.5%);
}
.callout--note {
  --callout-accent: #aebee8;
  --callout-glow: rgb(112 131 185 / 10%);
  border-color: rgb(174 190 232 / 20%);
  background: rgb(112 131 185 / 3%);
}
@media (prefers-reduced-motion: reduce) {
  .callout,
  .callout__wash,
  .callout__icon {
    transition: none;
  }
  .callout:hover,
  .callout:hover .callout__wash,
  .callout:hover .callout__icon {
    transform: none;
  }
}
</style>
