# Independent research outreach review

Reviewed October 9, 2026 in an isolated worktree at `a9c805f`, against base `bc233597e7ec0a1cb075d2211fa02f559105d0b7`. The reviewer did not author the feature changes. This is code inspection, independent local database reproduction, and a qualitative review of synthetic drafts; it is not deployment, live source acquisition, model generation, mailbox acceptance, or delivery evidence.

## Result

The integrated code substantially improves officer authorization, explicit representation, private sharing, bounded acquisition, technical-only model packets, and manual relationship planning. At this reviewed revision, it is **not ready for activation**: withdrawn consumed evidence can be reapproved unchanged and claimed for sending. Several mission requirements remain partial. Findings were sent to the lead during review; fixes after the reviewed revision require fresh verification.

The adult dashboard uses the existing member/officer/admin roles. No separate age-verification subsystem was found in the inspected implementation. Draft creation/edit/revision/approval/send routes require a live officer check. Proposal RLS restricts reads to the current officer owner, and the tested member/other-officer queries return no private drafts or revisions. Historical mailbox disconnection/reconciliation remain narrow member operations; the outbox API removes subject/recipient data for demoted owners and exposes only unresolved submissions.

## Concrete findings

**Critical: withdrawn evidence can be reapproved and submitted.** Load migrations 023, 024, 028, canonical planning, research profiles, officer relationships, and research execution into PGlite. Create an officer, shared profile, accepted officer-shared contribution claim, ready target/contact, own mailbox, and a personal proposal containing that claim in `evidence_claim_ids`. Approve revision 1. Set the claim's sharing scope to private, withdrawal timestamp, and adoption to superseded. The withdrawal trigger correctly returns the proposal to draft. Call `outreach_approve_email` again with the unchanged revision/body/fingerprint, then `outreach_claim_send`. Both succeed. The independent reproduction printed:

```text
AFTER WITHDRAW [ { status: 'draft' } ]
REAPPROVED [ { status: 'approved' } ]
CLAIMED [ { status: 'sending' } ]
```

The approval/send functions compare frozen context identities but do not validate the present eligibility of each consumed claim. Approval reset alone does not revoke future use. Add transactional checks for claim existence, acceptance, sharing, withdrawal, matching represented subject, and enabled membership, with a regression proving unchanged stale context cannot be reapproved. No email provider was invoked by this reproduction.

**High: stale profile subject eligibility is checked when compiling, rather than at approval/send.** `researchProfilePacket` rejects a disabled subject while compiling an officer packet, but the later SQL only checks profile sharing consent. A subject disabled after compilation can remain in an unchanged sending context. Recheck relevant membership and projection eligibility transactionally.

**Incomplete persistent matching.** `outreach_matches` is defined and protected in a migration but has no producer or consumer in this revision (`rg outreach_matches` yields the migration only). The actual planner computes a contribution plan after the officer selects a target/profile. This integrates stored model options with local writing, but does not establish a persistent pre-review member–project–target matching pipeline or compare strong remote fit against impractical physical work.

**Limited artifact enrichment.** Supported GitHub, Crossref and institutional-page acquisition saves source text and immutable snapshots, project identity, an artifact-title candidate claim, and an explicitly self-reported contribution. It does not detect methods, research questions, implemented work, current problems, conflicting attribution, or useful profile suggestions. No PDF adapter was found. Unsupported links honestly remain references. These are useful bounded acquisition paths, not the full requested extraction experience.

**Contextual edits are incomplete.** `remove_claim` returns unchanged text and requests manual selection. The `smaller_ask` regular expression only recognizes “Would you be open/available …”; neither generated “Would a small pilot …” nor “Would learning more …” matches. Safe proposed edits and revision checks exist, but the main generated asks cannot be made smaller through that action at this revision.

**Quality and scenario coverage limits.** Seven contribution drafts repeat the grammatical error “Would a small pilot of compare one public baseline …”. Beginner drafts ask whether learning more is a useful starting point without asking a concrete question the recipient can answer. The stale-affiliation fixture has no stale affiliation/date assertion; duplicate-lab has no prior relationship input. Those labels cannot prove those scenarios were exercised. Physical-inaccessible contains a remote member location and in-person target but still proposes the same benchmark pilot; the display marks access unknown rather than identifying an exclusion. These limitations need real distinct evidence cases and integration tests, not only names.

## Twelve-case before/after assessment

All cases in `tests/fixtures/research-quality-cases.json` were read independently, including inputs, plans, before bodies and after bodies. They are synthetic and mostly vary a discipline label within one common benchmark pattern. The baseline generally leaves observation and focused-question placeholders, presents the member as the sender, and suggests a feedback session with a one-page summary. The integrated output identifies the actual officer and represented member, quotes evidence, qualifies self-reported work, and avoids a time/team commitment. This lowers the burden of filling missing context, while retaining wording and case-selection work. No numeric superiority, acceptance rate, or causal outcome is claimed.

