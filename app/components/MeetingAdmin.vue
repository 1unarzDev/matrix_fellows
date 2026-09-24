<script setup lang="ts">
import type { MeetingEvent, MeetingResource } from '#shared/types/content'

const emit = defineEmits<{ saved: []; 'full-editor': []; authorized: []; locked: [] }>()
const unlocked = ref(false)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const message = ref('')
const meetings = ref<MeetingEvent[]>([])
const editing = ref<MeetingEvent | null>(null)
const creating = ref(false)
const confirmingDelete = ref(false)
const topicsText = ref('')
const resourcesText = ref('')
const celebrating = ref(false)
const gate = ref<{ focus: () => void }>()
const gateKey = ref(0)

const errorMessage = (cause: unknown) =>
  (cause as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage ||
  (cause as { statusMessage?: string })?.statusMessage ||
  'Something went wrong. Please try again.'

const load = async (showLoading = false) => {
  if (showLoading) loading.value = true
  error.value = ''
  try {
    const response = await $fetch<{ meetings: MeetingEvent[] }>('/api/meeting-admin/meetings')
    meetings.value = response.meetings
    unlocked.value = true
    emit('authorized')
  } catch (cause) {
    const status =
      (cause as { statusCode?: number; response?: { status?: number } })?.statusCode ||
      (cause as { response?: { status?: number } })?.response?.status
    if (status !== 401) error.value = errorMessage(cause)
    unlocked.value = false
  } finally {
    loading.value = false
  }
}

const unlock = async (pin: string) => {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/meeting-admin/unlock', { method: 'POST', body: { pin } })
    celebrating.value = true
    const reduced = import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches
    await new Promise((resolve) => setTimeout(resolve, reduced ? 120 : 820))
    await load()
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    celebrating.value = false
    busy.value = false
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 88)

const edit = (meeting?: MeetingEvent) => {
  const today = new Date().toISOString().slice(0, 10)
  creating.value = !meeting
  const next: MeetingEvent = meeting
    ? JSON.parse(JSON.stringify(meeting))
    : {
        id: `meeting-${today}`,
        title: '',
        summary: '',
        date: today,
        time: 'During lunch',
        timezone: 'America/Chicago',
        location: 'Martin HS · room to be confirmed',
        state: 'tentative',
        topics: [''],
        resources: [],
        url: '',
        published: true,
      }
  editing.value = next
  topicsText.value = next.topics.join('\n')
  resourcesText.value = next.resources
    .map(({ title, url, note }) => `${title} | ${url} | ${note}`)
    .join('\n')
  confirmingDelete.value = false
  error.value = ''
  message.value = ''
}

const parseResources = (): MeetingResource[] =>
  resourcesText.value.split('\n').flatMap((line) => {
    if (!line.trim()) return []
    const [title = '', url = '', ...note] = line.split('|').map((part) => part.trim())
    return [{ title, url, note: note.join(' | ') }]
  })

const save = async () => {
  if (!editing.value) return
  editing.value.topics = topicsText.value
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
  editing.value.resources = parseResources()
  if (creating.value)
    editing.value.id = `${slugify(editing.value.title) || 'meeting'}-${editing.value.date}`
  busy.value = true
  error.value = ''
  try {
    if (creating.value)
      await $fetch('/api/meeting-admin/meetings', { method: 'POST', body: editing.value })
    else
      await $fetch(`/api/meeting-admin/meetings/${encodeURIComponent(editing.value.id)}`, {
        method: 'PATCH',
        body: editing.value,
      })
    await load()
    editing.value = null
    message.value = creating.value ? 'Meeting scheduled.' : 'Meeting updated.'
    emit('saved')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

const remove = async () => {
  if (!editing.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch(`/api/meeting-admin/meetings/${encodeURIComponent(editing.value.id)}`, {
      method: 'DELETE',
    })
    await load()
    editing.value = null
    message.value = 'Meeting deleted.'
    emit('saved')
  } catch (cause) {
    error.value = errorMessage(cause)
  } finally {
    busy.value = false
  }
}

const lock = async () => {
  await $fetch('/api/meeting-admin/logout', { method: 'POST' }).catch(() => {})
  unlocked.value = false
  meetings.value = []
  editing.value = null
  gateKey.value++
  emit('locked')
  await nextTick()
  gate.value?.focus()
}

onMounted(() => load(true))
</script>

<template>
  <div>
    <Transition name="meeting-access" mode="out-in">
      <p v-if="loading" key="loading" role="status" class="py-10 text-sm text-paper/48">
        Opening the editing room…
      </p>
      <MeetingPinGate
        v-else-if="!unlocked"
        :key="`gate-${gateKey}`"
        ref="gate"
        :busy="busy"
        :error="error"
        :success="celebrating"
        @unlock="unlock"
      />
      <div v-else key="editor" class="meeting-admin-editor">
        <div class="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-[9px] uppercase tracking-[.2em] text-acid">Meeting studio</p>
            <h3 class="mt-2 font-display text-2xl tracking-[-.04em]">The gathering schedule.</h3>
          </div>
          <div class="flex gap-2">
            <button class="meeting-admin-chip" type="button" @click="emit('full-editor')">
              Full editor
            </button>
            <button class="meeting-admin-chip" type="button" @click="lock">Lock</button>
          </div>
        </div>

        <p
          v-if="message"
          role="status"
          class="mb-5 rounded-xl bg-acid/[.07] px-4 py-3 text-xs text-acid"
        >
          {{ message }}
        </p>
        <p
          v-if="error"
          role="alert"
          class="mb-5 rounded-xl bg-rose-300/[.07] px-4 py-3 text-xs text-rose-200"
        >
          {{ error }}
        </p>

        <Transition name="meeting-editor" mode="out-in">
          <form v-if="editing" key="editor" class="space-y-5" @submit.prevent="save">
            <button type="button" class="text-xs text-acid" @click="editing = null">
              ← All meetings
            </button>
            <div class="meeting-admin-surface space-y-4">
              <AdminField v-model="editing.title" label="Meeting title" />
              <AdminField v-model="editing.summary" label="Short summary" multiline />
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminField v-model="editing.date" label="Date" type="date" />
                <AdminField v-model="editing.time" label="Time label" />
              </div>
              <div>
                <p class="mb-2.5 text-[11px] tracking-wide text-paper/55">Status</p>
                <ThemedSelect
                  :model-value="editing.state"
                  :options="[
                    { label: 'Confirmed', value: 'confirmed' },
                    { label: 'Pending · unconfirmed', value: 'tentative' },
                  ]"
                  label="Meeting status"
                  full-width
                  @update:model-value="editing.state = $event as MeetingEvent['state']"
                />
              </div>
              <AdminField v-model="editing.location" label="Location" />
              <AdminField v-model="editing.timezone" label="Timezone" />
              <AdminField v-model="topicsText" label="Meeting points · one per line" multiline />
              <AdminField
                v-model="resourcesText"
                label="Resources · one per line: Title | URL | Note"
                multiline
              />
              <AdminField
                v-model="editing.url"
                label="Optional meeting / RSVP URL"
                placeholder="https://"
              />
              <label class="flex min-h-11 items-center gap-3 text-sm text-paper/65">
                <input v-model="editing.published" type="checkbox" class="h-4 w-4 accent-acid" />
                Visible on the public calendar
              </label>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button
                :disabled="busy"
                class="rounded-full bg-acid px-6 py-3 text-sm text-ink disabled:opacity-40"
              >
                {{ busy ? 'Saving…' : creating ? 'Schedule meeting' : 'Save changes' }}
              </button>
              <template v-if="!creating">
                <button
                  v-if="!confirmingDelete"
                  type="button"
                  class="px-3 py-2 text-xs text-paper/45 hover:text-rose-200"
                  @click="confirmingDelete = true"
                >
                  Delete
                </button>
                <span v-else class="flex flex-wrap items-center gap-2 text-xs text-rose-100">
                  Delete this meeting?
                  <button
                    type="button"
                    class="rounded-full border border-rose-200/30 px-3 py-2"
                    @click="remove"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    class="px-2 py-2 text-paper/55"
                    @click="confirmingDelete = false"
                  >
                    Cancel
                  </button>
                </span>
              </template>
            </div>
          </form>

          <div v-else key="list">
            <button
              class="mb-6 rounded-full border border-acid/35 bg-acid/[.06] px-5 py-3 text-xs text-acid hover:-translate-y-0.5 hover:border-acid/60"
              @click="edit()"
            >
              + Schedule a meeting
            </button>
            <div class="grid gap-3">
              <button
                v-for="meeting in meetings"
                :key="meeting.id"
                type="button"
                class="meeting-admin-row group"
                @click="edit(meeting)"
              >
                <span class="meeting-admin-row__date">{{
                  meeting.date.slice(5).replace('-', '·')
                }}</span>
                <span class="min-w-0 flex-1 text-left">
                  <span class="block truncate text-sm text-paper/85">{{ meeting.title }}</span>
                  <span
                    class="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-paper/38"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :class="
                        meeting.state === 'confirmed'
                          ? 'bg-[#e4bb72] shadow-[0_0_7px_#e4bb72]'
                          : 'rotate-45 rounded-[1px] border border-[#b7a2e2]'
                      "
                    />
                    {{ meeting.state === 'confirmed' ? 'Confirmed' : 'Pending' }} ·
                    {{ meeting.location }}
                  </span>
                </span>
                <SiteIcon
                  :size="13"
                  class="text-paper/35 transition-transform duration-500 group-hover:translate-x-1"
                />
              </button>
            </div>
            <p v-if="!meetings.length" class="py-10 text-center text-sm text-paper/40">
              No meetings yet. Schedule the first one.
            </p>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.meeting-admin-surface {
  border: 1px solid rgb(244 241 233 / 9%);
  border-radius: 1.5rem;
  padding: 1.1rem;
  background: rgb(244 241 233 / 3.5%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 4%);
  backdrop-filter: blur(18px);
}
.meeting-access-enter-active,
.meeting-access-leave-active {
  transition:
    opacity 360ms ease,
    translate 680ms cubic-bezier(0.16, 1.22, 0.3, 1),
    scale 680ms cubic-bezier(0.16, 1.22, 0.3, 1);
}
.meeting-access-enter-from {
  opacity: 0;
  translate: 0 -18px;
  scale: 0.965;
}
.meeting-access-leave-to {
  opacity: 0;
  translate: 0 34px;
  scale: 0.94;
}
.meeting-admin-editor {
  transform-origin: 50% 0;
}
.meeting-admin-chip {
  min-height: 2.5rem;
  border: 1px solid rgb(244 241 233 / 12%);
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  color: rgb(244 241 233 / 48%);
  font-size: 0.68rem;
}
.meeting-admin-chip:hover {
  border-color: rgb(197 192 235 / 35%);
  color: var(--color-paper);
  transform: translateY(-1px);
}
.meeting-admin-row {
  display: flex;
  min-height: 4.75rem;
  width: 100%;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgb(244 241 233 / 8%);
  border-radius: 1.25rem;
  padding: 0.9rem 1rem;
  background: rgb(244 241 233 / 2.5%);
  transition:
    transform 520ms cubic-bezier(0.16, 1.2, 0.3, 1),
    border-color 300ms ease,
    background-color 300ms ease;
}
.meeting-admin-row:hover {
  transform: translateY(-2px);
  border-color: rgb(197 192 235 / 25%);
  background: rgb(197 192 235 / 5%);
}
.meeting-admin-row__date {
  display: grid;
  width: 2.7rem;
  height: 2.7rem;
  place-items: center;
  border-radius: 0.9rem;
  background: rgb(244 241 233 / 4%);
  font-family: var(--font-mono, monospace);
  font-size: 0.67rem;
  color: rgb(244 241 233 / 50%);
}
.meeting-editor-enter-active,
.meeting-editor-leave-active {
  transition:
    opacity 260ms ease,
    transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
}
.meeting-editor-enter-from {
  opacity: 0;
  transform: translateX(10px);
}
.meeting-editor-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
@media (prefers-reduced-motion: reduce) {
  .meeting-admin-row,
  .meeting-access-enter-active,
  .meeting-access-leave-active,
  .meeting-editor-enter-active,
  .meeting-editor-leave-active {
    transition: none;
  }
}
</style>
