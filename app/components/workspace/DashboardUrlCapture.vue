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
  if (preview.value.item) {
    const item = preview.value.item
    open.value = false
    emit('inspect', item)
    return
  }
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/workspace/capture', {
      method: 'POST',
      body: { url: preview.value.url, title: title.value },
    })
    references.value = (
      await $fetch<{ references: OpportunityReference[] }>('/api/workspace/capture')
    ).references
    preview.value = null
    url.value = ''
    title.value = ''
    emit(
      'saved',
      'Private URL reference saved. Its facts still need verification; no commitments were added.',
    )
  } catch (e: any) {
    error.value =
      e?.data?.statusMessage || 'The reference could not be saved. Your URL is still here.'
  } finally {
    busy.value = false
  }
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
        {{ busy ? 'Checking…' : 'Preview reference' }}
      </button>
    </form>
    <p v-if="error" class="capture-error" role="alert">{{ error }}</p>
    <div v-if="preview" class="capture-preview">
      <p class="capture-label">
        {{
          preview.kind === 'catalog'
            ? 'Existing sourced catalog record'
            : 'Private · unverified reference'
        }}
      </p>
      <p>{{ preview.notice }}</p>
      <label v-if="!preview.item"
        >Reference name<input v-model="title" maxlength="240" required
      /></label>
      <h3 v-else>{{ preview.item.title }}</h3>
      <a :href="preview.url" target="_blank" rel="noopener noreferrer">Open original source ↗</a>
      <p class="capture-muted">
        {{ preview.source.label }}. A saved URL does not establish eligibility, availability, or a
        current application cycle.
      </p>
      <button
        class="capture-button"
        :disabled="busy || (!preview.item && !title.trim())"
        @click="save"
      >
        {{ preview.item ? 'Inspect catalog record' : 'Save private reference' }}
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
      URLs you save are private references. Known catalog entries open their evidence inspector;
      other sources are retained for your review, not described as newly discovered opportunities.
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
.capture-preview p {
  margin: 0;
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
