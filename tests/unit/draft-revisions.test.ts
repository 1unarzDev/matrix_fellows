import {expect,it} from 'vitest'
import {proposeLocalDraftRevision} from '../../shared/utils/draft-revisions'
it('reduces a generated pilot to an email question without retaining the offer',()=>{
 const body='Hello,\n\nOne possible starting point is a comparison report.\n\nWould it be useful to explore a small pilot? A possible scope is to compare one baseline.\n\nThank you.'
 // Questions can be followed by a scoped explanation in the generated paragraph.
 const result=proposeLocalDraftRevision({body,action:'smaller_ask'})
 expect(result.body).toContain('one focused question')
 expect(result.body).not.toContain('One possible starting point')
})
it('removes only the exact mapped statement and preserves independently edited text',()=>{
 const supports=[{sentence:'They report: wrote the notebook.',claimIds:['claim']}]
 const body='Hello.\n\nThey report: wrote the notebook.\n\nCould we ask a question?'
 expect(proposeLocalDraftRevision({body,action:'remove_claim',claimId:'claim',supports}).body).not.toContain('wrote the notebook')
 const edited=body.replace('wrote the notebook','helped evaluate the notebook')
 expect(proposeLocalDraftRevision({body:edited,action:'remove_claim',claimId:'claim',supports}).body).toBe(edited)
})
