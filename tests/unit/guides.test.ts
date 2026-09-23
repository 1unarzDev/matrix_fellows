import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import { describe, expect, it } from 'vitest'
import { featuredGuideSummaries, guideRoutes, guideSummaries } from '../../shared/data/guides'
import { guideMetadataSchema } from '../../shared/utils/guide-validation'

const guidesDirectory = resolve(process.cwd(), 'content/guides')

describe('research guide library', () => {
  it('keeps the registry, Markdown metadata, and related guides consistent', async () => {
    const filenames = (await readdir(guidesDirectory)).filter((name) => name.endsWith('.md')).sort()
    expect(filenames).toHaveLength(guideSummaries.length)
    expect(new Set(guideSummaries.map((guide) => guide.slug)).size).toBe(guideSummaries.length)
    expect(guideRoutes).toEqual(guideSummaries.map((guide) => `/guides/${guide.slug}`))

    const knownSlugs = new Set(guideSummaries.map((guide) => guide.slug))
    for (const filename of filenames) {
      const source = await readFile(resolve(guidesDirectory, filename), 'utf8')
      const parsed = await parseMarkdown(source)
      const metadata = guideMetadataSchema.parse(parsed.data)
      const slug = filename.replace(/\.md$/, '')
      const summary = guideSummaries.find((guide) => guide.slug === slug)

      expect(summary).toBeDefined()
      expect(metadata).toMatchObject({
        slug,
        title: summary?.title,
        category: summary?.category,
        stage: summary?.stage,
        readingMinutes: summary?.readingMinutes,
        featured: summary?.featured,
        order: summary?.order,
      })
      expect(metadata.related.every((related) => knownSlugs.has(related))).toBe(true)
      expect(metadata.resources.every((resource) => resource.url.startsWith('https://'))).toBe(true)
      expect(parsed.body.children.length).toBeGreaterThan(4)
    }
  })

  it('keeps the homepage preview intentionally bounded', () => {
    expect(featuredGuideSummaries).toHaveLength(6)
    expect(featuredGuideSummaries.every((guide) => guide.featured)).toBe(true)
  })
})
