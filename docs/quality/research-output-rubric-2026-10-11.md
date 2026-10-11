# Research candidate output review — 2026-10-11

An independent review of the 12 representative candidate fixtures assessed the raw Gemini `publicAnalysis` before the local contribution-plan builder added its conservative defaults. The rubric is 16 points, with two points for each dimension:

| Dimension | Full credit | Review gap seen in the fixtures |
| --- | --- | --- |
| Source fidelity | Every proposal and research signal quotes the reviewed excerpt exactly | One unsupported quote was correctly rejected; the remaining accepted options were usually source-backed |
| Bounded specificity | A named research topic, small task, and verifiable deliverable | Most options had a usable task, but the task structure was not explicit |
| Research signals | At least one claim with an exact supporting quote | Raw outputs did not expose this separately |
| Access signals | Practical mode, location, equipment, or access limits are stated | Access was generally absent from model output |
| Recipient ask | A modest question or request useful to the recipient | Supervision questions were often generic |
| Unknowns | Identity/currentness, openness/need, practical access, and eligibility/data/privacy gaps remain visible | 11 of 12 outputs had empty unknown lists |
| Option discipline | No more than two bounded options | Existing output was within the limit after the new contract |
| Themes | Research themes are concrete and source grounded | Themes were usually present but lacked supporting claim structure |

The target is at least 12/16 with exact source support for every option. A result below that threshold remains `review_only`; it is not presented as an established opportunity, recruiting need, affiliation, authorship claim, or commitment. The raw fixtures averaged approximately 9–10/16. The derived local contribution plan adds a useful beginner-safe question and conservative unknowns, but that improvement is reported separately from Gemini quality.

The worker now uses the `bounded-contribution-v2` prompt. It requests structured research and access signals, a source-backed bounded task, deliverable, recipient ask, constraints, and explicit unknown categories. The worker attaches the reviewed source URL and related first-party links after model generation, validates research-signal quotes as well as proposal quotes, and records the rubric score and missing dimensions with the analysis.
