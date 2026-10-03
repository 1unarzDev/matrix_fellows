<script setup lang="ts">
import type { OutreachProfile, OutreachProposal, OutreachTarget } from '#shared/types/outreach'
import type { OutreachPlannerItem } from '#shared/types/outreach'
import { outreachPriority } from '#shared/utils/outreach'
import { proposalStyles } from '#shared/utils/outreach-tailoring'
useSeoMeta({ title: 'Partnership studio | Matrix Fellows', robots: 'noindex, nofollow' })
const { data, loading, busy, error, notice, refresh, mutate } = useWorkspace()
const route = useRoute()
const callbackMessage = computed(() => {
  if (route.query.mailbox === 'connected')
    return 'Mailbox connected. Review and approve each message before sending.'
  if (route.query.mailbox === 'failed')
    return 'Mailbox connection did not complete. Check provider consent and try again in Connections.'
  if (route.query.auth === 'failed')
    return 'Sign-in did not complete. Please sign in with your approved officer account.'
  return ''
})
const tab = ref('queue')
const sections = [
  { value: 'queue', label: 'Discovery', icon: 'compass' },
  { value: 'drafts', label: 'Proposals', icon: 'mail' },
  { value: 'profiles', label: 'Your profile', icon: 'spark' },
  { value: 'society', label: 'Society', icon: 'atom' },
  { value: 'saved', label: 'Saved & planned', icon: 'calendar' },
  { value: 'research', label: 'Research runs', icon: 'globe' },
  { value: 'settings', label: 'Connections', icon: 'lock' },
] as const
const query = ref('')
const status = ref('active')
const discipline = ref('all')
const selectedId = ref('')
const scope = ref('society')
const profileId = ref('')
const proposalStyle = ref('conversation')
const unsaved = computed(() => Boolean(changed.value || editTarget.value))
onBeforeRouteLeave(() => {
  if (unsaved.value && !window.confirm('You have unsaved workspace edits. Leave without saving?'))
    return false
})
function unloadGuard(event: BeforeUnloadEvent) {
  if (unsaved.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', unloadGuard))
onBeforeUnmount(() => window.removeEventListener('beforeunload', unloadGuard))
function planSaved(id: string) {
  selectedId.value = id
  tab.value = 'queue'
}
const selected = computed(() => data.value?.targets.find((t) => t.id === selectedId.value))
const acquisition = computed(
  () =>
    selected.value?.dossier.acquisition as
      | {
          pages?: {
            url: string
            text: string
            hash: string
            retrievedAt: string
            contacts?: string[]
            links?: { name: string; canonical_url: string }[]
          }[]
          aiState?: string
          publicAnalysis?: {
            themes: string[]
            proposalOptions: {
              title: string
              task: string
              deliverable: string
              supervisionQuestions: string[]
              quote: string
            }[]
            unknowns: string[]
          }
        }
      | undefined,
)
const disciplines = computed(() => [
  'all',
  ...new Set(data.value?.targets.flatMap((t) => t.disciplines) || []),
])
const targets = computed(() =>
  (data.value?.targets || [])
    .filter(
      (t) =>
        (status.value === 'all' ||
          (status.value === 'active'
            ? !['deferred', 'rejected', 'contacted'].includes(t.status)
            : t.status === status.value)) &&
        (discipline.value === 'all' || t.disciplines.includes(discipline.value)) &&
        `${t.name} ${t.organization} ${t.description}`
          .toLowerCase()
          .includes(query.value.toLowerCase()),
    )
    .sort((a, b) => priority(b) - priority(a)),
)
function priority(t: OutreachTarget) {
  return outreachPriority(t.assessment) ?? 0
}
const targetForm = reactive({
  id: '',
  expectedUpdatedAt: '',
  name: '',
  organization: '',
  canonicalUrl: '',
  labUrl: '',
  contactEmail: '',
  disciplines: '',
  location: '',
  description: '',
  kind: 'lab',
  scope: 'both',
  mode: 'unknown',
  research: '',
  eligibility: '',
  opportunities: '',
  proposalAngles: '',
  notes: '',
  deferUntil: '',
  rejectionReason: '',
  assessment: {
    fit: undefined as number | undefined,
    openness: undefined as number | undefined,
    contribution: undefined as number | undefined,
    feasibility: undefined as number | undefined,
    evidence: undefined as number | undefined,
    confidence: 'low',
    rationale: '',
    blockers: '',
  },
  evidence: [] as OutreachTarget['dossier']['evidence'],
})
const editTarget = ref(false)
async function importSeeds() {
  await mutate(
    '/seeds',
    'POST',
    {},
    'Reviewed first-party starter candidates added; existing records preserved.',
  )
}
function localDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
function openTarget(t?: OutreachTarget) {
  Object.assign(targetForm, {
    id: t?.id || '',
    expectedUpdatedAt: t?.updatedAt || '',
    name: t?.name || '',
    organization: t?.organization || '',
    canonicalUrl: t?.canonicalUrl || '',
    labUrl: typeof t?.dossier.labUrl === 'string' ? t.dossier.labUrl : '',
    contactEmail: t?.contactEmail || '',
    disciplines: t?.disciplines.join(', ') || '',
    location: t?.location || '',
    description: t?.description || '',
    kind: t?.kind || 'lab',
    scope: t?.scope || 'both',
    mode: t?.mode || 'unknown',
    research: t?.dossier.research || '',
    eligibility: t?.dossier.eligibility || '',
    opportunities: t?.dossier.opportunities || '',
    proposalAngles: t?.dossier.proposalAngles?.join('\n') || '',
    notes: t?.notes || '',
    deferUntil: localDateTime(t?.deferUntil),
    rejectionReason: t?.rejectionReason || '',
    assessment: {
      fit: t?.assessment.fit,
      openness: t?.assessment.openness,
      contribution: t?.assessment.contribution,
      feasibility: t?.assessment.feasibility,
      evidence: t?.assessment.evidence,
      confidence: t?.assessment.confidence || 'low',
      rationale: t?.assessment.rationale || '',
      blockers: t?.assessment.blockers?.join('\n') || '',
    },
    evidence: t?.dossier.evidence.map((e) => ({ ...e })) || [],
  })
  editTarget.value = true
}
const split = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
async function saveTarget() {
  const existing = data.value?.targets.find((t) => t.id === targetForm.id)
  const {
    id,
    expectedUpdatedAt,
    research,
    eligibility,
    opportunities,
    proposalAngles,
    evidence,
    assessment,
    labUrl,
    ...rest
  } = targetForm
  const body = {
    ...rest,
    ...(id ? { expectedUpdatedAt } : {}),
    contactEmail: rest.contactEmail || null,
    disciplines: split(rest.disciplines),
    deferUntil: rest.deferUntil ? new Date(rest.deferUntil).toISOString() : null,
    assessment: {
      ...Object.fromEntries(
        Object.entries(assessment).filter(
          ([key, value]) =>
            !['fit', 'openness', 'contribution', 'feasibility', 'evidence'].includes(key) ||
            typeof value === 'number',
        ),
      ),
      blockers: assessment.blockers.split('\n').filter(Boolean),
    },
    dossier: {
      ...existing?.dossier,
      labUrl: labUrl || undefined,
      evidence,
      research,
      eligibility,
      opportunities,
      proposalAngles: proposalAngles.split('\n').filter(Boolean),
    },
    status: existing?.status || 'needs_review',
  }
  const result = await mutate(id ? `/targets/${id}` : '/targets', id ? 'PATCH' : 'POST', body)
  if (result) editTarget.value = false
}
const profileForm = reactive({
  id: '',
  fullName: '',
  interests: '',
  skills: '',
  availability: '',
  location: '',
  goals: '',
  affiliations: '',
  introduction: '',
  signature: '',
  achievements: [] as NonNullable<OutreachProfile['achievements']>,
  consentToShare: false,
  workSamples: [] as OutreachProfile['workSamples'],
})
const societyForm = reactive({
  name: 'Matrix Fellows',
  description: '',
  capabilities: '',
  sponsor: '',
  accomplishments: [] as { title: string; description: string; url?: string; verified: boolean }[],
})
watch(data, (value) => {
  if (!value) return
  const p = value.profiles[0]
  if (p)
    Object.assign(profileForm, {
      id: p.id,
      fullName: p.fullName,
      interests: p.interests.join(', '),
      skills: p.skills.join(', '),
      availability: p.availability,
      location: p.location,
      goals: p.goals,
      affiliations: p.affiliations?.join(', ') || '',
      introduction: p.introduction || '',
      signature: p.signature || '',
      achievements: p.achievements?.map((a) => ({ ...a })) || [],
      consentToShare: p.consentToShare,
      workSamples: p.workSamples.map((w) => ({ ...w })),
    })
  Object.assign(societyForm, {
    name: value.society.name,
    description: value.society.description,
    sponsor: value.society.sponsor,
    capabilities: value.society.capabilities.join(', '),
    accomplishments: value.society.accomplishments.map((a) => ({ ...a })),
  })
  if (!profileId.value && p) profileId.value = p.id
})
async function saveProfile() {
  const { id, ...p } = profileForm
  await mutate(id ? `/profiles/${id}` : '/profiles', id ? 'PATCH' : 'POST', {
    ...p,
    interests: split(p.interests),
    skills: split(p.skills),
    affiliations: split(p.affiliations),
  })
}
async function plan() {
  if (!selected.value) return
  const result = await mutate(
    '/planner',
    'POST',
    {
      targetId: selected.value.id,
      kind: scope.value,
      style: proposalStyle.value,
      profileId: scope.value === 'student' ? profileId.value : null,
    },
    'Proposal created. Review every claim before approval.',
  )
  if (result) tab.value = 'drafts'
}
async function toggleSave(t: OutreachTarget) {
  const saved = data.value?.saves.includes(t.id)
  await mutate(
    saved ? `/saves/${t.id}` : '/saves',
    saved ? 'DELETE' : 'POST',
    saved ? undefined : { targetId: t.id },
    saved ? 'Removed from your saved list.' : 'Saved to your list.',
  )
}
const proposalId = ref('')
const draft = reactive({ recipient: '', subject: '', body: '', mailboxId: '', profileId: '' })
const proposal = computed(() => data.value?.proposals.find((p) => p.id === proposalId.value))
const sendConfirm = ref(false)
const uncertainSends = ref<string[]>([])
function openProposal(p: OutreachProposal) {
  proposalId.value = p.id
  Object.assign(draft, {
    recipient: p.recipient,
    subject: p.subject,
    body: p.body,
    mailboxId: p.mailboxId || '',
    profileId: p.profileId || '',
  })
  sendConfirm.value = false
}
const changed = computed(
  () =>
    proposal.value &&
    (draft.recipient !== proposal.value.recipient ||
      draft.subject !== proposal.value.subject ||
      draft.body !== proposal.value.body ||
      draft.mailboxId !== (proposal.value.mailboxId || '')),
)
async function saveDraft() {
  if (proposal.value)
    await mutate(
      `/proposals/${proposal.value.id}`,
      'PATCH',
      {
        ...draft,
        targetId: proposal.value.targetId,
        kind: proposal.value.kind,
        revision: proposal.value.revision,
        mailboxId: draft.mailboxId || null,
        profileId: draft.profileId || null,
      },
      'Draft saved. Any earlier approval has been cleared.',
    )
}
async function approveDraft() {
  if (proposal.value && !changed.value)
    await mutate(
      `/proposals/${proposal.value.id}/approve`,
      'POST',
      { revision: proposal.value.revision },
      'This exact revision is approved. Sending still requires confirmation.',
    )
}
async function sendDraft() {
  if (proposal.value) {
    const result = await mutate<{ message?: string; status?: string }>(
      '/send',
      'POST',
      {
        proposalId: proposal.value.id,
        revision: proposal.value.revision,
        fingerprint: proposal.value.approvedFingerprint,
        mailboxId: proposal.value.mailboxId,
      },
      'Send request processed. Provider acceptance does not establish delivery.',
    )
    if (result?.message) {
      if (result.status === 'uncertain' || result.status === 'failed') {
        if (result.status === 'uncertain') uncertainSends.value.push(proposal.value.id)
        error.value = result.message
        notice.value = ''
      } else notice.value = result.message
    }
    sendConfirm.value = false
  }
}
const research = ref<any>(null)
const researchError = ref('')
const researchBusy = ref(false)
async function loadResearch() {
  try {
    research.value = await $fetch('/api/workspace/research')
  } catch (e: any) {
    researchError.value = e?.data?.statusMessage || 'Research settings unavailable.'
  }
}
async function researchAction(action: string) {
  researchBusy.value = true
  researchError.value = ''
  try {
    await $fetch('/api/workspace/research' as string, {
      method: 'POST',
      body: {
        action,
        ...(action === 'settings'
          ? {
              settings: {
                weekly_limit: research.value.settings.weekly_limit,
                batch_limit: research.value.settings.batch_limit,
                queue_limit: research.value.settings.queue_limit,
                concurrency: research.value.settings.concurrency,
                ai_enabled: research.value.settings.ai_enabled,
                terms_confirmed: research.value.settings.terms_confirmed,
              },
            }
          : {}),
      },
    })
    await loadResearch()
  } catch (e: any) {
    researchError.value =
      e?.data?.message || e?.data?.statusMessage || 'The research action could not be completed.'
  } finally {
    researchBusy.value = false
  }
}
const editingSource = ref('')
const sourceForm = reactive({ enabled: false, aiExcerpt: '', aiReviewed: false })
function openSource(source: any) {
  editingSource.value = source.id
  Object.assign(sourceForm, {
    enabled: source.enabled,
    aiExcerpt: source.ai_excerpt || '',
    aiReviewed: source.ai_reviewed || false,
  })
}
async function saveSource() {
  researchBusy.value = true
  researchError.value = ''
  try {
    await $fetch('/api/workspace/research', {
      method: 'POST',
      body: { action: 'source', sourceId: editingSource.value, ...sourceForm },
    })
    editingSource.value = ''
    await loadResearch()
  } catch (e: any) {
    researchError.value = e?.data?.statusMessage || 'Could not save source review.'
  } finally {
    researchBusy.value = false
  }
}
watch(tab, (value) => {
  if (value === 'research') void loadResearch()
})
const connecting = ref(false)
const providers = ref({ gmail: false, outlook: false })
async function loadMailboxes() {
  try {
    const response = await $fetch<{ providers: { gmail: boolean; outlook: boolean } }>(
      '/api/workspace/mailboxes',
    )
    providers.value = response.providers
  } catch {
    providers.value = { gmail: false, outlook: false }
  }
}
async function connectMailbox(provider = 'gmail') {
  connecting.value = true
  try {
    const result = await $fetch<{ url: string }>('/api/workspace/mailboxes/connect', {
      method: 'POST',
      body: { provider },
    })
    window.location.assign(result.url)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not connect the mailbox.'
  } finally {
    connecting.value = false
  }
}
async function logout() {
  if (unsaved.value && !window.confirm('Sign out and discard unsaved edits?')) return
  await $fetch('/api/workspace/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
const deviceSaved = useSavedOpportunities()
async function mergeSaves() {
  await mutate(
    '/catalog-saves',
    'POST',
    { opportunityIds: deviceSaved.ids.value },
    'Device saves merged into your account.',
  )
}
const plannerForm = reactive({
  title: '',
  targetId: '',
  profileId: '',
  opportunityId: '',
  dueAt: '',
  notes: '',
})
async function addPlan() {
  const result = await mutate(
    '/planner/items',
    'POST',
    {
      ...plannerForm,
      targetId: plannerForm.targetId || null,
      profileId: plannerForm.profileId || null,
      opportunityId: plannerForm.opportunityId || null,
      dueAt: plannerForm.dueAt ? new Date(plannerForm.dueAt).toISOString() : null,
      completed: false,
    },
    'Next step added to your planner.',
  )
  if (result)
    Object.assign(plannerForm, {
      title: '',
      targetId: '',
      profileId: '',
      opportunityId: '',
      dueAt: '',
      notes: '',
    })
}
async function togglePlan(item: OutreachPlannerItem) {
  const { id, ...body } = item
  await mutate(`/planner/items/${id}`, 'PATCH', { ...body, completed: !item.completed })
}
const outbox = ref<any[]>([])
const outboxError = ref('')
const reconcileId = ref('')
const reconcileOutcome = ref('sent')
const reconcileNote = ref('')
async function loadOutbox() {
  try {
    outbox.value = (await $fetch<{ items: any[] }>('/api/workspace/mailboxes/outbox')).items
  } catch {
    outboxError.value = 'Outbox unavailable. Check the sending mailbox before any retry.'
  }
}
async function reconcile() {
  try {
    await $fetch('/api/workspace/mailboxes/reconcile', {
      method: 'POST',
      body: {
        outboxId: reconcileId.value,
        outcome: reconcileOutcome.value,
        note: reconcileNote.value,
      },
    })
    reconcileId.value = ''
    reconcileNote.value = ''
    await loadOutbox()
    await refresh()
  } catch (e: any) {
    outboxError.value = e?.data?.statusMessage || 'Could not reconcile this send.'
  }
}
watch(tab, (value) => {
  if (value === 'drafts') void loadOutbox()
})
async function saveSociety() {
  await mutate(
    '/society',
    'PUT',
    {
      ...societyForm,
      capabilities: split(societyForm.capabilities),
      accomplishments: societyForm.accomplishments.map((a) => ({ ...a, url: a.url || undefined })),
    },
    'Society profile saved.',
  )
}
onMounted(async () => {
  await refresh()
  await loadMailboxes()
})
</script>

<template>
  <WorkspaceShell
    title="Good research starts with a good connection."
    subtitle="A private, evidence-first studio for discovering partners, shaping useful proposals, and following through thoughtfully."
  >
    <template #header
      ><div class="account">
        <span v-if="data" class="ws-muted">{{ data.member.email }}</span
        ><button class="ws-button" @click="logout">
          <SiteIcon name="lock" :size="15" />Sign out
        </button>
      </div></template
    >
    <div v-if="error" role="alert" class="ws-alert ws-error">
      {{ error }} <button class="retry" @click="refresh">Retry</button>
    </div>
    <div v-if="notice" role="status" class="ws-alert ws-success">{{ notice }}</div>
    <div v-if="callbackMessage" role="status" class="ws-alert">{{ callbackMessage }}</div>
    <div v-if="loading && !data" class="ws-empty">
      <OrbitalLoader />
      <p>Opening your private studio…</p>
    </div>
    <div v-else-if="data" class="studio-layout">
      <nav class="studio-nav" aria-label="Partnership studio">
        <button
          v-for="section in sections"
          :key="section.value"
          :class="{ active: tab === section.value }"
          :aria-current="tab === section.value ? 'page' : undefined"
          @click="tab = section.value"
        >
          <SiteIcon :name="section.icon" :size="17" />{{ section.label
          }}<span v-if="section.value === 'queue'">{{
            data.targets.filter((t) => t.status === 'needs_review').length
          }}</span>
        </button>
      </nav>
      <Transition name="ws-content" mode="out-in"
        ><section :key="tab" class="studio-content">
          <template v-if="tab === 'queue'">
            <div class="section-top">
              <div>
                <p class="ws-kicker">The right people, not more people</p>
                <h2>Partnership discovery</h2>
              </div>
              <button class="ws-button" @click="openTarget()">
                <SiteIcon name="plus" :size="15" />Add candidate
              </button>
            </div>
            <div class="queue-tools">
              <label class="search"
                ><SiteIcon name="search" :size="17" /><input
                  v-model="query"
                  aria-label="Search candidates"
                  placeholder="Search people, labs, or research…" /></label
              ><ThemedSelect
                v-model="status"
                label="Review status"
                :options="[
                  { value: 'active', label: 'Active queue' },
                  { value: 'all', label: 'All candidates' },
                  { value: 'needs_review', label: 'Needs review' },
                  { value: 'ready', label: 'Ready' },
                  { value: 'deferred', label: 'For later' },
                  { value: 'rejected', label: 'Not viable' },
                  { value: 'contacted', label: 'Contacted' },
                ]"
              /><ThemedSelect
                v-model="discipline"
                label="Research discipline"
                :options="
                  disciplines.map((d) => ({ value: d, label: d === 'all' ? 'All disciplines' : d }))
                "
              />
            </div>
            <form v-if="editTarget" class="ws-panel target-form" @submit.prevent="saveTarget">
              <h2>{{ targetForm.id ? 'Refine candidate' : 'Add a grounded candidate' }}</h2>
              <div class="ws-grid">
                <label class="ws-field"
                  >Name<input v-model="targetForm.name" required maxlength="180" /></label
                ><label class="ws-field"
                  >Organization<input v-model="targetForm.organization" required /></label
                ><label class="ws-field"
                  >Official source URL<input
                    v-model="targetForm.canonicalUrl"
                    type="url"
                    required /></label
                ><label class="ws-field"
                  >Public professional email<input
                    v-model="targetForm.contactEmail"
                    type="email" /></label
                ><label class="ws-field"
                  >Parent lab's official URL<input
                    v-model="targetForm.labUrl"
                    type="url"
                    placeholder="https://…"
                  /><small
                    >Use only an affiliation supported by an official roster/source. Grouping
                    contacts by lab prevents duplicate approaches to its members.</small
                  ></label
                ><label class="ws-field"
                  >Disciplines, comma separated<input v-model="targetForm.disciplines" /></label
                ><label class="ws-field">Location<input v-model="targetForm.location" /></label
                ><ThemedSelect
                  v-model="targetForm.kind"
                  label="Candidate type"
                  :options="['lab', 'pi', 'postdoc', 'phd', 'program', 'student']"
                /><ThemedSelect
                  v-model="targetForm.mode"
                  label="Participation mode"
                  :options="['unknown', 'remote', 'in_person', 'hybrid']"
                />
                <ThemedSelect
                  v-model="targetForm.scope"
                  label="Connection scope"
                  :options="['society', 'student', 'both']"
                />
              </div>
              <label class="ws-field"
                >Concise description<textarea v-model="targetForm.description" required /></label
              ><label class="ws-field"
                >Research background<textarea v-model="targetForm.research" /></label
              ><label class="ws-field"
                >Access, eligibility & unresolved restrictions<textarea
                  v-model="targetForm.eligibility"
                /></label
              ><label class="ws-field"
                >Realistic collaboration opportunities<textarea
                  v-model="targetForm.opportunities"
                /></label
              ><label class="ws-field"
                >Proposal approaches, one per line<textarea v-model="targetForm.proposalAngles" />
              </label>
              <div class="ws-divider" />
              <h3>Review notes & timing</h3>
              <label class="ws-field">Internal notes<textarea v-model="targetForm.notes" /></label>
              <label class="ws-field"
                >Deferred until<input v-model="targetForm.deferUntil" type="datetime-local" /><small
                  >For later status still requires the queue action. Date does not imply an
                  automated email.</small
                ></label
              >
              <label class="ws-field"
                >Reason if not viable<textarea v-model="targetForm.rejectionReason" />
              </label>
              <h3>Evidence-backed priority assessment</h3>
              <p class="ws-muted">
                Leave a component empty when unknown. Total is a review priority, never a response
                probability.
              </p>
              <div class="ws-grid">
                <label class="ws-field"
                  >Research fit /30<input
                    v-model.number="targetForm.assessment.fit"
                    type="number"
                    min="0"
                    max="30"
                /></label>
                <label class="ws-field"
                  >Documented openness /25<input
                    v-model.number="targetForm.assessment.openness"
                    type="number"
                    min="0"
                    max="25"
                /></label>
                <label class="ws-field"
                  >Our contribution /20<input
                    v-model.number="targetForm.assessment.contribution"
                    type="number"
                    min="0"
                    max="20"
                /></label>
                <label class="ws-field"
                  >Practical feasibility /15<input
                    v-model.number="targetForm.assessment.feasibility"
                    type="number"
                    min="0"
                    max="15"
                /></label>
                <label class="ws-field"
                  >Evidence strength /10<input
                    v-model.number="targetForm.assessment.evidence"
                    type="number"
                    min="0"
                    max="10"
                /></label>
                <ThemedSelect
                  v-model="targetForm.assessment.confidence"
                  label="Assessment confidence"
                  :options="['low', 'medium', 'high']"
                />
              </div>
              <label class="ws-field"
                >Assessment rationale<textarea v-model="targetForm.assessment.rationale" />
              </label>
              <label class="ws-field"
                >Blockers, one per line<textarea v-model="targetForm.assessment.blockers" />
              </label>
              <h3>Claim-level evidence</h3>
              <div v-for="(e, i) in targetForm.evidence" :key="i" class="sample">
                <label class="ws-field"
                  >Official source URL<input v-model="e.url" type="url" required
                /></label>
                <label class="ws-field"
                  >Supported claim<textarea v-model="e.claim" required />
                </label>
                <label class="ws-field"
                  >Exact supporting quotation<textarea v-model="e.quote" />
                </label>
                <ThemedSelect
                  v-model="e.confidence"
                  label="Evidence confidence"
                  :options="['verified', 'inferred', 'unknown']"
                />
                <button type="button" class="ws-button" @click="targetForm.evidence.splice(i, 1)">
                  Remove evidence
                </button>
              </div>
              <button
                type="button"
                class="ws-button"
                @click="
                  targetForm.evidence.push({
                    url: '',
                    claim: '',
                    quote: '',
                    retrievedAt: new Date().toISOString(),
                    confidence: 'unknown',
                  })
                "
              >
                Add evidence
              </button>
              <div class="ws-actions">
                <button class="ws-button ws-button--primary" :disabled="busy">Save candidate</button
                ><button type="button" class="ws-button" @click="editTarget = false">Cancel</button>
              </div>
            </form>
            <div class="queue-layout">
              <div class="candidate-list">
                <button
                  v-for="target in targets"
                  :key="target.id"
                  class="candidate"
                  :class="{ selected: selectedId === target.id }"
                  @click="selectedId = target.id"
                >
                  <div class="candidate-top">
                    <span class="ws-chip">{{ target.kind }}</span
                    ><span v-if="outreachPriority(target.assessment) !== null" class="score"
                      >{{ priority(target) }}<small>/100 priority · not probability</small></span
                    >
                  </div>
                  <h3>{{ target.name }}</h3>
                  <p>{{ target.organization }}</p>
                  <p class="candidate-description">{{ target.description }}</p>
                  <div class="candidate-bottom">
                    <span>{{ target.location || 'Location unverified' }}</span
                    ><span>{{ target.status.replaceAll('_', ' ') }}</span>
                  </div>
                </button>
                <div v-if="!targets.length" class="ws-empty">
                  No candidates match these filters. Add a verified lead, or adjust the queue view.
                  <div
                    v-if="data.member.role === 'admin' && !data.targets.length"
                    class="ws-actions"
                  >
                    <button class="ws-button" :disabled="busy" @click="importSeeds">
                      Add reviewed local starter pool
                    </button>
                  </div>
                </div>
              </div>
              <Transition name="ws-content" mode="out-in"
                ><article v-if="selected" :key="selected.id" class="ws-panel dossier">
                  <div class="section-top">
                    <span class="ws-kicker">Candidate dossier</span
                    ><button class="ws-button" :disabled="busy" @click="toggleSave(selected)">
                      <SiteIcon name="spark" :size="14" />{{
                        data.saves.includes(selected.id) ? 'Saved' : 'Save'
                      }}
                    </button>
                  </div>
                  <h2>{{ selected.name }}</h2>
                  <p class="ws-muted">
                    {{ selected.organization }} · {{ selected.location || 'Location unverified' }}
                  </p>
                  <div class="ws-actions">
                    <span v-for="d in selected.disciplines" :key="d" class="ws-chip">{{ d }}</span>
                  </div>
                  <div class="ws-divider" />
                  <h3>What they work on</h3>
                  <p class="ws-muted preserve">
                    {{ selected.dossier.research || selected.description }}
                  </p>
                  <h3>Where a connection could fit</h3>
                  <p class="ws-muted preserve">
                    {{
                      selected.dossier.opportunities ||
                      'A specific collaboration scope has not yet been verified.'
                    }}
                  </p>
                  <h3>Access & eligibility</h3>
                  <p class="ws-muted preserve">
                    {{
                      selected.dossier.eligibility ||
                      'High-school access and mentoring availability remain unverified. Ask before proposing on-site work.'
                    }}
                  </p>
                  <div v-if="selected.assessment.rationale" class="assessment">
                    <h3>Why it is in the queue</h3>
                    <p class="ws-muted">{{ selected.assessment.rationale }}</p>
                    <span class="ws-chip"
                      >{{ selected.assessment.confidence || 'low' }} confidence</span
                    >
                    <ul v-if="selected.assessment.blockers?.length">
                      <li v-for="b in selected.assessment.blockers" :key="b">{{ b }}</li>
                    </ul>
                  </div>
                  <h3 class="source-heading">Evidence, not assumptions</h3>
                  <details v-if="acquisition" class="acquisition-panel">
                    <summary>
                      Acquired source material
                      <span class="ws-chip">{{
                        acquisition.aiState?.replaceAll('_', ' ') || 'Source acquisition'
                      }}</span>
                    </summary>
                    <p class="ws-muted">
                      Worker observations are separate from officer-reviewed claims. Retrieved
                      contact candidates and model suggestions are not verified affiliations,
                      invitations, or mentoring offers.
                    </p>
                    <div
                      v-for="page in acquisition.pages || []"
                      :key="page.hash"
                      class="acquired-source"
                    >
                      <a class="evidence" :href="page.url" target="_blank" rel="noopener noreferrer"
                        ><span>{{ page.url }}</span
                        ><small
                          >Retrieved {{ page.retrievedAt.slice(0, 10) }} · source fingerprint
                          recorded</small
                        ><SiteIcon name="arrow" :size="14"
                      /></a>
                      <details class="source-text">
                        <summary>Read captured source text</summary>
                        <p class="ws-muted preserve">{{ page.text }}</p>
                      </details>
                      <div v-if="page.contacts?.length">
                        <p class="ws-kicker">Unverified public contact candidates</p>
                        <p v-for="contact in page.contacts" :key="contact" class="ws-muted">
                          {{ contact }}
                        </p>
                      </div>
                      <div v-if="page.links?.length">
                        <p class="ws-kicker">Related source links</p>
                        <a
                          v-for="link in page.links"
                          :key="link.canonical_url"
                          class="evidence"
                          :href="link.canonical_url"
                          target="_blank"
                          rel="noopener noreferrer"
                          ><span>{{ link.name }}</span
                          ><SiteIcon name="arrow" :size="14"
                        /></a>
                      </div>
                    </div>
                    <div v-if="acquisition.publicAnalysis" class="acquired-analysis">
                      <h3>Research suggestions · review required</h3>
                      <div class="ws-actions">
                        <span
                          v-for="theme in acquisition.publicAnalysis.themes"
                          :key="theme"
                          class="ws-chip"
                          >{{ theme }}</span
                        >
                      </div>
                      <article
                        v-for="option in acquisition.publicAnalysis.proposalOptions"
                        :key="option.title"
                        class="sample"
                      >
                        <h3>{{ option.title }}</h3>
                        <p class="ws-muted">{{ option.task }}</p>
                        <p class="ws-muted">
                          <strong>Potential deliverable:</strong> {{ option.deliverable }}
                        </p>
                        <blockquote>{{ option.quote }}</blockquote>
                        <ul>
                          <li v-for="question in option.supervisionQuestions" :key="question">
                            {{ question }}
                          </li>
                        </ul>
                      </article>
                      <ul>
                        <li v-for="unknown in acquisition.publicAnalysis.unknowns" :key="unknown">
                          {{ unknown }}
                        </li>
                      </ul>
                    </div>
                  </details>
                  <div v-if="!selected.dossier.evidence.length" class="ws-muted">
                    No claim-level evidence yet. Verify the official page before approval.
                  </div>
                  <a
                    v-for="(source, i) in selected.dossier.evidence"
                    :key="i"
                    class="evidence"
                    :href="source.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    ><span>{{ source.claim }}</span
                    ><small>{{ source.confidence }} · {{ source.retrievedAt.slice(0, 10) }}</small
                    ><SiteIcon name="arrow" :size="15" /></a
                  ><a
                    :href="selected.canonicalUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="ws-button source-link"
                    >Open official source<SiteIcon name="arrow" :size="14"
                  /></a>
                  <div class="ws-divider" />
                  <h3>Compare proposal approaches</h3>
                  <ol class="angle-list">
                    <li v-for="angle in selected.dossier.proposalAngles || []" :key="angle">
                      {{ angle }}
                    </li>
                  </ol>
                  <p v-if="!selected.dossier.proposalAngles?.length" class="ws-muted">
                    Choose a small, concrete ask that matches their work and your demonstrated
                    skills. Drafting does not establish mentoring availability.
                  </p>
                  <ThemedSelect
                    v-model="scope"
                    label="Who is the connection for?"
                    :options="[
                      { value: 'society', label: 'Society partnership' },
                      { value: 'student', label: 'My research profile' },
                    ]"
                  /><ThemedSelect
                    v-if="scope === 'student'"
                    v-model="profileId"
                    label="Research profile"
                    :options="data.profiles.map((p) => ({ value: p.id, label: p.fullName }))"
                  />
                  <ThemedSelect
                    v-model="proposalStyle"
                    label="Proposal approach"
                    :options="
                      proposalStyles.map((value) => ({
                        value,
                        label: value.charAt(0).toUpperCase() + value.slice(1),
                      }))
                    "
                  />
                  <div class="ws-actions">
                    <button
                      class="ws-button ws-button--primary"
                      :disabled="busy || (scope === 'student' && !profileId)"
                      @click="plan"
                    >
                      Shape a proposal<SiteIcon name="right" :size="14" /></button
                    ><button class="ws-button" @click="openTarget(selected)">Edit dossier</button>
                  </div>
                  <div class="ws-actions">
                    <button
                      class="ws-button"
                      :disabled="busy"
                      @click="
                        mutate(
                          `/targets/${selected.id}`,
                          'PATCH',
                          { status: 'ready', expectedUpdatedAt: selected.updatedAt },
                          'Candidate marked ready.',
                        )
                      "
                    >
                      Mark ready</button
                    ><button
                      class="ws-button"
                      :disabled="busy"
                      @click="
                        mutate(
                          `/targets/${selected.id}`,
                          'PATCH',
                          { status: 'deferred', expectedUpdatedAt: selected.updatedAt },
                          'Deferred for later.',
                        )
                      "
                    >
                      For later</button
                    ><button
                      class="ws-button ws-button--danger"
                      :disabled="busy"
                      @click="
                        mutate(
                          `/targets/${selected.id}`,
                          'PATCH',
                          { status: 'rejected', expectedUpdatedAt: selected.updatedAt },
                          'Removed from the active queue.',
                        )
                      "
                    >
                      Not viable
                    </button>
                  </div>
                </article>
                <div v-else class="ws-empty dossier-empty">
                  <SiteIcon name="compass" :size="32" />
                  <p>
                    Select a candidate to review their research, evidence, access, and possible
                    partnership approaches.
                  </p>
                </div></Transition
              >
            </div>
          </template>
          <template v-else-if="tab === 'drafts'"
            ><div class="section-top">
              <div>
                <p class="ws-kicker">Personal, precise, permissioned</p>
                <h2>Proposal studio</h2>
              </div>
              <span class="ws-chip">Every send requires your approval</span>
            </div>
            <div class="queue-layout">
              <div class="candidate-list">
                <button
                  v-for="p in data.proposals"
                  :key="p.id"
                  class="candidate"
                  :class="{ selected: p.id === proposalId }"
                  @click="openProposal(p)"
                >
                  <span class="ws-chip">{{ p.status }} · revision {{ p.revision }}</span>
                  <h3 class="draft-title">{{ p.subject }}</h3>
                  <p>{{ p.recipient }}</p>
                  <small class="ws-muted">{{
                    data.targets.find((t) => t.id === p.targetId)?.name
                  }}</small>
                </button>
                <div v-if="!data.proposals.length" class="ws-empty">
                  Select a candidate in Discovery and shape a proposal. Nothing is sent
                  automatically.
                </div>
              </div>
              <form v-if="proposal" class="ws-panel" @submit.prevent="saveDraft">
                <h2>Make it sound like you.</h2>
                <p class="ws-muted">
                  Verify personalizations, narrow the ask, and remove claims you cannot demonstrate.
                  Editing invalidates approval.
                </p>
                <div class="ws-divider" />
                <label class="ws-field"
                  >Recipient<input
                    v-model="draft.recipient"
                    type="email"
                    required
                    :disabled="proposal.status === 'sent'"
                /></label>
                <div class="ws-field mailbox-field">
                  <span>Send from your connected mailbox</span
                  ><ThemedSelect
                    v-model="draft.mailboxId"
                    label="Send from your connected mailbox"
                    :options="[
                      { value: '', label: 'Choose a mailbox' },
                      ...data.mailboxes
                        .filter((m) => m.enabled)
                        .map((m) => ({ value: m.id, label: m.email })),
                    ]"
                  />
                </div>
                <label class="ws-field"
                  >Subject<input
                    v-model="draft.subject"
                    required
                    maxlength="240"
                    :disabled="proposal.status === 'sent'" /></label
                ><label class="ws-field"
                  >Email<textarea
                    v-model="draft.body"
                    required
                    class="email-body"
                    :disabled="proposal.status === 'sent'"
                  />
                </label>
                <p class="ws-muted">
                  Revision {{ proposal.revision }} ·
                  {{ changed ? 'Unsaved changes' : proposal.status }}. No promised authorship,
                  invented experience, or bulk follow-ups.
                </p>
                <div class="ws-actions" v-if="proposal.status !== 'sent'">
                  <button class="ws-button" :disabled="busy || !changed">Save changes</button
                  ><button
                    type="button"
                    class="ws-button ws-button--primary"
                    :disabled="
                      busy || !!changed || !draft.mailboxId || proposal.status === 'approved'
                    "
                    @click="approveDraft"
                  >
                    Approve exact revision</button
                  ><button
                    type="button"
                    class="ws-button ws-button--primary"
                    :disabled="
                      busy ||
                      !!changed ||
                      proposal.status !== 'approved' ||
                      uncertainSends.includes(proposal.id)
                    "
                    @click="sendConfirm = !sendConfirm"
                  >
                    Review & send<SiteIcon name="mail" :size="14" />
                  </button>
                </div>
                <Transition name="ws-content"
                  ><div v-if="sendConfirm" class="send-confirm">
                    <h3>Send this exact email?</h3>
                    <p class="ws-muted">
                      From {{ data.mailboxes.find((m) => m.id === draft.mailboxId)?.email }} to
                      {{ draft.recipient }}. This is a real external message and cannot be recalled
                      here.
                    </p>
                    <div class="ws-actions">
                      <button
                        type="button"
                        class="ws-button ws-button--primary"
                        :disabled="busy"
                        @click="sendDraft"
                      >
                        Confirm send</button
                      ><button type="button" class="ws-button" @click="sendConfirm = false">
                        Keep reviewing
                      </button>
                    </div>
                  </div></Transition
                >
              </form>
              <div v-else class="ws-empty dossier-empty">
                Choose a draft to refine, approve, and send.
              </div>
            </div>
            <details class="ws-panel secondary-panel">
              <summary>
                Outbox & sending history <span>{{ outbox.length }}</span>
              </summary>
              <p class="ws-muted">
                Accepted means the provider accepted the request, not confirmed delivery. Resolve
                uncertain sends only after checking your mailbox.
              </p>
              <div v-if="outboxError" class="ws-alert ws-error">{{ outboxError }}</div>
              <div v-for="item in outbox" :key="item.id" class="job-row">
                <div>
                  <strong>{{ item.subject }}</strong
                  ><small>{{ item.recipient }} · revision {{ item.revision }}</small>
                  <p v-if="item.error" class="ws-muted">{{ item.error }}</p>
                </div>
                <span class="ws-chip">{{ item.status }}</span
                ><button v-if="item.canReconcile" class="ws-button" @click="reconcileId = item.id">
                  Resolve after checking Sent mail
                </button>
              </div>
              <p v-if="!outbox.length" class="ws-muted">
                No sending history in your connected mailboxes.
              </p>
              <form v-if="reconcileId" class="send-confirm" @submit.prevent="reconcile">
                <h3>Record the verified outcome</h3>
                <ThemedSelect
                  v-model="reconcileOutcome"
                  label="What did you verify in the mailbox?"
                  :options="[
                    { value: 'sent', label: 'Email appears in Sent mail' },
                    { value: 'not_sent', label: 'Verified that email was not sent' },
                  ]"
                /><label class="ws-field"
                  >Verification note<textarea v-model="reconcileNote" required minlength="15" />
                </label>
                <div class="ws-actions">
                  <button class="ws-button">Record outcome</button
                  ><button type="button" class="ws-button" @click="reconcileId = ''">Cancel</button>
                </div>
              </form>
            </details>
          </template>
          <template v-else-if="tab === 'profiles'"
            ><form class="ws-panel" @submit.prevent="saveProfile">
              <p class="ws-kicker">Your context changes the proposal</p>
              <h2>Your research profile</h2>
              <p class="ws-muted">
                Describe only work and skills you can substantiate. This profile belongs to your
                adult officer account, not a directory of minors.
              </p>
              <div class="ws-divider" />
              <div class="ws-grid">
                <label class="ws-field"
                  >Full name<input v-model="profileForm.fullName" required /></label
                ><label class="ws-field"
                  >Research interests, comma separated<input
                    v-model="profileForm.interests" /></label
                ><label class="ws-field"
                  >Skills you can demonstrate<input
                    v-model="profileForm.skills"
                    placeholder="Python, microscopy, literature review…" /></label
                ><label class="ws-field"
                  >Availability & commitment<input v-model="profileForm.availability" /></label
                ><label class="ws-field"
                  >Location / practical travel range<input v-model="profileForm.location" /></label
                ><label class="ws-field"
                  >Research goals<textarea v-model="profileForm.goals" />
                </label>
              </div>
              <h3>Personal context</h3>
              <div class="profile-context-block">
                <p class="ws-kicker">A truthful introduction, in your voice</p>
                <div class="ws-grid">
                  <label class="ws-field"
                    >Relevant affiliations<input
                      v-model="profileForm.affiliations"
                      maxlength="1500"
                      placeholder="Organizations or labs, comma separated"
                    /><small
                      >Only affiliations you actually hold. These stay private until included in an
                      individually reviewed proposal.</small
                    ></label
                  ><label class="ws-field"
                    >Signature<textarea
                      v-model="profileForm.signature"
                      maxlength="500"
                      placeholder="Your name, role, and preferred professional contact"
                    />
                  </label>
                </div>
                <label class="ws-field"
                  >Personal introduction<textarea
                    v-model="profileForm.introduction"
                    maxlength="600"
                    placeholder="One or two sentences about your background and interests…"
                  /><small
                    >Used only for your own profile-tailored proposals—not automatically copied into
                    shared society outreach.</small
                  ></label
                >
                <h3>Relevant achievements</h3>
                <p class="ws-muted">
                  Specific, evidenced accomplishments can support an appropriate individual
                  proposal. Avoid unrelated awards or inflated descriptions.
                </p>
                <div v-for="(achievement, i) in profileForm.achievements" :key="i" class="sample">
                  <label class="ws-field"
                    >Achievement title<input
                      v-model="achievement.title"
                      required
                      maxlength="200" /></label
                  ><label class="ws-field"
                    >What you achieved and your contribution<textarea
                      v-model="achievement.description"
                      required
                      maxlength="800"
                    /></label
                  ><label class="ws-field"
                    >Public supporting source<input
                      v-model="achievement.url"
                      type="url"
                      required
                      placeholder="https://…" /></label
                  ><button
                    type="button"
                    class="ws-button"
                    @click="profileForm.achievements.splice(i, 1)"
                  >
                    Remove achievement
                  </button>
                </div>
                <button
                  type="button"
                  class="ws-button"
                  :disabled="profileForm.achievements.length >= 15"
                  @click="profileForm.achievements.push({ title: '', description: '', url: '' })"
                >
                  <SiteIcon name="plus" :size="15" />Add an evidenced achievement
                </button>
              </div>
              <h3 class="profile-section-heading">Work samples</h3>
              <div v-for="(sample, i) in profileForm.workSamples" :key="i" class="sample">
                <label class="ws-field"
                  >Project title<input v-model="sample.title" required /></label
                ><label class="ws-field"
                  >Public work URL<input v-model="sample.url" type="url" required /></label
                ><label class="ws-field"
                  >Your actual contribution<textarea
                    v-model="sample.contribution"
                    required
                  /></label
                ><button
                  type="button"
                  class="ws-button"
                  @click="profileForm.workSamples.splice(i, 1)"
                >
                  Remove sample
                </button>
              </div>
              <button
                type="button"
                class="ws-button"
                @click="profileForm.workSamples.push({ title: '', url: '', contribution: '' })"
              >
                <SiteIcon name="plus" :size="15" />Add a work sample
              </button>
              <div class="consent">
                <AnimatedCheckbox
                  v-model="profileForm.consentToShare"
                  label="Allow reviewed proposals to use my profile information."
                  description="Nothing is sent without exact-email approval."
                />
              </div>
              <div class="ws-actions">
                <button class="ws-button ws-button--primary" :disabled="busy">
                  Save my profile
                </button>
              </div>
            </form></template
          >
          <template v-else-if="tab === 'society'"
            ><form class="ws-panel" @submit.prevent="saveSociety">
              <p class="ws-kicker">A credible shared introduction</p>
              <h2>What we can genuinely offer</h2>
              <p class="ws-muted">
                Keep accomplishments specific and evidenced. Society claims are reviewed by an
                administrator before use.
              </p>
              <div class="ws-divider" />
              <label class="ws-field"
                >Society name<input
                  v-model="societyForm.name"
                  required
                  :disabled="data.member.role !== 'admin'" /></label
              ><label class="ws-field"
                >Concise introduction<textarea
                  v-model="societyForm.description"
                  :disabled="data.member.role !== 'admin'"
                /></label
              ><label class="ws-field"
                >Demonstrated capabilities, comma separated<input
                  v-model="societyForm.capabilities"
                  :disabled="data.member.role !== 'admin'" /></label
              ><label class="ws-field"
                >Adult sponsor / supervising contact<input
                  v-model="societyForm.sponsor"
                  :disabled="data.member.role !== 'admin'"
              /></label>
              <h3>Reviewed accomplishments</h3>
              <div v-for="(a, i) in societyForm.accomplishments" :key="i" class="sample">
                <label class="ws-field"
                  >Title<input
                    v-model="a.title"
                    required
                    :disabled="data.member.role !== 'admin'" /></label
                ><label class="ws-field"
                  >What happened, and our actual contribution<textarea
                    v-model="a.description"
                    required
                    :disabled="data.member.role !== 'admin'"
                  /></label
                ><label class="ws-field"
                  >Supporting public source<input
                    v-model="a.url"
                    type="url"
                    :disabled="data.member.role !== 'admin'"
                /></label>
                <div v-if="data.member.role === 'admin'" class="consent">
                  <AnimatedCheckbox
                    v-model="a.verified"
                    label="I reviewed this accomplishment against its supporting source."
                  />
                </div>
                <button
                  v-if="data.member.role === 'admin'"
                  type="button"
                  class="ws-button"
                  @click="societyForm.accomplishments.splice(i, 1)"
                >
                  Remove
                </button>
              </div>
              <div class="ws-actions" v-if="data.member.role === 'admin'">
                <button
                  type="button"
                  class="ws-button"
                  @click="
                    societyForm.accomplishments.push({
                      title: '',
                      description: '',
                      url: '',
                      verified: false,
                    })
                  "
                >
                  Add accomplishment</button
                ><button class="ws-button ws-button--primary" :disabled="busy">
                  Save reviewed profile
                </button>
              </div>
              <p v-else class="ws-muted">An administrator manages shared society claims.</p>
            </form></template
          >
          <template v-else-if="tab === 'saved'"
            ><div class="section-top">
              <div>
                <p class="ws-kicker">Keep promising connections in reach</p>
                <h2>Saved & planned</h2>
              </div>
            </div>
            <div v-if="deviceSaved.ids.value.length" class="ws-panel merge-panel">
              <h3>{{ deviceSaved.ids.value.length }} opportunity saves on this device</h3>
              <p class="ws-muted">
                Your browser saves stay local until you explicitly merge them. Merging should never
                overwrite your existing account list.
              </p>
              <button class="ws-button" :disabled="busy" @click="mergeSaves">
                Merge device saves
              </button>
            </div>
            <div class="ws-grid">
              <article
                v-for="t in data.targets.filter((t) => data!.saves.includes(t.id))"
                :key="t.id"
                class="ws-panel"
              >
                <span class="ws-chip">{{ t.scope }}</span>
                <h3 class="draft-title">{{ t.name }}</h3>
                <p class="ws-muted">{{ t.description }}</p>
                <div class="ws-actions">
                  <button class="ws-button ws-button--primary" @click="planSaved(t.id)">
                    Plan connection<SiteIcon name="right" :size="14" /></button
                  ><button class="ws-button" :disabled="busy" @click="toggleSave(t)">Remove</button>
                </div>
              </article>
            </div>
            <div v-if="!data.saves.length" class="ws-empty">
              Save candidates from their dossier to build a focused shortlist.
            </div>
            <details class="ws-panel secondary-panel">
              <summary>
                Account opportunity saves <span>{{ data.catalogSaves?.length || 0 }}</span>
              </summary>
              <div v-for="id in data.catalogSaves || []" :key="id" class="job-row">
                <NuxtLink :to="`/opportunities/${id}`">{{ id.replaceAll('-', ' ') }}</NuxtLink
                ><button
                  class="ws-button"
                  :disabled="busy"
                  @click="
                    mutate(`/catalog-saves/${id}`, 'DELETE', undefined, 'Account save removed.')
                  "
                >
                  Remove
                </button>
              </div>
              <p v-if="!data.catalogSaves?.length" class="ws-muted">
                Explicitly merge this device's public opportunity saves to keep them in your
                account.
              </p>
            </details>
            <article class="ws-panel secondary-panel">
              <p class="ws-kicker">One concrete next step</p>
              <h3>Your lightweight planner</h3>
              <div v-for="item in data.plannerItems || []" :key="item.id" class="planner-row">
                <AnimatedCheckbox
                  :model-value="item.completed"
                  :label="item.title"
                  :description="
                    [item.dueAt ? new Date(item.dueAt).toLocaleDateString() : null, item.notes]
                      .filter(Boolean)
                      .join(' · ')
                  "
                  @update:model-value="togglePlan(item)"
                /><button
                  class="ws-button"
                  :disabled="busy"
                  @click="
                    mutate(
                      `/planner/items/${item.id}`,
                      'DELETE',
                      undefined,
                      'Planner step removed.',
                    )
                  "
                  aria-label="Remove planner step"
                >
                  <SiteIcon name="close" :size="14" />
                </button>
              </div>
              <form class="research-config" @submit.prevent="addPlan">
                <label class="ws-field"
                  >Next step<input
                    v-model="plannerForm.title"
                    required
                    placeholder="Prepare a one-page project summary…"
                /></label>
                <div class="ws-grid">
                  <ThemedSelect
                    v-model="plannerForm.targetId"
                    label="Related candidate"
                    :options="[
                      { value: '', label: 'No candidate' },
                      ...data.targets.map((t) => ({ value: t.id, label: t.name })),
                    ]"
                  /><label class="ws-field"
                    >Optional due date<input
                      v-model="plannerForm.dueAt"
                      type="datetime-local" /></label
                  ><ThemedSelect
                    v-model="plannerForm.opportunityId"
                    label="Related saved opportunity"
                    :options="[
                      { value: '', label: 'No opportunity' },
                      ...(data.catalogSaves || []).map((id) => ({
                        value: id,
                        label: id.replaceAll('-', ' '),
                      })),
                    ]"
                  /><ThemedSelect
                    v-model="plannerForm.profileId"
                    label="Your research profile"
                    :options="[
                      { value: '', label: 'No profile' },
                      ...data.profiles.map((p) => ({ value: p.id, label: p.fullName })),
                    ]"
                  />
                </div>
                <label class="ws-field">Notes<textarea v-model="plannerForm.notes" /></label
                ><button class="ws-button ws-button--primary" :disabled="busy">
                  Add next step
                </button>
              </form>
            </article>
            <div class="ws-actions">
              <NuxtLink to="/opportunities" class="ws-button"
                >Browse public opportunities<SiteIcon name="arrow" :size="14" /></NuxtLink
              ><NuxtLink to="/meetings" class="ws-button"
                >Open calendar<SiteIcon name="calendar" :size="14"
              /></NuxtLink></div
          ></template>
          <template v-else-if="tab === 'research'"
            ><p class="ws-kicker">Bounded discovery, not a flood</p>
            <h2>Research runs</h2>
            <p class="ws-muted">
              Scheduled Monday, Wednesday, and Friday at 16:00 UTC. Agents discover and qualify
              leads; they never send email.
            </p>
            <div v-if="researchError" role="alert" class="ws-alert ws-error">
              {{ researchError }}
            </div>
            <div v-if="research" class="ws-stack">
              <article class="ws-panel">
                <div class="section-top">
                  <h3>Research controls</h3>
                  <span class="ws-chip">{{
                    research.settings.paused ? 'Paused' : 'Scheduled'
                  }}</span>
                </div>
                <p class="ws-muted">{{ research.health.note }}</p>
                <p class="ws-muted">
                  Free-only AI access. Jobs pause on quota limits; no paid fallback. Research uses
                  public professional information, never private member or mailbox content.
                </p>
                <div class="ws-actions">
                  <button
                    class="ws-button ws-button--primary"
                    :disabled="researchBusy || research.settings.paused"
                    @click="researchAction('run')"
                  >
                    Queue a research run</button
                  ><button
                    v-if="data.member.role === 'admin'"
                    class="ws-button"
                    :disabled="researchBusy"
                    @click="researchAction(research.settings.paused ? 'resume' : 'pause')"
                  >
                    {{ research.settings.paused ? 'Resume scheduling' : 'Pause scheduling' }}
                  </button>
                </div>
                <form
                  v-if="data.member.role === 'admin'"
                  class="research-config"
                  @submit.prevent="researchAction('settings')"
                >
                  <div class="ws-grid">
                    <label class="ws-field"
                      >Maximum new leads / week<input
                        v-model.number="research.settings.weekly_limit"
                        type="number"
                        min="1"
                        max="100"
                        required /></label
                    ><label class="ws-field"
                      >Maximum leads / run<input
                        v-model.number="research.settings.batch_limit"
                        type="number"
                        min="1"
                        max="15"
                        required /></label
                    ><label class="ws-field"
                      >Unreviewed queue ceiling<input
                        v-model.number="research.settings.queue_limit"
                        type="number"
                        min="1"
                        max="250"
                        required /></label
                    ><label class="ws-field"
                      >Concurrent research tasks<input
                        v-model.number="research.settings.concurrency"
                        type="number"
                        min="1"
                        max="2"
                        required
                    /></label>
                  </div>
                  <div class="consent">
                    <AnimatedCheckbox
                      v-model="research.settings.ai_enabled"
                      label="Enable optional Gemini analysis on eligible public sources."
                    />
                  </div>
                  <div class="consent">
                    <AnimatedCheckbox
                      v-model="research.settings.terms_confirmed"
                      label="I reviewed the API/data-use terms and confirmed this project's permitted free-tier use."
                    />
                  </div>
                  <button class="ws-button" :disabled="researchBusy">Save research limits</button>
                </form>
              </article>
              <article class="ws-panel">
                <h3>Vetted discovery sources</h3>
                <div v-for="source in research.sources" :key="source.id" class="job-row">
                  <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                    source.url
                  }}</a
                  ><span class="ws-chip">{{ source.enabled ? 'Enabled' : 'Disabled' }}</span
                  ><button
                    v-if="data.member.role === 'admin'"
                    class="ws-button"
                    @click="openSource(source)"
                  >
                    Review source
                  </button>
                </div>
                <p v-if="!research.sources.length" class="ws-muted">
                  No vetted sources enabled. An administrator must configure sources before jobs can
                  run.
                </p>
                <Transition name="ws-content"
                  ><form v-if="editingSource" class="send-confirm" @submit.prevent="saveSource">
                    <h3>Review research-only excerpt</h3>
                    <a
                      class="ws-button"
                      :href="research.sources.find((s: any) => s.id === editingSource)?.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      >Compare with official source<SiteIcon name="arrow" :size="14"
                    /></a>
                    <p class="ws-muted">
                      Only a reviewed public research excerpt may enter optional AI analysis. Remove
                      emails, phone numbers, student names/IDs, and any private or sensitive
                      information. Confirm the excerpt matches the acquired source.
                    </p>
                    <label class="ws-field"
                      >Public research excerpt<textarea
                        v-model="sourceForm.aiExcerpt"
                        @input="sourceForm.aiReviewed = false"
                        maxlength="12000"
                      />
                    </label>
                    <div class="consent">
                      <AnimatedCheckbox
                        v-model="sourceForm.enabled"
                        label="Enable this vetted discovery source."
                      />
                    </div>
                    <div class="consent">
                      <AnimatedCheckbox
                        v-model="sourceForm.aiReviewed"
                        label="I reviewed this excerpt for source accuracy and absence of personal information."
                      />
                    </div>
                    <div class="ws-actions">
                      <button class="ws-button ws-button--primary" :disabled="researchBusy">
                        Save source review</button
                      ><button type="button" class="ws-button" @click="editingSource = ''">
                        Cancel
                      </button>
                    </div>
                  </form></Transition
                >
              </article>
              <article class="ws-panel">
                <h3>Recent jobs</h3>
                <div v-for="job in research.jobs" :key="job.id" class="job-row">
                  <div>
                    <strong>{{ job.kind || 'Discovery' }}</strong
                    ><small>{{ job.created_at || job.createdAt }}</small>
                    <p v-if="job.error" class="ws-muted">{{ job.error }}</p>
                  </div>
                  <span class="ws-chip">{{ job.status }}</span>
                </div>
                <p v-if="!research.jobs.length" class="ws-muted">
                  No research runs yet. Jobs will appear here after an approved source is queued.
                </p>
              </article>
            </div>
            <div v-else class="ws-empty">Loading research controls…</div></template
          >
          <template v-else-if="tab === 'settings'"
            ><p class="ws-kicker">Separate identity from sending permission</p>
            <h2>Mailbox connections</h2>
            <div class="ws-panel">
              <p class="ws-muted">
                Signing in does not connect a mailbox. Grant sending access separately, then choose
                that mailbox for each proposal. Tokens stay server-side.
              </p>
              <div v-for="mailbox in data.mailboxes" :key="mailbox.id" class="job-row">
                <div>
                  <h3>{{ mailbox.email }}</h3>
                  <span class="ws-muted"
                    >{{ mailbox.provider }} · {{ mailbox.enabled ? 'Connected' : 'Disabled' }}</span
                  >
                </div>
                <button
                  class="ws-button ws-button--danger"
                  :disabled="busy"
                  @click="
                    mutate(`/mailboxes/${mailbox.id}`, 'DELETE', undefined, 'Mailbox disconnected.')
                  "
                >
                  Disconnect
                </button>
              </div>
              <div class="ws-actions">
                <button
                  class="ws-button ws-button--primary"
                  :disabled="connecting || !providers.gmail"
                  @click="connectMailbox('gmail')"
                >
                  <SiteIcon name="mail" :size="15" />Connect Gmail</button
                ><button
                  class="ws-button"
                  :disabled="connecting || !providers.outlook"
                  @click="connectMailbox('outlook')"
                >
                  <SiteIcon name="mail" :size="15" />Connect Outlook
                </button>
              </div>
              <p class="ws-muted connection-note">
                Microsoft sign-in and Outlook mailbox access are separate capabilities. Outlook
                sending is shown only when the server integration is configured.
              </p>
            </div>
            <div class="ws-panel account-panel">
              <h3>Access & safety</h3>
              <p class="ws-muted">
                This private workspace is for approved adult officers. Your role:
                {{ data.member.role }}. Researchers are ranked by documented fit and feasibility—not
                guaranteed response rates. Automatic bulk sending is never enabled.
              </p>
            </div></template
          >
        </section></Transition
      >
    </div>
  </WorkspaceShell>
