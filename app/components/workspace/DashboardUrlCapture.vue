<script setup lang="ts">
import DashboardDialog from './DashboardDialog.vue'
import type { Opportunity } from '#shared/types/content'
import type {
  OpportunityCapturePreview,
  OpportunityReference,
} from '#shared/types/dashboard-opportunities'
const emit = defineEmits<{ inspect: [item: Opportunity]; saved: [message: string] }>()
const open = ref(false)
const url = ref('')
const title = ref('')
const preview = ref<OpportunityCapturePreview | null>(null)
const references = ref<OpportunityReference[]>([])
const busy = ref(false)
const error = ref('')
async function show() {
  open.value = true
  error.value = ''
  preview.value = null
  url.value = ''
  title.value = ''
  try {
    references.value = (
      await $fetch<{ references: OpportunityReference[] }>('/api/workspace/capture')
    ).references
  } catch {
    error.value = 'Saved URL references could not be loaded. Your existing work is unchanged.'
  }
}
async function inspectUrl() {
  busy.value = true
  error.value = ''
  preview.value = null
  try {
    preview.value = await $fetch<OpportunityCapturePreview>('/api/workspace/capture/preview', {
      method: 'POST',
      body: { url: url.value },
    })
    title.value = preview.value.title
  } catch (e: any) {
    error.value =
      e?.data?.statusMessage || 'Could not preview this URL. Check the address and try again.'
  } finally {
    busy.value = false
  }
}
async function save() {
  if (!preview.value) return
  const disposition = previewDisposition(preview.value)
  if (disposition === 'catalog' && preview.value.item) {
    const item = preview.value.item
    open.value = false
    emit('inspect', item)
    return
  }
  if (disposition === 'rejected') return
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<OpportunityCapturePreview>('/api/workspace/capture', {
      method: 'POST',
      body: { url: preview.value.url },
    })
    if (result.item) {
      open.value = false
      emit('inspect', result.item)
      emit('saved', 'Saved to your opportunities. It remains private to your dashboard.')
    } else {
      emit(
        'saved',
        result.disposition === 'shared-review'
          ? 'Sent for officer review. It will enter the shared catalog only if approved.'
          : 'This source was recorded for review.',
      )
      preview.value = null
      url.value = ''
      title.value = ''
    }
  } catch (e: any) {
    error.value =
      e?.data?.statusMessage || 'This source could not be saved. Your URL is still here.'
  } finally {
    busy.value = false
  }
}
function dispositionLabel(value: OpportunityCapturePreview['disposition']) {
  return {
    catalog: 'Existing catalog opportunity',
    personal: 'Personal opportunity',
    'shared-review': 'Candidate for the shared catalog',
    rejected: 'Not an opportunity',
    reference: 'Unverified reference',
  }[value]
}
function previewDisposition(value: OpportunityCapturePreview | null) {
  if (!value) return 'reference' as const
  return value.disposition || (value.item ? 'catalog' : 'reference')
}
</script>
<template>
  <button class="capture-trigger" @click="show">+ Add opportunity URL</button>
  <DashboardDialog v-if="open" title="Save a source to review" @close="open = false">
    <form class="capture-form" @submit.prevent="inspectUrl">
      <label
        >Official opportunity URL<input
          v-model="url"
          type="url"
          placeholder="https://…"
          required /></label
      ><button class="capture-button" :disabled="busy">
        {{ busy ? 'Inspecting source…' : 'Inspect link' }}
      </button>
    </form>
    <p v-if="error" class="capture-error" role="alert">{{ error }}</p>
    <div v-if="preview" class="capture-preview">
      <p class="capture-label" :class="`capture-label--${previewDisposition(preview)}`">
        {{ dispositionLabel(previewDisposition(preview)) }}
      </p>
      <p>{{ preview.notice }}</p>
      <h3 v-if="preview.item || preview.candidate">
        {{ (preview.item || preview.candidate)?.title }}
      </h3>
      <h3 v-else>{{ preview.title }}</h3>
      <p v-if="preview.reason" class="capture-reason">{{ preview.reason }}</p>
      <a :href="preview.url" target="_blank" rel="noopener noreferrer">Open original source ↗</a>
      <p class="capture-muted">
        {{ preview.source.label }}. Dates and eligibility remain subject to source review.
      </p>
      <button
        v-if="previewDisposition(preview) !== 'rejected'"
        class="capture-button"
        :disabled="busy"
        @click="save"
      >
        {{
          previewDisposition(preview) === 'catalog'
            ? 'Inspect catalog record'
            : previewDisposition(preview) === 'personal'
              ? 'Save to my opportunities'
              : previewDisposition(preview) === 'shared-review'
                ? 'Send for officer review'
                : 'Save private reference'
        }}
      </button>
    </div>
    <div v-if="references.length" class="capture-references">
      <h3>Your URL references</h3>
      <article v-for="reference in references" :key="reference.id">
        <a :href="reference.url" target="_blank" rel="noopener noreferrer"
          >{{ reference.title }} ↗</a
        >
        <p class="capture-muted">User supplied · facts not verified</p>
      </article>
    </div>
    <p v-else class="capture-muted">
      We inspect the public page first. Strong shared opportunities wait for officer review,
      smaller opportunities stay private to you, and unrelated links are rejected without saving.
    </p>
  </DashboardDialog>
</template>
<style scoped>
.capture-trigger,
.capture-button {
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid #ffffff20;
  background: #ffffff04;
  color: #efeee8;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.18s,
    border-color 0.18s;
}
.capture-trigger:hover,
.capture-button:hover {
  background: #ffffff0c;
  border-color: #ffffff40;
}
.capture-button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.capture-form,
.capture-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.capture-form label,
.capture-preview label {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
  font-size: 12px;
  color: #d8d4df;
}
.capture-form input,
.capture-preview input {
  border: 1px solid #ffffff20;
  border-radius: 9px;
  background: #111218;
  color: #efeee8;
  padding: 12px;
  min-height: 44px;
  width: 100%;
  font-size: 13px;
}
.capture-preview {
  padding: 20px 0;
  margin-top: 20px;
  border-top: 1px solid #ffffff13;
}
.capture-label {
  color: #d8b977;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.1em;
}
.capture-label--personal { color: #a9d7c2; }
.capture-label--shared-review { color: #c7b7f0; }
.capture-label--rejected { color: #f0aaa0; }
.capture-preview p {
  margin: 0;
}
.capture-reason {
  padding: 12px 14px;
  width: 100%;
  border: 1px solid #ffffff14;
  border-radius: 10px;
  background: #ffffff05;
  color: #ded8e4;
  font-size: 12px;
  line-height: 1.65;
}
.capture-muted {
  color: #b0adb8;
  font-size: 12px;
  line-height: 1.7;
}
.capture-preview a,
.capture-references a {
  color: #d8b977;
  overflow-wrap: anywhere;
  font-size: 13px;
}
.capture-error {
  color: #ffc4b8;
  background: #f2959510;
  border: 1px solid #f2959530;
  border-radius: 10px;
  padding: 14px;
  font-size: 12px;
}
.capture-references {
  margin-top: 24px;
  border-top: 1px solid #ffffff13;
  padding-top: 20px;
}
.capture-references h3 {
  font-size: 15px;
  font-weight: 500;
}
.capture-references article {
  padding: 12px 0;
  border-top: 1px solid #ffffff0b;
}
.capture-trigger:focus-visible,
.capture-form :is(input, button):focus-visible,
.capture-preview :is(input, button, a):focus-visible {
  outline: 2px solid #d8b977;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
</style>
