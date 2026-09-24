import { expect, it } from 'vitest'
import { defaultContent } from '../../shared/data/defaults'
import {
  buildMeetingSchedule,
  meetingDisplayStatus,
  projectedMeetings,
} from '../../shared/data/meetings'
import { contentSchema } from '../../shared/utils/validation'

it('provides the first meeting and three real research projects', () => {
  expect(contentSchema.safeParse(defaultContent).success).toBe(true)
  expect(defaultContent.meeting).toMatchObject({
    date: '2026-09-25',
    time: 'During lunch',
    location: 'Martin HS · Room 186C',
  })
  expect(defaultContent.meeting.topics).toHaveLength(6)
  expect(defaultContent.meeting.topics.join(' ')).toMatch(/start an ISEF project/)
  expect(defaultContent.meeting.topics.join(' ')).toMatch(/workshop submission/)
  expect(defaultContent.meeting.topics.at(-1)).toMatch(/join Matrix Fellows/)
  expect(defaultContent.benefits).toHaveLength(4)
  const outcomes = defaultContent.benefits
    .map(({ title, description }) => `${title} ${description}`)
    .join(' ')
  expect(outcomes).toMatch(/national awards/)
  expect(outcomes).toMatch(/research internships/)
  expect(outcomes).toMatch(/summer programs/)
  expect(outcomes).toMatch(/real-world experience/)
  expect(outcomes).toMatch(/genuine interest/)
  expect(defaultContent.projects).toHaveLength(3)
  expect(defaultContent.projects.filter((p) => p.status === 'Advanced to TXSEF')).toHaveLength(2)
  expect(defaultContent.projects[0]?.url).toBe('https://github.com/1unarzDev/crane_sim')
  expect(defaultContent.projects[2]?.status).toBe('Ongoing study')
})

it('builds a dated meeting schedule with honest confirmed and projected states', () => {
  const schedule = buildMeetingSchedule(defaultContent.meeting)
  expect(schedule.map(({ date, state }) => ({ date, state }))).toEqual([
    { date: '2026-09-25', state: 'confirmed' },
    { date: '2026-10-09', state: 'tentative' },
  ])
  expect(meetingDisplayStatus(schedule[0]!, '2026-09-24')).toBe('confirmed')
  expect(meetingDisplayStatus(schedule[0]!, '2026-09-26')).toBe('past')
  expect(meetingDisplayStatus(schedule[1]!, '2026-09-24')).toBe('tentative')

  const projected = projectedMeetings[0]!
  expect(projected.topics.join(' ')).toMatch(/ISEF works/)
  expect(projected.topics.join(' ')).toMatch(/Fort Worth Regional/)
  expect(projected.topics.join(' ')).toMatch(/individual or team/)
  expect(projected.topics.join(' ')).toMatch(/deadlines/)
  expect(projected.topics.join(' ')).toMatch(/real ISEF project examples/)
  expect(projected.topics.join(' ')).toMatch(/registration/)
  expect(projected.resources.map(({ url }) => url)).toEqual(
    expect.arrayContaining([
      'https://fwrsef.org/',
      'https://www.societyforscience.org/isef/',
      'https://ruleswizard.societyforscience.org/',
    ]),
  )
})
