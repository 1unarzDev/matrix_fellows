---
title: Make graphs that explain results
description: Choose a display that matches the question, show observations honestly, and write captions that state the real takeaway.
slug: make-clear-research-graphs
category: Communicate
stage: Sharing the work
readingMinutes: 12
updated: 2026-09-24
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

Before opening graphing software, write a figure specification:

| Decision              | Record it explicitly                                              |
| --------------------- | ----------------------------------------------------------------- |
| Intended claim        | The one comparison or pattern the figure supports                 |
| Observation unit      | What one point, line, or image represents                         |
| Variables             | Names, units, scales, and relevant range                          |
| Encoding              | Position, color, symbol, line, interval, or panel                 |
| Processing            | Aggregation, normalization, smoothing, exclusions, transformation |
| Uncertainty           | What the interval or variation represents                         |
| Accessible equivalent | Direct labels and a concise text description                      |

If you cannot fill the observation-unit row, the graph may accidentally present repeated measurements as independent evidence.

::graph-comparison-diagram
::

The right-hand version is better because it exposes the data, not simply because it uses dots. Dense time series, images, or very large datasets may require aggregation. Preserve a representative raw view, document processing, and choose a summary that matches the question.

### Same summary, different structure

Anscombe’s quartet is a classic teaching dataset: four sets have nearly identical means, variances, correlations, and fitted regression lines, yet their scatterplots show a roughly linear pattern, a curve, an influential outlier, and a nearly vertical cluster. The lesson is not “statistics are bad.” It is that a summary and a plot answer different diagnostic questions.

For the sensor teaching data—baseline errors of 12, 15, 11, 18, 14, 16% and revised errors of 9, 8, 12, 7, 10, 14%—a two-bar chart hides overlap, sample size, and the high revised value. A jittered dot plot plus a clearly defined estimate and interval exposes those features. If measurements are paired by sample, connect each pair; an unpaired display would discard part of the design.

## Make the evidence inspectable

Label axes, units, conditions, and sample size. Show actual observations when practical. Define every line, band, error bar, normalization, and transformation. Use the same scale across plots that invite direct comparison.

Do not use 3D perspective, broken axes, cropped ranges, or area/volume effects to exaggerate differences. A nonzero axis can be appropriate for continuous measurements when the visible range is clearly labeled and interpretation is not distorted; explain important choices.

Show transformations and sensitivity when they matter. If a logarithmic scale reveals multiplicative structure, label it and explain why. If an observation meets a prespecified exclusion rule, show or report whether including it changes the conclusion. Preserve the unfavorable view rather than selecting the display that looks most dramatic.

## Write a takeaway caption

Bad: “Figure 2. Results.”

Better: “The motion-aware controller reduced median localization error by 24% versus the reactive baseline across 30 held-out simulations; points show runs and bars show 95% bootstrap confidence intervals.”

The caption should let a reader understand the claim, comparison, sample, and uncertainty without searching the paragraph above it.

Build it from five facts: comparison, sample or unit, result with units, definition of uncertainty, and one material boundary. For observational work, use “was associated with,” not “caused,” unless the design supports a causal conclusion.

## Use color as reinforcement

Choose a restrained, color-vision-aware palette. Keep the same condition the same color across every figure. Add direct labels, symbols, line styles, or patterns so color is not the only way to distinguish groups.

For digital publication, provide a short text alternative and a longer description when the chart carries details not available nearby. The [W3C complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/) gives patterns for accessible chart descriptions.

## Preserve the unflattering data

Show relevant failed trials, outliers, and exclusions according to rules defined before the result. If an observation is removed, state the reason and show whether the conclusion changes. Never select only favorable runs or smooth a line without disclosing the method.

::guide-callout{title="Final figure check" tone="action"}
Can someone identify the question, groups, units, sample, main pattern, uncertainty, and limitation without hearing you speak? If not, fix the figure or caption before adding decoration.
::
