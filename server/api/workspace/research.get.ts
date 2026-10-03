import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../utils/workspace-storage'

export default defineEventHandler(async (event) => {
  await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  const [settings, sources, jobs] = await Promise.all([
    db.from('outreach_settings').select('*').eq('id', true).single(),
    db.from('outreach_sources').select('*').order('id').limit(30),
    db
      .from('outreach_jobs')
      .select('id,kind,status,attempts,error,created_at,updated_at,target_id,source_id')
      .order('created_at', { ascending: false })
      .limit(40),
  ])
  const config = workspaceResult(settings)
  return {
    settings: config,
    sources: workspaceResult(sources),
    jobs: workspaceResult(jobs),
    health: {
      note: 'Scheduling also requires the separately deployed outreach worker. Database controls cannot enable provider credentials or override its deployment safety switches.',
    },
  }
})
