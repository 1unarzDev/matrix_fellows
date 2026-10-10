# Account policies · October 7, 2026

Release update: deployed with the dashboard later October 7; see
[production evidence](../operations/dashboard-policies-release-2026-10-07.md).
The notes below retain the pre-release implementation evidence.

Implemented public `/privacy` and `/terms` routes; neither existed in the checkout.
Both reuse the login `WorkspaceShell` and `AccessCosmos` black-hole renderer.
Added understated login links, canonical metadata, sitemap entries, prerendered
content and a four-panel outline icon beside Dashboard in the homepage footer.
No policy links were added to the public footer. Unrelated dashboard/catalog
working-tree changes were preserved. No production deployment was performed.

Policy text lives in `shared/data/legal.ts` and describes actual repository flows:
identity versus mailbox consent, Supabase/Cloudflare, school membership forms and
restricted organizer Sheets, private planning/drafts, reviewed public-excerpt AI,
contact-based data requests, and bounded content-use permission. It reflects the
owner's broad audience and adult-officer-only AI direction. Adult-only access is
policy, not a claim that age verification has been implemented. AI activation
and real OAuth consent remain separate work. The owner confirmed that
`contact@matrixfellows.com` is monitored for requests.

The text is not lawyer-reviewed and does not establish legal compliance or
provider verification. Before public release, the operator should review it
against actual operations; provider branding/verification can still have its
own requirements. No secret, credentials, or invented legal entity/address is
included. Published OAuth policy URLs will be:
`https://matrixfellows.com/privacy` and `https://matrixfellows.com/terms`.

## Review passes

1. Repository and independent content audit established actual data collection,
   sharing, retention limitations and permissions; no fixed deletion guarantee,
   automatic guardian verification or provider training guarantee was invented.
2. Wide/narrow image inspection found too much atmosphere visible through the
   reading area and an oversized phone contents list. The reading surface is now
   opaque ink; the black hole remains visible around it. Desktop retains a sticky
   index; mobile uses an accessible expandable contents menu with touch targets.
3. Corrected policy-specific skip-link wording, selected-policy indication and
   programmatic main focus styling. Separate 320px and 200% CSS-zoom checks avoid
   pretending a combined 160px equivalent is a supported phone viewport.
4. Public route middleware initially rejected both new pages. Added explicit
   route/payload permissions and changed the sitemap cache identity so obsolete
   cached route lists do not survive the new release. Production prerender passes.

## Evidence

Production build and application/Worker typecheck pass. Full unit suite:
**307 tests / 50 files passed**, including three policy-content checks.
Firefox production-preview legal checks: **3 passed**. Chromium desktop and
phone-emulation final run: **20 passed** (37.0 seconds). Nuxt asset manifest
fingerprint: `9a5f44f017419adc652893c7025c8906bd187477f71561f03f3b2d52ee532e10`.
Desktop and iPhone-sized emulation exercise both policies, login regressions, anchor navigation,
skip focus, reduced motion, canonicals, sitemap inclusion and footer icon.
These are local browser/emulation checks, not physical Safari/device evidence.

Captures inspected at 1440, 1024 and 390 CSS pixels:

- `/tmp/matrix-legal-evidence/privacy-desktop-top.png`
- `/tmp/matrix-legal-evidence/privacy-mobile-top.png`
- `/tmp/matrix-legal-evidence/terms-desktop-top.png`
- `/tmp/matrix-legal-evidence/terms-mobile-top.png`
- `/tmp/matrix-legal-evidence/privacy-1024-animated.png`
- `/tmp/matrix-legal-evidence/login-legal-links.png`
- `/tmp/matrix-legal-evidence/footer-dashboard-icon.png`

Normal-motion 1024px capture confirms reuse of the existing renderer; screenshots
do not establish frame-presentation performance. The public cinematic sequence
was not edited beyond the footer link's icon.

```sh
npm run build
npm run typecheck
npm test -- --maxWorkers=2
TEST_BASE_URL=http://localhost:8799 npx playwright test tests/e2e/legal-pages.spec.ts tests/e2e/login-interface.spec.ts --workers=2
TEST_BASE_URL=http://localhost:8799 PROFILE_BROWSER=firefox npx playwright test tests/e2e/legal-pages.spec.ts --project=desktop --workers=1
```

Local production preview uses the existing isolated Wrangler config at
`/tmp/matrix-dashboard-preview.jsonc`; no production routes or provider secrets.
Build log `/tmp/legal-build.log`, typecheck log `/tmp/legal-typecheck.log`, unit
log `/tmp/legal-unit.log`, browser logs `/tmp/legal-browser-final.log` and
`/tmp/legal-firefox.log`. Earlier diagnostic failures are preserved in
`/tmp/legal-browser.log` and `/tmp/legal-browser-pass2.log`.
