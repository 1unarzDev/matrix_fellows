import { parse } from 'node-html-parser'
import { opportunitySchema } from '../shared/utils/validation'
import type { ImportSource, Opportunity, OpportunityMilestone } from '../shared/types/content'
import { officialProfiles } from './official-sources'

export const PARSER_VERSION = 'official-v1'
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const namedDate =
  '(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})'
function day(month: string, date: string, year: string | number) {
  const m = months.indexOf(month.slice(0, 3).toLowerCase()) + 1
  const value = `${year}-${String(m).padStart(2, '0')}-${date.padStart(2, '0')}`
  if (!m || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)
    throw new Error('Invalid source date')
  return value
}
const clean = (value: string) => value.replace(/\s+/g, ' ').trim()

export function parseOfficial(
  body: string,
  source: ImportSource,
  now: string,
  contentHash: string,
): Opportunity[] {
  const profile = officialProfiles.find((p) => p.id === source.id && p.url === source.url)
  if (!profile) throw new Error('Official source is not in the reviewed allowlist')
  const root = parse(body, { comment: false })
  const milestones: OpportunityMilestone[] = []
  const add = (
    label: string,
    date: string,
    kind: 'deadline' | 'event',
    evidence: string,
    timezone: string | null = null,
  ) => {
    if (milestones.some((m) => m.label === label && m.date === date)) return
    if (milestones.some((m) => m.label === label && m.date !== date))
      throw new Error(`Conflicting dates for ${label}`)
    milestones.push({
      label,
      date,
      kind,
      evidence: clean(evidence).slice(0, 700),
      url: profile.url,
      timezone,
    })
  }
  if (profile.parser === 'conference') {
    if (!root.querySelectorAll('h1,h2,h3').some((h) => h.text.includes(String(profile.year))))
      throw new Error('Expected conference edition heading missing')
    for (const variable of profile.variables || []) {
      const rows = root
        .querySelectorAll('tr')
        .filter((row) =>
          row.querySelectorAll('script').some((s) => s.text.includes(`var ${variable} =`)),
        )
      if (rows.length !== 1) throw new Error(`Missing or ambiguous official countdown: ${variable}`)
      const row = rows[0]!
      const match = row.innerHTML.match(
        new RegExp(`var ${variable} = "(20\\d{2})/(\\d{2})/(\\d{2}) (\\d{2}:\\d{2}:\\d{2}) UTC"`),
      )
      if (!match) throw new Error(`Unrecognized UTC countdown: ${variable}`)
      const labelCell = row.querySelector('td[title]')
      const label = clean(labelCell?.getAttribute('title') || labelCell?.text || '')
      if (!label || !/deadline/i.test(label)) throw new Error('Expected labeled deadline row')
      const date = `${match[1]}-${match[2]}-${match[3]}T${match[4]}Z`
      if (![profile.year, profile.year - 1].includes(Number(match[1])))
        throw new Error('Conference deadline edition mismatch')
      add(label, date, 'deadline', `${label}: ${match[0]}`, 'UTC')
    }
    // NeurIPS publishes multiple city-specific session rows with an explicit
    // edition heading. Keep each session labeled instead of mixing locations.
    let location = ''
    for (const row of root.querySelectorAll('.date-sessions-table tr')) {
      if (row.querySelector('th')) {
        location = clean(row.text)
        continue
      }
      const cells = row.querySelectorAll('td')
      if (cells.length !== 2) continue
      const date = clean(cells[0]!.text).match(/^([A-Za-z]{3})\s+(\d{1,2})(?:st|nd|rd|th)/)
      if (date)
        add(
          `${location} — ${clean(cells[1]!.text)} (starts)`,
          day(date[1]!, date[2]!, profile.year),
          'event',
          `${profile.year}: ${clean(row.text)}`,
        )
    }
  }
  root.querySelectorAll('script,style,nav,header,footer,noscript').forEach((n) => n.remove())
  const text = clean(root.text)
  let note = ''
  if (profile.parser === 'isef') {
    const matches = [...text.matchAll(/May\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s+(2027)/g)]
    if (!matches.length) throw new Error('ISEF 2027 event range missing; previous data retained')
    for (const m of matches) {
      add('ISEF begins', day('May', m[1]!, m[3]!), 'event', m[0])
      add('ISEF ends', day('May', m[2]!, m[3]!), 'event', m[0])
    }
  } else if (profile.parser === 'queer-ai') {
    const matches = [
      ...text.matchAll(new RegExp(`Final submission deadline:\\s*${namedDate}\\s+AoE`, 'gi')),
    ]
    if (!matches.length)
      throw new Error('Explicit final submission deadline with year and AoE missing')
    for (const m of matches) {
      if (Number(m[3]) !== profile.year) throw new Error('Workshop edition mismatch')
      const date = day(m[1]!, m[2]!, m[3]!)
      const cutoff = new Date(Date.parse(`${date}T23:59:59Z`) + 12 * 3600000).toISOString()
      add('Final contribution submission', cutoff, 'deadline', m[0], 'Etc/GMT+12')
    }
  } else if (profile.parser === 'davidson') {
    const announcement = text.match(/The 2027 application will open in the Fall of 2026\./i)
    if (!announcement)
      throw new Error(
        'Davidson announcement changed; review new application cycle before extracting a deadline',
      )
    note = ` ${announcement[0]} Exact deadline not yet announced on this source.`
  } else if (profile.parser === 'sts') {
    const match = text.match(
      new RegExp(`8\\s*(?:p\\.?m\\.?|PM)\\s*(?:Eastern Time|ET)[\\s\\S]{0,60}?${namedDate}`, 'i'),
    )
    if (!match || !text.includes('2027'))
      throw new Error('STS application year / 8 PM ET cutoff missing')
    // This profile only accepts a November cutoff, when US Eastern is UTC-5.
    if (match[1]!.toLowerCase() !== 'november' || Number(match[3]) !== profile.year - 1)
      throw new Error('STS cutoff changed; timezone review required')
    const date = day(match[1]!, match[2]!, match[3]!)
    add(
      'Application deadline',
      new Date(Date.parse(`${date}T20:00:00-05:00`)).toISOString(),
      'deadline',
      match[0],
      'America/New_York',
    )
  } else if (profile.parser === 'icra') {
    const match = text.match(
      new RegExp(`Paper submission deadline:\\s*${namedDate}\\s*\\(11:59 PST\\)`, 'i'),
    )
    if (!match) throw new Error('ICRA labeled paper deadline missing or changed')
    if (Number(match[3]) !== profile.year - 1) throw new Error('ICRA submission edition mismatch')
    add(
      'Paper submission (date only; confirm cutoff timezone)',
      day(match[1]!, match[2]!, match[3]!),
      'deadline',
      match[0],
    )
    const event = text.match(/May\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s+(2027)/)
    if (event) add('Conference begins', day('May', event[1]!, event[3]!), 'event', event[0])
  }
  if (!milestones.length && !note) throw new Error('No verified dates extracted')
  if (milestones.length > 30) throw new Error('Unexpected number of dates')
  const future = milestones
    .filter(
      (m) =>
        m.kind === 'deadline' &&
        new Date(m.date.length === 10 ? `${m.date}T23:59:59Z` : m.date).getTime() >=
          Date.parse(now),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
  const events = milestones
    .filter((m) => m.kind === 'event')
    .sort((a, b) => a.date.localeCompare(b.date))
  const primary =
    future[0] ||
    (!events.length
      ? milestones
          .filter((m) => m.kind === 'deadline')
          .sort((a, b) => b.date.localeCompare(a.date))[0]
      : undefined)
  return [
    opportunitySchema.parse({
      id: `${source.id}:main`,
      sourceId: source.id,
      externalId: 'main',
      title: profile.name,
      kind: profile.kind,
      discipline: profile.discipline,
      description: profile.description + note,
      eventDate: events[0]?.date || null,
      deadline: primary?.date || null,
      timezone: primary?.timezone || null,
      location: 'See official source',
      eligibility: profile.eligibility,
      url: profile.url,
      verifiedAt: now,
      priority: profile.priority,
      published: false,
      milestones,
      provenance: { url: profile.url, contentHash, parserVersion: PARSER_VERSION },
    }),
  ]
}
