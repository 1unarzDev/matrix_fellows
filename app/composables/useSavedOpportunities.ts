const STORAGE_KEY = 'matrix-fellows:saved-opportunities:v1'

export function useSavedOpportunities() {
  const ids = useState<string[]>('saved-opportunity-ids', () => [])
  const ready = useState('saved-opportunities-ready', () => false)
  const available = useState('saved-opportunities-storage', () => true)
  onMounted(() => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      ids.value = Array.isArray(value)
        ? value.filter((id) => typeof id === 'string').slice(0, 500)
        : []
    } catch {
      available.value = false
    } finally {
      ready.value = true
    }
  })
  function toggle(id: string) {
    if (!ready.value || !available.value) return
    const next = ids.value.includes(id)
      ? ids.value.filter((value) => value !== id)
      : [...ids.value, id]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      ids.value = next
    } catch {
      available.value = false
    }
  }
  return { ids, ready, available, toggle, isSaved: (id: string) => ids.value.includes(id) }
}
