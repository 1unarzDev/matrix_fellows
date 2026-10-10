const STORAGE_KEY = 'matrix-fellows:saved-opportunities:v1'
// Client-only, shared across row consumers: one auth/collection read, not one per card.
let refreshInFlight: Promise<void> | null = null

export function useSavedOpportunities() {
  const ids = useState<string[]>('saved-opportunity-ids', () => [])
  const guestIds = useState<string[]>('guest-opportunity-ids', () => [])
  const owner = useState<string | null>('saved-opportunity-owner', () => null)
  const ready = useState('saved-opportunities-ready', () => false)
  const available = useState('saved-opportunities-storage', () => true)
  const pending = useState('saved-opportunities-pending', () => false)
  const error = useState('saved-opportunities-error', () => '')
  const generation = useState('saved-opportunities-generation', () => 0)
  const initialized = useState('saved-opportunities-initialized', () => false)
  const route = useRoute()
  function readGuest() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      guestIds.value = Array.isArray(value)
        ? [...new Set(value.filter((id): id is string => typeof id === 'string'))].slice(0, 500)
        : []
      if (!owner.value) ids.value = [...guestIds.value]
      if (!owner.value) available.value = true
    } catch {
      if (!owner.value) available.value = false
    }
  }
  function setAccount(userId: string, accountIds: string[]) {
    if (pending.value && owner.value === userId) return
    if (owner.value !== userId) generation.value++
    owner.value = userId
    ids.value = [...accountIds]
    available.value = true
    ready.value = true
  }
  async function loadCollection() {
    const version = ++generation.value
    ready.value = false
    try {
      const session = await $fetch<{ authenticated: boolean; officer?: { userId: string } }>(
        '/api/workspace/auth/session',
      )
      if (version !== generation.value) return
      const userId = session.authenticated ? session.officer?.userId : null
      if (userId) {
        if (owner.value !== userId) ids.value = []
        owner.value = userId
        ready.value = false
        const collection = await $fetch<{ opportunityIds: string[] }>(
          '/api/workspace/catalog-saves',
          { query: { idsOnly: '1' } },
        )
        if (version !== generation.value) return
        ids.value = collection.opportunityIds
        available.value = true
      } else {
        owner.value = null
        readGuest()
      }
      error.value = ''
    } catch {
      if (version !== generation.value) return
      available.value = false
      error.value = 'Saved opportunities could not be loaded. Try again.'
    } finally {
      if (version === generation.value) ready.value = true
    }
  }
  function refresh() {
    if (pending.value) return Promise.resolve()
    if (!refreshInFlight)
      refreshInFlight = loadCollection().finally(() => {
        refreshInFlight = null
      })
    return refreshInFlight
  }
  function storageChanged(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) readGuest()
  }
  onMounted(() => {
    if (!initialized.value) {
      initialized.value = true
      readGuest()
    }
    void refresh()
    window.addEventListener('storage', storageChanged)
    window.addEventListener('focus', refresh)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('storage', storageChanged)
    window.removeEventListener('focus', refresh)
  })
  watch(
    () => route.path,
    () => {
      if (import.meta.client) void refresh()
    },
  )
  async function toggle(id: string) {
    if (!ready.value || !available.value || pending.value) return false
    const userId = owner.value
    const version = generation.value
    const saved = ids.value.includes(id)
    const previous = [...ids.value]
    const next = saved ? previous.filter((value) => value !== id) : [...previous, id]
    if (!userId && next.length > 500) {
      error.value = 'This browser holds 500 saves. Remove one or sign in to use your account collection.'
      return false
    }
    pending.value = true
    error.value = ''
    // Reflect the intent immediately; persistence failure restores only this collection version.
    ids.value = next
    try {
      if (userId) {
        const result = await $fetch<{ opportunityIds?: string[] }>(
          saved
            ? `/api/workspace/catalog-saves/${encodeURIComponent(id)}`
            : '/api/workspace/catalog-saves',
          {
            method: saved ? 'DELETE' : 'POST',
            body: saved ? undefined : { opportunityIds: [id] },
          },
        )
        if (owner.value !== userId || generation.value !== version) return false
        ids.value = result.opportunityIds || next
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        guestIds.value = next
        ids.value = next
      }
      return true
    } catch {
      if (owner.value !== userId || generation.value !== version) return false
      ids.value = previous
      error.value = 'Your save could not be confirmed. Previous selection restored; try again.'
      return false
    } finally {
      pending.value = false
    }
  }
  async function mergeGuest() {
    if (!owner.value || pending.value || !guestIds.value.length) return false
    const userId = owner.value
    const version = generation.value
    pending.value = true
    try {
      const result = await $fetch<{ opportunityIds: string[] }>('/api/workspace/catalog-saves', {
        method: 'POST',
        body: { opportunityIds: guestIds.value },
      })
      if (owner.value !== userId || generation.value !== version) return false
      ids.value = result.opportunityIds
      try {
        localStorage.removeItem(STORAGE_KEY)
        guestIds.value = []
      } catch {
        /* Transfer succeeded even if local storage is blocked. */
      }
      error.value = ''
      return true
    } catch {
      error.value = 'Browser saves could not be transferred. They remain on this device.'
      return false
    } finally {
      pending.value = false
    }
  }
  return {
    ids,
    guestIds,
    owner,
    ready,
    available,
    pending,
    error,
    toggle,
    refresh,
    setAccount,
    mergeGuest,
    isSaved: (id: string) => ids.value.includes(id),
  }
}
