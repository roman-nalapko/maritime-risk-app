# SeaRisk UA 1.0 Guided Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the public root into a five-step guided KP-965 casualty review that a first-time visitor can complete without instruction while preserving the full research suite at `?view=tools`.

**Architecture:** Keep the static HTML/CSS/JavaScript PWA and existing calculation model. Add a focused `guided-assignment.js` module for step resolution and deterministic conclusion text, extend the port-basin result with explanatory raw-score and mitigation-trigger metadata, then reorganize the existing assignment DOM into progressive-disclosure panels without duplicating inputs or calculations.

**Tech Stack:** Vanilla ES modules, semantic HTML, CSS, Node.js assertion scripts, existing static build and service worker.

**Spec:** `docs/superpowers/specs/2026-11-10-v1-guided-experience-design.md`

## Global Constraints

- Create and link a Ready GitHub Issue before product-code changes begin.
- Do not add runtime dependencies, a backend, authentication, analytics, or a framework.
- Preserve every existing research tool and translation at `?view=tools`.
- Keep exactly five assignment factor controls and the existing numerical weights, cap, thresholds, and baseline `P = 5`, `S = 3`, `R = 15`.
- Always describe `P` as an educational factor score, not a measured probability.
- Keep the root journey Ukrainian-first; official abbreviations remain where required.
- Do not introduce registration-gated GISIS or Google Drive links.
- Preserve zero-data browser-only operation, offline support, keyboard access, print output, and 360/375/768/1280 px layouts.
- Release application version `1.0.0` without changing model `SR-UA-PROTOTYPE-0.1`, coefficient registry `0.1.0`, or dataset versions.
- Do not publish, push, merge, or deploy without explicit user approval after final verification.

## Review Focus

- Unknown hashes, browser back/forward, and direct `#step-5` navigation must resolve to a valid focused panel without hiding the assignment; Task 2 adds pure hash tests and Task 3 adds browser contracts.
- Disabling one baseline factor may leave capped `P = 5`; the raw factor sum must still update and explain the cap so the UI never appears broken; Task 1 tests raw-score metadata and Task 3 tests rendered feedback.
- Threshold/default mitigations must show `R ≥ …` or the default rule instead of inventing an active-factor attribution; Task 1 tests each trigger class.
- Clipboard access may be missing or denied for the final conclusion; the complete text must remain manually copyable; Task 3 reuses and tests the fallback boundary.
- JavaScript initialization or optional tools failure must leave a readable linear assignment and must not block KP-965 calculation, mitigations, ECFA, or sources; Tasks 2–3 add DOM/bootstrap contracts and the final browser smoke check exercises both views.

---

### Task 1: Expose explainable score and mitigation metadata

**Files:**
- Modify: `src/model.js`
- Modify: `scripts/feature-checks.mjs`

**Interfaces:**
- Consumes: `calculatePortBasinRisk(factors, options)` and existing mitigation rule objects.
- Produces: `rawProbabilityScore: number` on every port-basin result and `trigger: { type: "factor" | "threshold" | "default", id: string, labelUk: string, labelEn: string }` on every mitigation rule.

- [ ] **Step 1: Add failing model tests for raw score and trigger provenance**

Extend the port-basin cases in `scripts/feature-checks.mjs` to assert:

