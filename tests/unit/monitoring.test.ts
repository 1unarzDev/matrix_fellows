import { describe, expect, it } from 'vitest'
import { dateSupported, validateExtraction } from '../../workers/monitoring'
import type { Opportunity, OpportunityMilestone } from '../../shared/types/content'

const url = 'https://math.mit.edu/research/highschool/primes/usa/apply-usa.html'
const now = '2026-09-07T12:00:00Z'
const eligibility = 'High school juniors and sophomores residing in the United States are eligible.'
const closed = 'Applications for the 2026 cycle are now closed.'
const evidence = 'The deadline for receiving applications for the 2026 cycle was December 1, 2025.'
const milestone = {
  label: 'Application deadline',
  date: '2025-12-01',
  kind: 'deadline' as const,
  evidence,
  url,
}
const docs = (text: string, source = url) => [{ url: source, text, links: [] }]
const sourceText = `MIT PRIMES-USA Free year-long mentored research for advanced high-school mathematics students. ${eligibility} ${closed} ${evidence}`
function seed(milestones: OpportunityMilestone[] = []): Opportunity {
  return {
    id: 'catalog:primes',
    sourceId: 'catalog-primes',
    externalId: 'main',
    title: 'MIT PRIMES-USA',
    kind: 'Program',
    discipline: 'Mathematics',
    description: 'Free year-long mentored research for advanced high-school mathematics students.',
    eligibility,
    location: 'United States',
    url,
    priority: 80,
    published: true,
    deadline: null,
    eventDate: null,
    timezone: null,
    verifiedAt: '2026-09-01',
    edition: '2026',
    lifecycle: 'awaiting-announcement',
    milestones,
  }
}
function extraction(overrides: Record<string, unknown> = {}) {
  return {
    title: 'MIT PRIMES-USA',
    overview: 'Free year-long mentored research for advanced high-school mathematics students.',
    eligibilityQuote: eligibility,
    edition: '2026',
    lifecycle: 'awaiting-announcement',
    lifecycleQuote: closed,
    milestones: [milestone],
    ...overrides,
  }
}

describe('monitoring date evidence', () => {
  it.each([
    ['2026-02-05', 'Application deadline: February 5, 2026 (11:59 PM EST)'],
    ['2027-06-27', 'PROMYS 2027: June 27 – August 7, 2027'],
    ['2027-08-07', 'PROMYS 2027: June 27 – August 7, 2027'],
    ['2026-07-21', 'Virtual Science Symposium July 20–21, 2026'],
    ['2026-12-18', 'Applications available Dec. 18th, 2026'],
    ['2026-09-10', 'Deadline 10 September 2026'],
    ['2026-09-10', 'Deadline: 2026-09-10'],
  ])('accepts exact calendar evidence for %s', (date, quote) => {
    expect(dateSupported(date, quote)).toBe(true)
  })

  it('rejects a yearless date instead of assuming the current cycle', () => {
    expect(dateSupported('2026-12-17', 'Please check back on December 17.')).toBe(false)
  })

  it('rejects an impossible calendar day', () => {
    expect(dateSupported('2026-02-30', 'Application deadline February 30, 2026')).toBe(false)
  })

  it('rejects invalid months without throwing from its boolean API', () => {
    expect(dateSupported('2026-13-01', 'Application deadline 2026-13-01')).toBe(false)
  })

  it('does not borrow the cycle year to relabel the prior-year deadline', () => {
    expect(dateSupported('2025-12-01', evidence)).toBe(true)
    expect(dateSupported('2026-12-01', evidence)).toBe(false)
  })
})

