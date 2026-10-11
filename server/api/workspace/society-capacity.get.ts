import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import { workspaceResult, workspaceStorage } from '../../utils/workspace-storage'

/** Internal, consenting capacity projection. This does not publish a member directory. */
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  const members = workspaceResult(await db.from('outreach_members').select('user_id').eq('enabled', true))
  const profiles = workspaceResult(await db.from('outreach_profiles')
    .select('id,full_name,subject_user_id').eq('consent_to_share', true).not('subject_user_id', 'is', null)).filter(p => members.some(m => m.user_id === p.subject_user_id))
  if (!profiles.length) return { projects: [], note: 'No shared contributions yet. Curated organization facts remain separate.' }
  const claims = workspaceResult(await db.from('research_claims')
    .select('id,profile_id,project_id,statement,origin,support_state,evidence_date,snapshot_id')
    .in('profile_id', profiles.map(p => p.id)).eq('sharing_scope', 'officer')
    .eq('adoption', 'accepted').eq('predicate', 'contribution').is('withdrawn_at', null).limit(200))
  const ids = [...new Set(claims.flatMap(c => c.project_id ? [c.project_id] : []))]
  const projects = ids.length ? workspaceResult(await db.from('research_projects').select('id,title,canonical_url').in('id', ids)) : []
  return {
    projects: projects.map(project => ({
      id: project.id, title: project.title, url: project.canonical_url,
      contributions: claims.filter(c => c.project_id === project.id).map(c => ({
        claimId: c.id, profileId: c.profile_id,
        member: profiles.find(p => p.id === c.profile_id)?.full_name,
        statement: c.statement, origin: c.origin, support: c.support_state,
        evidenceDate: c.evidence_date, availability: 'Availability unconfirmed',
      })),
    })),
    truncated: claims.length === 200,
    note: 'Internal shared member work, counted once per project. These contributions are not society-owned accomplishments or commitments.',
  }
})
