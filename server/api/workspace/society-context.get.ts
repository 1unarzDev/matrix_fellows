import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import { workspaceResult, workspaceStorage } from '../../utils/workspace-storage'
import type { SocietyContextResponse } from '#shared/types/society-context'

export default defineEventHandler(async (event): Promise<SocietyContextResponse> => {
  await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  const [sources, entries, pending] = await Promise.all([
    db
      .from('outreach_society_sources')
      .select(
        'id,title,kind,file_name,mime_type,byte_size,content_text,source_date,chapter,submitted_by,processing_status,processing_error,created_at,processed_at',
      )
      .eq('society_id', true)
      .order('created_at', { ascending: false })
      .limit(100),
    db
      .from('outreach_society_context_entries')
      .select('*')
      .eq('society_id', true)
      .order('connection_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('outreach_society_sources')
      .select('id', { count: 'exact', head: true })
      .eq('society_id', true)
      .in('processing_status', ['queued', 'processing']),
  ])

  const sourceRows = workspaceResult(sources)
  const entryRows = workspaceResult(entries)
  return {
    sources: sourceRows.map((row: any) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      fileName: row.file_name || null,
      mimeType: row.mime_type || null,
      byteSize: row.byte_size || null,
      excerpt: String(row.content_text || '').replace(/\s+/g, ' ').trim().slice(0, 280),
      sourceDate: row.source_date || null,
      chapter: row.chapter || null,
      submittedBy: row.submitted_by || null,
      status: row.processing_status,
      error: row.processing_error || null,
      createdAt: row.created_at,
      processedAt: row.processed_at || null,
    })),
    entries: entryRows.map((row: any) => ({
      id: row.id,
      sourceId: row.source_id || null,
      kind: row.kind,
      title: row.title,
      summary: row.summary || '',
      organization: row.organization || null,
      personName: row.person_name || null,
      chapter: row.chapter || null,
      connectionDate: row.connection_date || null,
      projectUrl: row.project_url || null,
      status: row.status,
      confidence: row.confidence,
      sourceCount: row.source_id ? 1 : 0,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    pendingCount: pending.count || 0,
  }
})
