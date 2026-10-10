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
      statusMessage: 'AI outreach and drafts require an appointed officer.',
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
  const db = workspaceAuthStorage(event)
  const { data, error } = await db
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .eq('published', true)
    .eq('suppressed', false)
    .maybeSingle()
  if (error) throw createError({ statusCode: 503, statusMessage: 'Opportunity access is unavailable.' })
  if (data) return
  const personal = await db
    .from('dashboard_personal_opportunities')
    .select('id')
    .eq('id', id)
    .eq('user_id', (event.context?.workspaceActor as { userId: string } | undefined)?.userId || '')
    .maybeSingle()
  if (personal.error || !personal.data)
    throw createError({ statusCode: 403, statusMessage: 'Choose a published opportunity.' })
}
