<script setup lang="ts">
import type { SocietyContextEntry, SocietyContextResponse } from '#shared/types/society-context'

const props = withDefaults(defineProps<{ compact?: boolean; officer?: boolean }>(), {
  compact: false,
  officer: true,
})
const open = ref(false)
const step = ref<1 | 2>(1)
const content = ref('')
const sourceDate = ref('')
const sourceEndDate = ref('')
const notes = ref('')
const file = ref<File | null>(null)
const busy = ref(false)
const notice = ref('')
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const calendarOffset = ref(0)
const selecting = ref(false)
const dragAnchor = ref('')
const dragMoved = ref(false)
const {
  data,
  pending,
  error: loadError,
  refresh,
} = await useFetch<SocietyContextResponse>('/api/workspace/society-context', {
  server: false,
  immediate: props.officer,
})

const entries = computed(() => data.value?.entries || [])
const sources = computed(() => data.value?.sources || [])
const pendingCount = computed(() => data.value?.pendingCount || 0)
const entryCount = computed(() => entries.value.length)
const sourceCount = computed(() => sources.value.length)
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
const calendarMonth = computed(() => {
  const month = new Date(`${today.slice(0, 7)}-01T12:00:00Z`)
  month.setUTCMonth(month.getUTCMonth() + calendarOffset.value)
  return month
})
const calendarDays = computed(() => {
  const month = calendarMonth.value
  const length = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate()
  return Array.from({ length }, (_, index) => {
    const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), index + 1, 12))
    return date.toISOString().slice(0, 10)
  })
})
const calendarCells = computed<(string | null)[]>(() => {
  const first = new Date(`${calendarMonth.value.toISOString().slice(0, 7)}-01T12:00:00Z`)
  return [...Array.from({ length: first.getUTCDay() }, () => null), ...calendarDays.value]
})
const hasSource = computed(() => Boolean(file.value || content.value.trim()))
const rangeLabel = computed(() => {
  if (!sourceDate.value) return 'Choose a day or drag across a period'
  if (!sourceEndDate.value || sourceEndDate.value === sourceDate.value)
    return dateLabel(sourceDate.value)
  return `${dateLabel(sourceDate.value)} → ${dateLabel(sourceEndDate.value)}`
})