| Case | Specificity and factual support | Contribution and ask | Voice and editing burden |
| - | - | - | - |
| local-physical | A source quotation replaces the baseline placeholder; contribution is attributed as self-reported. | Small benchmark comparison is a possibility; travel/access remain unconfirmed. | Honest officer representation, but ungrammatical pilot ask and long raw quotation need edits. |
| remote-strong | Computer-vision quotation and evaluation sample create more concrete context. | Plausible public-data comparison; no actual remote-vs-local ranking is demonstrated. | Same boilerplate/grammar issue; lower context-entry burden than baseline. |
| beginner | Topic quotation is supported; no invented sample or capability. | Correctly selects a question rather than an offer; “learning more” is too vague for a useful recipient response. | Brief, honest representation; officer must supply a focused technical question. |
| ambiguous-paper | No paper authorship is invented; input contains no member work sample. | Learning question avoids a fabricated contribution. | Same vague beginner ask. Authorship ambiguity is avoided rather than resolved. |
| team-repository | Limits self-report to writing tests for one parser; does not credit the whole repository. | Possible benchmark pilot is broad relative to the specific test contribution. | Cautious attribution is useful; generic deliverable and grammar need revision. |
| stale-affiliation | Quotes topic evidence but does not represent an old affiliation; fixture does not encode the stated stale condition. | Same generic pilot, without a freshness-specific response. | Cannot judge handling of stale affiliation from this case. |
| weak-evidence | Retains a REVIEW placeholder and invents no research observation. | Modest public-resource question is reasonable. | Requires evidence repair before approval, which SQL enforces for the placeholder. |
| duplicate-lab | Evidence-supported quotation, but fixture has no relationship state. | Same possible pilot; no early duplicate handling is demonstrated in the draft fixture. | Draft is ordinary cold outreach; coordination must be tested independently. |
| unknown-availability | Explicitly self-reported notebook work; no hours/team promise. | Scope and participation confirmation prevent an immediate commitment. | Repeated pilot wording still needs grammatical repair and recipient-specific rationale. |
| physical-inaccessible | Biomedical-imaging topic is supported; no invented equipment privilege. | Does not resolve physical impracticality; same public-benchmark offer is retained. | Officer must decide whether a remote alternative is possible or exclude the match. |
| interest-only | Source-backed astronomy interest with no fabricated experience. | Question mode is appropriate; learning-more ask remains nonspecific. | Short and truthful but needs a concrete request. |
| model-unsupported-quote | Rejects the invented model quote and uses the valid local evidence instead. | Public-paper/resource request is modest and useful; simulator work remains self-reported. | Better fallback than baseline placeholders, with a readable ask. |

The clearer fallback example is: “Is there a public paper or introductory resource you would recommend for exploring Robotics?” The integrated officer introduction accurately says the officer is writing on behalf of the member. Neither sentence claims current recruiting, authorship, availability, or acceptance probability.

## Independent verification

The first focused Vitest invocation could not resolve `.nuxt/tsconfig.json` in the clean review worktree. Running `npx nuxt prepare` generated local configuration; rerunning passed **34 checks across five suites** in 2.46 seconds: officer relationship database, research profiles, research profile packet, research planning, and research execution database. The standalone withdrawal reproduction also succeeded, establishing a failure that the passing suites did not cover. Relevant database tests include 028 and the new additive migration chain.

The passing relationship tests demonstrate owner-private officer reads, manual promise-to-canonical-task persistence, handoff with immutable original author and cleared mailbox/approval, demotion blocking approval, owned explicit follow-up approval, competing cold-approach rejection, forged relationship rejection, and suppression preventing a send claim. They do not independently establish every cross-alias/concurrent/privacy withdrawal case or a real provider journey. No browser, production build, live ledger, or external accounts were verified by this reviewer.

## Required follow-through

Repair and independently rerun the consumed-evidence and membership checks before activation. Re-run this assessment against repaired draft fixtures and contextual editing. Finish or explicitly report the persistent matching, deeper profile enrichment, real varied-case evaluation, and UI-to-real-database journey as incomplete until demonstrated. Automatic reply reading must remain disconnected. Preserve owner-private drafts, immutable submitted outcomes, controlled officer appointment, and exact-message approval in all repairs.

## Independent repair review

A second independent review used `f370923`, then cherry-picked root integration `b7a838b` into the isolated worktree. The original findings above describe the first revision and remain historical evidence. The repairs below supersede only the named findings.

The full-chain standalone withdrawal reproduction now includes `20261010020426_research_evidence_approval_guard.sql` and `20261010020659_research_matches_and_projection_guards.sql`. Exclusion, withdrawal, and supersession each reject unchanged reapproval. Supersession also rejects a previously approved send claim directly. A distinct officer sender and member subject reproduction disables the subject after approval; both reapproval and send reject with “Represented member is inactive.” This repairs the originally reproduced critical bypass. Submitted uncertain outcomes remain immutable; the new checks apply to future claims. These reproductions invoke only local PGlite, never a provider.

