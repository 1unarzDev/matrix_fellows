<script setup lang="ts">
import type { ResearchArtifact, ResearchClaim, ResearchProfilePacket } from '#shared/types/research'
const props = defineProps<{ profileId?: string }>()
const emit = defineEmits<{ updated: [] }>()
const { data, refresh } = await useFetch<{ profile: ResearchProfilePacket; artifacts: ResearchArtifact[]; claims: ResearchClaim[]; providerStatus: string }>('/api/workspace/research-profile')
const url = ref(''), contribution = ref(''), relationship = ref<'interest' | 'created' | 'contributed'>('interest')
const projectFacts = computed(() => data.value?.claims.filter(c => c.origin === 'source' && ['project_method', 'project_question'].includes(c.predicate) && !c.withdrawn_at && c.adoption !== 'rejected') || [])
function sourceUrl(claim: ResearchClaim) { return data.value?.artifacts.find(a => a.id === claim.artifact_id)?.canonical_url }
const busy = ref(false), message = ref('')
type PendingLink = { id: string; canonical_url: string; relationship: 'interest' | 'created' | 'contributed'; contribution: string; state: 'processing'; summary: string; error_code?: string }
const pendingLinks = ref<PendingLink[]>([])
const savingLink = computed(() => pendingLinks.value.length > 0)
const displayArtifacts = computed(() => [...pendingLinks.value, ...(data.value?.artifacts || [])])
const editingId = ref(''), editedStatement = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
async function poll() {
  if (data.value?.artifacts.some(a => ['pending', 'processing'].includes(a.state) && a.error_code !== 'quota_waiting')) {
    await refresh()
    timer = setTimeout(poll, 3000)
  }
}
watch(() => data.value?.artifacts.some(a => ['pending', 'processing'].includes(a.state) && a.error_code !== 'quota_waiting'), pending => { if (timer) clearTimeout(timer); if (pending) timer = setTimeout(poll, 3000) }, { immediate: true })
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
function pendingId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function add() {
  if (!url.value.trim()) return
  const submittedUrl = url.value.trim()
  const submittedRelationship = relationship.value
  const submittedContribution = contribution.value.trim()
  const localId = pendingId()
  // Put the link into the visible queue before the request starts. This keeps the
  // research page responsive while acquisition and extraction happen in the background.
  pendingLinks.value.unshift({
    id: localId,
    canonical_url: submittedUrl,
    relationship: submittedRelationship,
    contribution: submittedContribution,
    state: 'processing',
    summary: 'Queued — source metadata is being gathered…',
  })
  url.value = ''
  contribution.value = ''
  message.value = 'Research link queued. You can keep working while we process it.'
  void (async () => {
    try {
      await $fetch('/api/workspace/research-profile/artifacts', {
        method: 'POST',
        body: { url: submittedUrl, relationship: submittedRelationship, contribution: submittedContribution },
      })
      pendingLinks.value = pendingLinks.value.filter(link => link.id !== localId)
      await refresh()
      emit('updated')
      message.value = 'Research link saved. We’ll surface its evidence here as it becomes ready.'
    } catch {
      pendingLinks.value = pendingLinks.value.filter(link => link.id !== localId)
      message.value = 'The link could not be saved. Check that it is a public HTTPS link and retry.'
    }
  })()
}
async function correct(claim: ResearchClaim, action: string) {
  busy.value = true
  try { await $fetch('/api/workspace/research-profile/corrections', { method: 'POST', body: { claimId: claim.id, action, ...(action === 'edit' ? { statement: editedStatement.value } : {}) } }); editingId.value = ''; await refresh(); emit('updated') }
  catch { message.value = 'The correction could not be saved. Please retry.' }
  finally { busy.value = false }
}
async function retry(id: string) { busy.value = true; try { await $fetch('/api/workspace/research-profile/retry', { method: 'POST', body: { artifactId: id } }); await refresh() } finally { busy.value = false } }
</script>
<template>
  <section class="research-overview" aria-labelledby="research-overview-title">
    <h2 id="research-overview-title">Your research overview</h2>
    <p v-if="data">{{ data.profile.displayName }}<span v-if="data.profile.declaredInterests.length"> · {{ data.profile.declaredInterests.join(', ') }}</span></p>
    <p v-if="data?.profile.goals">{{ data.profile.goals }}</p>
    <p>Your declared interests and goals are self-reported. A research link can be your work, a contribution, or something you want to explore.</p>
    <form @submit.prevent="add">
      <label> Add your research <input v-model="url" type="url" required placeholder="https://github.com/team/project"  /></label>
      <label>Your connection <select v-model="relationship"><option value="interest">I am interested in this</option><option value="contributed">I contributed</option><option value="created">I created this</option></select></label>
      <label v-if="relationship !== 'interest'">What was your contribution? <textarea v-model="contribution" maxlength="1500" placeholder="Describe your own role; team work remains separately attributed." /></label>
      <button class="research-add" :class="{ 'research-add--queued': savingLink }" :disabled="!url" type="submit"><span class="research-add__icon" aria-hidden="true">✦</span>{{ savingLink ? 'Queue another link' : 'Add research link' }}</button>
    </form>
    <p role="status">{{ message }}</p>
    <TransitionGroup v-if="displayArtifacts.length" name="research-artifact" tag="ul">
      <li v-for="artifact in displayArtifacts" :key="artifact.id" :class="{ 'research-artifact--pending': artifact.id.startsWith('pending-') }">
        <a :href="artifact.canonical_url" target="_blank" rel="noopener noreferrer">{{ artifact.canonical_url }}</a>
        <p>{{ artifact.summary || 'Processing source metadata…' }}</p>
        <small>{{ artifact.state }} · {{ artifact.relationship === 'interest' ? 'Interest only' : 'Contribution self-reported' }}</small>
        <span v-if="artifact.id.startsWith('pending-')" class="research-artifact__pulse" aria-label="Processing in background"><i /><i /><i /></span>
        <button v-if="!artifact.id.startsWith('pending-') && ((artifact.state === 'failed' && artifact.error_code !== 'attempts_exhausted') || artifact.error_code === 'quota_waiting')" :disabled="busy" @click="retry(artifact.id)">Retry acquisition</button>
      </li>
    </TransitionGroup>
    <div v-for="claim in data?.claims.filter(c => !c.withdrawn_at && c.predicate === 'contribution')" :key="claim.id" class="research-claim"><p>{{ claim.statement }}</p><small>{{ claim.support_state === 'self_reported' ? 'Self-reported contribution' : claim.support_state }}</small><form v-if="editingId === claim.id" @submit.prevent="correct(claim, 'edit')"><label>Edit your contribution<textarea v-model="editedStatement" maxlength="1500" required /></label><button :disabled="busy">Save correction</button><button type="button" @click="editingId = ''">Cancel</button></form><div><button :disabled="busy" @click="editingId = claim.id; editedStatement = claim.statement">Edit</button><button :disabled="busy" @click="correct(claim, 'interest')">Only an interest</button><button :disabled="busy" @click="correct(claim, 'wrong_attribution')">Wrong attribution</button><button :disabled="busy" @click="correct(claim, claim.sharing_scope === 'officer' ? 'exclude' : 'share')">{{ claim.sharing_scope === 'officer' ? 'Exclude from society proposals' : 'Share with officers for proposals' }}</button></div></div>
    <section v-if="projectFacts.length" aria-labelledby="project-source-facts">
      <h3 id="project-source-facts">What your linked projects describe</h3>
      <p>These source statements describe the project. They do not establish your contribution or skill level.</p>
      <div v-for="claim in projectFacts" :key="claim.id" class="research-claim">
        <p><strong>{{ claim.predicate === 'project_question' ? 'Research question or goal' : 'Project method' }}</strong></p>
        <blockquote>{{ claim.statement }}</blockquote>
        <small>{{ claim.adoption === 'candidate' ? 'Suggested project fact' : 'Accepted project fact' }} · <a v-if="sourceUrl(claim)" :href="sourceUrl(claim)" target="_blank" rel="noopener noreferrer">{{ claim.provenance?.section || 'Source' }}</a> · snapshot {{ claim.snapshot_id?.slice(0, 8) }}</small>
        <div><button v-if="claim.adoption === 'candidate'" :disabled="busy" @click="correct(claim, 'accept')">Keep project fact</button><button :disabled="busy" @click="correct(claim, 'reject')">Dismiss or correct attribution</button><button v-if="claim.adoption === 'accepted'" :disabled="busy" @click="correct(claim, claim.sharing_scope === 'officer' ? 'exclude' : 'share')">{{ claim.sharing_scope === 'officer' ? 'Exclude from society proposals' : 'Share project context with officers' }}</button></div>
      </div>
      <h3>Useful next steps</h3>
      <p>Which method did you personally use, or which question would you like to explore? Add only your own contribution above.</p>
      <p>A small reproduction, comparison, or focused feedback question can support an honest inquiry. Time, data access, and supervision remain unconfirmed.</p>
    </section>
    <p class="research-status">{{ data?.providerStatus }}</p>
    <p v-if="!displayArtifacts.length">No work sample is required. Your interests can support a thoughtful learning or feedback inquiry.</p>
  </section>
