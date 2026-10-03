import { expect, it } from 'vitest'
import {
  canonicalizeOutreachUrl,
  outreachPriority,
  outreachProfileSchema,
  outreachProposalSchema,
  outreachTargetSchema,
} from '../../shared/utils/outreach'
import { outreachSeeds } from '../../shared/data/outreach-seeds'
it('keeps unknown openness unknown rather than manufacturing a response probability', () => {
  expect(outreachPriority({ fit: 30 })).toBeNull()
  expect(
    outreachPriority({ fit: 30, openness: 25, contribution: 20, feasibility: 15, evidence: 10 }),
  ).toBe(100)
})
it('normalizes duplicate tracking URLs and refuses unsafe source protocols', () => {
  expect(canonicalizeOutreachUrl('https://Example.edu/lab/?utm_source=x#team')).toBe(
    'https://example.edu/lab/',
  )
  expect(canonicalizeOutreachUrl('https://example.edu/person?id=17&utm_source=x')).toBe(
    'https://example.edu/person?id=17',
  )
  expect(outreachTargetSchema.shape.canonicalUrl.safeParse('http://example.edu').success).toBe(
    false,
  )
})
it('validates reviewed first-party seeds without fabricating openness scores', () => {
  for (const seed of outreachSeeds) {
    const parsed = outreachTargetSchema.parse(seed)
    expect(parsed.dossier.evidence.length).toBeGreaterThan(0)
    expect(outreachPriority(parsed.assessment)).toBeNull()
    expect(parsed.status).toBe('needs_review')
  }
})
it('rejects header injection and excessive profiles', () => {
  expect(
    outreachProposalSchema.shape.subject.safeParse('hello\nBcc: spam@example.edu').success,
  ).toBe(false)
  expect(outreachProfileSchema.shape.skills.safeParse(Array(21).fill('Python')).success).toBe(false)
})
