/** Stable research topic IDs bridge historical join wording and research matching. */
export const researchTopics = [
  { id: 'robotics', label: 'Robotics & engineering' },
  { id: 'computing', label: 'AI & computing' },
  { id: 'biomedicine', label: 'Biology & medicine' },
  { id: 'materials', label: 'Chemistry & materials' },
  { id: 'physics', label: 'Physics & astronomy' },
  { id: 'mathematics', label: 'Mathematics & data science' },
  { id: 'environment', label: 'Environment & sustainability' },
  { id: 'social-science', label: 'Psychology & social science' },
] as const
export function stableResearchTopics(labels: string[]): string[] {
  return [...new Set(labels.flatMap(label => {
    const text = label.toLowerCase()
    return researchTopics.filter(topic => topic.label.toLowerCase() === text || topic.id === text).map(topic => topic.id)
  }))]
}
