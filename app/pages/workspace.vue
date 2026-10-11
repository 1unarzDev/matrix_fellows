<script setup lang="ts">
import ResearchProfileOverview from '~/components/workspace/ResearchProfileOverview.vue'
import SocietyConnectionCloud from '~/components/workspace/SocietyConnectionCloud.vue'
import AccountSecurity from '~/components/workspace/AccountSecurity.vue'
import DashboardWorkbench from '../components/workspace/DashboardWorkbench.vue'
import type { OutreachProfile, OutreachProposal, OutreachTarget } from '#shared/types/outreach'
import { explainResearchFit, orderResearchTargets } from '#shared/utils/research-fit'
import { proposalStyles } from '#shared/utils/outreach-tailoring'
definePageMeta({ alias: ['/dashboard'] })
useSeoMeta({ title: 'Dashboard | Matrix Fellows', robots: 'noindex, nofollow' })
const { data, loading, busy, error, notice, refresh, mutate } = useWorkspace()
const route = useRoute()
const callbackMessage = computed(() => {
  if (route.query.mailbox === 'connected')
    return 'Mailbox connected. Review and approve each message before sending.'
  if (route.query.mailbox === 'failed')
    return 'Mailbox connection did not complete. Check provider consent and try again in Connections.'
  if (route.query.auth === 'failed')
    return 'Sign-in did not complete. Please sign in with your approved member account.'
  return ''
})
const { patchQuery } = useDashboardNavigation()
const tab = computed({
  get: () =>
    typeof route.query.section === 'string' &&
    sections.value.some((section) => section.value === route.query.section)
      ? route.query.section
      : route.query.section === 'saved'
        ? 'opportunities'
        : 'today',
  set: (section: string) => patchQuery({ section }, true),
})
const canDiscover = computed(() => ['officer', 'admin'].includes(data.value?.member.role || ''))
const allSections = [
  { value: 'today', label: 'Today', icon: 'spark' },
  { value: 'queue', label: 'Research', icon: 'compass' },
  { value: 'opportunities', label: 'Opportunities', icon: 'calendar' },
  { value: 'activities', label: 'Activities', icon: 'atom' },
  { value: 'drafts', label: 'Draft review', icon: 'mail' },
  { value: 'profiles', label: 'Your profile', icon: 'spark' },
  { value: 'society', label: 'Society', icon: 'atom' },
  { value: 'research', label: 'Source management', icon: 'globe' },
  { value: 'settings', label: 'Connections', icon: 'lock' },
] as const
const sections = computed(() =>
  canDiscover.value
    ? allSections
    : [
        'today',
        'queue',
        'opportunities',
        'activities',
        'profiles',
        'society',
        'settings',
      ].map((value) => allSections.find((section) => section.value === value)!),
)
const currentSection = computed(
  () => sections.value.find((section) => section.value === tab.value) || sections.value[0],
)
const commandOpen = ref(false)
const commandDialog = ref<HTMLDialogElement>()
const sectionNav = ref<HTMLElement>()
watch(tab, async () => {
  await nextTick()
  const nav = sectionNav.value
  const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
  if (nav && active && nav.scrollWidth > nav.clientWidth) {
    // Move only the horizontal navigation; do not jump the document scroll.
    nav.scrollLeft = Math.max(0, active.offsetLeft - nav.offsetLeft - 12)
  }
})
watch(commandOpen, async (open) => {
  await nextTick()
  if (open && !commandDialog.value?.open) commandDialog.value?.showModal()
  else if (!open && commandDialog.value?.open) commandDialog.value?.close()
})
function commandKey(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    commandOpen.value = !commandOpen.value
  }
  if (event.key === 'Escape') commandOpen.value = false
}
onMounted(() => window.addEventListener('keydown', commandKey))
onBeforeUnmount(() => window.removeEventListener('keydown', commandKey))
function commandNavigate(section: string) {
  tab.value = section
  commandOpen.value = false
}
const visibleProposals = computed(() =>
  canDiscover.value ? data.value?.proposals || [] : [],
)
const initializedAccess = ref(false)
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const status = ref('active')
const lens = ref<'nearby' | 'remote' | 'travel'>('nearby')
const reachableLocations = ref('Arlington')
const fitPreferences = computed(() => ({
  lens: lens.value,
  interests: data.value?.profiles.find((p) => p.id === profileId.value)?.interests || [],
  reachableLocations: reachableLocations.value.split(',').map(v=>v.trim()).filter(Boolean),
}))
const selectedId = ref(typeof route.query.target === 'string' ? route.query.target : '')
watch([selectedId, query, lens], () => {
  if (tab.value !== 'queue') return
  patchQuery({
    target: selectedId.value || undefined,
    q: query.value || undefined,
    access: lens.value,
  })
})
watch(
  () => route.query.target,
  (id) => {
    selectedId.value = typeof id === 'string' ? id : ''
  },
)
const sectionScroll = new Map<string, number>()
watch(tab, async (value, previous) => {
  sectionScroll.set(previous, window.scrollY)
  await nextTick()
  window.scrollTo({ top: sectionScroll.get(value) || 0, behavior: 'instant' })
})
const scope = ref('society')
const profileId = ref('')
const sharedProfiles = ref<{ profileId: string; displayName: string }[]>([])
const sharedProfilePage = ref(0)
const sharedProfileTotal = ref(0)
async function loadSharedProfiles() {
  if (!canDiscover.value) return
  try {
    const response = await $fetch<{ profiles: { id: string; fullName: string }[]; total: number }>('/api/workspace/research-profile/shared', { query: { page: sharedProfilePage.value } })
    sharedProfiles.value = response.profiles.map(p => ({profileId: p.id, displayName: p.fullName}))
    sharedProfileTotal.value = response.total
  } catch { sharedProfiles.value = []; sharedProfileTotal.value = 0 }
}
const proposalStyle = ref('conversation')
const selectedProjectId = ref('')
const projectChoices = ref<{id:string;title:string}[]>([])
const selectedContribution = ref('')
const matchPreview = ref<any>(null)
const officers = ref<{id:string;label:string}[]>([])
async function loadProjects() {
  selectedProjectId.value = ''; matchPreview.value = null
  if (!canDiscover.value || !profileId.value) { projectChoices.value=[]; return }
  try { const result=await $fetch<{projects:{id:string;title:string}[]}>('/api/workspace/research-profile/projects',{query:{profileId:profileId.value}}); projectChoices.value=result.projects }
  catch { projectChoices.value=[] }
}
watch(profileId, loadProjects)
watch([selectedId,selectedProjectId,selectedContribution,scope],()=>{matchPreview.value=null})
const contributionChoices = computed(()=> {
 const acquisition=selected.value?.dossier.acquisition as any
 return (acquisition?.publicAnalysis?.proposalOptions || []).map((option:any,index:number)=>({value:String(index),label:option.title}))
})
async function previewMatch() {
 if(!selected.value) return
 const result=await mutate<any>('/matches','POST',{targetId:selected.value.id,...(scope.value==='student'?{profileId:profileId.value}:{}),...(selectedProjectId.value?{projectId:selectedProjectId.value}:{}),...(selectedContribution.value!==''?{contributionOption:Number(selectedContribution.value)}:{})})
 matchPreview.value=result?.items?.[0] || null
 if(result && !matchPreview.value) notice.value='No practical match under the represented member’s saved access preferences. Review those constraints first.'
}
async function saveAccessPreferences() {
 await mutate('/research-profile/preferences','POST',{lens:lens.value,reachableLocations:reachableLocations.value.split(',').map(v=>v.trim()).filter(Boolean)},'Access preferences saved.')
}
onMounted(async()=> {
 try { const preference=await $fetch<{lens:'nearby'|'remote'|'travel';reachableLocations:string[]}>('/api/workspace/research-profile/preferences');lens.value=preference.lens;reachableLocations.value=preference.reachableLocations.join(', ') } catch {}
 if(canDiscover.value) { try { const roster=await $fetch<{officers:{id:string;label:string}[]}>('/api/workspace/officers');officers.value=roster.officers || [] } catch {} }
})
const unsaved = computed(() =>
  Boolean(
    changed.value ||
    editTarget.value ||
    (profileBaseline.value && JSON.stringify(profileForm) !== profileBaseline.value),
  ),
)
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
const selected = computed(() => data.value?.targets.find((t) => t.id === selectedId.value))
const selectedDecision = ref<'ready' | 'deferred' | 'rejected'>('ready')
watch(selectedId, () => { selectedDecision.value = 'ready' })
async function updateSelectedStatus() {
  if (!selected.value || busy.value) return
  const messages = {
    ready: 'Candidate kept in the active research queue.',
    deferred: 'Candidate moved to your later list.',
    rejected: 'Candidate removed from the active research queue.',
  }
  await mutate(
    `/targets/${selected.value.id}`,
    'PATCH',
    { status: selectedDecision.value, expectedUpdatedAt: selected.value.updatedAt },
    messages[selectedDecision.value],
  )
}
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
const targets = computed(() =>
  orderResearchTargets(
    (data.value?.targets || []).filter(
      (t) =>
        (status.value === 'all' ||
          (status.value === 'active'
            ? !['deferred', 'rejected', 'contacted'].includes(t.status)
            : t.status === status.value)) &&
        `${t.name} ${t.organization} ${t.description}`
          .toLowerCase()
          .includes(query.value.toLowerCase()),
    ),
    fitPreferences.value,
  ),
)
watch(
  [tab, targets],
  () => {
    // Put the officer in a useful review state as soon as the queue arrives.
    // A deep link or an explicit selection always wins over this convenience default.
    if (tab.value !== 'queue' || selectedId.value || !targets.value.length) return
    const firstTarget = targets.value[0]
    if (firstTarget) selectedId.value = firstTarget.id
  },
  { immediate: true },
)
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
  if (!canDiscover.value) return
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
const profileBaseline = ref(JSON.stringify(profileForm))
const profileExpectedUpdatedAt = ref('')
const profileSaving = ref(false)
watch(data, (value) => {
  if (!value) return
  if (!initializedAccess.value) {
    initializedAccess.value = true
    if (!canDiscover.value) {
      scope.value = 'student'
    }
  }
  if (!canDiscover.value && ['research', 'drafts'].includes(String(route.query.section))) tab.value = 'today'
  const p = value.profiles.find((profile) => profile.id === value.primaryProfileId) || value.profiles[0]
  if (p && !profileSaving.value && (!profileForm.id || profileForm.id !== p.id)) {
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
    profileBaseline.value = JSON.stringify(profileForm)
    profileExpectedUpdatedAt.value = p.updatedAt
  }
  if (!canDiscover.value && !profileId.value && p) profileId.value = p.id
})
async function saveProfile() {
  const snapshot = JSON.parse(JSON.stringify(profileForm))
  const { id, ...p } = snapshot
  profileSaving.value = true
  try {
    const result = await mutate<OutreachProfile>(
      id ? `/profiles/${id}` : '/profiles',
      id ? 'PATCH' : 'POST',
      {
        ...(id ? { expectedUpdatedAt: profileExpectedUpdatedAt.value } : {}),
        ...p,
        interests: split(p.interests),
        skills: split(p.skills),
        affiliations: split(p.affiliations),
      },
    )
    if (result) {
      profileForm.id = result.id
      profileBaseline.value = JSON.stringify({ ...snapshot, id: result.id })
      profileExpectedUpdatedAt.value = result.updatedAt
      if (JSON.stringify(profileForm) !== profileBaseline.value)
        notice.value = 'Submitted profile saved. Your newer edits still need saving.'
    }
  } finally {
    profileSaving.value = false
  }
}
async function plan() {
  if (!canDiscover.value || !selected.value) return
  const result = await mutate(
    '/planner',
    'POST',
    {
      targetId: selected.value.id,
      ...(matchPreview.value ? {matchId:matchPreview.value.id} : {}),
      ...(selectedProjectId.value ? {projectId:selectedProjectId.value} : {}),
      ...(selectedContribution.value !== '' ? {contributionOption:Number(selectedContribution.value)} : {}),
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
const proposal = computed(() => visibleProposals.value.find((p) => p.id === proposalId.value))
const sendConfirm = ref(false)
const uncertainSends = ref<string[]>([])
const savingDraft = ref(false)
const draftSaveState = ref('')
const draftConflict = ref(false)
const revisionPreview = ref<{baseRevision:number;subject:string;body:string;notices:string[];buffer:string} | null>(null)
const revising = ref(false)
const handoffOwner = ref('')
async function proposeRevision(action: 'shorten' | 'smaller_ask' | 'direct' | 'remove_claim', claimId?: string) {
  if (!proposal.value || changed.value || revising.value) return
  const current = proposal.value
  const buffer = JSON.stringify(draft)
  revising.value = true
  try {
    const result = await $fetch<Omit<NonNullable<typeof revisionPreview.value>, 'buffer'>>(`/api/workspace/proposals/${current.id}/revise`, {method:'POST',body:{revision:current.revision,action,...(claimId?{claimId}:{})}})
    if (proposalId.value === current.id) revisionPreview.value = {...result,buffer}
  } catch (cause: any) { draftSaveState.value = cause?.data?.statusMessage || 'The proposed revision is unavailable. Your edits are preserved.' }
  finally { revising.value = false }
}
const revisionCanApply = computed(() => Boolean(revisionPreview.value && proposal.value?.revision === revisionPreview.value.baseRevision && JSON.stringify(draft) === revisionPreview.value.buffer))
function applyRevisionPreview() {
  if (!revisionCanApply.value || !revisionPreview.value) return
  draft.subject = revisionPreview.value.subject
  draft.body = revisionPreview.value.body
  revisionPreview.value = null
}
async function handoffDraft() {
  if (!proposal.value || changed.value || !handoffOwner.value) return
  const result = await mutate(`/proposals/${proposal.value.id}/handoff`, 'POST', {ownerId:handoffOwner.value}, 'Draft handed off. The new owner must choose their mailbox and approve a fresh revision.')
  if (result) { proposalId.value = ''; handoffOwner.value = '' }
}
const revisions = ref<{ revision: number; subject: string; body: string; created_at: string }[]>([])
let autosaveTimer: ReturnType<typeof setTimeout> | undefined
async function loadRevisions() {
  if (!proposal.value) return
  try {
    revisions.value = (
      await $fetch<{ items: typeof revisions.value }>(
        `/api/workspace/proposals/${proposal.value.id}/revisions`,
      )
    ).items
  } catch {
    draftSaveState.value = 'Revision history unavailable. Your current text is preserved.'
  }
}
async function copyDraft() {
  try {
    await navigator.clipboard.writeText(draft.subject + '\n\n' + draft.body)
    draftSaveState.value = 'Draft copied'
  } catch {
    draftSaveState.value = 'Copy unavailable. Select the message text and copy it manually.'
  }
}
function openProposal(p: OutreachProposal) {
  if (
    changed.value &&
    !window.confirm('Keep this draft open until your changes are saved? Cancel to stay.')
  )
    return
  clearTimeout(autosaveTimer)
  draftConflict.value = false
  revisionPreview.value = null
  draftSaveState.value = ''
  revisions.value = []
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
      draft.mailboxId !== (proposal.value.mailboxId || '') ||
      draft.profileId !== (proposal.value.profileId || '')),
)
async function saveDraft() {
  if (!proposal.value || savingDraft.value || draftConflict.value || !changed.value) return
  const current = proposal.value
  const snapshot = {
    ...draft,
    targetId: current.targetId,
    kind: current.kind,
    revision: current.revision,
    mailboxId: draft.mailboxId || null,
    profileId: draft.profileId || null,
  }
  savingDraft.value = true
  draftSaveState.value = 'Saving…'
  try {
    const saved = await $fetch<OutreachProposal>(`/api/workspace/proposals/${current.id}`, {
      method: 'PATCH',
      body: snapshot,
    })
    const index = data.value?.proposals.findIndex((p) => p.id === saved.id) ?? -1
    if (data.value && index >= 0) data.value.proposals[index] = saved
    draftSaveState.value = 'Draft saved'
    // Never replace the editor buffer: typing may have continued while saving.
  } catch (cause: any) {
    draftConflict.value = (cause?.statusCode || cause?.status) === 409
    draftSaveState.value = draftConflict.value
      ? 'Another revision exists. Copy your text before reloading; nothing here was overwritten.'
      : 'Save failed. Your text is still here; retry saving.'
  } finally {
    savingDraft.value = false
    if (changed.value && !draftConflict.value && draftSaveState.value === 'Draft saved')
      autosaveTimer = setTimeout(saveDraft, 900)
  }
}
watch(
  draft,
  () => {
    clearTimeout(autosaveTimer)
    sendConfirm.value = false
    if (proposal.value && proposal.value.status !== 'sent' && !draftConflict.value)
      autosaveTimer = setTimeout(saveDraft, 900)
  },
  { deep: true },
)
onBeforeUnmount(() => clearTimeout(autosaveTimer))
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
const researchActionState = ref<'idle' | 'queued' | 'saved' | 'failed'>('idle')
const researchActionMessage = ref('')
const sourceOffset = ref(0)
const jobOffset = ref(0)
const sourceFilter = ref('')
async function loadResearch() {
  try {
    research.value = await $fetch('/api/workspace/research', { query: { sourceOffset: sourceOffset.value, jobOffset: jobOffset.value, limit: 40, ...(sourceFilter.value ? { sourceId: sourceFilter.value } : {}) } })
  } catch (e: any) {
    researchError.value = e?.data?.statusMessage || 'Research settings unavailable.'
  }
}
function researchAction(action: string) {
  if (researchBusy.value || !research.value) return
  researchBusy.value = true
  researchError.value = ''
  researchActionState.value = 'queued'
  researchActionMessage.value = action === 'run'
    ? 'Research run queued. You can keep working while agents gather evidence.'
    : action === 'settings'
      ? 'Research limits saved locally. Syncing them in the background…'
      : research.value.settings.paused ? 'Resuming the research schedule…' : 'Pausing the research schedule…'
  const previousSettings = { ...research.value.settings }
  const settings = action === 'settings'
    ? {
        weekly_limit: research.value.settings.weekly_limit,
        batch_limit: research.value.settings.batch_limit,
        queue_limit: research.value.settings.queue_limit,
        concurrency: research.value.settings.concurrency,
        ai_enabled: research.value.settings.ai_enabled,
        terms_confirmed: research.value.settings.terms_confirmed,
      }
    : undefined
  if (action === 'pause' || action === 'resume') research.value.settings.paused = action === 'pause'
  if (action === 'run') {
    const localJob = { id: `queued-${Date.now()}`, kind: 'Discovery', status: 'queued', created_at: new Date().toISOString(), error: null }
    research.value.jobs = [localJob, ...(research.value.jobs || [])]
  }
  void (async () => {
    try {
      await $fetch('/api/workspace/research' as string, {
        method: 'POST',
        body: { action, ...(settings ? { settings } : {}) },
      })
      researchActionState.value = 'saved'
      researchActionMessage.value = action === 'run' ? 'Research run accepted. New evidence will appear here when ready.' : 'Research settings updated.'
      await loadResearch()
    } catch (e: any) {
      if (action === 'pause' || action === 'resume' || action === 'settings') Object.assign(research.value!.settings, previousSettings)
      if (action === 'run') research.value!.jobs = research.value!.jobs.filter((job: any) => !String(job.id).startsWith('queued-'))
      researchActionState.value = 'failed'
      researchActionMessage.value = ''
      researchError.value = e?.data?.message || e?.data?.statusMessage || 'The research action could not be completed.'
    } finally {
      researchBusy.value = false
    }
  })()
}
const editingSource = ref('')
const sourceForm = reactive({ enabled: false, aiExcerpt: '', aiReviewed: false, snapshotHash: '' })
async function openSource(source: any) {
  try {
    const detail = await $fetch<{ source: any }>(`/api/workspace/research/sources/${encodeURIComponent(source.id)}`)
    source = detail.source
  } catch (cause: any) {
    researchError.value = cause?.data?.statusMessage || 'The source snapshot could not be loaded. Retry before reviewing.'
    return
  }
  editingSource.value = source.id
  Object.assign(sourceForm, {
    enabled: source.enabled,
    aiExcerpt: source.ai_excerpt || '',
    aiReviewed: source.ai_reviewed || false,
    snapshotHash: source.snapshot?.hash || source.latest_snapshot_hash || source.last_hash || '',
  })
}
function saveSource() {
  if (researchBusy.value || !editingSource.value) return
  const sourceId = editingSource.value
  const payload = { ...sourceForm }
  const source = research.value?.sources.find((item: any) => item.id === sourceId)
  const previous = source ? { enabled: source.enabled, ai_excerpt: source.ai_excerpt, ai_reviewed: source.ai_reviewed } : null
  if (source) Object.assign(source, { enabled: payload.enabled, ai_excerpt: payload.aiExcerpt, ai_reviewed: payload.aiReviewed })
  editingSource.value = ''
  researchBusy.value = true
  researchActionState.value = 'queued'
  researchActionMessage.value = 'Source review saved locally. Updating the research runner in the background…'
  researchError.value = ''
  void (async () => {
    try {
      await $fetch('/api/workspace/research', { method: 'POST', body: { action: 'source', sourceId, ...payload } })
      researchActionState.value = 'saved'
      researchActionMessage.value = 'Source review updated. Future runs will use the new excerpt.'
      await loadResearch()
    } catch (e: any) {
      if (source && previous) Object.assign(source, previous)
      editingSource.value = sourceId
      researchActionState.value = 'failed'
      researchActionMessage.value = ''
      researchError.value = e?.data?.statusMessage || 'Could not save source review.'
    } finally {
      researchBusy.value = false
    }
  })()
}
watch(tab, (value) => {
  if (value === 'research' && canDiscover.value) void loadResearch()
})
const historicalMailboxes = ref<any[]>([])
const connecting = ref(false)
const voicePreferences = reactive({length:'standard',formality:'neutral',opening:'greeting',requestStyle:'tentative'})
const voiceNotice = ref('')
async function loadVoice() {
 if(!canDiscover.value) return
 try { const result=await $fetch<any>('/api/workspace/voice');Object.assign(voicePreferences,result.preferences || {});voiceNotice.value=result.notice || '' }catch{voiceNotice.value='Local voice preferences are unavailable.'}
}
async function saveVoice() {
 const result=await mutate<any>('/voice','PUT',{...voicePreferences},'Your local voice preferences are saved.')
 if(result) voiceNotice.value=result.notice
}
watch(tab,value=>{if(value==='settings') void loadVoice()})
const providers = ref({ gmail: false, outlook: false })
async function loadMailboxes() {
  try {
    const response = await $fetch<{ items: any[]; providers: { gmail: boolean; outlook: boolean } }>(
      '/api/workspace/mailboxes',
    )
    providers.value = response.providers
    historicalMailboxes.value = response.items || []
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
  if (value === 'drafts' && canDiscover.value) void loadOutbox()
})
onMounted(async () => {
  await refresh()
  await loadMailboxes()
  if (canDiscover.value) {
    await loadSharedProfiles()
  }
})
</script>

<template>
  <WorkspaceShell title="Your workspace">
    <template #header
      ><div class="account">
        <span v-if="data" class="ws-muted">{{ data.member.email }}</span
        ><button class="ws-button" @click="logout">
          <SiteIcon name="lock" :size="15" />Sign out
        </button>
      </div></template
    >
    <dialog
      ref="commandDialog"
      class="command-menu"
      aria-labelledby="command-title"
      @close="commandOpen = false"
      @cancel="commandOpen = false"
    >
      <h2 id="command-title">Go to your work</h2>
      <button
        v-for="section in sections"
        :key="section.value"
        class="ws-button"
        @click="commandNavigate(section.value)"
      >
        {{ section.label }}
      </button>
      <button class="ws-button" @click="commandOpen = false">Close</button>
    </dialog>
    <div v-if="error" role="alert" class="ws-alert ws-error">
      {{ error }} <button class="retry" @click="refresh">Retry</button>
    </div>
    <div v-if="notice" role="status" class="ws-alert ws-success">{{ notice }}</div>
    <div v-if="callbackMessage" role="status" class="ws-alert">{{ callbackMessage }}</div>
    <div v-if="loading && !data" class="ws-empty">
      <OrbitalLoader />
      <p>Opening your dashboard…</p>
    </div>
    <div v-else-if="data" class="studio-layout">
      <nav ref="sectionNav" class="studio-nav" aria-label="Dashboard sections">
        <button
          v-for="section in sections"
          :key="section.value"
          :class="{ active: tab === section.value }"
          :data-group-start="section.value === 'drafts'"
          :data-secondary="
            ['drafts', 'profiles', 'society', 'research', 'settings'].includes(section.value)
          "
          :aria-current="tab === section.value ? 'page' : undefined"
          @click="tab = section.value"
        >
          <SiteIcon :name="section.icon" :size="17" />{{ section.label
          }}<span v-if="section.value === 'queue'">{{
            data.targets.filter((t) => t.status === 'needs_review').length
          }}</span>
        </button>
      </nav>
      <div class="studio-mobile-nav">
        <label class="studio-mobile-nav__label" for="dashboard-section-select">Section</label>
        <div class="studio-mobile-nav__control">
          <SiteIcon :name="currentSection?.icon || 'spark'" :size="16" />
          <select
            id="dashboard-section-select"
            v-model="tab"
            aria-label="Dashboard section"
          >
            <option v-for="section in sections" :key="section.value" :value="section.value">
              {{ section.label }}
            </option>
          </select>
          <span class="studio-mobile-nav__chevron" aria-hidden="true">⌄</span>
        </div>
      </div>
      <DashboardWorkbench
        v-show="['today', 'opportunities', 'activities'].includes(tab)"
        :workspace="data"
        :section="
          (['today', 'opportunities', 'activities'].includes(tab) ? tab : 'today') as
            'today' | 'opportunities' | 'activities'
        "
        @navigate="tab = $event"
      />
      <Transition
        v-if="!['today', 'opportunities', 'activities'].includes(tab)"
        name="ws-content"
        mode="out-in"
        ><section :key="tab" class="studio-content">
          <template v-if="tab === 'queue'">
            <div class="section-top">
              <div>
                <p class="ws-kicker">
                  {{ canDiscover ? 'Shared source review' : 'Connections assigned to you' }}
                </p>
                <h2>Research queue</h2>
              </div>
              <button v-if="canDiscover" class="ws-button" @click="openTarget()">
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
                    ><span class="ws-chip">Participation unconfirmed</span>
                  </div>
                  <h3>{{ target.name }}</h3>
                  <p>{{ target.organization }}</p>
                  <p class="candidate-description">{{ target.description }}</p>
                  <p
                    v-for="reason in explainResearchFit(target, fitPreferences).reasons.slice(0, 2)"
                    :key="reason"
                  >
                    {{ reason }}
                  </p>
                  <div class="candidate-bottom">
                    <span>{{ target.location || 'Location unverified' }}</span
                    ><span class="candidate-review">Review dossier <SiteIcon name="right" :size="12" /></span>
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
                  <p class="ws-muted dossier-note">Review the evidence and choose a clear first ask. After an email is accepted, this candidate leaves the active queue; future outcomes are recorded with the sent message rather than tracked as a separate relationship workspace.</p>
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
                      'Participation access and mentoring availability remain unverified. Ask before proposing on-site work.'
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
                    class="evidence source-link"
                    ><span>Open the official source</span><SiteIcon name="arrow" :size="14"
                  /></a>
                  <div class="ws-divider" />
                  <details class="research-next-step" :open="Boolean(matchPreview)">
                    <summary><span>Next step</span><small>Shape one focused connection</small></summary>
                    <p class="ws-muted">Choose the lightest honest path. The draft stays editable and nothing sends automatically.</p>
                    <ThemedSelect
                      v-if="canDiscover"
                      v-model="scope"
                      label="Connection type"
                      :options="[
                        { value: 'society', label: 'Matrix Fellows connection' },
                        { value: 'student', label: 'Personal inquiry' },
                      ]"
                    /><ThemedSelect
                      v-if="canDiscover && scope === 'student'"
                      v-model="profileId"
                      label="Represented profile"
                      :options="[{value: '', label: 'Choose a consenting member'}, ...sharedProfiles.map((p) => ({ value: p.profileId, label: p.displayName }))]"
                    />
                    <ThemedSelect v-if="canDiscover && scope === 'student' && projectChoices.length" v-model="selectedProjectId" label="Relevant project" :options="[{value:'',label:'Use profile context'},...projectChoices.map(p=>({value:p.id,label:p.title}))]" />
                    <ThemedSelect v-if="canDiscover && contributionChoices.length" v-model="selectedContribution" label="Supported angle" :options="[{value:'',label:'Let the plan choose'},...contributionChoices]" />
                    <button v-if="canDiscover" class="ws-button ws-button--primary" :disabled="busy || (scope === 'student' && !profileId)" @click="previewMatch">Review the connection plan <SiteIcon name="right" :size="14" /></button>
                  </details>
                  <section v-if="matchPreview" aria-label="Selected connection plan">
                    <h3>{{ matchPreview.plan.connection }}</h3>
                    <p v-for="contact in matchPreview.coordination" :key="contact.id" class="ws-muted">Prior outreach signal: {{ contact.stage }} · assigned officer {{ contact.ownerId }}. Review the existing message before preparing a new ask.</p>
                    <p class="ws-muted">History coverage: {{ matchPreview.historyStatus }}. Unresolved legacy contact may need manual review.</p>
                    <p>{{ matchPreview.topicOverlap }}</p>
                    <p>{{ matchPreview.plan.deliverable || matchPreview.plan.question }}</p>
                    <p v-for="dimension in matchPreview.plan.dimensions" :key="dimension.dimension" class="ws-muted">{{ dimension.reason }}</p>
                    <p v-for="unknown in matchPreview.plan.unknowns" :key="unknown" class="ws-muted">{{ unknown }}</p>
                    <p class="ws-muted">{{ matchPreview.access.access }} access. This plan does not establish a recruiting need or commitment.</p>
                  </section>
                  <div v-if="canDiscover && matchPreview" class="research-dossier-actions">
                    <ThemedSelect
                      v-model="proposalStyle"
                      label="Draft tone"
                      :options="proposalStyles.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))"
                    />
                    <button class="ws-button ws-button--primary" :disabled="busy || !matchPreview || (scope === 'student' && !profileId)" @click="plan()">
                      Shape the draft<SiteIcon name="right" :size="14" />
                    </button>
                    <details class="research-more-actions">
                      <summary>More candidate actions</summary>
                      <button class="ws-button" @click="openTarget(selected)">Edit evidence</button>
                      <div class="research-status-action">
                        <ThemedSelect v-model="selectedDecision" label="Queue status" :options="[{value:'ready',label:'Keep active'},{value:'deferred',label:'For later'},{value:'rejected',label:'Not viable'}]" />
                        <button class="ws-button" :disabled="busy" @click="updateSelectedStatus">Update status</button>
                      </div>
                    </details>
                  </div>
                </article>
                <div v-else class="ws-empty dossier-empty">
                  <SiteIcon name="compass" :size="32" />
                  <p>
                    Choose a candidate to review its evidence and shape one clear next step.
                  </p>
                </div></Transition
              >
            </div>
          </template>
          <template v-else-if="tab === 'drafts' && canDiscover"
            ><div class="section-top">
              <div>
                <h2>Draft review</h2>
              </div>
              <span class="ws-chip">Every send requires your approval</span>
            </div>
            <div class="queue-layout">
              <div class="candidate-list">
                <button
                  v-for="p in visibleProposals"
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
                <div v-if="!visibleProposals.length" class="ws-empty">
                  Select a candidate in Discovery and shape a proposal. Nothing is sent
                  automatically.
                </div>
              </div>
              <form v-if="proposal" class="ws-panel" @submit.prevent="saveDraft">
                <h2>Review your inquiry</h2>
                <p class="ws-muted">
                  To
                  {{
                    data.targets.find((t) => t.id === proposal?.targetId)?.name || 'selected target'
                  }}
                  ·
                  {{
                    proposal.kind === 'society'
                      ? 'Matrix Fellows'
                      : sharedProfiles.find((p) => p.profileId === proposal?.profileId)?.displayName ||
                        data.profiles.find((p) => p.id === proposal?.profileId)?.fullName ||
                        'Represented member'
                  }}
                </p>
                <p class="ws-muted">
                  Verify personalizations, narrow the ask, and remove claims you cannot demonstrate.
                  Editing invalidates approval.
                </p>
                <details class="sample">
                  <summary>Evidence for this inquiry</summary>
                  <a
                    v-for="source in data.targets.find((t) => t.id === proposal?.targetId)?.dossier
                      .evidence || []"
                    :key="source.url + source.claim"
                    class="evidence"
                    :href="source.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    ><span>{{ source.claim }}</span
                    ><small
                      >{{ source.confidence }} · {{ source.retrievedAt.slice(0, 10) }}</small
                    ></a
                  >
                  <a
                    v-for="sample in data.profiles.find((p) => p.id === proposal?.profileId)
                      ?.workSamples || []"
                    :key="sample.url"
                    class="evidence"
                    :href="sample.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    ><span>{{ sample.title }} · {{ sample.contribution }}</span
                    ><small>Your member-supplied contribution; review before using it.</small></a
                  >
                </details>
                <p v-if="draftSaveState" role="status" class="ws-muted">{{ draftSaveState }}</p>
                <div class="ws-actions">
                  <button type="button" class="ws-button" @click="copyDraft">Copy draft</button>
                  <button type="button" class="ws-button" @click="loadRevisions">
                    Revision history
                  </button>
                </div>
                <details v-for="revision in revisions" :key="revision.revision" class="sample">
                  <summary>
                    Revision {{ revision.revision }} · {{ revision.created_at.slice(0, 10) }}
                  </summary>
                  <h3>{{ revision.subject }}</h3>
                  <p class="preserve ws-muted">{{ revision.body }}</p>
                </details>
                <div class="ws-actions" v-if="proposal.status !== 'sent'">
                  <button type="button" class="ws-button" :disabled="changed || revising" @click="proposeRevision('shorten')">Shorten</button>
                  <button type="button" class="ws-button" :disabled="changed || revising" @click="proposeRevision('smaller_ask')">Make the ask smaller</button>
                  <button type="button" class="ws-button" :disabled="changed || revising" @click="proposeRevision('direct')">Make it more direct</button>
                </div>
                <section v-if="revisionPreview" class="send-confirm" aria-label="Proposed revision preview">
                  <h3>Proposed local edit</h3>
                  <p v-for="message in revisionPreview.notices" :key="message" class="ws-muted">{{ message }}</p>
                  <details><summary>Current message</summary><p class="preserve">{{ draft.body }}</p></details>
                  <p class="preserve">{{ revisionPreview.body }}</p>
                  <p v-if="!revisionCanApply" class="ws-muted">Your draft changed while this suggestion was prepared. Request a new preview to preserve your edits.</p>
                  <button type="button" class="ws-button" :disabled="!revisionCanApply" @click="applyRevisionPreview">Use proposed edit</button>
                  <button type="button" class="ws-button" @click="revisionPreview = null">Keep current text</button>
                </section>
                <details v-if="proposal.proposalPlan" class="sample">
                  <summary>Selected plan and factual supports</summary>
                  <p>{{ proposal.proposalPlan.connection }}</p>
                  <p class="ws-muted">{{ proposal.proposalPlan.provenance === 'reviewed-model-analysis' ? 'Local draft informed by reviewed Gemini analysis' : 'Local evidence-based draft' }}</p>
                  <p v-for="issue in proposal.proposalPlan.reviewIssues" :key="issue" class="ws-muted">{{ issue }}</p>
                  <article v-for="support in proposal.proposalPlan.sentenceSupports" :key="support.sentence">
                    <p>{{ support.sentence }}</p><small class="ws-muted">{{ support.classification }}</small>
                    <a v-for="source in support.sources" :key="source.url + source.quote" :href="source.url" target="_blank" rel="noopener noreferrer">Source: {{ source.quote }}</a>
                    <button v-for="claim in support.claimIds" :key="claim" type="button" class="ws-button" :disabled="changed || revising || proposal.status === 'sent'" @click="proposeRevision('remove_claim', claim)">Remove this claim</button>
                  </article>
                </details>
                <details v-if="proposal.status !== 'sent'" class="sample"><summary>Hand this draft to an appointed officer</summary>
                  <ThemedSelect v-model="handoffOwner" label="New draft owner" :options="[{value:'',label:'Choose an active officer'},...officers.map(o=>({value:o.id,label:o.label}))]" />
                  <p class="ws-muted">Original authorship remains. Mailbox authorization never transfers.</p>
                  <button type="button" class="ws-button" :disabled="changed || busy || !handoffOwner" @click="handoffDraft">Hand off draft</button>
                </details>
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
                  <button
                    class="ws-button"
                    :disabled="busy || savingDraft || draftConflict || !changed"
                  >
                    Save changes</button
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
                    <h4>{{ proposal.subject }}</h4>
                    <p class="preserve ws-muted">{{ proposal.body }}</p>
                    <p class="ws-muted">
                      No attachments · reviewed revision {{ proposal.approvedRevision }}
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
            ><section class="ws-panel" aria-label="Practical participation preferences">
              <ThemedSelect v-model="lens" label="Practical participation" :options="[{value:'nearby',label:'Nearby or remote'},{value:'remote',label:'Remote only'},{value:'travel',label:'Travel is practical'}]" />
              <label class="ws-field">Reachable cities or campuses<input v-model="reachableLocations" placeholder="Arlington, Dallas" /></label>
              <button class="ws-button" :disabled="busy" @click="saveAccessPreferences">Save access preferences</button>
            </section><ResearchProfileOverview v-if="profileForm.id" :profile-id="profileForm.id" @updated="refresh" />
            <details class="ws-panel secondary-panel"><summary>Advanced profile editing</summary>
            <form @submit.prevent="saveProfile">
              <p class="ws-kicker">Your context changes the proposal</p>
              <h2>Your research profile</h2>
              <p class="ws-muted">
                Describe only work and skills you can substantiate. This private profile belongs to
                your account; it is not a public member directory.
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
                  outlined
                  label="Allow reviewed proposals to use my profile information."
                  description="Nothing is sent without exact-email approval."
                />
              </div>
              <div class="ws-actions">
                <button class="ws-button ws-button--primary" :disabled="busy">
                  Save my profile
                </button>
              </div>
            </form></details></template
          >
          <template v-else-if="tab === 'society'">
            <SocietyConnectionCloud :officer="canDiscover" />
          </template>
          <template v-else-if="tab === 'research' && canDiscover"
            ><p class="ws-kicker">Bounded discovery, not a flood</p>
            <h2>Research runs</h2>
            <p class="ws-muted">
              Scheduled Monday, Wednesday, and Friday at 16:00 UTC. Agents discover and qualify
              leads; they never send email.
            </p>
            <div v-if="researchError" role="alert" class="ws-alert ws-error">
              {{ researchError }}
            </div>
            <Transition name="research-action"><p v-if="researchActionMessage" class="research-action-status" :class="`research-action-status--${researchActionState}`" role="status"><span class="research-action-status__orb" aria-hidden="true" />{{ researchActionMessage }}</p></Transition>
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
                      outlined
                      label="Enable optional Gemini analysis on eligible public sources."
                    />
                  </div>
                  <div class="consent">
                    <AnimatedCheckbox
                      v-model="research.settings.terms_confirmed"
                      outlined
                      label="I reviewed the API/data-use terms and confirmed this project's permitted free-tier use."
                    />
                  </div>
                  <button class="ws-button" :disabled="researchBusy">Save research limits</button>
                </form>
              </article>
              <article class="ws-panel">
                <h3>Vetted discovery sources</h3>
                <form class="ws-actions" @submit.prevent="sourceOffset = 0; jobOffset = 0; loadResearch()">
                  <label class="ws-field">Find source by ID<input v-model="sourceFilter" placeholder="Registry or target source ID" /></label>
                  <button class="ws-button">Filter sources</button>
                </form>
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
                <div v-if="research.pagination" class="ws-actions">
                  <button class="ws-button" :disabled="sourceOffset === 0" @click="sourceOffset = Math.max(0, sourceOffset - 40); loadResearch()">Previous sources</button>
                  <span class="ws-muted">{{ sourceOffset + 1 }}–{{ sourceOffset + research.sources.length }} of {{ research.pagination.sourceTotal }}</span>
                  <button class="ws-button" :disabled="sourceOffset + research.sources.length >= research.pagination.sourceTotal" @click="sourceOffset += 40; loadResearch()">Next sources</button>
                </div>
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
                        outlined
                        label="Enable this vetted discovery source."
                      />
                    </div>
                    <div class="consent">
                      <AnimatedCheckbox
                        v-model="sourceForm.aiReviewed"
                        outlined
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
                <p class="ws-muted">{{ research.health?.stages?.filter((s:any)=>s.status==='waiting_quota').length || 0 }} recent stages waiting for quota. Completed evidence is reused on retry.</p>
                <p v-if="research.health?.usage" class="ws-muted">Today's reserved usage: {{ research.health.usage.source_requests }} source requests, {{ research.health.usage.source_bytes }} bytes, {{ research.health.usage.model_requests }} model requests and {{ research.health.usage.model_tokens }} tokens. Reservations include unknown-cost interrupted calls.</p>
                <p class="ws-muted">{{ research.health?.coverage?.filter((s:any)=>s.enabled).length || 0 }} enabled sources in the displayed coverage inventory{{ research.health?.coveragePartial ? ' (partial)' : '' }}. Coverage is bounded; current openings still require review.</p>
                <div v-for="job in research.jobs" :key="job.id" class="job-row">
                  <div>
                    <strong>{{ job.kind || 'Discovery' }}</strong
                    ><small>{{ job.created_at || job.createdAt }}</small>
                    <p v-if="job.error" class="ws-muted">{{ job.error }}</p>
                  </div>
                  <span class="ws-chip">{{ job.failure_kind === 'quota_wait' ? 'Waiting for quota' : job.status }}</span>
                  <button v-if="data.member.role === 'admin' && job.status === 'failed'" class="ws-button" :disabled="researchBusy" @click="mutate('/research','POST',{action:'retry',jobId:job.id},'Stage retry queued.'); loadResearch()">Retry stage</button>
                </div>
                <div v-if="research.pagination" class="ws-actions">
                  <button class="ws-button" :disabled="jobOffset === 0" @click="jobOffset = Math.max(0, jobOffset - 40); loadResearch()">Previous jobs</button>
                  <button class="ws-button" :disabled="jobOffset + research.jobs.length >= research.pagination.jobTotal" @click="jobOffset += 40; loadResearch()">Next jobs</button>
                </div>
                <p v-if="!research.jobs.length" class="ws-muted">
                  No research runs yet. Jobs will appear here after an approved source is queued.
                </p>
              </article>
            </div>
            <div v-else class="ws-empty">Loading research controls…</div></template
          >
          <template v-else-if="tab === 'settings'"
            ><AccountSecurity />
            <p class="ws-kicker">Separate identity from sending permission</p>
            <h2>Mailbox connections</h2>
            <div class="ws-panel">
              <p class="ws-muted">
                Signing in does not connect a mailbox. Grant sending access separately, then choose
                that mailbox for each proposal. Tokens stay server-side.
              </p>
              <div v-for="mailbox in historicalMailboxes" :key="mailbox.id" class="job-row">
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
              <div v-if="canDiscover" class="ws-actions">
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
            <p v-if="!canDiscover" class="ws-muted">New mailbox connections and drafts require appointed officer access. You can disconnect a historical connection here.</p>
            <section v-if="canDiscover" class="ws-panel" aria-label="Your outreach voice">
              <h3>Your outreach voice</h3><p class="ws-muted">{{ voiceNotice || 'Defaults are conservative. Three distinct approved edits can suggest your own style; private text stays local.' }}</p>
              <ThemedSelect v-model="voicePreferences.length" label="Preferred length" :options="['short','standard','long']" />
              <ThemedSelect v-model="voicePreferences.formality" label="Preferred formality" :options="['conversational','neutral','formal']" />
              <ThemedSelect v-model="voicePreferences.opening" label="Preferred opening" :options="['direct','greeting','formal']" />
              <ThemedSelect v-model="voicePreferences.requestStyle" label="Request style" :options="['direct','tentative','unknown']" />
              <button class="ws-button" :disabled="busy" @click="saveVoice">Save my voice preferences</button>
            </section>
            <div class="ws-panel account-panel">
              <h3>Access & safety</h3>
              <p class="ws-muted">
                This private dashboard belongs to your approved account. Your role:
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
.command-menu {
  position: fixed;
  inset: 15% auto auto 50%;
  transform: translateX(-50%);
  width: min(440px, calc(100vw - 32px));
  z-index: 100;
  background: #191b24;
  color: #efeee8;
  border: 1px solid #d8b97745;
  padding: 24px;
  border-radius: 24px;
  box-shadow: 0 30px 100px #0009;
}
.command-menu[open] {
  display: grid;
  gap: 8px;
}
.command-menu h2 {
  margin-bottom: 12px;
}
.studio-nav button[data-secondary='true'] {
  font-size: 11px;
  padding-block: 10px;
}
.studio-nav button[data-group-start='true'] {
  margin-top: 20px;
}
.studio-nav button[data-group-start='true']::after {
  content: '';
  position: absolute;
  top: -14px;
  inset-inline: 10px;
  height: 1px;
  background: #ffffff16;
}
.personal-proposal > p {
  margin-block: 12px 20px;
}
.personal-proposal > :deep(.themed-select) {
  margin-block: 16px;
}
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
.studio-mobile-nav {
  display: none;
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
  padding: 18px 20px;
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
  margin-bottom: 14px;
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
.candidate-review {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #d8b977;
  transition: gap 0.3s ease, color 0.3s ease;
}
.candidate:hover .candidate-review,
.candidate:focus-visible .candidate-review {
  gap: 8px;
  color: #f0dba9;
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
  min-height: 180px;
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
  .studio-nav button[data-group-start='true'] {
    margin-top: 0;
    margin-left: 12px;
  }
  .studio-nav button[data-group-start='true']::after {
    top: 8px;
    bottom: 8px;
    left: -9px;
    right: auto;
    width: 1px;
    height: auto;
  }
  .studio-nav button[data-secondary='true'] {
    padding-block: 14px;
  }
  .studio-layout {
    grid-template-columns: 1fr;
  }
  .studio-nav {
    position: relative;
    display: flex;
    overflow: auto;
    padding-bottom: 8px;
    gap: 6px;
    padding-right: 30px;
    scrollbar-width: thin;
    scrollbar-color: #d8b97766 transparent;
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
  .studio-nav {
    display: none;
  }
  .studio-mobile-nav {
    display: grid;
    gap: 8px;
    margin-bottom: 24px;
  }
  .studio-mobile-nav__label {
    padding-inline: 3px;
    color: #928b9e;
    font-size: 10px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }
  .studio-mobile-nav__control {
    position: relative;
    display: flex;
    align-items: center;
    gap: 11px;
    min-height: 49px;
    padding: 0 14px;
    overflow: hidden;
    border: 1px solid rgb(216 185 119 / 23%);
    border-radius: 16px;
    color: #e8dcc1;
    background: linear-gradient(115deg, rgb(216 185 119 / 11%), rgb(185 163 237 / 7%));
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 7%), 0 12px 34px rgb(7 7 12 / 14%);
    transition:
      border-color 0.35s ease,
      box-shadow 0.35s ease,
      transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .studio-mobile-nav__control::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, rgb(255 255 255 / 8%), transparent 36%);
    opacity: 0.65;
  }
  .studio-mobile-nav__control:focus-within {
    border-color: rgb(216 185 119 / 56%);
    box-shadow: 0 0 0 3px rgb(216 185 119 / 11%), inset 0 1px 0 rgb(255 255 255 / 9%), 0 18px 42px rgb(7 7 12 / 19%);
    transform: translateY(-1px);
  }
  .studio-mobile-nav__control > svg {
    position: relative;
    flex: 0 0 auto;
    color: #d8b977;
  }
  .studio-mobile-nav__control select {
    position: relative;
    z-index: 1;
    width: 100%;
    min-width: 0;
    appearance: none;
    border: 0;
    outline: 0;
    padding: 14px 30px 14px 0;
    color: #eee7da;
    background: transparent;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .studio-mobile-nav__control option {
    color: #211e28;
    background: #eee8db;
  }
  .studio-mobile-nav__chevron {
    position: absolute;
    right: 15px;
    top: 50%;
    color: #d8b977;
    font-size: 18px;
    line-height: 1;
    pointer-events: none;
    transform: translateY(-57%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .studio-mobile-nav__control:focus-within .studio-mobile-nav__chevron {
    transform: translateY(-42%);
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

<style scoped>
.research-next-step{margin-top:20px;padding:18px 20px;border:1px solid rgb(216 185 119 / 18%);border-radius:20px;background:linear-gradient(135deg,rgb(216 185 119 / 7%),rgb(185 163 237 / 5%));transition:border-color .35s,box-shadow .35s,transform .35s cubic-bezier(.22,1,.36,1)}.research-next-step[open]{border-color:rgb(216 185 119 / 34%);box-shadow:0 16px 42px rgb(9 8 16 / 18%)}.research-next-step:hover{border-color:rgb(216 185 119 / 32%)}.research-next-step>summary,.research-more-actions>summary{display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;list-style:none;color:#efe7d6;font-size:13px;font-weight:550}.research-next-step>summary::-webkit-details-marker,.research-more-actions>summary::-webkit-details-marker{display:none}.research-next-step>summary:after,.research-more-actions>summary:after{content:'＋';color:#d8b977;font-size:16px;transition:transform .35s cubic-bezier(.22,1,.36,1)}.research-next-step[open]>summary:after,.research-more-actions[open]>summary:after{transform:rotate(45deg)}.research-next-step summary small{margin-left:auto;color:#aaa3b3;font-size:11px;font-weight:400}.research-next-step>.ws-muted{margin:12px 0 16px}.research-next-step :deep(.themed-select){margin-top:12px}.research-next-step>.ws-button{margin-top:15px}.research-dossier-actions{display:grid;gap:12px;margin-top:20px}.research-dossier-actions :deep(.themed-select){margin:0}.research-more-actions{margin-top:3px;padding-top:13px;border-top:1px solid #ffffff10}.research-more-actions>summary{font-size:11px;color:#aca5b5;font-weight:450}.research-more-actions .ws-button{margin-top:13px}.research-status-action{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:10px;margin-top:12px}.research-status-action :deep(.themed-select){margin:0}.research-action-status__orb{will-change:box-shadow}.source-link{margin-top:10px}.research-next-step,.research-dossier-actions,.research-more-actions{animation:research-flow-in .55s cubic-bezier(.22,1,.36,1) both}@keyframes research-flow-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@media(max-width:760px){.research-status-action{grid-template-columns:1fr}.research-next-step{padding:16px}.research-next-step summary small{display:none}}@media(prefers-reduced-motion:reduce){.research-next-step,.research-dossier-actions,.research-more-actions{animation:none}.research-next-step{transition:none}}
.research-action-status{display:flex;align-items:center;gap:9px;margin:12px 0;padding:11px 14px;border:1px solid rgb(216 185 119 / 22%);border-radius:14px;color:#d9d1c2;background:linear-gradient(100deg,rgb(216 185 119 / 9%),rgb(185 163 237 / 6%));font-size:12px}.research-action-status--saved{border-color:rgb(146 218 177 / 26%);color:#c4e3cf}.research-action-status--failed{border-color:rgb(236 130 130 / 32%);color:#efb6b6}.research-action-status__orb{width:8px;height:8px;flex:0 0 8px;border-radius:50%;background:#d8b977;box-shadow:0 0 0 0 rgb(216 185 119 / 40%);animation:research-action-pulse 1.8s ease-out infinite}.research-action-status--saved .research-action-status__orb{background:#92dab1;animation:none}.research-action-status--failed .research-action-status__orb{background:#ec8282;animation:none}@keyframes research-action-pulse{0%{box-shadow:0 0 0 0 rgb(216 185 119 / 40%)}70%{box-shadow:0 0 0 8px rgb(216 185 119 / 0%)}100%{box-shadow:0 0 0 0 rgb(216 185 119 / 0%)}}.research-action-enter-active,.research-action-leave-active{transition:opacity .28s ease,transform .28s ease}.research-action-enter-from,.research-action-leave-to{opacity:0;transform:translateY(-6px)}@media (prefers-reduced-motion:reduce){.research-action-status__orb{animation:none}.research-action-enter-active,.research-action-leave-active{transition:none}}
</style>
