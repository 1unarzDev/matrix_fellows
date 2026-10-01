<script setup lang="ts">
import type { InternshipDetails, Opportunity } from '#shared/types/content'
const props = defineProps<{ item: Opportunity }>()
const emit = defineEmits<{ update: [item: Opportunity] }>()
const defaults: InternshipDetails = {
  texasEligibility: 'not-verified',
  texasEligibilityNote: 'Texas eligibility has not been reviewed.',
  placement: 'research-placement',
}
const fields = [
  ['texasEligibilityNote', 'Texas access · include residency and commuting conditions'],
  ['duration', 'Duration'],
  ['commitment', 'Weekly / full-time commitment'],
  ['housing', 'Housing provided and obligations'],
  ['meals', 'Meals'],
  ['experience', 'Prior experience requirements'],
  ['independentResearch', 'Independent research policy'],
] as const
const costFields = [
  ['application', 'Application fee'],
  ['program', 'Program / tuition fee'],
  ['compensation', 'Pay / stipend'],
  ['travel', 'Travel and lodging support'],
  ['aid', 'Financial aid'],
  ['materials', 'Equipment / materials costs'],
] as const
function update(field: string, value: unknown) {
  emit('update', {
    ...props.item,
    fieldEvidence: (props.item.fieldEvidence || []).filter(
      (entry) =>
        entry.field !== `internship.${field}` && !entry.field.startsWith(`internship.${field}.`),
    ),
    internship: { ...defaults, ...props.item.internship, [field]: value },
  })
}
function list(field: string, value: string) {
  update(
    field,
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  )
}
function restriction(field: string, value: string) {
  emit('update', {
    ...props.item,
    fieldEvidence: (props.item.fieldEvidence || []).filter(
      (entry) => entry.field !== `restrictions.${field}`,
    ),
    restrictions: { ...props.item.restrictions, [field]: value || null },
  })
}
function checkpoint(index: number, field: string, value: unknown) {
  const milestones = (props.item.milestones || []).map((point, position) =>
    position === index ? { ...point, [field]: value } : point,
  )
  emit('update', { ...props.item, milestones })
}
function cost(field: string, value: string) {
  emit('update', {
    ...props.item,
    costs: { ...props.item.costs, [field]: value || null },
    fieldEvidence: (props.item.fieldEvidence || []).filter(
      (entry) => entry.field !== `costs.${field}`,
    ),
  })
}
function addCheckpoint() {
  emit('update', {
    ...props.item,
    milestones: [
      ...(props.item.milestones || []),
      {
        label: 'Application deadline',
        kind: 'deadline',
        role: 'application',
        date: '',
        timezone: null,
        evidence: '',
        url: props.item.url,
        precision: 'date-only',
        tentative: true,
      },
    ],
  })
}
</script>

