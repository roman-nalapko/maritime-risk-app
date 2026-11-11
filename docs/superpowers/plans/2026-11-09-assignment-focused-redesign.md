# Assignment-Focused SeaRisk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the root SeaRisk experience a reliable, simple, instructor-ready KP-965 GISIS/ECFA assignment while preserving the broader research suite as an optional view.

**Architecture:** Keep the existing static HTML/CSS/ES-module stack and pure domain functions. Introduce a default assignment view selected by URL state, while the existing full suite remains reachable through `?view=tools`; both views reuse the same DOM and application code to avoid duplication. Initialize the assignment module before and independently from optional dashboard modules so an unrelated failure cannot blank the submission.

**Tech Stack:** Semantic HTML, CSS, browser ES modules, Node.js validation scripts, service worker; zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-09-assignment-focused-redesign.md`

## Global Constraints

- Keep the deployed product static and browser-first.
- Keep questionnaire and calculation data in browser memory; no telemetry or remote API calls.
- Keep `calculatePortBasinRisk(factors, options)` and GISIS record data pure and deterministic.
- Preserve exactly five `role="switch"` controls in the optional questionnaire.
- Do not claim certification, navigational validity, or an individual probability.
- Do not add runtime dependencies or a new framework.
- Default copy is Ukrainian; official English abbreviations remain where required.
- Verify at 360 px, 375 px, 768 px, and 1280 px.
- Do not publish, push, or deploy without explicit user approval.
- Work must be linked to a Ready GitHub Issue before product-code changes begin.

## Review Focus

- A failure in the optional worker dashboard must not prevent the KP-965 calculation, mitigations, or ECFA from rendering; Task 1 adds bootstrap-order and fallback tests.
- `?view=tools` must preserve all existing questionnaire controls and translations while the default URL stays assignment-focused; Task 2 tests both view contracts.
- Clipboard access may be absent or denied; Task 3 verifies truthful success/failure feedback and keeps the Python export explicitly tied to the baseline case.
- A previously installed cache-first PWA may serve the old shell; Task 4 bumps and tests the cache identity and complete assignment shell.
- Small screens must not hide the risk result, ECFA filters, or export actions; Task 4 adds responsive assertions and manual browser checks.

---

### Task 1: Repair startup and isolate the assignment bootstrap

**Files:**
- Modify: `scripts/check.mjs`
- Modify: `scripts/feature-checks.mjs`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: existing `asIndex(value)`, `initGisisEcfaModule()`, `renderRisk(result, input, scenarioName, isInitial)`, and `loadIncidents()`.
- Produces: `initializeModule(name, initializer, fallbackSelector?)` for isolated UI startup and a first-load sequence where GISIS/ECFA initializes before optional dashboard work.

- [ ] **Step 1: Add failing regression assertions**

  In `scripts/check.mjs`, assert that `src/app.js` does not call the removed `formatEngineeringValue` symbol. In `scripts/feature-checks.mjs`, assert that the executable bootstrap call to `initGisisEcfaModule()` appears before the initial `renderRisk(...)` call and that the ECFA container has an accessible failure-message target.

- [ ] **Step 2: Run the focused checks and confirm the regression is reproduced**

  Run: `node scripts/check.mjs && node scripts/feature-checks.mjs`

  Expected: FAIL on the undefined formatter and/or bootstrap-order assertions.

- [ ] **Step 3: Fix the formatter call**

  Replace the health-axis call to `formatEngineeringValue(result.components.health)` with the existing locale-aware `asIndex(result.components.health)` representation. Do not change risk units or model calculations.

- [ ] **Step 4: Add isolated module initialization**

  Add `initializeModule(name, initializer, fallbackSelector = null)` in `src/app.js`. It must catch errors, log one named error, and write a concise `role="alert"` message into the fallback target when provided. Call `initGisisEcfaModule()` through it before the generic initial risk render; initialize the risk preview and incident loader separately so either can fail without blanking GISIS/ECFA.

- [ ] **Step 5: Run focused and full checks**

  Run: `node scripts/check.mjs && node scripts/feature-checks.mjs && npm test`

  Expected: all commands exit 0.

- [ ] **Step 6: Commit the independently working startup repair**

  Commit message: `fix: isolate assignment startup from optional dashboard`

### Task 2: Make the assignment the default root experience

**Files:**
- Modify: `src/index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `scripts/feature-checks.mjs`