- the five-factor guided baseline has `rawProbabilityScore === 8.5`, `probabilityScore === 5`, and `riskIndex === 15`;
- disabling fatigue reduces `rawProbabilityScore` to `7.5` while capped `probabilityScore` remains `5`;
- speed and lookout rules use factor triggers when their factors are active;
- the speed rule uses threshold trigger `risk-gte-10` when speed is inactive but `R >= 10`;
- the lookout rule uses threshold trigger `risk-gte-6` when lookout is inactive but `R >= 6`;
- a factor-free low-risk case uses default trigger `baseline-checklist`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/feature-checks.mjs`

Expected: FAIL because `rawProbabilityScore` and mitigation `trigger` do not exist.

- [ ] **Step 3: Extend `calculatePortBasinRisk` without changing its formula**

Keep the pre-cap sum in `rawProbabilityScore`, derive the existing capped `probabilityScore` from it, and attach the actual rule trigger at the point each mitigation is generated. Factor-or-threshold rules prefer the active factor when present; otherwise they name the threshold.

- [ ] **Step 4: Run focused and full verification**

Run: `node scripts/feature-checks.mjs && npm test`

Expected: all feature and repository checks pass with unchanged baseline `R = 15`.

- [ ] **Step 5: Commit**

```bash
git add src/model.js scripts/feature-checks.mjs
git commit -m "feat: expose guided risk explanations"
```

### Task 2: Add pure guided-flow and conclusion boundaries

**Files:**
- Create: `src/guided-assignment.js`
- Modify: `scripts/check.mjs`
- Modify: `src/sw.js`

**Interfaces:**
- Consumes: Task 1 risk result and mitigation trigger shape.
- Produces:
  - `GUIDED_STEP_COUNT = 5`;
  - `resolveGuidedStep(hash: string): 0 | 1 | 2 | 3 | 4 | 5` where `0` is the entry state;
  - `guidedStepHash(step: number): "" | "#step-1" | … | "#step-5"`;
  - `buildAssignmentConclusion({ riskResult, activeFactorLabels, mitigationActions }): string` in Ukrainian;
  - service-worker precache entry `./guided-assignment.js`.

- [ ] **Step 1: Add failing pure-module tests**

In `scripts/check.mjs`, import the new module and assert:

- empty, unrelated, negative, and out-of-range hashes resolve to `0`;
- `#step-1` through `#step-5` round-trip through both helpers;
- the baseline conclusion names KP-965, `P = 5`, `S = 3`, `R = 15`, the critical category, active factors, and at least the first mitigation;
- a modified scenario uses the passed result and never calls `P` a probability;
- conclusion output is deterministic for the same input.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/check.mjs`

Expected: FAIL because `src/guided-assignment.js` does not exist.

- [ ] **Step 3: Implement the pure module**

Keep it DOM-free. Escape no HTML because the conclusion is plain text; callers must assign it through `textContent` or `value`. Use only passed labels/actions so the module does not duplicate model weights or rules.

- [ ] **Step 4: Add the module to the offline shell and verify**

Update `APP_SHELL` in `src/sw.js`; extend the PWA audit if necessary so missing guided module precache fails.

Run: `node scripts/check.mjs && node scripts/audit-accessibility-pwa.mjs`

Expected: both pass and every precached file exists.

- [ ] **Step 5: Commit**

```bash
git add src/guided-assignment.js src/sw.js scripts/check.mjs scripts/audit-accessibility-pwa.mjs
git commit -m "feat: add guided assignment state"
```

### Task 3: Rebuild the root as a five-step guided review

**Files:**
- Modify: `src/index.html`
- Modify: `src/styles.css`
- Modify: `src/app.js`
- Modify: `scripts/feature-checks.mjs`

**Interfaces:**
- Consumes: Task 1 result metadata, Task 2 step/conclusion helpers, existing factor inputs, severity select, ECFA renderer, source/export controls, and `copyTextOrFallback`.
- Produces: `initGuidedAssignment()`, `renderGuidedAssignment(riskResult)`, five panels `#guided-step-1`…`#guided-step-5`, `#guided-progress`, `#assignment-conclusion`, `#copy-assignment-conclusion-btn`, `#print-assignment-btn`, and manual-copy fallback `#assignment-conclusion-fallback`.

- [ ] **Step 1: Add failing DOM and copy contracts**

Extend `scripts/feature-checks.mjs` to require:

- entry copy `Чому сталася аварія і як її запобігти` and one primary `#start-guided-review-btn` targeting `#step-1`;
- exactly five guided panels and five progress items with plain-language titles;
- consistent `data-guided-prev` / `data-guided-next` controls;
- one copy and one print action on step 5;
- ECFA inside native `details`, and sources/export inside a separate native `details`;
- raw-score and cap explanation elements;
- existing factor, ECFA, export, source, and advanced-tools IDs still present once;
- conclusion copy uses `copyTextOrFallback` and exposes a textarea fallback.

- [ ] **Step 2: Run the feature checks and verify RED**

Run: `node scripts/feature-checks.mjs`

Expected: FAIL on missing guided markup and controller contracts.

- [ ] **Step 3: Reorganize existing assignment markup without duplicating controls**

Move the current case strip, factor form, score summary, alert, mitigations, ECFA, exports, and sources into their corresponding guided panels from the spec. Keep all current operational IDs. Add semantic headings, an ordered progress list, final causal-chain copy, conclusion output, copy/print controls, and native disclosure groups.

- [ ] **Step 4: Implement guided navigation and rendering**

Import Task 2 helpers in `src/app.js`. `initGuidedAssignment()` must:

- resolve the initial hash and `hashchange` events;
- update `aria-current`, active panel, previous/next availability, and document focus;
- leave all content linear/readable until JavaScript marks the flow initialized;
- skip progressive hiding in `tools` view;
- keep both technical `details` closed by default in assignment view and open them in tools view.

`renderGuidedAssignment(riskResult)` must update raw sum, cap explanation, trigger labels, conclusion text, and current result whenever factors or severity change.

- [ ] **Step 5: Implement truthful conclusion copy and print**

Use `copyTextOrFallback`; success is shown only after the write resolves. On absence/denial, reveal the complete conclusion in `#assignment-conclusion-fallback`. The print action calls the existing local print flow after exposing required evidence.

- [ ] **Step 6: Add guided responsive, focus, no-JS, and print CSS**

