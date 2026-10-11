import type { Opportunity } from './content'
export interface OpportunityDecision {
  opportunityId: string
  decision: 'pass' | 'clear'
  reason: string
  version: number
  updatedAt: string
}
export interface OpportunityCapturePreview {
  url: string
  title: string
  kind: 'catalog' | 'personal' | 'shared-review' | 'rejected' | 'unverified-reference'
  item: Opportunity | null
  candidate: Opportunity | null
  disposition: 'catalog' | 'personal' | 'shared-review' | 'rejected' | 'reference'
  reason: string
  confidence: number | null
  source: { url: string; retrievedAt: string | null; label: string }
  notice: string
}
export interface OpportunityReference {
  id: string
  url: string
  title: string
  verification: 'user-supplied'
  createdAt: string
}

export interface PersonalOpportunity extends Opportunity {
  intakeId: string
  triageReason: string
  triageConfidence: number
}
