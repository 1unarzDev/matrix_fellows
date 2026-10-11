import { requireWorkspaceOfficer } from '../../../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../../../utils/workspace-storage'

export default defineEventHandler(async (event) => {
  await requireWorkspaceOfficer(event)
  const id = getRouterParam(event, 'id') || ''
  if (!id || id.length > 100)
    throw createError({ statusCode: 400, statusMessage: 'Invalid source' })
  const db = workspaceStorage(event)
  const source = workspaceResult(
    await db.from('outreach_sources').select('*').eq('id', id).single(),
  )
  const jobs = workspaceResult(
    await db
      .from('outreach_jobs')
      .select('id,status,error,result,updated_at')
      .eq('source_id', id)
      .order('updated_at', { ascending: false })
      .limit(10),
  )
  const stages = jobs.length
    ? workspaceResult(
        await db
          .from('research_stage_runs')
          .select('id,job_id,stage,status,result,error,created_at,completed_at,reservation,usage')
          .in(
            'job_id',
            jobs.map((job) => job.id),
          )
          .order('created_at', { ascending: false })
          .limit(30),
      )
    : []
  const acquired = stages.find(
    (stage) => stage.stage === 'acquire' && stage.status === 'completed' && stage.result?.hash,
  )
  return { source: { ...source, snapshot: acquired?.result || null }, jobs, stages }
})
