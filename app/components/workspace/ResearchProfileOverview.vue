<script setup lang="ts">
import type { ResearchArtifact, ResearchClaim, ResearchProfilePacket } from '#shared/types/research'
const props = defineProps<{ profileId?: string }>()
const emit = defineEmits<{ updated: [] }>()
const { data, refresh } = await useFetch<{
  profile: ResearchProfilePacket
  artifacts: ResearchArtifact[]
  claims: ResearchClaim[]
  providerStatus: string
}>('/api/workspace/research-profile')
const url = ref(''),
  contribution = ref(''),
  relationship = ref<'interest' | 'created' | 'contributed'>('interest')
const relationshipOptions = [
  {
    value: 'interest',
    label: 'I’m exploring it',
    description: 'Keep the link as an interest or reference',
  },
  {
    value: 'contributed',
    label: 'I contributed',
    description: 'Describe your role below if useful',
  },
  { value: 'created', label: 'I created it', description: 'Describe what you built or led below' },
]
const projectFacts = computed(
  () =>
    data.value?.claims.filter(
      (c) =>
        c.origin === 'source' &&
        ['project_method', 'project_question'].includes(c.predicate) &&
        !c.withdrawn_at &&
        c.adoption !== 'rejected',
    ) || [],
)
function sourceUrl(claim: ResearchClaim) {
  return data.value?.artifacts.find((a) => a.id === claim.artifact_id)?.canonical_url
}
const busy = ref(false),
  message = ref('')
type PendingLink = {
  id: string
  canonical_url: string
  relationship: 'interest' | 'created' | 'contributed'
  contribution: string
  state: 'processing'
  summary: string
  error_code?: string
}
const pendingLinks = ref<PendingLink[]>([])
const savingLink = computed(() => pendingLinks.value.length > 0)
const displayArtifacts = computed(() => [...pendingLinks.value, ...(data.value?.artifacts || [])])
const editingId = ref(''),
  editedStatement = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
