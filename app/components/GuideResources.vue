<script setup lang="ts">
defineProps<{
  resources: Array<{ title: string; url: string; note?: string }>
}>()
</script>

<template>
  <section
    aria-labelledby="guide-resources"
    class="guide-resources mt-18 border-t border-paper/12 pt-10"
  >
    <div class="flex items-center gap-3">
      <span
        aria-hidden="true"
        class="grid h-8 w-8 place-items-center rounded-full border border-acid/25 bg-acid/[.055] text-acid shadow-[0_0_20px_color-mix(in_srgb,var(--color-acid)_8%,transparent)]"
      >
        <SiteIcon name="book" :size="15" />
      </span>
      <div>
        <p class="text-[9px] uppercase tracking-[.18em] text-acid/70">Primary sources</p>
        <h2 id="guide-resources" class="mt-1 font-display text-2xl tracking-[-.035em]">
          Go deeper
        </h2>
      </div>
    </div>
    <p class="mt-4 max-w-2xl text-sm leading-6 text-paper/48">
      Use these first-party references to check rules, study the method further, or adapt this guide
      to your field.
    </p>
    <div class="mt-6 grid gap-3">
      <a
        v-for="resource in resources"
        :key="resource.url"
        :href="resource.url"
        target="_blank"
        rel="noopener noreferrer"
        class="resource-link group relative overflow-hidden rounded-2xl border border-paper/12 bg-paper/[.018] p-5"
      >
        <span
          aria-hidden="true"
          class="absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-acid/0 to-transparent transition-[background-color,opacity] duration-300 group-hover:via-acid/65"
        />
        <span class="flex items-start justify-between gap-5">
          <span class="min-w-0">
            <span
              class="block text-sm font-medium text-paper/82 transition-colors duration-300 group-hover:text-acid"
            >
              {{ resource.title }}
            </span>
            <span v-if="resource.note" class="mt-2 block text-xs leading-5 text-paper/43">
              {{ resource.note }}
            </span>
          </span>
          <span
            class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-paper/12 text-paper/45 transition-[transform,color,border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:rotate-6 group-hover:scale-105 group-hover:border-acid/35 group-hover:bg-acid/[.06] group-hover:text-acid group-hover:shadow-[0_0_18px_color-mix(in_srgb,var(--color-acid)_9%,transparent)] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <SiteIcon :size="14" />
          </span>
        </span>
      </a>
    </div>
  </section>
</template>

<style scoped>
.resource-link {
  transform: translate3d(0, 0, 0);
  transition:
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 240ms ease,
    background-color 240ms ease,
    box-shadow 360ms ease;
}
.resource-link:hover,
.resource-link:focus-visible {
  border-color: color-mix(in srgb, var(--color-acid) 28%, transparent);
  background: color-mix(in srgb, var(--color-paper) 2.8%, transparent);
  box-shadow:
    0 14px 36px rgb(0 0 0 / 12%),
    inset 0 1px 0 color-mix(in srgb, var(--color-paper) 3%, transparent);
  transform: translate3d(3px, -1px, 0);
}
.resource-link:active {
  transform: scale(0.992);
  transition-duration: 80ms;
}
@media (prefers-reduced-motion: reduce) {
  .resource-link {
    transform: none !important;
    transition: none;
  }
}
</style>