**Interfaces:**
- Consumes: Task 1 resilient startup and the existing sections `#gisis-ecfa`, `#assessment`, `#cases`, `#statistics`, and `#methodology`.
- Produces: URL-selected view mode: default `assignment`, optional `tools` for `?view=tools`; `applyViewMode(search)` updates the document view without changing domain data.

- [ ] **Step 1: Add failing view-contract tests**

  Extend `scripts/feature-checks.mjs` to require:

  - assignment-specific hero copy and a primary `href="#gisis-ecfa"` action;
  - an additional-tools link containing `?view=tools#assessment`;
  - view-mode CSS selectors for assignment and tools states;
  - five existing `role="switch"` controls remaining in the document;
  - navigation translation using stable selectors or `data-*` keys rather than positional `header nav a` indexes.

- [ ] **Step 2: Run the feature checks and verify failure**

  Run: `node scripts/feature-checks.mjs`

  Expected: FAIL on assignment-view copy and mode selectors.

- [ ] **Step 3: Add `applyViewMode(search = window.location.search)`**

  In `src/app.js`, parse `view=tools`; set `document.documentElement.dataset.view` to `tools` only for that exact value and to `assignment` otherwise. Apply assignment hero copy after localization so `setLanguage()` cannot overwrite it. Replace positional navigation translation with explicit element IDs or `data-i18n` attributes.

- [ ] **Step 4: Simplify the default HTML hierarchy**

  In `src/index.html`, change the hero to name the inland-waterway/basin risk assignment, KP-965, GISIS, ECFA, and `R = P × S`. Add a primary jump to `#gisis-ecfa`, a compact official-method link to `#assignment-sources`, and a secondary `?view=tools#assessment` entry point. Keep all legacy sections in the DOM for the tools view.

- [ ] **Step 5: Add view-mode styling**

  In `src/styles.css`, hide the questionnaire, case library, aggregate-statistics dashboard, bridge-lighting controls, HUD, and language controls only in the default assignment view. Keep `#gisis-ecfa` and `#methodology` visible. In tools view, preserve the existing full suite.

- [ ] **Step 6: Run feature and repository checks**

  Run: `node scripts/feature-checks.mjs && npm test`

  Expected: all checks exit 0 and exactly five questionnaire switches remain.

- [ ] **Step 7: Commit the focused information architecture**

  Commit message: `feat: make kp-965 assignment the primary experience`

### Task 3: Simplify the assignment flow and make exports truthful

**Files:**
- Modify: `src/index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `scripts/feature-checks.mjs`

**Interfaces:**
- Consumes: `KP965_GISIS_RECORD`, `calculatePortBasinRisk(factors, options)`, `generatePythonAssignmentScript(record, riskResult)`, and Task 2 assignment view.
- Produces: the visible sequence case → factors → P/S/R → mitigations → ECFA → sources/exports; `copyPythonAssignment()` returns a promise and reports copied/failed truthfully.

- [ ] **Step 1: Add failing content and export tests**

  Extend `scripts/feature-checks.mjs` to assert:

  - the default case labels KP-965, Koper, 22 knots, `P = 5`, `S = 3`, and expected `R = 15` through existing model assertions and matching UI targets;
  - the generated-measures heading precedes the ECFA section in assignment markup;
  - `#assignment-sources` lists GISIS, MSC-MEPC.3/Circ.4/Rev.1, IMO A.1075(28), and the KP-965 final report reference;
  - the Python export is labelled as the baseline KP-965 reproduction;
  - clipboard success text occurs only after an awaited successful `writeText` call and a failure message exists.

- [ ] **Step 2: Run the feature checks and verify failure**

  Run: `node scripts/feature-checks.mjs`

  Expected: FAIL on sources, baseline-export labelling, or clipboard feedback.

- [ ] **Step 3: Tighten assignment copy and hierarchy**

  Shorten the section intro, factor descriptions, result labels, and export explanation without changing IDs, factor weights, official codes, or formulas. Add `#assignment-sources` after the ECFA/export flow with official references and the educational-use limitation.

- [ ] **Step 4: Make clipboard behaviour observable**

  Implement `async copyPythonAssignment()` in `src/app.js`. Await `navigator.clipboard.writeText(...)`; show success only after resolution, otherwise show a localized failure message and keep the generated script available through the existing UI path. Label the script as reproducing the baseline KP-965 case rather than the currently edited factor state.

- [ ] **Step 5: Reduce visual noise in assignment cards**

  Use one cyan primary action, reserve red/amber for risk status, reduce badge count, and keep one main heading per card. Preserve focus styles and keyboard activation for ECFA nodes and filters.

