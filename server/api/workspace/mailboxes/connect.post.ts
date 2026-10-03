import { z } from 'zod'
import {
  requireWorkspaceOfficer,
  assertWorkspaceOrigin,
  randomToken,
  hashText,
  sealWorkspace,
  workspaceCookieOptions,
  workspaceConfig,
} from '../../../utils/workspace-auth'
import { mailProviderConfig, mailboxAuthorizeUrl } from '../../../utils/workspace-mail'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  assertWorkspaceOrigin(event)
  const officer = await requireWorkspaceOfficer(event)
  const { provider } = z
    .object({ provider: z.enum(['gmail', 'outlook']) })
    .parse(await readBody(event))
  const config = mailProviderConfig(event, provider)
  const state = randomToken(),
    verifier = randomToken()
  setCookie(
    event,
    'matrix-mailbox-flow',
    await sealWorkspace(
      { state, verifier, provider, userId: officer.userId, expires: Date.now() + 600000 },
      workspaceConfig(event).workspaceSessionSecret,
      'matrix-mailbox-flow',
    ),
    workspaceCookieOptions(event, 600),
  )
  return { url: mailboxAuthorizeUrl(config, provider, state, await hashText(verifier)) }
})