<template>
  <div class="rounded-2xl border border-paper/12 bg-paper/[.025] p-5">
    <AnimatedDisclosure title="Internship requirements & logistics" default-open>
      <div class="space-y-4 pb-4">
        <ThemedSelect
          :model-value="item.internship?.texasEligibility || 'not-verified'"
          :options="[
            { value: 'eligible', label: 'Texas applicants eligible' },
            { value: 'conditional', label: 'Conditional Texas access' },
            { value: 'local-only', label: 'Local applicants only' },
            { value: 'not-verified', label: 'Not yet verified' },
          ]"
          label="Texas eligibility"
          full-width
          @update:model-value="update('texasEligibility', $event)"
        />
        <ThemedSelect
          :model-value="item.internship?.placement || 'research-placement'"
          :options="[
            { value: 'employment', label: 'Employment / industry internship' },
            { value: 'research-placement', label: 'Mentored research placement' },
            { value: 'research-program', label: 'Research program (may charge tuition)' },
          ]"
          label="Placement type"
          full-width
          @update:model-value="update('placement', $event)"
        />
        <AdminField
          v-for="[key, label] in fields"
          :key="key"
          :model-value="item.internship?.[key] || ''"
          :label="label"
          multiline
          @update:model-value="
            update(key, key === 'texasEligibilityNote' ? $event : $event || null)
          "
        />
        <AdminField
          v-for="[key, label] in [
            ['grades', 'Grade / school year'],
            ['ages', 'Age'],
            ['geography', 'Residency / commuting restriction'],
            ['authorEligibility', 'Citizenship / work authorization'],
          ]"
          :key="key"
          :model-value="
            item.restrictions?.[key as keyof NonNullable<Opportunity['restrictions']>] || ''
          "
          :label="label!"
          @update:model-value="restriction(key!, $event)"
        />
        <AdminField
          :model-value="item.internship?.applicationMaterials?.join('\n') || ''"
          label="Application materials · one item per line"
          multiline
          @update:model-value="list('applicationMaterials', $event)"
        />
        <AdminField
          :model-value="item.internship?.selectionStages?.join('\n') || ''"
          label="Selection and placement stages · one per line"
          multiline
          @update:model-value="list('selectionStages', $event)"
        />
      </div>
    </AnimatedDisclosure>
    <AnimatedDisclosure title="Application, recommendation & program dates">
      <div
        v-for="(point, index) in item.milestones || []"
        :key="index"
        class="mb-5 space-y-3 rounded-xl bg-paper/[.025] p-4"
      >
        <p v-if="point.superseded" class="text-xs text-paper/45">Historical · superseded</p>
        <AdminField
          :model-value="point.label"
          label="Checkpoint label"
          @update:model-value="checkpoint(index, 'label', $event)"
        />
        <ThemedSelect
          :model-value="point.kind"
          :options="['deadline', 'opens', 'results', 'event']"
          label="Checkpoint type"
          full-width
          @update:model-value="checkpoint(index, 'kind', $event)"
        />
        <ThemedSelect
          :model-value="point.role || ''"
          :options="[
            { value: '', label: 'No specific role' },
            { value: 'application', label: 'Application' },
            { value: 'recommendation', label: 'Recommendation' },
            { value: 'interview', label: 'Interview' },
            { value: 'offer', label: 'Offer / decision' },
            { value: 'event', label: 'Program attendance' },
          ]"
          label="Checkpoint role"
          full-width
          @update:model-value="checkpoint(index, 'role', $event || undefined)"
        />
        <AdminField
          :model-value="point.date"
          label="Verified date · YYYY-MM-DD or timestamp with offset"
          @update:model-value="checkpoint(index, 'date', $event)"
        />
        <AdminField
          v-if="point.kind === 'event'"
          :model-value="point.endDate || ''"
          label="End of continuous program · optional YYYY-MM-DD"
          @update:model-value="checkpoint(index, 'endDate', $event || undefined)"
        />
        <AdminField
          :model-value="point.url"
          label="Official evidence URL"
          @update:model-value="checkpoint(index, 'url', $event)"
        />
        <AdminField
          :model-value="point.evidence"
          label="Exact date evidence (including year)"
          multiline
          @update:model-value="checkpoint(index, 'evidence', $event)"
        />
        <label class="flex min-h-11 items-center gap-3 text-xs text-paper/65"
          ><input
            type="checkbox"
            :checked="point.tentative"
            class="accent-acid"
            @change="checkpoint(index, 'tentative', ($event.target as HTMLInputElement).checked)"
          />Organizer labels date tentative</label
        >
      </div>
      <button
        type="button"
        class="min-h-11 rounded-full border border-acid/25 px-4 text-xs text-acid transition-colors hover:bg-acid/[.06]"
        @click="addCheckpoint"
      >
        + Add checkpoint
      </button>
    </AnimatedDisclosure>
    <AnimatedDisclosure title="Pay, fees & assistance">
      <div class="space-y-4 pb-4">
        <AdminField
          v-for="[key, label] in costFields"
          :key="key"
          :model-value="item.costs?.[key] || ''"
          :label="label"
          multiline
          @update:model-value="cost(key, $event)"
        />
      </div>
    </AnimatedDisclosure>
    <p class="mt-3 text-xs leading-5 text-paper/45">
      Use organizer evidence for each claim. Empty fields remain unknown. The calendar uses verified
      timeline dates; changing a deadline does not establish a program period.
    </p>
  </div>
</template>
