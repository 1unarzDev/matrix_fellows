---
title: Present research clearly
description: Prepare 20-second, 60-second, and three-minute explanations, then answer questions about contribution, evidence, failure, and mentorship.
slug: present-research-clearly
category: Communicate
stage: Sharing the work
readingMinutes: 13
updated: 2026-09-24
featured: true
order: 11
related:
  - build-a-science-fair-poster
  - explain-why-research-matters
  - contact-a-research-mentor
resources:
  - title: Society for Science — ISEF judging criteria
    url: https://www.societyforscience.org/isef/grand-award/criteria/
    note: Interview, independence, contribution, limitations, and understanding.
  - title: MIT Communication Lab — Scientific posters
    url: https://mitcommlab.mit.edu/broad/commkit/poster/
    note: Audience-aware poster pitches and conversational presentation.
tags:
  - presentation
  - judging
  - interview
  - pitch
---

Do not recite the poster from top left to bottom right. Begin with the problem or question, state your contribution, and use the poster when the listener needs evidence.

::pitch-formats
::

## Build three versions from one spine

Treat these as **rehearsal formats**, not official presentation limits. Always follow the timing and format required by your fair, conference, classroom, or mentor.

**20 seconds**

> Low-cost robot grippers often miss object slip when vision is blocked. I tested whether adding a simple tactile signal reduced drops in simulation. It lowered the drop rate relative to a vision-only baseline, suggesting a feasible direction for a physical prototype.

**60 seconds** adds the method, central number, and one limitation:

> I created 120 seeded grasping trials across three object shapes and compared the same controller with and without a simulated tactile signal. The tactile version reduced drop rate from 18% to 11%; the effect was largest under partial visual occlusion. The simulation uses simplified contact physics, so the next step is testing whether the benefit survives sensor noise on a physical gripper.

**Three minutes** adds why you chose the problem, how the evidence was produced, why the baseline is fair, what failed, what you contributed, and what should happen next. Build this version from your real project rather than memorizing the example above.

Use your own real numbers and conditions. If results are preliminary, say so.

Keep the same claim stable across all three lengths. Shortening should remove detail, not change “reduced error on this simulated test set” into “makes robots safer.” Record the three versions and underline the question, contribution, central evidence, and boundary in each.

## Answer with claim, evidence, boundary, next test

For an unexpected question:

1. **Claim:** answer directly in one sentence.
2. **Evidence:** point to the relevant figure, observation, calculation, or design choice.
3. **Boundary:** name the condition or uncertainty that limits the answer.
4. **Next test:** state what would resolve it.

Question: “Why is that baseline fair?”

> It uses the same controller, objects, seeds, and visibility conditions, with only the tactile signal removed. Figure 2 shows the paired drop rates. I did not compare against a more advanced multimodal controller, so the result establishes the value of tactile input relative to this baseline, not state-of-the-art performance. That stronger comparison is the next test.

The second question may be “Could tuning have favored your method?” Be ready to explain which settings were fixed, which data were used for tuning, and whether the baseline received a comparable opportunity. Practicing follow-ups reveals shallow memorization quickly.

## Answer the question beneath the question

Judges, professors, and reviewers are usually testing your reasoning and ownership.

- **Why did you choose this?** Connect the problem to an observation, literature gap, or user need—not “I have always loved science.”
- **What was your contribution?** Name what you designed, coded, collected, analyzed, or concluded.
- **What is your baseline?** Explain why it is a fair comparison.
- **What surprised you?** Describe a result that changed your model of the problem.
- **What failed?** Show the failure, diagnosis, and resulting decision.
- **What are your limitations?** Name the boundary and the test that would address it.
- **What would you do next?** Choose one high-information next experiment, not ten features.
- **What did your mentor do?** Separate their training, equipment, data, code, and decisions from yours precisely.

If you do not know, say what you do know and how you would find out. Inventing an answer damages credibility more than a bounded “I don’t know yet.”

A useful unknown is specific: “I did not measure humidity independently, so I cannot separate it from the temperature effect. The logged metadata suggest the runs differ; blocking the next experiment by humidity range would test that.” This demonstrates control of the evidence without pretending the missing measurement exists.

## Make mentorship transparent

Prepare a simple ownership statement:

> My mentor suggested the original paper and trained me on the imaging system. I designed the comparison, wrote the analysis code, collected the final measurements, and interpreted the result. The lab supplied equipment and reviewed my safety procedure.

Adapt it to reality. Do not minimize legitimate help, and do not let group work make your contribution impossible to identify.

Create a task ledger before the interview:

| Project decision           | Student contribution         | Mentor or collaborator contribution             |
| -------------------------- | ---------------------------- | ----------------------------------------------- |
| Question and scope         | What you proposed or revised | Reading, constraint, or direction they supplied |
| Protocol and training      | Steps you designed           | Safety or equipment training provided           |
| Data and code              | What you collected or wrote  | Existing data, code, or infrastructure supplied |
| Analysis                   | Choices and checks you made  | Statistical or domain review received           |
| Interpretation and writing | Claims you drafted           | Feedback and edits received                     |

Specific collaboration strengthens credibility. Vague claims of doing “everything” rarely do.

## Practice for conversation, not theater

Record one attempt to identify unclear wording and filler. Then practice with interruptions. Ask a peer to point at any figure and say, “What am I looking at?” Ask a teacher to challenge the baseline and sample. Practice returning to the central question after a tangent.

Maintain eye contact when culturally and personally appropriate, face the listener, and pause before answering. Accessibility and clear reasoning matter more than performance tricks.

Practice a figure drill: orient the axes and groups in ten seconds, state the pattern in one sentence, define uncertainty in one, then state what follows. Repeat with the strongest result, a null result, and a failure. For remote calls, test screen sharing and keep a local copy; for a whiteboard discussion, practice sketching the evidence path without decorative detail.

::guide-callout{title="Last five-minute rehearsal" tone="action"}
Say the question, contribution, baseline, main number, limitation, next experiment, and mentor/student split without looking at notes. Those seven answers carry most research conversations.
::
