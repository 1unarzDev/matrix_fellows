import type { SavedMatchContext } from '../types/outreach-planning'

/** A saved preliminary plan is usable only with the exact context reviewed. */
export function isCurrentOutreachMatch(
  match: { target_id: string; profile_id: string | null; input_versions: Record<string, unknown> } | null,
  context: SavedMatchContext,
): boolean {
  if (!match) return false
  const versions = match.input_versions
  const preferences = versions?.preferences as Record<string, unknown> | undefined
  const sameList = (stored: unknown, current: string[]) =>
    Array.isArray(stored) && stored.length === current.length && stored.every((item, index) => item === current[index])
  return match.target_id === context.targetId && match.profile_id === context.profileId &&
    versions?.schema === 'match-v1' && versions.target === context.targetVersion &&
    versions.profile === context.profileVersion && (versions.project || null) === context.projectId &&
    (versions.option ?? null) === context.contributionOption &&
    preferences?.lens === context.preferences.lens &&
    sameList(preferences?.reachableLocations, context.preferences.reachableLocations) &&
    sameList(preferences?.interests, context.preferences.interests)
}
