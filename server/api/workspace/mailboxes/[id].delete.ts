import { z } from 'zod'
import {
  requireWorkspaceOfficer,
  assertWorkspaceOrigin,
  workspaceAuthStorage,
} from '../../../utils/workspace-auth'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const officer = await requireWorkspaceOfficer(event)
  const id = z.string().uuid().parse(getRouterParam(event, 'id'))
  // Tombstone the identity for historical approvals, erase local credentials immediately.
  const { data, error } = await workspaceAuthStorage(event)
    .from('outreach_mailboxes')
    .update({ enabled: false, access_token_encrypted: '', refresh_token_encrypted: '' })
    .eq('id', id)
    .eq('owner_id', officer.userId)
    .select('id')
    .maybeSingle()
  if (error)
    throw createError({ statusCode: 503, statusMessage: 'Could not disconnect the mailbox.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Mailbox not found.' })
  return { ok: true }
})
