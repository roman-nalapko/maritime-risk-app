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

## Manual verification after deploy

1. Open the root page and confirm the `SR-UA-PROTOTYPE-0.1` model label.
2. Calculate a default profile and a high-exposure profile.
3. Confirm incident filters update totals and distributions.
4. Reload offline after one successful online visit to check the PWA shell.
5. Verify the visible research disclaimer on mobile and desktop.

