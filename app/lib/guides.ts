import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import type { MDCRoot, Toc } from '@nuxtjs/mdc'
import type { DefineComponent } from 'vue'
import { guideSummaries } from '#shared/data/guides'
import { guideMetadataSchema, type GuideMetadata } from '#shared/utils/guide-validation'

const contentComponents = import.meta.glob('../components/content/*.vue', {
  eager: true,
  import: 'default',
})

const proseTags: Record<string, string> = {
  ProseA: 'a',
  ProseBlockquote: 'blockquote',
  ProseCode: 'code',
  ProseEm: 'em',
  ProseH2: 'h2',
  ProseH3: 'h3',
  ProseHr: 'hr',
  ProseLi: 'li',
  ProseOl: 'ol',
  ProseP: 'p',
  ProseStrong: 'strong',
  ProseTable: 'table',
  ProseTbody: 'tbody',
  ProseTd: 'td',
  ProseTh: 'th',
  ProseThead: 'thead',
  ProseTr: 'tr',
  ProseUl: 'ul',
}

export const guideComponents = Object.fromEntries(
  Object.entries(contentComponents).flatMap(([path, component]) => {
    const name = path.slice(path.lastIndexOf('/') + 1, -4)
    const proseTag = proseTags[name]
    return proseTag
      ? [
          [name, component],
          [proseTag, component],
        ]
      : [[name, component]]
  }),
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
