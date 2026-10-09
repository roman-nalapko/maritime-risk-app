# SeaRisk UA

SeaRisk UA is a research prototype for transparent individual risk assessment in the maritime industry. It combines a questionnaire, deterministic calculations, incident statistics, and practical risk-reduction guidance in a browser-only PWA.

> **Status:** hypothesis/MVP. The coefficients are provisional and must be validated by a maritime safety specialist before operational use. The app is not a medical, employment, or navigational decision system.

## What is included

- responsive Ukrainian-language calculator;
- explainable risk breakdown by health, work conditions, and lifestyle;
- risk category and leading-factor summary;
- demo incident dashboard with filters;
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

The deployable static site is written to `dist/` and can be published with Cloudflare Pages, Vercel, Netlify, or another static host.

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
