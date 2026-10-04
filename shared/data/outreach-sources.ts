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
