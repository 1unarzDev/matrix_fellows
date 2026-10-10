import type { ProviderCapability, ReplySyncProvider } from '#shared/types/workspace-providers'

/** Send authorization never silently implies permission to read mailbox content. */
export class UnconnectedReplySync implements ReplySyncProvider {
  status(): ProviderCapability {
    return { configured: false, state: 'disconnected', capabilities: [] }
  }
  async sync(): Promise<never> {
    throw new Error(
      'Reply reading is not connected. Record replies manually; no inbox was checked.',
    )
  }
}
