# Product backlog

GitHub Issues are the execution source of truth. This file defines the backlog system, ordering rules, and current epic map so contributors and agents make consistent decisions.

## Live tracking

- [All open backlog issues](https://github.com/roman-nalapko/maritime-risk-app/issues)
- [Roadmap milestones](https://github.com/roman-nalapko/maritime-risk-app/milestones)
- Current P0 sequence: [define outcomes](https://github.com/roman-nalapko/maritime-risk-app/issues/7) → [audit source tables](https://github.com/roman-nalapko/maritime-risk-app/issues/8) → [define maritime taxonomy](https://github.com/roman-nalapko/maritime-risk-app/issues/4)

## Workflow

```text
Inbox → Refined → Ready → In progress → Review → Done
          ↓
        Blocked
```

GitHub Issues start in **Inbox**. An issue becomes **Ready** only after it meets the Definition of Ready. Because GitHub Issues do not provide all workflow columns without a Project, status is recorded through issue assignment/PR linkage and milestone progress; a Project board can be added later if the team needs one.

## Priority

| Priority | Meaning | Expected handling |
| --- | --- | --- |
| `priority:P0` | Correctness, privacy, or current-milestone blocker | Work before other milestone items |
| `priority:P1` | Required for milestone exit | Plan within the milestone |
| `priority:P2` | Valuable improvement or experiment | Pull after P0/P1 capacity exists |

Priority describes impact and sequencing, not effort.

## Areas

- `area:model` — formulas, coefficients, classification, tests.
- `area:data` — imports, schemas, provenance, statistics.
- `area:ux` — questionnaire, results, charts, accessibility, language.
- `area:platform` — PWA, build, CI, deployment, performance.
- `area:research` — validation, usability, domain review, AI experiments.
- `area:governance` — privacy, limitations, approvals, operational boundaries.

## Definition of Ready

An issue is ready when:

- the user or research outcome is stated;
- scope and exclusions are explicit;
- acceptance criteria are testable;
- source/data dependencies are identified;
- privacy and methodology impact are considered;
- it belongs to one milestone and has one priority.

## Definition of Done

An issue is done when:

- acceptance criteria are satisfied;
- automated tests and build pass;
- affected documentation and versions are updated;
- source/provenance metadata is present where applicable;
- mobile and accessible interaction is checked for UI work;
- no unsupported risk claim or personal data is introduced;
- the implementing pull request or commit is linked.

## Epic map

### Methodology v1.0

1. [Define outcomes and intended use](https://github.com/roman-nalapko/maritime-risk-app/issues/7).
2. [Audit educational tables and arithmetic](https://github.com/roman-nalapko/maritime-risk-app/issues/8).
3. [Define maritime taxonomy and exposure units](https://github.com/roman-nalapko/maritime-risk-app/issues/4).
4. [Build coefficient registry and provenance rules](https://github.com/roman-nalapko/maritime-risk-app/issues/14).
5. [Add reviewed calculation fixtures](https://github.com/roman-nalapko/maritime-risk-app/issues/3).
6. [Display uncertainty and methodology status](https://github.com/roman-nalapko/maritime-risk-app/issues/10).

### Real incident data

1. [Implement the MAIB CSV import](https://github.com/roman-nalapko/maritime-risk-app/issues/12).
2. [Map source fields to the internal taxonomy](https://github.com/roman-nalapko/maritime-risk-app/issues/9).
3. [Add data-quality and privacy checks](https://github.com/roman-nalapko/maritime-risk-app/issues/15).
4. [Publish source, period, sample, and filter metadata](https://github.com/roman-nalapko/maritime-risk-app/issues/17).
5. [Research denominators, confidence intervals, and sparse-data warnings](https://github.com/roman-nalapko/maritime-risk-app/issues/13).

### Optional external validation

1. [Accessibility and mobile/PWA audit](https://github.com/roman-nalapko/maritime-risk-app/issues/5).
2. [Usability protocol and sessions](https://github.com/roman-nalapko/maritime-risk-app/issues/1).
3. [Maritime safety specialist review](https://github.com/roman-nalapko/maritime-risk-app/issues/6).
4. [Privacy and governance review](https://github.com/roman-nalapko/maritime-risk-app/issues/2).
5. [Restricted preview deployment and pilot findings](https://github.com/roman-nalapko/maritime-risk-app/issues/18).

These items improve evidence and terminology but do not block a public educational release. They remain mandatory before any validated probability, certification, or operational decision claim.

### Optional AI

1. [Evaluate AI architecture and browser-side feasibility](https://github.com/roman-nalapko/maritime-risk-app/issues/16).
2. [Prototype grounded similar-incident retrieval](https://github.com/roman-nalapko/maritime-risk-app/issues/11).

## Explicitly deferred

- employee ranking or fitness-for-duty decisions;
- medical recommendations;
- insurer or employer scoring;
- live navigational decisions;
- public accounts and cloud profile history;
- AI-generated numeric risk coefficients;
- ingestion of confidential or personally identifying records.

## Backlog review cadence

Review the active milestone after material domain feedback or dataset updates. During review:

1. close duplicates and obsolete assumptions;
2. confirm the next three P0/P1 issues;
3. move unvalidated ideas to `priority:P2` or a later milestone;
4. record methodology decisions in `docs/decisions.md`;
5. update roadmap status only from verified milestone progress.
