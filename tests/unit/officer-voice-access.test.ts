import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({
  officer: vi.fn(),
  storage: vi.fn(),
  rpc: vi.fn(),
  proposal: {
    body: 'private approved words',
    revision: 2,
    status: 'approved',
    approved_by: 'owner',
  },
}))
vi.mock('../../server/utils/workspace-auth', () => ({ requireWorkspaceOfficer: state.officer }))
vi.mock('../../server/utils/workspace-storage', () => ({
  workspaceStorage: state.storage,
  workspaceResult: (result: any) => result.data,
}))
import { recordApprovedVoice, loadOfficerVoice } from '../../server/utils/officer-voice'
beforeEach(() => {
  state.officer.mockReset().mockResolvedValue({ userId: 'owner', role: 'officer' })
  state.rpc.mockReset().mockResolvedValue({ data: true })
  state.storage.mockReset().mockReturnValue({
    from: () => {
      const query: any = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: state.proposal }),
      }
      return query
    },
    rpc: state.rpc,
  })
})
it('rejects browser-selected actor authority before reading another officer data', async () => {
  await expect(loadOfficerVoice({} as never, 'other-officer')).rejects.toThrow('belong')
  expect(state.storage).not.toHaveBeenCalled()
})
it('rechecks live officer authority and records only identifiers after exact local comparison', async () => {
  await expect(
    recordApprovedVoice({} as never, 'owner', 'proposal', 2, 'changed buffer'),
  ).rejects.toThrow('exact')
  expect(state.rpc).not.toHaveBeenCalled()
  await recordApprovedVoice({} as never, 'owner', 'proposal', 2, 'private approved words')
  expect(state.rpc).toHaveBeenCalledWith('outreach_record_approved_voice', {
    p_actor: 'owner',
    p_proposal: 'proposal',
    p_revision: 2,
  })
  expect(JSON.stringify(state.rpc.mock.calls)).not.toContain('private approved words')
  state.officer.mockRejectedValue(new Error('Officer authorization required'))
  await expect(loadOfficerVoice({} as never, 'owner')).rejects.toThrow('Officer')
})