</template>

<style scoped>
.acquisition-panel {
  padding: 20px;
  border: 1px solid #bda8df1a;
  border-radius: 20px;
  background: #bda8df04;
  margin: 18px 0;
}
.acquisition-panel > summary {
  font-size: 13px;
  color: #d0c2e4;
  cursor: pointer;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.acquired-source + .acquired-source {
  margin-top: 20px;
}
.source-text > summary {
  font-size: 11px;
  color: #b8adca;
  cursor: pointer;
  margin: 12px 0;
}
.source-text > p {
  max-height: 260px;
  overflow: auto;
  padding: 14px;
  background: #11131660;
  border-radius: 14px;
  font-size: 11px !important;
}
.acquired-analysis {
  margin-top: 24px;
}
.acquired-analysis blockquote {
  border-left: 2px solid #d2b98140;
  padding-left: 14px;
  margin: 18px 0;
  color: #bdafcf;
  font-size: 11px;
  line-height: 1.8;
}
.acquired-analysis ul {
  font-size: 11px;
  color: #bdafcf;
  line-height: 1.8;
  padding-left: 16px;
  list-style: disc;
}
.acquired-source .ws-kicker {
  margin-top: 18px;
}
.acquired-source .evidence span {
  overflow-wrap: anywhere;
}
.profile-context-block {
  margin-top: 24px;
  padding: 24px;
  border-radius: 22px;
  background: radial-gradient(ellipse at 100% 0%, #bea6e808, transparent 70%), #c4ade904;
  border: 1px solid #c4ade910;
}
.profile-section-heading {
  margin-top: 32px !important;
}
.profile-context-block > h3 {
  margin-top: 24px !important;
}
.profile-context-block > p + .ws-button {
  margin-top: 18px;
}
@media (max-width: 700px) {
  .profile-context-block {
    padding: 18px;
  }
}
.secondary-panel {
  margin-top: 26px;
}
.secondary-panel summary {
  font-family: Manrope, sans-serif;
  font-size: 16px;
  cursor: pointer;
  list-style: none;
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 18px;
}
.secondary-panel summary::before {
  content: '+';
  color: #c8b3e5;
  font-size: 22px;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
.secondary-panel[open] summary::before {
  transform: rotate(45deg);
}
.secondary-panel summary span {
  margin-left: auto;
  color: #b0a1ca;
  font-size: 12px;
}
.planner-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 18px 0;
}
.studio-nav button {
  position: relative;
}
.studio-nav button::before {
  content: '';
  position: absolute;
  left: 0;
  width: 2px;
  height: 12px;
  border-radius: 4px;
  background: #d6bd86;
  opacity: 0;
  transform: scaleY(0.4);
  transition:
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.35s;
}
.studio-nav button.active::before {
  opacity: 0.9;
  transform: scaleY(1);
}
.candidate h3 {
  font-size: 17px;
  letter-spacing: -0.015em;
}
.dossier h2 {
  font-size: 28px;
}
.dossier :deep(.themed-select) {
  margin-top: 12px;
}
.dossier :deep(.themed-select__trigger) {
  font-size: 12px;
}
.section-top h2 {
  font-size: 27px;
}
.account {
  display: flex;
  align-items: center;
  gap: 15px;
}
.studio-layout {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 30px;
}
.studio-nav {
  position: sticky;
  top: 24px;
  height: max-content;
  display: grid;
  gap: 7px;
}
.studio-nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 15px;
  border-radius: 15px;
  border: 1px solid transparent;
  text-align: left;
  font-size: 12px;
  color: #aaa4b6;
  background: transparent;
  transition:
    background 0.35s,
    color 0.35s,
    transform 0.4s;
}
.studio-nav button.active {
  color: #e6d7b4;
  background: #d2b77910;
  border-color: #d2b77922;
}
.studio-nav button:hover {
  background: #c1abef0a;
  color: #eee9f4;
  transform: translateX(2px);
}
.studio-nav button > span {
  margin-left: auto;
  font-size: 10px;
  color: #d2b779;
}
.studio-content {
  min-width: 0;
}
.section-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.queue-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 190px;
  border: 1px solid #c4b0e920;
  border-radius: 15px;
  padding: 13px 15px;
  color: #b1a8bd;
}
.search input {
  width: 100%;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: #eee9f3;
}
.queue-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.28fr);
  gap: 20px;
  align-items: start;
}
.candidate-list {
  display: grid;
  gap: 12px;
}
.candidate {
  text-align: left;
  width: 100%;
  padding: 22px;
  border: 1px solid #d5c9ed15;
  border-radius: 22px;
  background: #d5c9ed04;
  transition:
    border-color 0.35s,
    background 0.35s,
    transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  cursor: pointer;
}
.candidate:hover {
  transform: translateY(-2px);
  border-color: #d5c9ed35;
  background: #d5c9ed09;
}
.candidate.selected {
  border-color: #d6bc7955;
  background: #d6bc7909;
}
.candidate-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.score {
  font-size: 20px;
  color: #d9c696;
  text-align: right;
}
.score small {
  display: block;
  font-size: 8px;
  color: #8f899a;
}
.candidate > p {
  font-size: 11px;
  color: #aaa4b2;
  margin: 5px 0;
}
.candidate .candidate-description {
  font-size: 12px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 12px;
}
.candidate-bottom {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  font-size: 9px;
  color: #8f879b;
  margin-top: 20px;
}
.dossier {
  position: sticky;
  top: 24px;
}
.dossier h3:not(:first-child) {
  margin-top: 25px;
}
.preserve {
  white-space: pre-wrap;
}
.assessment {
  margin-top: 25px;
  padding: 20px;
  border-radius: 18px;
  background: #ac93d909;
}
.assessment ul {
  padding-left: 18px;
  margin-top: 14px;
  color: #dbbd90;
  font-size: 12px;
  line-height: 1.8;
}
.evidence {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 14px;
  padding: 14px 0;
  text-decoration: none;
  color: #c6bed7;
  font-size: 12px;
  transition:
    color 0.3s,
    transform 0.4s;
}
.evidence:hover {
  color: #efdfb5;
  transform: translateX(3px);
}
.evidence small {
  grid-row: 2;
  font-size: 10px;
  color: #8d8799;
}
.evidence svg {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
}
.source-link {
  margin-top: 16px;
}
.angle-list {
  font-size: 12px;
  line-height: 1.8;
  color: #b8b1c6;
  padding-left: 18px;
  margin-bottom: 23px;
}
.angle-list li + li {
  margin-top: 10px;
}
.dossier-empty {
  position: sticky;
  top: 24px;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.target-form {
  margin-bottom: 24px;
}
.draft-title {
  margin-top: 16px;
}
.email-body {
  min-height: 350px !important;
}
.send-confirm {
  margin-top: 22px;
  padding: 22px;
  border-radius: 20px;
  background: #d5be8510;
  border: 1px solid #d5be8530;
}
.sample {
  padding: 22px;
  background: #aa91d406;
  border-radius: 20px;
  margin: 18px 0;
  border: 1px solid #aa91d415;
}
.consent {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #b8b0c4;
  font-size: 12px;
  line-height: 1.8;
  margin: 22px 0;
}
.consent input {
  margin-top: 5px;
  width: 17px;
  height: 17px;
  accent-color: #c6addf;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.consent input:checked {
  transform: scale(1.08);
}
.job-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 0;
  border-bottom: 1px solid #e0d5f00b;
  font-size: 12px;
}
.job-row:last-child {
  border-bottom: 0;
}
.job-row a {
  color: #c2b3dc;
  overflow-wrap: anywhere;
}
.job-row strong {
  font-weight: 500;
}
.job-row small {
  display: block;
  color: #8f879b;
  margin-top: 5px;
}
.research-config {
  margin-top: 28px;
}
.connection-note {
  margin-top: 25px;
}
.account-panel,
.merge-panel {
  margin-top: 22px;
  margin-bottom: 22px;
}
.retry {
  margin-left: 15px;
  text-decoration: underline;
}
@media (max-width: 1100px) {
  .studio-layout {
    grid-template-columns: 1fr;
  }
  .studio-nav {
    position: static;
    display: flex;
    overflow: auto;
    padding-bottom: 8px;
    gap: 6px;
  }
  .studio-nav button {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .queue-layout {
    grid-template-columns: minmax(200px, 0.75fr) minmax(0, 1.25fr);
  }
}
@media (max-width: 760px) {
  .account > .ws-muted {
    display: none;
  }
  .queue-layout {
    grid-template-columns: 1fr;
  }
  .dossier,
  .dossier-empty {
    position: static;
  }
  .section-top {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .candidate-list {
    max-height: 480px;
    overflow: auto;
    padding: 2px;
  }
  .queue-tools {
    align-items: stretch;
  }
  .search {
    flex-basis: 100%;
  }
  .studio-nav button {
    padding: 12px;
  }
  .studio-nav {
    margin-inline: -4px;
  }
  .job-row {
    flex-wrap: wrap;
  }
  .score small {
    font-size: 9px;
  }
  .email-body {
    min-height: 320px !important;
  }
}
</style>
