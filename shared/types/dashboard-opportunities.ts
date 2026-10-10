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
  kind: 'catalog' | 'unverified-reference'
  item: Opportunity | null
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
