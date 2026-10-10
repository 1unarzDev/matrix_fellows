import { extractResearchPdf, researchPdfLimits } from './research-pdf'
import { parse } from 'node-html-parser'
import { extractProjectFacts, projectFactSuggestions } from './research-project-extraction'
/** Bounded metadata adapters. No source is executed and public content is not automatically model eligible. */
export function classifyResearchLink(input: string) {
  const url = new URL(input)
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a public HTTPS research link.')
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.') || /\.(local|internal|localhost)$/.test(host)) throw new Error('Use a public research link.')
  url.hash = ''
  // PDF acquisition has an explicit first-party endpoint policy, separate from arbitrary links.
  if (/\.pdf$/i.test(url.pathname)) return { url: url.href, kind: ['uta.edu', 'www.uta.edu', 'utdallas.edu', 'www.utdallas.edu', 'utsouthwestern.edu', 'www.utsouthwestern.edu', 'unt.edu', 'www.unt.edu', 'tcu.edu', 'www.tcu.edu', 'smu.edu', 'www.smu.edu'].includes(host) ? 'publication' as const : 'reference' as const }
  if (host === 'github.com' && /^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)) {
    url.search = ''; url.pathname = url.pathname.replace(/\/$/, '').replace(/\.git$/, '')
    return { url: url.href, kind: 'repository' as const }
  }
  if (host === 'doi.org' && /^\/10\.\d{4,9}\/.+/.test(url.pathname)) { url.search = ''; return { url: url.href, kind: 'publication' as const } }
  // GitHub Pages provides an explicit public portfolio adapter; arbitrary/custom hosts remain references.
  return { url: url.href, kind: ['uta.edu', 'www.uta.edu', 'utdallas.edu', 'www.utdallas.edu', 'utsouthwestern.edu', 'www.utsouthwestern.edu', 'unt.edu', 'www.unt.edu', 'tcu.edu', 'www.tcu.edu', 'smu.edu', 'www.smu.edu'].includes(host) || /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?\.github\.io$/.test(host) ? 'page' as const : 'reference' as const }
}
async function boundedBytes(url: string, fetcher: typeof fetch, pdf = false) {
  const limit = pdf ? researchPdfLimits.bytes : 128000
  const response = await fetcher(url, { redirect: 'error', headers: { Accept: pdf ? 'application/pdf' : 'application/json,text/html', 'User-Agent': 'MatrixFellows-Research/1.0' }, signal: AbortSignal.timeout(8000) })
  if (!pdf && /application\/(?:pdf|octet-stream)/i.test(response.headers.get('content-type') || '')) throw new Error('unsupported_content')
  if (!response.ok) throw new Error(response.status === 404 ? 'not_found' : 'access_unavailable')
  if (Number(response.headers.get('content-length')) > limit) throw new Error('too_large')
  const reader = response.body?.getReader(); if (!reader) throw new Error('empty_source')
  let bytes = 0; const chunks: Uint8Array[] = []
  while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > limit) { await reader.cancel(); throw new Error('too_large') }; chunks.push(value) }
  const combined = new Uint8Array(bytes); let cursor = 0; for (const chunk of chunks) { combined.set(chunk, cursor); cursor += chunk.byteLength }
  return combined
}
async function boundedRequest(url: string, fetcher: typeof fetch) { return new TextDecoder().decode(await boundedBytes(url, fetcher)) }

