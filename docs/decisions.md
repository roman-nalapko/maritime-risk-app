# Architecture decisions

## ADR-001: Static browser-first MVP

**Decision:** Use a buildless static PWA with no backend or runtime dependencies.

**Why:** It is fast to review and deploy, keeps questionnaire data local, and avoids infrastructure before the hypothesis and methodology are approved.

## ADR-002: Deterministic calculation core

**Decision:** Numeric results come from versioned coefficients and pure functions, never from AI.

**Why:** Risk values must be reproducible, inspectable, and testable.

## ADR-003: Separate methodology and statistics

**Decision:** The methodology estimate and incident explorer are distinct product surfaces.

**Why:** Event shares without exposure denominators cannot be presented as individual probabilities.

## ADR-004: Provider-neutral deployment

**Decision:** Produce a `dist/` directory usable by any static host; do not couple the repository to one provider during the hypothesis phase.

**Why:** The source repository remains private while Cloudflare Pages, Vercel, or another host can be selected later.

## ADR-005: Separate occupational outcomes and retire probability language for prototype 0.1

**Decision:** Treat `SR-UA-PROTOTYPE-0.1` as an educational demonstration index. Model v1.0 will target annual fatal occupational injury as its primary outcome and will keep non-fatal injury, serious injury, incident share, and conditional severity as separate outputs. General mortality and lifestyle mortality will not be added to the occupational model.

**Why:** The prototype combines values with different outcomes, units, populations, and evidence bases. Bounding their sum does not create a valid personal probability. IMO and ILO definitions also distinguish occurrence severity, individual injury cases, and exposure-based rates.

**Consequence:** UI copy must not express the prototype value as “one case in N” or as a probability of injury/death. Port workers and other non-seafarer populations require separate models or compatible coefficient sets.

**Evidence:** See `docs/methodology/outcome-definitions.md`.

## ADR-006: Quarantine the supplied educational coefficients

**Decision:** Retain the supplied teaching tables only as research evidence and an arithmetic test case. Mark the source and every extracted component `eligibleForModel: false`.

**Why:** The material lacks primary provenance and contains exponent, boundary, reference, and percentage contradictions. Its worked example also adds incompatible outcomes and denominators.

**Consequence:** Runtime code must not import `data/research/educational-source-audit.json`. New coefficients require traceable source metadata and review before use.

**Evidence:** See `docs/methodology/educational-source-audit.md`.

## ADR-007: Separate role, vessel, operation, event, and exposure axes

**Decision:** Use versioned controlled vocabularies for role, vessel, operation, and exposure. Keep casualty event type as a separate axis and retain explicit `unknown`/`other` values.

**Why:** IMO reporting records rank, ship operation, casualty event, and consequences separately. Collapsing them would create false mappings and incompatible denominators.

**Consequence:** Imports preserve raw values and mapping versions. The model may aggregate known categories but may not infer one axis from another or split an unspecified category.

**Evidence:** See `docs/methodology/maritime-taxonomy.md`.

## ADR-008: Gate operational calculations on coefficient approval

**Decision:** Store every executable value in a versioned registry with complete provenance metadata. Operational access requires both `status: approved` and `eligibleForApprovedModel: true`.

**Why:** A numeric value without a unit, covered population, period, source, and review status cannot be interpreted or safely reused.

**Consequence:** The demonstration engine can read quarantined values through an explicit prototype path, but the approved-calculation accessor rejects them. Registry and model versions are displayed with each result.

## ADR-009: No personal rate from unmatched public denominators

**Decision:** Do not divide MAIB affected-person counts by DfT seafarer estimates or other convenient public totals. Permit descriptive statistics now and only conditional vessel/arrival rate research after exact scope matching.

**Why:** MAIB's jurisdiction combines UK vessels worldwide with vessels in UK territorial waters, while candidate denominators use different nationality, registration, employer, vessel, and time-at-risk definitions.

**Consequence:** Personal percentages remain disabled. Future rates require the compatibility gate, exact Poisson intervals, and sparse-sample publication rules.

**Evidence:** See `docs/methodology/exposure-and-uncertainty.md`.

## ADR-010: Preserve MAIB grain and unresolved source meaning

**Decision:** Normalize MAIB occurrences, vessels, and affected persons as separate linked tables. Preserve raw category values, publish mapping coverage, and leave ambiguous roles/operations as `unknown`.

**Why:** The three source tables have different grains. Flattening them before counting duplicates occurrence/vessel totals, while guessing operations from events or voyage segments invents meaning absent from the source.

**Consequence:** Imports validate keys before joins, calculate coverage at source-table grain, and require domain review for `Skipper` and narrative-derived operations.

**Evidence:** See `docs/methodology/maib-field-mapping.md`.
