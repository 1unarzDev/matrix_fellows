import { z } from 'zod'
export const voicePreferencesSchema = z
  .object({
    length: z.enum(['short', 'standard', 'long']),
    formality: z.enum(['conversational', 'neutral', 'formal']),
    opening: z.enum(['direct', 'greeting', 'formal']),
    requestStyle: z.enum(['direct', 'tentative', 'unknown']),
  })
  .strict()
export type OfficerVoicePreferences = z.infer<typeof voicePreferencesSchema>
export interface OfficerVoiceObservation {
  proposal_id: string
  revision: number
  origin: 'approved_edit' | 'unchanged_or_unattributed'
  word_count: number
  formality: OfficerVoicePreferences['formality']
  opening: OfficerVoicePreferences['opening']
  request_style: OfficerVoicePreferences['requestStyle']
}
/** Recent separate messages establish tendencies; repeated revisions cannot dominate. */
export function officerVoiceRecommendations(
  observations: OfficerVoiceObservation[],
  override: unknown = {},
) {
  const distinct = new Map<string, OfficerVoiceObservation>()
  for (const item of observations)
    if (
      item.origin === 'approved_edit' &&
      (!distinct.has(item.proposal_id) || distinct.get(item.proposal_id)!.revision < item.revision)
    )
      distinct.set(item.proposal_id, item)
  const samples = [...distinct.values()]
  const defaults = voicePreferencesSchema.parse({
    length: 'standard',
    formality: 'neutral',
    opening: 'greeting',
    requestStyle: 'tentative',
  })
  const mode = <T extends string>(values: T[], fallback: T): T => {
    const frequencies = new Map<T, number>()
    for (const value of values) frequencies.set(value, (frequencies.get(value) || 0) + 1)
    const ranked = [...frequencies].sort((a, b) => b[1] - a[1])
    return ranked[0] && ranked[0][1] > values.length / 2 ? ranked[0][0] : fallback
  }
  const observed: OfficerVoicePreferences =
    samples.length >= 3
      ? {
          length: mode(
            samples.map((item) =>
              item.word_count < 100 ? 'short' : item.word_count > 180 ? 'long' : 'standard',
            ),
            defaults.length,
          ),
          formality: mode(
            samples.map((item) => item.formality),
            defaults.formality,
          ),
          opening: mode(
            samples.map((item) => item.opening),
            defaults.opening,
          ),
          requestStyle: mode(
            samples.map((item) => item.request_style),
            defaults.requestStyle,
          ),
        }
      : defaults
  const explicit = voicePreferencesSchema.partial().parse(override)
  return {
    preferences: { ...observed, ...explicit },
    observed,
    sampleCount: samples.length,
    source: Object.keys(explicit).length
      ? ('explicit-settings' as const)
      : samples.length >= 3
        ? ('local-approved-edit-observations' as const)
        : ('conservative-defaults' as const),
    notice:
      'Local suggestions from this officer’s approved edits; no draft text or mailbox history is sent to a model.',
  }
}
