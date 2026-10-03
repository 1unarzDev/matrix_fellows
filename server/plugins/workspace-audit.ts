import { workspaceAuthStorage } from '../utils/workspace-auth'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('afterResponse', async (event) => {
    const actor = event.context.workspaceActor as { userId: string } | undefined
    const path = getRequestURL(event).pathname
    if (
      !actor ||
      !path.startsWith('/api/workspace') ||
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method) ||
      getResponseStatus(event) >= 400
    )
      return
    // Database triggers also log row changes, but service-role auth.uid() is
    // empty. This request-level trail records the validated named actor without
    // storing message bodies, profile contents, tokens or query parameters.
    const { error } = await workspaceAuthStorage(event)
      .from('outreach_logs')
      .insert({
        actor_id: actor.userId,
        action: 'workspace_request',
        details: { method: event.method, path },
      })
    if (error) console.error('Workspace audit write failed')
  })
})
