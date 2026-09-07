export interface Meeting {
  title: string
  date: string
  time: string
  timezone: string
  location: string
  topics: string[]
  url: string
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
export type OpportunityKind = 'Competition' | 'Conference' | 'Workshop' | 'Publication' | 'Program'
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
  verifiedAt: string
  priority: number
  published: boolean
}
export interface PublicContent {
  content: SiteContent
  opportunities: Opportunity[]
  configured: boolean
  unavailable?: boolean
}
export interface ImportSource {
  id: string
  name: string
  kind: 'json' | 'rss'
  url: string
  enabled: boolean
}
