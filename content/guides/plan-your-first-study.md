---
title: Plan your first study
description: Define the evidence, baseline, measurements, pilot, failure modes, approvals, and backups before collecting the final data.
slug: plan-your-first-study
category: Design
stage: Planning
readingMinutes: 9
updated: 2026-09-22
featured: true
order: 5
related:
  - shape-a-research-question
  - statistics-for-student-research
  - make-clear-research-graphs
resources:
  - title: Society for Science — Rules Wizard
    url: https://ruleswizard.societyforscience.org/
    note: Determine which rules and approvals may apply before experimentation.
  - title: Society for Science — International Rules
    url: https://www.societyforscience.org/isef/international-rules/
    note: Use the current-year rules and forms for ISEF-affiliated work.
tags:
  - study design
  - experiment
  - pilot
  - ISEF rules
---

A study plan is not a calendar. It is an argument: if you gather this evidence under these conditions, the result will answer the question better than the obvious alternatives.

::study-plan-canvas
::

## Start from the evidence

Write the final result sentence with blanks: “Compared with **baseline**, condition or design **X** changed **primary metric** by **amount**, across **sample/cases**, under **conditions**.”

Now work backward:

- What raw observations produce the primary metric?
- How many independent samples, people, runs, sites, or cases are needed?
- Which repetitions measure random variability, and which are genuinely new samples?
- What comparison would make the result meaningful?
- What must remain constant?
- What metadata will explain failures later?

Ten measurements from the same object are not automatically ten independent samples. Repeated trials can estimate measurement variability; they do not necessarily expand the population your claim covers.

## Choose one primary metric before results

Define the main outcome and analysis before collecting final data. Secondary measurements are useful, but choosing whichever metric looks best afterward inflates the chance of a misleading story.

Write units, calculation steps, exclusion rules, and how missing or failed trials will be handled. Preserve raw data separately from cleaned data. Use stable sample IDs rather than names when personal data is involved.

## Run a pilot that is allowed to fail

A pilot tests the procedure, not the hypothesis. Use it to discover:

- sensors that saturate or drift;
- software that cannot finish within available time;
- ambiguous instructions;
- data formats that lose important information;
- samples you cannot obtain consistently;
- safety or supervision requirements you missed;
- a baseline that is unfair or impossible to reproduce.

Do not quietly mix pilot measurements into the final dataset if the procedure changed.

## Define stopping and failure rules

Set a stopping condition based on sample count, time, material, or a safety/feasibility boundary—not whether the result becomes favorable. List expected failures and the response to each.

| Failure                     | Planned response                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Sensor misses a reading     | Keep the missing value; record the error code; do not invent a value.                  |
| Simulation crashes          | Save the seed/configuration; retry once under a predefined rule.                       |
| Recruitment is below target | Report the smaller sample and narrow the claim; do not add unapproved groups.          |
| Prototype part breaks       | Record the failure mode; use the documented spare; preserve the failed part if useful. |

Maintain a backup path: an open dataset if field collection fails, a simpler baseline if the full implementation overruns, or a reduced but still meaningful operating range.

::guide-callout{title="Approval comes before experimentation" tone="warning"}
Projects involving human participants, vertebrate animals, potentially hazardous biological agents, hazardous chemicals, devices, radiation, controlled substances, or other regulated activities may require review, supervision, forms, or approval **before** experimentation begins. Approval cannot be assumed or retroactively repaired. Use the current [Society for Science Rules Wizard](https://ruleswizard.societyforscience.org/) and [International Rules](https://www.societyforscience.org/isef/international-rules/), then confirm requirements with your fair, school, and supervising adult.
::

Do not label every project “human subjects” or “hazardous” automatically. Determine the actual category from current rules. Public, de-identified datasets may be treated differently from interacting with participants, but the source license, privacy terms, local policy, and competition rules still apply.

## Keep a research log

For every session, record date/time, objective, version or configuration, sample IDs, raw file locations, deviations, observations, and next action. Photographs and code commits help, but they do not replace a short explanation of what happened and why.

At the end, another student should be able to reconstruct the evidence path without guessing which file or trial you preferred.
