---
title: Use statistics that strengthen the work
description: Summarize variation, choose analysis from the study design, and separate visible, statistical, and practical importance.
slug: statistics-for-student-research
category: Analyze
stage: Doing the work
readingMinutes: 10
updated: 2026-09-22
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

## Show uncertainty honestly

Error bars are not self-explanatory. State whether they show standard deviation, standard error, a confidence interval, or something else.

A confidence interval estimates a range produced by a model and sampling procedure. It is not a guarantee that every future result will fall inside it, and it does not erase bias in the sample or measurement.

Effect size answers “how much?” Statistical testing addresses how compatible the observed result is with a specified model or null hypothesis. Practical importance asks whether the size matters in the real system.

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

## Correlation is not causation

An association may reflect reverse causation, selection, measurement error, or a third variable. Causal language requires a design and assumptions that justify it—not merely a small p-value or a machine-learning model with high accuracy.

## Avoid multiple-comparison fishing

If you test many outcomes, subgroups, time points, or model variants, some may look unusual by chance. Define a primary question, distinguish planned analyses from exploration, and disclose the full set of relevant comparisons. Do not hide trials or keep changing tests until one crosses a threshold.

## Plan sample size before collection

Required sample size depends on the effect worth detecting, expected variability, design, acceptable uncertainty, and analysis—not a universal minimum. A small careful pilot can estimate procedure reliability, but broad claims from tiny samples are rarely justified.

::guide-callout{title="Minimum reporting set" tone="action"}
Show the observations when practical; define the sample and exclusions; report center, variability, effect size, uncertainty, and analysis assumptions; distinguish planned from exploratory work; keep unfavorable trials visible.
::
