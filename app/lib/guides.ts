import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import type { MDCRoot, Toc } from '@nuxtjs/mdc'
import type { DefineComponent } from 'vue'
import { guideSummaries } from '#shared/data/guides'
import { guideMetadataSchema, type GuideMetadata } from '#shared/utils/guide-validation'

const contentComponents = import.meta.glob('../components/content/*.vue', {
  eager: true,
  import: 'default',
})

export const guideComponents = Object.fromEntries(
  Object.entries(contentComponents).map(([path, component]) => [
    path.slice(path.lastIndexOf('/') + 1, -4),
    component,
  ]),
) as Record<string, DefineComponent>

export interface RenderedGuide extends GuideMetadata {
  body: MDCRoot
  toc?: Toc
}

const guideSources = import.meta.glob('../../content/guides/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

export async function loadGuide(slug: string): Promise<RenderedGuide | null> {
  const entry = Object.entries(guideSources).find(([path]) => path.endsWith(`/${slug}.md`))
  if (!entry) return null
  const parsed = await parseMarkdown(await entry[1](), { toc: { depth: 3, searchDepth: 3 } })
  const metadata = guideMetadataSchema.parse(parsed.data)
  const summary = guideSummaries.find((guide) => guide.slug === slug)
  if (
    metadata.slug !== slug ||
    !summary ||
    metadata.title !== summary.title ||
    metadata.category !== summary.category ||
    metadata.order !== summary.order
  )
    throw new Error(`Guide metadata does not match the registry: ${slug}`)
  return { ...metadata, body: parsed.body, toc: parsed.toc }
}
