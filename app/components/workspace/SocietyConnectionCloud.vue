<script setup lang="ts">
import type {
  SocietyContextEntry,
  SocietyContextResponse,
} from '#shared/types/society-context'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const open = ref(false)
const mode = ref<'text' | 'file'>('text')
const title = ref('')
const content = ref('')
const sourceDate = ref('')
const chapter = ref('')
const relationshipHint = ref('')
const file = ref<File | null>(null)
const busy = ref(false)
const notice = ref('')
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const {
  data,
  pending,
  error: loadError,
  refresh,
} = await useFetch<SocietyContextResponse>('/api/workspace/society-context', { server: false })

const entries = computed(() => data.value?.entries || [])
const sources = computed(() => data.value?.sources || [])
const pendingCount = computed(() => data.value?.pendingCount || 0)
const entryCount = computed(() => entries.value.length)
const sourceCount = computed(() => sources.value.length)

function entryStyle(index: number) {
  const total = Math.max(entryCount.value, 1)
  const angle = (index / total) * 360 - 90
  const radius = props.compact ? 33 : 38
  return { '--node-angle': `${angle}deg`, '--node-radius': `${radius}%` }
}
function entryClass(entry: SocietyContextEntry) {
  return `cloud-node cloud-node--${entry.kind}`
}
function formatDate(value: string | null) {
  if (!value) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(`${value}T12:00:00Z`),
  )
}
function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] || null
  if (file.value && !title.value) title.value = file.value.name.replace(/\.[^.]+$/, '')
}
function resetForm() {
  mode.value = 'text'
  title.value = ''
  content.value = ''
  sourceDate.value = ''
  chapter.value = ''
  relationshipHint.value = ''
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
}
async function submit() {
  if (busy.value) return
  busy.value = true
  notice.value = ''
  error.value = ''
  try {
    let body: FormData | Record<string, unknown>
    if (file.value) {
      const form = new FormData()
      form.append('action', 'submit')
      form.append('title', title.value)
      form.append('sourceDate', sourceDate.value)
      form.append('chapter', chapter.value)
      form.append('relationshipHint', relationshipHint.value)
      form.append('file', file.value)
      body = form
    } else {
      body = {
        action: 'submit',
        title: title.value,
        content: content.value,
        sourceDate: sourceDate.value || null,
        chapter: chapter.value || null,
        relationshipHint: relationshipHint.value || null,
      }
    }
    await $fetch('/api/workspace/society-context', { method: 'POST', body })
    notice.value = 'Added to the society constellation. Agent processing will continue in the background.'
    resetForm()
    await refresh()
    window.setTimeout(() => {
      open.value = false
      notice.value = ''
    }, 1200)
  } catch (cause: any) {
    error.value = cause?.data?.message || cause?.statusMessage || 'This source could not be added. Please retry.'
  } finally {
    busy.value = false
  }
}
let pollTimer: ReturnType<typeof setTimeout> | undefined
async function poll() {
  await refresh()
  if ((data.value?.pendingCount || 0) > 0)
    pollTimer = setTimeout(poll, 4000)
}
watch(pendingCount, (count) => {
  if (pollTimer) clearTimeout(pollTimer)
  if (count > 0) pollTimer = setTimeout(poll, 4000)
}, { immediate: true })
onBeforeUnmount(() => { if (pollTimer) clearTimeout(pollTimer) })
</script>

