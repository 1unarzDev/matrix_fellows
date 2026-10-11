import { expect, it } from 'vitest'
import { isCurrentOutreachMatch } from '../../shared/utils/outreach-match'
import type { SavedMatchContext } from '../../shared/types/outreach-planning'
const context: SavedMatchContext = {
  targetId: 'target-a', profileId: 'profile-a', targetVersion: 'source-v1', profileVersion: 'member-v1',
  projectId: 'project-a', contributionOption: 0,
  preferences: { lens: 'nearby', reachableLocations: ['Arlington'], interests: ['Robotics'] },
}
const match = { target_id: context.targetId, profile_id: context.profileId, input_versions: {
  schema: 'match-v1', target: context.targetVersion, profile: context.profileVersion,
  project: context.projectId, option: context.contributionOption, preferences: context.preferences,
} }
it('requires rebuilding after the supported angle, evidence, represented project or member changes', () => {
  expect(isCurrentOutreachMatch(match, context)).toBe(true)
  for (const change of [
    { targetId: 'target-b' }, { profileId: 'profile-b' }, { targetVersion: 'source-v2' },
    { profileVersion: 'member-v2' }, { projectId: 'project-b' }, { contributionOption: 1 },
    { contributionOption: null },
  ]) expect(isCurrentOutreachMatch(match, { ...context, ...change })).toBe(false)
})
it('a previous local plan cannot bypass withdrawn travel or location preferences', () => {
  expect(isCurrentOutreachMatch(match, { ...context, preferences: { ...context.preferences, lens: 'remote' } })).toBe(false)
  expect(isCurrentOutreachMatch(match, { ...context, preferences: { ...context.preferences, reachableLocations: ['Dallas'] } })).toBe(false)
  expect(isCurrentOutreachMatch(match, { ...context, preferences: { ...context.preferences, interests: ['Physics'] } })).toBe(false)
  expect(isCurrentOutreachMatch({ ...match, input_versions: { ...match.input_versions, preferences: undefined } }, context)).toBe(false)
})
it('society plans use the officer context without an implied member or hidden project', () => {
  const society = { ...context, profileId: null, profileVersion: null, projectId: null, contributionOption: null, preferences: { ...context.preferences, interests: [] } }
  const stored = { target_id: society.targetId, profile_id: null, input_versions: { ...match.input_versions, profile: null, project: null, option: null, preferences: society.preferences } }
  expect(isCurrentOutreachMatch(stored, society)).toBe(true)
  expect(isCurrentOutreachMatch(match, society)).toBe(false)
  expect(isCurrentOutreachMatch(null, society)).toBe(false)
})
