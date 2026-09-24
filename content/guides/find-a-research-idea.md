---
title: Find an idea worth pursuing
description: Use literature, interests, everyday friction, potential impact, and accessible resources to generate and test research ideas.
slug: find-a-research-idea
category: Start
stage: Starting out
readingMinutes: 14
updated: 2026-09-24
featured: true
order: 2
related:
  - read-a-research-paper
  - shape-a-research-question
  - plan-your-first-study
resources:
  - title: Harvard Library — The literature review
    url: https://guides.library.harvard.edu/dougbond/orienting
    note: Use prior work to locate patterns, disputes, and unanswered questions.
  - title: Google Scholar — Search help
    url: https://scholar.google.com/intl/en/scholar/help.html#citedby
    note: Follow references backward and Cited by links forward; citation count is not a quality score.
tags:
  - ideas
  - literature review
  - feasibility
  - novelty
---

“Find your passion” is not a research method. A useful idea comes from connecting a question that matters with evidence you can realistically gather.

Before choosing a title, make a one-page problem map with four regions: **systems or populations**, **mechanisms**, **failures or unmet needs**, and **evidence you can access**. Connections across those regions produce candidates. “Robotics” becomes “navigation near moving people,” then “failures when a reactive planner cannot anticipate motion,” then a comparison that can actually be tested.

## Generate ideas through five doors

### 1. Start from literature

Find a recent review or survey paper in a field you can name. Use it as a map, not an answer key.

- What does the field mostly agree on?
- Which results conflict?
- What limitations recur across papers?
- Which assumptions fail in unusual populations, environments, scales, or edge cases?
- What future work do multiple authors independently point toward?
- Which dataset, method, or comparison has not been tested in a nearby context?

Follow important references backward. Use “cited by” to find what happened afterward. Read several papers before deciding that a gap exists; one abstract cannot establish novelty.

Build a literature matrix rather than a pile of bookmarks:

| Source           | Question and setting           | Method / comparison     | Main evidence                 | Limitation relevant to me          |
| ---------------- | ------------------------------ | ----------------------- | ----------------------------- | ---------------------------------- |
| Review or survey | How is the field organized?    | Groups prior approaches | Agreements and disputes       | Which branch needs deeper reading? |
| Recent study A   | Closest version of my question | Method and baseline     | Result under its conditions   | Population, scale, or assumption   |
| Recent study B   | Competing explanation          | Different comparison    | Similar or conflicting result | What would distinguish the claims? |
| Dataset or tool  | What evidence is available?    | Collection/measurement  | Coverage and validation       | Missing cases, bias, or license    |

A future-work sentence is a lead, not proof that the work is needed or unattempted. Search the system, outcome, method, and failure in different combinations, then follow the names of datasets and baselines you discover.

### 2. Start from your interests

List what you voluntarily read, build, repair, watch, or argue about. Then move below the topic label:

- What mechanism makes it work?
- What part is inefficient, unreliable, or poorly understood?
- What could be measured rather than merely discussed?

“I like robotics” is a direction. “Why does this navigation method fail near moving people?” is the beginning of a project.

### 3. Start from everyday friction

Notice repeated workarounds. What wastes time, fails silently, costs too much, excludes someone, creates risk, or produces inconsistent results? Turn the frustration into either a scientific question or an engineering requirement.

### 4. Start from potential impact

Identify who experiences the problem and how often. Ask what changes if the project succeeds, how that change could be measured, and whether your proposed solution is actually preferable to the existing one.

### 5. Start from accessible resources

A strong project does not require a university laboratory. Search for public datasets, simulation, inexpensive sensors, open-source software or hardware, observational data, computational models, and equipment your school already owns. Let access constrain the question early—not after months of planning.

::idea-funnel-diagram
::

## Score candidates before falling in love

Give each idea 0, 1, or 2 points for each criterion. A low score is not a failure; it tells you what must change.

