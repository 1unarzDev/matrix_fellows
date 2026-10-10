/** Bounded metadata adapters. No source is executed and public content is not automatically model eligible. */
export function classifyResearchLink(input: string) {
  const url = new URL(input)
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a public HTTPS research link.')
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.') || /\.(local|internal|localhost)$/.test(host)) throw new Error('Use a public research link.')
  url.hash = ''
  if (host === 'github.com' && /^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)) {
    url.search = ''; url.pathname = url.pathname.replace(/\/$/, '').replace(/\.git$/, '')
    return { url: url.href, kind: 'repository' as const }
  }
  if (host === 'doi.org' && /^\/10\.\d{4,9}\/.+/.test(url.pathname)) { url.search = ''; return { url: url.href, kind: 'publication' as const } }
  // Institutional projects have an explicit adapter; arbitrary links are saved references.
  return { url: url.href, kind: ['uta.edu', 'www.uta.edu', 'utdallas.edu', 'www.utdallas.edu', 'utsouthwestern.edu', 'www.utsouthwestern.edu', 'unt.edu', 'www.unt.edu', 'tcu.edu', 'www.tcu.edu', 'smu.edu', 'www.smu.edu'].includes(host) ? 'page' as const : 'reference' as const }
}
async function boundedRequest(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url, { redirect: 'error', headers: { Accept: 'application/json,text/html', 'User-Agent': 'MatrixFellows-Research/1.0' }, signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(response.status === 404 ? 'not_found' : 'access_unavailable')
  if (Number(response.headers.get('content-length')) > 128_000) throw new Error('too_large')
  const reader = response.body?.getReader(); if (!reader) throw new Error('empty_source')
  let bytes = 0; const chunks: Uint8Array[] = []
  while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 128_000) { await reader.cancel(); throw new Error('too_large') }; chunks.push(value) }
  const combined = new Uint8Array(bytes); let cursor = 0; for (const chunk of chunks) { combined.set(chunk, cursor); cursor += chunk.byteLength }
  return new TextDecoder().decode(combined)
}
export async function acquireResearchArtifact(input: string, fetcher: typeof fetch = fetch) {
  const link = classifyResearchLink(input)
  if (link.kind === 'reference') return { ...link, state: 'reference' as const, title: link.url, text: '', metadata: { adapter: 'reference-v1' }, summary: 'Saved reference. This source has no supported acquisition adapter yet.' }
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
        readmeText = atob(readme.content.replace(/\s/g, '')).slice(0, 8000)
        readmePath = String(readme.path || 'README'); readmeVersion = String(readme.sha || '')
      }
    } catch { /* Metadata remains useful when a README is unavailable. */ }
    const text = `${title}\n${description}${readmeText ? '\nREADME excerpt:\n' + readmeText : ''}`
    return { ...link, state: 'ready' as const, title, text, metadata: { adapter: 'github-metadata-v1', sourcePath: path, readmePath, readmeVersion, defaultBranch: String(data.default_branch || ''), updatedAt: data.updated_at, language: data.language, attribution: 'Repository metadata does not establish member contribution.' }, summary: description || 'Repository metadata saved. Add your contribution to explain your role.' }
  }
  if (link.kind === 'publication') {
    const doi = decodeURIComponent(new URL(link.url).pathname.slice(1))
    const data = JSON.parse(await boundedRequest('https://api.crossref.org/works/' + encodeURIComponent(doi), fetcher)).message
    if (!Array.isArray(data?.title)) throw new Error('invalid_metadata')
    const title = String(data.title[0] || doi).slice(0, 500)
    const abstract = typeof data.abstract === 'string' ? data.abstract.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000) : ''
    return { ...link, state: 'ready' as const, title, text: title + (abstract ? '\nAbstract:\n' + abstract : ''), metadata: { adapter: 'crossref-v1', doi, field: 'title', published: data.published?.['date-parts'], attribution: 'Publication metadata does not establish linking member authorship.' }, summary: `Publication: ${title}. Authorship and your contribution remain unconfirmed.` }
  }
  const raw = await boundedRequest(link.url, fetcher)
  const text = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000)
  const title = /<title[^>]*>([^<]+)/i.exec(raw)?.[1]?.trim().slice(0, 500) || 'Research project page'
  return { ...link, state: 'ready' as const, title, text, metadata: { adapter: 'institutional-page-v1', section: 'page text', attribution: 'Linked page facts are not attributed to the linking member.' }, summary: `${title}. Source text saved; your role needs separate attribution.` }
}
