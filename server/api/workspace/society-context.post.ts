import { createError, readMultipartFormData } from 'h3'
import { z } from 'zod'
import { requireWorkspaceOfficer, assertWorkspaceOrigin } from '../../utils/workspace-auth'
import { workspaceResult, workspaceStorage } from '../../utils/workspace-storage'

const MAX_FILE_BYTES = 6 * 1024 * 1024
const jsonSchema = z
  .object({
    action: z.enum(['submit', 'retry']).default('submit'),
    sourceId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(8000000).optional(),
    sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    sourceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    chapter: z.string().trim().max(160).nullable().optional(),
    relationshipHint: z.string().trim().max(500).nullable().optional(),
  })
  .strict()

function bytesToBase64(bytes: Uint8Array) {
  let output = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk)
    output += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunk, bytes.length)))
  return btoa(output)
}

function textFromBytes(bytes: Uint8Array, mimeType: string) {
  if (
    !/^text\//i.test(mimeType) &&
    !/(json|xml|csv|markdown|javascript|typescript|yaml|toml|html)/i.test(mimeType)
  )
    return ''
  try {
    return new TextDecoder().decode(bytes).slice(0, 8000000)
  } catch {
    return ''
  }
}

export default defineEventHandler(async (event) => {
  assertWorkspaceOrigin(event)
  const member = await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  const contentType = getHeader(event, 'content-type') || ''
  let action = 'submit'
  let sourceId: string | undefined
  let title = ''
  let content = ''
  let sourceDate: string | null = null
  let sourceEndDate: string | null = null
  let chapter: string | null = null
  let relationshipHint: string | null = null
  let file: { data: Uint8Array; filename?: string; type?: string } | null = null

  if (contentType.toLowerCase().includes('multipart/form-data')) {
    const parts = (await readMultipartFormData(event)) || []
    for (const part of parts) {
      const value = part.name === 'file' ? '' : part.data ? new TextDecoder().decode(part.data) : ''
      if (part.name === 'action') action = value || 'submit'
      else if (part.name === 'sourceId') sourceId = value
      else if (part.name === 'title') title = value
      else if (part.name === 'content') content = value
      else if (part.name === 'sourceDate') sourceDate = value || null
      else if (part.name === 'sourceEndDate') sourceEndDate = value || null
      else if (part.name === 'chapter') chapter = value || null
      else if (part.name === 'relationshipHint') relationshipHint = value || null
      else if (part.name === 'file' && part.data?.length) file = { data: part.data, filename: part.filename, type: part.type }
    }
  } else {
    const parsed = jsonSchema.safeParse(await readBody(event))
    if (!parsed.success)
      throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Check the submitted source.' })
    action = parsed.data.action
    sourceId = parsed.data.sourceId
    title = parsed.data.title || ''
    content = parsed.data.content || ''
    sourceDate = parsed.data.sourceDate || null
    sourceEndDate = parsed.data.sourceEndDate || null
    chapter = parsed.data.chapter || null
    relationshipHint = parsed.data.relationshipHint || null
  }

  if (action === 'retry') {
    if (!sourceId) throw createError({ statusCode: 400, statusMessage: 'Choose a source to retry.' })
    workspaceResult(
      await db
        .from('outreach_society_sources')
        .update({ processing_status: 'queued', processing_error: null, processed_at: null })
        .eq('id', sourceId)
        .eq('society_id', true)
        .select('id')
        .single(),
    )
    workspaceResult(
      await db
        .from('outreach_society_context_jobs')
        .upsert({ source_id: sourceId, stage: 'extract', status: 'queued', attempts: 0, available_at: new Date().toISOString(), error: null }, { onConflict: 'source_id,stage' })
        .select('id'),
    )
    return { ok: true, queued: true, sourceId }
  }

  if (file) {
    if (file.data.length > MAX_FILE_BYTES)
      throw createError({ statusCode: 413, statusMessage: 'Keep source files under 6 MB.' })
    title = title || file.filename || 'Uploaded society source'
    content = textFromBytes(file.data, file.type || 'application/octet-stream')
  }
  if (sourceDate && sourceEndDate && sourceEndDate < sourceDate)
    throw createError({ statusCode: 400, statusMessage: 'The source period ends after it starts.' })
  title = title.trim().slice(0, 200)
  if (!title) throw createError({ statusCode: 400, statusMessage: 'Add a short title for this source.' })
  if (!file && !content.trim())
    throw createError({ statusCode: 400, statusMessage: 'Paste a note, email chain, or upload a file.' })

  const row = workspaceResult(
    await db
      .from('outreach_society_sources')
      .insert({
        submitted_by: member.userId,
        kind: file ? 'file' : 'text',
        title,
        content_text: content.slice(0, 8000000),
        content_base64: file ? bytesToBase64(file.data) : '',
        file_name: file?.filename || null,
        mime_type: file?.type || null,
        byte_size: file?.data.length || new TextEncoder().encode(content).length,
        source_date: sourceDate,
        source_end_date: sourceEndDate,
        chapter,
        relationship_hint: relationshipHint,
        processing_status: 'queued',
      })
      .select('id')
      .single(),
  )
  workspaceResult(
    await db
      .from('outreach_society_context_jobs')
      .insert({ source_id: row.id, stage: 'extract', status: 'queued' })
      .select('id')
      .single(),
  )
  return { ok: true, queued: true, sourceId: row.id }
})
