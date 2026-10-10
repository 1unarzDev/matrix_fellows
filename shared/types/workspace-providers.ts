/** Credentials affect adapters, never the availability of planning or manual drafts. */
export interface ProviderCapability {
  configured: boolean
  state: 'ready' | 'disconnected' | 'missing_scope' | 'revoked' | 'unavailable'
  capabilities: string[]
}
export interface SourceSnapshot {
  url: string
  text: string
  hash: string
  retrievedAt: string
}
export interface DiscoveryProvider {
  status(): ProviderCapability
  discover(input: {
    interests: string[]
    permittedSources: string[]
    limit: number
    signal: AbortSignal
  }): Promise<string[]>
}
export interface SourceReader {
  read(url: string, permittedHosts: string[], signal: AbortSignal): Promise<SourceSnapshot>
}
export interface ResearchModel {
  status(): ProviderCapability
  analyze(input: {
    approvedPublicExcerpt: string
    schemaVersion: string
    promptVersion: string
    signal: AbortSignal
  }): Promise<{
    themes: string[]
    proposals: { title: string; deliverable: string; supportingQuote: string }[]
    unknowns: string[]
  }>
}
export interface ReviewedMail {
  requestId: string
  mailboxId: string
  revision: number
  fingerprint: string
  sender: string
  recipient: string
  subject: string
  body: string
}
export interface WorkspaceMailProvider {
  status(): ProviderCapability
  submit(
    message: ReviewedMail,
  ): Promise<{
    status: 'provider_accepted' | 'failed_before_submission' | 'submission_unknown'
    receipt: string | null
  }>
}
export interface ReplySyncProvider {
  status(): ProviderCapability
  sync(input: {
    authorizedThreadIds: string[]
    cursor: string | null
  }): Promise<{
    cursor: string | null
    replies: { id: string; threadId: string; receivedAt: string; body: string }[]
  }>
}
export interface CalendarProvider {
  status(): ProviderCapability
  export(): Promise<string>
}
