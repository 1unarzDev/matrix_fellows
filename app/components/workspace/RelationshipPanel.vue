<script setup lang="ts">
const props = defineProps<{ targetId?: string; officer: boolean }>()
const emit = defineEmits<{ followup: [relationshipId: string] }>()
const page = ref(0)
const query = computed(() => ({ page: page.value, targetId: props.targetId }))
const { data, refresh } = await useFetch<any>('/api/workspace/relationships', {
  immediate: props.officer,
  query,
})
const kind = ref('reply'),
  note = ref(''),
  due = ref(''),
  error = ref(''),
  saving = ref(false)
const selected = ref('')
const relationships = computed(() => data.value?.relationships || [])
const current = computed(() => relationships.value.find((r: any) => r.id === selected.value))
async function record() {
  if (!props.targetId && !current.value?.target_id) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/workspace/relationships', {
      method: 'POST',
      body: {
        targetId: props.targetId || current.value.target_id,
        kind: kind.value,
        note: note.value,
        occurredAt: new Date().toISOString(),
        dueDate: due.value || null,
      },
    })
    note.value = ''
    await refresh()
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Could not record the outcome.'
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <section v-if="officer" class="space-y-4" aria-label="Research relationships">
    <h2 class="text-lg font-semibold">Relationships and follow-ups</h2>
    <p class="text-sm text-gray-600">
      Record replies and promises manually. Automatic inbox reading is disconnected.
    </p>
    <label class="block"
      >Existing relationship
      <select v-model="selected" class="block w-full rounded border p-2">
        <option value="">Choose a relationship</option>
        <option v-for="r in relationships" :key="r.id" :value="r.id">
          {{ r.identity_key }} · {{ r.stage }}
        </option>
      </select>
    </label>
    <p v-if="current">
      Assigned officer: {{ current.owner_id }}. Next action:
      {{ current.next_action || 'None recorded' }} {{ current.next_action_date }}
    </p>
    <button
      v-if="current && !current.suppressed && !['declined', 'closed'].includes(current.stage)"
      type="button"
      class="rounded border px-3 py-2"
      @click="emit('followup', current.id)"
    >
      Prepare a follow-up for review
    </button>
    <form v-if="targetId || current" class="space-y-3" @submit.prevent="record">
      <label class="block"
        >Outcome
        <select v-model="kind" class="block w-full rounded border p-2">
          <option
            v-for="k in [
              'external_email',
              'reply',
              'call',
              'meeting',
              'decline',
              'invitation',
              'introduction',
              'promise',
            ]"
            :key="k"
            :value="k"
          >
            {{ k.replace('_', ' ') }}
          </option>
        </select>
      </label>
      <label class="block"
        >Note<textarea
          v-model="note"
          required
          maxlength="3000"
          class="block w-full rounded border p-2"
        />
      </label>
      <label class="block"
        >Follow-up date (optional)<input v-model="due" type="date" class="block rounded border p-2"
      /></label>
      <p class="text-sm">A date creates a task in your existing planner.</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="saving" class="rounded border px-3 py-2">
        {{ saving ? 'Saving…' : 'Record outcome' }}
      </button>
    </form>
    <ul v-if="current" class="space-y-2">
      <li
        v-for="e in (data?.events || []).filter((e: any) => e.relationship_id === selected)"
        :key="e.id"
      >
        {{ e.kind }} · {{ new Date(e.occurred_at).toLocaleDateString() }} — {{ e.note }}
      </li>
    </ul>
    <div class="flex gap-2">
      <button v-if="page > 0" type="button" @click="page--">Previous relationships</button
      ><button v-if="data?.hasMore" type="button" @click="page++">Next relationships</button>
    </div>
    <p v-if="data?.notice">{{ data.notice }}</p>
  </section>
</template>
