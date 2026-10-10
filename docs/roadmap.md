# Delivery roadmap

The roadmap is milestone-driven rather than date-driven. A milestone advances only when its exit criteria are satisfied. GitHub Issues are the execution source of truth; this document explains sequencing and decision gates.

## Current position

```text
M0 Foundation ✅ → M1 Public educational beta → M2 Traceable incident data → M3 Optional validation → M4 Optional AI
```

Live progress is tracked in [GitHub milestones](https://github.com/roman-nalapko/maritime-risk-app/milestones) and the linked issues in [BACKLOG.md](../BACKLOG.md).

## M0 — Foundation prototype

**Status:** complete.

Delivered:

- responsive browser-only PWA;
- local questionnaire and deterministic calculation;
- risk breakdown and rule-based recommendations;
- synthetic incident explorer;
- visible research disclaimer;
- automated repository checks and documentation.

The prototype proves the interaction and technical approach, not scientific validity.

## M1 — Public educational beta

**Objective:** deliver a complete free browser product whose calculations, inputs, limitations, and data provenance are visible and reproducible.

Workstreams:

- define exact outcomes: incident, injury, severe injury, fatality;
- audit the supplied educational tables and arithmetic;
- define maritime roles, operations, vessels, exposure units, and populations;
- implement a coefficient registry with full provenance;
- replace implicit assumptions with documented decisions;
- add calculation fixtures for representative profiles;
- improve uncertainty and source-status presentation.

**Exit criteria:**

- every coefficient has source, unit, population, period, and review status;
- disputed coefficients are excluded or visibly marked;
- at least ten representative profiles have expected, reviewed results;
- fictional scenarios and a printable local report support classroom demonstrations;
- the static build is ready for a free public host without a backend or paid service.

**Decision gate:** no real-data risk inference begins until outcomes and denominators are defined.

## M2 — Real incident data

**Objective:** replace synthetic dashboard data with a traceable first official dataset while preserving the distinction between event share and individual risk.

Workstreams:

- ingest linked MAIB occurrence, vessel, and affected-person CSV files;
- normalize source taxonomy to the internal schema;
- store retrieval metadata and checksums;
- publish privacy-reviewed aggregate JSON;
- display sample size, reporting period, provenance, and limitations;
- add exposure denominators where compatible data exists;
- calculate confidence intervals and sparse-sample warnings.

**Exit criteria:**

- import is repeatable from a documented raw snapshot;
- schema and quality checks fail loudly on invalid data;
- UI never labels incident share as personal probability;
- every chart shows source, period, sample size, and filter state;
- synthetic data is removed from the default production build.

**Decision gate:** if a compatible denominator cannot be obtained, the product remains a descriptive incident explorer and does not infer personal rates from those records.

## M3 — Optional external validation

**Objective:** improve evidence quality if participants and domain reviewers become available. This milestone is not required to publish the educational hypothesis.

Workstreams:

- moderated usability sessions with cadets or maritime workers;
- review with a maritime safety specialist;
- accessibility audit and mobile/PWA reliability testing;
- Ukrainian terminology and optional English-language review;
- historical scenario comparison;
- privacy, governance, and limitation documentation;
- public feedback and terminology review where available.

**Optional exit criteria:**

- users distinguish annual estimate from incident share;
- users can identify the dominant factor without assistance;
- calculation results are reproducible from displayed inputs and metadata;
- critical accessibility defects are closed;
- pilot findings and go/no-go recommendation are documented.

## M4 — Optional AI exploration

**Objective:** test whether AI adds measurable value without weakening traceability or requiring costly infrastructure.

Candidate experiments:

- extract candidate causal tags from investigation narratives;
- retrieve similar reviewed incidents;
- draft grounded explanations with source links;
- run a small browser-side model only if size and performance are acceptable.

**Exit criteria:**

- evaluation dataset and human-review process exist;
- hallucination and unsupported-citation rates are measured;
- numeric risk calculation remains deterministic;
- feature can be disabled without degrading the core product;
- hosting and privacy costs are explicitly accepted.

## Operational product — not yet scheduled

Authentication, organization dashboards, audit logs, synchronized history, private datasets, and employment-related workflows require separate legal, privacy, security, and scientific validation. They are not an automatic continuation of the research prototype.

## Roadmap operating rules

- `P0` blocks the current milestone or protects correctness/privacy.
- `P1` is required for the milestone exit criteria.
- `P2` improves quality but does not block exit.
- New ideas enter the backlog, not the active milestone, unless they resolve a documented blocker.
- Optional AI never blocks M1–M3.
- External participants and specialist review never block publication of the clearly labelled educational hypothesis; they do block claims of validated accuracy.
- Close an issue only when its acceptance criteria and required tests are satisfied.
