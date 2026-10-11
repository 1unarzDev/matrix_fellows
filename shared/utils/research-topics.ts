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
const topicAliases: Record<string,string[]> = {
 robotics:['robotics','engineering','robotics & engineering'],
 computing:['ai','computer science','artificial intelligence','machine learning','ai & machine learning','computing','ai & computing'],
 biomedicine:['biology','medicine','biomedical engineering','biology & medicine'],
 materials:['chemistry','materials science','chemistry & materials'],
 physics:['physics','astronomy','physics & astronomy'],
 mathematics:['mathematics','data science','mathematics & data science'],
 environment:['environmental science','environment','sustainability','environment & sustainability'],
 'social-science':['psychology','social science','psychology & social science'],
}
export function stableResearchTopics(labels: string[]): string[] {
  return [...new Set(labels.flatMap(label => {
    const text = label.trim().toLowerCase()
    return researchTopics.filter(topic => topic.label.toLowerCase() === text || topic.id === text || topicAliases[topic.id]?.includes(text)).map(topic => topic.id)
  }))]
}
