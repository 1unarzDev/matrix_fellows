import { beforeEach, expect, it, vi } from 'vitest'
import { createError } from 'h3'
const state = vi.hoisted(() => ({
  body: {} as any,
  cookies: {} as Record<string, string>,
  actor: 'member-id',
  fresh: true,
  origin: true,
  verified: true,
}))
vi.mock('h3', async (original) => ({
  ...(await original<typeof import('h3')>()),
  getCookie: (_e: any, key: string) => state.cookies[key],
  setCookie: (_e: any, key: string, value: string) => {
    state.cookies[key] = value
  },
  deleteCookie: (_e: any, key: string) => {
    delete state.cookies[key]
  },
}))
vi.mock('../../server/utils/workspace-auth', async (original) => ({
  ...(await original<typeof import('../../server/utils/workspace-auth')>()),
  assertWorkspaceOrigin: () => {
    if (!state.origin) throw createError({ statusCode: 403 })
  },
  requireWorkspaceSecurity: async () => {
    if (!state.fresh) throw createError({ statusCode: 401 })
    return { member: { userId: state.actor }, tokens: { access_token: 'member-token' } }
  },
  validateWorkspaceUser: async () => {
    if (!state.verified) throw createError({ statusCode: 403 })
  },
}))
const config = {
  workspaceSessionSecret: 'x'.repeat(32),
  supabaseServiceRoleKey: 'service',
  public: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon',
    siteUrl: 'https://matrixfellows.com',
  },
}
vi.stubGlobal('useRuntimeConfig', () => config)
vi.stubGlobal('defineEventHandler', (handler: any) => handler)
vi.stubGlobal('setHeader', vi.fn())
vi.stubGlobal('readBody', () => state.body)
vi.stubGlobal('createError', createError)
vi.stubGlobal('deleteCookie', (_e: any, key: string) => {
  delete state.cookies[key]
})
vi.stubGlobal('getCookie', (_e: any, key: string) => state.cookies[key])
vi.stubGlobal('getQuery', () => ({ code: 'provider-auth-code' }))
vi.stubGlobal('sendRedirect', (_e: any, location: string) => location)
const password = (await import('../../server/api/workspace/auth/password.post')).default
const callback = (await import('../../server/api/workspace/auth/callback.get')).default
const passkey = (await import('../../server/api/workspace/auth/passkey.post')).default
const { openWorkspace, WORKSPACE_COOKIE, WORKSPACE_FLOW_COOKIE } =
  await import('../../server/utils/workspace-auth')
const { writeCredentialFlow, PASSKEY_COOKIE, RECOVERY_COOKIE } =
  await import('../../server/utils/workspace-credentials')
