import { describe, it, expect, vi, afterEach } from 'vitest'
const state = vi.hoisted(() => ({
  cookie: '',
  member: null as null | { user_id: string; email: string; role: string; enabled: boolean },
}))
vi.mock('h3', async (importOriginal) => ({
  ...(await importOriginal<typeof import('h3')>()),
  getCookie: () => state.cookie,
  deleteCookie: vi.fn(),
  setCookie: vi.fn(),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.member, error: null }) }),
      }),
    }),
  }),
}))
import {
  sealWorkspace,
  openWorkspace,
  requireWorkspaceOfficer,
  WORKSPACE_COOKIE,
} from '../../server/utils/workspace-auth'
const config = {
  workspaceSessionSecret: 's'.repeat(32),
  supabaseServiceRoleKey: 'service',
  public: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon',
    siteUrl: 'https://matrixfellows.com',
  },
}
afterEach(() => {
  vi.unstubAllGlobals()
  state.cookie = ''
  state.member = null
})
describe('named officer authentication', () => {
  it('authenticates encrypted values and separates token purposes', async () => {
    const sealed = await sealWorkspace(
      { value: 'secret' },
      config.workspaceSessionSecret,
      'purpose',
    )
    expect(await openWorkspace(sealed, config.workspaceSessionSecret, 'purpose')).toEqual({
      value: 'secret',
    })
    await expect(openWorkspace(sealed, config.workspaceSessionSecret, 'other')).rejects.toThrow()
    await expect(
      openWorkspace(sealed.slice(0, -3) + 'abc', config.workspaceSessionSecret, 'purpose'),
    ).rejects.toThrow()
    await expect(sealWorkspace({}, 'short', 'purpose')).rejects.toThrow()
  })
  it('never accepts the existing shared PIN cookie as an officer identity', async () => {
    vi.stubGlobal('useRuntimeConfig', () => config)
    state.cookie = 'shared-pin-cookie'
    await expect(requireWorkspaceOfficer({} as never)).rejects.toMatchObject({ statusCode: 401 })
  })
  it('requires provider-validated identity and enabled membership', async () => {
    vi.stubGlobal('useRuntimeConfig', () => config)
    state.cookie = await sealWorkspace(
      { access_token: 'token', refresh_token: 'refresh', expires_at: Date.now() + 600000 },
      config.workspaceSessionSecret,
      WORKSPACE_COOKIE,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () =>
        Response.json({
          id: 'officer-id',
          email: 'officer@example.com',
          email_confirmed_at: new Date().toISOString(),
        }),
      ),
    )
    await expect(requireWorkspaceOfficer({} as never)).rejects.toMatchObject({ statusCode: 403 })
    state.member = {
      user_id: 'officer-id',
      email: 'officer@example.com',
      role: 'officer',
      enabled: true,
    }
    const event = { context: {} }
    expect(await requireWorkspaceOfficer(event as never)).toMatchObject({
      userId: 'officer-id',
      role: 'officer',
    })
    expect(event.context).toMatchObject({
      workspaceActor: { userId: 'officer-id', role: 'officer' },
    })
    state.member.enabled = false
    await expect(requireWorkspaceOfficer({} as never)).rejects.toMatchObject({ statusCode: 403 })
  })
  it('does not trust an unconfirmed or mismatched email', async () => {
    vi.stubGlobal('useRuntimeConfig', () => config)
    state.cookie = await sealWorkspace(
      { access_token: 'token', refresh_token: 'refresh', expires_at: Date.now() + 600000 },
      config.workspaceSessionSecret,
      WORKSPACE_COOKIE,
    )
    state.member = {
      user_id: 'officer-id',
      email: 'officer@example.com',
      role: 'admin',
      enabled: true,
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          id: 'officer-id',
          email: 'other@example.com',
          email_confirmed_at: new Date().toISOString(),
        }),
      ),
    )
    await expect(requireWorkspaceOfficer({} as never)).rejects.toMatchObject({ statusCode: 403 })
  })
})
