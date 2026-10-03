import { requireWorkspaceOfficer } from '../../../utils/workspace-auth'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const { userId, email, role } = await requireWorkspaceOfficer(event)
    return { configured: true, authenticated: true, officer: { userId, email, role } }
  } catch (cause) {
    const status = (cause as { statusCode?: number }).statusCode
    if (![401, 403, 503].includes(status || 0)) throw cause
    return { configured: status !== 503, authenticated: false, officer: null }
  }
})
