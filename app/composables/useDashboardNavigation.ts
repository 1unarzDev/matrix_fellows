/** One pending query transaction shared by the shell and its detail workspaces.
 * Rapid mode/section changes merge instead of canceling each other's state. */
export function useDashboardNavigation() {
  const route = useRoute()
  const router = useRouter()
  const pending = useState<Record<string, any> | null>('dashboard-pending-query', () => null)
  const revision = useState('dashboard-query-revision', () => 0)
  function patchQuery(patch: Record<string, any>, push = false) {
    const next = { ...(pending.value || route.query), ...patch }
    for (const key in next) if (next[key] === undefined || next[key] === '') delete next[key]
    if (JSON.stringify(next) === JSON.stringify(route.query)) return
    pending.value = next
    const current = ++revision.value
    void router[push ? 'push' : 'replace']({ path: route.path, query: next }).finally(() => {
      if (revision.value === current) pending.value = null
    })
  }
  return { patchQuery }
}
