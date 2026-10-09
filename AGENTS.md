# AGENTS.md

## Mission

Build SeaRisk UA as a transparent, privacy-first maritime risk research tool. Prefer a small, dependable browser application over unnecessary infrastructure or AI.

## Non-negotiable domain rules

- Never describe the prototype as a certified safety, medical, insurance, employment, or navigational system.
- Never convert an incident distribution directly into a personal probability.
- Keep these concepts distinct in code and UI:
  - `incidentShare`: category count divided by all recorded incidents;
  - `exposureRate`: outcomes divided by hours, voyages, operations, or workers exposed;
  - `individualEstimate`: model output for one questionnaire;
  - `severityGivenIncident`: conditional distribution after an incident occurs.
- Do not silently combine coefficients from different populations, years, units, or sources.
- Every coefficient must include source, unit, valid population, period, version, and validation status.
- Show uncertainty and data limitations whenever a statistically derived value is displayed.
- Never send questionnaire data to a remote service without explicit product requirements and consent.
- AI output must not modify numeric risk results. AI is limited to classification, retrieval, explanation, or draft recommendations, and must be clearly labelled.

## Product scope

The current milestone is a static Ukrainian-language PWA with:

- an individual worker questionnaire;
- a deterministic, explainable prototype calculation;
- a component breakdown and risk category;
- demo maritime incident statistics;
- rule-based recommendations;
- no authentication, server database, analytics, or external API calls.

Out of scope until methodology approval: clinical conclusions, employer rankings, automated fitness-for-duty decisions, real-time voyage decisions, predictive policing of workers, and claims of certified accuracy.

## Engineering conventions

- Keep the deployed product static and browser-first unless a backend is explicitly approved.
- Use semantic HTML, accessible labels, keyboard navigation, visible focus states, and WCAG AA contrast.
- Design mobile-first; verify at 360 px, 768 px, and 1280 px widths.
- Use progressive enhancement. The core form and results must work without installation as a PWA.
- Keep calculation functions pure and separate from DOM code.
- Store coefficients in versioned data objects, not scattered magic numbers.
- Use decimal probabilities internally (`0.001`), and convert to percentages only for display.
- Clamp invalid numeric input and handle missing values explicitly.
- Add or update tests whenever calculation behavior changes.
- Do not add runtime dependencies without a clear need and documentation.
- Do not commit secrets, personal data, raw confidential reports, generated `dist/`, or OS/editor files.

## Repository map

- `src/` — static application source.
- `data/` — source-shaped sample data and schemas.
- `scripts/` — local validation/build utilities.
- `docs/` — product, method, design, data, and delivery decisions.
- `.github/workflows/` — continuous validation only; deployment is intentionally provider-neutral.

## Required checks

Before committing:

```bash
npm test
npm run build
```

For UI changes, also inspect the local preview at mobile and desktop sizes. Verify that the research-prototype disclaimer remains visible and that every displayed percentage has an unambiguous label.

## Change protocol

1. Read `docs/product-spec.md` and `docs/risk-model.md` before changing product behavior.
2. Record methodology changes in `docs/decisions.md`.
3. Update the model version when coefficients or formulas change.
4. Preserve a migration note when changing stored questionnaire fields.
5. If a source conflicts with the existing model, do not guess: mark the coefficient as disputed and keep it out of production calculations until reviewed.

