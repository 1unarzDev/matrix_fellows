import { z } from 'zod'
import { requireWorkspaceMember, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import { ensureMemberResearchProfile } from '../../../utils/research-profile'
import { classifyResearchLink } from '../../../utils/research-artifacts'
import { processResearchArtifact } from '../../../utils/research-artifact-storage'
import { workspaceStorage, workspaceResult, workspaceBody } from '../../../utils/workspace-storage'
export default defineEventHandler(async event => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceMember(event)
  const body = await workspaceBody(event, z.object({ url: z.url().max(2000), relationship: z.enum(['interest', 'contributed', 'created']).default('interest'), contribution: z.string().trim().max(1500).default('') }).strict())
  let link
  try { link = classifyResearchLink(body.url) } catch { throw createError({ statusCode: 400, statusMessage: 'Use a public HTTPS research link.' }) }
  const { id } = await ensureMemberResearchProfile(event, member)
  const db = workspaceStorage(event)
  const artifactId = workspaceResult(await db.rpc('research_add_artifact', { p_user_id: member.userId, p_profile_id: id, p_url: link.url, p_kind: link.kind, p_relationship: body.relationship, p_contribution: body.contribution })) as string
  const artifact = { id: artifactId }
  const work = processResearchArtifact(event, artifact.id, member.userId)
  // Cloudflare extends the request lifetime; other runtimes finish before returning.
  const runtime = event.context.cloudflare as { context?: { waitUntil(promise: Promise<unknown>): void } } | undefined
  if (runtime?.context?.waitUntil) runtime.context.waitUntil(work); else await work
  return artifact
})
