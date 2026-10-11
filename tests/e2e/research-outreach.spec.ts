import {expect,test} from '@playwright/test'
import {setup} from '../fixtures/dashboard-browser'

test('contextual revision preview cannot replace edits made while it was in flight',async({page})=>{
 const state=await setup(page)
 state.workspace.member.role='officer'
 await page.route('**/api/workspace/proposals/*/revise',async route=>{
  await new Promise(resolve=>setTimeout(resolve,600))
  await route.fulfill({json:{baseRevision:1,subject:'Proposed shorter subject',body:'Proposed shorter message',notices:['Local revision'],mode:'local'}})
 })
 await page.goto('/dashboard?section=drafts')
 await page.getByRole('button',{name:/Synthetic inquiry about spectroscopy/}).click()
 const editor=page.getByLabel('Email',{exact:true})
 await page.getByRole('button',{name:'Shorten',exact:true}).click()
 await editor.fill('Officer typing while the revision request is in flight.')
 await expect(page.getByText('Proposed shorter message',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Use proposed edit',exact:true})).toBeDisabled()
 await expect(editor).toHaveValue('Officer typing while the revision request is in flight.')
})

test('prefilled profile keeps research links separate from authorship and advanced editing',async({page})=>{
 const state=await setup(page)
 const profile:any={profile:{displayName:'Synthetic Chemistry Member',declaredInterests:['Chemistry'],goals:'Learn through questions'},artifacts:[],claims:[],providerStatus:'Local metadata'}
 await page.route('**/api/workspace/research-profile',route=>route.fulfill({json:profile}))
 await page.route('**/api/workspace/research-profile/artifacts',route=>{
  const body=route.request().postDataJSON()
  expect(body.relationship).toBe('interest')
  expect(body.contribution).toBe('')
  profile.artifacts.push({id:'artifact',canonical_url:body.url,state:'reference',summary:'Saved unsupported reference',relationship:'interest',project_id:null})
  return route.fulfill({json:{id:'artifact'}})
 })
 await page.goto('/dashboard?section=profiles')
 await expect(page.getByRole('heading',{name:'Your research overview'})).toBeVisible()
 await expect(page.getByLabel('Full name',{exact:true})).toBeHidden()
 await page.getByLabel('Add your research',{exact:true}).fill('https://example.org/team-paper.pdf')
 await page.getByRole('button',{name:'Add research link',exact:true}).click()
 await expect(page.getByText('Interest only',{exact:false})).toBeVisible()
 await expect(page.getByText('Saved unsupported reference',{exact:true})).toBeVisible()
 await page.reload()
 await expect(page.getByText('Saved unsupported reference',{exact:true})).toBeVisible()
 expect(state.workspace.profiles[0]?.workSamples).toHaveLength(1)
})

test('research link shows an immediate processing state while the save is in flight',async({page})=>{
 const state=await setup(page)
 const profile:any={profile:{displayName:'Synthetic Chemistry Member',declaredInterests:['Chemistry'],goals:'Learn through questions'},artifacts:[],claims:[],providerStatus:'Local metadata'}
 await page.route('**/api/workspace/research-profile',route=>route.fulfill({json:profile}))
 await page.route('**/api/workspace/research-profile/artifacts',async route=>{
  const body=route.request().postDataJSON()
  profile.artifacts.push({id:'artifact',canonical_url:body.url,state:'pending',summary:'Processing source metadata…',relationship:'interest',project_id:null})
  await new Promise(resolve=>setTimeout(resolve,700))
  await route.fulfill({json:{id:'artifact'}})
 })
 await page.goto('/dashboard?section=profiles')
 await page.getByLabel('Add your research',{exact:true}).fill('https://example.org/slow-paper.pdf')
 await page.getByRole('button',{name:'Add research link',exact:true}).click()
 await expect(page.getByText('Queued — source metadata is being gathered…',{exact:true})).toBeVisible()
 await expect(page.getByRole('status')).toContainText('Research link queued')
 expect(state.workspace.member.role).toBe('member')
})
