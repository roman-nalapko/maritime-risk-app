# SeaRisk UA

SeaRisk UA is a browser-only educational PWA for a worked maritime safety assignment. The default page digitizes the KP-965 pilot-boat casualty, explains an ECFA chain, calculates a transparent training index `R = P × S`, and generates preventive measures.

> **Status (v1.1.0):** classroom handoff release with a one-command local launch, neutral project attribution, reliable online updates, and a flash-free guided first paint. The risk score remains a provisional training model, not an IMO-approved probability or a navigational decision system.

## Open the ready site

Use the published version without installing anything:

**[Open SeaRisk UA](https://roman-nalapko.github.io/maritime-risk-app/)**

No account or registration is required. For a presentation, open the link and select **Почати розбір**. The site walks through the KP-965 case in five steps and ends with a ready coursework conclusion, sources, and export actions.

## What is included

- five-step guided review of the KP-965 case, from incident facts to a reusable conclusion;
- exactly five explainable factor controls and a visible raw factor sum before the `P = 5` scale cap;
- transparent `R = P × S` calculation and rule-based preventive measures;
- deterministic coursework conclusion with local copy, manual fallback, and print/PDF actions;
- keyboard-accessible ECFA diagram and a compact source list;
- reproducible GISIS-style JSON and baseline Python exports;
- optional research suite at `?view=tools` with the original questionnaire, MAIB aggregates, and local print/PDF report;
- offline-capable PWA shell;
- zero-data browser runtime with no account or registration, backend, telemetry, or paid API.

## Run a downloaded copy

### Fastest option: GitHub ZIP

1. Install [Node.js 20 or newer](https://nodejs.org/) once if it is not already installed.
2. Open the [GitHub repository](https://github.com/roman-nalapko/maritime-risk-app), select **Code → Download ZIP**, and extract the archive.
3. Open Terminal or PowerShell in the extracted `maritime-risk-app` folder.
4. Run:

```bash
npm start
```

The browser opens automatically at `http://127.0.0.1:4173/`. Keep the terminal open during the presentation. Press `Ctrl+C` there to stop the local site.

There are no npm dependencies, so `npm install` is not required.

### Alternative: clone with Git

```bash
git clone https://github.com/roman-nalapko/maritime-risk-app.git
cd maritime-risk-app
npm start
```

## Presentation routes

- `http://127.0.0.1:4173/` — the recommended five-step KP-965 presentation;
- `http://127.0.0.1:4173/?view=tools#assessment` — the extended research tools.

The normal presentation is: incident facts → causal factors → transparent `R = P × S` calculation → preventive measures → conclusion and evidence. The extended tools remain available, but they are not required to explain the assignment.

## Troubleshooting

- **`node` or `npm` is not recognized:** install Node.js 20+ and reopen the terminal.
- **The browser did not open:** open `http://127.0.0.1:4173/` manually.
- **Port 4173 is already in use:** macOS/Linux: `PORT=4174 npm start`; PowerShell: `$env:PORT=4174; npm start`.
- **An older page appears:** close other SeaRisk UA tabs and reload. When online, the PWA uses the newest network response and refreshes its offline cache.

## Validate and build

```bash
npm test
npm run build
```

Use `npm run dev` when developing without automatic browser opening. The deployable static site is written to `dist/`.

The default incident view uses 2020–2025 MAIB affected-person records. Raw linked CSV files stay under ignored `work/`; only cells containing at least five records are published. Reproduce the public file with:

```bash
npm run import:maib -- --input work/raw/maib --output work/normalized/maib --retrieved-on 2026-10-10
npm run aggregate:maib -- --input work/normalized/maib --output src/data/incidents.maib.aggregate.json --from 2020 --to 2025 --minimum-cell 5
```

Publish `dist/` with GitHub Pages, Cloudflare Pages, Vercel, Netlify, or another static host.

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
