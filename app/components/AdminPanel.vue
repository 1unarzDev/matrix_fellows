<script setup lang="ts">
import MatrixMark from '~/components/MatrixMark.vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminClient } from '~/lib/admin-client'
import type { SiteContent, Opportunity, ImportSource } from '#shared/types/content'
import { contentSchema, opportunitySchema, sourceSchema } from '#shared/utils/validation'

const props = defineProps<{ initialContent: SiteContent; opportunities: Opportunity[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const config = useRuntimeConfig()
const configured = Boolean(config.public.supabaseUrl && config.public.supabaseAnonKey)
const panel = ref<HTMLElement>()
const email = ref(''),
  message = ref(''),
  error = ref('')
const checking = ref(configured),
  authenticated = ref(false),
  busy = ref(false)
const tab = ref('Meeting')
function changeTab(name: string) {
  tab.value = name
  error.value = ''
  message.value = ''
}
async function signOut() {
  if (!client) return
  const result = await client.auth.signOut()
  if (result.error) error.value = result.error.message
  else authenticated.value = false
}
const draft = ref<SiteContent>(JSON.parse(JSON.stringify(props.initialContent)))
const listings = ref<Opportunity[]>([...props.opportunities])
const sources = ref<Array<ImportSource & { last_run?: string; last_error?: string }>>([])
const editing = ref<Opportunity | null>(null)
const source = ref<ImportSource>({ id: '', name: '', kind: 'json', url: '', enabled: false })
const topics = computed({
  get: () => draft.value.meeting.topics.join('\n'),
  set: (value) => {
    draft.value.meeting.topics = value.split('\n').filter(Boolean)
  },
})
let client: SupabaseClient | undefined
let unsubscribe: (() => void) | undefined
let previousFocus: HTMLElement | null
let alreadyLocked = false
let disposed = false
let originalListing: Opportunity | undefined

async function authorize() {
  if (!client || disposed) return
  checking.value = true
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) {
    authenticated.value = false
    checking.value = false
    return
  }
  const { data: allowed, error: authError } = await client.rpc('is_editor')
  if (disposed) return
  authenticated.value = Boolean(allowed && !authError)
  checking.value = false
  if (!authenticated.value) {
    error.value = 'This account does not have editing access.'
    return
  }
  const [site, rows, feeds] = await Promise.all([
    client.from('site_content').select('data,draft').eq('id', 'main').maybeSingle(),
    client.from('opportunities').select('*').order('updated_at', { ascending: false }),
    client.from('import_sources').select('*'),
  ])
  if (disposed) return
  if (site.error || rows.error || feeds.error) {
    error.value = 'Could not load all editor data. Please retry.'
    return
  }
  if (site.data?.draft || site.data?.data) draft.value = site.data.draft || site.data.data
  listings.value = (rows.data || []).map((row) => ({
    ...row.data,
    ...row.overrides,
    id: row.id,
    published: row.published && !row.suppressed,
  }))
  sources.value = feeds.data || []
}

async function login() {
  if (!client) return
  busy.value = true
  error.value = ''
  message.value = ''
  const { error: loginError } = await client.auth.signInWithOtp({
    email: email.value,
    options: { shouldCreateUser: false, emailRedirectTo: `${config.public.siteUrl}/?admin=1` },
  })
  busy.value = false
  if (loginError) error.value = loginError.message
  else
    message.value = 'Check your email for a secure sign-in link. Only the owner account can edit.'
}

async function save(publish: boolean) {
  if (!client) return
  error.value = ''
  message.value = ''
  const parsed = contentSchema.safeParse(draft.value)
  if (!parsed.success) {
    error.value = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    return
  }
  busy.value = true
  const payload: { id: string; data?: SiteContent; draft: SiteContent; published?: boolean } =
    publish
      ? { id: 'main', data: parsed.data, draft: parsed.data, published: true }
      : { id: 'main', draft: parsed.data }
  const { error: saveError } = await client.from('site_content').upsert(payload)
  busy.value = false
  if (saveError) error.value = saveError.message
  else {
    message.value = publish
      ? 'Published. Public updates may take up to 30 seconds.'
      : 'Draft saved. The public page is unchanged.'
    if (publish) emit('saved')
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
  if (!client || !editing.value) return
  error.value = ''
  message.value = ''
  const parsed = opportunitySchema.safeParse(editing.value)
  if (!parsed.success) {
    error.value = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    return
  }
  busy.value = true
  const item = parsed.data
  let result
  if (originalListing) {
    const changed: Record<string, unknown> = {}
    for (const key of Object.keys(item) as Array<keyof Opportunity>) {
      if (
        item[key] !== originalListing[key] &&
        !['id', 'sourceId', 'externalId', 'published'].includes(key)
      )
        changed[key] = item[key]
    }
    result = await client.rpc('edit_opportunity', {
      opportunity_id: item.id,
      changes: changed,
      make_public: item.published,
    })
  } else
    result = await client.from('opportunities').insert({
      id: item.id,
      source_id: item.sourceId,
      external_id: item.externalId,
      canonical_url: item.url,
      data: item,
      published: item.published,
    })
  busy.value = false
  if (result.error) error.value = result.error.message
  else {
    editing.value = null
    message.value = 'Listing saved.'
    await authorize()
    emit('saved')
  }
}

async function saveSource() {
  if (!client) return
  const parsed = sourceSchema.safeParse(source.value)
  if (!parsed.success) {
    error.value = parsed.error.issues.map((i) => i.message).join('\n')
    return
  }
  busy.value = true
  const { error: sourceError } = await client.from('import_sources').upsert(parsed.data)
  busy.value = false
  if (sourceError) error.value = sourceError.message
  else {
    message.value = 'Source saved. Enabled sources run on the daily schedule.'
    source.value = { id: '', name: '', kind: 'json', url: '', enabled: false }
    await authorize()
  }
}

function handleKeys(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
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
  panel.value?.focus()
  if (!configured) return
  client = getAdminClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
  const { data } = client.auth.onAuthStateChange(() => {
    setTimeout(() => {
      if (!disposed) void authorize()
    }, 0)
  })
  unsubscribe = () => data.subscription.unsubscribe()
  await authorize()
})
onBeforeUnmount(() => {
  disposed = true
  unsubscribe?.()
  if (!alreadyLocked) document.body.classList.remove('overflow-hidden')
  previousFocus?.focus({ preventScroll: true })
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex justify-end bg-black/60 font-sans text-paper backdrop-blur-sm"
      @mousedown.self="emit('close')"
    >
      <section
        ref="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        tabindex="-1"
        class="flex h-dvh w-full max-w-xl flex-col border-l border-paper/15 bg-ink shadow-2xl outline-none"
        @keydown="handleKeys"
      >
        <header
          class="flex shrink-0 items-center justify-between border-b border-paper/15 px-6 py-5"
        >
          <div>
            <p class="text-[9px] uppercase tracking-[.2em] text-acid">Matrix Fellows</p>
            <h2 id="admin-title" class="mt-1 font-display text-xl">The editing room.</h2>
          </div>
          <button
            aria-label="Close editor"
            class="rounded-full border border-paper/15 p-3 hover:bg-paper/10"
            @click="emit('close')"
          >
            <SiteIcon name="close" :size="18" />
          </button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
          <div v-if="!configured" class="rounded-xl border border-paper/15 p-6">
            <MatrixMark :size="32" class="text-acid" />
            <h3 class="mt-5 text-lg">A home for your updates.</h3>
            <p class="mt-3 text-sm leading-relaxed text-paper/60">
              The editor is ready to connect. Configure Supabase, apply the included database
              migration, and authorize the owner account to enable secure editing.
            </p>
            <p class="mt-4 text-xs leading-relaxed text-paper/40">
              Setup instructions are included in the project README. Your content stays visible
              while setup is pending.
            </p>
          </div>
          <p v-else-if="checking" role="status" class="text-sm text-paper/60">
            Checking your access…
          </p>
          <form v-else-if="!authenticated" class="space-y-5" @submit.prevent="login">
            <p class="text-sm leading-relaxed text-paper/60">
              Sign in with the owner email. We’ll send a secure link; no password to remember.
            </p>
            <AdminField v-model="email" label="Owner email" type="email" /><button
              :disabled="busy || !email"
              class="rounded-full bg-acid px-6 py-3 text-sm text-ink disabled:opacity-40"
            >
              {{ busy ? 'Sending…' : 'Send sign-in link' }}
            </button>
          </form>
          <template v-else>
            <nav aria-label="Editor sections" class="mb-7 flex flex-wrap gap-2">
              <button
                v-for="name in ['Meeting', 'Research', 'Support', 'Links', 'Listings', 'Sources']"
                :key="name"
                class="rounded-full px-3 py-2 text-xs"
                :class="tab === name ? 'bg-acid text-ink' : 'bg-paper/5 text-paper/55'"
                @click="changeTab(name)"
              >
                {{ name }}
              </button>
            </nav>
            <div v-if="tab === 'Meeting'" class="space-y-4">
              <AdminField v-model="draft.meeting.title" label="Meeting title" />
              <div class="grid grid-cols-2 gap-4">
                <AdminField v-model="draft.meeting.date" label="Date" type="date" /><AdminField
                  v-model="draft.meeting.time"
                  label="Time"
                  type="time"
                />
              </div>
              <AdminField v-model="draft.meeting.timezone" label="Timezone" /><AdminField
                v-model="draft.meeting.location"
                label="Location"
              /><AdminField
                v-model="topics"
                label="Discussion topics · one per line"
                multiline
              /><AdminField
                v-model="draft.meeting.url"
                label="RSVP link · optional"
                placeholder="https://"
              />
            </div>
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
                label="Join / community link"
                placeholder="https://"
              /><AdminField
                v-model="draft.links.contact"
                label="Contact link"
                placeholder="https:// or mailto:"
              />
              <p class="text-xs leading-relaxed text-paper/45">
                Leave a link blank to show the corresponding forthcoming state.
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
                        >{{ item.sourceId }} · {{ item.published ? 'Published' : 'Hidden' }}</span
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
                ><AdminField v-model="editing.title" label="Title" /><label
                  class="block text-xs text-paper/55"
                  >Type<select
                    v-model="editing.kind"
                    class="mt-2 block w-full rounded-lg border border-paper/15 bg-ink p-3 text-sm"
                  >
                    <option
                      v-for="kind in [
                        'Competition',
                        'Conference',
                        'Workshop',
                        'Publication',
                        'Program',
                      ]"
                      :key="kind"
                    >
                      {{ kind }}
                    </option>
                  </select></label
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
                Enable only trusted, verified HTTPS feeds that match the documented JSON or RSS
                adapter. New entries publish automatically on the daily schedule.
              </p>
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
              <form class="space-y-4 border-t border-paper/15 pt-6" @submit.prevent="saveSource">
                <AdminField
                  v-model="source.id"
                  label="Stable ID · lowercase letters, digits, hyphens"
                /><AdminField v-model="source.name" label="Name" /><AdminField
                  v-model="source.url"
                  label="Verified endpoint URL"
                /><label class="block text-xs text-paper/55"
                  >Adapter<select
                    v-model="source.kind"
                    class="mt-2 block w-full rounded-lg border border-paper/15 bg-ink p-3"
                  >
                    <option value="json">JSON</option>
                    <option value="rss">RSS / Atom</option>
                  </select></label
                ><label class="flex items-center gap-3 text-sm"
                  ><input v-model="source.enabled" type="checkbox" class="accent-acid" />Enable
                  automatic publication</label
                ><button
                  :disabled="busy"
                  class="rounded-full bg-acid px-5 py-3 text-sm text-ink disabled:opacity-40"
                >
                  Save source
                </button>
              </form>
            </div>
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
          class="flex shrink-0 items-center gap-3 border-t border-paper/15 bg-ink p-5"
        >
          <template v-if="!['Listings', 'Sources'].includes(tab)"
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
          ><button class="ml-auto text-xs text-paper/45" @click="signOut">Sign out</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
