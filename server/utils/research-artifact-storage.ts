import type { H3Event } from 'h3'
import { workspaceResult, workspaceStorage } from './workspace-storage'
import { hashText } from './workspace-auth'
import { acquireResearchArtifact } from './research-artifacts'

export async function processResearchArtifact(event: H3Event, artifactId: string, userId: string) {
  const db = workspaceStorage(event)
  const artifact = workspaceResult(await db.rpc('research_claim_artifact', { p_user_id: userId, p_artifact_id: artifactId }))
  if (!artifact || artifact.quotaWaiting) return
  let result
  try {
    const acquired = await acquireResearchArtifact(artifact.canonical_url)
    result = { ...acquired, contentHash: await hashText(acquired.text + JSON.stringify(acquired.metadata)) }
  } catch (error) {
    const allowed = ['too_large', 'not_found', 'access_unavailable', 'invalid_metadata', 'empty_source']
    const message = error instanceof Error && allowed.includes(error.message) ? error.message : 'acquisition_unavailable'
    result = { state: 'failed', errorCode: message, summary: 'The link is saved. Acquisition is unavailable; you can retry or describe your contribution locally.' }
  }
  // This RPC rechecks the live member, lease and token, and applies evidence atomically.
  workspaceResult(await db.rpc('research_complete_artifact', { p_user_id: userId, p_artifact_id: artifactId, p_token: artifact.claim_token, p_result: result }))
}
