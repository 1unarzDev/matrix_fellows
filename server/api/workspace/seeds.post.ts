import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, targetToRow } from '../../utils/workspace-storage'
import { outreachSeeds } from '#shared/data/outreach-seeds'
import { outreachTargetSchema, canonicalizeOutreachUrl } from '#shared/utils/outreach'
import { starterOutreachSources } from '#shared/data/outreach-sources'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  // Bootstrap reviewed acquisition routes as well as candidates. Preserve an
  // administrator's disabled sources and reviewed excerpts on repeat imports.
  const sources = starterOutreachSources()
  workspaceResult(
    await db
      .from('outreach_sources')
      .upsert(sources, { onConflict: 'id', ignoreDuplicates: true })
      .select('id'),
  )
  const rows = outreachSeeds.map((seed) => {
    const value = outreachTargetSchema.parse(seed)
    value.canonicalUrl = canonicalizeOutreachUrl(value.canonicalUrl)
    return { ...targetToRow(value), created_by: member.userId }
  })
  const result = workspaceResult(
    await db
      .from('outreach_targets')
      .upsert(rows, { onConflict: 'canonical_url', ignoreDuplicates: true })
      .select('id'),
  )
  return { added: result.length }
})
