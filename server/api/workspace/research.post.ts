import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import { workspaceStorage, workspaceResult, workspaceBody } from '../../utils/workspace-storage'

const schema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.enum(['run', 'pause', 'resume']),
      targetId: z.string().uuid().optional(),
      sourceId: z.string().max(100).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('settings'),
      settings: z.object({
        weekly_limit: z.number().int().min(1).max(100),
        batch_limit: z.number().int().min(1).max(15),
        queue_limit: z.number().int().min(1).max(250),
        concurrency: z.number().int().min(1).max(2),
        ai_enabled: z.boolean(),
        terms_confirmed: z.boolean(),
      }),
    })
    .strict(),
  z
    .object({
      action: z.literal('source'),
      sourceId: z.string().max(100),
      enabled: z.boolean(),
      aiExcerpt: z.string().trim().max(12000),
      aiReviewed: z.boolean(),
    })
    .strict(),
])
export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const input = await workspaceBody(event, schema)
  const db = workspaceStorage(event)
  const settings = workspaceResult(
    await db.from('outreach_settings').select('*').eq('id', true).single(),
  )
  if (input.action !== 'run' && member.role !== 'admin')
    throw createError({
      statusCode: 403,
      statusMessage: 'Only workspace administrators can change research controls.',
    })
  if (input.action === 'pause' || input.action === 'resume') {
    workspaceResult(
      await db
        .from('outreach_settings')
        .update({ paused: input.action === 'pause' })
        .eq('id', true)
        .select()
        .single(),
    )
  } else if (input.action === 'settings') {
    if (input.settings.ai_enabled && !input.settings.terms_confirmed)
      throw createError({
        statusCode: 422,
        statusMessage: 'Confirm permitted adult-only API use before enabling optional analysis.',
      })
    workspaceResult(
      await db.from('outreach_settings').update(input.settings).eq('id', true).select().single(),
    )
  } else if (input.action === 'source') {
    if (
      input.aiReviewed &&
      (input.aiExcerpt.length < 40 ||
        /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{3}[- .]\d{3}[- .]\d{4}\b|student\s*id|parent\s*(name|email)/i.test(
          input.aiExcerpt,
        ))
    )
      throw createError({
        statusCode: 422,
        statusMessage:
          'Remove personal information and review a substantive research-only excerpt.',
      })
    workspaceResult(
      await db
        .from('outreach_sources')
        .update({
          enabled: input.enabled,
          ai_excerpt: input.aiExcerpt,
          ai_reviewed: input.aiReviewed,
        })
        .eq('id', input.sourceId)
        .select()
        .single(),
    )
  } else {
    if (settings.paused)
      throw createError({
        statusCode: 409,
        statusMessage: 'Research is paused. An administrator must resume it first.',
      })
    const key = new Date().toISOString().slice(0, 10)
    let sourceId = input.sourceId || null
    if (input.targetId) {
      const target = workspaceResult(
        await db
          .from('outreach_targets')
          .select('canonical_url,status')
          .eq('id', input.targetId)
          .single(),
      )
      if (['rejected', 'deferred', 'contacted'].includes(target.status))
        throw createError({
          statusCode: 409,
          statusMessage: 'This target is not in the active research queue.',
        })
      const host = new URL(target.canonical_url).hostname
      const sources = workspaceResult(
        await db.from('outreach_sources').select('id,allowed_hosts').eq('enabled', true),
      )
      const exact = workspaceResult(
        await db
          .from('outreach_sources')
          .select('id')
          .eq('enabled', true)
          .eq('url', target.canonical_url)
          .maybeSingle(),
      )
      sourceId =
        exact?.id || sources.find((source) => source.allowed_hosts.includes(host))?.id || null
    } else if (!sourceId) {
      const sources = workspaceResult(
        await db
          .from('outreach_sources')
          .select('id')
          .eq('enabled', true)
          .eq('kind', 'directory')
          .order('id'),
      )
      sourceId = sources.length
        ? sources[Math.floor(Date.now() / 86400000) % sources.length]!.id
        : null
    }
    if (!sourceId)
      throw createError({
        statusCode: 422,
        statusMessage: 'No enabled reviewed source matches this request.',
      })
    const source = workspaceResult(
      await db
        .from('outreach_sources')
        .select('id')
        .eq('id', sourceId)
        .eq('enabled', true)
        .single(),
    )
    workspaceResult(
      await db
        .from('outreach_jobs')
        .upsert(
          {
            work_key: `${input.targetId ? 'research' : 'discovery'}:${input.targetId || source.id}:${key}`,
            kind: input.targetId ? 'research' : 'discover',
            target_id: input.targetId || null,
            source_id: source.id,
            status: 'queued',
          },
          { onConflict: 'work_key', ignoreDuplicates: true },
        )
        .select('id'),
    )
  }
  workspaceResult(
    await db
      .from('outreach_logs')
      .insert({
        actor_id: member.userId,
        action: `research_${input.action}`,
        details: { manual: true },
      })
      .select('id'),
  )
  return { ok: true, queued: input.action === 'run' }
})