const event = () => ({ context: {} }) as any
const credential = {
  id: 'id',
  rawId: 'aWQ',
  type: 'public-key',
  response: {
    clientDataJSON: 'e30',
    authenticatorData: btoa(
      String.fromCharCode(...Array.from({ length: 37 }, (_, index) => (index === 32 ? 4 : 0))),
    ),
  },
}
let fetcher: ReturnType<typeof vi.fn>
beforeEach(() => {
  state.body = {}
  state.cookies = {}
  state.actor = 'member-id'
  state.fresh = true
  state.origin = true
  state.verified = true
  fetcher = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }),
    )
  vi.stubGlobal('fetch', fetcher)
})
it('password sign-in keeps tokens HttpOnly and requires authorized confirmed membership', async () => {
  state.body = { action: 'signin', email: 'MEMBER@example.com', password: 'existing-password' }
  expect(await password(event())).toEqual({ ok: true })
  expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
    email: 'member@example.com',
    password: 'existing-password',
  })
  const session = await openWorkspace<any>(
    state.cookies[WORKSPACE_COOKIE]!,
    config.workspaceSessionSecret,
    WORKSPACE_COOKIE,
  )
  expect(session.authenticated_at).toBeGreaterThan(Date.now() - 1000)
  state.cookies = {}
  state.verified = false
  await expect(password(event())).rejects.toMatchObject({ statusCode: 403 })
  expect(state.cookies[WORKSPACE_COOKIE]).toBeUndefined()
})
it('signup and recovery use purpose-bound PKCE without storing passwords', async () => {
  state.body = { action: 'signup', email: 'member@example.com', password: 'a-long-password' }
  await password(event())
  const signup = await openWorkspace<any>(
    state.cookies[WORKSPACE_FLOW_COOKIE]!,
    config.workspaceSessionSecret,
    WORKSPACE_FLOW_COOKIE,
  )
  expect(signup.kind).toBe('signup')
  expect(signup.password).toBeUndefined()
  expect(JSON.parse(fetcher.mock.calls[0]![1].body).code_challenge_method).toBe('s256')
  state.body = { action: 'recover', email: 'unknown@example.com' }
  expect(await password(event())).toEqual({ sent: true })
  const recovery = await openWorkspace<any>(
    state.cookies[WORKSPACE_FLOW_COOKIE]!,
    config.workspaceSessionSecret,
    WORKSPACE_FLOW_COOKIE,
  )
  expect(recovery.kind).toBe('recovery')
  expect(state.cookies[WORKSPACE_COOKIE]).toBeUndefined()
})
it('reset requires a separate unexpired recovery session, never an ordinary session', async () => {
  state.body = { action: 'reset', password: 'new-long-password' }
  await expect(password(event())).rejects.toMatchObject({ statusCode: 401 })
  await writeCredentialFlow(event(), RECOVERY_COOKIE, {
    tokens: { access_token: 'recovery-token' },
  })
  expect(await password(event())).toEqual({ ok: true, signInRequired: true })
  expect(fetcher.mock.calls[0]![0]).toContain('/auth/v1/user')
  expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe('Bearer recovery-token')
  expect(state.cookies[RECOVERY_COOKIE]).toBeUndefined()
  await expect(password(event())).rejects.toMatchObject({ statusCode: 401 })
})
it('recovery callback grants only password reset, while signup grants normal confirmed access', async () => {
  await writeCredentialFlow(event(), WORKSPACE_FLOW_COOKIE, {
    verifier: 'pkce-verifier',
    kind: 'recovery',
  })
  expect(await callback(event())).toBe('/login?recovery=1')
  expect(state.cookies[WORKSPACE_COOKIE]).toBeUndefined()
  expect(state.cookies[RECOVERY_COOKIE]).toBeTruthy()
  expect(state.cookies[WORKSPACE_FLOW_COOKIE]).toBeUndefined()
  expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
    auth_code: 'provider-auth-code',
    code_verifier: 'pkce-verifier',
  })
  state.cookies = {}
  await writeCredentialFlow(event(), WORKSPACE_FLOW_COOKIE, {
    verifier: 'signup-verifier',
    kind: 'signup',
  })
  expect(await callback(event())).toBe('/workspace')
  expect(state.cookies[WORKSPACE_COOKIE]).toBeTruthy()
  state.cookies = {}
  expect(await callback(event())).toBe('/login?error=failed')
})
it('origin and fresh sign-in checks happen before changing credentials', async () => {
  state.body = { action: 'change', password: 'new-long-password' }
  state.origin = false
  await expect(password(event())).rejects.toMatchObject({ statusCode: 403 })
  state.origin = true
  state.fresh = false
  await expect(password(event())).rejects.toMatchObject({ statusCode: 401 })
  state.body = { action: 'register-options' }
  await expect(passkey(event())).rejects.toMatchObject({ statusCode: 401 })
  expect(fetcher).not.toHaveBeenCalled()
})
it('weak new passwords and malformed passkey mutations never reach the provider', async () => {
  state.body = { action: 'signup', email: 'member@example.com', password: 'short' }
  await expect(password(event())).rejects.toMatchObject({ statusCode: 400 })
  state.body = { action: 'delete', id: '../../admin' }
  await expect(passkey(event())).rejects.toMatchObject({ statusCode: 400 })
  expect(fetcher).not.toHaveBeenCalled()
})
it('passkey sign-in binds the provider challenge and never accepts a caller-selected challenge', async () => {
  fetcher.mockResolvedValueOnce(
    Response.json({ challenge_id: 'provider-challenge', options: { challenge: 'test' } }),
  )
  state.body = { action: 'signin-options' }
  expect(await passkey(event())).toEqual({ options: { challenge: 'test' } })
  state.body = { action: 'signin-verify', challenge_id: 'attacker-challenge', credential }
  expect(await passkey(event())).toEqual({ ok: true })
  expect(JSON.parse(fetcher.mock.calls[1]![1].body).challenge_id).toBe('provider-challenge')
  expect(state.cookies[WORKSPACE_COOKIE]).toBeTruthy()
  await expect(passkey(event())).rejects.toMatchObject({ statusCode: 401 })
})
it('passkey registration cannot cross users or become a sign-in ceremony', async () => {
  await writeCredentialFlow(event(), PASSKEY_COOKIE, {
    challenge: 'challenge',
    registration: true,
    user: 'other-member',
  })
  state.body = { action: 'register-verify', credential }
  await expect(passkey(event())).rejects.toMatchObject({ statusCode: 403 })
  await writeCredentialFlow(event(), PASSKEY_COOKIE, {
    challenge: 'challenge',
    registration: true,
    user: 'member-id',
  })
  state.body = { action: 'signin-verify', credential }
  await expect(passkey(event())).rejects.toMatchObject({ statusCode: 403 })
  expect(fetcher).not.toHaveBeenCalled()
})
it('expired challenges fail closed; provider errors do not leak account details', async () => {
  await writeCredentialFlow(
    event(),
    PASSKEY_COOKIE,
    { challenge: 'challenge', registration: false },
    -1,
  )
  state.body = { action: 'signin-verify', credential }
  await expect(passkey(event())).rejects.toMatchObject({ statusCode: 401 })
  state.body = { action: 'signin', email: 'member@example.com', password: 'secret' }
  fetcher.mockResolvedValue(
    Response.json(
      { code: 'invalid_credentials', msg: 'Private provider diagnostic' },
      { status: 400 },
    ),
  )
  await expect(password(event())).rejects.toMatchObject({
    statusMessage: 'This request could not be verified. Check your details or request a new link.',
  })
})
it('a caller cannot bypass required device verification on passkey sign-in', async () => {
  await writeCredentialFlow(event(), PASSKEY_COOKIE, {
    challenge: 'challenge',
    registration: false,
  })
  state.body = {
    action: 'signin-verify',
    credential: {
      ...credential,
      response: { ...credential.response, authenticatorData: btoa('\0'.repeat(37)) },
    },
  }
  await expect(passkey(event())).rejects.toMatchObject({ statusCode: 400 })
  expect(fetcher).not.toHaveBeenCalled()
})
