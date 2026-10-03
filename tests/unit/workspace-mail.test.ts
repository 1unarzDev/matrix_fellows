import { describe, it, expect, vi } from 'vitest'
import {
  mailboxScopes,
  mailboxAuthorizeUrl,
  approvedEmailFingerprint,
  gmailMime,
  sendApprovedEmail,
  UncertainSendError,
  ProviderSendError,
  protectMailboxToken,
  revealMailboxToken,
} from '../../server/utils/workspace-mail'
const email = {
  recipient: 'researcher@example.edu',
  sender: 'officer@example.com',
  subject: 'A small research collaboration',
  body: 'Hello Professor,\nCould we help validate your results?',
  correlationId: '12345678-1234-4321-1234-123456789abc',
}
describe('approved provider sending', () => {
  it('requests send-only permissions rather than reading entire inboxes', () => {
    expect(mailboxScopes('gmail')).toContain('gmail.send')
    expect(mailboxScopes('gmail')).not.toContain('gmail.modify')
    expect(mailboxScopes('outlook')).toContain('Mail.Send')
    expect(mailboxScopes('outlook')).not.toContain('Mail.Read')
    const config = {
      id: 'client',
      secret: 'secret',
      tenant: 'common',
      encryptionKey: 'k'.repeat(32),
      redirect: 'https://matrixfellows.com/api/workspace/mailboxes/callback',
    }
    const url = new URL(mailboxAuthorizeUrl(config, 'gmail', 'state', 'challenge'))
    expect(url.searchParams.get('state')).toBe('state')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('access_type')).toBe('offline')
  })
  it('rejects header injection before making a provider request', async () => {
    const fetcher = vi.fn()
    await expect(
      sendApprovedEmail(
        'gmail',
        'token',
        { ...email, subject: 'Test\r\nBcc: third@example.com' },
        fetcher,
      ),
    ).rejects.toThrow('Invalid approved email')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('encodes Unicode MIME and fixes the approved sender', () => {
    const mime = gmailMime({ ...email, subject: 'Research — collaboration' })
    expect(mime).toContain('From: officer@example.com')
    expect(mime).toContain('Subject: =?UTF-8?B?')
    expect(mime).toContain('Content-Transfer-Encoding: base64')
  })
  it('labels Graph 202 accepted and does not invent message/delivery confirmation', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    expect(await sendApprovedEmail('outlook', 'token', email, fetcher)).toEqual({
      accepted: true,
      providerMessageId: null,
    })
    const body = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(body.message.from).toBeUndefined()
    expect(body.saveToSentItems).toBe(true)
  })
  it('preserves Gmail provider IDs without claiming delivery', async () => {
    expect(
      await sendApprovedEmail(
        'gmail',
        'token',
        email,
        vi.fn().mockResolvedValue(Response.json({ id: 'message-id' })),
      ),
    ).toEqual({ accepted: true, providerMessageId: 'message-id' })
  })
  it('never retries ambiguous network or provider 5xx responses', async () => {
    for (const fetcher of [
      vi.fn().mockRejectedValue(new Error('timeout')),
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
      vi.fn().mockResolvedValue(Response.json({})),
    ]) {
      await expect(sendApprovedEmail('gmail', 'token', email, fetcher)).rejects.toBeInstanceOf(
        UncertainSendError,
      )
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
    await expect(
      sendApprovedEmail(
        'gmail',
        'token',
        email,
        vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
      ),
    ).rejects.toBeInstanceOf(ProviderSendError)
  })
  it('binds approval to sender, recipient, exact content and revision', async () => {
    const approved = { proposalId: 'p', revision: 1, mailboxId: 'm', ...email }
    const hash = await approvedEmailFingerprint(approved)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    for (const change of [
      { revision: 2 },
      { sender: 'other@example.com' },
      { recipient: 'other@example.edu' },
      { body: email.body + '!' },
    ])
      expect(await approvedEmailFingerprint({ ...approved, ...change })).not.toBe(hash)
  })
  it('encrypts mailbox tokens and binds ciphertext to mailbox and token kind', async () => {
    const protectedToken = await protectMailboxToken(
      'sensitive-token',
      'k'.repeat(32),
      'mailbox-1',
      'refresh',
    )
    expect(protectedToken).not.toContain('sensitive-token')
    expect(await revealMailboxToken(protectedToken, 'k'.repeat(32), 'mailbox-1', 'refresh')).toBe(
      'sensitive-token',
    )
    await expect(
      revealMailboxToken(protectedToken, 'k'.repeat(32), 'mailbox-2', 'refresh'),
    ).rejects.toThrow()
    await expect(
      revealMailboxToken(protectedToken, 'k'.repeat(32), 'mailbox-1', 'access'),
    ).rejects.toThrow()
  })
})
