import type { Meeting, MeetingDisplayStatus, MeetingEvent } from '../types/content'

const firstMeetingResources = [
  {
    title: 'Start with the research guides',
    url: '/guides',
    note: 'Practical help for finding an idea, contacting mentors, planning, and presenting work.',
  },
  {
    title: 'Browse research opportunities',
    url: '/opportunities',
    note: 'Explore science fairs, workshops, programs, internships, and submission routes.',
  },
  {
    title: 'Society for Science — ISEF',
    url: 'https://www.societyforscience.org/isef/',
    note: 'Official overview of the international science and engineering fair pathway.',
  },
]

export const projectedMeetings: MeetingEvent[] = [
  {
    id: 'isef-pathway-2026-10-09',
    title: 'From an ISEF interest to a regional-fair entry.',
    date: '2026-10-09',
    time: 'During lunch · projected',
    timezone: 'America/Chicago',
    location: 'Martin HS · room to be confirmed',
    state: 'tentative',
    summary:
      'A working session on teams, the ISEF pathway, near-term deadlines, example projects, and starting a Fort Worth regional-fair registration.',
    topics: [
      'How ISEF works, why students qualify through affiliated fairs, and where the Fort Worth Regional Science and Engineering Fair fits.',
      'A checkpoint for choosing individual or team ISEF work; students pursuing other competitions can use the same time to find collaborators.',
      'Upcoming fair, workshop, and submission deadlines—including other credible places an ISEF project may be shared when its rules and fit allow.',
      'Several real ISEF project examples, examined for how they turn a broad interest into a testable question rather than as templates to copy.',
      'An idea-starting exercise that identifies a problem, accessible evidence, likely constraint, and one-week feasibility test.',
      'For students with teams in place: a guided start on Fort Worth Regional Science and Engineering Fair registration, even if the final idea is still developing.',
    ],
    url: '',
    resources: [
      {
        title: 'Fort Worth Regional Science and Engineering Fair',
        url: 'https://fwrsef.org/',
        note: 'Official regional-fair information and the current registration pathway.',
      },
      {
        title: 'Society for Science — ISEF',
        url: 'https://www.societyforscience.org/isef/',
        note: 'Official ISEF overview, qualification pathway, and current program information.',
      },
      {
        title: 'Society for Science Rules Wizard',
        url: 'https://ruleswizard.societyforscience.org/',
        note: 'Check project-specific approval and form requirements before experimentation begins.',
      },
      {
        title: 'Matrix Fellows opportunities',
        url: '/opportunities',
        note: 'Compare workshops, fairs, and other routes without assuming one project fits every destination.',
      },
    ],
  },
]

export const buildMeetingSchedule = (nextMeeting: Meeting): MeetingEvent[] => [
  {
    ...nextMeeting,
    id: 'first-exchange-2026-09-25',
    state: 'confirmed',
    summary:
      'An approachable introduction to research, why it matters, routes students can pursue, and concrete ways to begin.',
    resources: firstMeetingResources,
  },
  ...projectedMeetings,
]

const dateInTimezone = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

export const meetingDisplayStatus = (
  meeting: MeetingEvent,
  today = dateInTimezone(new Date(), meeting.timezone),
): MeetingDisplayStatus => (meeting.date < today ? 'past' : meeting.state)

export const meetingStatusLabel = (status: MeetingDisplayStatus) =>
  status === 'past'
    ? 'Past gathering'
    : status === 'tentative'
      ? 'Projected · not confirmed'
      : 'Confirmed'