Persistent matching now has an actual officer-authorized producer, frozen match selection in the planner, project/option selection, and UI integration. Sharing eligibility and enabled subjects are applied before the selected local projection. The match producer filters relationship suppression and known alias suppressions after `b7a838b`, and returns bounded coordination metadata. However, `b7a838b` computes topic overlap from `row.disciplines`, while database rows use `discipline` (as demonstrated by `targetFromRow`). This makes all declared-topic overlaps zero at that reviewed revision and requires repair.

The local revision utility now recognizes generated pilot and resource asks. The preview can apply only against the same proposal revision and unchanged editor buffer. Exact mapped claim removal is implemented, and saving prunes dependencies only for literal removed supported text. This is a safe editing aid, not semantic proof that a paraphrased fact has disappeared. A rewrite drops its sentence mapping while retaining dependencies; later removal may therefore require rebuilding the proposal to clear those dependencies. Preserve unresolved maps or explain this limitation in the editor.

**New high-severity reproduction: cold duplicate via proven aliases.** On the full chain through 20659, send-claim and locally finish the original proposal for `https://uta.edu/lab` / `pi@example.com`. Record the relationship. Add a proven relationship alias `https://uta.edu/new-lab` and `new-contact@example.com`, then create a second cold society proposal against the new target with the same relationship ID. `outreach_approve_email` succeeds. The reproduction prints `SECOND COLD SAME ALIAS RELATIONSHIP APPROVED`. Approval duplicate detection compares the previous outbox relationship URL or exact recipient rather than the stable resolved relationship/alias set. This permits competing cold approaches after a contact/URL change even when the system already knows they are one relationship. Resolve both current and previous identities inside the serialized approval transaction, including an omitted or forged request relationship ID. Keep the owned explicit follow-up exception and unresolved-submission protection. This finding was sent to the lead immediately.

### Recomputed quality cases

The reviewer was explicitly assigned fixture/test ownership for this second pass. The 12 fixtures now contain distinct technical source excerpts and bounded tasks. The actual stale case includes a 2020 retrieval/publication date and explicit former affiliation. The duplicate case includes a previous external-email event, stable relationship, different target ID, and alias keys. The ambiguous paper identifies other authors and an interest-only link. These remain synthetic, with no claim of actual opportunity availability. The before outputs were regenerated from the pinned baseline writer; the after outputs and plans were regenerated by executing the current `buildContributionPlan` and `tailorOutreachDraft` using the same case evidence. Planning tests now execute those functions and compare results to the recorded artifacts rather than merely inspecting saved strings.

The revised writer replaces the awkward pilot phrase with “Would it be useful to explore a small pilot? A possible scope is to …”. Beginner, ambiguous-paper and interest-only cases now request a public paper or introductory resource, which is more answerable than asking whether learning more is useful. The smaller-ask action transforms generated pilot/resource requests without transmitting private text. The unresolved model quote still falls back to valid local evidence; missing evidence retains the approval-blocking REVIEW placeholder.

| Case | Independent assessment of recomputed result |
| - | - |
| local-physical | Physical gripper/repeatability source now identifies a real access question within the synthetic case; proposed public calibration checklist is bounded. Travel/lab access still requires officer review. |
| remote-strong | Public image-corruption benchmark and reproducible error-table scope give an actual remote technical connection. Current fixture writer alone cannot prove rank order across targets. |
| beginner | Open imitation-policy tutorial supports a specific resource request with no fabricated implementation experience. |
| ambiguous-paper | Colony-growth protocol motivates a reading question. No linking-member authorship or capability is asserted. |
| team-repository | Parser regression source connects to the member's narrowly stated tests for one parser. Single failure/test scope is clearer than generic benchmarking. |
| stale-affiliation | The message quotes the historical 2020 statement accurately, and plan unknowns flag current institution/contact/project status. The writer does not itself enforce new current-contact evidence; officer readiness and identity review are still required. |
| weak-evidence | Placeholder is retained and model suggestions are unused. The resource question is modest; source repair remains necessary. |
| duplicate-lab | Simulator-consistency scope is more concrete, but the writer does not consume coordination state. Actual duplicate protection is evaluated by the separately reproduced SQL failure above. |
| unknown-availability | Notebook/missing-value sensitivity table is a small possible scope; participation is explicitly confirmed before committing. No time promise is invented. |
| physical-inaccessible | Source now explicitly requires an on-site scanner/restricted images and offers no remote dataset. A public-guidance question avoids promising scanner access, but selection must enforce the member's access preferences. |
| interest-only | Public light curves and periodicity support an answerable introductory-resource question without capability claims. |
| model-unsupported-quote | Collision-error source is quoted locally; forged model support is rejected. The request remains a modest public-resource question. |

These results improve specificity and editing burden relative to the placeholders, while keeping supported facts and self-report distinct. Repeated quote-and-link structure still sounds formulaic, and no reviewer should infer response-rate superiority. The deeper method/project extraction and page-aware PDF acquisition remain incomplete in the inspected implementation; PDFs honestly stay references.

Five focused repaired suites passed **24 checks** before fixture regeneration: approval context database, relationship database, profile packet, research planning, and local draft revisions. The independently regenerated planning suite passed all **14 checks**. These are local implementation checks; external operation and full UI-to-real-database verification remain outside this review.
