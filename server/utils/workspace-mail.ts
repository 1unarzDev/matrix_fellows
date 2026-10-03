import type { H3Event } from 'h3'
import { createError } from 'h3'
import {
  workspaceConfig,
  sealWorkspace,
  openWorkspace,
  workspaceAuthStorage,
  type WorkspaceOfficer,
} from './workspace-auth'
export type MailProvider = 'gmail' | 'outlook'
export interface WorkspaceMailbox {
  id: string
  owner_id: string
  provider: MailProvider
  email: string
  enabled: boolean
  access_token_encrypted: string
  refresh_token_encrypted: string
  expires_at: string
}
export interface ApprovedEmail {
  recipient: string
  subject: string
  body: string
  sender: string
  correlationId: string
}
export class UncertainSendError extends Error {
  constructor() {
    super('The provider response is uncertain. Check Sent mail before reconciling; do not resend.')
    this.name = 'UncertainSendError'
  }
}
export class ProviderSendError extends Error {
  constructor(public readonly status: number) {
    super('The mail provider declined the request.')
    this.name = 'ProviderSendError'
  }
}
export function mailProviderConfig(event: H3Event, provider: MailProvider) {
  const config = workspaceConfig(event)
  const id = provider === 'gmail' ? config.googleOAuthClientId : config.microsoftOAuthClientId
  const secret =
    provider === 'gmail' ? config.googleOAuthClientSecret : config.microsoftOAuthClientSecret
  if (!id || !secret || config.workspaceMailboxEncryptionKey.length < 32)
    throw createError({
      statusCode: 503,
      statusMessage: `${provider === 'gmail' ? 'Gmail' : 'Outlook'} connection is not configured.`,
    })
  const tenant = config.microsoftOAuthTenant || 'common'
  if (!/^[a-zA-Z0-9.-]{1,100}$/.test(tenant))
    throw createError({ statusCode: 503, statusMessage: 'Outlook tenant is invalid.' })
  return {
    id,
    secret,
    tenant,
    encryptionKey: config.workspaceMailboxEncryptionKey,
    redirect: `${new URL(config.public.siteUrl).origin}/api/workspace/mailboxes/callback`,
  }
}
export function mailboxScopes(provider: MailProvider) {
  return provider === 'gmail'
    ? 'openid email https://www.googleapis.com/auth/gmail.send'
    : 'openid email offline_access User.Read Mail.Send'
}
export function mailboxAuthorizeUrl(
  config: ReturnType<typeof mailProviderConfig>,
  provider: MailProvider,
  state: string,
  challenge: string,
) {
  const url = new URL(
    provider === 'gmail'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/authorize`,
  )
  const params = {
    client_id: config.id,
    redirect_uri: config.redirect,
    response_type: 'code',
    scope: mailboxScopes(provider),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...(provider === 'gmail'
      ? { access_type: 'offline', prompt: 'consent' }
      : { prompt: 'select_account' }),
  }
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}
export async function mailboxTokenRequest(
  config: ReturnType<typeof mailProviderConfig>,
  provider: MailProvider,
  params: Record<string, string>,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(
    provider === 'gmail'
      ? 'https://oauth2.googleapis.com/token'
      : `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.id, client_secret: config.secret, ...params }),
      signal: AbortSignal.timeout(15000),
    },
  )
  if (!response.ok)
    throw createError({ statusCode: 401, statusMessage: 'Reconnect this mailbox to continue.' })
  const tokens = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
  }
  if (!tokens.access_token || !Number.isFinite(tokens.expires_in))
    throw createError({
      statusCode: 502,
      statusMessage: 'Mailbox provider returned an invalid token response.',
    })
  return tokens
}
export async function verifyMailboxIdentity(
  provider: MailProvider,
  token: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(
    provider === 'gmail'
      ? 'https://openidconnect.googleapis.com/v1/userinfo'
      : 'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName',
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) },
  )
  if (!response.ok)
    throw createError({ statusCode: 502, statusMessage: 'Could not verify mailbox identity.' })
  const profile = (await response.json()) as {
    email?: string
    email_verified?: boolean
    mail?: string
    userPrincipalName?: string
  }
  const email =
    provider === 'gmail'
      ? profile.email_verified
        ? profile.email
        : null
      : profile.mail || profile.userPrincipalName
  if (!email || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    throw createError({
      statusCode: 400,
      statusMessage: 'This provider account has no verified email address.',
    })
  return email.toLowerCase()
}
export async function protectMailboxToken(
  token: string,
  key: string,
  id: string,
  kind: 'access' | 'refresh',
) {
  return sealWorkspace({ token }, key, `mailbox:${id}:${kind}`)
}
export async function revealMailboxToken(
  token: string,
  key: string,
  id: string,
  kind: 'access' | 'refresh',
) {
  return (await openWorkspace<{ token: string }>(token, key, `mailbox:${id}:${kind}`)).token
}
export async function mailboxAccessToken(
  event: H3Event,
  mailbox: WorkspaceMailbox,
  officer: WorkspaceOfficer,
) {
  if (mailbox.owner_id !== officer.userId || !mailbox.enabled)
    throw createError({
      statusCode: 403,
      statusMessage: 'Only this mailbox owner can send from it.',
    })
  const config = mailProviderConfig(event, mailbox.provider)
  if (Date.parse(mailbox.expires_at) > Date.now() + 60000)
    return revealMailboxToken(
      mailbox.access_token_encrypted,
      config.encryptionKey,
      mailbox.id,
      'access',
    )
  const refresh = await revealMailboxToken(
    mailbox.refresh_token_encrypted,
    config.encryptionKey,
    mailbox.id,
    'refresh',
  )
  const tokens = await mailboxTokenRequest(config, mailbox.provider, {
    grant_type: 'refresh_token',
    refresh_token: refresh,
  })
  // Compare-and-set protects rotated refresh tokens against concurrent requests.
  const { data, error } = await workspaceAuthStorage(event)
    .from('outreach_mailboxes')
    .update({
      access_token_encrypted: await protectMailboxToken(
        tokens.access_token,
        config.encryptionKey,
        mailbox.id,
        'access',
      ),
      refresh_token_encrypted: await protectMailboxToken(
        tokens.refresh_token || refresh,
        config.encryptionKey,
        mailbox.id,
        'refresh',
      ),
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('id', mailbox.id)
    .eq('owner_id', officer.userId)
    .eq('refresh_token_encrypted', mailbox.refresh_token_encrypted)
    .select('id')
    .maybeSingle()
  if (error || !data)
    throw createError({
      statusCode: 409,
      statusMessage: 'Mailbox connection changed; reload before sending.',
    })
  return tokens.access_token
}
export function validateApprovedEmail(email: ApprovedEmail) {
  if (
    !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email.recipient) ||
    !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email.sender) ||
    /[\r\n]/.test(email.subject) ||
    !email.subject.trim() ||
    email.subject.length > 200 ||
    !email.body.trim() ||
    email.body.length > 20000 ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(email.correlationId)
  )
    throw new Error('Invalid approved email')
}
export async function approvedEmailFingerprint(value: {
  proposalId: string
  revision: number
  mailboxId: string
  sender: string
  recipient: string
  subject: string
  body: string
}) {
  const encoded = JSON.stringify([
    value.proposalId,
    value.revision,
    value.mailboxId,
    value.sender,
    value.recipient,
    value.subject,
    value.body,
  ])
  return [
    ...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encoded))),
  ]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
