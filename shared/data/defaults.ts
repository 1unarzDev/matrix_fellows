import type { SiteContent, Opportunity } from '../types/content'

export const defaultContent: SiteContent = {
  meeting: {
    title: 'Our first exchange of ideas.',
    date: '2026-09-25',
    time: 'During lunch',
    timezone: 'America/Chicago',
    location: 'Martin HS · Room 186C',
    topics: [
      'Research, made approachable: what it is, how it grows from your interests, and how to begin with a manageable question.',
      'Research as applied passion: why it can become standout evidence of initiative for jobs, internships, college applications, and your resume.',
      'Paths to pursue: science fairs, competitions, workshops, and other student research opportunities.',
      'From idea to results: finding a direction, narrowing the question, planning the work, and following through.',
      'Choose a first step and complete a brief ISEF interest form: start an ISEF project, plan a workshop submission, build a personal project, or follow a research guide.',
      'Questions, next steps, and how to join Matrix Fellows.',
    ],
    url: '',
  },
  projects: [
    {
      id: '01',
      title: 'CRANE sim',
      field: 'Robotics · Simulation infrastructure',
      summary:
        'A modular Unity physics and sensor simulation platform for testing autonomous vehicles and establishing baseline parameters before real-world deployment.',
      details: `How much can we learn about a robot before putting it in the water—or on the road?

CRANE sim is the simulation foundation of the Cross-Domain Robotics Autonomous Navigation Engine. Composable physics modules model vehicle dynamics, actuation, buoyancy, drag, wind, and currents across ground, surface, and underwater platforms.

Configurable simulated sensors—including LiDAR, cameras, IMUs, and positioning systems—support testing navigation and localization under controlled conditions. Shared ROS interfaces connect simulated and physical hardware, allowing navigation components to be tested and baseline parameters tuned in Unity before transferring to a real vehicle.

The project explores reusable autonomy across different vehicle configurations, with simulation-first validation intended to reduce deployment risk and repeated hardware iteration. This project advanced to the Texas Science & Engineering Fair (TXSEF).`,
      status: 'Advanced to TXSEF',
      url: 'https://github.com/1unarzDev/crane_sim',
    },
    {
      id: '02',
      title: 'Branching vine robots',
      field: 'Soft robotics · Autonomous exploration',
      summary:
        'Building on Stanford vine-robot research, multiple growing branches explore divergent paths simultaneously instead of repeatedly backtracking through an environment.',
      details: `What if a robot could explore more than one route at once?

Inspired by Stanford research on soft, tip-growing vine robots, this project develops an autonomous branching system for navigating and mapping complex, confined environments. Independently controlled branches can pursue separate paths simultaneously, reducing the need for sequential exploration and retraction.

The design combines regulated pneumatic growth, cable-driven steering, depth-camera and IMU feedback, and a ROS 2-based controller. Parametric mechanical components and modular electronics support multiple branches, while experiments examine growth speed, branching response, energy use, and exploration time.

The research investigates whether parallel branching can dramatically reduce navigation time as environments become more complex. The benefit depends on the number of available branches, path structure, and branching and retraction overhead—not a universal exponential speedup. This project advanced to the Texas Science & Engineering Fair (TXSEF).`,
      status: 'Advanced to TXSEF',
      url: '',
    },
    {
      id: '03',
      title: 'CRANE: robust autonomy',
      field: 'Navigation · Optimization · Interpretability',
      summary:
        'Extending CRANE sim to test, tune, and understand autonomous navigation before deploying it on a real robot.',
      details: `How can simulation make autonomous navigation more reliable in the real world?

Building on CRANE sim, this ongoing research tests ROS 2/Nav2 navigation against sensor errors, obstacles, and changing environmental conditions. Automated tuning explores safer, more efficient configurations while keeping classical planning and control at the core.

Experiment replays and parameter visualizations will help explain where navigation fails, which settings matter, and how performance trades off against safety. The goal is a navigation stack that is better understood and better prepared for real-world deployment.`,
      status: 'Ongoing study',
      url: '',
    },
  ],
  benefits: [
    {
      title: 'Compete on a bigger stage.',
      description:
        'Prepare strong work for science fairs and competitions, then pursue recognition from local showcases to national awards.',
      url: '',
    },
    {
      title: 'Open the next door.',
      description:
        'Build the experience and portfolio to pursue research internships and selective summer programs—and navigate the applications.',
      url: '',
    },
    {
      title: 'Put your interests to work.',
      description:
        'Turn a genuine interest into applied, real-world experience through experiments, prototypes, personal projects, papers, and workshop submissions.',
      url: '',
    },
    {
      title: 'Find people who help you grow.',
      description:
        'Meet collaborators and mentors, sharpen your questions, and keep moving when ambitious work becomes difficult.',
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