function dateLabel(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}
function sourceTitle() {
  if (file.value?.name) return file.value.name.replace(/\.[^.]+$/, '').slice(0, 200)
  const firstLine = content.value.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  return (firstLine || 'Society source').replace(/\s+/g, ' ').slice(0, 200)
}
function setFile(next: File | null) {
  file.value = next
  if (next) content.value = ''
}
function chooseFile(event: Event) {
  setFile((event.target as HTMLInputElement).files?.[0] || null)
}
function handleDrop(event: DragEvent) {
  const dropped = event.dataTransfer?.files?.[0]
  if (dropped) setFile(dropped)
}
function handlePaste(event: ClipboardEvent) {
  const clipboard = event.clipboardData
  const pastedFile = clipboard?.files?.[0] || Array.from(clipboard?.items || []).map((item) => item.getAsFile()).find(Boolean)
  if (pastedFile) {
    event.preventDefault()
    setFile(pastedFile)
    return
  }
  setFile(null)
}
function resetForm() {
  step.value = 1
  content.value = ''
  sourceDate.value = ''
  sourceEndDate.value = ''
  notes.value = ''
  file.value = null
  calendarOffset.value = 0
  dragAnchor.value = ''
  selecting.value = false
  if (fileInput.value) fileInput.value.value = ''
}
function beginDetails() {
  error.value = ''
  if (!hasSource.value) {
    error.value = 'Paste text or choose a source file to continue.'
    return
  }
  step.value = 2
}
function backToSource() {
  step.value = 1
  error.value = ''
}
function selected(date: string) {
  if (!sourceDate.value) return false
  return date >= sourceDate.value && date <= (sourceEndDate.value || sourceDate.value)
}
function selectedCellClass(date: string) {
  if (!selected(date)) return {}
  const start = sourceDate.value
  const end = sourceEndDate.value || start
  const day = new Date(`${date}T12:00:00Z`)
  const monthLast = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate()
  return {
    'source-calendar__cell--selected': true,
    'source-calendar__cell--range': start !== end,
    'source-calendar__cell--start': date === start || day.getUTCDay() === 0 || day.getUTCDate() === 1,
    'source-calendar__cell--end': date === end || day.getUTCDay() === 6 || day.getUTCDate() === monthLast,
  }
}
function selectDate(date: string) {
  sourceDate.value = date
  sourceEndDate.value = date
}
function extendRange(date: string) {
  const anchor = dragAnchor.value || sourceDate.value || date
  if (date !== anchor) dragMoved.value = true
  if (date < anchor) {
    sourceDate.value = date
    sourceEndDate.value = anchor
  } else {
    sourceDate.value = anchor
    sourceEndDate.value = date
  }
}
function beginDrag(event: PointerEvent, date: string) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  dragAnchor.value = date
  dragMoved.value = false
  selecting.value = true
  selectDate(date)
}
function moveDrag(event: PointerEvent) {
  if (!selecting.value) return
  const day = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-source-date]')?.dataset.sourceDate
  if (day) extendRange(day)
}
function finishDrag() {
  selecting.value = false
  dragAnchor.value = ''
  window.setTimeout(() => { dragMoved.value = false }, 0)
}
function clickDate(event: MouseEvent, date: string) {
  if (event.detail === 0 || !dragMoved.value) selectDate(date)
}
async function submit() {
  if (busy.value || !hasSource.value) return
  busy.value = true
  notice.value = 'Source added. Processing is running in the background.'
  error.value = ''
  const title = sourceTitle()
  const body = file.value
    ? (() => {
        const form = new FormData()
        form.append('action', 'submit')
        form.append('title', title)
        form.append('sourceDate', sourceDate.value || '')
        form.append('sourceEndDate', sourceEndDate.value || '')
        form.append('relationshipHint', notes.value || '')
        form.append('file', file.value!)
        return form
      })()
    : {
        action: 'submit',
        title,
        content: content.value,
        sourceDate: sourceDate.value || null,
        sourceEndDate: sourceEndDate.value || null,
        relationshipHint: notes.value || null,
      }
  resetForm()
  open.value = false
  void (async () => {
    try {
      await $fetch('/api/workspace/society-context', { method: 'POST', body })
      await refresh()
    } catch (cause: any) {
      error.value = cause?.data?.message || cause?.statusMessage || 'This source could not be added. Please retry.'
    } finally {
      busy.value = false
      window.setTimeout(() => { if (!busy.value) notice.value = '' }, 2600)
    }
  })()
}
let pollTimer: ReturnType<typeof setTimeout> | undefined
async function poll() {
  await refresh()
  if ((data.value?.pendingCount || 0) > 0) pollTimer = setTimeout(poll, 4000)
}
watch(pendingCount, (count) => {
  if (pollTimer) clearTimeout(pollTimer)
  if (count > 0) pollTimer = setTimeout(poll, 4000)
}, { immediate: true })
watch(() => props.officer, (allowed) => {
  if (allowed && !data.value) void refresh()
})
onBeforeUnmount(() => { if (pollTimer) clearTimeout(pollTimer) })
</script>