export function gmailMime(email: ApprovedEmail) {
  validateApprovedEmail(email)
  const base64 = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)))
  const body =
    base64(email.body.replace(/\r?\n/g, '\r\n'))
      .match(/.{1,76}/g)
      ?.join('\r\n') || ''
  return `From: ${email.sender}\r\nTo: ${email.recipient}\r\nSubject: =?UTF-8?B?${base64(email.subject)}?=\r\nMessage-ID: <${email.correlationId}@matrixfellows.com>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${body}`
}
export async function sendApprovedEmail(
  provider: MailProvider,
  accessToken: string,
  email: ApprovedEmail,
  fetcher: typeof fetch = fetch,
) {
  validateApprovedEmail(email)
  let response: Response
  try {
    const mime = provider === 'gmail' ? gmailMime(email) : ''
    const raw =
      provider === 'gmail'
        ? btoa(String.fromCharCode(...new TextEncoder().encode(mime)))
            .replaceAll('+', '-')
            .replaceAll('/', '_')
            .replace(/=+$/, '')
        : ''
    response = await fetcher(
      provider === 'gmail'
        ? 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
        : 'https://graph.microsoft.com/v1.0/me/sendMail',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          provider === 'gmail'
            ? { raw }
            : {
                message: {
                  subject: email.subject,
                  body: { contentType: 'Text', content: email.body },
                  toRecipients: [{ emailAddress: { address: email.recipient } }],
                  internetMessageHeaders: [
                    { name: 'x-matrix-outreach-id', value: email.correlationId },
                  ],
                },
                saveToSentItems: true,
              },
        ),
        signal: AbortSignal.timeout(20000),
      },
    )
  } catch {
    throw new UncertainSendError()
  }
  if (response.status >= 500) throw new UncertainSendError()
  if (!response.ok) throw new ProviderSendError(response.status)
  if (provider === 'outlook') return { accepted: true, providerMessageId: null as string | null }
  try {
    const message = (await response.json()) as { id?: string }
    if (!message.id) throw new Error('No id')
    return { accepted: true, providerMessageId: message.id }
  } catch {
    throw new UncertainSendError()
  }
}
