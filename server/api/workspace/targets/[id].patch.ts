import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  workspaceBody,
  workspaceId,
  targetFromRow,
  targetToRow,
} from '../../../utils/workspace-storage'
import { canonicalizeOutreachUrl, outreachTargetSchema } from '#shared/utils/outreach'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  const id = workspaceId(event)
  const { expectedUpdatedAt, ...partial } = await workspaceBody(
    event,
    outreachTargetSchema
      .partial()
      .extend({ expectedUpdatedAt: z.string().datetime({ offset: true }) }),
  )
  const previous = targetFromRow(
    workspaceResult(await db.from('outreach_targets').select().eq('id', id).single()),
  )
  if (previous.updatedAt !== expectedUpdatedAt)
    throw createError({
      statusCode: 409,
      statusMessage: 'Another update changed this candidate. Reload before saving your edits.',
    })
  const { id: _, createdAt: __, updatedAt: ___, ...fields } = previous
  const body = outreachTargetSchema.parse({ ...fields, ...partial })
  body.canonicalUrl = canonicalizeOutreachUrl(body.canonicalUrl)
  const row = targetToRow(body)
  row.dossier = {
    ...row.dossier,
    ...(previous.canonicalUrl === body.canonicalUrl && previous.dossier.acquisition
      ? { acquisition: previous.dossier.acquisition }
      : {}),
  }
  const saved = workspaceResult(
    await db
      .from('outreach_targets')
      .update(row)
      .eq('id', id)
      .eq('updated_at', previous.updatedAt)
      .select()
      .maybeSingle(),
  )
  if (!saved)
    throw createError({
      statusCode: 409,
      statusMessage: 'This candidate changed during your edit. Reload before saving.',
    })
  return targetFromRow(saved)
})
