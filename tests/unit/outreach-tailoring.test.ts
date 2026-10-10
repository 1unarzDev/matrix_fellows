import { expect, it } from 'vitest'
import { rankedWorkSamples, tailorOutreachDraft } from '../../shared/utils/outreach-tailoring'
import type { OutreachProfile, OutreachSociety, OutreachTarget } from '../../shared/types/outreach'
const target = {
  name: 'Robotics lab',
  organization: 'Research institution',
  disciplines: ['Robotics'],
  description: 'Soft vine robotics and pneumatic manipulation',
  dossier: { evidence: [] },
} as unknown as OutreachTarget
const profile = {
  fullName: 'Officer',
  interests: ['Robotics'],
  skills: [],
  workSamples: [
    {
      title: 'Biomedical imaging',
      contribution: 'Image segmentation',
      url: 'https://example.org/images',
    },
    {
      title: 'Vine robotics',
      contribution: 'Pneumatic robot control',
      url: 'https://example.org/robot',
    },
  ],
} as unknown as OutreachProfile
const society = {
  name: 'Matrix Fellows',
  accomplishments: [
    {
      title: 'Vine robots',
      description: 'Vine robotics control study',
      url: 'https://example.org/robot',
      verified: true,
    },
    { title: 'Unsupported award', description: 'World-leading robotics award', verified: false },
  ],
} as unknown as OutreachSociety
it('selects relevant work locally without sending profiles to a model', () => {
  expect(rankedWorkSamples(profile, target)[0]?.sample.title).toBe('Vine robotics')
  const draft = tailorOutreachDraft({
    target,
    society,
    profile,
    kind: 'student',
    style: 'replication',
  })
  expect(draft.body).toContain('Pneumatic robot control')
  expect(draft.body).toContain('[REVIEW:')
  expect(draft.body).not.toContain('Image segmentation')
})
it('uses only verified society facts and never fabricates scholarly reading', () => {
  const draft = tailorOutreachDraft({
    target,
    society,
    senderName: 'Officer',
    kind: 'society',
    style: 'conversation',
  })
  expect(draft.body).toContain('Vine robotics control study')
  expect(draft.body).not.toContain('World-leading')
  expect(draft.body).toContain('add one verified research-specific observation')
})
