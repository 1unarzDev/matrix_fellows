import { getResolvedPDFJS } from 'unpdf'
import { extractProjectFacts, projectFactSuggestions } from './research-project-extraction'

export const researchPdfLimits = { bytes: 512000, pages: 12, milliseconds: 8000, textCharacters: 12000 } as const
/** Text-only parsing: no rendering, document scripts, attachments, links, or external font/resource retrieval. */
export async function extractResearchPdf(bytes: Uint8Array, title = 'Research paper') {
  if (bytes.byteLength > researchPdfLimits.bytes) throw new Error('too_large')
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('invalid_pdf')
  const deadline = Date.now() + researchPdfLimits.milliseconds
  const { getDocument } = await getResolvedPDFJS()
  const loadingTask = getDocument({ data: bytes, useWasm: false, useSystemFonts: false, disableFontFace: true, disableAutoFetch: true, disableStream: true, stopAtErrors: true, verbosity: 0 })
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { void loadingTask.destroy(); reject(new Error('pdf_timeout')) }, Math.max(1, deadline - Date.now())) })
  try {
    const pdf = await Promise.race([loadingTask.promise, timeout])
    if (pdf.numPages > researchPdfLimits.pages) throw new Error('too_many_pages')
    const pages: { page: number; start: number; end: number; text: string }[] = []
    const facts: ReturnType<typeof extractProjectFacts> = []
    let text = ''
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (Date.now() > deadline) throw new Error('pdf_timeout')
      const page = await Promise.race([pdf.getPage(pageNumber), timeout])
      const content = await Promise.race([page.getTextContent({ disableNormalization: false }), timeout])
      if (content.items.length > 2000) throw new Error('too_much_pdf_text')
      const pageText = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').replace(/\s+/g, ' ').trim()
      const marker = `Page ${pageNumber}\n`
      const remaining = researchPdfLimits.textCharacters - text.length - marker.length
      if (remaining <= 0) break
      const saved = pageText.slice(0, remaining)
      const start = Array.from(text + marker).length
      const candidates = extractProjectFacts(saved, `PDF page ${pageNumber}`).map(fact => ({ ...fact, start: start + fact.start, end: start + fact.end }))
      facts.push(...candidates.slice(0, Math.max(0, 4 - facts.length)))
      text += marker + saved + '\n'
      pages.push({ page: pageNumber, start, end: start + Array.from(saved).length, text: saved })
      page.cleanup()
      if (saved.length < pageText.length) break
    }
    if (Date.now() > deadline) throw new Error('pdf_timeout')
    if (!pages.some(page => page.text)) throw new Error('pdf_no_text')
    return { title, text, facts, suggestions: projectFactSuggestions(facts), metadata: { adapter: 'public-pdf-text-v1', totalPages: pdf.numPages, extractedPages: pages, parserVersion: 'unpdf-1.8.1', attribution: 'Paper text describes source research and does not establish member authorship.' }, summary: `${title}. Text saved with page references; authorship and your contribution remain unconfirmed.` }
  } finally { if (timer) clearTimeout(timer); await loadingTask.destroy() }
}