<template>
  <section class="society-cloud" :class="{ 'society-cloud--compact': props.compact }" aria-labelledby="society-cloud-title">
    <div class="cloud-head">
      <div>
        <p class="cloud-kicker"><span class="cloud-pulse" aria-hidden="true" /> Society memory</p>
        <h2 id="society-cloud-title">Society context</h2>
        <p class="cloud-subtitle">Paste or upload anything useful. The agent will organize it into dated connections, projects, and opportunities in the background.</p>
      </div>
      <button v-if="props.officer" class="cloud-add" type="button" :aria-expanded="open" @click="open = !open">
        <span aria-hidden="true">＋</span><span>Add source</span>
      </button>
    </div>

    <div v-if="!props.officer" class="cloud-locked"><span aria-hidden="true">✦</span><div><strong>Officer-maintained society memory</strong><p>Source material is available to appointed officers. Your own research profile remains available from Profiles.</p></div></div>

    <Transition v-if="props.officer" name="composer">
      <form v-if="open" class="cloud-composer" @submit.prevent="submit">
        <div v-if="step === 1" class="source-step">
          <div class="composer-top"><div><p class="cloud-kicker">New source</p><h3>Paste or upload</h3><p class="cloud-muted">Text, email chains, PDFs, documents, images, and exports are all welcome.</p></div><span class="source-step-mark" aria-hidden="true">✦</span></div>
          <div class="source-drop-zone" @dragover.prevent @drop.prevent="handleDrop">
            <textarea v-model="content" aria-label="Paste source text" rows="8" placeholder="Paste an email chain, note, link, or any context here…" @paste="handlePaste" />
            <div class="source-drop-actions"><span class="cloud-muted">{{ file ? 'A file is ready for the agent.' : 'Paste from your clipboard or drop a file here.' }}</span><button type="button" class="source-upload" @click="fileInput?.click()">{{ file ? 'Choose another file' : 'Upload a file' }}</button><input ref="fileInput" type="file" accept="*/*" @change="chooseFile" /></div>
          </div>
          <div v-if="file" class="source-file"><span class="source-file__icon" aria-hidden="true">↗</span><div><strong>{{ file.name }}</strong><small>{{ Math.ceil(file.size / 1024) }} KB · ready for analysis</small></div><button type="button" aria-label="Remove selected file" @click="setFile(null)">×</button></div>
          <p v-if="error" class="cloud-message cloud-message--error" role="alert">{{ error }}</p>
          <div class="composer-actions"><span class="cloud-muted">You can add dates and notes next.</span><button type="button" class="cloud-submit" :disabled="!hasSource" @click="beginDetails">Continue <span aria-hidden="true">→</span></button></div>
        </div>

        <div v-else class="source-step source-step--details">
          <div class="composer-top"><div><p class="cloud-kicker">Optional context</p><h3>When and why?</h3><p class="cloud-muted">Add a note or mark the day this source belongs to. Drag across days for a period.</p></div><button type="button" class="source-back" @click="backToSource">← Back</button></div>
          <label class="cloud-field">Notes for the agent <span class="field-optional">optional</span><textarea v-model="notes" maxlength="500" rows="3" placeholder="What should the agent notice about this source?" /></label>
          <div class="source-calendar" @pointermove="moveDrag" @pointerup="finishDrag" @pointercancel="finishDrag">
            <div class="source-calendar__head"><button type="button" class="source-calendar__arrow" aria-label="Previous month" @click="calendarOffset--">←</button><strong>{{ calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }}</strong><button type="button" class="source-calendar__arrow" aria-label="Next month" @click="calendarOffset++">→</button></div>
            <div class="source-calendar__grid"><span v-for="(label, index) in ['S','M','T','W','T','F','S']" :key="`${label}-${index}`" class="source-calendar__label">{{ label }}</span><span v-for="(date, index) in calendarCells" :key="date || `blank-${index}`" class="source-calendar__cell" :class="date ? selectedCellClass(date) : {}"><button v-if="date" :data-source-date="date" :aria-label="`Select ${date}`" :aria-pressed="selected(date)" type="button" class="source-calendar__day" :class="{ 'source-calendar__day--selected': selected(date), 'source-calendar__day--today': date === today, 'source-calendar__day--range-start': date === sourceDate, 'source-calendar__day--range-end': date === (sourceEndDate || sourceDate) }" @pointerdown.prevent="beginDrag($event, date)" @click="clickDate($event, date)">{{ Number(date.slice(-2)) }}</button></span></div>
            <p class="source-calendar__range">{{ rangeLabel }}</p>
          </div>
          <p v-if="error" class="cloud-message cloud-message--error" role="alert">{{ error }}</p>
          <div class="composer-actions"><button type="button" class="source-back" @click="backToSource">Back</button><button class="cloud-submit" type="submit" :disabled="busy">{{ busy ? 'Queuing…' : 'Add source' }} <span aria-hidden="true">→</span></button></div>
        </div>
      </form>
    </Transition>

    <div v-if="props.officer" class="memory-stream" aria-live="polite">
      <div class="memory-stream__header"><div><p class="cloud-kicker">Growing context</p><h3>{{ entryCount ? `${entryCount} connection${entryCount === 1 ? '' : 's'}` : 'No context yet' }}</h3></div><span v-if="pendingCount" class="cloud-processing"><i aria-hidden="true" /> {{ pendingCount }} processing</span></div>
      <div v-if="entryCount" class="memory-list"><article v-for="entry in entries" :key="entry.id" class="memory-entry"><div class="memory-entry__signal" aria-hidden="true" /><div><div class="memory-entry__meta"><span>{{ entry.kind }}</span><span>{{ entry.connectionDate ? dateLabel(entry.connectionDate) : 'Date to be confirmed' }}</span></div><h4>{{ entry.title }}</h4><p>{{ entry.summary || 'Context is being shaped by the research agent.' }}</p><small v-if="entry.chapter">{{ entry.chapter }}</small></div></article></div>
      <div v-else class="memory-empty"><span aria-hidden="true">✦</span><p>Add a conversation, source, or file to begin the society memory.</p></div>
    </div>
    <div v-if="props.officer" class="cloud-foot"><span><strong>{{ sourceCount }}</strong> source{{ sourceCount === 1 ? '' : 's' }} captured</span><span v-if="loadError" class="cloud-muted">Memory is temporarily unavailable.</span><span v-else class="cloud-muted">Sources stay private to appointed officers.</span></div>
  </section>
