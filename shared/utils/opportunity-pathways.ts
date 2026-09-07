import type { Opportunity } from '../types/content'
import { getTimeline } from './opportunity-lifecycle'

function fairStage(item: Opportunity): string | undefined {
  if (item.id === 'catalog:fort-worth-regional-science-fair') return 'FWRSEF'
  if (item.id === 'catalog:txsef') return 'TXSEF'
  if (/^isef-\d{4}:main$/.test(item.id)) return 'ISEF'
}

// Presentation-only grouping. Independent monitors and owner-edited source
// records remain intact, including every checkpoint's original evidence URL.
export function groupOpportunityPathways(items: Opportunity[]): Opportunity[] {
  const published = items.filter((item) => item.published)
  const fairs = published.filter((item) => fairStage(item))
  if (fairs.length < 2) return published
  const regional = fairs.find((item) => fairStage(item) === 'FWRSEF') || fairs[0]!
  const timestamps = fairs.map((item) =>
    item.monitoring ? item.monitoring.lastSuccessAt : item.verifiedAt,
  )
  const oldest = timestamps.some((value) => !value) ? null : [...timestamps].sort()[0]!
  const milestones = fairs.flatMap((item) =>
    getTimeline(item).map((point) => ({
      ...point,
      label: `${fairStage(item)} · ${point.label}`,
      url: point.url || item.url,
    })),
  )
  const stages = fairs.map((item) => fairStage(item)!)
  const pathway: Opportunity = {
    ...regional,
    id: 'pathway:martin-isef',
    title: 'ISEF science fair pathway · Martin HS',
    discipline: 'Science & engineering · FWRSEF / TXSEF / ISEF',
    description:
      'Start with FWRSEF, Martin High School’s regional fair. Follow regional deadlines alongside TXSEF state-fair and Regeneron ISEF international checkpoints in one timeline. Advancement requires selection; these are not three separate open applications.',
    eligibility:
      'Martin students enter through FWRSEF with an adult sponsor and required SRC/IRB approvals. TXSEF and ISEF participation depend on qualifying-fair selection and their own eligibility rules; advancement is not automatic or necessarily sequential.',
    location: 'FWRSEF: UT Arlington · TXSEF: College Station · ISEF: see current host',
    cost: 'Fees and travel vary by fair; confirm with your school sponsor and each organizer.',
    effort:
      'Arrange required approvals before research begins. School deadlines may precede published fair deadlines.',
    lifecycle: fairs.every((item) => item.lifecycle === 'awaiting-announcement')
      ? 'awaiting-announcement'
      : 'announced',
    lifecycleEvidence: `Combines ${stages.join(', ')}. Each checkpoint links to its own organizer. ${fairs.map((item) => `${fairStage(item)}: ${item.lifecycleEvidence || 'Confirm current guidance with the organizer.'}`).join(' ')}`,
    priority: Math.max(...fairs.map((item) => item.priority)),
    edition: '',
    deadline: null,
    eventDate: null,
    milestones,
    verifiedAt: oldest || regional.verifiedAt,
    monitoring: {
      lastSuccessAt: oldest,
      lastCheckedAt: null,
      issue: fairs.some(
        (item) =>
          item.monitoring?.issue || ['discontinued', 'replaced'].includes(item.lifecycle || ''),
      ),
    },
  }
  return [...published.filter((item) => !fairStage(item)), pathway]
}
