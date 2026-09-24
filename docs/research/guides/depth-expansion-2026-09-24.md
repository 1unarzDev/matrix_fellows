# Guide depth expansion research

Reviewed 24 September 2026. This note audits all eleven Matrix Fellows guides
for the planned editorial expansion. It is a research and writing brief, not a
claim that the guide copy or interface has been changed.

## Editorial finding

The current collection is unusually careful about safety, uncertainty, and
overclaiming, but most articles stop one step too early. They name good habits
without walking a student through a consequential choice or leaving them with
an artifact they can use. Adding more warnings or more callout boxes would make
that problem worse. The strongest revision pattern is:

1. introduce a decision in ordinary prose;
2. work one realistic example far enough that the tradeoff becomes visible;
3. give the reader a copyable table, worksheet, or script;
4. show a common failure and its repair; and
5. end with a small output the student can produce, not another maxim.

Each article should have at most one visually prominent admonition. Safety or
rules warnings deserve that treatment; ordinary advice should become body
content, a worked example, or a compact checklist. “Real example” below means a
traceable paper, public dataset, or official competition criterion. Invented
numbers should remain clearly labeled as teaching data.

## Source and scope cautions

- Society for Science pages are authoritative for ISEF judging and ISEF rules,
  but not universal rules for every fair, journal, school, or discipline.
- University mentoring and communication pages are written mainly for
  undergraduates. Adapt the intellectual advice for high-school students while
  retaining the current minor-safety guidance.
- A public dataset is not automatically simple, representative, ethically
  unrestricted, or suitable for causal claims. Students must read its data
  dictionary, provenance, license, missingness notes, and disclosure limits.
- Worked examples should model reasoning without presenting a single canonical
  workflow. Qualitative, theoretical, mathematical, observational, and
  engineering projects require different evidence structures.

## 1. Contact a research mentor

### What is missing

The guide explains what belongs in an email but does not show the research that
precedes a genuinely tailored message, how to choose among possible mentors, or
how to turn a first meeting into a bounded trial collaboration. The “smaller
requests” list reads as tips until the reader sees when each request is useful.

### Recommended expansion

- Add a **mentor-fit table** with columns for the person's current question,
  one recent output, method or resource relevant to the student, evidence the
  student has already tried, and the smallest sensible request. The student
  should eliminate candidates for whom they cannot fill the first three cells.
- Work one lab-page example from observation to email: extract a current
  research theme, paraphrase one figure or project result, identify a realistic
  overlap, and then write the two-sentence connection. This teaches
  personalization rather than merely instructing it.
- Add a request-selection rule: ask for a paper when still orienting; a
  feasibility opinion when a one-page plan exists; feedback when a pilot or
  artifact exists; and supervision or access only after scope, time, safety,
  and contribution have been discussed.
- Add a **first-meeting agenda and follow-up record**: 30-second context, two
  questions requiring judgment, constraints, agreed next action, owner, date,
  and communication channel. Include a polite decline/exit script so students
  do not treat every meeting as a commitment.
- Explain mentorship as an iterative test: one completed action and one useful
  feedback exchange are better evidence of fit than prestige or a vague offer.

### Source basis

