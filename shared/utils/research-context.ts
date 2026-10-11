import { z } from 'zod'

export type ResearchProviderMode = 'unpaid_public' | 'authorized_context'
export const technicalContextSchema = z
  .object({
    schemaVersion: z.literal('technical-context-v1'),
    snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    excerpt: z.string().min(40).max(12000),
  })
  .strict()
/** Explicit allowlist: never spreads a profile, join answer or editor buffer. */
export function compileTechnicalContext(input: {
  snapshotHash: string
  snapshotText: string
  reviewedHash: string
  reviewedExcerpt: string
  reviewed: boolean
}) {
  if (!input.reviewed || input.reviewedHash !== input.snapshotHash)
    throw new Error('Source review is required for the current snapshot')
  if (!input.snapshotText.includes(input.reviewedExcerpt))
    throw new Error('Reviewed excerpt is absent from the source snapshot')
  return technicalContextSchema.parse({
    schemaVersion: 'technical-context-v1',
    snapshotHash: input.snapshotHash,
    excerpt: input.reviewedExcerpt,
  })
}
export const authorizedContextSchema = z
  .object({
    schemaVersion: z.literal('authorized-context-v1'),
    technical: technicalContextSchema,
    member: z
      .object({
        interests: z.array(z.string().max(160)).max(12),
        contributions: z
          .array(z.object({ claimId: z.string(), statement: z.string().max(600) }).strict())
          .max(8),
      })
      .strict(),
  })
  .strict()
/** Paid activation is explicit deployment configuration, never an automatic fallback. */
export function compileAuthorizedContext(mode: ResearchProviderMode, input: unknown) {
  if (mode !== 'authorized_context')
    throw new Error('Private context is unavailable in unpaid mode')
  return authorizedContextSchema.parse(input)
}
