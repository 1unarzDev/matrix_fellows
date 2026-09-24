# Matrix Fellows documentation

This is the entry point for implementation, operations, design research, and
validation. The repository root [README](../README.md) remains the shortest path
to local setup and deployment; this index explains how the system works and why.

## Start here

| Goal                                        | Read                                                           |
| ------------------------------------------- | -------------------------------------------------------------- |
| Understand the whole system                 | [Architecture overview](architecture/overview.md)              |
| Change or profile the cinematic renderer    | [Performance and rendering](architecture/performance.md)       |
| Work on visual direction                    | [Art direction](design/art-direction.md)                       |
| Operate opportunity updates                 | [Opportunity monitoring](operations/opportunity-monitoring.md) |
| Write or maintain research guides           | [Research-guide authoring](operations/research-guides.md)      |
| Update meeting dates, agendas, or resources | [Meeting schedule](operations/meetings.md)                     |
| Configure membership responses              | [Membership form and Sheets](operations/join-form.md)          |
| Run verification or investigate regressions | [Validation](quality/validation.md)                            |
| Check asset attribution                     | [Asset licenses](legal/asset-licenses.md)                      |

## Categories

### Architecture

Current, implementation-backed descriptions. Update these whenever a runtime
interface, render path, data flow, resource budget, or failure mode changes.

- [System overview](architecture/overview.md) — runtime topology, major modules,
  interfaces, data flow, ownership, and fallback behavior.
- [Performance and rendering](architecture/performance.md) — initialization,
  scroll synchronization, GPU paths, frame pacing, adaptive quality, teardown,
  measurements, and profiling commands.

### Design

Current visual intent plus the source material behind specific decisions.

- [Art direction](design/art-direction.md) — the continuous-world composition and
  implementation tradeoffs.
- [Loading experience](design/loading-experience.md) — arrival behavior and deep-link handling.
- [Reference studies](design/references/) — Alto palette, constellations, water,
  identity, mobile rendering, and oasis terrain. These are research inputs, not
  licenses or current implementation contracts.

### Operations

Owner and maintainer runbooks.

- [Membership form and Google Sheets](operations/join-form.md)
- [Living opportunity catalog](operations/opportunity-monitoring.md)
- [Catalog search and source review](operations/opportunity-catalog.md)
- [Research-guide authoring](operations/research-guides.md)
- [Meeting schedule and archive](operations/meetings.md)
- [Legacy/manual opportunity imports](operations/opportunity-imports.md)
- [Search audit](operations/seo-audit.md) and [Search Console setup](operations/seo-setup.md)

### Quality

Verification instructions and dated investigation records.

- [Validation matrix](quality/validation.md)
- [Opportunity catalog report](quality/opportunity-catalog-report.md)
- [Research-guide implementation report](quality/research-guides-report.md)
- [Mobile performance report](quality/mobile-performance-report.md) — a dated
  SwiftShader comparison, not a physical-device benchmark.
- [Physical-device performance procedure](quality/physical-device-performance-procedure.md)
  — iPhone/Safari and budget-Android acceptance protocol.
- [Performance source review](research/performance/optimization-sources.md) —
  primary-source constraints behind the current optimization pass.
- [Ocean gap regression](quality/regressions/ocean-gap.md)

### Research data

Primary-source opportunity research and the structured catalogs consumed by the
scheduled Worker.

- [Competitions](research/opportunities/competitions.md)
- [Programs](research/opportunities/programs.md)
- [Workshops and publications](research/opportunities/workshops-publications.md)
- [Deadline-source research](research/opportunities/deadline-sources.md)
- [Catalog implementation sources](research/opportunities/catalog-implementation-sources.md)
- [Internship, summer-program, and HOSA expansion](research/opportunities/catalog-expansion-2026-09-23.md)
- [Texas summer-program eligibility audit](research/opportunities/texas-summer-program-eligibility-2026-09-23.md)
- [Guide implementation and content sources](research/guides/implementation-sources.md)
- [Machine-readable catalogs](research/catalogs/) — runtime inputs; preserve their
  schemas and verify `workers/catalog.ts` when moving or editing them.

### Legal and provenance

- [Asset licenses](legal/asset-licenses.md)
- Shipped third-party notices also live beside the relevant public assets.

## Documentation conventions

- Architecture documents describe the current implementation. Prefer stable
  interfaces, invariants, failure modes, and performance characteristics over a
  line-by-line tour.
- Dated quality reports preserve what was measured, on which environment, and
  what the result does **not** prove. Do not silently turn emulation into a
  physical-device claim.
- Reference studies record sources and art-direction conclusions. They should
  not be treated as permission to copy reference artwork.
- Operations documents distinguish automated behavior from owner-only steps and
  never imply that an external account, deployment, or verification succeeded
  unless it was observed.
- Link to repository files with relative paths. Run the documentation link check
  in [validation](quality/validation.md) after moving files.
