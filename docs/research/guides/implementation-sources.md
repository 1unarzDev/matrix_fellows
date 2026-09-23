# Research guide implementation sources

Reviewed 22 September 2026. This note records implementation constraints and
primary-source guidance for the Matrix Fellows research-guide library. It is not
a claim that the guide routes, content, Cloudflare database, or cited examples
have been implemented or deployed.

## Nuxt Content v3 recommendation

The current npm release of `@nuxt/content` is 3.16.1 (MIT licensed) and requires
Node 20.19 or newer. The repository's Node 22.18+ requirement and Nuxt 4 setup
are compatible. Nuxt Content v3 is the preferred authoring layer because it
keeps reviewed prose and citations in Git-backed Markdown while providing
schema validation, inferred collection types, SSR queries, and MDC rendering.

Use the v3 collection APIs, not the old v2 `queryContent`, document-driven mode,
or catch-all conventions:

- register `@nuxt/content` in `nuxt.config.ts`;
- define one `type: 'page'` collection named `guides` in root
  `content.config.ts`;
- match only `content/guides/*.md` and apply a `/guides` path prefix;
- validate front matter with a Zod object; and
- query with `queryCollection('guides')`, then render an individual Markdown
  document with `<ContentRenderer :value="guide" />`.

The collection `path` is generated from the file path for page collections.
Treat that generated path as the route and canonical source of truth rather
than maintaining a second free-form slug that can drift. A separate stable
`guideId` is useful for `relatedGuideIds`; renaming a file then does not silently
break editorial relationships.

A suitable starting configuration is:

```ts
import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

const externalResource = z.object({
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.string().url(),
  note: z.string().min(1).optional(),
})

export default defineContentConfig({
  collections: {
    guides: defineCollection({
      type: 'page',
      source: { include: 'guides/*.md', prefix: '/guides' },
      schema: z.object({
        guideId: z.string().regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        description: z.string().min(1),
        category: z.enum(['getting-started', 'planning', 'analysis', 'communication']),
        stage: z.enum(['explore', 'plan', 'conduct', 'analyze', 'present']),
        readingMinutes: z.number().int().positive(),
        updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        featured: z.boolean().default(false),
        relatedGuideIds: z.array(z.string()).default([]),
        resources: z.array(externalResource).default([]),
        hero: z.string().optional(),
        searchTerms: z.array(z.string()).default([]),
      }),
      indexes: [
        { columns: ['guideId'], unique: true },
        { columns: ['featured'] },
        { columns: ['category', 'stage'] },
      ],
    }),
  },
})
```

Keep `readingMinutes` editorial and stable rather than recalculating it in the
browser. `stage` is more actionable than a subjective difficulty label for this
initial collection. Store short factual resource annotations in front matter;
keep citations and nuanced advice in the Markdown body.

The index can SSR a selected field set with
`queryCollection('guides').select(...).order(...).all()`. The detail route should
query `queryCollection('guides').path(route.path).first()` inside
`useAsyncData`, return a real 404 when absent, and pass the result to
`ContentRenderer`. Do not defer the useful text to `onMounted`. Nuxt page
routes are code-split, so the guide renderer and guide-only components need not
enter the cinematic homepage's route chunk. The homepage preview should query
only its 4–6 metadata records server-side and should not render every guide body
or include a second content search index in its hydration payload.

MDC permits block components, named slots, and typed props in Markdown. Put
Matrix-owned instructional components and prose overrides in
`app/components/content/`, which is the corresponding component directory in
this repository's Nuxt 4 `app/` layout. Good SSR-first candidates include a
callout, email comparison, question-refinement ladder, paper-notes template,
poster anatomy, methods flow, graph comparison, and pitch outline. Ordinary
Markdown elements resolve through `Prose*` components; override only the ones
the design needs, retain the upstream prop contracts, and keep semantics such
as heading order, lists, tables, links, figures, captions, and accessible SVG
text. Git-reviewed Markdown is trusted application source: do not later expose
MDC authoring to untrusted users, because MDC can instantiate application
components and pass them props.

