<script setup lang="ts">
import type { OutreachTarget } from '#shared/types/outreach'
import type { OutreachMatchPreview } from '#shared/types/outreach-planning'
const props = defineProps<{
  target: OutreachTarget
  profiles: { profileId: string; displayName: string }[]
  projects: { id: string; title: string }[]
  angles: { value: string; label: string }[]
  match: OutreachMatchPreview | null
  planning: boolean
  creating: boolean
  busy: boolean
  projectsLoading: boolean
  profileError: string
  projectError: string
  planError: string
  moreProfiles: boolean
  profilesLoading: boolean
  draftCreated: boolean
  officers: { id: string; label: string }[]
}>()
const scope = defineModel<string>('scope', { required: true })
const profileId = defineModel<string>('profileId', { required: true })
const projectId = defineModel<string>('projectId', { required: true })
const angle = defineModel<string>('angle', { required: true })
const emit = defineEmits<{
  preview: []
  draft: []
  edit: []
  ready: []
  retryProfiles: []
  retryProjects: []
  moreProfiles: []
}>()
const expanded = ref(false)
const id = useId()
const member = computed(() => props.profiles.find(p => p.profileId === profileId.value))
const project = computed(() => props.projects.find(p => p.id === projectId.value))
const accessLabel = computed(() => props.match?.access.access === 'practical'
  ? 'Fits saved participation preferences'
  : 'Participation needs confirmation')
const canCreate = computed(() => props.target.status === 'ready' && Boolean(props.target.contactEmail) && Boolean(props.match?.plan.evidence.length))
const checks = computed(() => [...new Set([
  ...(props.match?.plan.unknowns || []),
  ...(props.match?.access.unresolved || []),
])])
function officerName(ownerId: string) {
  return props.officers.find(officer => officer.id === ownerId)?.label || 'another officer'
}
</script>

