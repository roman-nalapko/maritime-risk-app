# Deployment

SeaRisk UA builds to a provider-neutral static `dist/` directory.

## Build settings

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20 or newer
- Runtime secrets: none

## Recommended hypothesis deployment

Connect the private GitHub repository to Cloudflare Pages or Vercel and use the settings above. The app does not need a Worker, serverless function, database, or AI key.

Keep preview deployments access-restricted while coefficients remain provisional. Public deployment should happen only after the disclaimer, source licences, and methodology status are reviewed.

The host must not inject analytics, session replay, advertising pixels, or third-party form collection. Review the provider's access-log fields, retention, subprocessors, and region before enabling the pilot. Any collection beyond ordinary delivery logs triggers the privacy/legal review recorded in `docs/governance/privacy-and-misuse-review.md`.

## Live public educational deployment

- **URL**: `https://roman-nalapko.github.io/maritime-risk-app/`
- **Hosting**: GitHub Pages with automated GitHub Actions build and deployment pipeline (`.github/workflows/deploy.yml`).
- **Telemetry**: Zero cookies, zero trackers, zero external fonts or CDN dependencies, zero analytics scripts.
- **Data storage**: 100% ephemeral in-memory processing. Zero-Data retention verified by automated test suites.

## Rollback instructions

If a defect or coefficient discrepancy is identified:
1. Revert the problematic commit via `git revert <commit-sha>`.
2. Push to `main` (`git push origin main`), triggering `.github/workflows/deploy.yml` which rebuilds and redeploys `dist/`.
3. In emergency, dispatch workflow or disable GitHub Pages from Repository Settings -> Pages -> Source -> None.


