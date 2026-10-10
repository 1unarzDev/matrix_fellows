import type { Opportunity, OpportunityFacets } from '../types/content'
import { getOpportunityState } from './opportunity-lifecycle'

/** Apply catalog facets before paginating an independently owned saved collection. */
export function matchesOpportunityFilters(
  item: Opportunity,
  input: Omit<OpportunityFacets, 'archival'>,
  now = Date.now(),
) {
  const key = getOpportunityState(item, now).key
  const status = key === 'awaiting' ? 'awaiting-announcement' : key === 'completed' ? 'closed' : key
  const disciplines = item.disciplines?.length ? item.disciplines : [item.discipline]
  const compensation = item.costs?.compensation?.toLowerCase() || ''
  const aid = item.costs?.aid?.toLowerCase() || ''
  const program = item.costs?.program?.toLowerCase() || ''
  const fees = `${item.costs?.application || ''} ${item.costs?.submission || ''}`.toLowerCase()
  return (
    (!input.disciplines?.length ||
      input.disciplines.some((value) => disciplines.includes(value))) &&
    (!input.kinds?.length ||
      input.kinds.includes(item.kind) ||
      (input.kinds.includes('Internship') && item.routeType === 'internship-pathway')) &&
    (!input.preparationStages?.length ||
      input.preparationStages.some((value) => item.preparationStages?.includes(value))) &&
    (!input.statuses?.length ||
      input.statuses.includes(status as NonNullable<OpportunityFacets['statuses']>[number])) &&
    (!input.modes?.length ||
      input.modes.some((value) => item.participationModes?.includes(value))) &&
    (!input.freeSubmission || /\b(free|no (application |submission )?fee)\b/.test(fees)) &&
    (!input.funding?.length ||
      input.funding.some(
        (value) =>
          (value === 'paid' &&
            /(\b(paid|stipend|salary|wages?)\b|\$\d)/.test(compensation) &&
            !/\bunpaid\b|\bvolunteer\b|\bno (pay|wage|stipend|compensation)|without (pay|compensation)|not eligible|excludes|do not assume|not (paid|verified)|unverified|unknown|\$0(?:\b|\.)/.test(
              compensation,
            )) ||
          (value === 'aid' &&
            /(aid|waiver|scholarship|assistance|reimbursement|cover)/.test(aid)) ||
          (value === 'no-program-fee' &&
            /\b(free|no (attendance|participation|program|tuition)? ?(cost|fee))/.test(program)),
      ))
  )
}
