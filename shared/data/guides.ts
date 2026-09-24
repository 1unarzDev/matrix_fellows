export interface GuideSummary {
  slug: string
  title: string
  description: string
  category: 'Start' | 'Design' | 'Analyze' | 'Communicate'
  stage: 'Starting out' | 'Planning' | 'Doing the work' | 'Sharing the work'
  readingMinutes: number
  featured: boolean
  order: number
}

export const guideSummaries: GuideSummary[] = [
  {
    slug: 'contact-a-research-mentor',
    title: 'Contact a research mentor',
    description:
      'Find genuine research fit, show credible preparation, and build a useful working relationship.',
    category: 'Start',
    stage: 'Starting out',
    readingMinutes: 14,
    featured: true,
    order: 1,
  },
  {
    slug: 'find-a-research-idea',
    title: 'Find an idea worth pursuing',
    description:
      'Turn literature, interests, friction, impact, and available tools into testable ideas.',
    category: 'Start',
    stage: 'Starting out',
    readingMinutes: 14,
    featured: true,
    order: 2,
  },
  {
    slug: 'read-a-research-paper',
    title: 'Read a paper without getting lost',
    description:
      'Use focused passes to find the question, evidence, contribution, and limitations.',
    category: 'Start',
    stage: 'Starting out',
    readingMinutes: 13,
    featured: false,
    order: 3,
  },
  {
    slug: 'shape-a-research-question',
    title: 'Shape a researchable question',
    description:
      'Convert a broad topic into a measurable scientific question or engineering target.',
    category: 'Design',
    stage: 'Planning',
    readingMinutes: 13,
    featured: true,
    order: 4,
  },
  {
    slug: 'plan-your-first-study',
    title: 'Plan your first study',
    description:
      'Define evidence, baselines, measurements, failure modes, approvals, and backups first.',
    category: 'Design',
    stage: 'Planning',
    readingMinutes: 15,
    featured: true,
    order: 5,
  },
  {
    slug: 'statistics-for-student-research',
    title: 'Use statistics that strengthen the work',
    description:
      'Choose summaries and tests that fit the design—and make claims the data can support.',
    category: 'Analyze',
    stage: 'Doing the work',
    readingMinutes: 15,
    featured: false,
    order: 6,
  },
  {
    slug: 'build-a-science-fair-poster',
    title: 'Build a strong science-fair poster',
    description:
      'Design a clear visual path from question to method, result, meaning, and limitation.',
    category: 'Communicate',
    stage: 'Sharing the work',
    readingMinutes: 14,
    featured: true,
    order: 7,
  },
  {
    slug: 'make-clear-research-graphs',
    title: 'Make graphs that explain results',
    description:
      'Match the chart to the question, show observations honestly, and write useful captions.',
    category: 'Communicate',
    stage: 'Sharing the work',
    readingMinutes: 12,
    featured: false,
    order: 8,
  },
  {
    slug: 'explain-why-research-matters',
    title: 'Explain impact without overselling',
    description:
      'Separate what happened, what it may mean, and what impact has actually been shown.',
    category: 'Communicate',
    stage: 'Sharing the work',
    readingMinutes: 12,
    featured: false,
    order: 9,
  },
  {
    slug: 'write-a-research-abstract',
    title: 'Write a useful abstract',
    description:
      'Compress the problem, method, quantitative result, and conclusion without vague claims.',
    category: 'Communicate',
    stage: 'Sharing the work',
    readingMinutes: 12,
    featured: false,
    order: 10,
  },
  {
    slug: 'present-research-clearly',
    title: 'Present research clearly',
    description:
      'Prepare 20-second, 60-second, and three-minute explanations—and answer hard questions.',
    category: 'Communicate',
    stage: 'Sharing the work',
    readingMinutes: 13,
    featured: true,
    order: 11,
  },
]

export const featuredGuideSummaries = guideSummaries.filter((guide) => guide.featured)
export const guideRoutes = guideSummaries.map((guide) => `/guides/${guide.slug}`)
