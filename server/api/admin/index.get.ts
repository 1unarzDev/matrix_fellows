import { assertMeetingSession, meetingStorage } from '../../utils/meeting-admin'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  await assertMeetingSession(event)
  const client = meetingStorage(event)
  const [site, rows, feeds, proposals, monitoring, discoveries, jobs] = await Promise.all([
    client.from('site_content').select('data,draft').eq('id', 'main').maybeSingle(),
    client.from('opportunities').select('*').order('updated_at', { ascending: false }),
    client.from('import_sources').select('*'),
    client
      .from('import_candidates')
      .select('data')
      .eq('status', 'pending')
      .order('fetched_at', { ascending: false }),
    client.from('opportunity_monitors').select('*').order('id'),
    client
      .from('opportunity_discoveries')
      .select('id', { count: 'exact', head: true })
      .eq('review_status', 'pending'),
    client.from('opportunity_jobs').select('kind,status,available_at'),
  ])
  const failures = [site, rows, feeds, proposals, monitoring, discoveries, jobs].filter(
    ({ error }) => error,
  )
  if (failures.length)
    throw createError({ statusCode: 503, statusMessage: 'Could not load all editor data.' })

  const queueMap = new Map<
    string,
    {
      kind: string
      queued: number
      running: number
      failed: number
      oldest_queued_at: string | null
    }
  >()
  for (const job of jobs.data || []) {
    const queue = queueMap.get(job.kind) || {
      kind: job.kind,
      queued: 0,
      running: 0,
      failed: 0,
      oldest_queued_at: null,
    }
    if (job.status === 'queued') {
      queue.queued++
      if (!queue.oldest_queued_at || job.available_at < queue.oldest_queued_at)
        queue.oldest_queued_at = job.available_at
    } else if (job.status === 'running') queue.running++
    else if (job.status === 'failed') queue.failed++
    queueMap.set(job.kind, queue)
  }

  return {
    site: site.data,
    opportunities: rows.data || [],
    sources: feeds.data || [],
    candidates: proposals.data || [],
    monitors: monitoring.data || [],
    discoveryCount: discoveries.count || 0,
    queueHealth: [...queueMap.values()],
  }
})