</template>

<style scoped>
.society-cloud{--ink:#f1eee8;--muted:#aaa8b6;--line:#ffffff18;--gold:#d8b977;position:relative;isolation:isolate;overflow:hidden;padding:clamp(24px,4vw,48px);border:1px solid #ffffff16;border-radius:28px;background:rgb(18 19 24 / 67%);backdrop-filter:blur(28px) saturate(116%);box-shadow:0 24px 90px #05050a66,inset 0 1px #ffffff13;color:var(--ink);font-family:Manrope,sans-serif}.society-cloud:before{content:'';position:absolute;inset:0;z-index:-1;opacity:.32;background-image:radial-gradient(circle at 8% 24%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 73% 74%,#d8b977 0 1px,transparent 2px),radial-gradient(circle at 90% 16%,#fff 0 1px,transparent 1.8px);animation:cloud-twinkle 7s ease-in-out infinite alternate}.cloud-head{display:flex;align-items:flex-start;justify-content:space-between;gap:28px;position:relative;z-index:2}.cloud-head h2{max-width:710px;margin:7px 0 10px;font-size:clamp(24px,3vw,36px);line-height:1.05;font-weight:450;letter-spacing:-.045em}.cloud-subtitle{max-width:660px;margin:0;color:var(--muted);font-size:14px;line-height:1.7}.cloud-kicker{margin:0;color:#d8b977;font-size:10px;letter-spacing:.18em;text-transform:uppercase}.cloud-pulse{display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 5px #d8b97715,0 0 18px #d8b977aa;animation:pulse 2.6s ease-in-out infinite}.cloud-add,.cloud-submit{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:46px;padding:0 17px;border:1px solid #d8b97766;border-radius:999px;background:#d8b977;color:#1c1820;font:600 12px Manrope,sans-serif;box-shadow:0 8px 30px #d8b97724;cursor:pointer;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,background .3s}.cloud-add span:first-child{font-size:20px;line-height:0}.cloud-add:hover,.cloud-add:focus-visible,.cloud-submit:hover,.cloud-submit:focus-visible{transform:translateY(-2px) scale(1.02);background:#f0dba9;box-shadow:0 12px 40px #d8b97746}.cloud-add:focus-visible,.cloud-submit:focus-visible,.source-upload:focus-visible,.source-back:focus-visible{outline:2px solid var(--gold);outline-offset:3px}.cloud-composer{position:relative;z-index:3;margin:28px 0 0;padding:24px;border:1px solid #d8b97734;border-radius:22px;background:linear-gradient(145deg,rgb(244 241 233 / 6%),rgb(244 241 233 / 2.4%) 50%,transparent 82%),rgb(25 24 29 / 78%);backdrop-filter:blur(28px) saturate(116%);box-shadow:0 18px 70px #08070d99,inset 0 1px #ffffff10;overflow:hidden}.cloud-composer:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:url('/textures/glass-grain.svg') repeat;opacity:.1;mix-blend-mode:soft-light}.composer-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.composer-top h3{margin:5px 0 7px;font-size:21px;font-weight:500}.source-step-mark{display:grid;place-items:center;width:42px;height:42px;border:1px solid #d8b97755;border-radius:50%;color:var(--gold);box-shadow:0 0 24px #d8b97718}.cloud-muted{color:#918e9d;font-size:11px}.source-drop-zone{margin-top:20px;padding:12px;border:1px solid #d8b97738;border-radius:18px;background:#0d0e15aa;box-shadow:inset 0 1px #ffffff0b}.source-drop-zone textarea{display:block;width:100%;box-sizing:border-box;min-height:180px;padding:13px;border:0;background:transparent;color:var(--ink);font:14px/1.6 Manrope;resize:vertical;outline:0}.source-drop-zone textarea::placeholder{color:#7d7887}.source-drop-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 4px 2px;border-top:1px solid #ffffff10}.source-drop-actions input{display:none}.source-upload,.source-back{border:1px solid #d8b97742;border-radius:999px;padding:9px 13px;background:#d8b9770d;color:#e5d39e;font:500 11px Manrope;cursor:pointer;transition:transform .3s,background .3s,border-color .3s}.source-upload:hover,.source-back:hover{transform:translateY(-1px);border-color:#d8b97788;background:#d8b97718}.source-file{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border:1px solid #d8b97738;border-radius:13px;background:#d8b9770b}.source-file__icon{display:grid;place-items:center;width:28px;height:28px;border:1px solid #d8b97755;border-radius:50%;color:var(--gold)}.source-file div{display:grid;gap:3px;min-width:0}.source-file strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.source-file small{color:var(--muted);font-size:10px}.source-file button{margin-left:auto;border:0;background:transparent;color:#b7adbd;font-size:19px;cursor:pointer}.cloud-field{display:grid;gap:7px;margin:18px 0 13px;color:#d7d2df;font-size:11px;letter-spacing:.03em}.cloud-field textarea{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #ffffff18;border-radius:12px;background:#0d0e15aa;color:var(--ink);font:14px/1.5 Manrope;resize:vertical;transition:border-color .25s,box-shadow .25s}.cloud-field textarea:focus{border-color:#d8b97799;outline:0;box-shadow:0 0 0 4px #d8b97712}.field-optional{margin-left:6px;color:#8e899b;font-size:10px}.source-calendar{position:relative;z-index:1;isolation:isolate;overflow:hidden;margin-top:17px;padding:17px;border:1px solid #d8b97735;border-radius:20px;background:radial-gradient(26rem 13rem at 100% 0%,#e4bb7214,transparent 70%),#f4f1e909;box-shadow:inset 0 1px #ffffff0b,0 18px 45px #0000001f;backdrop-filter:blur(18px) saturate(118%)}.source-calendar:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:url('/textures/glass-grain.svg') repeat;opacity:.1;mix-blend-mode:soft-light}.source-calendar__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;color:#e8d09b;font-size:12px}.source-calendar__arrow{display:grid;place-items:center;width:30px;height:30px;border:1px solid #d8b97733;border-radius:50%;background:transparent;color:#d8b977;cursor:pointer;transition:transform .3s,background .3s}.source-calendar__arrow:hover{transform:scale(1.1);background:#d8b9771a}.source-calendar__grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;touch-action:none}.source-calendar__label{color:#777280;font-size:9px;text-align:center}.source-calendar__cell{position:relative;display:grid;place-items:center;min-height:34px}.source-calendar__cell--selected:before{content:'';position:absolute;inset:3px -3px;background:linear-gradient(180deg,#e4bb721f,#e4bb720f);border-block:1px solid #e4bb7247;pointer-events:none;transition:background .22s,box-shadow .22s;box-shadow:0 0 16px #e4bb7212}.source-calendar__cell--start:before{left:0;border-radius:9px 0 0 9px}.source-calendar__cell--end:before{right:0;border-radius:0 9px 9px 0}.source-calendar__cell--start.source-calendar__cell--end:before{border-radius:9px}.source-calendar__cell--range .source-calendar__day--selected{border-color:transparent;background:transparent;box-shadow:none}.source-calendar__cell--range .source-calendar__day--range-start,.source-calendar__cell--range .source-calendar__day--range-end{border-color:#e4bb728c;background:#e4bb7221;box-shadow:0 0 15px #e4bb721f}.source-calendar__day{position:relative;display:grid;place-items:center;width:100%;min-height:34px;border:1px solid transparent;border-radius:9px;background:transparent;color:#c3bdca;font-size:11px;cursor:pointer;transition:transform .3s,background .3s,border-color .3s,color .3s}.source-calendar__day:hover{transform:translateY(-2px);border-color:#e4bb726b;color:#fff3ce}.source-calendar__day:focus-visible{outline:2px solid #e4bb72bd;outline-offset:2px}.source-calendar__day--selected{background:#e4bb7221;border-color:#e4bb728c;color:#fff0c5;box-shadow:0 0 15px #e4bb721f,inset 0 1px #ffffff14}.source-calendar__day--range-start:before,.source-calendar__day--range-end:after{content:'';position:absolute;top:50%;width:8px;height:2px;background:#e7c779;box-shadow:0 0 9px #e7c779aa}.source-calendar__day--range-start:before{left:-7px}.source-calendar__day--range-end:after{right:-7px}.source-calendar__day--today{box-shadow:inset 0 -2px #d8b977}.source-calendar__range{min-height:17px;margin:13px 0 0;color:#a79ead;font-size:10px}.source-calendar__range:first-letter{color:#e2c486}.composer-actions{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:18px}.cloud-submit{min-width:154px}.cloud-submit:disabled{opacity:.55;cursor:not-allowed;transform:none}.cloud-message{margin:10px 0 0;color:#dbc88d;font-size:12px}.cloud-message--error{color:#ef9d9d}.memory-stream{position:relative;margin-top:30px;padding:20px;border:1px solid #ffffff12;border-radius:20px;background:#ffffff04;box-shadow:inset 0 1px #ffffff09}.memory-stream__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.memory-stream__header h3{margin:5px 0 0;font-size:18px;font-weight:450}.memory-list{display:grid;gap:10px;margin-top:18px}.memory-entry{display:grid;grid-template-columns:9px minmax(0,1fr);gap:13px;padding:14px 4px;border-top:1px solid #ffffff0d}.memory-entry__signal{width:7px;height:7px;margin-top:6px;border:1px solid var(--gold);border-radius:50%;box-shadow:0 0 12px #d8b97788}.memory-entry__meta{display:flex;justify-content:space-between;gap:10px;color:#d8b977;font-size:9px;letter-spacing:.12em;text-transform:uppercase}.memory-entry h4{margin:6px 0 4px;font-size:14px;font-weight:500}.memory-entry p{margin:0;color:var(--muted);font-size:11px;line-height:1.55}.memory-entry small{display:block;margin-top:7px;color:#8e899b;font-size:10px}.memory-empty{display:flex;align-items:center;gap:11px;margin-top:17px;padding:16px;border:1px dashed #ffffff18;border-radius:14px;color:var(--muted);font-size:11px}.memory-empty span{color:var(--gold);font-size:18px}.cloud-foot{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;padding-top:16px;color:#cfc8d4;font-size:11px}.cloud-foot strong{color:var(--gold);font-weight:500}.cloud-processing{display:inline-flex;align-items:center;gap:6px;color:#d9d1be}.cloud-processing i{width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 15px #d8b977;animation:pulse 1.5s infinite}.composer-enter-active,.composer-leave-active{transition:opacity .3s,transform .4s cubic-bezier(.22,1,.36,1);transform-origin:top}.composer-enter-from,.composer-leave-to{opacity:0;transform:translateY(-12px) scale(.98)}@keyframes pulse{50%{opacity:.45;transform:scale(.82)}}@keyframes cloud-twinkle{to{opacity:.7;transform:scale(1.025)}}@media(max-width:720px){.cloud-head{display:grid}.cloud-add{justify-self:start}.source-drop-actions{align-items:stretch;flex-direction:column}.source-upload{width:100%}.composer-actions{align-items:stretch;flex-direction:column}.cloud-submit{width:100%}.memory-entry__meta{display:grid;gap:5px}}@media(prefers-reduced-motion:reduce){.society-cloud:before,.cloud-pulse,.cloud-processing i{animation:none}.source-calendar__day,.source-calendar__arrow,.cloud-add,.cloud-submit,.source-upload,.source-back{transition:none}}
</style>
