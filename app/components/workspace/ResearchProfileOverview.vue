<script setup lang="ts">
import type { ResearchArtifact, ResearchClaim, ResearchProfilePacket } from '#shared/types/research'
const props = defineProps<{ profileId?: string }>()
const emit = defineEmits<{ updated: [] }>()
const { data, refresh } = await useFetch<{ profile: ResearchProfilePacket; artifacts: ResearchArtifact[]; claims: ResearchClaim[]; providerStatus: string }>('/api/workspace/research-profile')
const url = ref(''), contribution = ref(''), relationship = ref<'interest' | 'created' | 'contributed'>('interest')
const busy = ref(false), message = ref('')
const editingId = ref(''), editedStatement = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
async function poll() {
  if (data.value?.artifacts.some(a => ['pending', 'processing'].includes(a.state))) {
    await refresh()
    timer = setTimeout(poll, 3000)
  }
}
watch(() => data.value?.artifacts.some(a => ['pending', 'processing'].includes(a.state)), pending => { if (timer) clearTimeout(timer); if (pending) timer = setTimeout(poll, 3000) }, { immediate: true })
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
async function add() {
  busy.value = true; message.value = ''
  try { await $fetch('/api/workspace/research-profile/artifacts', { method: 'POST', body: { url: url.value, relationship: relationship.value, contribution: contribution.value } }); url.value = ''; contribution.value = ''; await refresh(); emit('updated') }
  catch { message.value = 'The link could not be saved. Check that it is a public HTTPS link and retry.' }
  finally { busy.value = false }
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
      <label> Add your research <input v-model="url" type="url" required placeholder="https://github.com/team/project" :disabled="busy" /></label>
      <label>Your connection <select v-model="relationship"><option value="interest">I am interested in this</option><option value="contributed">I contributed</option><option value="created">I created this</option></select></label>
      <label v-if="relationship !== 'interest'">What was your contribution? <textarea v-model="contribution" maxlength="1500" placeholder="Describe your own role; team work remains separately attributed." /></label>
      <button :disabled="busy || !url" type="submit">{{ busy ? 'Saving…' : 'Add research link' }}</button>
    </form>
    <p role="status">{{ message }}</p>
    <ul v-if="data?.artifacts.length"><li v-for="artifact in data.artifacts" :key="artifact.id"><a :href="artifact.canonical_url" target="_blank" rel="noopener noreferrer">{{ artifact.canonical_url }}</a><p>{{ artifact.summary || 'Processing source metadata…' }}</p><small>{{ artifact.state }} · {{ artifact.relationship === 'interest' ? 'Interest only' : 'Contribution self-reported' }}</small><button v-if="artifact.state === 'failed'" :disabled="busy" @click="retry(artifact.id)">Retry acquisition</button></li></ul>
    <div v-for="claim in data?.claims.filter(c => !c.withdrawn_at && c.predicate === 'contribution')" :key="claim.id" class="research-claim"><p>{{ claim.statement }}</p><small>{{ claim.support_state === 'self_reported' ? 'Self-reported contribution' : claim.support_state }}</small><form v-if="editingId === claim.id" @submit.prevent="correct(claim, 'edit')"><label>Edit your contribution<textarea v-model="editedStatement" maxlength="1500" required /></label><button :disabled="busy">Save correction</button><button type="button" @click="editingId = ''">Cancel</button></form><div><button :disabled="busy" @click="editingId = claim.id; editedStatement = claim.statement">Edit</button><button :disabled="busy" @click="correct(claim, 'interest')">Only an interest</button><button :disabled="busy" @click="correct(claim, 'wrong_attribution')">Wrong attribution</button><button :disabled="busy" @click="correct(claim, claim.sharing_scope === 'officer' ? 'exclude' : 'share')">{{ claim.sharing_scope === 'officer' ? 'Exclude from society proposals' : 'Share with officers for proposals' }}</button></div></div>
    <p class="research-status">{{ data?.providerStatus }}</p>
    <p v-if="!data?.artifacts.length">No work sample is required. Your interests can support a thoughtful learning or feedback inquiry.</p>
  </section>
</template>
<style scoped>
.research-overview{padding:1rem;border:1px solid var(--color-border,#d5d5d5);border-radius:12px;margin-bottom:1rem}.research-overview h2{font-size:1.2rem;font-weight:600}.research-overview p{margin:.7rem 0}.research-overview form{display:grid;gap:.75rem}.research-overview label{display:grid;gap:.3rem}.research-overview input,.research-overview select,.research-overview textarea{min-height:44px;padding:.6rem;border:1px solid #999;border-radius:6px;background:transparent;width:100%;max-width:100%;color:inherit}.research-overview button{min-height:44px;padding:.45rem .75rem;border:1px solid #999;border-radius:6px;margin:.25rem .25rem .25rem 0}.research-overview li{padding:.75rem 0;overflow-wrap:anywhere}.research-status,.research-overview small{opacity:.75}.research-claim{padding:.6rem 0;border-top:1px solid #ccc}
</style>
