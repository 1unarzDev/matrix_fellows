import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { z } from 'zod'
import type {
  OutreachProfile,
  OutreachProposal,
  OutreachSociety,
  OutreachTarget,
} from '#shared/types/outreach'

export function workspaceStorage(event: H3Event) {
  setHeader(event, 'Cache-Control', 'no-store')
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey)
    throw createError({
      statusCode: 503,
      statusMessage: 'The officer workspace is not configured.',
    })
  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  })
}
export function workspaceResult<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Workspace update could not be completed. Please retry.',
    })
  return result.data as NonNullable<T>
}
export async function workspaceBody<T>(event: H3Event, schema: z.ZodType<T>): Promise<T> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success)
    throw createError({
      statusCode: 400,
      statusMessage: result.error.issues[0]?.message || 'Check the submitted fields.',
    })
  return result.data
}
export function workspaceId(event: H3Event): string {
  const id = getRouterParam(event, 'id') || ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    throw createError({ statusCode: 400, statusMessage: 'Invalid workspace record.' })
  return id
}
export function profileFromRow(row: any): OutreachProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    interests: row.interests,
    skills: row.skills,
    affiliations: row.affiliations || [],
    achievements: row.achievements || [],
    introduction: row.introduction || '',
    signature: row.signature || '',
    availability: row.availability,
    location: row.location,
    workSamples: row.work_samples,
    goals: row.goals,
    consentToShare: row.consent_to_share,
    updatedAt: row.updated_at,
  }
}
export function profileToRow(value: Omit<OutreachProfile, 'id' | 'updatedAt'>) {
  return {
    full_name: value.fullName,
    interests: value.interests,
    skills: value.skills,
    affiliations: value.affiliations || [],
    achievements: value.achievements || [],
    introduction: value.introduction || '',
    signature: value.signature || '',
    availability: value.availability,
    location: value.location,
    work_samples: value.workSamples,
    goals: value.goals,
    consent_to_share: value.consentToShare,
    updated_at: new Date().toISOString(),
  }
}
export function targetFromRow(row: any): OutreachTarget {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    organization: row.organization,
    disciplines: row.discipline,
    canonicalUrl: row.canonical_url,
    contactEmail: row.contact_email,
    location: row.location,
    mode: row.mode,
    status: row.status,
    scope: row.scope,
    description: row.description,
    notes: row.notes || '',
    deferUntil: row.defer_until,
    rejectionReason: row.rejection_reason || '',
    dossier: row.dossier,
    assessment: row.assessment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
export function targetToRow(value: Omit<OutreachTarget, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: value.name,
    kind: value.kind,
    organization: value.organization,
    discipline: value.disciplines,
    canonical_url: value.canonicalUrl,
    contact_email: value.contactEmail,
    location: value.location,
    mode: value.mode,
    status: value.status,
    scope: value.scope,
    description: value.description,
    notes: value.notes || '',
    defer_until: value.deferUntil || null,
    rejection_reason: value.rejectionReason || '',
    dossier: value.dossier,
    assessment: value.assessment,
  }
}
export function proposalFromRow(row: any): OutreachProposal {
  return {
    id: row.id,
    targetId: row.target_id,
    profileId: row.profile_id,
    kind: row.kind,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    mailboxId: row.mailbox_id,
    revision: row.revision,
    status: row.status,
    approvedRevision: row.approved_revision,
    approvedFingerprint: row.approved_fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
export function proposalToRow(
  value: Omit<
    OutreachProposal,
    | 'id'
    | 'revision'
    | 'status'
    | 'approvedRevision'
    | 'approvedFingerprint'
    | 'createdAt'
    | 'updatedAt'
  >,
) {
  return {
    target_id: value.targetId,
    profile_id: value.profileId,
    kind: value.kind,
    recipient: value.recipient,
    subject: value.subject,
    body: value.body,
    mailbox_id: value.mailboxId,
  }
}
export function societyFromRow(row: any): OutreachSociety {
  return {
    name: row.name,
    description: row.description,
    capabilities: row.capabilities,
    accomplishments: row.accomplishments,
    sponsor: row.sponsor,
    updatedAt: row.updated_at,
    revision: row.revision,
  }
}
