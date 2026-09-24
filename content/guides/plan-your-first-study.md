---
title: Plan your first study
description: Define the evidence, baseline, measurements, pilot, failure modes, approvals, and backups before collecting the final data.
slug: plan-your-first-study
category: Design
stage: Planning
readingMinutes: 15
updated: 2026-09-24
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

Draft the kind of sentence your study should eventually support:

> Compared with the **vision-only baseline**, the **touch-assisted controller** changed the **object-drop rate** across **120 simulated grasps** under **three visibility conditions**.

You do not know the direction or size yet. The sentence simply exposes the comparison, outcome, cases, and conditions that the plan must define.

Now work backward:

- What raw observations produce the primary metric?
- How many independent samples, people, runs, sites, or cases are needed?
- Which repetitions measure random variability, and which are genuinely new samples?
- What comparison would make the result meaningful?
- What must remain constant?
- What metadata will explain failures later?

Ten measurements from the same object are not automatically ten independent samples. Repeated trials can estimate measurement variability; they do not necessarily expand the population your claim covers.

### Name the experimental unit before counting n

Ten readings from one sensor in one water sample estimate **reading repeatability**. They do not establish variation across sensors, prepared samples, days, or locations. Which of those is the independent unit depends on the claim.

If the claim is “this device is repeatable over short intervals,” repeated readings may fit. If the claim is “the design performs across units and conditions,” you need independently built devices or independently prepared cases across the relevant conditions. Averaging repeated readings can improve one unit’s measurement; it does not manufacture more units.

## Write a one-page protocol

Use a protocol that another student could run without guessing:

| Decision           | Example for a low-cost turbidity sensor                                 |
| ------------------ | ----------------------------------------------------------------------- |
| Question           | Does the prototype track a reference meter across the chosen range?     |
| Unit               | One independently prepared sample; readings within it are repeats       |
| Cases              | Prespecified concentrations prepared with the same documented procedure |
| Baseline           | Reference meter and a simple calibration model                          |
| Primary outcome    | Absolute percentage error, with units and formula defined               |
| Run order          | Randomized within each batch to reduce drift/order bias                 |
| Nuisance variables | Temperature, container geometry, ambient light, device ID, batch        |
| Failure rule       | Saturated or missing readings retained as failures and coded explicitly |
| Stop rule          | Planned samples completed or a stated safety/equipment boundary reached |
| Backup             | Narrow the operating range if the pilot documents saturation            |

This is an illustrative protocol, not permission to conduct a particular procedure. Materials, devices, people, organisms, and competition rules determine the real safety and approval path.

Randomize run order when drift, fatigue, or learning could favor one condition. Block by day, device, batch, or site when those sources vary. Blind labels during measurement or annotation when expectations could influence judgment. These controls are not rituals: each addresses a plausible way the result could be biased.

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

Write the pilot decision before running it. For example: “If more than 10% of readings saturate above the third concentration, recalibrate or narrow the range; if colocated-device disagreement exceeds the smallest important difference, improve measurement before comparing conditions.” The exact threshold needs a rationale, not a convenient round number.

## Define stopping and failure rules

Set a stopping condition based on sample count, time, material, or a safety/feasibility boundary—not whether the result becomes favorable. List expected failures and the response to each.

| Failure                     | Planned response                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Sensor misses a reading     | Keep the missing value; record the error code; do not invent a value.                  |
| Simulation crashes          | Save the seed/configuration; retry once under a predefined rule.                       |
| Recruitment is below target | Report the smaller sample and narrow the claim; do not add unapproved groups.          |
| Prototype part breaks       | Record the failure mode; use the documented spare; preserve the failed part if useful. |

Maintain a backup path: an open dataset if field collection fails, a simpler baseline if the full implementation overruns, or a reduced but still meaningful operating range.

## Make the data trail reconstructable

A practical project folder can remain simple:

- `raw/` — immutable exports exactly as collected;
- `metadata/` — sample IDs, conditions, device, batch, date, and deviations;
- `scripts/` — processing and analysis with versions recorded;
- `derived/` — cleaned tables that can be regenerated;
- `figures/` — outputs generated from the analysis table;
- `README.md` — the map connecting files, variables, units, and decisions.

Create a data dictionary before final collection: column name, meaning, unit, allowed values, missing-value code, and source. Never use names or direct identifiers as convenient sample IDs. Preserve the mapping only when it is necessary, approved, and appropriately protected.

::guide-callout{title="Approval comes before experimentation" tone="warning"}
Projects involving human participants, vertebrate animals, potentially hazardous biological agents, hazardous chemicals, devices, radiation, controlled substances, or other regulated activities may require review, supervision, forms, or approval **before** experimentation begins. Approval cannot be assumed or retroactively repaired. Use the current [Society for Science Rules Wizard](https://ruleswizard.societyforscience.org/) and [International Rules](https://www.societyforscience.org/isef/international-rules/), then confirm requirements with your fair, school, and supervising adult.
::

Do not label every project “human subjects” or “hazardous” automatically. Determine the actual category from current rules. Public, de-identified datasets may be treated differently from interacting with participants, but the source license, privacy terms, local policy, and competition rules still apply.

## Keep a research log

For every session, record date/time, objective, version or configuration, sample IDs, raw file locations, deviations, observations, and next action. Photographs and code commits help, but they do not replace a short explanation of what happened and why.

At the end, another student should be able to reconstruct the evidence path without guessing which file or trial you preferred.
