import { describe, expect, it } from 'vitest'
import { privacyPolicy, termsOfService } from '../../shared/data/legal'

describe('public account policies', () => {
  for (const document of [privacyPolicy, termsOfService]) {
    it(`${document.title} has unique anchor identities and usable copy`, () => {
      expect(new Set(document.sections.map((section) => section.id)).size).toBe(
        document.sections.length,
      )
      expect(document.updated).toBe('October 9, 2026')
      expect(
        document.sections.every(
          (section) =>
            section.title && section.paragraphs.length && section.paragraphs.every(Boolean),
        ),
      ).toBe(true)
      expect(JSON.stringify(document)).toContain('contact@matrixfellows.com')
      expect(JSON.stringify(document)).not.toMatch(/\b(TODO|Lorem ipsum|insert here)\b/)
    })
  }
  it('distinguishes identity, mailbox consent and adult-officer AI policy', () => {
    const privacy = privacyPolicy.sections.map((s) => s.paragraphs.join(' ')).join(' ')
    expect(privacy).toContain('Connecting a mailbox is separate from signing in')
    expect(privacy).toContain('authorized adult officers')
    expect(privacy).toContain('Reply synchronization is not currently active')
    expect(privacy).toContain('student ID')
    expect(privacy).toContain('no single automatic deletion period')
  })
})
