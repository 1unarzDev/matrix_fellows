import type { ContributionPlan } from '../utils/research-plan'
import type { ResearchFit, ResearchPreferences } from '../utils/research-fit'

export interface OutreachMatchPreview {
  id: string
  targetId: string
  profileId: string | null
  projectId: string | null
  plan: ContributionPlan
  access: ResearchFit
  topicOverlap: string
  coordination: { id: string; ownerId: string; stage: string }[]
  historyStatus: string
}

export interface SavedMatchContext {
  targetId: string
  profileId: string | null
  targetVersion: string
  profileVersion: string | null
  projectId: string | null
  contributionOption: number | null
  preferences: ResearchPreferences
}
