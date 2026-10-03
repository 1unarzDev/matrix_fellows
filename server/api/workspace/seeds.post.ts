import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, targetToRow } from '../../utils/workspace-storage'
import { outreachSeeds } from '#shared/data/outreach-seeds'
import { outreachTargetSchema, canonicalizeOutreachUrl } from '#shared/utils/outreach'
import { createHash } from 'node:crypto'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  // Bootstrap reviewed acquisition routes as well as candidates. Preserve an
  // administrator's disabled sources and reviewed excerpts on repeat imports.
  const sources = outreachSeeds.map((seed) => ({
    id: `seed-${createHash('sha256').update(canonicalizeOutreachUrl(seed.canonicalUrl)).digest('hex').slice(0, 24)}`,
    url: canonicalizeOutreachUrl(seed.canonicalUrl),
    allowed_hosts: [new URL(seed.canonicalUrl).hostname],
    kind: 'target',
    enabled: true,
  }))
  sources.push({
    id: 'uta-cse-directory',
    url: 'https://www.uta.edu/academics/schools-colleges/engineering/academics/departments/cse/research',
    // First-party lab hosts linked by this exact directory, reviewed Oct 3.
    allowed_hosts: [
      'www.uta.edu',
      'heracleia.uta.edu',
      'ranger.uta.edu',
      'uta-smile.github.io',
      'aceslab.uta.edu',
      'redgiant.uta.edu',
      'utari.uta.edu',
      'csslab.uta.edu',
      'dbxlab.uta.edu',
      'itlab.uta.edu',
      'idir.uta.edu',
      'sprlab.uta.edu',
      'se-research-center.uta.edu',
      'hybridatelier.uta.edu',
      'twistlab.uta.edu',
    ],
    kind: 'directory',
    enabled: true,
  })
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
