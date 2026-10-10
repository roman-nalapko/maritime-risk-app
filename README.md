# SeaRisk UA

SeaRisk UA is a free public educational product for transparent exploration of maritime risk factors. It combines a questionnaire, deterministic calculations, incident statistics, fictional demonstration scenarios, and practical risk-reduction guidance in a browser-only PWA.

> **Status:** public hypothesis/beta. The application is complete enough for independent educational use, but its provisional coefficients do not constitute a validated probability model. The app is not a medical, employment, insurance, certification, or navigational decision system.

## What is included

- responsive Ukrainian-language calculator;
- explainable risk breakdown by health, work conditions, and lifestyle;
- fictional maritime profiles for classroom demonstrations;
- reproducible input summary and local print/PDF report;
- risk category and leading-factor summary;
- official MAIB aggregate dashboard with role and vessel filters;
- offline-capable PWA shell;
- product, risk-model, design, data-source, and roadmap documentation;
- `AGENTS.md` with repository rules for future contributors and coding agents.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`.

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

The deployable static site is written to `dist/` and can be published with Cloudflare Pages, Vercel, Netlify, or another static host.

No account, paid API, backend, or AI service is required. Hosting can use a free static-site tier; a custom paid domain is optional.

## Product principles

1. Calculations are deterministic, inspectable, and reproducible.
2. An incident share is never presented as an individual's probability.
3. Methodology-based and observed-statistics estimates remain separate.
4. Every coefficient has a source, version, and validation status.
5. AI may explain or classify data later, but may not invent risk values.

See [docs/product-spec.md](docs/product-spec.md) for scope and [docs/risk-model.md](docs/risk-model.md) for the provisional model.

## Planning and architecture

- [System architecture](docs/system-architecture.md)
- [Delivery roadmap](docs/roadmap.md)
- [Product backlog](BACKLOG.md)
- [Architecture decisions](docs/decisions.md)
