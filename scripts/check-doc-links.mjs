import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = process.cwd()
function markdownFiles(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? markdownFiles(path) : path.endsWith('.md') ? [path] : []
  })
}
const files = ['README.md', ...markdownFiles('docs')]

const missing = []
for (const file of files) {
  const source = readFileSync(resolve(root, file), 'utf8')
  const links = source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)
  for (const match of links) {
    const href = match[1]
      .trim()
      .replace(/^<|>$/g, '')
      .split(/\s+["']/)[0]
    if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue
    const pathname = decodeURIComponent(href.split('#')[0].split('?')[0])
    const target = resolve(root, dirname(file), pathname)
    if (!existsSync(target)) missing.push(`${file}: ${href}`)
    else if (pathname.endsWith('/') && !statSync(target).isDirectory())
      missing.push(`${file}: ${href} is not a directory`)
  }
}

assert.deepEqual(missing, [], `Broken documentation links:\n${missing.join('\n')}`)
console.log(`PASS: ${files.length} Markdown files contain no broken local links`)
