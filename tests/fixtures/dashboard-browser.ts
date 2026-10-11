import { expect, type Page } from '@playwright/test'
import {
  pursueSchema,
  taskPatchSchema,
  taskCreateSchema,
  activityInputSchema,
  contributionSchema,
} from '../../shared/utils/dashboard-planning'

const owner = '11111111-1111-4111-8111-111111111111'
const targetId = '22222222-2222-4222-8222-222222222222'
const opportunityId = 'catalog:synthetic-chemistry-poster-2027'
const proposalId = '44444444-4444-4444-8444-444444444444'
export const dueDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
const stamp = '2026-10-07T12:00:00Z'
function fixture() {
  return {
    member: { userId: owner, email: 'synthetic-member@example.org', role: 'member' },
    profiles: [
      {
        id: owner,
        fullName: 'Synthetic Chemistry Member',
        interests: ['Chemistry'],
        skills: ['Python'],
        availability: 'Six hours weekly',
        location: 'Arlington',
        goals: 'Reproducible chemistry analysis',
        consentToShare: true,
        workSamples: [
          {
            title: 'Synthetic spectral notebook',
            url: 'https://example.org/notebook',
            contribution: 'Wrote the analysis notebook',
          },
        ],
        updatedAt: stamp,
      },
    ],
    society: {
      name: 'Matrix Fellows',
      description: 'Research society',
      capabilities: [],
      accomplishments: [],
      sponsor: '',
      updatedAt: stamp,
    },
    targets: [
      {
        id: targetId,
        name: 'Synthetic Arlington Chemistry Lab',
        organization: 'Synthetic University',
        kind: 'lab',
        disciplines: ['Chemistry'],
        canonicalUrl: 'https://example.edu/lab',
        contactEmail: 'synthetic-lab@example.edu',
        location: 'Arlington, Texas',
        mode: 'in_person',
        status: 'ready',
        scope: 'both',
        description: 'Synthetic fixture for a bounded spectroscopy contribution.',
        dossier: {
          evidence: [
            {
              url: 'https://example.edu/lab',
              claim: 'Spectroscopy methods; student availability unconfirmed.',
              quote: 'Spectroscopy methods',
              confidence: 'verified',
              retrievedAt: stamp,
            },
          ],
        },
        assessment: { rationale: 'Access requires confirmation.' },
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    proposals: [
      {
        id: proposalId,
        targetId,
        profileId: owner,
        kind: 'student',
        recipient: 'synthetic-lab@example.edu',
        subject: 'Synthetic inquiry about spectroscopy',
        body: 'Hello, I wrote a reproducible notebook. Could I ask about a small validation task?',
        mailboxId: null,
        revision: 1,
        status: 'draft',
        approvedRevision: null,
        approvedFingerprint: null,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    mailboxes: [],
    saves: [],
    catalogSaves: [] as string[],
    plannerItems: [],
    jobs: [],
    settings: {
      paused: true,
      aiEnabled: false,
      termsConfirmed: false,
      weeklyLimit: 5,
      batchLimit: 3,
      queueLimit: 20,
      concurrency: 1,
    },
  }
}
const opportunity = {
  id: opportunityId,
  sourceId: 'synthetic',
  externalId: 'synthetic',
  title: 'Synthetic Chemistry Poster Call',
  kind: 'Competition',
  discipline: 'Chemistry',
  description: 'Clearly synthetic planning fixture, not a live application.',
  deadline: '2027-02-15',
  eventDate: '2027-04-01',
  timezone: null,
  location: 'Arlington',
  eligibility: 'Organizer rules require checking.',
  url: 'https://example.edu/poster',
  verifiedAt: stamp,
  priority: 1,
  published: true,
  edition: '2027',
  highSchoolPolicy: 'unknown',
  milestones: [],
}
export async function setup(page: Page, conflict = false) {
  const workspace = fixture()
  const plan: any = { pursuits: [], tasks: [], activities: [], events: [], capacityHours: 6 }
  const writes: any[] = []
  const decisions: any[] = []
  const references: any[] = []
  const societyContext = { sources: [] as any[], entries: [] as any[], pendingCount: 0 }
  let draftPatches = 0
  await page.route('**/api/opportunities**', (route) =>
    route.fulfill({ json: { items: [opportunity], page: 1, pageCount: 1, total: 1 } }),
  )
  await page.route('**/api/workspace**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    const body = method === 'GET' ? undefined : route.request().postDataJSON()
    const json = (value: any) => route.fulfill({ json: value })
    if (method !== 'GET') writes.push({ path, body })
    if (path === '/api/workspace') return json(workspace)
    if (path === '/api/workspace/plan') return json(plan)
    if (path === '/api/workspace/research-profile')
      return json({
        profile: {
          displayName: workspace.profiles[0]?.fullName || '',
          declaredInterests: workspace.profiles[0]?.interests || [],
          goals: workspace.profiles[0]?.goals || '',
        },
        artifacts: [],
        claims: [],
        providerStatus: 'Local metadata',
      })
    if (path === '/api/workspace/officers') return json({ officers: [] })
    if (path === '/api/workspace/research-profile/preferences')
      return json({ lens: 'nearby', reachableLocations: ['Arlington'] })
    if (path === '/api/workspace/society-context') {
      if (method === 'GET') return json(societyContext)
      const source = {
        id: `society-source-${societyContext.sources.length + 1}`,
        title: body?.title || 'Synthetic context',
        kind: 'text',
        status: 'queued',
        createdAt: stamp,
      }
      societyContext.sources.unshift(source)
      societyContext.pendingCount = 1
      await new Promise((resolve) => setTimeout(resolve, 650))
      source.status = 'processed'
      societyContext.entries.unshift({
        id: `society-entry-${societyContext.entries.length + 1}`,
        sourceId: source.id,
        kind: 'connection',
        title: source.title,
        summary: 'Synthetic connection context',
        organization: 'UTA',
        chapter: 'DFW',
        connectionDate: '2026-10-10',
        status: 'introduced',
        confidence: 'unreviewed',
        sourceCount: 1,
        createdAt: stamp,
        updatedAt: stamp,
      })
      societyContext.pendingCount = 0
      return json({ ok: true, queued: true, sourceId: source.id })
    }
    if (path === `/api/workspace/profiles/${owner}` && method === 'PATCH') {
      await new Promise((resolve) => setTimeout(resolve, 650))
      Object.assign(workspace.profiles[0]!, body, { updatedAt: new Date().toISOString() })
      return json(workspace.profiles[0])
    }
    if (path === '/api/workspace/society' && method === 'PUT') {
      await new Promise((resolve) => setTimeout(resolve, 650))
      Object.assign(workspace.society, body, { updatedAt: new Date().toISOString() })
      return json(workspace.society)
    }
    if (path === '/api/workspace/relationships') return json({ items: [] })
    if (path === '/api/workspace/opportunity-decisions') {
      if (method === 'GET') return json({ decisions })
      const previous = decisions.find((item) => item.opportunityId === body.opportunityId)
      expect(body.expectedVersion).toBe(previous?.version || 0)
      const decision = { ...body, version: (previous?.version || 0) + 1, updatedAt: stamp }
      if (previous) Object.assign(previous, decision)
      else decisions.push(decision)
      return json(decision)
    }
    if (path === '/api/workspace/capture/preview') {
      return json({
        url: body.url,
        title: 'Synthetic source reference',
        kind: 'personal',
        disposition: 'personal',
        item: {
          ...opportunity,
          id: 'personal:synthetic-source',
          title: 'Synthetic source reference',
          url: body.url,
        },
        candidate: {
          ...opportunity,
          id: 'personal:synthetic-source',
          title: 'Synthetic source reference',
          url: body.url,
        },
        reason: 'A bounded opportunity for your own dashboard.',
        confidence: 0.72,
        source: { url: body.url, retrievedAt: stamp, label: 'Bounded source review' },
        notice: 'This opportunity stays private to your dashboard.',
      })
    }
    if (path === '/api/workspace/capture') {
      if (method === 'GET') return json({ references })
      return json({
        url: body.url,
        title: 'Synthetic source reference',
        kind: 'personal',
        disposition: 'personal',
        item: {
          ...opportunity,
          id: 'personal:synthetic-source',
          title: 'Synthetic source reference',
          url: body.url,
        },
        candidate: {
          ...opportunity,
          id: 'personal:synthetic-source',
          title: 'Synthetic source reference',
          url: body.url,
        },
        reason: 'A bounded opportunity for your own dashboard.',
        confidence: 0.72,
        source: { url: body.url, retrievedAt: stamp, label: 'Bounded source review' },
        notice: 'This opportunity stays private to your dashboard.',
      })
    }
    if (path === '/api/workspace/mailboxes')
      return json({ items: [], providers: { gmail: false, outlook: false } })
    if (path === '/api/workspace/auth/session')
      return json({ authenticated: true, configured: true, officer: workspace.member })
    if (path.startsWith('/api/workspace/catalog-saves/') && method === 'DELETE') {
      const id = decodeURIComponent(path.split('/').at(-1)!)
      workspace.catalogSaves = workspace.catalogSaves.filter((value) => value !== id)
      return json({ saved: false })
    }
    if (path === '/api/workspace/catalog-saves') {
      if (method === 'GET') {
        if (new URL(route.request().url()).searchParams.get('idsOnly') === '1')
          return json({ opportunityIds: workspace.catalogSaves })
        const items = workspace.catalogSaves.includes(opportunityId) ? [opportunity] : []
        return json({ items, total: items.length, page: 1, pageCount: 1 })
      }
      expect(body).toEqual({ opportunityIds: [opportunityId] })
      workspace.catalogSaves = [...new Set([...workspace.catalogSaves, ...body.opportunityIds])]
      return json({ opportunityIds: workspace.catalogSaves })
    }
    if (path === '/api/workspace/plan/pursuits') {
      const result = pursueSchema.safeParse(body)
      if (!result.success)
        return route.fulfill({
          status: 422,
          json: { statusMessage: result.error.issues[0]?.message },
        })
      if (!plan.pursuits.length) {
        const id = '55555555-5555-4555-8555-555555555555'
        plan.pursuits.push({
          ...body,
          id,
          status: 'preparing',
          outcome: 'pending',
          submissionReceipt: '',
          version: 1,
          createdAt: stamp,
          updatedAt: stamp,
        })
        plan.tasks.push(
          ...result.data.reviewedTasks.map((task, index) => ({
            ...task,
            id: `66666666-6666-4666-8666-${String(index).padStart(12, '0')}`,
            pursuitId: id,
            activityId: null,
            version: 1,
            createdAt: stamp,
            updatedAt: stamp,
          })),
        )
      }
      return json(plan.pursuits[0])
    }
    if (path.startsWith('/api/workspace/plan/tasks/') && method === 'PATCH') {
      const parsed = taskPatchSchema.parse(body)
      const item = plan.tasks.find((t: any) => t.id === path.split('/').at(-1))
      Object.assign(item, parsed.task, { version: item.version + 1 })
      for (const key of ['opportunityId', 'pursuitId', 'activityId', 'milestoneKey'] as const)
        if (parsed[key] !== undefined) item[key] = parsed[key]
      return json(item)
    }
    if (path === '/api/workspace/plan/tasks' && method === 'POST') {
      const parsed = taskCreateSchema.parse(body)
      const item = {
        ...parsed.task,
        id: `88888888-8888-4888-8888-${String(plan.tasks.length + 1).padStart(12, '0')}`,
        pursuitId: body.pursuitId || null,
        activityId: body.activityId || null,
        opportunityId: parsed.opportunityId || null,
        milestoneKey: parsed.milestoneKey || null,
        version: 1,
        createdAt: stamp,
        updatedAt: stamp,
      }
      plan.tasks.push(item)
      return json(item)
    }
    if (path === '/api/workspace/plan/activities') {
      const item = {
        ...activityInputSchema.parse(body),
        id: '77777777-7777-4777-8777-777777777777',
        contributions: [],
        version: 1,
        createdAt: stamp,
        updatedAt: stamp,
      }
      plan.activities.push(item)
      return json(item)
    }
    if (path.endsWith('/contributions')) {
      const parsed = contributionSchema.parse(body)
      const item = plan.activities[0]
      item.contributions.push({ ...parsed, id: 'contribution-fixture', createdAt: stamp })
      item.version++
      return json(item)
    }
    if (path === `/api/workspace/proposals/${proposalId}` && method === 'PATCH') {
      draftPatches++
      await new Promise((resolve) => setTimeout(resolve, 650))
      if (conflict)
        return route.fulfill({ status: 409, json: { statusMessage: 'Another revision exists.' } })
      Object.assign(workspace.proposals[0]!, body, { revision: body.revision + 1 })
      return json(workspace.proposals[0])
    }
    return json({ items: [] })
  })
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const label = document.createElement('div')
      label.textContent = 'SYNTHETIC FIXTURE · NO LIVE SENDS'
      label.style.cssText =
        'position:fixed;bottom:3px;right:3px;z-index:9999;background:#191a22;color:#d8b977;padding:4px 8px;font:10px sans-serif;pointer-events:none'
      document.body.append(label)
    })
  })
  return {
    workspace,
    plan,
    writes,
    decisions,
    references,
    opportunity,
    patches: () => draftPatches,
  }
}
