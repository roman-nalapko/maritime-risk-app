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

