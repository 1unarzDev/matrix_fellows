/**
 * The bounded maintenance workflow for officer supplied society memory.
 *
 * Source material is treated as untrusted input. The workflow extracts
 * reviewable context locally, keeps dates and identities separate, and never
 * turns a mention into a verified relationship or capability.
 */
export const SOCIETY_CONTEXT_WORKFLOW = {
  version: 'society-context-v1',
  stages: ['extract', 'resolve', 'project'] as const,
  instructions: [
    'Preserve the source and its date before deriving context.',
    'Resolve people, organizations, chapters, and project links separately.',
    'Treat introductions and possible connections as reviewable context, not commitments.',
    'Keep chapter or individual attribution alongside the society-wide record.',
    'Use accepted context to guide discovery and drafting without inventing access, need, or availability.',
  ] as const,
} as const

export interface SocietyContextSourceInput {
  content_text?: string | null
  source_date?: string | null
  relationship_hint?: string | null
  title?: string | null
  chapter?: string | null
  kind?: string | null
  file_name?: string | null
  mime_type?: string | null
  byte_size?: number | null
}

export interface ExtractedSocietyContextEntry {
  kind: 'connection' | 'note'
  title: string
  summary: string
  organization: string | null
  personName: string | null
  chapter: string | null
  connectionDate: string | null
  projectUrl: string | null
  status: 'possible' | 'introduced'
  confidence: 'unreviewed'
  metadata: Record<string, unknown>
}

/** Extract bounded, reviewable society context without sending private text to a model. */
export function extractSocietyContext(
  source: SocietyContextSourceInput,
): ExtractedSocietyContextEntry[] {
  const text = String(source.content_text || '').slice(0, 8_000_000)
  const urls = [...new Set(text.match(/https:\/\/[^\s)>]+/gi) || [])].slice(0, 8)
  const emailMatches = [...new Set(text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [])]
  const rawOrganization = (
    text.match(
      /\b(UTA|UT Arlington|University of Texas at Arlington|Stanford(?: University)?|UTD|UT Dallas|UT Southwestern|SMU|TCU|UNT)\b/i,
    )?.[0] || source.relationship_hint || ''
  ).trim() || null
  const organization = rawOrganization
    ? ({ uta: 'UTA', utd: 'UTD', unt: 'UNT', smu: 'SMU', tcu: 'TCU' }[rawOrganization.toLowerCase()] || rawOrganization)
    : null
  const personName = text.match(/(?:^|\n)\s*(?:from|to|cc):\s*([^<\n]+?)(?:\s*<[^>]+>)?\s*$/im)?.[1]?.trim() || null
  const date =
    source.source_date || text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] || null
  const projectUrl = urls.find((url) => /github\.com|doi\.org|project|lab|research/i.test(url)) || null
  const status = /\b(introduc|connected|meet|happy to connect|thank you for reaching out)\b/i.test(text)
    ? 'introduced'
    : 'possible'
  const title = String(source.title || 'Society context').slice(0, 240)
  const summaryParts = [
    organization ? `Organization: ${organization}.` : '',
    personName ? `Contact: ${personName}.` : '',
    emailMatches.length
      ? `${emailMatches.length} contact address${emailMatches.length === 1 ? '' : 'es'} detected; recipient identity remains officer-reviewed.`
      : '',
    projectUrl ? `Project link: ${projectUrl}` : '',
  ].filter(Boolean)
  return [
    {
      kind: organization ? 'connection' : 'note',
      title,
      summary:
        summaryParts.join(' ') ||
        text.replace(/\s+/g, ' ').trim().slice(0, 900) ||
        `Uploaded ${source.file_name || 'source file'} is ready for a richer agent pass.`,
      organization,
      personName,
      chapter: source.chapter || null,
      connectionDate: date,
      projectUrl,
      status,
      confidence: 'unreviewed',
      metadata: {
        processor: SOCIETY_CONTEXT_WORKFLOW.version,
        sourceKind: source.kind,
        urlCount: urls.length,
        contactCount: emailMatches.length,
        relationshipHint: source.relationship_hint || null,
        fileName: source.file_name || null,
        mimeType: source.mime_type || null,
        byteSize: source.byte_size || null,
        workflowInstructions: [...SOCIETY_CONTEXT_WORKFLOW.instructions],
      },
    },
  ]
}
