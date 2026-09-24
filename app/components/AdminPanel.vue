<script setup lang="ts">
import MatrixMark from '~/components/MatrixMark.vue'
import type { SiteContent, Opportunity, ImportSource } from '#shared/types/content'
import { contentSchema, opportunitySchema, sourceSchema } from '#shared/utils/validation'

const props = defineProps<{ initialContent: SiteContent; opportunities: Opportunity[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const config = useRuntimeConfig()
const configured = Boolean(config.public.supabaseUrl && config.public.supabaseAnonKey)
const panel = ref<HTMLElement>()
const visible = ref(false)
function close() {
  visible.value = false
}
const message = ref(''),
  error = ref('')
const checking = ref(false),
  authenticated = ref(false),
  busy = ref(false)
const locking = ref(false)
const tab = ref('Meeting')
const errorMessage = (cause: unknown) =>
  (cause as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage ||
  (cause as { statusMessage?: string })?.statusMessage ||
  'Something went wrong. Please try again.'
function changeTab(name: string) {
  tab.value = name
  error.value = ''
  message.value = ''
}
const draft = ref<SiteContent>(JSON.parse(JSON.stringify(props.initialContent)))
const listings = ref<Opportunity[]>([...props.opportunities])
const sources = ref<Array<ImportSource & { last_run?: string; last_error?: string }>>([])
const candidates = ref<Opportunity[]>([])
const discoveryCount = ref(0)
const queueHealth = ref<
  Array<{
    kind: string
    queued: number
    running: number
    failed: number
    oldest_queued_at: string | null
  }>
>([])
const monitors = ref<
  Array<{
    id: string
    url: string
    seed: Opportunity
    enabled: boolean
    last_attempt_at: string | null
    last_success_at: string | null
    last_error: string | null
    next_check_at: string
  }>
>([])
async function toggleMonitor(id: string, enabled: boolean) {
  busy.value = true
  try {
    await $fetch('/api/admin', { method: 'POST', body: { action: 'monitor', id, enabled } })
    await authorize()
  } catch (cause) {
    error.value = errorMessage(cause)
  }
  busy.value = false
}
async function reviewCandidate(item: Opportunity, approve: boolean) {
  if (!item.provenance) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin', {
      method: 'POST',
      body: {
        action: 'candidate',
        id: item.id,
        expectedHash: item.provenance.contentHash,
        approve,
      },
    })
    await authorize()
    if (approve) emit('saved')
    message.value = approve
      ? 'Verified listing published. Existing owner corrections are preserved.'
      : 'Proposal dismissed until the source facts change.'
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : String((err as { message?: string }).message || 'Review failed')
  } finally {
    busy.value = false
  }
}
const editing = ref<Opportunity | null>(null)
const source = ref<ImportSource>({ id: '', name: '', kind: 'json', url: '', enabled: false })
const topics = computed({
  get: () => draft.value.meeting.topics.join('\n'),
  set: (value) => {
    draft.value.meeting.topics = value.split('\n').filter(Boolean)
  },
})
let previousFocus: HTMLElement | null
let alreadyLocked = false
let disposed = false
let originalListing: Opportunity | undefined

async function authorize() {
  if (disposed) return
  checking.value = true
  error.value = ''
  try {
    const state = await $fetch<{
      site?: { data?: SiteContent; draft?: SiteContent }
      opportunities: Array<{
        id: string
        data: Opportunity
        overrides?: Partial<Opportunity>
        published: boolean
        suppressed: boolean
      }>
      sources: Array<ImportSource & { last_run?: string; last_error?: string }>
      candidates: Array<{ data: unknown }>
      monitors: typeof monitors.value
      discoveryCount: number
      queueHealth: typeof queueHealth.value
    }>('/api/admin')
    if (disposed) return
    authenticated.value = true
    if (state.site?.draft || state.site?.data) draft.value = state.site.draft || state.site.data!
    listings.value = state.opportunities.map((row) => ({
      ...row.data,
      ...row.overrides,
      id: row.id,
      published: row.published && !row.suppressed,
    }))
    sources.value = state.sources
    monitors.value = state.monitors
    discoveryCount.value = state.discoveryCount
    queueHealth.value = state.queueHealth
    candidates.value = state.candidates.flatMap((row) => {
      const parsed = opportunitySchema.safeParse(row.data)
      return parsed.success ? [parsed.data] : []
    })
  } catch (cause) {
    authenticated.value = false
    error.value = errorMessage(cause)
  } finally {
    checking.value = false
  }
}