</template>
<style scoped>
.research-overview{padding:1rem;border:1px solid var(--color-border,#d5d5d5);border-radius:12px;margin-bottom:1rem}.research-overview h2{font-size:1.2rem;font-weight:600}.research-overview p{margin:.7rem 0}.research-overview form{display:grid;gap:.75rem}.research-overview label{display:grid;gap:.3rem}.research-overview input,.research-overview select,.research-overview textarea{min-height:44px;padding:.6rem;border:1px solid #999;border-radius:6px;background:transparent;width:100%;max-width:100%;color:inherit}.research-overview button{min-height:44px;padding:.45rem .75rem;border:1px solid #999;border-radius:6px;margin:.25rem .25rem .25rem 0}.research-overview li{padding:.75rem 0;overflow-wrap:anywhere}.research-status,.research-overview small{opacity:.75}.research-claim{padding:.6rem 0;border-top:1px solid #ccc}
.research-add{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-color:color-mix(in srgb,#d8b977 60%,#999);background:linear-gradient(110deg,rgb(216 185 119 / 20%),rgb(185 163 237 / 14%));transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s,background .35s}.research-add:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 24px rgb(216 185 119 / 16%);background:linear-gradient(110deg,rgb(216 185 119 / 30%),rgb(185 163 237 / 21%))}.research-add--queued{cursor:wait}.research-add__icon{color:#d8b977;font-size:1rem}.research-artifact-enter-active,.research-artifact-leave-active{transition:opacity .4s ease,transform .4s cubic-bezier(.2,.8,.2,1)}.research-artifact-enter-from,.research-artifact-leave-to{opacity:0;transform:translateY(-10px) scale(.98)}.research-artifact--pending{position:relative;border-color:rgb(216 185 119 / 38%);background:linear-gradient(100deg,rgb(216 185 119 / 8%),rgb(185 163 237 / 5%));animation:research-pending-glow 2.8s ease-in-out infinite}.research-artifact__pulse{display:inline-flex;gap:3px;margin-left:.4rem;vertical-align:middle}.research-artifact__pulse i{display:block;width:4px;height:4px;border-radius:50%;background:#d8b977;animation:research-dot 1.2s ease-in-out infinite}.research-artifact__pulse i:nth-child(2){animation-delay:.16s}.research-artifact__pulse i:nth-child(3){animation-delay:.32s}@keyframes research-pending-glow{0%,100%{box-shadow:0 0 0 rgb(216 185 119 / 0%)}50%{box-shadow:0 0 24px rgb(216 185 119 / 12%)}}@keyframes research-dot{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}@media (prefers-reduced-motion:reduce){.research-add,.research-artifact-enter-active,.research-artifact-leave-active{transition:none}.research-artifact--pending,.research-artifact__pulse i{animation:none}}
</style>
