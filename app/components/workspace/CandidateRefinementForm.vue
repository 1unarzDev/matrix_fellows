<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: Record<string, any>
  busy?: boolean
  editing?: boolean
}>(), { busy: false, editing: false })
const emit = defineEmits<{ save: []; cancel: [] }>()
const step = ref(0)
const movingForward = ref(true)
const transitioning = ref(false)
const error = ref('')
const heading = ref<HTMLElement>()
const steps = [
  { label: 'Basics', title: 'Start with the essential signal.' },
  { label: 'Research fit', title: 'Add the context that makes this lead useful.' },
  { label: 'Evidence', title: 'Keep the source trail easy to review.' },
  { label: 'Review', title: 'A clear candidate, ready for the queue.' },
]
const form = computed(() => props.modelValue)
const hasRequiredBasics = computed(() => Boolean(form.value.name?.trim() && form.value.organization?.trim() && form.value.canonicalUrl?.trim() && form.value.description?.trim()))
function next() {
  error.value = ''
  if (step.value === 0 && !hasRequiredBasics.value) {
    error.value = 'Add a name, organization, official source, and short description to continue.'
    return
  }
  movingForward.value = true
  transitioning.value = true
  step.value = Math.min(3, step.value + 1)
  window.setTimeout(() => { transitioning.value = false; heading.value?.focus({ preventScroll: true }) }, 260)
}
function back() {
  error.value = ''
  movingForward.value = false
  transitioning.value = true
  step.value = Math.max(0, step.value - 1)
  window.setTimeout(() => { transitioning.value = false; heading.value?.focus({ preventScroll: true }) }, 260)
}
function save() {
  error.value = ''
  if (!hasRequiredBasics.value) {
    step.value = 0
    error.value = 'Complete the essential basics before saving this candidate.'
    return
  }
  if (form.value.evidence.some((entry: any) => !entry.url?.trim() || !entry.claim?.trim())) {
    step.value = 2
    error.value = 'Finish or remove each added source before saving.'
    return
  }
  emit('save')
}
function addEvidence() {
  form.value.evidence.push({ url: '', claim: '', quote: '', retrievedAt: new Date().toISOString(), confidence: 'unknown' })
}
</script>

