import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
const mock = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))
vi.mock('../../server/utils/workspace-auth', () => ({ workspaceAuthStorage: () => mock }))
import {
  assertWorkspaceTarget,
  assertWorkspaceOpportunity,
} from '../../server/utils/workspace-access'
const event = {} as H3Event
const member = { userId: 'member-id', email: 'member@example.com', role: 'member' as const }
beforeEach(() => vi.clearAllMocks())
it('rejects society drafts and requires a fresh assignment RPC for every member action', async () => {
  await expect(assertWorkspaceTarget(event, member, 'target', 'society')).rejects.toMatchObject({
    statusCode: 403,
  })
  expect(mock.rpc).not.toHaveBeenCalled()
  mock.rpc
    .mockResolvedValueOnce({ data: false, error: null })
    .mockResolvedValueOnce({ data: true, error: null })
    .mockResolvedValueOnce({ data: false, error: null })
  await expect(assertWorkspaceTarget(event, member, 'target', 'student')).rejects.toMatchObject({
    statusCode: 403,
  })
  await expect(assertWorkspaceTarget(event, member, 'target', 'student')).resolves.toBeUndefined()
  await expect(assertWorkspaceTarget(event, member, 'target', 'student')).rejects.toMatchObject({
    statusCode: 403,
  })
  expect(mock.rpc).toHaveBeenCalledWith('outreach_member_target_access', {
    p_user_id: 'member-id',
    p_target_id: 'target',
  })
})
it('retains officer society drafting without granting members officer authority', async () => {
  await assertWorkspaceTarget(event, { ...member, role: 'officer' }, 'target', 'society')
  expect(mock.rpc).not.toHaveBeenCalled()
})
it('planner catalog references require published, unsuppressed rows', async () => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  mock.from.mockReturnValue(query)
  await expect(assertWorkspaceOpportunity(event, 'hidden')).rejects.toMatchObject({
    statusCode: 403,
  })
  expect(query.eq).toHaveBeenCalledWith('published', true)
  expect(query.eq).toHaveBeenCalledWith('suppressed', false)
})
