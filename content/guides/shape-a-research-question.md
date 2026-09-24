---
title: Shape a researchable question
description: Turn a broad topic into a measurable scientific question or an engineering problem with explicit constraints and success metrics.
slug: shape-a-research-question
category: Design
stage: Planning
readingMinutes: 13
updated: 2026-09-24
featured: true
order: 4
related:
  - find-a-research-idea
  - plan-your-first-study
  - statistics-for-student-research
resources:
  - title: Society for Science — ISEF judging criteria
    url: https://www.societyforscience.org/isef/grand-award/criteria/
    note: Distinguishes focused scientific questions from engineering needs, criteria, constraints, prototypes, and tests.
tags:
  - research question
  - engineering design
  - variables
  - metrics
---

A researchable question tells you what evidence to collect. An engineering problem tells you what must be built, what constraints it must respect, and how success will be measured.

::question-formula
::

These are starting structures, not rules for every field. Historical analysis, observational astronomy, theoretical mathematics, field biology, and qualitative research may not have a manipulable independent variable. They still need a bounded claim, appropriate evidence, and a method someone else can examine.

## Move from weak to testable

**Weak:** Does AI help healthcare?

Too broad: “AI,” “help,” and “healthcare” have no defined meaning.

**Better:** Can a classifier identify pneumonia in chest X-rays?

The task is visible, but the population, data, comparison, and success measure are missing.

**Stronger:** On a held-out public chest-X-ray dataset, does a compact image classifier improve sensitivity at 90% specificity over logistic regression, while reporting calibration by age group?

The evidence path, comparison, metric, and important condition are explicit.

For engineering:

**Weak:** Build a better water sensor.

**Better:** Build a low-cost turbidity sensor.

**Stronger:** Design a battery-powered turbidity sensor under $30 that estimates a reference meter within ±10% across the tested range and logs one reading per minute for 24 hours.

The stronger wording is not automatically a stronger project. The $30 limit should come from a user or access need; ±10% should reflect a reference method or decision; 24 hours should represent the intended use. Arbitrary precision is not rigor.

## Write a question specification

Before planning methods, fill in what applies:

| Element                | Decision to record                                                         |
| ---------------------- | -------------------------------------------------------------------------- |
| Target                 | System, population, cases, or mathematical objects the claim concerns      |
| Difference of interest | Intervention, exposure, mechanism, algorithm, or design change             |
| Comparator             | Control, existing method, reference instrument, or alternative explanation |
| Primary outcome        | Exactly how the central result will be measured                            |
| Conditions             | Time, environment, operating range, assumptions, and exclusions            |
| Intended claim         | The narrow sentence the evidence should support                            |
| Challenge result       | An outcome that would weaken the hypothesis or design claim                |

Add a source or rationale for each important threshold. Separate **required criteria** from stretch goals so an ambitious extra feature cannot hide whether the core design works.

## Define the parts that apply

- **Independent variable:** what changes across conditions or groups.
- **Dependent variable:** the measured outcome.
- **Hypothesis:** the predicted pattern and, ideally, why you expect it.
- **Control or baseline:** what the new method, condition, or design must beat or differ from.
- **Outcome metric:** the number or observation that answers the question.
- **Success criterion:** how good is good enough, defined before seeing the result.
- **Confound:** another changing factor that could produce the outcome.
- **Constraint:** cost, size, safety, power, time, material, latency, access, or regulation the design must respect.

An observational question may replace “control” with a comparison group and careful adjustment. A mathematics project may compare bounds, cases, or proof strategies. The structure should fit the discipline, not force the discipline to fit a school worksheet.

Other legitimate structures include:

- **Observational:** “Among Texas monitoring stations with sufficient coverage, how is summer ozone associated with temperature after accounting for year and station?” The result is an association, not proof that temperature alone caused the change.
- **Qualitative:** “How do students using screen readers describe barriers in the school’s course-registration process?” Credibility depends on sampling, consent, a systematic analysis process, and transparent interpretation—not independent/dependent variables.
- **Mathematical or computational:** “Under assumptions A, how does approximation B’s error bound change with parameter C?” Evidence may be proof, counterexample, exhaustive cases, or verified computation.

## Reduce scope without removing meaning

When a project is too large, narrow one dimension at a time:

- one population or environment;
- one mechanism;
- one primary outcome;
- one strong baseline;
- one realistic time horizon;
- one prototype function;
- one range of operating conditions.

Keep the main contribution. Removing ten optional features from a clear test is better than completing ten features with no credible evaluation.

### Scope the medical-image example honestly

“Sensitivity at 90% specificity” encodes a tradeoff: the comparison fixes one error rate while examining another. A patient-level train/test split asks a different—and usually more credible—question than an image-level split that can place images from the same patient on both sides. Overall discrimination, subgroup calibration, and real clinical utility are also different outcomes. A school project using a public dataset should not imply clinical readiness.

Scope reduction might mean one dataset, one prespecified split, one transparent baseline, one primary metric, and an error analysis. That can be more informative than trying many models and reporting only the winner.

::guide-callout{title="Ready-to-plan test" tone="action"}
Someone unfamiliar with your idea should be able to name the evidence you will collect, the comparison you will make, and the outcome that would challenge your hypothesis or design claim.
::

## Check feasibility and meaning together

A question can be measurable but trivial. It can be important but impossible with your access. Before committing, answer:

1. Can I obtain the data or materials legally and safely?
2. Can I run enough observations or cases to learn something interpretable?
3. Does the metric match the real objective?
4. Is there a baseline I can implement fairly?
5. If the result is null or the prototype fails, will I still learn something useful?

The final question will change during piloting. Record why it changed; that reasoning is part of the work.

Run a final stress test by changing one dimension at a time: population, outcome, condition, baseline, or time. If narrowing makes the project feasible but removes its meaning, choose a different question. If a null result would leave you with nothing interpretable, clarify the mechanism, comparison, or measurement before collecting final data.
