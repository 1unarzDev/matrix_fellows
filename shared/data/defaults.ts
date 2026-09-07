import type { SiteContent, Opportunity } from '../types/content'

export const defaultContent: SiteContent = {
  meeting: {
    title: 'Our next exchange of ideas.',
    date: '',
    time: '',
    timezone: 'America/Chicago',
    location: '',
    topics: ['Meeting topics will be announced here.'],
    url: '',
  },
  projects: [
    {
      id: '01',
      title: 'A question worth pursuing.',
      field: 'Research dossier 01',
      summary: 'The first of three Matrix Fellows research projects. A closer look is coming soon.',
      details:
        'Project title, research question, methods, contributors, and findings will be shared here.',
      status: 'Details forthcoming',
      url: '',
    },
    {
      id: '02',
      title: 'A different way of seeing.',
      field: 'Research dossier 02',
      summary:
        'New perspectives begin with careful observation. Our second project will be introduced here.',
      details:
        'Project title, research question, methods, contributors, and findings will be shared here.',
      status: 'Details forthcoming',
      url: '',
    },
    {
      id: '03',
      title: 'One idea. Further possibilities.',
      field: 'Research dossier 03',
      summary:
        'Explore the third research project from the Matrix Fellows community. Details to follow.',
      details:
        'Project title, research question, methods, contributors, and findings will be shared here.',
      status: 'Details forthcoming',
      url: '',
    },
  ],
  benefits: [
    {
      title: 'Take your ideas to the fair.',
      description:
        'Find science fair competitions, understand the requirements, and prepare to share your research.',
      url: '',
    },
    {
      title: 'Find your place in the conversation.',
      description:
        'Get help developing workshop and conference submissions, from choosing a venue to presenting your work.',
      url: '',
    },
    {
      title: 'Move toward publication.',
      description:
        'A supported path through writing, revision, and submission. Build a stronger paper with thoughtful feedback.',
      url: '',
    },
    {
      title: 'Find your people.',
      description:
        'Formulate questions, find research partners, and test your thinking with a community that stays curious.',
      url: '',
    },
  ],
  links: { join: '', contact: '' },
}

// Official discovery links; no dates or open-application claims are fabricated.
export const defaultOpportunities: Opportunity[] = [
  {
    id: 'isef',
    sourceId: 'curated',
    externalId: 'isef',
    title: 'Regeneron ISEF',
    kind: 'Competition',
    discipline: 'Across disciplines',
    description:
      'Explore the international science and engineering fair and its affiliated-fair qualification pathway.',
    eventDate: null,
    deadline: null,
    timezone: null,
    location: 'United States · International pathway',
    eligibility: 'High school · Qualify through an affiliated fair',
    url: 'https://www.societyforscience.org/isef/',
    verifiedAt: '2026-09-06',
    priority: 100,
    published: true,
  },
  {
    id: 'sts',
    sourceId: 'curated',
    externalId: 'sts',
    title: 'Regeneron Science Talent Search',
    kind: 'Competition',
    discipline: 'Science & engineering',
    description:
      'Independent research recognition for eligible high school seniors. Check the official rules and current application cycle.',
    eventDate: null,
    deadline: null,
    timezone: null,
    location: 'United States',
    eligibility: 'High school seniors · Official eligibility rules apply',
    url: 'https://www.societyforscience.org/regeneron-sts/',
    verifiedAt: '2026-09-06',
    priority: 95,
    published: true,
  },
  {
    id: 'jshs',
    sourceId: 'curated',
    externalId: 'jshs',
    title: 'Junior Science & Humanities Symposium',
    kind: 'Conference',
    discipline: 'STEM research',
    description:
      'Investigate regional opportunities to present original research. Regional requirements and dates vary.',
    eventDate: null,
    deadline: null,
    timezone: null,
    location: 'United States · Regional events',
    eligibility: 'High school · Check regional eligibility',
    url: 'https://www.jshs.org/',
    verifiedAt: '2026-09-06',
    priority: 90,
    published: true,
  },
  {
    id: 'neurips',
    sourceId: 'curated',
    externalId: 'neurips',
    title: 'NeurIPS workshops',
    kind: 'Workshop',
    discipline: 'AI & machine learning',
    description:
      'Explore workshop calls for papers and emerging research communities. Each workshop sets its own submission requirements.',
    eventDate: null,
    deadline: null,
    timezone: null,
    location: 'International',
    eligibility: 'Research community · Workshop-specific requirements',
    url: 'https://neurips.cc/',
    verifiedAt: '2026-09-06',
    priority: 70,
    published: true,
  },
]
