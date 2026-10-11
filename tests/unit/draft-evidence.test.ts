import {expect,it} from 'vitest'
import {pruneRemovedDraftEvidence} from '../../shared/utils/draft-evidence'
it('removes only complete mapped dependencies, preserving evidence for retained text',()=>{
 const plan={memberClaims:[{id:'a',statement:'I implemented tests.'},{id:'b',statement:'I studied methods.'}],sentenceSupports:[{sentence:'I implemented tests.',claimIds:['a']},{sentence:'I studied methods.',claimIds:['b']}]}
 const result=pruneRemovedDraftEvidence('I implemented tests.\n\nI studied methods.','I studied methods.',['a','b','unmapped'],plan)
 expect(result.evidence_claim_ids).toEqual(['b','unmapped'])
 expect(result.proposal_plan.memberClaims).toEqual([plan.memberClaims[1]])
 expect(pruneRemovedDraftEvidence('I implemented tests.','I implemented tests. (revised)',['a'],plan).evidence_claim_ids).toEqual(['a'])
})
