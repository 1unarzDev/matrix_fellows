/** Append-only source material and derived context for the society memory cloud. */
export type SocietySourceKind = 'text' | 'file'
export type SocietySourceStatus = 'queued' | 'processing' | 'processed' | 'failed'
export type SocietyContextKind =
  | 'connection'
  | 'person'
  | 'lab'
  | 'institution'
  | 'project'
  | 'opportunity'
  | 'chapter'
  | 'milestone'
  | 'note'

export interface SocietyContextSource {
  id: string
  title: string
  kind: SocietySourceKind
  fileName: string | null
  mimeType: string | null
  byteSize: number | null
  excerpt: string
  sourceDate: string | null
  chapter: string | null
  submittedBy: string | null
  status: SocietySourceStatus
  error: string | null
  createdAt: string
  processedAt: string | null
}

export interface SocietyContextEntry {
  id: string
  sourceId: string | null
  kind: SocietyContextKind
  title: string
  summary: string
  organization: string | null
  personName: string | null
  chapter: string | null
  connectionDate: string | null
  projectUrl: string | null
  status: 'possible' | 'introduced' | 'connected' | 'active' | 'closed'
  confidence: 'unreviewed' | 'low' | 'medium' | 'high'
  sourceCount: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface SocietyContextResponse {
  sources: SocietyContextSource[]
  entries: SocietyContextEntry[]
  pendingCount: number
}
