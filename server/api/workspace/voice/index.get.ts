import { requireWorkspaceOfficer } from '../../../utils/workspace-auth'
import { loadOfficerVoice } from '../../../utils/officer-voice'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return loadOfficerVoice(event, await requireWorkspaceOfficer(event))
})
