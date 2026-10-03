import { requireWorkspaceOfficer } from '../../utils/workspace-auth'
import {
  workspaceStorage,
  workspaceResult,
  profileFromRow,
  targetFromRow,
  proposalFromRow,
  societyFromRow,
} from '../../utils/workspace-storage'
export default defineEventHandler(async (event) => {
  const member = await requireWorkspaceOfficer(event)
  const db = workspaceStorage(event)
  const [
    profiles,
    society,
    targets,
    proposals,
    mailboxes,
    saves,
    jobs,
    settings,
    catalogSaves,
    plannerItems,
  ] = await Promise.all([
    db
      .from('outreach_profiles')
      .select('*')
      .eq('created_by', member.userId)
      .order('updated_at', { ascending: false }),
    db.from('outreach_society').select('*').eq('id', true).single(),
    db.from('outreach_targets').select('*').order('created_at', { ascending: false }).limit(250),
    db
      .from('outreach_proposals')
      .select('*')
      .or(`kind.eq.society,created_by.eq.${member.userId}`)
      .order('updated_at', { ascending: false })
      .limit(250),
    db
      .from('outreach_mailboxes')
      .select('id,email,provider,owner_id,enabled')
      .eq('owner_id', member.userId),
    db.from('outreach_saves').select('target_id').eq('user_id', member.userId),
    db
      .from('outreach_jobs')
      .select('id,kind,status,attempts,error,created_at,target_id,source_id')
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('outreach_settings').select('*').eq('id', true).single(),
    db.from('outreach_catalog_saves').select('opportunity_id').eq('user_id', member.userId),
    db
      .from('outreach_planner_items')
      .select('*')
      .eq('user_id', member.userId)
      .order('created_at', { ascending: false })
      .limit(200),
  ])
  const cfg = workspaceResult(settings)
  return {
    member: { userId: member.userId, email: member.email, role: member.role },
    profiles: workspaceResult(profiles).map(profileFromRow),
    society: societyFromRow(workspaceResult(society)),
    targets: workspaceResult(targets).map(targetFromRow),
    proposals: workspaceResult(proposals).map(proposalFromRow),
    mailboxes: workspaceResult(mailboxes).map((row) => ({
      id: row.id,
      email: row.email,
      provider: row.provider,
      ownerId: row.owner_id,
      enabled: row.enabled,
    })),
    saves: workspaceResult(saves).map((row) => row.target_id),
    catalogSaves: workspaceResult(catalogSaves).map((row) => row.opportunity_id),
    plannerItems: workspaceResult(plannerItems).map((row) => ({
      id: row.id,
      title: row.title,
      targetId: row.target_id,
      profileId: row.profile_id,
      opportunityId: row.opportunity_id,
      dueAt: row.due_at,
      notes: row.notes,
      completed: row.completed,
    })),
    jobs: workspaceResult(jobs),
    settings: {
      paused: cfg.paused,
      aiEnabled: cfg.ai_enabled,
      termsConfirmed: cfg.terms_confirmed,
      weeklyLimit: cfg.weekly_limit,
      batchLimit: cfg.batch_limit,
      queueLimit: cfg.queue_limit,
      concurrency: cfg.concurrency,
    },
  }
})
