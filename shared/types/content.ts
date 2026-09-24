export interface Meeting {
  title: string
  date: string
  time: string
  timezone: string
  location: string
  topics: string[]
  url: string
}
export type MeetingState = 'confirmed' | 'tentative'
export type MeetingDisplayStatus = MeetingState | 'past'
export interface MeetingResource {
  title: string
  url: string
  note: string
}
export interface MeetingEvent extends Meeting {
  id: string
  summary: string
  state: MeetingState
  resources: MeetingResource[]
  published?: boolean
}
export type CalendarOpportunityKind = 'deadline' | 'event'
export type CalendarOpportunityState = 'confirmed' | 'tentative'
export interface CalendarOpportunitySelection {
  opportunityId: string
  enabled: boolean
  includeDeadlines: boolean
  includeEvents: boolean
  priority: number
}
export interface CalendarOpportunityEntry {
  id: string
  opportunityId: string
  opportunitySlug?: string
  opportunityTitle: string
  milestoneTitle: string
  summary: string
  date: string
  timezone: string | null
  originalTimezone?: string | null
  precision: 'exact' | 'date-only'
  location: string
  kind: CalendarOpportunityKind
  state: CalendarOpportunityState
  requirements: string[]
  contributionFormat?: string
  officialUrl: string
  submissionUrl?: string
  detailUrl?: string
  evidence: string
  conflict?: string | null
  verifiedAt: string
  priority: number
}
export interface Project {
  id: string
  title: string
  field: string
  summary: string
  details: string
  status: string
  url: string
}
export interface Benefit {
  title: string
  description: string
  url: string
}
export interface SiteContent {
  meeting: Meeting
  projects: Project[]
  benefits: Benefit[]
  links: { join: string; contact: string }
}
export type OpportunityKind =
  | 'Competition'
  | 'Conference'
  | 'Workshop'
  | 'Publication'
  | 'Program'
  | 'Internship'
  | 'Summer program'
export type HighSchoolPolicy = 'supported' | 'excluded' | 'not-stated'
export type PreparationStage =
  'idea' | 'prototype' | 'preliminary-results' | 'completed-research' | 'learning-team-practice'
export type OpportunityStatus =
  'open' | 'upcoming' | 'awaiting-announcement' | 'closed' | 'rolling' | 'historical' | 'unknown'
export interface OpportunityEvidenceRef {
  field: string
  url: string
  quote?: string
  observedAt: string
  confirmedAt?: string | null
  contentHash?: string
}
export interface OpportunityCost {
  application?: string | null
  submission?: string | null
  program?: string | null
  compensation?: string | null
  registration?: string | null
  accompanyingAdult?: string | null
  travel?: string | null
  materials?: string | null
  publication?: string | null
  aid?: string | null
}
export interface OpportunityMilestone {
  superseded?: boolean
  label: string
  date: string
  kind: 'deadline' | 'event' | 'opens' | 'results'
  timezone: string | null
  evidence: string
  url: string
  role?:
    | 'abstract'
    | 'submission'
    | 'qualification'
    | 'nomination'
    | 'ethics-approval'
    | 'registration'
    | 'camera-ready'
    | 'event'
    | 'results'
  precision?: 'exact' | 'date-only'
  originalTimezone?: string | null
  tentative?: boolean
  conflict?: string | null
  sourceRef?: string
}
export interface Opportunity {
  id: string
  sourceId: string
  externalId: string
  title: string
  kind: OpportunityKind
  discipline: string
  description: string
  eventDate: string | null
  deadline: string | null
  timezone: string | null
  location: string
  eligibility: string
  url: string
  submissionUrl?: string
  verifiedAt: string
  priority: number
  published: boolean
  milestones?: OpportunityMilestone[]
  provenance?: { url: string; contentHash: string; parserVersion: string }
  lifecycle?:
    'announced' | 'rolling' | 'awaiting-announcement' | 'discontinued' | 'replaced' | 'unknown'
  lifecycleEvidence?: string
  edition?: string
  cost?: string
  effort?: string
  monitoring?: { lastCheckedAt: string | null; lastSuccessAt: string | null; issue: boolean }
  slug?: string
  canonicalId?: string
  aliases?: string[]
  organizer?: string
  series?: { id: string; name: string } | null
  parent?: {
    id?: string
    name: string
    kind: 'organization' | 'series' | 'edition' | 'session'
  } | null
  routeType?:
    | 'paper'
    | 'short-paper'
    | 'poster'
    | 'workshop-contribution'
    | 'challenge'
    | 'competition'
    | 'program'
    | 'internship'
    | 'summer-program'
    | 'publication'
    | 'attendance'
  contributionFormat?: string
  disciplines?: string[]
  /** Reviewed 0–100 topical fit used only when that discipline is explicitly filtered. */
  disciplineAffinity?: Record<string, number>
  topics?: string[]
  highSchoolPolicy?: HighSchoolPolicy
  highSchoolEvidence?: string
  restrictions?: {
    grades?: string | null
    ages?: string | null
    geography?: string | null
    team?: string | null
    adultSponsor?: string | null
    schoolNomination?: string | null
    authorEligibility?: string | null
    minorAttendance?: string | null
    platformAccount?: string | null
  }
  preparationStages?: PreparationStage[]
  prerequisites?: string[]
  costs?: OpportunityCost
  outcomes?: string[]
  participationModes?: Array<
    'in-person' | 'remote-submission' | 'remote-presentation' | 'remote-participation' | 'hybrid'
  >
  archival?: boolean | null
  fieldEvidence?: OpportunityEvidenceRef[]
  searchVersion?: number
}
export interface OpportunityFacets {
  disciplines?: string[]
  kinds?: OpportunityKind[]
  highSchoolPolicies?: HighSchoolPolicy[]
  preparationStages?: PreparationStage[]
  statuses?: OpportunityStatus[]
  modes?: Array<
    'in-person' | 'remote-submission' | 'remote-presentation' | 'remote-participation' | 'hybrid'
  >
  funding?: Array<'paid' | 'aid' | 'no-program-fee'>
  freeSubmission?: boolean
  archival?: boolean
}
export interface OpportunitySearchResult {
  items: Opportunity[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  facets: Record<string, Record<string, number>>
  mode: 'lexical' | 'hybrid' | 'fallback'
  version: string
  unavailable?: boolean
}
export interface PublicContent {
  content: SiteContent
  opportunities: Opportunity[]
  meetings: MeetingEvent[]
  calendarEntries: CalendarOpportunityEntry[]
  configured: boolean
  unavailable?: boolean
}
export interface ImportSource {
  id: string
  name: string
  kind: 'json' | 'rss' | 'official'
  url: string
  enabled: boolean
}
