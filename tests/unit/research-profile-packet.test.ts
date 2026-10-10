import { beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
const mock = vi.hoisted(() => ({ from: vi.fn(), officer: vi.fn(), rpc: vi.fn() }))
vi.mock('../../server/utils/workspace-auth', () => ({ requireWorkspaceOfficer: mock.officer, hashText: async () => 'hash' }))
vi.mock('../../server/utils/workspace-storage', () => ({ workspaceStorage: () => mock, workspaceResult: (r: any) => { if (r.error) throw r.error; return r.data } }))
import { researchProfilePacket, shareableResearchProfile } from '../../server/utils/research-profile'
const event = {} as H3Event
const profile = { id: 'p', subject_user_id: 'member', full_name: 'Member', interests: ['Robotics & engineering'], goals: 'Learn', availability: 'Unknown', location: 'Arlington', consent_to_share: true }
function query(data: unknown) {
 const q: any = { then: (resolve: (r: unknown)=>unknown) => Promise.resolve({ data, error: null }).then(resolve) }
 for(const method of ['select','eq','not','is','order','limit','insert'])q[method] = vi.fn(()=>q)
 q.maybeSingle = vi.fn(async()=>({data,error:null}));q.single=q.maybeSingle
 return q
}
beforeEach(()=>vi.clearAllMocks())
it('disabled subjects cannot be compiled for officer drafting even if sharing was previously enabled', async()=>{
 mock.from.mockReturnValueOnce(query(profile)).mockReturnValueOnce(query(null))
 await expect(researchProfilePacket(event,'p')).rejects.toMatchObject({ statusCode:404 })
 expect(mock.from.mock.calls.map(c=>c[0])).toEqual(['outreach_profiles','outreach_members'])
})
it('officer packet uses only accepted shared active claims and carries local-only provider boundary',async()=>{
 const profileQuery=query(profile),membershipQuery=query({user_id:'member'}),claimsQuery=query([{id:'c',statement:'I wrote tests',origin:'member',support_state:'self_reported',snapshot_id:null}])
 mock.from.mockReturnValueOnce(profileQuery).mockReturnValueOnce(membershipQuery).mockReturnValueOnce(claimsQuery)
 const packet=await researchProfilePacket(event,'p')
 expect(packet).toMatchObject({topicIds:['robotics'],providerEligibility:'local-only',claims:[{id:'c',support:'self_reported'}]})
 expect(claimsQuery.eq).toHaveBeenCalledWith('sharing_scope','officer');expect(claimsQuery.eq).toHaveBeenCalledWith('adoption','accepted');expect(claimsQuery.is).toHaveBeenCalledWith('withdrawn_at',null)
 expect(JSON.stringify(packet)).not.toMatch(/email|guardian|studentId|feedback/)
})
it('shareable projection enforces live officer eligibility before private retrieval',async()=>{
 mock.officer.mockRejectedValueOnce(Object.assign(new Error('Officer required'),{statusCode:403}))
 await expect(shareableResearchProfile(event,'p')).rejects.toMatchObject({statusCode:403})
 expect(mock.from).not.toHaveBeenCalled()
})
