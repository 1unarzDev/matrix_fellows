import { describe, expect, it } from 'vitest'
import { joinSchema, csvCell } from '../../shared/utils/join'

const response = {
  requestId: '11111111-1111-4111-8111-111111111111',
  name: 'Test Fellow',
  email: '  FELLOW@example.org ',
  grade: '11th grade',
  interests: ['Still exploring'],
  goals: ['Find research partners'],
  stage: 'No experience yet',
  consent: true,
}
describe('membership response validation', () => {
  it('keeps feedback optional, trims it and limits its length', () => {
    expect(joinSchema.parse(response).note).toBe('')
    expect(joinSchema.parse({ ...response, note: '  More robotics workshops!  ' }).note).toBe(
      'More robotics workshops!',
    )
    expect(joinSchema.safeParse({ ...response, note: 'a'.repeat(1001) }).success).toBe(false)
  })
  it('normalizes email and provides safe optional defaults', () => {
    expect(joinSchema.parse(response)).toMatchObject({ email: 'fellow@example.org', website: '' })
  })
  it('requires explicit consent, recognized options and bounded input', () => {
    for (const update of [
      { consent: false },
      { email: 'invalid' },
      { interests: [] },
      { goals: [] },
      { stage: 'invented' },
      { interests: ['invented'] },
      { grade: '5' },
    ]) {
      expect(joinSchema.safeParse({ ...response, ...update }).success).toBe(false)
    }
  })
  it('deduplicates selections', () => {
    expect(
      joinSchema.parse({ ...response, interests: ['Still exploring', 'Still exploring'] })
        .interests,
    ).toEqual(['Still exploring'])
  })
  it('neutralizes spreadsheet formulas and escapes CSV', () => {
    expect(csvCell(' =HYPERLINK("example")')).toBe('"\' =HYPERLINK(""example"")"')
    expect(csvCell('science, engineering')).toBe('"science, engineering"')
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"')
  })
})
