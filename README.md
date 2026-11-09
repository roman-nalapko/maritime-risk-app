# SeaRisk UA

SeaRisk UA is a browser-only educational PWA for a worked maritime safety assignment. The default page digitizes the KP-965 pilot-boat casualty, explains an ECFA chain, calculates a transparent training index `R = P × S`, and generates preventive measures.

> **Status (v0.9.0):** assignment-focused educational release. The KP-965 flow, responsive layouts, exports, and offline shell are verified. The risk score remains a provisional training model, not an IMO-approved probability or a navigational decision system.

## What is included

- assignment-first KP-965 case with five explainable factor switches;
- transparent `R = P × S` calculation and rule-based preventive measures;
- keyboard-accessible ECFA diagram and a compact source list;
- reproducible GISIS-style JSON and baseline Python exports;
- optional research suite at `?view=tools` with the original questionnaire, MAIB aggregates, and local print/PDF report;
- offline-capable PWA shell;
- zero-data browser runtime with no account, backend, telemetry, or paid API.

## Run locally

```bash
npm run dev
```

Open:

- `http://localhost:4173/` for the assignment;
- `http://localhost:4173/?view=tools#assessment` for the extended research tools.

## Validate and build

```bash
npm test
npm run build
```

The default incident view uses 2020–2025 MAIB affected-person records. Raw linked CSV files stay under ignored `work/`; only cells containing at least five records are published. Reproduce the public file with:

```bash
npm run import:maib -- --input work/raw/maib --output work/normalized/maib --retrieved-on 2026-10-10
npm run aggregate:maib -- --input work/normalized/maib --output src/data/incidents.maib.aggregate.json --from 2020 --to 2025 --minimum-cell 5
```

The deployable static site is written to `dist/`. Publish that directory with GitHub Pages, Cloudflare Pages, Vercel, Netlify, or another static host. This repository change prepares the build but does not publish it automatically.

No account, paid API, backend, or AI service is required. Hosting can use a free static-site tier; a custom paid domain is optional.

## Product principles

1. Calculations are deterministic, inspectable, and reproducible.
2. An incident share is never presented as an individual's probability.
3. Methodology-based and observed-statistics estimates remain separate.
4. Every coefficient has provenance, a version, and a validation status in `src/coefficients.js`.
5. AI may explain or classify data later, but may not invent risk values.

See [docs/product-spec.md](docs/product-spec.md) for scope and [docs/risk-model.md](docs/risk-model.md) for the provisional model.

## Planning and architecture

- [System architecture](docs/system-architecture.md)
- [Delivery roadmap](docs/roadmap.md)
- [Product backlog](BACKLOG.md)
- [Architecture decisions](docs/decisions.md)
