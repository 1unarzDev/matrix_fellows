import { expect, it } from 'vitest'
import { defaultContent } from '../../shared/data/defaults'
import { contentSchema } from '../../shared/utils/validation'

it('provides the first meeting and three real research projects', () => {
  expect(contentSchema.safeParse(defaultContent).success).toBe(true)
  expect(defaultContent.meeting).toMatchObject({
    date: '2026-09-25',
    time: 'During lunch',
    location: 'Martin HS · Room 185B',
  })
  expect(defaultContent.projects).toHaveLength(3)
  expect(defaultContent.projects.filter((p) => p.status === 'Advanced to TXSEF')).toHaveLength(2)
  expect(defaultContent.projects[0]?.url).toBe('https://github.com/1unarzDev/crane_sim')
  expect(defaultContent.projects[2]?.status).toBe('Ongoing study')
})