<template>
  <section class="society-cloud" :class="{ 'society-cloud--compact': props.compact }" aria-labelledby="society-cloud-title">
    <div class="cloud-head">
      <div>
        <p class="cloud-kicker"><span class="cloud-pulse" aria-hidden="true" /> Society memory</p>
        <h2 id="society-cloud-title">An expanding constellation of people, projects, and possibility.</h2>
        <p class="cloud-subtitle">Paste a conversation, add a note, or send a file. The research agent will place the useful context into this shared memory for future opportunity work.</p>
      </div>
      <button class="cloud-add" type="button" :aria-expanded="open" @click="open = !open">
        <span aria-hidden="true">＋</span><span>Add context</span>
      </button>
    </div>

    <Transition name="composer">
      <form v-if="open" class="cloud-composer" @submit.prevent="submit">
        <div class="composer-top"><div><p class="cloud-kicker">New memory</p><h3>Give the agent a thread to follow.</h3></div><span class="composer-orbit" aria-hidden="true" /></div>
        <div class="composer-tabs" role="tablist" aria-label="Source type">
          <button type="button" :class="{ active: mode === 'text' }" role="tab" :aria-selected="mode === 'text'" @click="mode = 'text'">Paste text</button>
          <button type="button" :class="{ active: mode === 'file' }" role="tab" :aria-selected="mode === 'file'" @click="mode = 'file'">Add a file</button>
        </div>
        <label class="cloud-field">A short title<input v-model="title" required maxlength="200" placeholder="UTA professor conversation" /></label>
        <label v-if="mode === 'text'" class="cloud-field">Email chain, notes, or context<textarea v-model="content" required maxlength="8000000" rows="7" placeholder="Paste the conversation or describe what changed…" /></label>
        <label v-else class="file-drop" :class="{ 'file-drop--selected': file }"><input ref="fileInput" type="file" accept="*/*" @change="chooseFile" /><span class="file-drop-icon" aria-hidden="true">↗</span><strong>{{ file ? file.name : 'Drop any source file here' }}</strong><small>{{ file ? `${Math.ceil(file.size / 1024)} KB · ready for processing` : 'PDF, document, image, export, or plain text · up to 6 MB' }}</small></label>
        <div class="cloud-fields-row"><label class="cloud-field">When did this happen?<input v-model="sourceDate" type="date" /></label><label class="cloud-field">Chapter or person<span class="field-optional">optional</span><input v-model="chapter" maxlength="160" placeholder="DFW · Kenji" /></label></div>
        <label class="cloud-field">What should the agent notice?<span class="field-optional">optional</span><input v-model="relationshipHint" maxlength="500" placeholder="They invited a follow-up about imaging methods" /></label>
        <p v-if="error" class="cloud-message cloud-message--error" role="alert">{{ error }}</p><p v-if="notice" class="cloud-message" role="status">{{ notice }}</p>
        <div class="composer-actions"><span class="cloud-muted">It will be queued without blocking this page.</span><button class="cloud-submit" type="submit" :disabled="busy">{{ busy ? 'Queuing…' : 'Add to constellation' }} <span aria-hidden="true">→</span></button></div>
      </form>
    </Transition>

    <div class="cloud-stage" :class="{ 'cloud-stage--empty': !entryCount }" aria-live="polite">
      <div class="cloud-ring cloud-ring--outer" aria-hidden="true" /><div class="cloud-ring cloud-ring--inner" aria-hidden="true" /><div class="cloud-core"><span class="cloud-core-mark">MF</span><strong>{{ entryCount || '—' }}</strong><small>{{ entryCount === 1 ? 'connection' : 'connections' }}</small></div>
      <article v-for="(entry, index) in entries" :key="entry.id" class="cloud-node-wrap" :style="entryStyle(index)"><div :class="entryClass(entry)"><span class="node-kind">{{ entry.kind }}</span><h3>{{ entry.title }}</h3><p>{{ entry.summary || 'Context is being shaped by the research agent.' }}</p><footer><span>{{ formatDate(entry.connectionDate) }}</span><span v-if="entry.chapter">{{ entry.chapter }}</span></footer></div></article>
      <div v-if="!entryCount" class="cloud-empty"><span class="empty-star" aria-hidden="true">✦</span><strong>Your first connection is waiting.</strong><p>Add a conversation, source, or file and the constellation will begin to take shape.</p></div>
    </div>

    <div class="cloud-foot"><span><strong>{{ sourceCount }}</strong> source{{ sourceCount === 1 ? '' : 's' }} captured</span><span v-if="pendingCount" class="cloud-processing"><i aria-hidden="true" /> {{ pendingCount }} processing in background</span><span v-else-if="loadError" class="cloud-muted">Memory cloud is temporarily unavailable.</span><span v-else class="cloud-muted">Every node keeps its source and date.</span></div>
    <div v-if="sources.length" class="cloud-sources"><p class="cloud-kicker">Recent additions</p><div v-for="source in sources.slice(0, 4)" :key="source.id" class="cloud-source"><span class="source-icon" aria-hidden="true">{{ source.kind === 'file' ? '↗' : '〰' }}</span><div><strong>{{ source.title }}</strong><small>{{ source.status === 'processed' ? 'Processed into memory' : source.status === 'failed' ? 'Needs another pass' : 'Queued for the agent' }} · {{ source.sourceDate || source.createdAt.slice(0, 10) }}</small></div><span class="source-status" :class="`source-status--${source.status}`" aria-hidden="true" /></div></div>
  </section>
