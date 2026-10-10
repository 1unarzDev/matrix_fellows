import type {
  OpportunityDecision,
  OpportunityReference,
} from '#shared/types/dashboard-opportunities'
import type { H3Event } from 'h3'
import { workspaceStorage, workspaceResult } from './workspace-storage'
import { capturePreview } from '#shared/utils/dashboard-opportunities'
import { opportunitySchema } from '#shared/utils/validation'
export function decisionFromRow(r: any): OpportunityDecision {
  return {
    opportunityId: r.opportunity_id,
    decision: r.decision,
    reason: r.reason,
    version: r.version,
    updatedAt: r.updated_at,
  }
}
export function referenceFromRow(r: any): OpportunityReference {
  return {
    id: r.id,
    url: r.url,
    title: r.title,
    verification: r.verification,
    createdAt: r.created_at,
  }
}
export async function previewCapturedOpportunity(event: H3Event, url: string) {
  const variants = [url]
  const u = new URL(url)
  if (!u.search) variants.push(url.endsWith('/') ? url.slice(0, -1) : url + '/')
  const rows = workspaceResult(
    await workspaceStorage(event)
      .from('opportunities')
      .select('id,canonical_url,data,overrides,updated_at')
      .in('canonical_url', variants)
      .eq('published', true)
      .eq('suppressed', false)
      .limit(2),
  )
  const row = rows[0]
  if (!row) return capturePreview(url, null, null)
  const parsed = opportunitySchema.safeParse({
    ...row.data,
    ...row.overrides,
    id: row.id,
    published: true,
  })
  if (!parsed.success) return capturePreview(url, null, null)
  return capturePreview(url, parsed.data, null)
}
