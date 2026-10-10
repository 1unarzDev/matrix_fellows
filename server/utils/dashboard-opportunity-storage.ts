import type {
  OpportunityDecision,
  OpportunityReference,
} from '#shared/types/dashboard-opportunities'
import type { OpportunityCapturePreview, PersonalOpportunity } from '#shared/types/dashboard-opportunities'
import type { H3Event } from 'h3'
import { workspaceStorage, workspaceResult } from './workspace-storage'
import { capturePreview, classifyOpportunityCapture, normalizeCaptureUrl } from '#shared/utils/dashboard-opportunities'
import { opportunitySchema } from '#shared/utils/validation'
export function decisionFromRow(r: any): OpportunityDecision {
  return {
    opportunityId: r.opportunity_id,
    decision: r.decision,
    reason: r.reason,
    version: r.version,
    updatedAt: r.updated_at,
  }
}
export function referenceFromRow(r: any): OpportunityReference {
  return {
    id: r.id,
    url: r.url,
    title: r.title,
    verification: r.verification,
    createdAt: r.created_at,
  }
}

function captureCandidate(url: string, result: ReturnType<typeof classifyOpportunityCapture>, hash: string) {
  const now = new Date().toISOString()
  return opportunitySchema.parse({
    id: `personal:${hash.slice(0, 24)}`,
    sourceId: 'member-capture',
    externalId: hash.slice(0, 24),
    title: result.title,
    kind: result.kind,
    discipline: result.discipline,
    description: result.description,
    eventDate: result.eventDate,
    deadline: result.deadline,
    timezone: null,
    location: 'See official source',
    eligibility: result.eligibility,
    url,
    verifiedAt: now,
    priority: result.disposition === 'shared-review' ? 65 : 45,
    published: true,
    lifecycle: 'unknown',
    highSchoolPolicy: 'not-stated',
    provenance: { url, contentHash: hash, parserVersion: 'capture-triage-v1' },
  })
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function readCaptureSource(url: string) {
  let current = url
  for (let hop = 0; hop < 3; hop++) {
    const response = await fetch(current, {
      redirect: 'manual',
      headers: { accept: 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5' },
      signal: AbortSignal.timeout(6000),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error('The source redirected without a destination.')
      current = normalizeCaptureUrl(new URL(location, current).href)
      continue
    }
    if (!response.ok) throw new Error(`The source returned HTTP ${response.status}.`)
    const contentType = response.headers.get('content-type') || ''
    if (contentType && !/(?:text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType))
      throw new Error('This link does not contain a readable opportunity page.')
    let body = ''
    if (response.body) {
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let total = 0
      try {
        while (true) {
          const part = await reader.read()
          if (part.done) break
          total += part.value.byteLength
          if (total > 240_000) {
            await reader.cancel()
            throw new Error('The source page is too large to inspect safely.')
          }
          chunks.push(part.value)
        }
      } finally {
        reader.releaseLock()
      }
      const bytes = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
      }
      body = new TextDecoder().decode(bytes)
    } else body = await response.text()
    const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    const text = body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim()
    return { title: title?.replace(/<[^>]+>/g, '').trim().slice(0, 240), text, retrievedAt: new Date().toISOString(), contentType }
  }
  throw new Error('The source redirected too many times.')
}

export async function previewCapturedOpportunity(event: H3Event, rawUrl: string): Promise<OpportunityCapturePreview> {
  const url = normalizeCaptureUrl(rawUrl)
  const variants = [url]
  if (!new URL(url).search) variants.push(url.endsWith('/') ? url.slice(0, -1) : url + '/')
  const rows = workspaceResult(
    await workspaceStorage(event)
      .from('opportunities')
      .select('id,canonical_url,data,overrides,updated_at')
      .in('canonical_url', variants)
      .eq('published', true)
      .eq('suppressed', false)
      .limit(2),
  )
  const row = rows[0]
  if (row) {
    const parsed = opportunitySchema.safeParse({ ...row.data, ...row.overrides, id: row.id, published: true })
    if (parsed.success) return capturePreview(url, parsed.data, row.updated_at || null)
  }
  try {
    const source = await readCaptureSource(url)
    const hash = await sha256Hex(source.text)
    const triage = classifyOpportunityCapture({ url, title: source.title, text: source.text })
    const candidate = triage.disposition === 'rejected' ? null : captureCandidate(url, triage, hash)
    return {
      url,
      title: triage.title,
      kind: triage.disposition === 'shared-review' ? 'shared-review' : triage.disposition,
      item: triage.disposition === 'personal' ? candidate : null,
      candidate,
      disposition: triage.disposition,
      reason: triage.reason,
      confidence: triage.confidence,
      source: { url, retrievedAt: source.retrievedAt, label: 'Bounded source review' },
      notice:
        triage.disposition === 'shared-review'
          ? 'This candidate will enter the unpublished discovery queue for officer review.'
          : triage.disposition === 'personal'
            ? 'This is available to you privately. Saving it does not publish it to the society catalog.'
            : 'Nothing was saved. This link does not appear to be an actionable opportunity.',
    }
  } catch (error) {
    return {
      url,
      title: new URL(url).hostname,
      kind: 'rejected',
      item: null,
      candidate: null,
      disposition: 'rejected',
      reason: error instanceof Error ? error.message : 'The source could not be inspected safely.',
      confidence: null,
      source: { url, retrievedAt: null, label: 'Source review unavailable' },
      notice: 'Nothing was saved. Try an official opportunity page with readable public details.',
    }
  }
}

export async function captureOpportunity(event: H3Event, userId: string, rawUrl: string) {
  let preview = await previewCapturedOpportunity(event, rawUrl)
  if (preview.disposition === 'catalog') return preview
  if (preview.candidate && preview.disposition === 'personal') {
    const candidate = { ...preview.candidate, id: `personal:${userId}:${preview.candidate.externalId}` }
    preview = { ...preview, candidate, item: candidate }
  }
  const db = workspaceStorage(event)
  const intake = workspaceResult(
    await db.from('dashboard_opportunity_intakes').upsert(
      {
        user_id: userId,
        url: preview.url,
        disposition: preview.disposition,
        title: preview.title,
        reason: preview.reason,
        confidence: preview.confidence,
        source: preview.source,
        candidate: preview.candidate,
      },
      { onConflict: 'user_id,url' },
    ).select().single(),
  )
  if (preview.disposition === 'personal' && preview.candidate) {
    workspaceResult(await db.from('dashboard_personal_opportunities').upsert({
      id: preview.candidate.id,
      intake_id: intake.id,
      user_id: userId,
      url: preview.url,
      data: preview.candidate,
    }, { onConflict: 'user_id,url' }))
  }
  if (preview.disposition === 'shared-review' && preview.candidate) {
    // The unpublished discovery row is visible only to editors and is picked
    // up by the existing review/import path. It never self-publishes.
    const sourceId = 'member-submitted'
    workspaceResult(await db.from('opportunity_source_registry').upsert({
      id: sourceId,
      name: 'Member-submitted opportunity links',
      authoritative_hub: preview.url,
      permitted_host: new URL(preview.url).hostname,
      permitted_path_prefix: new URL(preview.url).pathname || '/',
      source_type: 'official-html',
      discovery_method: 'authenticated-member-capture',
      parser_version: 'capture-triage-v1',
      scope: 'single submitted source; officer review required',
      publication_policy: 'review-required',
      enabled: true,
      reviewed_at: new Date().toISOString(),
    }, { onConflict: 'id' }))
    workspaceResult(await db.from('opportunity_discoveries').upsert({
      id: `member-${intake.id}`,
      source_registry_id: sourceId,
      source_object_id: intake.id,
      canonical_hint: preview.url,
      data: { ...preview.candidate, published: false },
      evidence: [{ field: 'submitted_source', url: preview.url, quote: preview.candidate.description.slice(0, 1000), observedAt: preview.source.retrievedAt }],
      review_status: 'pending',
    }, { onConflict: 'source_registry_id,source_object_id' }))
  }
  return preview
}

export function personalOpportunityFromRow(row: any): PersonalOpportunity {
  const parsed = opportunitySchema.parse({ ...row.data, id: row.id, published: true })
  return { ...parsed, intakeId: row.intake_id, triageReason: row.intake_reason || '', triageConfidence: Number(row.intake_confidence || 0) }
}
