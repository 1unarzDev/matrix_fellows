import { createHash } from 'node:crypto'
import { outreachSeeds } from './outreach-seeds'
import { canonicalizeOutreachUrl } from '../utils/outreach'

/** Exact reviewed acquisition routes; not AI-cleared excerpts. */
export function starterOutreachSources() {
  return [
    ...outreachSeeds.map((seed) => ({
      id: `seed-${createHash('sha256').update(canonicalizeOutreachUrl(seed.canonicalUrl)).digest('hex').slice(0, 24)}`,
      url: canonicalizeOutreachUrl(seed.canonicalUrl),
      allowed_hosts: [new URL(seed.canonicalUrl).hostname],
      kind: 'target',
      enabled: true,
    })),
    {
      id: 'utd-cs-research',
      url: 'https://cs.utdallas.edu/research/',
      allowed_hosts: ['cs.utdallas.edu', 'www.utdallas.edu'],
      kind: 'directory',
      enabled: true,
    },
    {
      id: 'utsw-labs-directory',
      url: 'https://www.utsouthwestern.edu/labs/',
      allowed_hosts: ['www.utsouthwestern.edu'],
      kind: 'directory',
      enabled: true,
    },
    // Additional DFW routes are explicit opt-in pending current source review.
    {
      id: 'unt-research',
      url: 'https://research.unt.edu/',
      allowed_hosts: ['research.unt.edu', 'www.unt.edu'],
      kind: 'directory',
      enabled: false,
    },
    {
      id: 'smu-research',
      url: 'https://www.smu.edu/research',
      allowed_hosts: ['www.smu.edu'],
      kind: 'directory',
      enabled: false,
    },
    {
      id: 'tcu-research',
      url: 'https://research.tcu.edu/',
      allowed_hosts: ['research.tcu.edu', 'www.tcu.edu'],
      kind: 'directory',
      enabled: false,
    },
    {
      id: 'uta-cse-directory',
      url: 'https://www.uta.edu/academics/schools-colleges/engineering/academics/departments/cse/research',
      allowed_hosts: [
        'www.uta.edu',
        'heracleia.uta.edu',
        'ranger.uta.edu',
        'uta-smile.github.io',
        'aceslab.uta.edu',
        'redgiant.uta.edu',
        'utari.uta.edu',
        'csslab.uta.edu',
        'dbxlab.uta.edu',
        'itlab.uta.edu',
        'idir.uta.edu',
        'sprlab.uta.edu',
        'se-research-center.uta.edu',
        'hybridatelier.uta.edu',
        'twistlab.uta.edu',
      ],
      kind: 'directory',
      enabled: true,
    },
  ]
}
