import { describe, expect, it } from 'vitest'
import type { OutreachTarget } from '../../shared/types/outreach'
import {
  assessResearchEligibility,
  explainResearchFit,
  orderResearchTargets,
  researchProgramRules,
} from '../../shared/utils/research-fit'

const fact = (value: boolean | number | string) => ({ value, origin: 'member' as const })
const target = (
  id: string,
  location: string,
  mode: OutreachTarget['mode'],
  disciplines = ['Chemistry'],
): OutreachTarget => ({
  id,
  name: id,
  organization: 'Institution',
  kind: 'lab',
  disciplines,
  canonicalUrl: 'https://example.edu/',
  contactEmail: null,
  location,
  mode,
  scope: 'both',
  status: 'needs_review',
  description: 'A research lab',
  dossier: { evidence: [] },
  assessment: {},
  createdAt: '',
  updatedAt: '',
})
describe('dated first-party program rules (2026-10-07)', () => {
  it('excludes prior STARS research, rather than treating all high-school students alike', () => {
    const result = assessResearchEligibility(researchProgramRules.stars, {
      priorResearchExperience: [fact(true)],
    })
    expect(result.state).toBe('excluded')
    expect(result.checks[0]?.rule.excerpt).toContain('not eligible')
    expect(result.verificationTasks.length).toBeGreaterThan(0)
  })
  it('requires incoming first-year UTD status for Clark and retains unknown/conflict separately', () => {
    expect(
      assessResearchEligibility(researchProgramRules.clark, { incomingFirstYearUtd: [fact(false)] })
        .state,
    ).toBe('excluded')
    expect(assessResearchEligibility(researchProgramRules.clark, {}).state).toBe('unknown')
    expect(
      assessResearchEligibility(researchProgramRules.clark, {
        incomingFirstYearUtd: [fact(true), fact(false)],
      }).state,
    ).toBe('conflict')
    expect(
      assessResearchEligibility(researchProgramRules.clark, { incomingFirstYearUtd: [fact(true)] })
        .state,
    ).toBe('eligible')
  })
  it('does not call a rule-free assessment eligible or interpret retrieval as a cycle', () => {
    expect(assessResearchEligibility([], {}).state).toBe('unknown')
    expect(researchProgramRules.clark[0]?.cycle).toBeUndefined()
    expect(researchProgramRules.clark[0]?.verifiedAt).toBe('2026-10-07')
  })
  it('requires all STARS rules including program-date age without asking for a birth date', () => {
    const facts = {
      priorResearchExperience: [fact(false)],
      currentGrade: [fact(11)],
      highSchoolEnrolled: [fact(true)],
      atLeast16ByProgramJune1: [fact(true)],
      usCitizenNationalOrWorkEligible: [fact(true)],
    }
    expect(assessResearchEligibility(researchProgramRules.stars, facts).state).toBe('eligible')
    expect(
      assessResearchEligibility(researchProgramRules.stars, {
        ...facts,
        atLeast16ByProgramJune1: [],
      }).state,
    ).toBe('unknown')
  })
})
describe('transparent feasible research ordering', () => {
  const preferences = {
    lens: 'nearby' as const,
    interests: ['Chemistry'],
    reachableLocations: ['Arlington'],
  }
  it('places feasible nearby/remote work before distant physical work regardless of reputation scores', () => {
    const far = {
      ...target('prestigious', 'Richardson', 'in_person'),
      assessment: { fit: 30, openness: 25, feasibility: 15 },
    }
    const local = target('local', 'Arlington, Texas', 'in_person')
    const remote = target('remote', 'Boston', 'remote')
    expect(orderResearchTargets([far, local, remote], preferences).map((t) => t.id)).toEqual([
      'local',
      'remote',
      'prestigious',
    ])
    expect(explainResearchFit(local, preferences).unresolved.join(' ')).toContain(
      'eligibility need confirmation',
    )
  })
  it('does not turn a university address into confirmed access when mode is unknown', () => {
    expect(explainResearchFit(target('unknown', 'Arlington', 'unknown'), preferences).access).toBe(
      'unconfirmed',
    )
  })
  it('does not match Dallas against Dallastown and does not infer a commute duration', () => {
    const result = explainResearchFit(target('other', 'Dallastown', 'in_person'), {
      ...preferences,
      reachableLocations: ['Dallas'],
    })
    expect(result.access).toBe('outside-preference')
    expect(JSON.stringify(result)).not.toContain('minutes')
  })
  it('honors the remote lens and stable ordering without modifying the input', () => {
    const items = [
      target('physical', 'Arlington', 'in_person'),
      target('first', 'Dallas', 'remote'),
      target('second', 'Boston', 'remote'),
    ]
    expect(
      orderResearchTargets(items, { ...preferences, lens: 'remote' }).map((t) => t.id),
    ).toEqual(['first', 'second', 'physical'])
    expect(items[0]?.id).toBe('physical')
    expect(
      explainResearchFit(target('hybrid', 'Boston', 'hybrid'), { ...preferences, lens: 'remote' })
        .access,
    ).toBe('unconfirmed')
  })
  it('uses the member field rather than the founder field and does not claim availability', () => {
    const items = [
      target('robotics', 'Arlington', 'in_person', ['Robotics']),
      target('chemistry', 'Arlington', 'in_person'),
    ]
    expect(orderResearchTargets(items, preferences)[0]?.id).toBe('chemistry')
    expect(explainResearchFit(items[1]!, preferences).unresolved).toContain(
      'Current participant availability, supervision, and eligibility need confirmation.',
    )
  })
})
