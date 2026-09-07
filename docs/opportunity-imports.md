# Official opportunity monitoring

The `matrix-fellows-opportunities` Cloudflare Worker checks enabled sources daily at **11:00 UTC**. Supabase stores listings, source health, and review proposals. The Worker has no public HTTP trigger; its service-role key stays in Cloudflare secrets.

## Owner workflow

Open the website editor → **Sources**. Review each proposal against its linked official page and quoted evidence, then **Approve & publish** or **Dismiss**. Existing owner overrides and suppressed listings survive imports and approval. New or changed official facts never publish automatically. Unchanged approved facts refresh their verification timestamp; dismissed unchanged facts stay dismissed. Failures retain previously approved information and appear under the source’s last-run status.

JSON and RSS remain separate adapters for trusted curated feeds and retain automatic publication. RSS publication dates are not submission deadlines.

## Supported sources

ISEF, Davidson Fellows, Queer in AI at NeurIPS, NeurIPS, IEEE/CVF CVPR, IEEE ICRA, and Regeneron Science Talent Search. See `deadline-sources.md` for research and caveats. IEEE is a family of conferences, not one universal deadline. Local ISEF qualifiers need additional regional sources once the club’s location is selected.

`workers/official-sources.ts` defines reviewed editions, URLs, eligibility context and parser selection. `workers/official.ts` extracts explicit labeled dates with evidence, SHA-256 source hashes and parser versions. No arbitrary crawling, script execution, or LLM-generated dates. HTTPS URLs are allowlisted, redirects rejected, and responses/timeouts bounded.

## Maintenance

- Run `npm run check:sources` for a read-only live check; `npm test` covers deterministic extraction and database authorization.
- For redesigned pages or new editions, inspect the official source, update the profile/parser and tests, then redeploy with `npm run deploy:imports`.
- Apply migrations with `npx supabase db push --linked` before deploying code requiring them.
- Cloudflare secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Never commit either credential.
- Monitor source errors in the editor and Worker logs. Unannounced dates and ambiguous timezones are explicitly retained as unknown/date-only. Edition rollover deliberately requires maintenance rather than relabeling last year’s dates.

An LLM can later propose parser repairs behind this same review boundary, but is not required for the initial scheduled service.
