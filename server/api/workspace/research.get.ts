import { z } from 'zod'
import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult } from '../../utils/workspace-storage'

export default defineEventHandler(async (event) => {
  await requireWorkspaceOfficer(event)
  const query = z
    .object({
      sourceOffset: z.coerce.number().int().min(0).default(0),
      jobOffset: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(40),
      sourceId: z.string().max(100).optional(),
      status: z.enum(['queued', 'running', 'completed', 'failed']).optional(),
    })
    .safeParse(getQuery(event))
  if (!query.success) throw createError({ statusCode: 400, statusMessage: 'Invalid research page' })
  const { sourceOffset, jobOffset, limit, sourceId, status } = query.data
  const db = workspaceStorage(event)
  let sourceQuery = db.from('outreach_sources').select('*', { count: 'exact' }).order('id')
  if (sourceId) sourceQuery = sourceQuery.eq('id', sourceId)
  let jobQuery = db
    .from('outreach_jobs')
    .select(
      'id,kind,status,attempts,error,created_at,updated_at,target_id,source_id,available_at,failure_kind',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .order('id')
  if (sourceId) jobQuery = jobQuery.eq('source_id', sourceId)
  if (status) jobQuery = jobQuery.eq('status', status)
  const [settings, sources, jobs] = await Promise.all([
    db.from('outreach_settings').select('*').eq('id', true).single(),
    sourceQuery.range(sourceOffset, sourceOffset + limit - 1),
    jobQuery.range(jobOffset, jobOffset + limit - 1),
  ])
  const config = workspaceResult(settings)
  return {
    settings: config,
    sources: workspaceResult(sources),
    jobs: workspaceResult(jobs),
    pagination: {
      sourceOffset,
      jobOffset,
      limit,
      sourceTotal: sources.count,
      jobTotal: jobs.count,
    },
    health: {
      note: 'Scheduling also requires the separately deployed outreach worker. Database controls cannot enable provider credentials or override its deployment safety switches.',
    },
  }
})
