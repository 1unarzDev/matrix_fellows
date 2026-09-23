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
    <fieldset>
      <legend class="mb-3 text-[10px] uppercase tracking-[.16em] text-paper/40">
        High-school policy
      </legend>
      <label
        v-for="option in [
          ['supported', 'Explicitly supported'],
          ['not-stated', 'Not stated'],
          ['excluded', 'Excluded'],
        ]"
        :key="option[0]"
        class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('highSchool', option[0]!)"
          class="h-4 w-4 accent-[var(--color-acid)]"
          @change="$emit('toggle', 'highSchool', option[0]!)"
        /><span class="flex-1">{{ option[1] }}</span
        ><span class="text-paper/35">{{
          facets?.highSchoolPolicy?.[option[0]!] ?? ''
        }}</span></label
      >
    </fieldset>
    <fieldset>
      <legend class="mb-3 text-[10px] uppercase tracking-[.16em] text-paper/40">Discipline</legend>
      <label v-for="value in disciplines" :key="value" class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('discipline', value)"
          class="h-4 w-4 accent-[var(--color-acid)]"
          @change="$emit('toggle', 'discipline', value)"
        /><span class="flex-1">{{ value }}</span
        ><span class="text-paper/35">{{ facets?.discipline?.[value] ?? '' }}</span></label
      >
    </fieldset>
    <details>
      <summary
        class="min-h-11 cursor-pointer py-3 text-[10px] uppercase tracking-[.16em] text-paper/50"
      >
        Type
      </summary>
      <label v-for="value in kinds" :key="value" class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('kind', value)"
          class="h-4 w-4 accent-[var(--color-acid)]"
          @change="$emit('toggle', 'kind', value)"
        /><span class="flex-1">{{ value }}</span
        ><span class="text-paper/35">{{ facets?.kind?.[value] ?? '' }}</span></label
      >
    </details>
    <details>
      <summary
        class="min-h-11 cursor-pointer py-3 text-[10px] uppercase tracking-[.16em] text-paper/50"
      >
        Preparation
      </summary>
      <label v-for="option in stages" :key="option[0]" class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('stage', option[0]!)"
          class="h-4 w-4 accent-[var(--color-acid)]"
          @change="$emit('toggle', 'stage', option[0]!)"
        /><span>{{ option[1] }}</span></label
      >
    </details>
    <details>
      <summary
        class="min-h-11 cursor-pointer py-3 text-[10px] uppercase tracking-[.16em] text-paper/50"
      >
        Status
      </summary>
      <label v-for="option in statuses" :key="option[0]" class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('status', option[0]!)"
          class="h-4 w-4 accent-[var(--color-acid)]"
          @change="$emit('toggle', 'status', option[0]!)"
        /><span class="flex-1">{{ option[1] }}</span
        ><span class="text-paper/35">{{ facets?.status?.[option[0]!] ?? '' }}</span></label
      >
    </details>
    <details>
      <summary
        class="min-h-11 cursor-pointer py-3 text-[10px] uppercase tracking-[.16em] text-paper/50"
      >
        Participation
      </summary>
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
          class="h-4 w-4 accent-[var(--color-acid)]"
          @change="$emit('toggle', 'mode', option[0]!)"
        /><span>{{ option[1] }}</span></label
      ><label class="flex min-h-11 items-center gap-3"
        ><input
          type="checkbox"
          :checked="selected('free', 'true')"
          class="h-4 w-4 accent-[var(--color-acid)]"
          @change="$emit('toggle', 'free', 'true')"
        /><span>Verified free submission</span></label
      >
    </details>
  </div>
</template>
