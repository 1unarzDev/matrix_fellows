---
title: Make graphs that explain results
description: Choose a display that matches the question, show observations honestly, and write captions that state the real takeaway.
slug: make-clear-research-graphs
category: Communicate
stage: Sharing the work
readingMinutes: 7
updated: 2026-09-22
featured: false
order: 8
related:
  - statistics-for-student-research
  - build-a-science-fair-poster
  - explain-why-research-matters
resources:
  - title: MIT Communication Lab — Figure design
    url: https://mitcommlab.mit.edu/broad/commkit/figure-design/
    note: Match display form to the claim and reduce unrelated visual noise.
  - title: W3C — Complex images
    url: https://www.w3.org/WAI/tutorials/images/complex/
    note: Provide usable descriptions for charts and diagrams.
tags:
  - graphs
  - figures
  - data visualization
  - accessibility
---

Choose a graph from the question, not from the chart menu.

## Match form to purpose

- **Compare distributions:** dot plots, box plots, violin plots, or histograms—often with individual observations.
- **Compare a small number of estimates:** points with intervals; bars only when length from a meaningful zero is the message.
- **Show change over time:** line plots with the actual time scale and missing periods visible.
- **Show a relationship:** scatterplots, optionally with a justified fitted model and uncertainty.
- **Show composition:** stacked displays only when part-to-whole comparison is genuinely important.
- **Show spatial structure:** maps or images with a scale, legend, and documented processing.

A pie chart is not the automatic choice for percentages. A bar chart is not the automatic choice for every comparison.

::graph-comparison-diagram
::

## Make the evidence inspectable

Label axes, units, conditions, and sample size. Show actual observations when practical. Define every line, band, error bar, normalization, and transformation. Use the same scale across plots that invite direct comparison.

Do not use 3D perspective, broken axes, cropped ranges, or area/volume effects to exaggerate differences. A nonzero axis can be appropriate for continuous measurements when the visible range is clearly labeled and interpretation is not distorted; explain important choices.

## Write a takeaway caption

Bad: “Figure 2. Results.”

Better: “Method X reduced median localization error by 24% versus the reactive baseline across 30 held-out simulations; points show runs and bars show 95% bootstrap confidence intervals.”

The caption should let a reader understand the claim, comparison, sample, and uncertainty without searching the paragraph above it.

## Use color as reinforcement

Choose a restrained, color-vision-aware palette. Keep the same condition the same color across every figure. Add direct labels, symbols, line styles, or patterns so color is not the only way to distinguish groups.

For digital publication, provide a short text alternative and a longer description when the chart carries details not available nearby. The [W3C complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/) gives patterns for accessible chart descriptions.

## Preserve the unflattering data

Show relevant failed trials, outliers, and exclusions according to rules defined before the result. If an observation is removed, state the reason and show whether the conclusion changes. Never select only favorable runs or smooth a line without disclosing the method.

::guide-callout{title="Final figure check" tone="action"}
Can someone identify the question, groups, units, sample, main pattern, uncertainty, and limitation without hearing you speak? If not, fix the figure or caption before adding decoration.
::
