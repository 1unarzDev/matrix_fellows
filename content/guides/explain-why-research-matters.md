---
title: Explain impact without overselling
description: Separate measured results, interpretation, potential impact, and impact that has actually been demonstrated.
slug: explain-why-research-matters
category: Communicate
stage: Sharing the work
readingMinutes: 12
updated: 2026-09-24
featured: false
order: 9
related:
  - make-clear-research-graphs
  - write-a-research-abstract
  - present-research-clearly
resources:
  - title: Society for Science — ISEF judging criteria
    url: https://www.societyforscience.org/isef/grand-award/criteria/
    note: Conclusions, limitations, contribution, and potential impact are judged separately.
tags:
  - impact
  - claims
  - limitations
---

Importance is strongest when a reader can see exactly where the evidence ends.

::claim-ladder
::

## Trace the missing links

Impact is a chain, not a synonym for a promising result:

> measured result → interpretation → performance in a realistic setting → effect on a person or decision → broader adoption

Mark which links your project actually tested. A classifier evaluated retrospectively on one image archive may establish discrimination on that dataset. It does not yet establish calibration on another hospital’s data, performance in a prospective workflow, better patient outcomes, acceptable cost, or absence of unequal harm.

| Question              | What to write                                                         |
| --------------------- | --------------------------------------------------------------------- |
| Who may benefit?      | A specific person, group, system, or decision-maker                   |
| Compared with what?   | The current method, cost, delay, error, or no-action option           |
| What changed here?    | The measured effect with denominator and conditions                   |
| What could worsen?    | Cost, access, error tradeoff, burden, safety, or environmental impact |
| What remains assumed? | The untested link between your result and real use                    |
| What test comes next? | Evidence that would reduce the most important uncertainty             |

## Use claim verbs deliberately

- **Results show or estimate:** “Error was 3.4 percentage points lower in this test set.”
- **Interpretations suggest or support:** “The pattern supports the hypothesis that added tactile input helps under low visibility.”
- **Potential impacts may or could:** “If the effect generalizes, the method could reduce failures in similar low-cost grippers.”
- **Demonstrated impacts did:** “In a six-week classroom deployment, setup time fell by 18 minutes per session.”

Avoid “proves,” “solves,” “revolutionizes,” and “will save” unless the study design and real-world evidence genuinely support those words.

## Replace scale inflation with specificity

Avoid: “This will revolutionize medicine.”

Prefer: “In this retrospective dataset, the image classifier reduced false negatives from 12% to 9% relative to logistic regression. The result needs external and prospective validation before clinical use.”

Avoid: “Our biodegradable material will eliminate plastic pollution.”

Prefer: “The prototype lost 31% of its mass under the tested composting condition while retaining the required strength for seven days. Cost, toxicity, manufacturing scale, and behavior outside this condition were not tested.”

Numbers do not make an overclaim safe. The population, comparison, time period, and conditions must travel with the number.

Relative changes need absolute quantities. “Failures fell by 50%” means something very different when the rate changes from 2 in 100 to 1 in 100 than from 40 in 100 to 20 in 100. Report counts or rates, denominators, time, uncertainty, and any tradeoff in another error.

### Follow one claim through the chain

Suppose a retrospective image classifier reduces false negatives from 12% to 9% at a prespecified operating point on one held-out archive. A bounded interpretation is that it performed better than the chosen baseline **for that dataset and threshold**. Potential impact begins only with further evidence: external validation, calibration across relevant groups, prospective workflow testing, consequences of false positives, clinician interaction, and cost. “May support earlier review if the effect generalizes” is a hypothesis; “improves patient outcomes” is not yet demonstrated.

A materials project needs the same discipline. Faster degradation in one controlled composting condition is not evidence of lower life-cycle impact. Manufacturing energy, toxicity, performance, disposal behavior, and the displaced alternative remain separate links.

## Put limitations next to the claim

Useful limitations identify how the result could change:

- sample size or selection;
- measurement precision;
- untested populations or environments;
- confounding variables;
- simulated rather than real operation;
- short observation period;
- baseline quality;
- model or material assumptions.

Do not write “more research is needed” alone. State the next test that addresses the limitation.

Write limitations as consequences: “Because all images came from one archive, performance under different scanners and prevalence is unknown; evaluation on a separately collected dataset is the next test.” This tells the reader exactly which claim must stop and how it could advance.

::guide-callout{title="The credibility test" tone="action"}
For every impact sentence, underline the evidence that directly supports it. If no evidence is underlined, label it as a possibility, narrow it, or remove it.
::
