<script setup lang="ts">
import type { SupabaseClient } from '@supabase/supabase-js'
import { csvCell } from '#shared/utils/join'

const props = defineProps<{ client: SupabaseClient }>()
type Metric = { label: string; count: number }
type Analytics = {
  total: number
  recent: number
  interests: Metric[]
  stages: Metric[]
  goals: Metric[]
  grades: Metric[]
}
type Response = {
  id: number
  created_at: string
  name: string
  email: string
  grade: string
  interests: string[]
  goals: string[]
  stage: string
  note: string
}
const stats = ref<Analytics>()
const responses = ref<Response[]>([])
const page = ref(0)
const busy = ref(false)
const error = ref('')
const pendingDelete = ref<number | null>(null)
const deleting = ref(false)
let disposed = false
async function load() {
  busy.value = true
  error.value = ''
  try {
    const [analytics, rows] = await Promise.all([
      props.client.rpc('join_response_analytics'),
      props.client
        .from('join_responses')
        .select('id,created_at,name,email,grade,interests,goals,stage,note')
        .order('id', { ascending: false })
        .range(page.value * 20, page.value * 20 + 19),
    ])
    if (disposed) return
    if (analytics.error || rows.error)
      throw new Error(
        'Could not load responses. Check your connection and editor access, then retry.',
      )
    stats.value = analytics.data
    responses.value = rows.data || []
  } catch (err) {
    if (!disposed) error.value = (err as Error).message
  } finally {
    if (!disposed) busy.value = false
  }
}
async function remove(id: number) {
  if (pendingDelete.value !== id) {
    pendingDelete.value = id
    return
  }
  deleting.value = true
  const { error: failure } = await props.client.from('join_responses').delete().eq('id', id)
  pendingDelete.value = null
  if (failure) error.value = 'Could not delete this response. Please retry.'
  else {
    if (responses.value.length === 1 && page.value) page.value--
    await load()
  }
  deleting.value = false
}
function exportSummary() {
  if (!stats.value) return
  const rows: unknown[][] = [
    ['Matrix Fellows · sponsor summary', new Date().toISOString()],
    ['Metric', 'Count'],
    ['Total responses', stats.value.total],
    ['Joined in the last 30 days', stats.value.recent],
  ]
  for (const key of ['interests', 'stages', 'goals', 'grades'] as const) {
    rows.push([], [key, 'Count (groups smaller than 5 withheld)'])
    for (const entry of stats.value[key])
      rows.push([entry.label, entry.count >= 5 ? entry.count : '<5'])
  }
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `matrix-fellows-summary-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function move(direction: number) {
  page.value += direction
  pendingDelete.value = null
  await load()
}
onMounted(load)
onBeforeUnmount(() => {
  disposed = true
})
</script>

<template>
  <section aria-label="Membership responses" class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h3 class="font-display text-xl">The people behind the questions.</h3>
        <p class="mt-2 text-xs leading-relaxed text-paper/45">
          Private responses. Only authorized editors can view them.
        </p>
      </div>
      <button
        :disabled="busy"
        class="min-h-11 shrink-0 text-xs text-acid disabled:opacity-30"
        @click="load"
      >
        Refresh
      </button>
    </div>
    <p
      v-if="error"
      role="alert"
      class="rounded-xl border border-rose-200/20 p-4 text-xs text-rose-200"
    >
      {{ error }}
    </p>
    <p v-if="busy" role="status" class="text-xs text-paper/45">Loading responses…</p>
    <template v-if="stats">
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="metric in [
            { label: 'Curious minds', value: stats.total },
            { label: 'Past 30 days', value: stats.recent },
          ]"
          :key="metric.label"
          class="rounded-2xl border border-paper/10 bg-acid/[.035] p-5"
        >
          <p class="font-display text-3xl text-acid">{{ metric.value }}</p>
          <p class="mt-2 text-[10px] uppercase tracking-wider text-paper/45">{{ metric.label }}</p>
        </div>
      </div>
      <div
        v-for="group in [
          { title: 'Research interests', values: stats.interests },
          { title: 'Experience', values: stats.stages },
          { title: 'Grade levels', values: stats.grades },
          { title: 'Meeting goals', values: stats.goals },
        ]"
        :key="group.title"
        class="space-y-3"
      >
        <h4 class="text-xs text-paper/70">{{ group.title }}</h4>
        <div v-for="metric in group.values" :key="metric.label">
          <div class="mb-2 flex justify-between gap-4 text-[11px] text-paper/55">
            <span>{{ metric.label }}</span
            ><span>{{ metric.count }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-paper/5">
            <div
              class="h-full origin-left rounded-full bg-linear-to-r from-[#8abecb]/70 to-acid/70 transition-[width] duration-1000 ease-[cubic-bezier(.45,0,.25,1)] motion-reduce:transition-none"
              :style="{ width: `${(100 * metric.count) / Math.max(1, stats.total)}%` }"
            />
          </div>
        </div>
      </div>
      <button
        :disabled="!stats.total"
        class="w-full rounded-xl border border-acid/25 bg-acid/5 px-4 py-3 text-xs text-acid hover:bg-acid/10 disabled:opacity-30"
        @click="exportSummary"
      >
        Download sponsor summary · no personal information
      </button>
      <details class="rounded-xl border border-paper/10 p-4">
        <summary class="cursor-pointer text-xs text-paper/65">
          Google Sheets connection & privacy
        </summary>
        <p class="mt-3 text-xs leading-relaxed text-paper/45">
          Responses are saved here first. The Google Sheets sync requires a one-time Apps Script
          setup by the sheet owner; it is not active simply because this link is present. Follow
          docs/join-form-setup.md in the repository. Keep the sheet restricted to organizers. Never
          share the raw response sheet with sponsors.
        </p>
        <a
          href="https://docs.google.com/spreadsheets/d/1zOpBa4Z3RACdbAthXltReQa8bdWU2yRPHZiqqQlWkk4/edit"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-flex min-h-11 items-center text-xs text-acid"
          >Open organizer sheet <SiteIcon :size="14" class="ml-2"
        /></a>
        <p class="mt-2 text-xs leading-relaxed text-paper/45">
          Deleting a response here does not delete an existing spreadsheet copy. Also remove it from
          the sheet and any downloaded files when handling a deletion request.
        </p>
      </details>
      <div class="space-y-3" :aria-busy="busy">
        <h4 class="text-xs text-paper/65">Latest responses</h4>
        <p
          v-if="!stats.total"
          class="rounded-xl border border-dashed border-paper/15 p-6 text-sm leading-relaxed text-paper/45"
        >
          Your first fellow hasn’t arrived yet. Responses and insights will appear here as people
          join.
        </p>
        <article
          v-for="response in responses"
          :key="response.id"
          class="rounded-xl border border-paper/10 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h5 class="break-words text-sm">{{ response.name }}</h5>
              <a
                :href="`mailto:${response.email}`"
                class="mt-1 block break-all text-xs text-acid/75"
                >{{ response.email }}</a
              >
            </div>
            <time class="shrink-0 text-[10px] text-paper/35">{{
              new Date(response.created_at).toLocaleDateString()
            }}</time>
          </div>
          <p class="mt-3 text-xs text-paper/50">{{ response.grade }} · {{ response.stage }}</p>
          <div v-if="response.note" class="mt-3 rounded-lg bg-paper/[.025] p-3">
            <h6 class="mb-2 text-[10px] uppercase tracking-wider text-paper/40">
              Feedback & ideas
            </h6>
            <p class="whitespace-pre-wrap break-words text-xs leading-relaxed text-paper/70">
              {{ response.note }}
            </p>
          </div>
          <p class="mt-2 text-xs leading-relaxed text-paper/45">
            {{ response.interests.join(' · ') }}
          </p>
          <p class="mt-2 text-xs leading-relaxed text-paper/45">{{ response.goals.join(' · ') }}</p>
          <div class="mt-2 flex items-center gap-3">
            <button
              :disabled="deleting"
              class="min-h-11 text-[10px] text-rose-200/60 hover:text-rose-200 disabled:opacity-30"
              @click="remove(response.id)"
            >
              {{
                pendingDelete === response.id ? 'Confirm permanent deletion' : 'Delete response'
              }}</button
            ><button
              v-if="pendingDelete === response.id"
              class="min-h-11 text-[10px] text-paper/50"
              @click="pendingDelete = null"
            >
              Cancel
            </button>
          </div>
        </article>
        <div
          v-if="stats.total > 20"
          class="flex items-center justify-between text-xs text-paper/55"
        >
          <button
            :disabled="busy || page === 0"
            class="min-h-11 disabled:opacity-25"
            @click="move(-1)"
          >
            Previous</button
          ><span>{{ page + 1 }} / {{ Math.ceil(stats.total / 20) }}</span
          ><button
            :disabled="busy || (page + 1) * 20 >= stats.total"
            class="min-h-11 disabled:opacity-25"
            @click="move(1)"
          >
            Next
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
