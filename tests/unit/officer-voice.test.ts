import { expect, it } from 'vitest'
import {
  officerVoiceRecommendations,
  type OfficerVoiceObservation,
} from '../../shared/utils/officer-voice'
const observation = (
  id: string,
  revision = 2,
  origin: 'approved_edit' | 'unchanged_or_unattributed' = 'approved_edit',
): OfficerVoiceObservation => ({
  proposal_id: id,
  revision,
  origin,
  word_count: 90,
  formality: 'conversational',
  opening: 'greeting',
  request_style: 'tentative',
})
it('unchanged templates and repeated approvals do not establish a sender style', () => {
  expect(
    officerVoiceRecommendations([observation('a', 1, 'unchanged_or_unattributed')]).source,
  ).toBe('conservative-defaults')
  expect(
    officerVoiceRecommendations([observation('a'), observation('a', 3), observation('a', 4)])
      .sampleCount,
  ).toBe(1)
})
it('three distinct approved edits yield local suggestions with per-sender overrides', () => {
  const result = officerVoiceRecommendations(
    [observation('a'), observation('b'), observation('c')],
    { length: 'long' },
  )
  expect(result.observed.length).toBe('short')
  expect(result.preferences.length).toBe('long')
  expect(result.source).toBe('explicit-settings')
  expect(result.notice).toContain('no draft text')
  expect(() => officerVoiceRecommendations([], { body: 'private draft' })).toThrow()
})
