import { z } from 'zod'
import type { OutreachAssessment, OutreachProposal } from '../types/outreach'

const cleanText = (max: number) => z.string().trim().max(max)
export const outreachUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => new URL(value).protocol === 'https:', 'Use an HTTPS source.')
export const outreachProfileSchema = z
  .object({
    fullName: cleanText(120).min(2),
    interests: z.array(cleanText(100)).max(20),
    skills: z.array(cleanText(100)).max(20),
    affiliations: z.array(cleanText(200)).max(15).default([]),
    achievements: z
      .array(z.object({ title: cleanText(200), description: cleanText(800), url: outreachUrl }))
      .max(15)
      .default([]),
    introduction: cleanText(600).default(''),
    signature: cleanText(500).default(''),
    availability: cleanText(300),
    location: cleanText(150),
    workSamples: z
      .array(z.object({ title: cleanText(160), url: outreachUrl, contribution: cleanText(800) }))
      .max(10),
    goals: cleanText(2000),
    consentToShare: z.boolean().default(false),
  })
  .strict()
export const outreachSocietySchema = z
  .object({
    name: cleanText(150).min(2),
    description: cleanText(3000),
    capabilities: z.array(cleanText(200)).max(20),
    accomplishments: z
      .array(
        z
          .object({
            title: cleanText(200),
            description: cleanText(1200),
            url: outreachUrl.optional(),
            verified: z.boolean().default(false),
          })
          .refine(
            (item) => !item.verified || Boolean(item.url),
            'Verified accomplishments need an evidence URL.',
          ),
      )
      .max(20),
    sponsor: cleanText(300),
  })
  .strict()
export const outreachEvidenceSchema = z.object({
  url: outreachUrl,
  claim: cleanText(2000).min(1),
  quote: cleanText(3000).optional(),
  retrievedAt: z.string().datetime(),
  confidence: z.enum(['verified', 'inferred', 'unknown']),
})
export const outreachAssessmentSchema = z
  .object({
    fit: z.number().min(0).max(30),
    openness: z.number().min(0).max(25),
    contribution: z.number().min(0).max(20),
    feasibility: z.number().min(0).max(15),
    evidence: z.number().min(0).max(10),
    confidence: z.enum(['high', 'medium', 'low']),
    rationale: cleanText(3000),
    blockers: z.array(cleanText(500)).max(20),
  })
  .partial()
export const outreachTargetSchema = z
  .object({
    name: cleanText(180).min(2),
    kind: z.enum(['pi', 'lab', 'postdoc', 'phd', 'program', 'student']),
    organization: cleanText(200),
    disciplines: z.array(cleanText(100)).max(20),
    canonicalUrl: outreachUrl,
    contactEmail: z.string().email().max(254).nullable().default(null),
    location: cleanText(200),
    mode: z.enum(['remote', 'in_person', 'hybrid', 'unknown']),
    status: z
      .enum(['needs_review', 'ready', 'deferred', 'rejected', 'contacted'])
      .default('needs_review'),
    scope: z.enum(['society', 'student', 'both']),
    description: cleanText(3000),
    notes: cleanText(4000).default(''),
    deferUntil: z.string().datetime().nullable().default(null),
    rejectionReason: cleanText(2000).default(''),
    dossier: z
      .object({
        evidence: z.array(outreachEvidenceSchema).max(40),
        research: cleanText(6000).optional(),
        opportunities: cleanText(4000).optional(),
        eligibility: cleanText(3000).optional(),
        proposalAngles: z.array(cleanText(1000)).max(10).optional(),
        labUrl: outreachUrl.optional(),
      })
      .default({ evidence: [] }),
    assessment: outreachAssessmentSchema.default({}),
  })
  .strict()
export const outreachProposalSchema = z
  .object({
    targetId: z.string().uuid(),
    profileId: z.string().uuid().nullable().default(null),
    kind: z.enum(['society', 'student']),
    recipient: z.string().email().max(254),
    subject: cleanText(180)
      .min(3)
      .refine((value) => !/[\r\n]/.test(value), 'Subject must be a single line.'),
    body: cleanText(12000).min(10),
    mailboxId: z.string().uuid().nullable().default(null),
  })
  .strict()
export function outreachPriority(assessment: Partial<OutreachAssessment>): number | null {
  const fields = ['fit', 'openness', 'contribution', 'feasibility', 'evidence'] as const
  if (fields.some((key) => typeof assessment[key] !== 'number')) return null
  return fields.reduce((total, key) => total + (assessment[key] ?? 0), 0)
}
export function canonicalizeOutreachUrl(value: string): string {
  const url = new URL(value)
  url.hash = ''
  for (const key of [...url.searchParams.keys()])
    if (key.startsWith('utm_') || ['fbclid', 'gclid'].includes(key)) url.searchParams.delete(key)
  url.hostname = url.hostname.toLowerCase()
  return url.toString()
}
export function proposalApprovalValid(proposal: OutreachProposal): boolean {
  return (
    proposal.status === 'approved' &&
    proposal.approvedRevision === proposal.revision &&
    Boolean(proposal.approvedFingerprint)
  )
}
export const outreachPlannerSchema = z
  .object({
    title: cleanText(180).min(2),
    targetId: z.string().uuid().nullable().default(null),
    profileId: z.string().uuid().nullable().default(null),
    opportunityId: z
      .string()
      .regex(/^[a-z0-9-]{1,160}$/)
      .nullable()
      .default(null),
    dueAt: z.string().datetime().nullable().default(null),
    notes: cleanText(4000).default(''),
    completed: z.boolean().default(false),
  })
  .strict()
