<script setup lang="ts">
defineProps<{
  disciplines: string[]
  kinds: string[]
  stages: string[][]
  statuses: string[][]
  selected: (key: string, value: string) => boolean
  facets?: Record<string, Record<string, number>>
}>()
defineEmits<{ toggle: [key: string, value: string] }>()
</script>

<template>
  <div class="space-y-7 text-xs">
    <AnimatedDisclosure
      title="Discipline"
      :count="disciplines.filter((value) => selected('discipline', value)).length"
    >
      <label v-for="value in disciplines" :key="value" class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('discipline', value)"
          class="filter-check h-4 w-4 shrink-0"
          @change="$emit('toggle', 'discipline', value)"
        /><span class="flex-1">{{ value }}</span
        ><span class="filter-count text-paper/35">{{
          facets?.discipline?.[value] ?? ''
        }}</span></label
      >
    </AnimatedDisclosure>
    <AnimatedDisclosure
      title="Type"
      :count="kinds.filter((value) => selected('kind', value)).length"
    >
      <label v-for="value in kinds" :key="value" class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('kind', value)"
          class="filter-check h-4 w-4 shrink-0"
          @change="$emit('toggle', 'kind', value)"
        /><span class="flex-1">{{ value }}</span
        ><span class="filter-count text-paper/35">{{ facets?.kind?.[value] ?? '' }}</span></label
      >
    </AnimatedDisclosure>
    <AnimatedDisclosure
      title="Preparation"
      :count="stages.filter((option) => selected('stage', option[0]!)).length"
    >
      <label v-for="option in stages" :key="option[0]" class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('stage', option[0]!)"
          class="filter-check h-4 w-4 shrink-0"
          @change="$emit('toggle', 'stage', option[0]!)"
        /><span>{{ option[1] }}</span></label
      >
    </AnimatedDisclosure>
    <AnimatedDisclosure
      title="Status"
      :count="statuses.filter((option) => selected('status', option[0]!)).length"
    >
      <label v-for="option in statuses" :key="option[0]" class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('status', option[0]!)"
          class="filter-check h-4 w-4 shrink-0"
          @change="$emit('toggle', 'status', option[0]!)"
        /><span class="flex-1">{{ option[1] }}</span
        ><span class="filter-count text-paper/35">{{
          facets?.status?.[option[0]!] ?? ''
        }}</span></label
      >
    </AnimatedDisclosure>
    <AnimatedDisclosure
      title="Participation"
      :count="
        ['remote-presentation', 'remote-submission', 'in-person', 'hybrid'].filter((value) =>
          selected('mode', value),
        ).length + (selected('free', 'true') ? 1 : 0)
      "
    >
      <label
        v-for="option in [
          ['remote-presentation', 'Remote presentation'],
          ['remote-submission', 'Remote submission'],
          ['in-person', 'In person'],
          ['hybrid', 'Hybrid'],
        ]"
        :key="option[0]"
        class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('mode', option[0]!)"
          class="filter-check h-4 w-4 shrink-0"
          @change="$emit('toggle', 'mode', option[0]!)"
        /><span>{{ option[1] }}</span></label
      ><label class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('free', 'true')"
          class="filter-check h-4 w-4 shrink-0"
          @change="$emit('toggle', 'free', 'true')"
        /><span>Verified free submission</span></label
      >
    </AnimatedDisclosure>
  </div>
</template>

<style scoped>
label {
  padding-inline: 0.625rem;
  border-radius: 0.65rem;
  cursor: pointer;
  transition:
    color 180ms ease,
    background-color 180ms ease;
}
label:hover,
label:focus-within {
  color: color-mix(in srgb, var(--color-paper) 92%, var(--color-acid));
  background: color-mix(in srgb, var(--color-paper) 2.8%, transparent);
}
.filter-count {
  min-width: 2ch;
  flex: 0 0 auto;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.filter-check {
  appearance: none;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-paper) 35%, transparent);
  border-radius: 0.2rem;
  background: color-mix(in srgb, var(--color-paper) 4%, transparent);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 260ms ease;
}
.filter-check::before {
  content: '';
  width: 0.48rem;
  height: 0.28rem;
  border-bottom: 1.5px solid var(--color-ink);
  border-left: 1.5px solid var(--color-ink);
  opacity: 0;
  transform: translateY(-1px) rotate(-45deg) scale(0.45);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 150ms ease;
}
.filter-check:hover {
  border-color: color-mix(in srgb, var(--color-acid) 62%, transparent);
  transform: scale(1.08);
}
.filter-check:checked {
  border-color: var(--color-acid);
  background: var(--color-acid);
  box-shadow: 0 0 14px color-mix(in srgb, var(--color-acid) 18%, transparent);
}
.filter-check:checked::before {
  opacity: 1;
  transform: translateY(-1px) rotate(-45deg) scale(1);
}
.filter-check:focus-visible {
  outline: 2px solid var(--color-acid);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .filter-check,
  .filter-check::before {
    transform: none !important;
    transition: none !important;
  }
}
</style>
