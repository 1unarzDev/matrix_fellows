import { describe, it, expect } from 'vitest'
import { parseOfficial } from '../../workers/official'
import { officialProfiles } from '../../workers/official-sources'

function read(id: string, html: string, now = '2026-09-07T00:00:00Z') {
  const profile = officialProfiles.find((p) => p.id === id)!
  return parseOfficial(
    html,
    { ...profile, kind: 'official', enabled: true },
    now,
    'a'.repeat(64),
  )[0]!
}
describe('official source evidence', () => {
  it('distinguishes ISEF event dates from qualifying deadlines', () => {
    const item = read('isef-2027', '<p>May 8-14, 2027</p>')
    expect(item.deadline).toBeNull()
    expect(item.eventDate).toBe('2027-05-08')
  })
  it('never invents a Davidson deadline', () => {
    expect(
      read('davidson-fellows-2027', 'The 2027 application will open in the Fall of 2026.').deadline,
    ).toBeNull()
    expect(() => read('davidson-fellows-2027', 'Deadline February 18, 2026')).toThrow()
  })
  it('converts AoE and keeps expired workshop deadlines expired', () => {
    const html = 'Final submission deadline: September 10, 2026 AoE'
    expect(read('queer-ai-neurips-2026', html).deadline).toBe('2026-09-11T11:59:59.000Z')
    expect(read('queer-ai-neurips-2026', html, '2027-01-01T00:00:00Z').deadline).not.toBeNull()
    expect(() =>
      read('queer-ai-neurips-2026', html + ' Final submission deadline: September 12, 2026 AoE'),
    ).toThrow(/Conflicting/)
  })
  it('keeps ambiguous ICRA timezone date-only', () => {
    const item = read('icra-2027', 'Paper submission deadline: September 15, 2026 (11:59 PST)')
    expect(item.deadline).toBe('2026-09-15')
    expect(item.timezone).toBeNull()
  })
  it('converts the explicit STS Eastern cutoff', () => {
    expect(
      read(
        'regeneron-sts-2027',
        '2027 application open through 8PM ET on Thursday, November 5, 2026',
      ).deadline,
    ).toBe('2026-11-06T01:00:00.000Z')
  })
  for (const id of ['neurips-2026', 'cvpr-2027'])
    it(`reads ${id} labeled official UTC countdowns without executing scripts`, () => {
      const profile = officialProfiles.find((p) => p.id === id)!
      const html =
        `<h2>${profile.year} Dates</h2><table>` +
        profile
          .variables!.map(
            (v) =>
              `<tr><td title=""><a>Submission Deadline ${v}</a></td><td><script>var ${v} = "2026/11/17 11:59:59 UTC";</script></td></tr>`,
          )
          .join('') +
        '</table>'
      expect(read(id, html).deadline).toBe('2026-11-17T11:59:59Z')
      expect(() => read(id, html.replace('2026/11/17', '2024/11/17'))).toThrow(/edition/)
      expect(() => read(id, '<h2>Dates changed</h2>')).toThrow()
    })
})
