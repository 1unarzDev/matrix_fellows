import { z } from 'zod'

const resourceSchema = z.object({
  title: z.string().min(2),
  url: z.string().url(),
  note: z.string().min(2).optional(),
})

export const guideMetadataSchema = z.object({
  title: z.string().min(6),
  description: z.string().min(20).max(220),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(['Start', 'Design', 'Analyze', 'Communicate']),
  stage: z.enum(['Starting out', 'Planning', 'Doing the work', 'Sharing the work']),
  readingMinutes: z.number().int().min(3).max(20),
  updated: z
    .union([z.string(), z.date()])
    .transform((value) => (typeof value === 'string' ? value : value.toISOString().slice(0, 10))),
  featured: z.boolean().default(false),
  order: z.number().int().min(1),
  related: z.array(z.string()).default([]),
  resources: z.array(resourceSchema).default([]),
  tags: z.array(z.string()).default([]),
  hero: z.string().optional(),
})

export type GuideMetadata = z.infer<typeof guideMetadataSchema>