- [Stanford Academic Advising, “How to Email
  Faculty”](https://advising.stanford.edu/current-students/advising-student-handbook/email-faculty)
  supports a concise message, descriptive subject, specific request, and one
  follow-up after roughly a week.
- [Harvard SEAS, “Undergraduate Research
  Opportunities”](https://seas.harvard.edu/computer-science/undergraduate-program/research-opportunities)
  explicitly recommends reading a group's work, naming the connection,
  representing experience honestly, avoiding generic mail, and following up
  after 7–10 days. Its advice is for undergraduates, so it does not replace the
  guide's safeguards for minors.

## 2. Find an idea worth pursuing

### What is missing

The five “doors” are useful prompts, but the guide does not demonstrate how to
verify that a supposed gap is real, convert a dataset into a question, or reject
an attractive idea after a feasibility test. The 0–2 score risks false precision
unless students record evidence and a disqualifying constraint.

### Recommended expansion

- Replace or supplement the raw score with an **idea evidence ledger**. For
  each candidate, require: two or three relevant sources, what is known, what is
  disputed, the proposed contribution type, accessible evidence, a fatal-risk
  test, and the next decision. “Novel enough” must cite neighboring work.
- Teach six legitimate contribution types with examples: replication under a
  new condition, comparison against a stronger baseline, measurement of an
  overlooked population or range, mechanism test, dataset or instrument,
  and simpler implementation with a measured tradeoff. Future-work sentences
  are leads, not proof that the work is needed or unattempted.
- Work a citation-chain example: begin with a review, follow one reference
  backward to the originating result, use “Cited by” to find a later test, and
  record how the proposed question changes. The output should be a four-row
  literature matrix, not a pile of links.
- Add real-data starting points with clear cautions. NOAA's Climate Data Online
  can support a local weather question if the student examines station coverage
  and missing periods. EPA AirData can support a local air-quality question if
  the student checks monitor, pollutant, averaging period, units, and missing
  dates. NASA's Exoplanet Archive can support a measurement or selection-effects
  question if the student reads the column definitions and avoids treating
  detected planets as an unbiased census.
- Show a **kill test**: if the data dictionary lacks the needed measure, the
  proposed baseline cannot be implemented, or the pilot cannot distinguish two
  explanations, narrow or abandon the idea. This models stopping as progress.

### Source basis

- [Harvard Library, “Subject Bibliographies, Literature Reviews, Methods
  Sources”](https://guides.library.harvard.edu/dougbond/orienting) describes
  reviews as ways to locate unanswered questions, contested findings, and
  research directions.
- [Google Scholar search help](https://scholar.google.com/intl/en/scholar/help.html#citedby)
  documents references, “Cited by,” and related-article routes. Citation count
  is a navigation signal, not a quality verdict.
- [NOAA Climate Data Online](https://www.ncei.noaa.gov/cdo-web/) and the
  [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) are
  official data portals suitable for demonstrating how provenance and variable
  definitions shape a question.
- [EPA AirData daily downloads](https://www.epa.gov/outdoor-air-quality-data/download-daily-data)
  are an official source for a reproducible local-data search. The monitor is
  the observation source; a county average should not be mistaken for every
  resident's exposure.

## 3. Read a paper without getting lost

### What is missing

The seven passes help triage a paper, but the article does not contain a worked
paper, a method for checking whether a figure supports a sentence, or a way to
resolve disagreement between papers. “Read skeptically” remains a list rather
than a practiced skill.

### Recommended expansion

- Choose one open-access research paper with a readable central figure and walk
  through the actual outputs of the first five passes: one-sentence question,
  study type, sample, comparison, principal result, authors' conclusion, and
  one limitation. Link the paper and figure so the exercise is inspectable.
- Add a **claim-to-evidence trace**. Copy one claim from the abstract, locate
  the exact figure/table and analysis supporting it, list the tested sample and
  conditions, then rewrite the claim at the scope the evidence permits.
- Extend the notes template with study design, operational definitions,
  inclusion/exclusion, baseline, uncertainty, confounders, funding/conflicts,
  data/code availability, and “what result would change my view?” Not every
  field will use every cell.
- Show how to reconcile two papers: first compare question, population,
  intervention/exposure, outcome, design, and uncertainty. Apparently
  contradictory headlines often concern different estimands or conditions.
- Distinguish a paper's internal evidence from its place in the literature. A
  single result can be competently executed without settling the field; later
  replications, corrections, and systematic reviews may change the conclusion.

### Source basis

- Carey, Steiner, and Petri's open-access [“Ten simple rules for reading a
  scientific paper”](https://doi.org/10.1371/journal.pcbi.1008032) supports
  purpose-driven reading, reconstructing what the authors wanted to know, did,
  found, and inferred, examining figures, and asking what should happen next.
- Keshav's [“How to Read a
  Paper”](https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf)
  provides the original three-pass strategy useful for technical papers. The
  Matrix seven-pass sequence should remain labeled as Matrix's adaptation.
- [Google Scholar search help](https://scholar.google.com/intl/en/scholar/help.html#citedby)
  supports the backward/forward literature map; it does not assess validity for
  the student.

## 4. Shape a researchable question

### What is missing

The weak/better/stronger examples show specificity but not why a chosen outcome,
baseline, or success threshold is defensible. The current article also needs
worked structures outside controlled experiments and engineering builds.

### Recommended expansion

- Add a **question specification sheet**: target system or population;
  intervention/exposure/design; comparator; primary outcome and measurement;
  operating conditions or time; intended claim; and result that would count
  against it. Require a source or rationale for every threshold.
- Work the chest-X-ray example one stage further. Explain that sensitivity at a
  fixed specificity encodes a tradeoff, that a patient-level split is different
  from an image-level split, and that subgroup calibration asks a different
  question from overall discrimination. Do not imply the example is clinically
  deployable.
- Add three alternate forms: observational (“Among X, how is Y associated with
  Z after measuring likely confounders?”), qualitative (“How do members of X
  describe Y in context Z?”), and mathematical/computational (“Under assumptions
  A, what bound or behavior does method B exhibit?”). Each should name what
  evidence could make the answer credible.
- Demonstrate threshold choice in engineering: derive the $30, ±10%, and
  24-hour requirements from a user, reference instrument, or use case; then
  separate required criteria from stretch goals. Arbitrary round numbers do
  not become meaningful because they appear in a strong-looking sentence.
- Add a **scope stress test**: change one population, measure, condition, or
  baseline at a time and ask whether the question remains useful and feasible.

### Source basis

- [ISEF judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/)
  distinguish a focused, testable scientific question and appropriate controls
  from an engineering problem defined by a practical need, criteria,
  constraints, alternatives, prototype, and testing.
- The criteria also evaluate systematic data collection, reproducibility,
  sufficient evidence, limitations, impact, and independence. They support the
  specification sheet but do not prescribe one universal variable formula.

## 5. Plan your first study

### What is missing

The guide has strong safeguards, yet it does not provide a complete mini-plan,
show how randomization/blinding/order effects apply to attainable student work,
or distinguish measurement repeats, technical replicates, and independent
units deeply enough. A reader could finish knowing the vocabulary without a
plan they can execute.

### Recommended expansion

- Add a worked **one-page protocol** for a low-risk project: question, unit of
  analysis, sampling or case selection, conditions, baseline, primary outcome,
  nuisance variables, run order, repeats, raw-data schema, exclusion/failure
  rules, analysis, stopping rule, pilot decision, approvals, and backup path.
- Demonstrate experimental units with a sensor example. Ten readings from one
  device in one water sample estimate reading repeatability; devices, prepared
  samples, days, or locations may be independent units depending on the claim.
  State the unit before counting `n`.
- Add a decision rule for bias controls: randomize run order when drift or
  learning can favor a condition; block by day/device/batch when those sources
  vary; blind labels during measurement or annotation when expectations can
  affect judgment; record every deviation rather than silently repairing it.
- Expand data management into a concrete folder and data dictionary example:
  immutable raw files, processing script/version, tidy analysis table, figures,
  and a README connecting IDs to conditions. Names and direct identifiers should
  not be used as convenient sample IDs.
- Show how pilot results change the protocol. For example, sensor saturation
  narrows the operating range and requires a new calibration; pilot data do not
  silently enter the final analysis after that change.

### Source basis

- The [current ISEF International Rules landing
  page](https://www.societyforscience.org/isef/international-rules/) and
  [Rules Wizard](https://ruleswizard.societyforscience.org/) are the durable
  sources for classification and prior-approval requirements. Required prior
  approval cannot be repaired retroactively; requirements differ by project.
- [ISEF judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/)
  ask whether design, variables, controls, systematic collection, analysis,
  reproducibility, and evidence are appropriate. That supports a protocol that
  makes those decisions explicit before final collection.
- The [NIST/SEMATECH e-Handbook, process modeling
  chapter](https://www.itl.nist.gov/div898/handbook/pmd/pmd.htm) treats design,
  data collection, model choice, and validation as connected decisions rather
  than a test selected after the data arrive.

## 6. Use statistics that strengthen the work

### What is missing

This guide is accurate but compressed at exactly the places novices need a
worked example: independent samples, confidence intervals, effect sizes,
assumptions, multiple comparisons, and sample planning. It tells students what
not to infer from a p-value without showing a complete evidence statement.

### Recommended expansion

- Use one small teaching dataset throughout. Plot all observations; identify
  the experimental unit; calculate a center, spread, group difference, and
  interval; inspect whether a single point drives the result; then write a
  bounded conclusion. Publish the values or CSV so every number is reproducible.
- Add a **design-to-analysis map** that asks the estimand before the named test:
  “difference in what, between which units, over what period?” Only then ask
  whether observations are paired, repeated, clustered, censored, counts, or
  categories and which assumptions need checking. Avoid a simplistic
  choose-a-test flowchart.
- Provide a reporting repair. Replace “Group A was significant (`p < .05`)”
  with the estimated difference, units, interval, exact p-value when relevant,
  sample definition, prespecified/exploratory status, and an important design
  limitation.
- Make multiplicity concrete: if a student inspects 20 outcomes and highlights
  only the smallest p-value, readers need all 20 comparisons and to know that
  the highlighted result was selected afterward. The primary outcome should be
  chosen before final analysis; exploratory findings can remain valuable when
  labeled and followed up.
- Teach sample planning as precision and detectability, not a magic minimum.
  Ask for the smallest practically important effect, expected variability,
  design/unit, desired interval width or power, attrition/failure rate, and
  feasible cap. A pilot can estimate procedures; a tiny pilot gives unstable
  variance estimates and does not certify the final sample.

### Source basis

- The [NIST/SEMATECH e-Handbook of Statistical
  Methods](https://www.itl.nist.gov/div898/handbook/) provides authoritative
  material on exploratory analysis, uncertainty, process modeling, assumptions,
  experimental design, and test interpretation.
- Wasserstein and Lazar's [ASA statement on
  p-values](https://doi.org/10.1080/00031305.2016.1154108) states that a p-value
  is not the probability a hypothesis is true, does not measure effect size or
  importance, does not by itself provide a good measure of evidence, and should
  not be the sole basis for scientific decisions. The [ASA-hosted
  PDF](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf) is a stable
  official copy.

## 7. Build a strong science-fair poster

### What is missing

The article lists poster parts and design principles but does not teach editing:
how to decide which result dominates, turn methods into a visual explanation,
or revise a dense section. The existing diagrams need prose around a real
before/after transformation to avoid feeling decorative.

### Recommended expansion

- Start with a **message sentence**—question, central result, boundary—and make
  every section justify its space against it. Then show a wireframe assigning
  most visual weight to evidence rather than equal boxes for every heading.
- Work one dense-to-visual edit: reduce a 150-word procedure to a flow with
  sample selection, conditions, measurement, and analysis, while retaining
  values necessary to judge the evidence. Explain what moved to spoken detail
  and what could not be removed.
- Show a result panel before and after: actual points, defined interval, direct
  labels, one-sentence result, then a separate bounded interpretation. Include
  an honest null or mixed result so visual hierarchy is not confused with hype.
- Add a three-distance review: from several feet (question and main result), at
  reading distance (method and graph labels), and in conversation (details a
  judge can probe). Test the printed or displayed artifact at its actual size.
- Add a **poster evidence audit** tied to judging: for every conclusion, point
  to the figure/table; for every figure, state its sample, units, uncertainty,
  and limitation; for every collaborator, state ownership.

### Source basis

- [ISEF judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/)
  allocate substantially more suggested weight to interview than poster and
  assess understanding, design, execution, creativity/impact, and presentation.
  This supports treating the poster as an evidence interface, not the project.
- [MIT Communication Lab poster guidance](https://mitcommlab.mit.edu/broad/commkit/poster/)
  supports a central message, audience-aware hierarchy, strong figures,
  restrained text, and a practiced short explanation. It is guidance, not an
  ISEF display specification.

## 8. Make graphs that explain results

### What is missing

The chart-purpose list is sound but remains abstract. Students need to see how
the same data can reveal or conceal distributions, how a caption is derived,
and how transformations, missing data, and uncertainty change interpretation.

### Recommended expansion

- Add a worked **same-summary/different-data** lesson using Anscombe's quartet
  or a comparable open dataset: means, variances, correlations, and regression
  can match while plots reveal radically different structures. The decision is
  “plot the observations before trusting the summary,” not “always use one chart.”
- Transform one bar-and-error plot into an observation-level plot. Explain what
  becomes visible: sample size, clusters, skew, overlap, outliers, and possible
  dependence. Do not imply that every dense dataset can show every point.
- Build a figure specification before software: intended claim, comparison,
  observation unit, x/y variables and units, encoding, uncertainty, inclusions,
  processing/transformation, and accessible text equivalent. Then choose the
  chart.
- Show a caption assembled from five facts: question/comparison, sample,
  result with units, uncertainty definition, and material limitation. Captions
  should not announce a causal result when the study is associational.
- Add a transformation/exclusion sensitivity example: show raw and transformed
  scales or analysis with and without a prespecified questionable observation,
  explain the scientific reason, and preserve the unfavorable view.

### Source basis

- Weissgerber et al., [“Beyond Bar and Line Graphs: Time for a New Data
  Presentation Paradigm”](https://doi.org/10.1371/journal.pbio.1002128), use
  real examples to show that bar/line summaries can conceal distributions and
  recommend displaying continuous data more transparently in small samples.
- [MIT Communication Lab figure-design guidance](https://mitcommlab.mit.edu/broad/commkit/figure-design/)
  ties chart form and visual emphasis to the message and data, and recommends
  direct labeling and reduced visual noise.
- [W3C complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/)
  provides patterns for short and long descriptions of charts and diagrams.

## 9. Explain impact without overselling

### What is missing

This is the thinnest guide. The claim ladder and two rewrites are useful, but it
needs a model for translating a study result into an impact argument, including
who experiences the benefit, compared with what, what harms or costs trade off,
and which validation step remains. Limitations currently appear as a generic list.

### Recommended expansion

- Add an **evidence-to-impact chain**: measured result → interpretation under
  stated assumptions → performance in a realistic setting → effect on a person,
  system, or decision → broader adoption. Mark which links the project tested
  and which remain hypotheses.
- Work one complete case. For the classifier example, separate discrimination
  on a retrospective dataset, calibration across groups, prospective workflow
  performance, downstream patient outcomes, and deployment costs/harms. A
  lower false-negative rate on one dataset establishes only the first link.
- Add a non-AI research case to prevent the framework from feeling canned. One
  candidate is Solomon et al.'s published analysis of Antarctic ozone healing:
  distinguish the measured/modelled ozone evidence, attribution to drivers,
  and the broader policy-impact narrative. The exercise is to mark what the
  paper itself supports, not to turn the case into a slogan.
- Replace generic limitations with **consequence-bearing limitations**:
  “Because all images came from one archive, performance under a different
  scanner and prevalence is unknown; external validation on a separately
  collected dataset is the next test.” Pair each major limitation with the
  claim it restricts and the test that would reduce it.
- Add absolute quantities beside relative ones. “Reduced failures by 50%” is
  different when the rate changes from 2% to 1% than from 40% to 20%; give the
  counts, denominator, conditions, and uncertainty.
- Add a stakeholder/tradeoff table: intended beneficiary, current alternative,
  measured advantage, possible cost or harm, untested assumption, and next
  evidence. This makes impact analysis substantive rather than promotional.

### Source basis

- [ISEF judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/)
  evaluate data supporting conclusions, limitations, creativity, potential
  impact, and the student's understanding as separate considerations. This
  supports keeping result, inference, potential benefit, and demonstrated
  real-world impact distinct.
- [NIST/SEMATECH process-modeling guidance](https://www.itl.nist.gov/div898/handbook/pmd/pmd.htm)
  emphasizes model assumptions, validation, and the intended use of a model;
  good fit to development data does not by itself establish performance in a
  new setting.
- Solomon et al. (2016), [“Emergence of healing in the Antarctic ozone
  layer”](https://doi.org/10.1126/science.aae0061), is a traceable original
  research case for separating observations, modeled attribution, uncertainty,
  and broader impact claims.

## 10. Write a useful abstract

### What is missing

The weak/improved pair is helpful but skips the actual editing process. Students
need to learn how to select one result, report uncertainty without drowning the
abstract, distinguish completed from proposed work, and adapt to a destination's
rules. One polished invented abstract can otherwise feel like another formula.

### Recommended expansion

- Add an **evidence inventory before drafting**: objective, study type,
  sample/unit, conditions, comparator, primary outcome, main estimate and
  uncertainty, largest boundary, contribution/ownership, and destination rules.
  If final results do not exist, do not write them in the future tense as if
  they were observed.
- Show a line edit from lab-note language to abstract language. Preserve the
  design and decisive numbers; remove literature throat-clearing, procedural
  trivia, empty adjectives, and claims not supported by a reported result.
- Provide variants for empirical science, engineering, and computational or
  theoretical work. Quantification is valuable when the work supports it, but
  an invented precision requirement would distort qualitative or proof-based
  projects.
- Add a title-and-abstract consistency check: population/system, method, main
  outcome, and scope should not expand between them. Define specialized
  abbreviations only when their repeated use saves meaningful space.
- Include a **reverse outline**: label each sentence context, objective, method,
  result, or conclusion; cut duplicates; then verify the conclusion contains no
  new result or broader population.
- Annotate one public finalist abstract after verifying its project context in
  Society for Science's official abstract search. Label each sentence's job and
  identify one detail the abstract necessarily leaves for the full project;
  use it as evidence to inspect, not a template to copy.

### Source basis

- [Society for Science, “How to Write an ISEF
  Abstract”](https://www.societyforscience.org/isef/how-to-write-an-isef-abstract/)
  calls for purpose, procedure, data/results, and conclusions; directs students
  to describe their own work; and specifies ISEF's 250-word format. Those are
  ISEF-specific constraints, not universal abstract rules.
- [MIT Communication Lab abstract guidance](https://mitcommlab.mit.edu/broad/commkit/journal-article-abstract/)
  supports a message-led problem, knowledge gap, approach, results, and
  implications structure for technical work.
- [Society for Science finalist abstract search](https://abstracts.societyforscience.org/)
  provides public, real student abstracts for close reading. An abstract shows
  phrasing and compression, not the complete quality or validity of a project.

## 11. Present research clearly

### What is missing

The guide prepares pitches and anticipated answers but not evidence-led
conversation. Students need a repeatable way to answer an unexpected question,
use a figure in the answer, recover from not knowing, and distinguish project
ownership from memorized performance.

### Recommended expansion

- Teach a **claim–evidence–boundary–next-test** answer pattern. State the answer,
  point to the relevant observation or figure, name the important condition or
  limitation, and say what evidence would resolve the remaining uncertainty.
  Use it on baseline, failure, and impact questions.
- Add an interruption drill with follow-ups. Example: “Why is that baseline
  fair?” → define what capability it shares, what differs, and what alternative
  baseline would challenge the conclusion. A script should include the judge's
  second question, because rehearsed first answers are easy.
- Show a responsible unknown: “I did not measure humidity independently, so I
  cannot separate it from the temperature effect. The logged metadata suggest
  the runs differ, and a blocked follow-up would test that.” This is more useful
  than the bare instruction not to invent.
- Turn ownership into a task ledger: question selection, protocol, training,
  equipment, data collection, code, analysis choices, interpretation, and
  writing, with student/collaborator contributions named for each.
- Add a judge-facing figure drill: ten seconds to orient axes and groups, one
  sentence for the pattern, one for uncertainty, one for what follows. Practice
  with the strongest result, a null result, and a failure.

### Source basis

- [ISEF judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/)
  emphasize clear concise responses, understanding of methods and conclusions,
  limitations, independence, contribution, impact, and ideas for further work.
  The guide's 20-second, 60-second, and three-minute formats are practice tools,
  not official ISEF timings.
- [MIT Communication Lab poster guidance](https://mitcommlab.mit.edu/broad/commkit/poster/)
  supports an audience-aware short pitch and using the poster to support a
  conversation rather than reciting it.

## Cross-guide implementation priorities

If the collection cannot be expanded all at once, prioritize by learning value:

1. **Statistics:** one reproducible dataset and full analysis narrative.
2. **Plan a study:** one complete protocol and experimental-unit lesson.
3. **Read a paper:** one open paper traced from claim to evidence.
4. **Impact:** an evidence-to-impact chain and full case study.
5. **Question and idea guides:** evidence ledgers that feed the plan.
6. **Graphs, abstract, poster, and presentation:** reuse the same study so the
   reader sees evidence transformed across formats without changing the claim.
7. **Mentoring:** connect the artifact trail to a realistic request for feedback.

A shared case study would create more depth than eleven unrelated miniature
examples. For instance, a low-cost sensor project can move from idea ledger, to
question specification, protocol, calibration data, graph, bounded impact
claim, abstract, poster panel, and oral answer. Pair it with a public-data case
so the library does not imply that research always means building hardware.

## Source register

Sources were checked from this environment on 24 September 2026. A successful
HTTP response is not evidence of correctness by itself; the annotations above
state the narrow claim each source supports.

- Society for Science: [judging criteria](https://www.societyforscience.org/isef/grand-award/criteria/),
  [international rules](https://www.societyforscience.org/isef/international-rules/),
  [Rules Wizard](https://ruleswizard.societyforscience.org/), and
  [abstract guidance](https://www.societyforscience.org/isef/how-to-write-an-isef-abstract/).
- Stanford Academic Advising: [faculty email guidance](https://advising.stanford.edu/current-students/advising-student-handbook/email-faculty).
- Harvard SEAS: [undergraduate research outreach guidance](https://seas.harvard.edu/computer-science/undergraduate-program/research-opportunities).
- Harvard Library: [literature-review orientation](https://guides.library.harvard.edu/dougbond/orienting).
- Google Scholar: [search and citation-chain help](https://scholar.google.com/intl/en/scholar/help.html#citedby).
- Carey, Steiner, and Petri (2020): [Ten simple rules for reading a scientific paper](https://doi.org/10.1371/journal.pcbi.1008032),
  _PLOS Computational Biology_ 16(7), e1008032.
- Keshav (2007): [How to Read a Paper](https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf),
  _ACM SIGCOMM Computer Communication Review_ 37(3).
- NIST/SEMATECH: [e-Handbook of Statistical Methods](https://www.itl.nist.gov/div898/handbook/).
- Wasserstein and Lazar (2016): [The ASA Statement on p-Values](https://doi.org/10.1080/00031305.2016.1154108),
  _The American Statistician_ 70(2), 129–133.
- Weissgerber et al. (2015): [Beyond Bar and Line Graphs](https://doi.org/10.1371/journal.pbio.1002128),
  _PLOS Biology_ 13(4), e1002128.
- MIT Communication Lab: [figure design](https://mitcommlab.mit.edu/broad/commkit/figure-design/),
  [scientific posters](https://mitcommlab.mit.edu/broad/commkit/poster/), and
  [journal-article abstracts](https://mitcommlab.mit.edu/broad/commkit/journal-article-abstract/).
- W3C Web Accessibility Initiative: [complex-image tutorial](https://www.w3.org/WAI/tutorials/images/complex/).
- NOAA National Centers for Environmental Information: [Climate Data Online](https://www.ncei.noaa.gov/cdo-web/).
- US Environmental Protection Agency: [AirData daily downloads](https://www.epa.gov/outdoor-air-quality-data/download-daily-data).
- NASA/IPAC: [Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/).
- Solomon et al. (2016): [Emergence of healing in the Antarctic ozone layer](https://doi.org/10.1126/science.aae0061),
  _Science_ 353(6296), 269–274.