| Criterion         | Ask                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Interesting to me | Will I still care after the easy novelty fades?                                                    |
| Useful to someone | Can I name who benefits and how?                                                                   |
| Measurable        | What observation could prove me wrong?                                                             |
| Novel enough      | Is there a new dataset, comparison, population, mechanism, method, replication, or implementation? |
| Feasible          | Can I complete a meaningful version with my time, skills, access, and budget?                      |
| Safe and allowed  | Are safety, privacy, ethics, school, and competition rules satisfied before work begins?           |
| Interpretable     | If the metric changes, will I know why—or only that it changed?                                    |
| Next experiment   | Can I name a one-week pilot?                                                                       |

“Novel” does not have to mean no human has ever considered the subject. A careful replication under new conditions, a meaningful comparison, an open dataset for an overlooked population, or a simpler implementation can be a real contribution when the field values it.

Name the contribution more precisely:

- **replication:** test whether a published result survives a careful repeat;
- **extension:** test a new population, environment, scale, or condition;
- **comparison:** evaluate existing methods under a defined constraint;
- **measurement:** improve how an important outcome is observed;
- **dataset:** document a meaningful and overlooked set of cases;
- **negative result:** locate where a promising approach fails;
- **design:** meet explicit performance, cost, safety, or access requirements.

“Nobody used this exact model on this exact dataset” may be technically new and scientifically uninformative. Explain what the difference would let someone know or do.

::guide-callout{title="A practical cutoff" tone="action"}
Keep three candidates. Spend one hour on literature and one hour on a tiny feasibility test for each. Choose after learning something—not from the titles alone.
::

## Two examples

**Scientific path**

- Broad: indoor air quality
- Narrower: classroom carbon dioxide
- Mechanism: occupancy and ventilation
- Question: “How does opening one versus two exterior doors affect the time required for classroom CO₂ to return below a **project-selected comparison level**, while outdoor conditions are recorded?”

**Engineering path**

- Broad: accessible lab tools
- Need: visually aligning a low-cost microscope is difficult
- Constraint: printable parts and a phone camera
- Problem: “Design a phone-microscope alignment fixture under $20 and compare setup time and image repeatability with a hand-held baseline.”

Neither is automatically safe, novel, or competition-ready. Each is specific enough to investigate those questions next.

## Work one candidate far enough to expose its weaknesses

Imagine a student interested in classroom air quality:

1. **Observation:** the room feels stuffy late in the period.
2. **Reading:** ventilation research identifies occupancy, outdoor exchange, sensor placement, and weather as relevant.
3. **Constraint:** the student can log carbon dioxide but cannot assign classmates or disrupt instruction.
4. **Revised question:** how does a documented door/window configuration relate to the time for an unoccupied room’s CO₂ level to decline across repeated after-class observations, while outdoor conditions and sensor position are recorded?
5. **Contribution boundary:** the result may improve this school’s measurement process; it is not a clinical claim or universal ventilation standard.
6. **Fatal-risk pilot:** colocate two sensors and determine whether their disagreement is smaller than the expected condition difference.

If sensor disagreement dominates, the project must improve calibration, lengthen observations, or change its question. That decision is more valuable than collecting months of uninterpretable data.

Public data can create similar projects, but “public” does not mean analysis-ready. NOAA climate data, EPA AirData, and NASA’s Exoplanet Archive each require reading the data dictionary, provenance, units, missingness, coverage, and usage limits. A monitor is not every resident’s exposure; detected exoplanets are not an unbiased census of all planets.

## End with a one-week pilot

Write the smallest experiment, dataset check, simulation, or prototype that could reveal a fatal problem. The pilot should test access, measurement quality, runtime, and interpretability—not prove the final claim.

Afterward, decide: continue, narrow, change method, or stop. Ending a weak idea early is good research judgment.

Record the reason. “Stopped because the needed variable is absent from the data” or “narrowed because the pilot cannot distinguish two mechanisms” turns a dead end into reusable knowledge.