- [ ] **Step 6: Run tests and build**

  Run: `npm test && npm run build`

  Expected: both commands exit 0.

- [ ] **Step 7: Commit the coherent assignment flow**

  Commit message: `feat: clarify kp-965 calculation and exports`

### Task 4: Verify responsive behaviour and offline upgrades

**Files:**
- Modify: `src/styles.css`
- Modify: `src/sw.js`
- Modify: `scripts/audit-accessibility-pwa.mjs`
- Modify: `scripts/feature-checks.mjs`

**Interfaces:**
- Consumes: Tasks 1–3 assignment UI and the existing static app shell.
- Produces: responsive assignment layout and a new service-worker cache identity containing every root-view asset.

- [ ] **Step 1: Add failing PWA and responsive contract checks**

  Require a cache identity newer than `searisk-ua-v0.8.1`, assignment assets in `APP_SHELL`, mobile stacking rules for the risk summary and export actions, horizontally safe ECFA overflow, visible `:focus-visible`, and `prefers-reduced-motion` support.

- [ ] **Step 2: Run focused audits and verify failure**

  Run: `node scripts/audit-accessibility-pwa.mjs && node scripts/feature-checks.mjs`

  Expected: FAIL on the old cache identity and any missing assignment-responsive contract.

- [ ] **Step 3: Implement responsive rules**

  Ensure the primary assignment flow fits 360/375 px without horizontal page overflow; ECFA may scroll only inside its labelled diagram region. Stack factor cards, result metrics, and export buttons at the mobile breakpoint while preserving desktop density at 1280 px.

- [ ] **Step 4: Update the offline shell**

  Bump the service-worker cache identity and confirm the root HTML, CSS, JavaScript modules, icons, and datasets used by both assignment and tools views are precached. Retain safe deletion of older SeaRisk cache versions during activation.

- [ ] **Step 5: Run automated verification**

  Run: `npm test && npm run build`

  Expected: all six test suites and build exit 0.

- [ ] **Step 6: Run browser verification**

  At 360, 375, 768, and 1280 px verify: no console errors; default URL shows the assignment; `P = 5`, `S = 3`, `R = 15`; mitigations render; ECFA nodes are visible and keyboard-selectable; exports are reachable; `?view=tools#assessment` exposes the preserved questionnaire; offline reload uses the new shell.

- [ ] **Step 7: Commit the responsive and PWA hardening**

  Commit message: `fix: harden assignment layout and offline updates`

### Task 5: Align documentation and prepare deployment handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/system-architecture.md`
- Modify: `docs/product-spec.md`
- Modify: `BACKLOG.md`
- Modify: `package.json`
- Modify: `work/agent-tasks/assignment-focused-redesign/state.md`

**Interfaces:**
- Consumes: verified root and tools views from Tasks 1–4.
- Produces: consistent application version/status, current architecture documentation, and a deployable local build without publishing it.

- [ ] **Step 1: Add documentation/version consistency assertions**

  Extend existing checks to require one application release version across `package.json`, service-worker cache naming, README status, and visible footer/version metadata while preserving separate model and dataset versions.

- [ ] **Step 2: Run checks and confirm current version drift fails**

  Run: `npm test`

  Expected: FAIL until application release markers are aligned.

- [ ] **Step 3: Update scoped documentation**

  Document the assignment-first root, optional `?view=tools`, current coefficient-registry implementation, provisional model boundary, browser-only privacy boundary, and build/deployment commands. Record the redesign as completed only after browser verification passes.

- [ ] **Step 4: Align the application release identifier**

  Set the application release to `0.9.0` in `package.json`, service-worker cache naming, README status, and visible application metadata. Do not overwrite `SR-UA-PROTOTYPE-0.1`, coefficient registry `0.1.0`, or dataset versions.

- [ ] **Step 5: Run final verification from a clean command sequence**

  Run: `npm test && npm run build && git diff --check && git status --short`

  Expected: tests and build exit 0; no whitespace errors; only intended source/docs/plan changes appear.

- [ ] **Step 6: Perform final browser smoke check against `dist/`**

  Serve `dist/` on a fresh origin, verify the assignment and tools views with no console errors, and record observed results in `work/agent-tasks/assignment-focused-redesign/state.md`.

- [ ] **Step 7: Commit the release-ready documentation**

  Commit message: `docs: prepare assignment-focused release`

- [ ] **Step 8: Stop before external publication**

  Present the verified build, diff summary, and recommended GitHub Pages deployment action. Request explicit approval before push, deployment, or sharing an external link.

