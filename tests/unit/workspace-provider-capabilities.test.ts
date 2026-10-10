import { expect, it } from 'vitest'
import { UnconnectedReplySync } from '../../server/utils/workspace-provider-capabilities'

it('an unconnected reply adapter never reports an unread inbox as empty', async () => {
  const adapter = new UnconnectedReplySync()
  expect(adapter.status()).toEqual({ configured: false, state: 'disconnected', capabilities: [] })
  await expect(adapter.sync()).rejects.toThrow('no inbox was checked')
})
