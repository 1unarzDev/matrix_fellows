import { expect, it } from 'vitest'
import { extractSocietyContext, SOCIETY_CONTEXT_WORKFLOW } from '../../shared/utils/society-context'

it('extracts dated connection context without treating a mention as verified expertise', () => {
  const [entry] = extractSocietyContext({
    title: 'UTA professor thread',
    kind: 'text',
    source_date: '2026-10-10',
    chapter: 'DFW',
    content_text:
      'From: Dr. Ada Lovelace <ada@uta.edu>\nWe would be happy to connect about imaging. https://github.com/matrix/project',
  })
  expect(entry).toMatchObject({
    kind: 'connection',
    organization: 'UTA',
    personName: 'Dr. Ada Lovelace',
    connectionDate: '2026-10-10',
    projectUrl: 'https://github.com/matrix/project',
    status: 'introduced',
    confidence: 'unreviewed',
  })
  expect(entry.metadata).toMatchObject({
    processor: SOCIETY_CONTEXT_WORKFLOW.version,
    contactCount: 1,
    workflowInstructions: [...SOCIETY_CONTEXT_WORKFLOW.instructions],
  })
})

it('keeps an unsupported binary source as honest metadata', () => {
  const [entry] = extractSocietyContext({
    title: 'Lab export',
    kind: 'file',
    file_name: 'lab-export.pdf',
    mime_type: 'application/pdf',
    content_text: '',
  })
  expect(entry.kind).toBe('note')
  expect(entry.summary).toContain('lab-export.pdf')
  expect(entry.confidence).toBe('unreviewed')
})