Primary implementation references:

- [Nuxt Content installation](https://content.nuxt.com/docs/getting-started/installation)
- [Typed content collections and indexes](https://content.nuxt.com/docs/collections/define)
- [`queryCollection`](https://content.nuxt.com/docs/utils/query-collection)
- [`ContentRenderer`](https://content.nuxt.com/docs/components/content-renderer)
- [Markdown and MDC syntax](https://content.nuxt.com/docs/files/markdown)
- [Prose component overrides](https://content.nuxt.com/docs/components/prose)
- [Nuxt Content source and MIT license](https://github.com/nuxt/content)

### Cloudflare deployment constraint

The frontend currently targets the Cloudflare module Worker preset and has no
D1 binding. Nuxt Content's official Cloudflare Workers adapter requires a D1
database, connected under the default `DB` binding (or an explicitly configured
alternative), plus a compatible Workers date. The repository's compatibility
date is already new enough, but a D1 database ID cannot be invented locally.
Provisioning and binding D1 is therefore a real external deployment step. A
local build backed by Node SQLite does not prove that the deployed Worker can
query guides.

Nuxt Content remains the recommended architecture if the D1 resource can be
created and its binding configured. If that external setup is not authorized,
pause before claiming a deployable Content integration; either obtain the D1
binding or deliberately choose a build-time Markdown compilation architecture
and document the loss of Nuxt Content's supported collection/query path.

- [Nuxt Content on Cloudflare Workers](https://content.nuxt.com/docs/deploy/cloudflare-workers)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

## Primary-source content map

The Matrix guides should synthesize these sources in Matrix's own concise voice.
External resources are “Go deeper” links, not replacements for actionable
instructions and not evidence that advice for undergraduates automatically
applies unchanged to minors.

### Contacting a professor or research mentor

- [Stanford Academic Advising: How to Email Faculty](https://advising.stanford.edu/current-students/advising-student-handbook/email-faculty)
  supports short, professional, specific messages, a useful subject, a clear
  meeting request, one follow-up after roughly a week, and prompt communication
  after a relationship begins.
- [Harvard SEAS: Undergraduate Research Opportunities](https://seas.harvard.edu/computer-science/undergraduate-program/research-opportunities)
  tells students to inspect a lab's work, mention specific research and why it
  interests them, describe goals and honest prior experience, state
  availability, avoid generic mail, and follow up after 7–10 days. It explicitly
  notes that many undergraduates begin without prior research experience.
- [Harvard URAF: Identifying and Contacting Faculty Members](https://uraf.harvard.edu/resource/identifying-and-contacting-faculty-members)
  is the requested companion link for narrowing a faculty list and tailoring
  each message. The official page was indexed on the review date but returned an
  access-denied response from this environment; retain the accessible Harvard
  SEAS page as the factual implementation source and recheck URAF in a browser
  before publishing its annotation.

The examples should be newly written for a high-school student. Do not copy a
university's sample email or imply that a professor owes a response.

### Finding an idea and reviewing literature

- [Harvard Library: Subject Bibliographies, Literature Reviews, Methods Sources](https://guides.library.harvard.edu/dougbond/orienting)
  says literature reviews summarize, evaluate, and contextualize a field, and
  commonly identify unanswered questions, contested knowledge, and possible new
  directions. This directly supports using recent reviews as maps rather than
  treating one abstract as an idea generator.
- [Harvard Library: Literary Research Basics](https://guides.library.harvard.edu/literature/basics)
  recommends building from known sources, following footnotes and works-cited
  lists, inspecting recent journal issues, and using subject vocabulary.
- [Google Scholar help: “Cited by” and related articles](https://scholar.google.com/intl/en/scholar/help.html#citedby)
  documents forward citation chaining. The guide should pair it with backward
  reference chaining and warn that citation count is not a quality verdict.

Ideas derived from limitations, replications, new populations, comparisons,
datasets, mechanisms, or implementations should be presented as candidates to
test for relevance and feasibility—not guaranteed novelty.

### Reading a research paper

- [Carey, Steiner, and Petri, “Ten simple rules for reading a scientific paper”](https://doi.org/10.1371/journal.pcbi.1008032)
  is a peer-reviewed, open-access PLOS guide. It recommends reading with a goal,
  asking what the authors wanted to know/did/found/interpreted, unpacking every
  figure and table, and determining what should happen next. It supports a
  staged reading method while acknowledging that there is no single mandatory
  order for every reader or paper.

The Matrix paper-notes template can use the requested fields, but its wording
and layout should be original. Distinguish unknown terminology from uncertainty
about the study's actual contribution.

### Research questions, engineering problems, and study plans

- [ISEF Grand Award judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/)
  separately defines science projects around a focused, testable question,
  variables/controls, systematic evidence, and interpretation, while engineering
  projects begin with a practical need, criteria and constraints, alternatives,
  a prototype, and testing. This is strong support for not forcing engineering,
  observational, qualitative, or computational work into one experimental-
  variable template.
- [Current ISEF International Rules](https://www.societyforscience.org/isef/international-rules/)
  is the authoritative entry point for current forms and rules.
- [Society for Science Rules Wizard](https://ruleswizard.societyforscience.org/)
  helps identify forms and approval paths for a particular project.

The planning guide must state that applicable approvals occur **before**
experimentation. It should link to the live rules instead of freezing detailed
human-participant, vertebrate-animal, biological-agent, chemical, device, or
other regulated-project requirements into prose that can become stale. The
guide is educational and cannot promise that a project is compliant.

### Practical statistics

- [NIST/SEMATECH e-Handbook of Statistical Methods](https://www.itl.nist.gov/div898/handbook/)
  is the main technical reference for distributions, location and scale,
  uncertainty intervals, hypothesis tests, experimental design, and graphical
  analysis. Its quantitative-techniques section explicitly distinguishes point
  estimates from intervals and practical importance from statistical
  significance.
- [American Statistical Association statement on p-values](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf)
  states that a p-value does not measure the probability that the hypothesis is
  true, scientific conclusions should not rest only on a threshold, and a
  p-value does not measure effect size or importance.

Use small, original Matrix datasets and SVGs to show distribution, variability,
confidence intervals, effect size, and the difference between visible,
statistically supported, and practically meaningful effects. Explain that test
choice and sample size follow the design and assumptions. Do not provide a
decision tree that encourages students to try tests until one crosses a
threshold, hide unfavorable trials, or infer causation from correlation.

### Posters and graphs

- [Society for Science judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/)
  gives the interview 25 presentation points and the poster 10; judges assess
  understanding, independence, limitations, and contribution as well as visual
  organization. This supports treating the poster as an interface to the work,
  not the work itself.
- [MIT Communication Lab: Poster](https://mitcommlab.mit.edu/broad/commkit/poster/)
  recommends a clear main message, strong figures with sparing text, audience-
  aware hierarchy, and a practiced 20-second pitch.
- [MIT Communication Lab: Figure Design](https://mitcommlab.mit.edu/broad/commkit/figure-design/)
  connects chart form to the claim: distributions, time, correlations, and
  condition comparisons need different displays. It recommends showing actual
  data where possible, reducing unrelated visual noise, direct labeling, units,
  and message-led captions.
- [W3C: Complex Images](https://www.w3.org/WAI/tutorials/images/complex/)
  explains short and long descriptions for charts and diagrams. Pair this with
  visible labels and patterns so color is not the only carrier of meaning.
- [Society for Science finalist abstracts](https://abstracts.societyforscience.org/)
  provides real project abstracts for question/result phrasing; they are not
  full poster examples or templates.

Create the annotated poster, methods flow, weak/strong graph, and dense-text
comparison as original Matrix SVGs. Include readable text alternatives. Link to
third-party examples rather than embedding or redrawing their artwork unless
its license is verified and attribution requirements are met.

### Claims, abstracts, and presentations

- [ISEF judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/)
  requires enough evidence to support interpretations and conclusions and asks
  students to understand limitations, potential impact, independence, and next
  research steps. This supports separating a measured result, interpretation,
  potential impact, and demonstrated impact.
- [Society for Science: How to Write an ISEF Abstract](https://www.societyforscience.org/isef/how-to-write-an-isef-abstract/)
  gives a concise purpose/procedure/data/conclusion structure, asks for key
  results, limits ISEF abstracts to 250 words, and excludes mentor work from the
  student's procedure. Treat its word limit as ISEF-specific; each destination's
  current rules remain authoritative.
- [MIT Communication Lab: Journal Article Abstract](https://mitcommlab.mit.edu/broad/commkit/journal-article-abstract/)
  is a useful general companion for message-led abstracts.
- [MIT Communication Lab: Slideshow](https://mitcommlab.mit.edu/broad/commkit/slideshow/)
  and its [poster pitch guidance](https://mitcommlab.mit.edu/broad/commkit/poster/)
  support audience-aware spoken structure and concise openings. Matrix should
  write original 20-second, 60-second, and 3-minute outlines rather than copy a
  script aimed at graduate researchers.

Examples should make ownership explicit: what the student did, what the mentor
did, what failed, and what remains uncertain. Never convert tentative or
single-dataset findings into medical, safety, causal, or society-wide claims.

## Licensing and usage boundaries

- Linking and factual synthesis do not grant permission to reproduce page
  layouts, posters, figures, photos, logos, or long passages. Keep quotations
  short, necessary, attributed, and reviewed; original Matrix explanations and
  diagrams are the default.
- The Harvard Library guides reviewed here state a CC BY 4.0 license except
  where noted. Attribution is still required, and embedded third-party works on
  a guide page may have different rights.
- The PLOS paper is CC BY. The MIT Communication Lab pages state CC BY-NC 4.0
  unless otherwise noted. Because Matrix's future use context may change, link
  to MIT examples and create original instructional diagrams instead of copying
  them into the repository.
- Society for Science pages and abstract records are governed by its
  [Rights and Permissions](https://www.societyforscience.org/rights-and-permissions/)
  policy. A public abstract database is not permission to reproduce project
  boards or imply endorsement.
- Stanford's sample wording should be treated as a companion reference, not a
  reusable Matrix template. Write new good/bad emails with fictitious names,
  labs, data, and projects.
- Nuxt Content's MIT license covers its software, not the content retrieved
  through it. Record the author, source URL, license, attribution text, and any
  modification for every non-original asset. Keep original SVG source in the
  repository and add third-party assets to the existing asset-license record.
- External sources can move. Store the guide's reviewed `updated` date, use
  durable official landing pages for changing rules, and include external-link
  checks in documentation/route validation without implying that a successful
  HTTP response verifies the current substance of a rule.

## Implementation conclusions

1. Nuxt Content v3 is the correct default if D1 can be provisioned for the
   deployed Cloudflare Worker; do not ship a runtime dependency on a nonexistent
   binding.
2. Keep one typed `guides` page collection, filesystem-derived canonical paths,
   stable editorial IDs, and SSR queries. Do not put full Markdown bodies or a
   client-side content index into the homepage payload.
3. Use MDC only for high-value original teaching visuals and comparisons. Plain
   Markdown plus semantic Matrix `Prose*` components should carry most of each
   concise guide.
4. The source set above supports the requested guidance without copying
   university prose or third-party artwork. ISEF rules and destination-specific
   submission limits must remain live outbound references rather than frozen
   compliance claims.
5. Verify D1-backed preview deployment, no-JavaScript SSR text, unknown-guide
   404s, canonical URLs, sitemap entries, structured data, route chunk size, and
   homepage startup measurements before calling the integration complete.
