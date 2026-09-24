import { z } from 'zod'
import { contentSchema, opportunitySchema, sourceSchema } from '#shared/utils/validation'
import {
  assertMeetingOrigin,
  assertMeetingSession,
  meetingStorage,
} from '../../utils/meeting-admin'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('content'), draft: contentSchema, publish: z.boolean() }),
  z.object({ action: z.literal('listing'), item: opportunitySchema, existing: z.boolean() }),
  z.object({ action: z.literal('source'), source: sourceSchema }),
  z.object({ action: z.literal('monitor'), id: z.string().min(1).max(160), enabled: z.boolean() }),
  z.object({
    action: z.literal('candidate'),
    id: z.string().min(1).max(180),
    expectedHash: z.string().min(1).max(256),
    approve: z.boolean(),
  }),
  z.object({ action: z.literal('responses'), page: z.number().int().min(0).max(10000) }),
  z.object({ action: z.literal('delete-response'), id: z.number().int().positive() }),
])

const fail = (message = 'The editor could not save that change.') =>
  createError({ statusCode: 503, statusMessage: message })

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertMeetingOrigin(event)
  await assertMeetingSession(event)
  const parsed = actionSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: 'The editor request is not valid.' })
  const client = meetingStorage(event)
  const body = parsed.data

  if (body.action === 'content') {
    const { error } = body.publish
      ? await client
          .from('site_content')
          .upsert({ id: 'main', data: body.draft, draft: body.draft, published: true })
      : await client.from('site_content').update({ draft: body.draft }).eq('id', 'main')
    if (error) throw fail()
    return { ok: true }
  }

  if (body.action === 'listing') {
    const item = body.item
    if (!body.existing) {
      const { error } = await client.from('opportunities').insert({
        id: item.id,
        source_id: item.sourceId,
        external_id: item.externalId,
        canonical_url: item.url,
        data: item,
        published: item.published,
        suppressed: !item.published,
      })
      if (error) throw fail(error.message)
      return { ok: true }
    }
    const { data: stored, error: readError } = await client
      .from('opportunities')
      .select('data,overrides')
      .eq('id', item.id)
      .maybeSingle()
    if (readError || !stored)
      throw createError({ statusCode: 404, statusMessage: 'Listing not found.' })
    const effective = { ...stored.data, ...stored.overrides }
    const changes: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(item)) {
      if (
        !['id', 'sourceId', 'externalId', 'published'].includes(key) &&
        JSON.stringify(value) !== JSON.stringify(effective[key])
      )
        changes[key] = value
    }
    const { error } = await client
      .from('opportunities')
      .update({
        overrides: { ...(stored.overrides || {}), ...changes },
        published: item.published,
        suppressed: !item.published,
      })
      .eq('id', item.id)
    if (error) throw fail(error.message)
    return { ok: true }
  }

  if (body.action === 'source') {
    const { error } = await client.from('import_sources').upsert(body.source)
    if (error) throw fail(error.message)
    return { ok: true }
  }

  if (body.action === 'monitor') {
    const { error } = await client
      .from('opportunity_monitors')
      .update({ enabled: body.enabled })
      .eq('id', body.id)
    if (error) throw fail(error.message)
    return { ok: true }
  }

  if (body.action === 'candidate') {
    const { data: candidate, error: readError } = await client
      .from('import_candidates')
      .select('source_id,data,status')
      .eq('id', body.id)
      .maybeSingle()
    if (readError || !candidate || candidate.status !== 'pending')
      throw createError({ statusCode: 409, statusMessage: 'Candidate no longer pending.' })
    if (candidate.data?.provenance?.contentHash !== body.expectedHash)
      throw createError({ statusCode: 409, statusMessage: 'Source changed; reload before review.' })
    if (body.approve) {
      const { data: source } = await client
        .from('import_sources')
        .select('enabled')
        .eq('id', candidate.source_id)
        .maybeSingle()
      if (!source?.enabled)
        throw createError({ statusCode: 409, statusMessage: 'Source is disabled.' })
      const { data: duplicate } = await client
        .from('opportunities')
        .select('id')
        .eq('canonical_url', candidate.data.url)
        .neq('id', body.id)
        .maybeSingle()
      if (duplicate)
        throw createError({ statusCode: 409, statusMessage: 'URL belongs to another listing.' })
      const { error } = await client.rpc('apply_import', { items: [candidate.data] })
      if (error) throw fail(error.message)
    }
    const { error } = await client
      .from('import_candidates')
      .update({
        status: body.approve ? 'approved' : 'dismissed',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', body.id)
    if (error) throw fail(error.message)
    return { ok: true }
  }

  if (body.action === 'responses') {
    const from = body.page * 20
    const [metrics, rows] = await Promise.all([
      client.from('join_responses').select('created_at,grade,interests,goals,stage'),
      client
        .from('join_responses')
        .select(
          'id,created_at,name,email,student_id,grade,interests,interest_other,goals,stage,note,parent_name,parent_email,parent_permission_confirmed',
        )
        .order('id', { ascending: false })
        .range(from, from + 19),
    ])
    if (metrics.error || rows.error) throw fail('Could not load membership responses.')
    const all = metrics.data || []
    const count = (values: string[]) =>
      [
        ...values.reduce(
          (map, value) => map.set(value, (map.get(value) || 0) + 1),
          new Map<string, number>(),
        ),
      ]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    return {
      analytics: {
        total: all.length,
        recent: all.filter(
          (row) => Date.parse(row.created_at) > Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).length,
        interests: count(all.flatMap((row) => row.interests || [])),
        stages: count(all.map((row) => row.stage)),
        goals: count(all.flatMap((row) => row.goals || [])),
        grades: count(all.map((row) => row.grade)),
      },
      responses: rows.data || [],
    }
  }

  const { error } = await client.from('join_responses').delete().eq('id', body.id)
  if (error) throw fail('Could not delete this response.')
  return { ok: true }
})