async function poll() {
  if (
    data.value?.artifacts.some(
      (a) => ['pending', 'processing'].includes(a.state) && a.error_code !== 'quota_waiting',
    )
  ) {
    await refresh()
    timer = setTimeout(poll, 3000)
  }
}
watch(
  () =>
    data.value?.artifacts.some(
      (a) => ['pending', 'processing'].includes(a.state) && a.error_code !== 'quota_waiting',
    ),
  (pending) => {
    if (timer) clearTimeout(timer)
    if (pending) timer = setTimeout(poll, 3000)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
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
        body: {
          url: submittedUrl,
          relationship: submittedRelationship,
          contribution: submittedContribution,
        },
      })
      pendingLinks.value = pendingLinks.value.filter((link) => link.id !== localId)
      await refresh()
      emit('updated')
      message.value = 'Research link saved. We’ll surface its evidence here as it becomes ready.'
    } catch {
      pendingLinks.value = pendingLinks.value.filter((link) => link.id !== localId)
      message.value = 'The link could not be saved. Check that it is a public HTTPS link and retry.'
    }
  })()
}
async function correct(claim: ResearchClaim, action: string) {
  busy.value = true
  try {
    await $fetch('/api/workspace/research-profile/corrections', {
      method: 'POST',
      body: {
        claimId: claim.id,
        action,
        ...(action === 'edit' ? { statement: editedStatement.value } : {}),
      },
    })
    editingId.value = ''
    await refresh()
    emit('updated')
  } catch {
    message.value = 'The correction could not be saved. Please retry.'
  } finally {
    busy.value = false
  }
}
async function retry(id: string) {
  busy.value = true
  try {
    await $fetch('/api/workspace/research-profile/retry', {
      method: 'POST',
      body: { artifactId: id },
    })
    await refresh()
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="research-overview" aria-labelledby="research-overview-title">
    <header class="research-overview__header">
      <div>
        <p class="research-overview__eyebrow">Research context</p>
        <h2 id="research-overview-title">{{ data?.profile.displayName || 'Your profile' }}</h2>
        <p class="research-overview__summary">
          {{
            data?.profile.goals ||
            'Add a public project, paper, repository, poster, or portfolio to get started.'
          }}
        </p>
      </div>
      <span class="research-overview__badge"
        ><i aria-hidden="true"></i
        >{{
          data?.artifacts.length
            ? `${data.artifacts.length} source${data.artifacts.length === 1 ? '' : 's'}`
            : 'Ready to add'
        }}</span
      >
    </header>
    <div class="research-overview__context" v-if="data?.profile.declaredInterests.length">
      <span v-for="interest in data.profile.declaredInterests.slice(0, 5)" :key="interest">{{
        interest
      }}</span>
    </div>
    <form class="research-capture" @submit.prevent="add">
      <label class="research-capture__url"
        ><span>Add one research link</span
        ><input v-model="url" type="url" required placeholder="https://github.com/team/project"
      /></label>
      <div class="research-capture__row">
        <div class="research-capture__relationship">
          <span>How does it relate to you?</span
          ><ThemedSelect
            v-model="relationship"
            label="How does it relate to you?"
            :options="relationshipOptions"
            full-width
          />
        </div>
        <button
          class="research-add"
          :class="{ 'research-add--queued': savingLink }"
          :disabled="!url"
          type="submit"
        >
          <span class="research-add__icon" aria-hidden="true">✦</span
          >{{ savingLink ? 'Queue another' : 'Add link' }}
        </button>
      </div>
      <label v-if="relationship !== 'interest'" class="research-capture__contribution"
        ><span>Your contribution <small>optional detail</small></span
        ><textarea
          v-model="contribution"
          maxlength="1500"
          rows="2"
          placeholder="A short note about your role; team work remains separately attributed."
        />
      </label>
    </form>
    <p v-if="message" role="status" class="research-overview__message">{{ message }}</p>
    <TransitionGroup v-if="displayArtifacts.length" name="research-artifact" tag="ul">
      <li
        v-for="artifact in displayArtifacts"
        :key="artifact.id"
        :class="{ 'research-artifact--pending': artifact.id.startsWith('pending-') }"
      >
        <div class="research-artifact__main">
          <span class="research-artifact__mark" aria-hidden="true">↗</span>
          <div>
            <a :href="artifact.canonical_url" target="_blank" rel="noopener noreferrer">{{
              artifact.canonical_url
            }}</a>
            <p>{{ artifact.summary || 'Processing source metadata…' }}</p>
          </div>
        </div>
        <small
          >{{ artifact.state }} ·
          {{
            artifact.relationship === 'interest' ? 'Exploring' : 'Contribution self-reported'
          }}</small
        >
        <span
          v-if="artifact.id.startsWith('pending-')"
          class="research-artifact__pulse"
          aria-label="Processing in background"
          ><i /><i /><i
        /></span>
        <button
          v-if="
            !artifact.id.startsWith('pending-') &&
            ((artifact.state === 'failed' && artifact.error_code !== 'attempts_exhausted') ||
              artifact.error_code === 'quota_waiting')
          "
          :disabled="busy"
          @click="retry(artifact.id)"
        >
          Retry acquisition
        </button>
      </li>
    </TransitionGroup>
    <details
      v-if="data?.claims.some((c) => !c.withdrawn_at && c.predicate === 'contribution')"
      class="research-details"
    >
      <summary>
        Your attributed contributions
        <span>{{
          data.claims.filter((c) => !c.withdrawn_at && c.predicate === 'contribution').length
        }}</span>
      </summary>
      <div
        v-for="claim in data?.claims.filter(
          (c) => !c.withdrawn_at && c.predicate === 'contribution',
        )"
        :key="claim.id"
        class="research-claim"
      >
        <p>{{ claim.statement }}</p>
        <small>{{
          claim.support_state === 'self_reported'
            ? 'Self-reported contribution'
            : claim.support_state
        }}</small>
        <form v-if="editingId === claim.id" @submit.prevent="correct(claim, 'edit')">
          <label
            >Edit your contribution<textarea
              v-model="editedStatement"
              maxlength="1500"
              required
            /></label
          ><button :disabled="busy">Save correction</button
          ><button type="button" @click="editingId = ''">Cancel</button>
        </form>
        <div>
          <button
            :disabled="busy"
            @click="
              editingId = claim.id
              editedStatement = claim.statement
            "
          >
            Edit</button
          ><button :disabled="busy" @click="correct(claim, 'interest')">Only an interest</button
          ><button :disabled="busy" @click="correct(claim, 'wrong_attribution')">
            Wrong attribution</button
          ><button
            :disabled="busy"
            @click="correct(claim, claim.sharing_scope === 'officer' ? 'exclude' : 'share')"
          >
            {{
              claim.sharing_scope === 'officer'
                ? 'Exclude from society proposals'
                : 'Share with officers for proposals'
            }}
          </button>
        </div>
      </div>
    </details>
    <section v-if="projectFacts.length" aria-labelledby="project-source-facts">
      <h3 id="project-source-facts">What linked sources describe</h3>
      <p>These are project facts, not automatic proof of your contribution or skill level.</p>
      <div v-for="claim in projectFacts" :key="claim.id" class="research-claim">
        <p>
          <strong>{{
            claim.predicate === 'project_question' ? 'Research question or goal' : 'Project method'
          }}</strong>
        </p>
        <blockquote>{{ claim.statement }}</blockquote>
        <small
          >{{
            claim.adoption === 'candidate' ? 'Suggested project fact' : 'Accepted project fact'
          }}
          ·
          <a
            v-if="sourceUrl(claim)"
            :href="sourceUrl(claim)"
            target="_blank"
            rel="noopener noreferrer"
            >{{ claim.provenance?.section || 'Source' }}</a
          >
          · snapshot {{ claim.snapshot_id?.slice(0, 8) }}</small
        >
        <div>
          <button
            v-if="claim.adoption === 'candidate'"
            :disabled="busy"
            @click="correct(claim, 'accept')"
          >
            Keep project fact</button
          ><button :disabled="busy" @click="correct(claim, 'reject')">
            Dismiss or correct attribution</button
          ><button
            v-if="claim.adoption === 'accepted'"
            :disabled="busy"
            @click="correct(claim, claim.sharing_scope === 'officer' ? 'exclude' : 'share')"
          >
            {{
              claim.sharing_scope === 'officer'
                ? 'Exclude from society proposals'
                : 'Share project context with officers'
            }}
          </button>
        </div>
      </div>
      <p class="research-overview__hint">
        Add a contribution note only when you are ready. A focused question is enough to start an
        honest inquiry.
      </p>
    </section>
    <p v-if="!displayArtifacts.length" class="research-overview__empty">
      No work sample is required. Start with a link or keep your profile interest-based.
    </p>
  </section>
</template>
<style scoped>
.research-overview {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: clamp(22px, 4vw, 36px);
  border: 1px solid rgb(244 241 233 / 12%);
  border-radius: 24px;
  background: linear-gradient(145deg, rgb(244 241 233 / 2%), transparent 72%), rgb(18 19 26 / 36%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 7%),
    0 18px 58px rgb(0 0 0 / 15%);
  -webkit-backdrop-filter: blur(24px) saturate(116%);
  backdrop-filter: blur(24px) saturate(116%);
}
.research-overview::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: url('/textures/glass-grain.svg') repeat;
  opacity: 0.025;
  mix-blend-mode: soft-light;
}
.research-overview__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.research-overview__eyebrow,
.profile-disclosure__eyebrow {
  margin: 0;
  color: #d8b977;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.research-overview h2 {
  margin: 7px 0 5px;
  color: #efeee8;
  font:
    500 clamp(23px, 3vw, 32px)/1.15 Manrope,
    sans-serif;
  letter-spacing: -0.05em;
}
.research-overview__summary {
  max-width: 62ch;
  margin: 0;
  color: #aaa8b1;
  font-size: 13px;
  line-height: 1.7;
}
.research-overview__badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  padding: 8px 11px;
  border: 1px solid rgb(228 187 114 / 22%);
  border-radius: 999px;
  color: #dfc88f;
  background: rgb(228 187 114 / 6%);
  font-size: 10px;
  white-space: nowrap;
}
.research-overview__badge i,
.profile-hero__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d8b977;
  box-shadow: 0 0 13px rgb(216 185 119 / 80%);
}
.research-overview__context {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 20px;
}
.research-overview__context span {
  padding: 6px 9px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 999px;
  color: #c7bdcd;
  background: rgb(255 255 255 / 3%);
  font-size: 10px;
}
.research-capture {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}
.research-capture label,
.research-capture__relationship {
  display: grid;
  gap: 7px;
  color: #d9d3df;
  font-size: 11px;
}
.research-capture__relationship :deep(.themed-select__trigger) {
  border-color: rgb(216 185 119 / 22%);
  background: rgb(244 241 233 / 3%);
  color: #efeee8;
}
.research-capture__relationship :deep(.themed-select__trigger:hover),
.research-capture__relationship :deep(.themed-select__trigger[aria-expanded='true']) {
  border-color: rgb(216 185 119 / 52%);
  background: rgb(216 185 119 / 7%);
  box-shadow: 0 9px 28px rgb(0 0 0 / 16%);
}
.research-capture__relationship :deep(.themed-select__menu) {
  border-color: rgb(216 185 119 / 24%);
  background: rgb(18 19 26 / 94%);
  box-shadow:
    0 18px 55px rgb(0 0 0 / 42%),
    inset 0 1px rgb(255 255 255 / 6%);
}
.research-capture__relationship :deep(.themed-select__option:hover),
.research-capture__relationship :deep(.themed-select__option:focus-visible),
.research-capture__relationship :deep(.themed-select__option[class*='bg-acid']) {
  background: rgb(216 185 119 / 10%);
  color: #e4bb72;
}
.research-capture label > span {
  letter-spacing: 0.02em;
}
.research-capture label small {
  color: #8e899b;
  font-size: 10px;
}
.research-capture input,
.research-capture textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 12px;
  color: #efeee8;
  background: rgb(255 255 255 / 2%);
  padding: 11px 12px;
  font:
    12px/1.5 Manrope,
    sans-serif;
  transition:
    border-color 0.25s,
    box-shadow 0.25s,
    background-color 0.25s;
}
.research-capture textarea {
  resize: vertical;
}
.research-capture input:focus,
.research-capture textarea:focus {
  outline: none;
  border-color: rgb(228 187 114 / 60%);
  background: rgb(255 255 255 / 6%);
  box-shadow: 0 0 0 4px rgb(228 187 114 / 7%);
}
.research-capture__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 12px;
}
.research-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  padding: 0 17px;
  border: 1px solid rgb(228 187 114 / 48%);
  border-radius: 999px;
  color: #15131a;
  background: #e4bb72;
  box-shadow: 0 8px 24px rgb(228 187 114 / 10%);
  font:
    600 11px Manrope,
    sans-serif;
  cursor: pointer;
  transition:
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.35s,
    background-color 0.35s;
}
.research-add:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 13px 32px rgb(228 187 114 / 20%);
  background: #efd18e;
}
.research-add:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}
.research-add--queued {
  cursor: wait;
}
.research-add__icon {
  font-size: 15px;
}
.research-overview__message {
  margin: 12px 0 0;
  color: #dbc88d;
  font-size: 11px;
}
.research-overview ul {
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}
.research-overview li {
  position: relative;
  display: grid;
  gap: 9px;
  padding: 14px 0;
  border-top: 1px solid rgb(255 255 255 / 9%);
}
.research-artifact__main {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  min-width: 0;
}
.research-artifact__mark {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 25px;
  height: 25px;
  border: 1px solid rgb(228 187 114 / 30%);
  border-radius: 50%;
  color: #e4bb72;
  font-size: 13px;
}
.research-overview li a {
  overflow-wrap: anywhere;
  color: #ded1ac;
  font-size: 12px;
  text-decoration: none;
}
.research-overview li a:hover {
  color: #fff0c5;
}
.research-overview li p {
  margin: 4px 0 0;
  color: #aaa3b2;
  font-size: 11px;
  line-height: 1.55;
}
.research-overview li small {
  color: #8e899b;
  font-size: 10px;
}
.research-overview li > button,
.research-claim button {
  width: fit-content;
  border: 1px solid rgb(228 187 114 / 27%);
  border-radius: 999px;
  padding: 7px 10px;
  color: #d8b977;
  background: transparent;
  font:
    10px Manrope,
    sans-serif;
  cursor: pointer;
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.25s,
    border-color 0.25s,
    box-shadow 0.3s;
}
.research-overview li > button:hover,
.research-claim button:hover {
  transform: translateY(-1px);
  border-color: rgb(228 187 114 / 50%);
  background: rgb(228 187 114 / 8%);
  box-shadow: 0 7px 20px rgb(0 0 0 / 12%);
}
.research-overview li > button:active,
.research-claim button:active {
  transform: translateY(0) scale(0.98);
}
.research-overview li > button:focus-visible,
.research-claim button:focus-visible {
  outline: 2px solid rgb(228 187 114 / 65%);
  outline-offset: 3px;
}
.research-artifact__pulse {
  position: absolute;
  right: 0;
  top: 17px;
  display: inline-flex;
  gap: 3px;
}
.research-artifact__pulse i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #d8b977;
  animation: research-dot 1.2s ease-in-out infinite;
}
.research-artifact__pulse i:nth-child(2) {
  animation-delay: 0.16s;
}
.research-artifact__pulse i:nth-child(3) {
  animation-delay: 0.32s;
}
.research-details {
  margin-top: 18px;
  border-top: 1px solid rgb(255 255 255 / 9%);
}
.research-details summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0 4px;
  color: #d7c7a0;
  cursor: pointer;
  font-size: 12px;
  transition:
    color 0.25s,
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.research-details summary:hover {
  color: #f0dfb4;
  transform: translateX(2px);
}
.research-details summary:focus-visible {
  outline: 2px solid rgb(228 187 114 / 65%);
  outline-offset: 4px;
  border-radius: 6px;
}
.research-details summary span {
  color: #91899c;
  font-size: 10px;
}
.research-claim {
  padding: 13px 0;
  border-top: 1px solid rgb(255 255 255 / 8%);
}
.research-claim p {
  margin: 0;
  color: #c8c0ce;
  font-size: 12px;
  line-height: 1.6;
}
.research-claim small {
  display: block;
  margin-top: 6px;
  color: #8e899b;
  font-size: 10px;
}
.research-claim > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}
.research-claim form {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.research-claim form label {
  display: grid;
  gap: 5px;
  color: #aaa3b2;
  font-size: 11px;
}
.research-claim textarea {
  min-height: 68px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 10px;
  padding: 8px;
  color: #efeee8;
  background: rgb(9 11 15 / 74%);
}
.research-overview section[aria-labelledby='project-source-facts'] {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgb(255 255 255 / 9%);
}
.research-overview section[aria-labelledby='project-source-facts'] h3 {
  margin: 0 0 6px;
  color: #e6d7b4;
  font-size: 14px;
  font-weight: 500;
}
.research-overview section[aria-labelledby='project-source-facts'] > p {
  margin: 0;
  color: #aaa3b2;
  font-size: 11px;
  line-height: 1.6;
}
.research-overview blockquote {
  margin: 8px 0 0;
  padding-left: 11px;
  border-left: 2px solid rgb(216 185 119 / 32%);
  color: #c6bbcb;
  font-size: 11px;
  line-height: 1.6;
}
.research-overview__hint {
  margin: 16px 0 0 !important;
  color: #9c94a4 !important;
}
.research-overview__empty {
  margin: 17px 0 0;
  color: #98909f;
  font-size: 11px;
}
@keyframes research-dot {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
@media (max-width: 620px) {
  .research-overview__header {
    display: grid;
    gap: 14px;
  }
  .research-overview__badge {
    width: fit-content;
  }
  .research-capture__row {
    grid-template-columns: 1fr;
  }
  .research-add {
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .research-add,
  .research-capture input,
  .research-capture textarea,
  .research-overview li > button,
  .research-claim button,
  .research-details summary {
    transition: none;
  }
  .research-artifact__pulse i {
    animation: none;
  }
}
</style>
