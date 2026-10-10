import { requireWorkspaceOfficer } from '../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../../utils/workspace-storage'
import { z } from 'zod'
export default defineEventHandler(async event => {
  await requireWorkspaceOfficer(event)
  const parsed = z.object({ page: z.coerce.number().int().min(0).max(10000).default(0) }).safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid profile page.' })
  const page = parsed.data.page, pageSize = 25
  const result = await workspaceStorage(event).from('outreach_profiles').select('id,full_name,interests,goals,availability,location', { count: 'exact' }).eq('consent_to_share', true).not('subject_user_id', 'is', null).order('id').range(page * pageSize, page * pageSize + pageSize - 1)
  const rows = workspaceResult(result)
  return { profiles: rows.map(p => ({ id: p.id, fullName: p.full_name, interests: p.interests, goals: p.goals, availability: p.availability, location: p.location, consentToShare: true, skills: [], affiliations: [], achievements: [], introduction: '', signature: '', workSamples: [] })), page, pageSize, total: result.count || 0 }
})
