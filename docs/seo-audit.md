# Search audit — 7 September 2026

## Findings and implemented fixes

Public HTTP checks against `matrixfellows.com` found:

| Before | Change |
| --- | --- |
| `/robots.txt` returned homepage HTML, HTTP 200 | Plain-text crawler rules with sitemap discovery |
| `/sitemap.xml` returned homepage HTML, HTTP 200 | XML sitemap containing the canonical homepage only |
| Arbitrary page paths returned duplicate homepage HTML, HTTP 200 | Unknown page routes return 404 with noindex |
| HTTP homepage returned 200 | Production HTTP redirects permanently to HTTPS |
| No canonical link | Explicit `https://matrixfellows.com/` canonical |
| Generic search title/description | Accurate student research/Martin HS title and description |
| No organization structured data | Truthful Organization and WebSite JSON-LD, email and logo |
| One caption failed Lighthouse contrast | Increased caption opacity from 45% to 70% |

The main content already arrives in server-rendered HTML: one H1, research
summaries, meeting details and contact information. A JavaScript-disabled browser
check confirms readable main/hero content and all three research articles. Kept
the visual headline and cinematic experience intact. No fake ratings, invented
awards, keyword stuffing, hidden SEO copy, or unconfirmed Event times were added.

`www.matrixfellows.com` did not resolve during the audit. The middleware can
canonicalize that hostname once DNS and a Cloudflare hostname/certificate are
configured, but this change does not create those resources. Apex HTTPS is the
canonical URL. Existing Wrangler OAuth grants zone read, not DNS write; do not
claim the Search Console TXT record has been installed.

## Lab measurement

Lighthouse 12.8.2 mobile-default lab run on the live pre-change site, with
hardware-accelerated Chromium on the development workstation:

| Category/metric | Baseline |
| --- | ---: |
| SEO | 91/100 |
| Accessibility | 97/100 |
| Best practices | 100/100 |
| Performance | 57/100 |
| First contentful paint | 2.3 seconds |
| Largest contentful paint | 3.5 seconds |
| Total blocking time | 1,600 ms |
| Cumulative layout shift | 0 |
| Speed index | 5.6 seconds |

Raw report: ignored `test-results/seo/before-gpu.json`. A prior software-GPU run
had extreme rendering overhead and is not used as a representative performance
baseline. Even the GPU run is simulated mobile throttling on a desktop GPU, not
an iPhone measurement or field Core Web Vitals. These SEO fixes do not resolve
the remaining animation/bootstrap performance cost. Priorities for a focused
follow-up are shader startup/main-thread cost, font delivery and the arrival
sequence's effect on perceived loading. Do not disable visuals only for Google
or Lighthouse. Use Search Console/CrUX field data when sufficient traffic exists.

## Owner actions

Post-deployment verification: `node scripts/check-seo.mjs` passed against
`https://matrixfellows.com`, including the permanent HTTP→HTTPS redirect.
The live repeat Lighthouse SEO/accessibility run scored **100/100 in both**
(baseline 91/97). Raw report: ignored `test-results/seo/after-live.json`.
93 unit/database tests, typecheck and production build passed. Deployed Cloudflare
version: `ab9acae3-1e92-400b-b5b3-c6e1f7fb1db0`. Search Console ownership and
indexing remain unverified; these test scores are not ranking predictions.

1. Add Domain property `matrixfellows.com` in Search Console.
2. In Cloudflare DNS, add the exact Google-provided TXT record at `@` with TTL
   Auto. Add it alongside existing records; never replace email/SPF/DKIM records.
3. Click Verify in Search Console. Keep that TXT record permanently.
4. Submit `https://matrixfellows.com/sitemap.xml` in Sitemaps after deployment.
5. URL Inspection → `https://matrixfellows.com/` → Test live URL → Request indexing.
6. Monitor indexing and query impressions over the following weeks. Verification,
   submission and actual indexing are separate steps, none completed by a deploy.

See [official-source guidance](seo-references.md) for citations and alternative
URL-prefix verification if DNS access is unavailable.

## Sustainable ranking priorities

The first realistic targets are branded searches (Matrix Fellows) and relevant
local searches (Martin High School research club). Broad searches such as
“high school research opportunities” are much more competitive. Seek a genuine
link from the school's club directory and appropriate project/society profiles;
publish substantive original findings, meeting recaps and useful application
guidance over time. Separate crawlable project/resource pages could expand the
search footprint later, but are intentionally not added to this one-page site
without a content/routing decision. Avoid paid/spam links and mass AI filler.

Repeat deployment checks with `node scripts/check-seo.mjs`; override
`TEST_BASE_URL` for local production preview. The script tests actual HTTP status,
SSR text, canonical/schema/OG image, robots/XML sitemap, API noindex and HTTPS
redirection. It cannot assert Google indexing or ranking.
