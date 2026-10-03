import type { OutreachWorkspace } from '#shared/types/outreach'

export function useWorkspace() {
  const data = ref<OutreachWorkspace | null>(null)
  const loading = ref(false)
  const busy = ref(false)
  const error = ref('')
  const notice = ref('')
  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      data.value = await $fetch<OutreachWorkspace>('/api/workspace')
    } catch (cause: any) {
      error.value =
        cause?.data?.message ||
        cause?.data?.statusMessage ||
        cause?.message ||
        'The workspace could not be loaded.'
      if (cause?.status === 401 || cause?.statusCode === 401) await navigateTo('/login')
    } finally {
      loading.value = false
    }
  }
  async function mutate<T = unknown>(
    path: string,
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body?: unknown,
    message = 'Saved.',
  ) {
    if (busy.value) return null
    busy.value = true
    error.value = ''
    notice.value = ''
    try {
      const result = await $fetch<T>(`/api/workspace${path}`, { method, body: body as any })
      await refresh()
      notice.value = message
      return result
    } catch (cause: any) {
      error.value =
        cause?.data?.message ||
        cause?.data?.statusMessage ||
        cause?.message ||
        'This change could not be saved.'
      return null
    } finally {
      busy.value = false
    }
  }
  return { data, loading, busy, error, notice, refresh, mutate }
}
