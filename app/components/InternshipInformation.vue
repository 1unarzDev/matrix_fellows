<script setup lang="ts">
import type { Opportunity } from '#shared/types/content'
import { displayDate } from '#shared/utils/opportunities'
const props = defineProps<{ item: Opportunity }>()
const id = useId()
const details = computed(() => props.item.internship)
const accessLabels = {
  eligible: 'Texas applicants eligible',
  conditional: 'Texas access has conditions',
  'local-only': 'Local applicants only',
  'not-verified': 'Texas access needs verification',
}
const facts = computed(() =>
  [
    ['restrictions.grades', 'School year', props.item.restrictions?.grades],
    ['restrictions.ages', 'Age at entry', props.item.restrictions?.ages],
    [
      'restrictions.authorEligibility',
      'Citizenship / work eligibility',
      props.item.restrictions?.authorEligibility,
    ],
    ['restrictions.geography', 'Residency & commuting', props.item.restrictions?.geography],
    ['internship.duration', 'Duration', details.value?.duration],
    ['internship.commitment', 'Weekly commitment', details.value?.commitment],
    ['internship.housing', 'Housing', details.value?.housing],
    ['internship.meals', 'Meals', details.value?.meals],
    ['internship.experience', 'Prior experience', details.value?.experience],
    ['internship.independentResearch', 'Independent research', details.value?.independentResearch],
  ].map(([field, label, value]) => ({
    field: field!,
    label,
    value,
    evidence: props.item.fieldEvidence?.find((entry) => entry.field === field),
  })),
)
const lists = computed(() => [
  {
    key: 'applicationMaterials',
    title: 'Application materials',
    values: details.value?.applicationMaterials,
  },
  {
    key: 'selectionStages',
    title: 'Application & placement stages',
    values: details.value?.selectionStages,
  },
])
</script>

<template>
  <section class="internship-information" :aria-labelledby="`${id}-heading`">
    <p class="text-[10px] uppercase tracking-[.16em] text-acid/75">Research in practice</p>
    <h2 :id="`${id}-heading`" class="mt-3 font-display text-2xl">Your internship plan</h2>
    <div class="internship-information__access mt-5">
      <p class="text-xs font-medium text-acid">
        {{ accessLabels[details?.texasEligibility || 'not-verified'] }}
      </p>
      <p class="mt-2 text-sm leading-6 text-paper/65">
        {{
          details?.texasEligibilityNote ||
          'Confirm residency, age, work eligibility, and local attendance requirements with the organizer before applying.'
        }}
      </p>
    </div>
    <dl class="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <div v-for="fact in facts" :key="fact.field" class="min-w-0">
        <dt class="text-[10px] uppercase tracking-[.12em] text-paper/40">{{ fact.label }}</dt>
        <dd class="mt-2 text-sm leading-6 text-paper/65">
          {{ fact.value || 'Not stated in the reviewed evidence' }}
        </dd>
        <a
          v-if="fact.evidence"
          :href="fact.evidence.url"
          target="_blank"
          rel="noopener noreferrer"
          class="internship-information__source"
        >
          Source ↗<span v-if="fact.evidence.confirmedAt">
            · {{ displayDate(fact.evidence.confirmedAt) }}</span
          >
        </a>
      </div>
    </dl>
    <div class="mt-7 space-y-2">
      <AnimatedDisclosure v-for="list in lists" :key="list.key" :title="list.title" default-open>
        <ol v-if="list.values?.length" class="space-y-3 pb-3">
          <li
            v-for="(value, index) in list.values"
            :key="value"
            class="flex gap-3 text-sm leading-6 text-paper/65"
          >
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-acid/[.07] text-[10px] text-acid/80"
              >{{ index + 1 }}</span
            >
            <div>
              <p>{{ value }}</p>
              <a
                v-if="
                  item.fieldEvidence?.find(
                    (entry) =>
                      entry.field === `internship.${list.key}` ||
                      entry.field === `internship.${list.key}.${index}`,
                  )
                "
                :href="
                  item.fieldEvidence.find(
                    (entry) =>
                      entry.field === `internship.${list.key}` ||
                      entry.field === `internship.${list.key}.${index}`,
                  )!.url
                "
                target="_blank"
                rel="noopener noreferrer"
                class="internship-information__source"
                >Source ↗</a
              >
            </div>
          </li>
        </ol>
        <p v-else class="pb-3 text-sm leading-6 text-paper/45">
          The current application has not supplied a verified
          {{ list.key === 'applicationMaterials' ? 'materials checklist' : 'selection sequence' }}.
          Check the official application; requirements can vary by placement.
        </p>
      </AnimatedDisclosure>
    </div>
    <p class="mt-4 text-xs leading-5 text-paper/40">
      A stipend does not establish that housing, travel, or meals are covered. Selection and mentor
      matching may be separate steps.
    </p>
  </section>
</template>

<style scoped>
.internship-information {
  padding: clamp(1.25rem, 3vw, 2rem);
  border: 1px solid rgb(196 178 238 / 15%);
  border-radius: 1.5rem;
  background:
    radial-gradient(24rem 16rem at 100% 0%, rgb(196 178 238 / 5%), transparent 75%),
    rgb(244 241 233 / 2%);
  transition:
    border-color 320ms ease,
    box-shadow 420ms ease;
}
.internship-information:hover {
  border-color: rgb(228 199 151 / 23%);
  box-shadow: 0 0 32px rgb(196 178 238 / 4%);
}
.internship-information__access {
  padding: 1rem;
  border-radius: 1rem;
  background: rgb(228 199 151 / 4%);
}
.internship-information__source {
  display: inline-block;
  margin-top: 0.4rem;
  padding-block: 0.2rem;
  font-size: 10px;
  color: rgb(228 199 151 / 65%);
  transition:
    color 180ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
.internship-information__source:hover {
  color: var(--color-acid);
  transform: translateX(2px);
}
@media (prefers-reduced-motion: reduce) {
  .internship-information,
  .internship-information__source {
    transition: none;
    transform: none !important;
  }
}
</style>