<template>
  <form class="candidate-refinement" @submit.prevent="step < 3 ? next() : save()">
    <div class="candidate-refinement__wash" aria-hidden="true" />
    <header class="candidate-refinement__header">
      <div>
        <p class="ws-kicker">{{ editing ? 'Refine candidate' : 'New candidate' }}</p>
        <h2 ref="heading" tabindex="-1">{{ steps[step].title }}</h2>
        <p class="candidate-refinement__hint">Only the essentials are required. You can add more context whenever it becomes available.</p>
      </div>
      <button type="button" class="candidate-refinement__close" aria-label="Close refinement" :disabled="busy" @click="emit('cancel')">×</button>
    </header>
    <div class="candidate-refinement__progress" aria-label="Refinement progress">
      <span v-for="(item, index) in steps" :key="item.label" :class="{ active: index <= step }"><i />{{ item.label }}</span>
    </div>
    <Transition :name="movingForward ? 'candidate-step-forward' : 'candidate-step-back'" mode="out-in">
      <section :key="step" class="candidate-refinement__step">
        <template v-if="step === 0">
          <div class="candidate-refinement__grid">
            <label class="ws-field">Name <input v-model="form.name" required maxlength="180" placeholder="Professor, lab, or program" /></label>
            <label class="ws-field">Organization <input v-model="form.organization" required placeholder="University or research group" /></label>
            <label class="ws-field candidate-refinement__wide">Official source URL <input v-model="form.canonicalUrl" type="url" required placeholder="https://…" /></label>
            <label class="ws-field">Candidate type <ThemedSelect v-model="form.kind" :options="['lab', 'pi', 'postdoc', 'phd', 'program', 'student']" label="Candidate type" /></label>
            <label class="ws-field">Location <input v-model="form.location" placeholder="Dallas, remote, or unknown · optional" /></label>
          </div>
          <label class="ws-field">Short description <textarea v-model="form.description" required placeholder="What makes this a promising lead?" /></label>
        </template>
        <template v-else-if="step === 1">
          <div class="candidate-refinement__grid">
            <label class="ws-field candidate-refinement__wide">Research focus <textarea v-model="form.research" placeholder="Topics, methods, or projects they work on · optional" /></label>
            <label class="ws-field candidate-refinement__wide">Where a connection could fit <textarea v-model="form.opportunities" placeholder="A small, realistic contribution or question · optional" /></label>
            <label class="ws-field">Disciplines <input v-model="form.disciplines" placeholder="Comma separated · optional" /></label>
            <label class="ws-field">Participation mode <ThemedSelect v-model="form.mode" :options="['unknown', 'remote', 'in_person', 'hybrid']" label="Participation mode" /></label>
            <label class="ws-field">Connection scope <ThemedSelect v-model="form.scope" :options="['society', 'student', 'both']" label="Connection scope" /></label>
            <label class="ws-field candidate-refinement__wide">Access and eligibility <textarea v-model="form.eligibility" placeholder="Known access notes or restrictions · optional" /></label>
          </div>
        </template>
        <template v-else-if="step === 2">
          <div class="candidate-refinement__grid">
            <label class="ws-field">Public professional email <input v-model="form.contactEmail" type="email" placeholder="Optional" /></label>
            <label class="ws-field">Parent lab URL <input v-model="form.labUrl" type="url" placeholder="Optional" /></label>
          </div>
          <div class="candidate-refinement__evidence-head">
            <div><h3>Claim-level evidence</h3><p>Use a source when you have one. Notes can be added later.</p></div>
            <button type="button" class="ws-button" @click="addEvidence">Add source</button>
          </div>
          <div v-for="(e, i) in form.evidence" :key="i" class="candidate-refinement__evidence">
            <label class="ws-field">Source URL <input v-model="e.url" type="url" placeholder="https://…" /></label>
            <label class="ws-field">Supported claim <textarea v-model="e.claim" placeholder="What this source supports" /></label>
            <button type="button" class="candidate-refinement__remove" @click="form.evidence.splice(i, 1)">Remove</button>
          </div>
          <p v-if="!form.evidence.length" class="candidate-refinement__empty">No extra sources yet. The official source above is enough to save.</p>
        </template>
        <template v-else>
          <div class="candidate-refinement__review">
            <div><span>Name</span><strong>{{ form.name || 'Not set' }}</strong></div>
            <div><span>Organization</span><strong>{{ form.organization || 'Not set' }}</strong></div>
            <div><span>Source</span><strong>{{ form.canonicalUrl || 'Not set' }}</strong></div>
            <div><span>Evidence</span><strong>{{ form.evidence.length ? `${form.evidence.length} source${form.evidence.length === 1 ? '' : 's'}` : 'Official source only' }}</strong></div>
          </div>
          <label class="ws-field">Internal notes <span class="optional">· optional</span><textarea v-model="form.notes" placeholder="A note for the next reviewer" /></label>
          <p class="candidate-refinement__review-note">You can refine any optional detail later from the dossier. Saving keeps the candidate in the review queue.</p>
        </template>
      </section>
    </Transition>
    <p v-if="error" class="candidate-refinement__error" role="alert">{{ error }}</p>
    <footer class="candidate-refinement__footer">
      <button v-if="step > 0" type="button" class="ws-button candidate-refinement__back" :disabled="busy || transitioning" @click="back">Back</button>
      <span v-else class="candidate-refinement__optional">About 1 minute · optional details can wait</span>
      <div class="candidate-refinement__actions">
        <button type="button" class="ws-button" :disabled="busy" @click="emit('cancel')">Cancel</button>
        <button class="ws-button ws-button--primary candidate-refinement__next" :disabled="busy || transitioning">{{ busy ? 'Saving…' : step < 3 ? 'Continue' : 'Save candidate' }}<SiteIcon v-if="!busy" name="right" :size="14" /></button>
      </div>
    </footer>
  </form>
</template>

