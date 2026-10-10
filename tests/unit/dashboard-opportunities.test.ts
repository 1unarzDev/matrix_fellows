import { expect, it } from 'vitest'
import {
  captureInputSchema,
  capturePreview,
  classifyOpportunityCapture,
  normalizeCaptureUrl,
  opportunityDecisionSchema,
} from '../../shared/utils/dashboard-opportunities'
import type { Opportunity } from '../../shared/types/content'
import cases from '../fixtures/opportunity-capture-cases.json'
it('normalizes public links without guessing contact routes or fetching sources', () => {
  expect(normalizeCaptureUrl('https://example.edu/program/?utm_source=news#apply')).toBe(
    'https://example.edu/program',
  )
  expect(normalizeCaptureUrl('https://example.edu/program?year=2027&track=chemistry')).toBe(
    'https://example.edu/program?track=chemistry&year=2027',
  )
  expect(captureInputSchema.parse({ url: ' https://example.edu/ ' }).url).toBe(
    'https://example.edu/',
  )
})
it.each([
  'file:///etc/passwd',
  'javascript:alert(1)',
  'http://localhost/',
  'http://127.0.0.1/',
  'http://2130706433/',
  'http://0x7f000001/',
  'http://[::1]/',
  'http://[::ffff:127.0.0.1]/',
  'http://169.254.169.254/',
  'https://foo.internal/',
  'https://foo.local/',
  'https://user:secret@example.edu/',
  'https://example.edu:444/',
  'https://example.edu/\n',
])('rejects unsafe or special-use capture URL %s', (url) => {
  // Input schema trims ordinary clipboard whitespace; the normalizer itself also
  // rejects embedded control characters. URL capture never makes a network request.
  if (url.endsWith('\n'))
    expect(captureInputSchema.safeParse({ url: 'https://exam\nple.edu/' }).success).toBe(false)
  else expect(captureInputSchema.safeParse({ url }).success).toBe(false)
})
it('unsupported reference does not imply verification, eligibility or an obligation', () => {
  const preview = capturePreview('https://example.edu/new', null, null)
  expect(preview.kind).toBe('unverified-reference')
  expect(preview.item).toBeNull()
  expect(preview.source.retrievedAt).toBeNull()
  expect(preview.notice).toContain('creates no application or task')
})
it('known catalog preview preserves historical cycle instead of claiming a fresh fetch', () => {
  const item = {
    id: 'catalog:past-program',
    title: 'Past program',
    url: 'https://example.edu/old',
    deadline: '2024-01-01',
    edition: '2024',
  } as Opportunity
  const preview = capturePreview(item.url, item, null)
  expect(preview.kind).toBe('catalog')
  expect(preview.item?.edition).toBe('2024')
  expect(preview.source.retrievedAt).toBeNull()
  expect(preview.notice).toContain('does not reverify')
})
it.each(cases)('triages $id with the intended disposition', (fixture) => {
  const result = classifyOpportunityCapture({ url: fixture.url, title: fixture.title, text: fixture.pageText })
  expect(result.disposition).toBe(
    fixture.expectedDisposition === 'catalog'
      ? 'shared-review'
      : fixture.expectedDisposition === 'reject'
        ? 'rejected'
        : fixture.expectedDisposition,
  )
})
it('keeps a narrow real contest personal instead of treating it as shared', () => {
  const result = classifyOpportunityCapture({
    url: 'https://member.example.org/math-sprint-2027',
    title: 'Arlington Math Sprint',
    text: 'A 90-minute local mathematics contest for grades 9-12. Register by March 1. One Saturday, $25 team fee, no research project, mentoring, or reusable club pathway.',
  })
  expect(result.disposition).toBe('personal')
})
it('keeps concrete source dates for the personal timeline', () => {
  const result = classifyOpportunityCapture({
    url: 'https://member.example.org/math-sprint-2027',
    title: 'Arlington Math Sprint',
    text: 'Register by March 1, 2027. The contest is held April 10, 2027 for grades 9-12.',
  })
  expect(result.deadline).toBe('2027-03-01')
  expect(result.eventDate).toBe('2027-04-10')
})
it('supports TEXT catalog IDs, private pass reasons, and versioned undo', () => {
  expect(
    opportunityDecisionSchema.parse({
      opportunityId: 'catalog:stars',
      decision: 'pass',
      reason: 'Prior research exclusion',
      expectedVersion: 0,
    }).reason,
  ).toBe('Prior research exclusion')
  expect(
    opportunityDecisionSchema.parse({
      opportunityId: 'catalog:stars',
      decision: 'clear',
      expectedVersion: 1,
    }).decision,
  ).toBe('clear')
  expect(
    opportunityDecisionSchema.safeParse({
      opportunityId: 'catalog:stars',
      decision: 'pass',
      expectedVersion: -1,
    }).success,
  ).toBe(false)
  expect(
    opportunityDecisionSchema.safeParse({ opportunityId: 'catalog:stars', decision: 'pass' })
      .success,
  ).toBe(false)
})
