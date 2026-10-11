import { voicePreferencesSchema } from '#shared/utils/officer-voice'
import { assertWorkspaceOrigin, requireWorkspaceOfficer } from '../../../utils/workspace-auth'
import { workspaceBody, workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
import { loadOfficerVoice } from '../../../utils/officer-voice'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const officer = await requireWorkspaceOfficer(event)
  const preferences = await workspaceBody(event, voicePreferencesSchema.partial())
  workspaceResult(
    await workspaceStorage(event).rpc('outreach_set_officer_voice', {
      p_actor: officer.userId,
      p_preferences: preferences,
    }),
  )
  return loadOfficerVoice(event, officer)
})