describe('automatic publication safeguards', () => {
  it('does not regress the confirmed cycle to an older edition mentioned on the page', () => {
    expect(() =>
      validateExtraction(extraction({ edition: '2025' }), docs(sourceText), seed(), now),
    ).toThrow(/Older edition/)
  })
  it('does not treat a denial of replacement as a replacement announcement', () => {
    const quote = 'This program has not been renamed or replaced.'
    expect(() =>
      validateExtraction(
        extraction({ lifecycle: 'replaced', lifecycleQuote: quote }),
        docs(`${sourceText} ${quote}`),
        seed(),
        now,
      ),
    ).toThrow(/Replacement/)
  })
  it('does not carry unconfirmed discovery dates into a subsequent observation', () => {
    const pending = { ...seed([{ ...milestone, timezone: null }]), published: false }
    const result = validateExtraction(
      extraction({ milestones: [] }),
      docs(sourceText),
      pending,
      now,
    )
    expect(result.milestones).toEqual([])
  })
  it('does not promote an opening into a submission deadline', () => {
    const quote = 'Applications open December 18, 2026.'
    expect(() =>
      validateExtraction(
        extraction({ milestones: [{ ...milestone, date: '2026-12-18', evidence: quote }] }),
        docs(`${sourceText} ${quote}`),
        seed(),
        now,
      ),
    ).toThrow(/meaning/)
  })
  it('supersedes a moved deadline even when the model changes its generic label', () => {
    const quote = 'Application deadline: September 20, 2026.'
    const old = { ...milestone, date: '2026-09-10', timezone: null }
    const result = validateExtraction(
      extraction({
        milestones: [
          { ...milestone, label: 'Submission deadline', date: '2026-09-20', evidence: quote },
        ],
      }),
      docs(`${sourceText} ${quote}`),
      seed([old]),
      now,
    )
    expect(result.milestones?.find((m) => m.date === '2026-09-10')?.superseded).toBe(true)
    expect(result.deadline).toBe('2026-09-20')
  })
  it('does not merge distinct registration and submission checkpoints on the same day', () => {
    const quote =
      'Registration deadline: September 20, 2026. Submission deadline: September 20, 2026.'
    const ms = ['Registration deadline', 'Submission deadline'].map((label) => ({
      ...milestone,
      label,
      date: '2026-09-20',
      evidence: `${label}: September 20, 2026.`,
    }))
    const result = validateExtraction(
      extraction({ milestones: ms }),
      docs(`${sourceText} ${quote}`),
      seed(),
      now,
    )
    expect(result.milestones).toHaveLength(2)
  })
})

