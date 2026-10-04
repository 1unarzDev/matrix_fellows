import { createError, type H3Event } from 'h3'
import { workspaceAuthStorage, type WorkspaceMember } from './workspace-auth'

// All service-role routes must apply the same live contact assignment boundary.
export async function assertWorkspaceTarget(
  event: H3Event,
  member: WorkspaceMember,
  targetId: string,
  kind?: string,
) {
  if (member.role !== 'member') return
  if (kind && kind !== 'student')
    throw createError({
      statusCode: 403,
      statusMessage: 'Members may send personal research inquiries only.',
    })
  const { data, error } = await workspaceAuthStorage(event).rpc('outreach_member_target_access', {
    p_user_id: member.userId,
    p_target_id: targetId,
  })
  if (error || !data)
    throw createError({
      statusCode: 403,
      statusMessage: 'An organizer must assign this ready contact to you first.',
    })
}

export async function assertWorkspaceOpportunity(event: H3Event, id?: string | null) {
  if (!id) return
  const { data, error } = await workspaceAuthStorage(event)
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .eq('published', true)
    .eq('suppressed', false)
    .maybeSingle()
  if (error || !data)
    throw createError({ statusCode: 403, statusMessage: 'Choose a published opportunity.' })
}