const handleAuthorized = () => {
  if (!authenticated.value) void authorize()
}
const lockEditor = async () => {
  if (locking.value) return
  locking.value = true
  const reduced = import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches
  await Promise.all([
    $fetch('/api/meeting-admin/logout', { method: 'POST' }).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, reduced ? 40 : 560)),
  ])
  authenticated.value = false
  error.value = ''
  message.value = ''
  await nextTick()
  locking.value = false
}

async function save(publish: boolean) {
  error.value = ''
  message.value = ''
  const parsed = contentSchema.safeParse(draft.value)
  if (!parsed.success) {
    error.value = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    return
  }
  busy.value = true
  try {
    await $fetch('/api/admin', {
      method: 'POST',
      body: { action: 'content', draft: parsed.data, publish },
    })
    message.value = publish
      ? 'Published. Public updates may take up to 30 seconds.'
      : 'Draft saved. The public page is unchanged.'
    if (publish) emit('saved')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

function editListing(item?: Opportunity) {
  originalListing = item ? JSON.parse(JSON.stringify(item)) : undefined
  editing.value = item
    ? JSON.parse(JSON.stringify(item))
    : {
        id: crypto.randomUUID(),
        sourceId: 'curated',
        externalId: crypto.randomUUID(),
        title: '',
        kind: 'Competition',
        discipline: '',
        description: '',
        eventDate: null,
        deadline: null,
        timezone: null,
        location: '',
        eligibility: '',
        url: '',
        verifiedAt: new Date().toISOString(),
        priority: 50,
        published: false,
      }
}

async function saveListing() {
  if (!editing.value) return
  error.value = ''
  message.value = ''
  const parsed = opportunitySchema.safeParse(editing.value)
  if (!parsed.success) {
    error.value = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    return
  }
  busy.value = true
  const item = parsed.data
  try {
    await $fetch('/api/admin', {
      method: 'POST',
      body: { action: 'listing', item, existing: Boolean(originalListing) },
    })
    editing.value = null
    message.value = 'Listing saved.'
    await authorize()
    emit('saved')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

async function saveSource() {
  const parsed = sourceSchema.safeParse(source.value)
  if (!parsed.success) {
    error.value = parsed.error.issues.map((i) => i.message).join('\n')
    return
  }
  busy.value = true
  try {
    await $fetch('/api/admin', {
      method: 'POST',
      body: { action: 'source', source: parsed.data },
    })
    message.value = 'Source saved. Enabled sources run on the daily schedule.'
    source.value = { id: '', name: '', kind: 'json', url: '', enabled: false }
    await authorize()
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

function handleKeys(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
  if (event.key !== 'Tab') return
  const elements = panel.value?.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex="0"]',
  )
  if (!elements?.length) return
  const first = elements[0]!,
    last = elements[elements.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(async () => {
  previousFocus = document.activeElement as HTMLElement
  alreadyLocked = document.body.classList.contains('overflow-hidden')
  document.body.classList.add('overflow-hidden')
  visible.value = true
  await nextTick()
  panel.value?.focus()
})
onBeforeUnmount(() => {
  disposed = true
  if (!alreadyLocked) document.body.classList.remove('overflow-hidden')
  previousFocus?.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport to="body">
    <Transition
      appear
      enter-active-class="transition-opacity duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)] [&>section]:transition-transform [&>section]:duration-[1100ms] [&>section]:ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none motion-reduce:[&>section]:transition-none"
      enter-from-class="opacity-0 [&>section]:translate-x-12 motion-reduce:[&>section]:translate-x-0"
      enter-to-class="opacity-100 [&>section]:translate-x-0"
      leave-active-class="transition-opacity duration-500 ease-in-out [&>section]:transition-transform [&>section]:duration-500 [&>section]:ease-in-out motion-reduce:transition-none motion-reduce:[&>section]:transition-none"
      leave-from-class="opacity-100 [&>section]:translate-x-0"
      leave-to-class="opacity-0 [&>section]:translate-x-8 motion-reduce:[&>section]:translate-x-0"
      @after-leave="emit('close')"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex justify-end bg-black/60 font-sans text-paper backdrop-blur-sm"
        @mousedown.self="close"
      >
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-title"
          tabindex="-1"
          class="admin-panel flex h-dvh w-full max-w-xl flex-col border-l border-paper/10 bg-ink bg-[radial-gradient(ellipse_at_top_right,#a9a0ed12,transparent_55%)] shadow-2xl outline-none [--color-acid:#c5c0eb] [&_button]:transition-[color,background-color,border-color,box-shadow] [&_button]:duration-700 [&_button]:ease-[cubic-bezier(.45,0,.25,1)] [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-acid motion-reduce:[&_button]:transition-none"
          :class="{ 'admin-panel--locking': locking }"
          @keydown="handleKeys"
        >
          <header
            class="flex shrink-0 items-center justify-between border-b border-paper/10 px-6 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8"
          >
            <div>
              <p class="text-[9px] uppercase tracking-[.2em] text-acid">Matrix Fellows</p>
              <h2 id="admin-title" class="mt-1 font-display text-xl">The editing room.</h2>
            </div>
            <button
              aria-label="Close editor"
              class="rounded-full border border-paper/15 p-3 hover:bg-paper/10"
              @click="close"
            >
              <SiteIcon name="close" :size="18" />
            </button>
          </header>
          <div
            data-lenis-prevent
            class="admin-editor-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 [scrollbar-width:thin] [scrollbar-color:#c5c0eb40_transparent] sm:p-8"
          >
            <div v-if="!configured" class="rounded-xl border border-paper/15 p-6">
              <MatrixMark :size="32" class="text-acid" />
              <h3 class="mt-5 text-lg">A home for your updates.</h3>
              <p class="mt-3 text-sm leading-relaxed text-paper/60">
                The editor is ready to connect. Configure Supabase, apply the included database
                migration, and configure the organizer PIN to enable secure editing.
              </p>
              <p class="mt-4 text-xs leading-relaxed text-paper/40">
                Setup instructions are included in the project README. Your content stays visible
                while setup is pending.
              </p>
            </div>
            <p v-else-if="checking" role="status" class="text-sm text-paper/60">
              Checking your access…
            </p>
            <MeetingAdmin
              v-else-if="!authenticated"
              @saved="emit('saved')"
              @authorized="handleAuthorized"
            />
            <template v-else>
              <div class="relative z-20 mb-8">
                <p class="mb-2.5 text-[10px] uppercase tracking-[.16em] text-paper/40">
                  Editor section
                </p>
                <ThemedSelect
                  :model-value="tab"
                  :options="[
                    'Meeting',
                    'Research',
                    'Support',
                    'Links',
                    'Listings',
                    'Sources',
                    'Responses',
                  ]"
                  label="Editor section"
                  full-width
                  @update:model-value="changeTab"
                />
              </div>
              <Transition
                mode="out-in"
                enter-active-class="transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
                enter-from-class="translate-y-3 opacity-0 motion-reduce:translate-y-0"
                enter-to-class="translate-y-0 opacity-100"
                leave-active-class="transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none"
                leave-from-class="translate-y-0 opacity-100"
                leave-to-class="-translate-y-1 opacity-0 motion-reduce:translate-y-0"
              >
                <div :key="tab" class="min-h-64">
                  <AdminResponses v-if="tab === 'Responses'" />
                  <MeetingAdmin
                    v-if="tab === 'Meeting'"
                    @saved="emit('saved')"
                    @authorized="handleAuthorized"
                  />
                  <div v-if="tab === 'Research'" class="space-y-8">
                    <fieldset
                      v-for="(project, index) in draft.projects"
                      :key="project.id"
                      class="space-y-4 border-t border-paper/15 pt-5"
                    >
                      <legend class="px-2 text-xs text-acid">Project 0{{ index + 1 }}</legend>
                      <AdminField v-model="project.title" label="Title" /><AdminField
                        v-model="project.field"
                        label="Research field"
                      /><AdminField v-model="project.status" label="Status" /><AdminField
                        v-model="project.summary"
                        label="Preview"
                        multiline
                      /><AdminField
                        v-model="project.details"
                        label="Research question, methods, contributors, and findings"
                        multiline
                      /><AdminField
                        v-model="project.url"
                        label="Project link · optional"
                        placeholder="https://"
                      />
                    </fieldset>
                  </div>
                  <div v-if="tab === 'Support'" class="space-y-8">
                    <fieldset
                      v-for="(benefit, index) in draft.benefits"
                      :key="index"
                      class="space-y-4 border-t border-paper/15 pt-5"
                    >
                      <legend class="px-2 text-xs text-acid">Opportunity 0{{ index + 1 }}</legend>
                      <AdminField v-model="benefit.title" label="Title" /><AdminField
                        v-model="benefit.description"
                        label="Description"
                        multiline
                      /><AdminField
                        v-model="benefit.url"
                        label="Signup link · optional"
                        placeholder="https://"
                      />
                    </fieldset>
                  </div>
                  <div v-if="tab === 'Links'" class="space-y-4">
                    <AdminField
                      v-model="draft.links.join"
                      label="External community link · reserved"
                      placeholder="https://"
                    /><AdminField
                      v-model="draft.links.contact"
                      label="Contact link"
                      placeholder="https:// or mailto:"
                    />
                    <p class="text-xs leading-relaxed text-paper/45">
                      The website now uses its built-in membership form and
                      contact@matrixfellows.com. These legacy links are retained for future external
                      community integrations.
                    </p>
                  </div>
                  <div v-if="tab === 'Listings'">
                    <template v-if="!editing"
                      ><button
                        class="mb-5 rounded-full border border-acid/50 px-4 py-2 text-xs text-acid"
                        @click="editListing()"
                      >
                        + Add opportunity
                      </button>
                      <div class="divide-y divide-paper/15">
                        <button
                          v-for="item in listings"
                          :key="item.id"
                          class="flex w-full items-center justify-between gap-4 py-4 text-left text-sm"
                          @click="editListing(item)"
                        >
                          <span
                            >{{ item.title
                            }}<span class="mt-1 block text-[10px] text-paper/40"
                              >{{ item.sourceId }} ·
                              {{ item.published ? 'Published' : 'Hidden' }}</span
                            ></span
                          ><SiteIcon :size="14" />
                        </button>
                      </div>
                      <p v-if="!listings.length" class="text-sm text-paper/50">
                        No listings yet. Add a curated opportunity or enable a verified source.
                      </p></template
                    >
                    <form v-else class="space-y-4" @submit.prevent="saveListing">
                      <button type="button" class="text-xs text-acid" @click="editing = null">
                        ← All listings</button
                      ><AdminField v-model="editing.title" label="Title" />
                      <div>
                        <p class="mb-2.5 text-xs text-paper/55">Type</p>
                        <ThemedSelect
                          v-model="editing.kind"
                          :options="[
                            'Competition',
                            'Conference',
                            'Workshop',
                            'Publication',
                            'Program',
                          ]"
                          label="Opportunity type"
                          full-width
                        />
                      </div>
                      ><AdminField v-model="editing.discipline" label="Discipline" /><AdminField
                        v-model="editing.description"
                        label="Description"
                        multiline
                      /><AdminField v-model="editing.url" label="Official URL" /><AdminField
                        v-model="editing.location"
                        label="Location"
                      /><AdminField v-model="editing.eligibility" label="Eligibility" /><AdminField
                        :model-value="editing.deadline || ''"
                        label="Submission deadline · YYYY-MM-DD or ISO timestamp"
                        @update:model-value="editing.deadline = $event || null"
                      /><AdminField
                        :model-value="editing.eventDate || ''"
                        label="Event date · separate from deadline"
                        @update:model-value="editing.eventDate = $event || null"
                      /><AdminField
                        :model-value="editing.timezone || ''"
                        label="Timezone · optional IANA name"
                        @update:model-value="editing.timezone = $event || null"
                      /><AdminField
                        :model-value="String(editing.priority)"
                        label="Priority · 0–100"
                        type="number"
                        @update:model-value="editing.priority = Number($event)"
                      /><label class="flex items-center gap-3 text-sm"
                        ><input
                          v-model="editing.published"
                          type="checkbox"
                          class="accent-acid"
                        />Published</label
                      >
                      <p class="text-xs text-paper/40">
                        Edits to imported fields are preserved on future imports. Hiding a listing
                        suppresses it until you publish it again.
                      </p>
                      <button
                        :disabled="busy"
                        class="rounded-full bg-acid px-5 py-3 text-sm text-ink disabled:opacity-40"
                      >
                        Save listing
                      </button>
                    </form>
                  </div>
                  <div v-if="tab === 'Sources'" class="space-y-6">
                    <p class="text-xs leading-relaxed text-paper/55">
                      Annual monitors validate exact source evidence and automatically publish new
                      facts after two matching observations at least six hours apart. Failed checks
                      preserve confirmed information. Owner edits and hidden listings are never
                      reset.
                    </p>
                    <section
                      class="grid gap-3 sm:grid-cols-2"
                      aria-label="Opportunity queue health"
                    >
                      <div class="rounded-xl border border-paper/15 p-4 text-xs">
                        <p class="text-paper/45">OpenReview discoveries awaiting review</p>
                        <p class="mt-2 text-2xl text-paper">{{ discoveryCount }}</p>
                      </div>
                      <div
                        v-for="queue in queueHealth"
                        :key="queue.kind"
                        class="rounded-xl border border-paper/15 p-4 text-xs"
                      >
                        <p class="capitalize text-paper/70">{{ queue.kind }} queue</p>
                        <p class="mt-2 text-paper/50">
                          Queued {{ queue.queued }} · running {{ queue.running }} · failed
                          {{ queue.failed }}
                        </p>
                        <p class="mt-1 text-paper/40">
                          Oldest: {{ queue.oldest_queued_at || 'No waiting jobs' }}
                        </p>
                      </div>
                    </section>
                    <section
                      v-if="monitors.length"
                      class="space-y-3"
                      aria-label="Annual opportunity monitors"
                    >
                      <h3 class="text-lg">Annual monitors · {{ monitors.length }}</h3>
                      <details
                        v-for="monitor in monitors"
                        :key="monitor.id"
                        class="rounded-xl border border-paper/15 p-4 text-xs"
                      >
                        <summary class="cursor-pointer leading-relaxed">
                          {{ monitor.seed.title }}
                          <span class="text-paper/45"
                            >·
                            {{
                              !monitor.enabled
                                ? 'Paused'
                                : monitor.last_error
                                  ? 'Needs attention'
                                  : 'Monitoring'
                            }}</span
                          >
                        </summary>
                        <div class="mt-4 space-y-3 text-paper/55">
                          <p>Last attempt: {{ monitor.last_attempt_at || 'Scheduled' }}</p>
                          <p>
                            Last confirmed: {{ monitor.last_success_at || 'Awaiting confirmation' }}
                          </p>
                          <p>Next check: {{ monitor.next_check_at }}</p>
                          <p v-if="monitor.last_error" class="text-amber-200">
                            {{ monitor.last_error }}
                          </p>
                          <a
                            :href="monitor.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="block text-acid underline"
                            >Official source ↗</a
                          >
                          <button
                            :disabled="busy"
                            class="rounded-full border border-paper/20 px-4 py-2 text-paper disabled:opacity-40"
                            @click="toggleMonitor(monitor.id, !monitor.enabled)"
                          >
                            {{ monitor.enabled ? 'Pause monitor' : 'Resume monitor' }}
                          </button>
                        </div>
                      </details>
                    </section>
                    <p class="text-xs text-paper/45">
                      Legacy adapters below retain their original approval/curated-feed policies.
                      Edition-specific sources have been paused where annual monitors replace them.
                    </p>
                    <section
                      v-if="candidates.length"
                      class="space-y-4"
                      aria-label="Dates awaiting review"
                    >
                      <h3 class="text-lg">Awaiting review · {{ candidates.length }}</h3>
                      <article
                        v-for="item in candidates"
                        :key="item.id"
                        class="space-y-4 rounded-xl border border-acid/20 bg-paper/3 p-5"
                      >
                        <h4 class="font-medium">{{ item.title }}</h4>
                        <p class="text-xs leading-relaxed text-paper/65">{{ item.description }}</p>
                        <p class="text-xs text-paper/50">
                          Currently published deadline:
                          {{ listings.find((row) => row.id === item.id)?.deadline || 'None' }}
                        </p>
                        <ul class="space-y-3">
                          <li
                            v-for="milestone in item.milestones"
                            :key="milestone.label"
                            class="text-xs leading-relaxed"
                          >
                            <p>
                              {{ milestone.label }} · {{ milestone.date }}
                              <span class="text-paper/50">{{
                                milestone.timezone || 'Date only; confirm local cutoff'
                              }}</span>
                            </p>
                            <blockquote class="mt-1 text-paper/50">
                              “{{ milestone.evidence }}”
                            </blockquote>
                          </li>
                        </ul>
                        <a
                          :href="item.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-block text-xs text-acid underline underline-offset-4"
                          >Verify official source ↗</a
                        >
                        <p class="text-[10px] text-paper/40">
                          Fetched {{ item.verifiedAt }} · {{ item.provenance?.parserVersion }}
                        </p>
                        <div class="flex flex-wrap gap-3">
                          <button
                            :disabled="busy"
                            class="rounded-full bg-acid px-4 py-2 text-xs text-ink disabled:opacity-40"
                            @click="reviewCandidate(item, true)"
                          >
                            Approve &amp; publish
                          </button>
                          <button
                            :disabled="busy"
                            class="rounded-full border border-paper/20 px-4 py-2 text-xs disabled:opacity-40"
                            @click="reviewCandidate(item, false)"
                          >
                            Dismiss
                          </button>
                        </div>
                      </article>
                    </section>
                    <button
                      v-for="feed in sources"
                      :key="feed.id"
                      class="block w-full rounded-lg border border-paper/15 p-4 text-left"
                      @click="
                        source = {
                          id: feed.id,
                          name: feed.name,
                          kind: feed.kind,
                          url: feed.url,
                          enabled: feed.enabled,
                        }
                      "
                    >
                      <span class="text-sm"
                        >{{ feed.name }} · {{ feed.enabled ? 'Enabled' : 'Disabled' }}</span
                      ><span class="mt-2 block text-[10px] text-paper/40">{{
                        feed.last_run ? `Last run: ${feed.last_run}` : 'Not imported yet'
                      }}</span
                      ><span v-if="feed.last_error" class="mt-2 block text-xs text-amber-200">{{
                        feed.last_error
                      }}</span>
                    </button>
                    <form
                      class="space-y-4 border-t border-paper/15 pt-6"
                      @submit.prevent="saveSource"
                    >
                      <AdminField
                        v-model="source.id"
                        label="Stable ID · lowercase letters, digits, hyphens"
                      /><AdminField v-model="source.name" label="Name" /><AdminField
                        v-model="source.url"
                        label="Verified endpoint URL"
                      />
                      <div>
                        <p class="mb-2.5 text-xs text-paper/55">Adapter</p>
                        <ThemedSelect
                          v-model="source.kind"
                          :options="[
                            {
                              value: 'json',
                              label: 'JSON',
                              description: 'Structured endpoint using the catalog schema',
                            },
                            {
                              value: 'rss',
                              label: 'RSS / Atom',
                              description: 'Reviewed announcement feed',
                            },
                            {
                              value: 'official',
                              label: 'Official website',
                              description: 'Registered evidence-checked source profile',
                            },
                          ]"
                          label="Source adapter"
                          full-width
                        />
                      </div>
                      ><label class="flex items-center gap-3 text-sm"
                        ><input
                          v-model="source.enabled"
                          type="checkbox"
                          class="accent-acid"
                        />Enable daily fetching</label
                      ><button
                        :disabled="busy"
                        class="rounded-full bg-acid px-5 py-3 text-sm text-ink disabled:opacity-40"
                      >
                        Save source
                      </button>
                    </form>
                  </div>
                </div>
              </Transition>
            </template>
            <p
              v-if="error"
              role="alert"
              class="mt-6 whitespace-pre-line rounded-lg border border-red-300/20 bg-red-300/5 p-4 text-xs leading-relaxed text-red-200"
            >
              {{ error }}
            </p>
            <p
              v-if="message"
              role="status"
              class="mt-6 rounded-lg border border-acid/20 p-4 text-xs leading-relaxed text-acid"
            >
              {{ message }}
            </p>
          </div>
          <footer
            v-if="authenticated"
            class="admin-editor-footer flex shrink-0 flex-wrap items-center gap-3 border-t border-paper/10 bg-paper/[.02] px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8"
          >
            <template v-if="!['Meeting', 'Listings', 'Sources', 'Responses'].includes(tab)"
              ><button
                :disabled="busy"
                class="rounded-full border border-paper/20 px-4 py-3 text-xs disabled:opacity-40"
                @click="save(false)"
              >
                Save draft</button
              ><button
                :disabled="busy"
                class="rounded-full bg-acid px-5 py-3 text-xs text-ink disabled:opacity-40"
                @click="save(true)"
              >
                {{ busy ? 'Saving…' : 'Publish content' }}
              </button></template
            ><button
              type="button"
              class="admin-lock-button ml-auto"
              :disabled="locking"
              aria-label="Lock editor"
              title="Lock editor"
              @click="lockEditor"
            >
              <SiteIcon name="lock" :size="17" />
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.admin-editor-body,
.admin-editor-footer {
  transform-origin: 50% 100%;
}

.admin-lock-button {
  position: relative;
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 2.75rem;
  place-items: center;
  border: 1px solid rgb(244 241 233 / 11%);
  border-radius: 999px;
  color: rgb(244 241 233 / 50%);
  background: rgb(244 241 233 / 2.5%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 4%);
  transition:
    color 260ms ease,
    border-color 260ms ease,
    background-color 260ms ease,
    box-shadow 420ms ease,
    transform 520ms cubic-bezier(0.16, 1.28, 0.3, 1) !important;
}

.admin-lock-button::after {
  content: '';
  position: absolute;
  inset: 0.34rem;
  border-radius: inherit;
  opacity: 0;
  background: radial-gradient(circle, rgb(197 192 235 / 17%), transparent 70%);
  transform: scale(0.45);
  transition:
    opacity 320ms ease,
    transform 560ms cubic-bezier(0.16, 1.2, 0.3, 1);
}

.admin-lock-button:hover,
.admin-lock-button:focus-visible {
  color: rgb(228 187 114 / 95%);
  border-color: rgb(228 187 114 / 30%);
  background: rgb(228 187 114 / 6%);
  box-shadow:
    0 8px 28px rgb(100 73 28 / 16%),
    inset 0 1px 0 rgb(255 255 255 / 7%);
  transform: translateY(-2px) rotate(-2deg);
}

.admin-lock-button:hover::after,
.admin-lock-button:focus-visible::after {
  opacity: 1;
  transform: scale(1);
}

.admin-lock-button :deep(svg) {
  position: relative;
  z-index: 1;
  overflow: visible;
}

.admin-lock-button :deep(path) {
  transform-box: fill-box;
  transform-origin: center bottom;
  transition: transform 480ms cubic-bezier(0.16, 1.25, 0.3, 1);
}

.admin-lock-button:hover :deep(path),
.admin-lock-button:focus-visible :deep(path) {
  transform: translateY(-1.35px);
}

.admin-panel--locking .admin-lock-button {
  color: #e4bb72;
  border-color: rgb(228 187 114 / 38%);
  animation: admin-lock-confirm 560ms cubic-bezier(0.16, 1.16, 0.3, 1) both;
}

.admin-panel--locking .admin-lock-button :deep(path) {
  animation: admin-lock-shackle 500ms cubic-bezier(0.16, 1.2, 0.3, 1) both;
}

.admin-panel--locking .admin-editor-body,
.admin-panel--locking .admin-editor-footer {
  pointer-events: none;
  animation: admin-editor-lock-away 560ms cubic-bezier(0.5, 0, 0.4, 1) both;
}

@keyframes admin-lock-confirm {
  0% {
    transform: translateY(-2px) rotate(-2deg) scale(1);
  }
  38% {
    transform: translateY(-1px) rotate(2deg) scale(1.12);
    box-shadow: 0 0 30px rgb(228 187 114 / 23%);
  }
  68% {
    transform: translateY(0) rotate(0) scale(0.94);
  }
  100% {
    transform: translateY(0) rotate(0) scale(1);
  }
}

@keyframes admin-lock-shackle {
  0% {
    transform: translateY(-1.35px);
  }
  46% {
    transform: translateY(1px) scaleY(0.92);
  }
  72% {
    transform: translateY(-0.35px) scaleY(1.02);
  }
  100% {
    transform: translateY(0) scaleY(1);
  }
}

@keyframes admin-editor-lock-away {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  28% {
    opacity: 1;
    transform: translateY(-2px) scale(1.002);
  }
  100% {
    opacity: 0;
    transform: translateY(16px) scale(0.985);
    filter: blur(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-lock-button,
  .admin-lock-button::after,
  .admin-lock-button :deep(path) {
    transition: none !important;
  }

  .admin-panel--locking .admin-lock-button,
  .admin-panel--locking .admin-lock-button :deep(path),
  .admin-panel--locking .admin-editor-body,
  .admin-panel--locking .admin-editor-footer {
    animation: none;
  }
}
</style>