export async function acquireResearchArtifact(input: string, fetcher: typeof fetch = fetch) {
  const link = classifyResearchLink(input)
  if (link.kind === 'reference') return { ...link, state: 'reference' as const, title: link.url, text: '', facts: [], suggestions: projectFactSuggestions([]), metadata: { adapter: 'reference-v1' }, summary: 'Saved reference. This source has no supported acquisition adapter yet.' }
  if (link.kind === 'publication' && /\.pdf$/i.test(new URL(link.url).pathname)) {
    const bytes = await boundedBytes(link.url, fetcher, true)
    const paper = await extractResearchPdf(bytes, decodeURIComponent(new URL(link.url).pathname.split('/').at(-1) || 'Research paper'))
    return { ...link, state: 'ready' as const, ...paper }
  }
  if (link.kind === 'repository') {
    const path = new URL(link.url).pathname
    const raw = await boundedRequest('https://api.github.com/repos' + path, fetcher)
    const data = JSON.parse(raw)
    if (typeof data.full_name !== 'string' || typeof data.description !== 'string' && data.description !== null) throw new Error('invalid_metadata')
    const title = data.full_name.slice(0, 200), description = (data.description || '').slice(0, 3000)
    let readmeText = '', readmePath = '', readmeVersion = ''
    try {
      const readme = JSON.parse(await boundedRequest('https://api.github.com/repos' + path + '/readme', fetcher))
      if (readme.encoding === 'base64' && typeof readme.content === 'string' && readme.size <= 10000) {
        readmeText = new TextDecoder().decode(Uint8Array.from(atob(readme.content.replace(/\s/g, '')), character => character.charCodeAt(0))).slice(0, 8000)
        readmePath = String(readme.path || 'README'); readmeVersion = String(readme.sha || '')
      }
    } catch { /* Metadata remains useful when a README is unavailable. */ }
    const text = `${title}\n${description}${readmeText ? '\nREADME excerpt:\n' + readmeText : ''}`
    return { ...link, state: 'ready' as const, title, text, facts: extractProjectFacts(text, readmePath || 'repository description'), suggestions: projectFactSuggestions(extractProjectFacts(text, readmePath || 'repository description')), metadata: { adapter: 'github-metadata-v1', sourcePath: path, readmePath, readmeVersion, defaultBranch: String(data.default_branch || ''), updatedAt: data.updated_at, language: data.language, attribution: 'Repository metadata does not establish member contribution.' }, summary: description || 'Repository metadata saved. Add your contribution to explain your role.' }
  }
  if (link.kind === 'publication') {
    const doi = decodeURIComponent(new URL(link.url).pathname.slice(1))
    const data = JSON.parse(await boundedRequest('https://api.crossref.org/works/' + encodeURIComponent(doi), fetcher)).message
    if (!Array.isArray(data?.title)) throw new Error('invalid_metadata')
    const title = String(data.title[0] || doi).slice(0, 500)
    const abstract = typeof data.abstract === 'string' ? data.abstract.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000) : ''
    return { ...link, state: 'ready' as const, title, text: title + (abstract ? '\nAbstract:\n' + abstract : ''), facts: extractProjectFacts(title + (abstract ? '\nAbstract:\n' + abstract : ''), 'abstract'), suggestions: projectFactSuggestions(extractProjectFacts(abstract, 'abstract')), metadata: { adapter: 'crossref-v1', doi, field: 'title', published: data.published?.['date-parts'], attribution: 'Publication metadata does not establish linking member authorship.' }, summary: `Publication: ${title}. Authorship and your contribution remain unconfirmed.` }
  }
  const raw = await boundedRequest(link.url, fetcher)
  const document = parse(raw)
  document.querySelectorAll('script,style,noscript,nav,footer,header,form').forEach(node => node.remove())
  const title = (document.querySelector('title')?.textContent || document.querySelector('h1')?.textContent || 'Research project page').trim().slice(0, 500)
  const text = (document.querySelector('main') || document.querySelector('article') || document).structuredText.replace(/\s+/g, ' ').trim().slice(0, 12000)
  const facts = extractProjectFacts(text, 'page text')
  const portfolio = new URL(link.url).hostname.endsWith('.github.io')
  return { ...link, state: 'ready' as const, title, text, facts, suggestions: projectFactSuggestions(facts), metadata: { adapter: portfolio ? 'github-pages-v1' : 'institutional-page-v1', section: 'page text', attribution: 'Linked page facts are not attributed to the linking member.' }, summary: `${title}. Source text saved; your role needs separate attribution.` }
}