</template>

<style scoped>
.society-cloud{--ink:#f1eee8;--muted:#aaa8b6;--line:#ffffff18;--gold:#d8b977;--purple:#b8a0ef;position:relative;isolation:isolate;overflow:hidden;padding:clamp(24px,4vw,48px);border:1px solid #ffffff16;border-radius:28px;background:radial-gradient(circle at 80% 10%,#b38ed312,transparent 30%),linear-gradient(145deg,#1a1925e6,#101117f0 70%);box-shadow:0 24px 90px #05050a66,inset 0 1px #ffffff13;color:var(--ink);font-family:Manrope,sans-serif}.society-cloud:before{content:'';position:absolute;inset:0;z-index:-1;opacity:.38;background-image:radial-gradient(circle at 8% 24%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 73% 74%,#d8b977 0 1px,transparent 2px),radial-gradient(circle at 90% 16%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 46% 8%,#b8a0ef 0 1px,transparent 2px);animation:cloud-twinkle 7s ease-in-out infinite alternate}.cloud-head{display:flex;align-items:flex-start;justify-content:space-between;gap:28px;position:relative;z-index:2}.cloud-head h2{max-width:710px;margin:7px 0 10px;font-size:clamp(24px,3vw,42px);line-height:1.05;font-weight:450;letter-spacing:-.045em}.cloud-subtitle{max-width:660px;margin:0;color:var(--muted);font-size:14px;line-height:1.7}.cloud-kicker{margin:0;color:#d6c6e9;font-size:10px;letter-spacing:.18em;text-transform:uppercase}.cloud-pulse{display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 5px #d8b97715,0 0 18px #d8b977aa;animation:pulse 2.6s ease-in-out infinite}.cloud-add,.cloud-submit{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:46px;padding:0 17px;border:1px solid #d8b97766;border-radius:999px;background:#d8b977;color:#1c1820;font:600 12px Manrope,sans-serif;box-shadow:0 8px 30px #d8b97724;cursor:pointer;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,background .3s}.cloud-add span:first-child{font-size:20px;line-height:0}.cloud-add:hover,.cloud-add:focus-visible,.cloud-submit:hover,.cloud-submit:focus-visible{transform:translateY(-2px) scale(1.02);background:#f0dba9;box-shadow:0 12px 40px #d8b97746}.cloud-add:focus-visible,.cloud-submit:focus-visible,.composer-tabs button:focus-visible{outline:2px solid var(--gold);outline-offset:3px}.cloud-composer{position:relative;z-index:3;margin:28px 0 0;padding:24px;border:1px solid #d8b97734;border-radius:22px;background:linear-gradient(135deg,#292436ee,#161721ee);box-shadow:0 18px 70px #08070d99,inset 0 1px #ffffff10}.composer-top{display:flex;justify-content:space-between;align-items:flex-start}.composer-top h3{margin:5px 0 18px;font-size:21px;font-weight:500}.composer-orbit{width:44px;height:44px;border:1px solid #d8b97788;border-radius:50%;box-shadow:0 0 0 6px #d8b9770d,0 0 30px #d8b97744;animation:orbit 6s linear infinite}.composer-tabs{display:flex;gap:8px;margin-bottom:16px}.composer-tabs button{padding:9px 14px;border:1px solid #ffffff16;border-radius:999px;background:#ffffff06;color:var(--muted);font:500 12px Manrope;cursor:pointer}.composer-tabs button.active{border-color:#d8b97766;background:#d8b97716;color:#f1dfb8}.cloud-fields-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cloud-field{display:grid;gap:7px;margin-bottom:13px;color:#d7d2df;font-size:11px;letter-spacing:.03em}.cloud-field input,.cloud-field textarea{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #ffffff18;border-radius:11px;background:#0d0e15aa;color:var(--ink);font:14px Manrope;resize:vertical;transition:border-color .25s,box-shadow .25s}.cloud-field input{min-height:43px}.cloud-field input:focus,.cloud-field textarea:focus{border-color:#d8b97799;outline:0;box-shadow:0 0 0 4px #d8b97712}.field-optional{margin-left:6px;color:#8e899b;font-size:10px}.file-drop{display:grid;place-items:center;gap:6px;min-height:150px;margin-bottom:15px;padding:18px;border:1px dashed #d8b97766;border-radius:16px;background:#d8b97708;color:var(--muted);text-align:center;cursor:pointer;transition:background .25s,border-color .25s,transform .25s}.file-drop:hover,.file-drop--selected{border-color:#d8b977cc;background:#d8b97714;transform:translateY(-1px)}.file-drop input{position:absolute;opacity:0;width:1px;height:1px}.file-drop strong{color:var(--ink);font-size:14px;font-weight:500}.file-drop small{font-size:11px}.file-drop-icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid #d8b97766;border-radius:50%;color:var(--gold);font-size:18px}.composer-actions{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:8px}.cloud-muted{color:#918e9d;font-size:11px}.cloud-submit{min-width:170px}.cloud-submit:disabled{opacity:.55;cursor:wait;transform:none}.cloud-message{margin:7px 0;color:#dbc88d;font-size:12px}.cloud-message--error{color:#ef9d9d}.cloud-stage{position:relative;display:grid;place-items:center;min-height:clamp(430px,54vw,680px);margin:20px -5% -10px;overflow:hidden;border-radius:24px;background:radial-gradient(ellipse at center,#201b31 0,#14151f 34%,transparent 67%)}.cloud-stage:before{content:'';position:absolute;width:62%;height:62%;border-radius:50%;background:radial-gradient(circle,#d8b9770e,transparent 66%);filter:blur(18px);animation:core-breathe 7s ease-in-out infinite alternate}.cloud-ring{position:absolute;border:1px solid #c7afea24;border-radius:50%;transform:rotate(-17deg) scaleY(.58);box-shadow:0 0 30px #a98dde10,inset 0 0 30px #a98dde08}.cloud-ring--outer{width:clamp(300px,60%,650px);aspect-ratio:1}.cloud-ring--inner{width:clamp(210px,40%,440px);aspect-ratio:1;border-color:#d8b97735;animation:ring-spin 22s linear infinite}.cloud-core{position:relative;z-index:1;display:grid;place-items:center;width:122px;height:122px;border:1px solid #d8b97766;border-radius:50%;background:radial-gradient(circle at 30% 25%,#f0dba91e,#161521 68%);box-shadow:0 0 0 10px #d8b97709,0 0 70px #d8b97720,inset 0 1px #ffffff20;text-align:center}.cloud-core-mark{color:#d8b977;font-size:10px;letter-spacing:.2em}.cloud-core strong{margin-top:-3px;font-size:31px;font-weight:400;line-height:.7}.cloud-core small{margin-top:-4px;color:var(--muted);font-size:9px;letter-spacing:.09em;text-transform:uppercase}.cloud-node-wrap{position:absolute;z-index:2;top:50%;left:50%;width:clamp(130px,17vw,200px);transform:translate(-50%,-50%) rotate(var(--node-angle)) translateY(calc(var(--node-radius) * -1)) rotate(calc(var(--node-angle) * -1));transform-origin:center;animation:node-in .6s both cubic-bezier(.22,1,.36,1);animation-delay:calc(var(--node-angle) * .001s + .12s)}.cloud-node{min-height:100px;padding:13px 14px;border:1px solid #ffffff1b;border-radius:15px;background:linear-gradient(145deg,#2a2739e8,#14151eeb);box-shadow:0 13px 38px #05050a70,inset 0 1px #ffffff10;transition:transform .3s,box-shadow .3s,border-color .3s}.cloud-node:hover{transform:translateY(-5px) scale(1.04);border-color:#d8b97788;box-shadow:0 18px 46px #05050aa0,0 0 30px #d8b97717}.node-kind{color:#d8b977;font-size:8px;letter-spacing:.15em;text-transform:uppercase}.cloud-node h3{margin:5px 0 4px;font-size:13px;font-weight:550;line-height:1.2;overflow-wrap:anywhere}.cloud-node p{display:-webkit-box;overflow:hidden;margin:0;color:#aaa8b6;font-size:10px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:3}.cloud-node footer{display:flex;justify-content:space-between;gap:6px;margin-top:9px;color:#8e899b;font-size:8px}.cloud-node--project,.cloud-node--opportunity{border-color:#b8a0ef35}.cloud-node--person,.cloud-node--connection{border-color:#d8b97745}.cloud-empty{position:relative;z-index:1;width:min(280px,70%);text-align:center}.empty-star{display:block;margin-bottom:13px;color:var(--gold);font-size:33px;animation:float 4s ease-in-out infinite}.cloud-empty strong{font-size:15px;font-weight:500}.cloud-empty p{margin:9px 0;color:var(--muted);font-size:12px;line-height:1.6}.cloud-foot{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;padding-top:5px;color:#cfc8d4;font-size:11px}.cloud-foot strong{color:var(--gold);font-weight:500}.cloud-processing{display:inline-flex;align-items:center;gap:6px;color:#d9c8ed}.cloud-processing i{width:7px;height:7px;border-radius:50%;background:var(--purple);box-shadow:0 0 15px #b8a0ef;animation:pulse 1.5s infinite}.cloud-sources{display:grid;gap:9px;margin-top:27px;padding-top:21px;border-top:1px solid #ffffff10}.cloud-source{display:flex;align-items:center;gap:11px;padding:10px 12px;border:1px solid #ffffff0c;border-radius:12px;background:#ffffff03}.source-icon{display:grid;place-items:center;width:27px;height:27px;border:1px solid #d8b97755;border-radius:50%;color:var(--gold);font-size:14px}.cloud-source div{display:grid;gap:4px;min-width:0}.cloud-source strong{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cloud-source small{color:var(--muted);font-size:10px}.source-status{width:7px;height:7px;margin-left:auto;border-radius:50%;background:#8f8c9a}.source-status--queued,.source-status--processing{background:#b8a0ef;box-shadow:0 0 12px #b8a0ef;animation:pulse 1.6s infinite}.source-status--processed{background:#d8b977;box-shadow:0 0 10px #d8b977}.source-status--failed{background:#e88b8b}.society-cloud--compact{padding:24px}.society-cloud--compact .cloud-stage{min-height:390px}.society-cloud--compact .cloud-node-wrap{width:145px}.composer-enter-active,.composer-leave-active{transition:opacity .3s,transform .4s cubic-bezier(.22,1,.36,1);transform-origin:top}.composer-enter-from,.composer-leave-to{opacity:0;transform:translateY(-12px) scale(.98)}@keyframes pulse{50%{opacity:.45;transform:scale(.82)}}@keyframes cloud-twinkle{to{opacity:.7;transform:scale(1.025)}}@keyframes orbit{to{transform:rotate(360deg)}}@keyframes core-breathe{to{transform:scale(1.12);opacity:.75}}@keyframes ring-spin{to{transform:rotate(343deg) scaleY(.58)}}@keyframes node-in{from{opacity:0;transform:translate(-50%,-50%) rotate(var(--node-angle)) translateY(calc(var(--node-radius) * -.76)) rotate(calc(var(--node-angle) * -1)) scale(.7)}}@keyframes float{50%{transform:translateY(-5px) rotate(4deg)}}@media(max-width:720px){.cloud-head{display:grid}.cloud-add{justify-self:start}.cloud-stage{min-height:500px;margin-left:-9%;margin-right:-9%}.cloud-node-wrap{width:125px}.cloud-node{padding:11px}.cloud-node p{font-size:9px}.cloud-node footer{display:none}.cloud-fields-row{grid-template-columns:1fr}.composer-actions{align-items:stretch;flex-direction:column}.cloud-submit{width:100%}}@media(prefers-reduced-motion:reduce){.society-cloud:before,.cloud-pulse,.composer-orbit,.cloud-ring--inner,.cloud-stage:before,.empty-star,.cloud-processing i{animation:none}.cloud-node-wrap{animation:none}.cloud-node,.cloud-add,.cloud-submit{transition:none}}
</style>