At assignment widths, only the initialized active panel is shown. At tools view or before initialization, panels remain readable. Stack progress, result values, and actions at `620px`; preserve ECFA containment; hide guided navigation from print while printing all required report content.

- [ ] **Step 7: Run automated verification**

Run: `npm test && npm run build`

Expected: all six suites and the static build pass.

- [ ] **Step 8: Commit**

```bash
git add src/index.html src/styles.css src/app.js scripts/feature-checks.mjs
git commit -m "feat: guide visitors through the kp-965 case"
```

### Task 4: Preserve tools mode and harden browser behavior

**Files:**
- Modify: `scripts/feature-checks.mjs`
- Modify: `scripts/audit-accessibility-pwa.mjs`
- Modify: `src/app.js`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 3 guided DOM/controller and existing `applyViewMode(search)`.
- Produces: stable assignment/tools presentation across hashes, keyboard navigation, mobile widths, print, and offline reload.

- [ ] **Step 1: Add failing cross-mode regression contracts**

Require that:

- assignment view hides the questionnaire and optional dashboards but shows guided entry/panels;
- tools view shows the questionnaire, language controls, research modules, and all assignment content without step hiding;
- footer links targeting tools-only sections use `?view=tools#…` in assignment mode;
- active-step panels have visible focus styling;
- reduced motion and print rules cover the new guided elements;
- service-worker activation deletes only older SeaRisk caches.

- [ ] **Step 2: Run focused audits and verify RED where contracts are missing**

Run: `node scripts/audit-accessibility-pwa.mjs && node scripts/feature-checks.mjs`

Expected: FAIL on any missing cross-mode, focus, print, or cache contract.

- [ ] **Step 3: Implement the smallest cross-mode fixes**

Keep guided state and view mode orthogonal: hashes choose assignment steps, while `?view=tools` chooses the full suite. Do not let a tools hash accidentally hide questionnaire controls or let optional dashboard errors block the guided module.

- [ ] **Step 4: Run browser verification against source**

At 360, 375, 768, and 1280 px verify:

- first load shows one clear entry action;
- all five steps work with Back/Next and browser history;
- raw score visibly changes when a factor is toggled even if `P` stays capped;
- baseline remains `5 × 3 = 15`;
- mitigations and their real triggers render;
- conclusion copy success and denied fallback are reachable;
- keyboard focus moves to the active heading;
- ECFA and exports remain reachable through disclosures;
- `?view=tools#assessment` preserves questionnaire and language controls;
- no horizontal page overflow or console errors.

- [ ] **Step 5: Run automated verification and commit**

Run: `npm test && npm run build`

Expected: all checks and build pass.

```bash
git add scripts/feature-checks.mjs scripts/audit-accessibility-pwa.mjs src/app.js src/styles.css
git commit -m "fix: preserve advanced tools in guided mode"
```

### Task 5: Release SeaRisk UA 1.0.0

**Files:**
- Modify: `package.json`
- Modify: `src/sw.js`
- Modify: `src/index.html`
- Modify: `README.md`
- Modify: `docs/product-spec.md`
- Modify: `docs/system-architecture.md`
- Modify: `BACKLOG.md`
- Modify: `scripts/check.mjs`

**Interfaces:**
- Consumes: verified guided and tools views from Tasks 1–4.
- Produces: aligned application release `1.0.0`, deployable `dist/`, and accurate public documentation.

- [ ] **Step 1: Add failing release consistency assertions**

Update `scripts/check.mjs` to require `1.0.0` across package metadata, service-worker cache, visible footer, and README status while separately asserting model `SR-UA-PROTOTYPE-0.1` and registry `0.1.0` remain unchanged.

- [ ] **Step 2: Run tests and verify version RED**

Run: `npm test`

Expected: FAIL while application markers remain `0.9.0`.

- [ ] **Step 3: Align release metadata and documentation**

Set package, visible footer, README status, and service-worker cache to `1.0.0`. Document the five-step root, advanced tools URL, raw-score cap explanation, deterministic conclusion, no-registration boundary, and unchanged provisional model.

- [ ] **Step 4: Run clean release verification**

Run: `npm test && npm run build && git diff --check && git status --short`

Expected: tests and build exit 0; no whitespace errors; only intended release files appear.

- [ ] **Step 5: Smoke-test `dist/` on a fresh origin**

Verify assignment entry, five-step navigation, baseline values, raw score, mitigations, conclusion, disclosures, tools view, console, and offline reload. Repeat at 360 and 1280 px.

- [ ] **Step 6: Commit**

```bash
git add package.json src/sw.js src/index.html README.md docs/product-spec.md docs/system-architecture.md BACKLOG.md scripts/check.mjs
git commit -m "release: prepare SeaRisk UA 1.0.0"
```

- [ ] **Step 7: Stop before publication**

Present test/build/browser evidence and request explicit approval before push, merge, GitHub Pages deployment, or sharing the updated public link.
