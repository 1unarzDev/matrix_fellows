---
title: Read a paper without getting lost
description: Use deliberate passes to locate the research problem, evidence, contribution, and limitations before diving into every technical detail.
slug: read-a-research-paper
category: Start
stage: Starting out
readingMinutes: 13
updated: 2026-09-24
featured: false
order: 3
related:
  - find-a-research-idea
  - shape-a-research-question
resources:
  - title: PLOS — Ten simple rules for reading a scientific paper
    url: https://doi.org/10.1371/journal.pcbi.1008032
    note: An approachable, goal-directed method for connecting questions, evidence, figures, and conclusions.
  - title: S. Keshav — How to Read a Paper
    url: https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf
    note: A classic three-pass strategy; useful for technical papers after you know your reading goal.
  - title: Harvard Library — The literature review
    url: https://guides.library.harvard.edu/dougbond/orienting
    note: Connect individual papers into a map of the field.
tags:
  - papers
  - reading
  - literature
  - citations
---

You do not have to read a paper from the first word to the last. Your first job is to discover what kind of paper it is and whether it deserves deeper attention.

## Decide what reading job you are doing

| Job                 | You are done when you can…                                                |
| ------------------- | ------------------------------------------------------------------------- |
| Screen              | Decide whether the paper is relevant and credible enough to keep          |
| Understand          | Explain its question, method, main evidence, and boundary                 |
| Evaluate            | Judge whether the comparison, sample, measurement, and conclusion connect |
| Reproduce or extend | Reconstruct procedures, processing, parameters, code, and decision rules  |

Most papers only need screening. A paper that supplies your central method deserves evaluation; one you intend to reproduce requires its supplement, code, data documentation, and sometimes the methods it cites.

## Use a seven-pass workflow

1. **Title and abstract:** What problem, method, and headline result does the paper claim?
2. **Figures and captions:** What was actually measured or built? Can you identify the main comparison?
3. **Introduction:** Why do the authors say the problem matters? What gap do they claim?
4. **Main result:** Find the table, figure, proof, or qualitative evidence that supports the central claim.
5. **Conclusion and limitations:** What do the authors believe follows—and where do they admit uncertainty?
6. **Methods when needed:** Read the parts required to judge or reproduce the evidence.
7. **Return for detail:** Only now resolve equations, unfamiliar procedures, appendices, or implementation choices relevant to your purpose.

At the end of the first five passes, decide whether to stop, save it as background, or study it closely.

This is a **Matrix reading workflow**, not a rule from a journal. Skip or repeat a pass when your purpose requires it.

::paper-notes-template
::

Do not leave the template blank. A compact illustrative entry might read:

- **Problem:** Can a low-cost tactile signal reduce simulated grasp failures when vision is partly blocked?
- **Method:** The same controller and seeded grasp cases, with versus without tactile input.
- **Baseline:** Vision-only control under identical objects and visibility conditions.
- **Strongest result:** Drop rate decreased from 18% to 11% across 120 simulated grasps.
- **Limitation:** Simplified contact physics; no physical sensor noise or new object families.
- **Question created:** Does the advantage remain after adding measured noise on a real gripper?

These numbers are teaching data, not a published finding. For a real paper, preserve exact values and conditions before paraphrasing.

## Read one figure as an argument

For the panel carrying the main claim, answer in order:

1. What does one point, line, image, or row represent?
2. Which observations are independent, and which repeat the same unit?
3. What are the axes, units, conditions, and sample sizes?
4. Is the baseline a fair comparison?
5. What normalization, filtering, aggregation, or model selection produced the display?
6. What pattern is visible before reading the authors’ interpretation?
7. What uncertainty is shown, and what remains hidden?

Imagine a chart where a new classifier’s average accuracy exceeds a baseline. Before accepting “better performance,” check whether the test set remained untouched during tuning, whether classes are imbalanced, whether runs use different seeds, and whether accuracy reflects the actual cost of false positives and false negatives.

Trace the central sentence explicitly:

> **Claim** → exact figure or table → sample or data → comparison and analysis → conditions where it holds.

If a link is missing, you know where to read. A claim of mechanism supported only by correlation, or a general claim supported by one narrow sample, should remain visible in your notes.

## Separate vocabulary trouble from contribution trouble

Unknown vocabulary is local. Highlight the term, infer its role from context, then consult a textbook, review paper, or reliable reference. You may still understand the paper’s contribution.

Contribution trouble is different: you cannot state what changed compared with prior work, what evidence supports it, or why the result matters. Return to the introduction, main figure, baseline, and conclusion. If those still do not connect, the paper may be unclear—or you may need a review paper first.

Method trouble is different again: you understand the goal but cannot reconstruct the procedure. Look in the supplement, protocol, repository, data dictionary, and cited methods. Evidence trouble means the claimed conclusion does not follow cleanly from the measurement; that may be a limitation of the paper rather than of your reading.

::guide-callout{title="A sentence test" tone="action"}
Try: “The authors ask _this question_, compare _these approaches_ using _this evidence_, find _this result_, and warn about _this limitation_.” Any phrase you cannot replace in your own words shows exactly where to reread.
::

## Read results skeptically

For every main result, ask:

- What is the baseline or comparison?
- What data, sample, or cases were included—and excluded?
- Does the metric represent the real goal?
- How much variability or uncertainty is visible?
- Is the improvement large in practical terms?
- Does the conclusion go beyond the tested population or conditions?

Also look, when relevant, for data leakage, technical replicates counted as independent samples, outcome switching, exclusions chosen after results were visible, weak baselines, and metrics that do not represent the real objective. Finding a risk does not automatically invalidate a paper; state how it could change the conclusion and whether the authors tested it.

Do not assume “statistically significant,” “state of the art,” or a visually dramatic plot means the result is useful or broadly generalizable.

## Use citations as a map

References in the introduction lead backward to foundational methods and competing explanations. “Cited by” links lead forward to replications, corrections, extensions, and later uses. Review papers group these routes into a field-level map.

Keep a small literature table: citation, question, method, dataset/sample, result, limitation, and relevance to your idea. Patterns across rows are more useful than a pile of PDFs.

When papers appear to disagree, first compare their populations, conditions, interventions or exposures, outcomes, designs, and uncertainty. Different headlines often answer different questions. One carefully run paper can contribute useful evidence without settling the field.

## Know when you are done

Your purpose determines depth. To decide whether a topic is promising, the main question and limitations may be enough. To reproduce the work, you need methods, parameter choices, data processing, and supplementary material. To cite a claim, read the original context—never rely on another paper’s one-sentence summary.
