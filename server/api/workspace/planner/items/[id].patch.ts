import { requireWorkspaceMember } from '../../../../utils/workspace-auth'

export default defineEventHandler(async (event) => {
  await requireWorkspaceMember(event)
  throw createError({ statusCode: 410, statusMessage: 'Earlier planner records are read-only. Use the canonical plan in Today or Opportunities.' })
})