<template>
  <section class="message-plan" :class="{ 'message-plan--open': expanded }" aria-label="Message planning">
    <button class="message-plan-toggle" type="button" :aria-expanded="expanded" :aria-controls="id" @click="expanded = !expanded">
      <span class="message-plan-toggle__text"><strong>Plan the first message</strong><small>Choose who you represent, then review the ask</small></span>
      <span class="message-plan-chevron" aria-hidden="true" />
    </button>
    <div :id="id" class="message-plan-disclosure" :inert="!expanded" :aria-hidden="!expanded">
      <div class="message-plan-clip"><div class="message-plan-body">
        <fieldset class="message-plan-audience">
          <legend>Who are you representing?</legend>
          <div class="message-plan-choices">
            <label class="message-plan-choice" :class="{ 'is-selected': scope === 'society' }">
              <input v-model="scope" type="radio" :name="`${id}-audience`" value="society" />
              <SiteIcon name="atom" :size="19" />
              <span><strong>Matrix Fellows</strong><small>Use the society’s reviewed context to start a research conversation.</small></span>
              <SiteIcon v-if="scope === 'society'" name="check" :size="14" />
            </label>
            <label class="message-plan-choice" :class="{ 'is-selected': scope === 'student' }">
              <input v-model="scope" type="radio" :name="`${id}-audience`" value="student" />
              <SiteIcon name="spark" :size="19" />
              <span><strong>A member</strong><small>Write on a named member’s behalf using their shareable research profile.</small></span>
              <SiteIcon v-if="scope === 'student'" name="check" :size="14" />
            </label>
          </div>
        </fieldset>
        <Transition name="message-plan-context" mode="out-in">
          <div v-if="scope === 'student'" key="member" class="message-plan-member">
            <ThemedSelect v-model="profileId" label="Member you represent" :options="[{value:'',label:'Choose a member'}, ...profiles.map(p => ({value:p.profileId,label:p.displayName}))]" />
            <button v-if="moreProfiles" class="message-plan-text-action" :disabled="profilesLoading" @click="emit('moreProfiles')">{{ profilesLoading ? 'Loading members…' : 'Load more members' }}</button>
            <p class="message-plan-note">You remain the sender. Only details this member agreed to share enter the draft.</p>
            <p v-if="profileError" class="message-plan-error" role="alert">{{ profileError }} <button class="message-plan-text-action" @click="emit('retryProfiles')">Try again</button></p>
            <p v-else-if="!profiles.length" class="message-plan-note">No shareable member profiles are available yet. A member can enable sharing in their profile; society outreach remains available.</p>
            <p v-if="projectsLoading" class="message-plan-note" role="status">Loading this member’s projects…</p>
            <p v-if="projectError" class="message-plan-error" role="alert">{{ projectError }} <button class="message-plan-text-action" @click="emit('retryProjects')">Try again</button></p>
            <ThemedSelect v-if="projects.length" v-model="projectId" label="Project to include (optional)" :options="[{value:'',label:'Use the member’s profile'},...projects.map(p=>({value:p.id,label:p.title}))]" />
          </div>
          <p v-else key="society" class="message-plan-note">Uses the society’s reviewed identity and relevant, supported work. Your connected mailbox sends the message.</p>
        </Transition>
        <ThemedSelect v-if="angles.length" v-model="angle" label="Research angle (optional)" :options="[{value:'',label:'Suggest an angle from the evidence'},...angles]" />
        <p v-if="scope === 'student' && !profileId" class="message-plan-note">Choose a member to build a personal inquiry.</p>
        <div class="message-plan-build">
          <button class="ws-button" :disabled="busy || planning || projectsLoading || (scope === 'student' && !profileId)" @click="emit('preview')">
            <span v-if="planning" class="message-plan-orb" aria-hidden="true" /><SiteIcon v-else name="compass" :size="15" />
            {{ planning ? 'Building the plan…' : match ? 'Rebuild message plan' : 'Build message plan' }}
          </button>
          <span class="message-plan-note">Nothing sends automatically.</span>
        </div>
        <p v-if="planError" class="message-plan-error" role="alert">{{ planError }}</p>
        <div class="message-plan-result-reveal" :class="{ 'is-ready': Boolean(match) }">
          <div class="message-plan-clip">
            <section v-if="match" class="message-plan-result" aria-label="Suggested message plan">
              <div class="message-plan-result-heading"><SiteIcon name="compass" :size="17" /><h3>Suggested approach</h3><span>For review</span></div>
              <p class="message-plan-context-line">{{ scope === 'society' ? 'Matrix Fellows' : member?.displayName }} → {{ target.name }}<span v-if="project"> · {{ project.title }}</span></p>
              <div class="message-plan-ask"><span>First ask</span><p>{{ match.plan.question }}</p></div>
              <div v-if="match.plan.deliverable" class="message-plan-offer"><span>Possible contribution</span><p>{{ match.plan.deliverable }}</p></div>
              <div class="message-plan-support">
                <h4>Why this connection</h4><p>{{ match.plan.connection }}</p><p class="message-plan-note">{{ match.topicOverlap }}</p>
                <a v-for="evidence in match.plan.evidence" :key="evidence.url + evidence.quote" :href="evidence.url" target="_blank" rel="noopener noreferrer" class="message-plan-evidence">
                  <span>“{{ evidence.quote }}”<small>View supporting source</small></span><SiteIcon name="arrow" :size="14" />
                </a>
              </div>
              <div class="message-plan-access"><SiteIcon name="globe" :size="15" /><div><strong>{{ accessLabel }}</strong><p>{{ scope === 'student' ? 'Uses this member’s saved participation preferences.' : 'Uses your saved participation preferences.' }} This does not confirm an opening or supervision.</p></div></div>
              <details v-if="checks.length || match.access.reasons.length" class="message-plan-checks">
                <summary>What still needs checking<SiteIcon name="down" :size="13" /></summary>
                <ul><li v-for="check in checks" :key="check">{{ check }}</li></ul>
                <p v-for="reason in match.access.reasons" :key="reason" class="message-plan-note">{{ reason }}</p>
              </details>
              <div v-if="match.coordination.length" class="message-plan-coordination"><SiteIcon name="warning" :size="16" /><div><strong>Prior outreach exists</strong><p v-for="contact in match.coordination" :key="contact.id">{{ officerName(contact.ownerId) }} · {{ contact.stage }}</p></div></div>
              <p class="message-plan-note">{{ match.historyStatus === 'partial' ? 'Contact history is incomplete. Check with the team before another approach.' : 'History covers known contact aliases; confirm with the team before a new approach.' }}</p>
              <div class="message-plan-next">
                <p v-if="target.status !== 'ready'" class="message-plan-note">Review the candidate’s evidence and mark it ready before drafting.</p>
                <button v-if="target.status !== 'ready'" class="ws-button" :disabled="busy" @click="emit('ready')">Mark candidate ready</button>
                <p v-if="!target.contactEmail" class="message-plan-note">Add a verified public contact email in candidate details.</p>
                <p v-if="!match.plan.evidence.length" class="message-plan-note">Add a verified research quotation before drafting a specific first message.</p>
                <button v-if="!target.contactEmail || !match.plan.evidence.length" class="message-plan-text-action" @click="emit('edit')">Edit candidate details</button>
                <button class="ws-button ws-button--primary" :disabled="busy || planning || creating || !canCreate" @click="emit('draft')"><span v-if="creating" class="message-plan-orb" aria-hidden="true" /><SiteIcon v-else name="mail" :size="15" />{{ creating ? 'Creating the draft…' : draftCreated ? 'Open draft' : 'Create editable draft' }}</button>
                <p class="message-plan-note">Review and edit the email next. Approval and sending are separate steps.</p>
              </div>
            </section>
          </div>
        </div>
      </div></div>
    </div>
  </section>
