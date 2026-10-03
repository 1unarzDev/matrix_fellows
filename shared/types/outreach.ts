export type OutreachStatus = 'needs_review' | 'ready' | 'deferred' | 'rejected' | 'contacted'
export type OutreachKind = 'pi' | 'lab' | 'postdoc' | 'phd' | 'program' | 'student'
export type OutreachScope = 'society' | 'student' | 'both'
export interface OutreachEvidence {
  url: string
  claim: string
  quote?: string
  retrievedAt: string
  confidence: 'verified' | 'inferred' | 'unknown'
}
export interface OutreachAssessment {
  fit: number
  openness: number
  contribution: number
  feasibility: number
  evidence: number
  confidence: 'high' | 'medium' | 'low'
  rationale: string
  blockers: string[]
}
export interface OutreachTarget {
  id: string
  name: string
  kind: OutreachKind
  organization: string
  disciplines: string[]
  canonicalUrl: string
  contactEmail: string | null
  location: string
  mode: 'remote' | 'in_person' | 'hybrid' | 'unknown'
  status: OutreachStatus
  scope: OutreachScope
  description: string
  notes?: string
  deferUntil?: string | null
  rejectionReason?: string
  dossier: {
    evidence: OutreachEvidence[]
    research?: string
    opportunities?: string
    eligibility?: string
    proposalAngles?: string[]
    [key: string]: unknown
  }
  assessment: Partial<OutreachAssessment>
  createdAt: string
  updatedAt: string
}
export interface OutreachProfile {
  id: string
  fullName: string
  interests: string[]
  skills: string[]
  affiliations?: string[]
  achievements?: { title: string; description: string; url: string }[]
  introduction?: string
  signature?: string
  availability: string
  location: string
  workSamples: { title: string; url: string; contribution: string }[]
  goals: string
  consentToShare: boolean
  updatedAt: string
}
export interface OutreachSociety {
  name: string
  description: string
  capabilities: string[]
  accomplishments: { title: string; description: string; url?: string; verified: boolean }[]
  sponsor: string
  updatedAt: string
  revision?: number
}
export interface OutreachProposal {
  id: string
  targetId: string
  profileId: string | null
  kind: 'society' | 'student'
  recipient: string
  subject: string
  body: string
  mailboxId: string | null
  revision: number
  status: 'draft' | 'approved' | 'sent' | 'archived'
  approvedRevision: number | null
  approvedFingerprint: string | null
  createdAt: string
  updatedAt: string
}
export interface OutreachMailbox {
  id: string
  email: string
  provider: 'gmail' | 'outlook'
  ownerId: string
  enabled: boolean
}
export interface OutreachMember {
  userId: string
  email: string
  role: 'officer' | 'admin'
}
export interface OutreachSettings {
  paused: boolean
  aiEnabled: boolean
  termsConfirmed: boolean
  weeklyLimit: number
  batchLimit: number
  queueLimit: number
  concurrency: number
}
export interface OutreachWorkspace {
  member: OutreachMember
  profiles: OutreachProfile[]
  society: OutreachSociety
  targets: OutreachTarget[]
  proposals: OutreachProposal[]
  mailboxes: OutreachMailbox[]
  saves: string[]
  catalogSaves?: string[]
  plannerItems?: OutreachPlannerItem[]
  jobs: Record<string, unknown>[]
  settings: OutreachSettings
}
export interface OutreachPlannerItem {
  id: string
  title: string
  targetId: string | null
  profileId: string | null
  opportunityId: string | null
  dueAt: string | null
  notes: string
  completed: boolean
}
