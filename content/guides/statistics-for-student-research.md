---
title: Use statistics that strengthen the work
description: Summarize variation, choose analysis from the study design, and separate visible, statistical, and practical importance.
slug: statistics-for-student-research
category: Analyze
stage: Doing the work
readingMinutes: 15
updated: 2026-09-24
featured: false
order: 6
related:
  - plan-your-first-study
  - make-clear-research-graphs
  - explain-why-research-matters
resources:
  - title: NIST/SEMATECH e-Handbook of Statistical Methods
    url: https://www.itl.nist.gov/div898/handbook/
    note: Authoritative reference for distributions, uncertainty, testing, and experimental design.
  - title: American Statistical Association — Statement on p-values
    url: https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf
    note: What p-values do and do not establish.
tags:
  - statistics
  - p-values
  - confidence intervals
  - effect size
---

Statistics cannot repair a weak design. They help you describe the evidence, quantify uncertainty, and decide how far a conclusion can travel.

## Start with the data you actually have

Plot the observations before choosing a test. Look for shape, clusters, outliers, missing values, ceiling/floor effects, and changes in variability.

- Use the **mean** when the arithmetic average matches the question and extreme values are not distorting the summary.
- Use the **median** when the middle observation is more representative of a skewed distribution or when extremes are influential.
- Always pair center with **variability**: range, interquartile range, standard deviation, or another measure appropriate to the data.
- Report the sample size and what counts as an independent sample.

Three repeated readings from one sensor may show repeatability. They do not establish how the sensor performs across different devices, days, environments, or populations.

### Work a small dataset before naming a test

Suppose independently prepared samples produce these percentage errors:

- baseline sensor: **12, 15, 11, 18, 14, 16**;
- revised sensor: **9, 8, 12, 7, 10, 14**.

The baseline mean is 14.3%; the revised mean is 10.0%, an illustrative difference of **−4.3 percentage points**. But the work is not finished. Plot all twelve values. Notice the overlap and the 14% revised observation. Ask whether samples were truly independent, measured in randomized order, and drawn from the operating range the claim names. Then estimate uncertainty using an analysis compatible with the design.

If all six readings per group came from one physical sample, treating them as six independent units would overstate the evidence. The calculation cannot repair the unit-of-analysis mistake.

## Show uncertainty honestly

Error bars are not self-explanatory. State whether they show standard deviation, standard error, a confidence interval, or something else.

A confidence interval estimates a range produced by a model and sampling procedure. It is not a guarantee that every future result will fall inside it, and it does not erase bias in the sample or measurement.

Effect size answers “how much?” Statistical testing addresses how compatible the observed result is with a specified model or null hypothesis. Practical importance asks whether the size matters in the real system.

Standard deviation, standard error, and a confidence interval answer different questions. **Standard deviation** describes variation among observations. **Standard error** describes model-based uncertainty in an estimate under sampling assumptions. A **confidence interval** gives a range produced by the estimation procedure. Label the quantity; “error bars” alone is incomplete.

::statistics-meaning-diagram
::

## Understand what a p-value is not

A p-value is calculated under assumptions, including a null model. It is **not**:

- the probability that your hypothesis is true;
- the probability that the result happened “by chance” in ordinary language;
- the size or importance of an effect;
- proof that the study is unbiased or reproducible;
- a substitute for showing the data and design.

Do not turn `p < 0.05` into “proved.” Report the exact value when appropriate, the effect estimate, uncertainty, sample, and limitations.

## Choose analysis from the design

Ask these questions before naming a test:

1. What type of outcome is measured: continuous, count, binary, category, time-to-event, rank, or something else?
2. Are groups independent, paired, or repeatedly measured?
3. How was the sample selected or assigned?
4. What distributional and independence assumptions are plausible?
5. Is the question a difference, association, prediction, estimation, or equivalence question?

Consult a knowledgeable teacher or mentor when the analysis affects a major claim. An advanced-looking test is not better if its assumptions do not fit.

Start from the quantity you want to estimate:

| Design question                       | What the analysis must preserve                                            |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Difference between independent groups | Independent units, group definition, variability, and important covariates |
| Before/after change on the same units | Pairing; do not analyze the columns as unrelated groups                    |
| Repeated measurements over time       | Dependence within each unit and the actual time scale                      |
| Prediction on new cases               | Separation of training, tuning, and final testing                          |
| Association in observational data     | Confounding, selection, measurement quality, and noncausal wording         |

Only after defining the quantity and dependence should you select a named test or model. Check assumptions and show sensitivity when a reasonable choice changes the conclusion.

For student machine-learning work, keep the final test set untouched until the model and settings are chosen. Prevent the same person, specimen, site, or near-duplicate from leaking across splits. With imbalanced classes, accuracy can look high while the rare class fails; report a confusion matrix and metrics tied to the actual decision. Calibration asks whether predicted probabilities match observed frequencies—a different question from ranking accuracy.

## Correlation is not causation

An association may reflect reverse causation, selection, measurement error, or a third variable. Causal language requires a design and assumptions that justify it—not merely a small p-value or a machine-learning model with high accuracy.

## Avoid multiple-comparison fishing

If you test many outcomes, subgroups, time points, or model variants, some may look unusual by chance. Define a primary question, distinguish planned analyses from exploration, and disclose the full set of relevant comparisons. Do not hide trials or keep changing tests until one crosses a threshold.

If you inspect 20 outcomes and report only the smallest p-value, the selection process is part of the evidence. Label analyses chosen after seeing the data as exploratory; they can generate the next study but should not masquerade as the original hypothesis.

## Plan sample size before collection

Required sample size depends on the effect worth detecting, expected variability, design, acceptable uncertainty, and analysis—not a universal minimum. A small careful pilot can estimate procedure reliability, but broad claims from tiny samples are rarely justified.

Plan from the smallest effect that would matter, expected variation, unit and design, desired precision or power, likely failures, and the feasible cap. Tiny pilots provide unstable estimates of variability; use prior work, domain knowledge, and transparent sensitivity ranges when possible.

### Repair a statistical sentence

Weak: “The new sensor was significantly better (`p < .05`).”

Useful: “Across 24 independently prepared samples, the revised sensor’s mean absolute error was 4.3 percentage points lower than the baseline (95% confidence interval: [calculated interval]; exact p-value: [calculated value]). The analysis was prespecified, but both devices were tested on one day, so day-to-day stability remains unknown.”

Never insert the bracketed values until they are calculated from the real data and justified model.

::guide-callout{title="Minimum reporting set" tone="action"}
Show the observations when practical; define the sample and exclusions; report center, variability, effect size, uncertainty, and analysis assumptions; distinguish planned from exploratory work; keep unfavorable trials visible.
::