<style scoped>
.candidate-refinement { position: relative; overflow: hidden; padding: clamp(22px, 4vw, 38px); border: 1px solid rgb(228 187 114 / 22%); border-radius: 28px; background: linear-gradient(145deg, rgb(244 241 233 / 7%), rgb(244 241 233 / 2%) 52%, transparent 80%), rgb(8 10 14 / 42%); box-shadow: 0 26px 90px rgb(0 0 0 / 22%), inset 0 1px 0 rgb(255 255 255 / 7%); backdrop-filter: blur(26px) saturate(115%); }
.candidate-refinement__wash { position:absolute; inset:0; pointer-events:none; background: url('/textures/glass-grain.svg') repeat; opacity:.07; mix-blend-mode:soft-light; }
.candidate-refinement > * { position:relative; z-index:1; }
.candidate-refinement__header { display:flex; justify-content:space-between; gap:20px; margin-bottom:26px; }
.candidate-refinement__header h2 { margin:6px 0 0; max-width:24ch; font-size:clamp(22px, 3vw, 32px); letter-spacing:-.045em; }
.candidate-refinement__hint { max-width:58ch; margin:10px 0 0; color:#aaa3b1; font-size:12px; line-height:1.7; }
.candidate-refinement__close { width:34px; height:34px; border:1px solid rgb(255 255 255 / 12%); border-radius:50%; color:#b8b0bf; background:transparent; font-size:23px; line-height:1; transition:transform .35s ease, border-color .35s ease, color .35s ease; }
.candidate-refinement__close:hover { transform:rotate(90deg); border-color:#d8b97766; color:#f1dbac; }
.candidate-refinement__progress { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:28px; }
.candidate-refinement__progress span { display:flex; align-items:center; gap:7px; min-width:0; color:#817b8b; font-size:10px; text-transform:uppercase; letter-spacing:.13em; }
.candidate-refinement__progress i { display:block; width:100%; height:3px; border-radius:4px; background:#ffffff12; transition:background .55s ease; }
.candidate-refinement__progress span.active { color:#d8b977; }
.candidate-refinement__progress span.active i { background:#d8b977; }
.candidate-refinement__step { min-height:250px; }
.candidate-refinement__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
.candidate-refinement__wide { grid-column:1/-1; }
.candidate-refinement__step > .ws-field { margin-top:18px; }
.candidate-refinement .ws-field { gap:8px; }
.candidate-refinement .ws-field input, .candidate-refinement .ws-field textarea { border-color:#ffffff18; background:#ffffff04; }
.candidate-refinement .ws-field input:focus, .candidate-refinement .ws-field textarea:focus { border-color:#d8b97766; box-shadow:0 0 0 3px #d8b97712; }
.candidate-refinement__evidence-head { display:flex; align-items:center; justify-content:space-between; gap:15px; margin:24px 0 12px; }
.candidate-refinement__evidence-head h3 { margin:0; font-size:15px; }
.candidate-refinement__evidence-head p { margin:6px 0 0; color:#928b9c; font-size:11px; }
.candidate-refinement__evidence { display:grid; grid-template-columns:1fr 1fr auto; align-items:end; gap:12px; padding:15px; border:1px solid #ffffff0d; border-radius:16px; background:#ffffff03; }
.candidate-refinement__remove { padding:9px 0; color:#b59b9f; font-size:11px; }
.candidate-refinement__empty, .candidate-refinement__review-note { color:#928b9c; font-size:12px; line-height:1.7; }
.candidate-refinement__review { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:22px; }
.candidate-refinement__review div { display:grid; gap:6px; padding:14px; border:1px solid #ffffff0c; border-radius:15px; background:#ffffff03; }
.candidate-refinement__review span { color:#8d8797; font-size:10px; text-transform:uppercase; letter-spacing:.12em; }
.candidate-refinement__review strong { overflow:hidden; color:#e5dfd2; font-size:12px; font-weight:500; text-overflow:ellipsis; white-space:nowrap; }
.optional { color:#8d8797; font-weight:400; }
.candidate-refinement__error { margin-top:18px; padding:12px 14px; border:1px solid #e9a5a533; border-radius:12px; color:#efc2c2; background:#e9a5a50b; font-size:12px; }
.candidate-refinement__footer { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-top:30px; padding-top:20px; border-top:1px solid #ffffff0d; }
.candidate-refinement__actions { display:flex; align-items:center; gap:10px; }
.candidate-refinement__next { display:inline-flex; align-items:center; gap:10px; }
.candidate-refinement__optional { color:#827b8c; font-size:10px; }
.candidate-step-forward-enter-active,.candidate-step-forward-leave-active,.candidate-step-back-enter-active,.candidate-step-back-leave-active { transition:opacity .28s ease, transform .35s cubic-bezier(.22,1,.36,1); }
.candidate-step-forward-enter-from { opacity:0; transform:translateX(18px); }.candidate-step-forward-leave-to { opacity:0; transform:translateX(-18px); }.candidate-step-back-enter-from { opacity:0; transform:translateX(-18px); }.candidate-step-back-leave-to { opacity:0; transform:translateX(18px); }
@media (max-width:760px) { .candidate-refinement__grid,.candidate-refinement__review { grid-template-columns:1fr; }.candidate-refinement__evidence { grid-template-columns:1fr; }.candidate-refinement__footer { align-items:flex-start; flex-direction:column; }.candidate-refinement__actions { width:100%; justify-content:flex-end; }.candidate-refinement__progress span { display:block; }.candidate-refinement__progress span i { margin-bottom:7px; }.candidate-refinement__progress span:not(.active) { color:transparent; } }
@media (prefers-reduced-motion:reduce) { .candidate-refinement *, .candidate-refinement *::before, .candidate-refinement *::after { transition:none !important; animation:none !important; } }
</style>
