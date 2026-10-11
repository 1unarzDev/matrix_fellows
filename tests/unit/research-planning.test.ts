import {expect,it} from 'vitest'
import cases from '../fixtures/research-quality-cases.json'
import {compileTechnicalContext,compileAuthorizedContext} from '../../shared/utils/research-context'
import {tailorOutreachDraft} from '../../shared/utils/outreach-tailoring'
import {buildContributionPlan} from '../../shared/utils/research-plan'
import type {OutreachTarget,OutreachProfile} from '../../shared/types/outreach'
it('keeps private inputs local and binds source review to an immutable hash',()=>{
 const technical={snapshotHash:'a'.repeat(64),reviewedHash:'a'.repeat(64),snapshotText:'This public benchmark measures grasp success across repeated simulation trials.',reviewedExcerpt:'This public benchmark measures grasp success across repeated simulation trials.',reviewed:true,privateEmail:'private@example.com'}
 expect(JSON.stringify(compileTechnicalContext(technical))).not.toContain('private')
 expect(()=>compileTechnicalContext({...technical,reviewedHash:'b'.repeat(64)})).toThrow('review')
 expect(()=>compileAuthorizedContext('unpaid_public',{})).toThrow('Private')
})
it.each(cases)('keeps the $id case sourced, honestly represented and modest',(fixture)=>{
 const plan=buildContributionPlan(fixture.input.target as OutreachTarget,fixture.input.profile as OutreachProfile)
 const draft=tailorOutreachDraft({...fixture.input,plan} as Parameters<typeof tailorOutreachDraft>[0])
 expect(draft.body).toBe(fixture.after.body)
 expect(plan).toEqual(fixture.plan)
 expect(draft.body).not.toContain('pilot of compare')
 expect(draft.body).toContain('writing on behalf of Alex Example')
 expect(draft.body).not.toContain('I can commit')
 expect(draft.body).not.toContain('a research society at Martin High School')
 expect(draft.body).toContain('Jordan Officer')
 if(!fixture.input.profile.workSamples.length) expect(plan.mode).toBe('question')
 for(const source of plan.evidence) expect(fixture.input.target.dossier.acquisition.pages.some(page=>page.text.includes(source.quote))).toBe(true)
})
it('rejects forged contribution selection instead of trusting a model quote',()=>{
 const fixture=cases.find(fixture=>fixture.id==='model-unsupported-quote')!
 expect(()=>buildContributionPlan(fixture.input.target as OutreachTarget,fixture.input.profile as OutreachProfile,0)).toThrow('supported')
})