describe('monitoring extraction validation', () => {
  it('preserves a confirmed past deadline as history, not an upcoming deadline', () => {
    const result = validateExtraction(extraction(), docs(sourceText), seed(), now)
    expect(result.milestones).toEqual([{ ...milestone, timezone: null }])
    expect(result.deadline).toBeNull()
    expect(result.edition).toBe('2026')
  })

  it('requires a verbatim evidence quote', () => {
    const raw = extraction({
      milestones: [{ ...milestone, evidence: 'Applications close December 1, 2025.' }],
    })
    expect(() => validateExtraction(raw, docs(sourceText), seed(), now)).toThrow(/exact evidence/)
  })

  it('requires the quote to occur on its cited URL, not merely another fetched page', () => {
    const sources = [
      ...docs(sourceText, 'https://math.mit.edu/other.html'),
      ...docs('No deadline here.'),
    ]
    expect(() => validateExtraction(extraction(), sources, seed(), now)).toThrow(/exact evidence/)
  })

  it('rejects a yearless date even when the edition appears elsewhere in the document', () => {
    const quote = 'Application deadline: December 1.'
    const raw = extraction({ milestones: [{ ...milestone, date: '2026-12-01', evidence: quote }] })
    expect(() =>
      validateExtraction(raw, docs(`${eligibility} ${closed} ${quote}`), seed(), now),
    ).toThrow(/exact evidence/)
  })

  it('requires independent exact evidence for the edition', () => {
    expect(() =>
      validateExtraction(extraction({ edition: '2027' }), docs(sourceText), seed(), now),
    ).toThrow(/Edition/)
  })

  it('requires an exact high-school eligibility quote for new discoveries', () => {
    expect(() =>
      validateExtraction(
        extraction({ eligibilityQuote: 'Everyone is eligible.' }),
        docs(sourceText),
        seed(),
        now,
        true,
      ),
    ).toThrow(/high-school eligibility/)
    const college = 'Current undergraduate students are eligible.'
    expect(() =>
      validateExtraction(
        extraction({ eligibilityQuote: college }),
        docs(`${sourceText} ${college}`),
        seed(),
        now,
        true,
      ),
    ).toThrow(/high-school eligibility/)
    expect(validateExtraction(extraction(), docs(sourceText), seed(), now, true).eligibility).toBe(
      eligibility,
    )
  })

  it('does not treat explicit high-school exclusion as eligibility', () => {
    const exclusion = 'High school students are not eligible for this program.'
    expect(() =>
      validateExtraction(
        extraction({ eligibilityQuote: exclusion }),
        docs(`${sourceText} ${exclusion}`),
        seed(),
        now,
        true,
      ),
    ).toThrow()
  })

  it('requires a verbatim lifecycle quote', () => {
    expect(() =>
      validateExtraction(
        extraction({ lifecycleQuote: 'Applications have closed for 2026.' }),
        docs(sourceText),
        seed(),
        now,
      ),
    ).toThrow(/Lifecycle/)
  })

  it('does not equate closed applications with program discontinuation', () => {
    expect(() =>
      validateExtraction(extraction({ lifecycle: 'discontinued' }), docs(sourceText), seed(), now),
    ).toThrow(/Discontinuation/)
  })

  it('accepts explicit and exact program discontinuation', () => {
    const quote = 'The research program has been permanently discontinued.'
    const raw = extraction({ lifecycle: 'discontinued', lifecycleQuote: quote, milestones: [] })
    expect(validateExtraction(raw, docs(`${sourceText} ${quote}`), seed(), now).lifecycle).toBe(
      'discontinued',
    )
    expect(() => validateExtraction(raw, docs(sourceText), seed(), now)).toThrow(/Lifecycle/)
  })

  it('does not treat a denial of discontinuation as discontinuation', () => {
    const quote = 'This program has not been discontinued; applications will reopen.'
    expect(() =>
      validateExtraction(
        extraction({ lifecycle: 'discontinued', lifecycleQuote: quote }),
        docs(`${sourceText} ${quote}`),
        seed(),
        now,
      ),
    ).toThrow()
  })

  it('throws for unverifiable unknown extraction and leaves the last confirmed seed untouched', () => {
    const previous = seed([{ ...milestone, timezone: null }])
    const before = structuredClone(previous)
    expect(() =>
      validateExtraction(
        extraction({ lifecycle: 'unknown', lifecycleQuote: '', milestones: [] }),
        docs(sourceText),
        previous,
        now,
      ),
    ).toThrow(/last confirmed data retained/)
    expect(previous).toEqual(before)
  })

  it('adds a new cycle without deleting earlier timeline history', () => {
    const previous = seed([{ ...milestone, timezone: null }])
    const nextEvidence = 'Applications close December 2, 2026 for the 2027 cycle.'
    const announcement = 'Applications for the 2027 cycle are announced.'
    const raw = extraction({
      edition: '2027',
      lifecycle: 'announced',
      lifecycleQuote: announcement,
      milestones: [{ ...milestone, date: '2026-12-02', evidence: nextEvidence }],
    })
    const result = validateExtraction(
      raw,
      docs(`${eligibility} ${announcement} ${nextEvidence}`),
      previous,
      now,
    )
    expect(result.milestones?.map((m) => m.date)).toEqual(['2025-12-01', '2026-12-02'])
    expect(result.deadline).toBe('2026-12-02')
    expect(previous.milestones).toHaveLength(1)
  })

  it('preserves manually verified timestamps and timezone when the calendar date agrees', () => {
    const precise = { ...milestone, date: '2025-12-01T22:00:00Z', timezone: 'UTC' }
    const result = validateExtraction(extraction(), docs(sourceText), seed([precise]), now)
    expect(result.milestones).toEqual([precise])
  })
})