</template>

<style scoped>
.message-plan { margin-top: 20px; min-width: 0; border: 1px solid rgb(216 185 119 / 18%); border-radius: 20px; background: transparent; transition: border-color .35s, box-shadow .45s; }
.message-plan:hover, .message-plan:focus-within { border-color: rgb(216 185 119 / 32%); box-shadow: 0 0 24px rgb(216 185 119 / 4%); }
.message-plan-toggle { display: flex; align-items: center; justify-content: space-between; gap: 18px; width: 100%; padding: 18px 20px; border: 0; border-radius: 20px; background: transparent; color: #efe7d6; cursor: pointer; text-align: left; -webkit-tap-highlight-color: transparent; }
.message-plan-toggle:focus-visible { outline: 1px solid #d8b977; outline-offset: -4px; }
.message-plan-toggle__text { display: grid; gap: 6px; }
.message-plan-toggle strong { font-size: 13px; font-weight: 500; }
.message-plan-toggle small { font-size: 11px; color: #aaa3b3; line-height: 1.5; }
.message-plan-chevron { flex: 0 0 7px; width: 7px; height: 7px; margin-right: 3px; border-right: 1px solid #d8b977; border-bottom: 1px solid #d8b977; transform: rotate(45deg); transition: transform .45s cubic-bezier(.22,1,.36,1); }
.message-plan--open .message-plan-chevron { transform: rotate(225deg); }
.message-plan-disclosure, .message-plan-result-reveal { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows .48s cubic-bezier(.22,1,.36,1), opacity .3s; }
.message-plan--open .message-plan-disclosure, .message-plan-result-reveal.is-ready { grid-template-rows: 1fr; opacity: 1; }
.message-plan-clip { min-height: 0; overflow: hidden; }
.message-plan-body { display: grid; gap: 18px; padding: 3px 20px 20px; transform: translateY(-6px); transition: transform .48s cubic-bezier(.22,1,.36,1); }
.message-plan--open .message-plan-body { transform: translateY(0); }
.message-plan-audience { min-width: 0; margin: 0; padding: 0; border: 0; }
.message-plan-audience legend { padding: 0; margin-bottom: 12px; font-size: 13px; color: #ddd5e5; }
.message-plan-choices { display: grid; gap: 10px; }
.message-plan-choice { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 15px; border: 1px solid #d5c9ed1c; border-radius: 14px; color: #a99fb8; cursor: pointer; transition: border-color .3s, color .3s, background-color .3s, transform .3s; }
.message-plan-choice:hover { border-color: #d8b97755; transform: translateY(-1px); }
.message-plan-choice:active { transform: scale(.99); }
.message-plan-choice.is-selected { border-color: #d8b97755; background: rgb(216 185 119 / 4%); color: #d8b977; }
.message-plan-choice:focus-within { outline: 1px solid #d8b977; outline-offset: 3px; }
.message-plan-choice input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); }
.message-plan-choice > svg { flex-shrink: 0; margin-top: 1px; }
.message-plan-choice > span { display: grid; gap: 6px; flex: 1; min-width: 0; }
.message-plan-choice strong { color: #e5dfeb; font-size: 13px; font-weight: 500; }
.message-plan-choice small, .message-plan-note { color: #a69eaf; font-size: 12px; line-height: 1.7; }
.message-plan-note { margin: 0; }
.message-plan-member { display: grid; gap: 12px; }
.message-plan-build { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.message-plan-error { margin: 0; color: #efc7c5; font-size: 12px; line-height: 1.7; }
.message-plan-text-action { border: 0; background: transparent; padding: 0; color: #d8b977; font-size: 12px; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.message-plan-result { display: grid; gap: 18px; padding-top: 20px; border-top: 1px solid #d5c9ed1c; }
.message-plan-result-heading { display: flex; align-items: center; gap: 10px; color: #d8b977; }
.message-plan-result-heading h3 { margin: 0; font-size: 15px; color: #e5dfeb; }
.message-plan-result-heading > span { margin-left: auto; font-size: 10px; color: #a69eaf; }
.message-plan-context-line { margin: 0; color: #a69eaf; font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.message-plan-ask, .message-plan-offer { padding-left: 15px; border-left: 1px solid #d8b97777; }
.message-plan-ask > span, .message-plan-offer > span { color: #d8b977; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
.message-plan-ask p, .message-plan-offer p { margin: 8px 0 0; color: #e0d8e5; font-size: 14px; line-height: 1.75; }
.message-plan-support h4 { margin: 0 0 8px; color: #d9d0e1; font-size: 12px; font-weight: 500; }
.message-plan-support > p { margin: 0 0 8px; font-size: 12px; line-height: 1.7; }
.message-plan-evidence { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-top: 10px; padding: 13px 0; border-bottom: 1px solid #d5c9ed15; color: #c6bed7; text-decoration: none; transition: color .25s, transform .35s; }
.message-plan-evidence:hover { color: #efdfb5; transform: translateX(2px); }
.message-plan-evidence > span { min-width: 0; font-size: 12px; line-height: 1.7; }
.message-plan-evidence small { display: block; margin-top: 5px; font-size: 10px; color: #a69eaf; }
.message-plan-access, .message-plan-coordination { display: flex; align-items: flex-start; gap: 12px; color: #b7a3d5; }
.message-plan-access > svg, .message-plan-coordination > svg { flex-shrink: 0; margin-top: 2px; }
.message-plan-access strong, .message-plan-coordination strong { font-size: 12px; font-weight: 500; }
.message-plan-access p, .message-plan-coordination p { margin: 6px 0 0; color: #a69eaf; font-size: 11px; line-height: 1.7; }
.message-plan-coordination { color: #d8b977; }
.message-plan-checks summary { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; color: #c6bed7; font-size: 12px; list-style: none; cursor: pointer; }
.message-plan-checks summary::-webkit-details-marker { display: none; }
.message-plan-checks ul { padding-left: 18px; color: #a69eaf; font-size: 12px; line-height: 1.8; }
.message-plan-next { display: grid; gap: 12px; padding-top: 18px; border-top: 1px solid #d5c9ed15; }
.message-plan-next .ws-button { justify-self: start; }
.message-plan-orb { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: #d8b977; animation: message-plan-pulse 1.4s ease-in-out infinite; }
.message-plan-context-enter-active, .message-plan-context-leave-active { transition: opacity .2s, transform .25s; }
.message-plan-context-enter-from { opacity: 0; transform: translateY(5px); }
.message-plan-context-leave-to { opacity: 0; transform: translateY(-5px); }
@keyframes message-plan-pulse { 50% { opacity: .4; box-shadow: 0 0 12px #d8b97755; } }
@media (max-width: 620px) { .message-plan-toggle { padding: 16px; } .message-plan-body { padding: 0 16px 16px; } .message-plan-choice { padding: 12px; } }
@media (prefers-reduced-motion: reduce) { .message-plan, .message-plan-chevron, .message-plan-disclosure, .message-plan-body, .message-plan-result-reveal, .message-plan-choice, .message-plan-evidence, .message-plan-context-enter-active, .message-plan-context-leave-active { transition: none; transform: none; } .message-plan-orb { animation: none; } }
</style>
