import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { processResearchArtifact } from '../../../utils/research-artifact-storage'
import { workspaceBody } from '../../../utils/workspace-storage'
export default defineEventHandler(async event => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const body = await workspaceBody(event, z.object({ artifactId: z.uuid() }).strict())
  await processResearchArtifact(event, body.artifactId, member.userId)
  return { ok: true }
})
