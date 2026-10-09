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
