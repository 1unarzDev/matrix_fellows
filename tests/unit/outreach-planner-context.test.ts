import { beforeEach, expect, it, vi } from 'vitest'
import { createError } from 'h3'
import cases from '../fixtures/research-quality-cases.json'
const state = vi.hoisted(() => ({ body: {} as any, match: null as any, preferences: { lens: 'nearby', reachable_locations: ['Arlington'] }, inserted: [] as any[], selects: [] as string[] }))
const actor = { userId: '11111111-1111-4111-8111-111111111111', email: 'officer@example.org', role: 'officer' }
const targetId = '22222222-2222-4222-8222-222222222222'
const profileId = '33333333-3333-4333-8333-333333333333'
const matchId = '44444444-4444-4444-8444-444444444444'
const fixture = cases[0]!
const target = { ...fixture.input.target, id: targetId, status: 'ready', updatedAt: 'target-v1', contactEmail: 'lab@example.edu' }
const packet = { subjectUserId: actor.userId, versionId: 'profile-v1', declaredInterests: ['Robotics'], claims: [] }
function from(table: string) {
  state.selects.push(table)
  const value = () => table === 'outreach_targets' ? target : table === 'outreach_society' ? fixture.input.society : table === 'outreach_matches' ? state.match : table === 'research_preferences' ? state.preferences : table === 'outreach_proposals' ? { id: 'proposal', ...state.inserted.at(-1) } : []
  const result = () => ({ data: value(), error: null })
  const query: any = {
    select: () => query, eq: () => query, in: () => query, order: () => query, limit: () => query,
    single: async () => result(), maybeSingle: async () => result(),
    insert: (body: any) => { state.inserted.push(body); return query },
    then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject),
  }
  return query
}
vi.mock('../../server/utils/workspace-auth', () => ({ requireWorkspaceOfficer: async () => actor, assertWorkspaceOrigin: () => {} }))
vi.mock('../../server/utils/workspace-access', () => ({ assertWorkspaceTarget: async () => {} }))
vi.mock('../../server/utils/workspace-storage', () => ({
  workspaceStorage: () => ({ from }), workspaceBody: async (_event: any, schema: any) => schema.parse(state.body),
  workspaceResult: (result: any) => result.data, targetFromRow: (row: any) => row, societyFromRow: (row: any) => row, proposalFromRow: (row: any) => row,
}))
vi.mock('../../server/utils/research-profile', () => ({ shareableResearchProfile: async () => packet, draftProfileProjection: async () => fixture.input.profile }))
vi.mock('../../server/utils/officer-voice', () => ({ loadOfficerVoice: async () => ({ preferences: {} }) }))
vi.stubGlobal('defineEventHandler', (handler: any) => handler)
vi.stubGlobal('createError', createError)
const planner = (await import('../../server/api/workspace/planner.post')).default
beforeEach(() => {
  state.body = { targetId, profileId, matchId, kind: 'student', contributionOption: 0 }
  state.match = { target_id: targetId, profile_id: profileId, input_versions: { schema: 'match-v1', target: 'target-v1', profile: 'profile-v1', project: null, option: 0, preferences: { lens: 'nearby', reachableLocations: ['Arlington'], interests: ['Robotics'] } }, plan: fixture.plan }
  state.preferences = { lens: 'nearby', reachable_locations: ['Arlington'] }
  state.inserted = []; state.selects = []
})
it('a reviewed match reaches the draft unchanged when its represented context is current', async () => {
  await planner({} as any)
  expect(state.inserted).toHaveLength(1)
  expect(state.inserted[0].proposal_plan.matchId).toBe(matchId)
  expect(state.inserted[0].proposal_plan.question).toBe(fixture.plan.question)
})
it('rejects a changed angle before creating any proposal from the earlier match', async () => {
  state.body.contributionOption = 1
  await expect(planner({} as any)).rejects.toMatchObject({ statusCode: 409 })
  expect(state.inserted).toHaveLength(0)
})
it('rechecks saved participation preferences before a draft can reuse a local plan', async () => {
  state.preferences = { lens: 'remote', reachable_locations: [] }
  await expect(planner({} as any)).rejects.toMatchObject({ statusCode: 409 })
  expect(state.selects).toContain('research_preferences')
  expect(state.inserted).toHaveLength(0)
})
it('rejects a member-only project hidden inside society outreach', async () => {
  state.body = { targetId, kind: 'society', projectId: profileId }
  await expect(planner({} as any)).rejects.toMatchObject({ statusCode: 422 })
  expect(state.inserted).toHaveLength(0)
})
