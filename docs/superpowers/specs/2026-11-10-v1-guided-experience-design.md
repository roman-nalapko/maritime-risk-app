# SeaRisk UA 1.0 — Guided Casualty Review Design

## Intent

Version `1.0.0` must make sense to a first-time visitor who does not know KP-965, GISIS, ECFA, or maritime risk terminology. The product should teach one coherent story before exposing its research toolkit:

`what happened → why it happened → how risk is scored → how to prevent recurrence → what evidence supports the conclusion`

The release is successful when a visitor can reach and explain the final conclusion without external instruction.

## Primary user and moment

The primary user is a cadet, instructor, or ordinary visitor opening the shared link for the first time. They have roughly one minute to understand what the project does and several minutes to interact with it. They should never need to guess what to click next.

## Goals

- Make the root URL a self-guided five-step review of the KP-965 casualty.
- Explain every unfamiliar term in plain Ukrainian before showing abbreviations.
- Preserve the complete existing application and all tested functionality.
- Keep the calculation transparent and explicitly educational.
- Finish with a concise conclusion that can be copied or printed for coursework.
- Keep the site account-free, browser-only, responsive, keyboard-accessible, and offline-capable.

## Non-goals

- Do not create a new risk model or claim statistical validation.
- Do not add a backend, authentication, analytics, runtime dependency, or framework.
- Do not remove or broadly refactor the extended research tools.
- Do not turn the guided flow into a quiz, game, certification, or navigational decision aid.
- Do not require GISIS access, Google Drive access, or any registration.

## Experience structure

### Entry screen

The first viewport contains:

- label: `Практична робота · аварія KP-965`;
- title: `Чому сталася аварія і як її запобігти`;
- one-sentence explanation of the product;
- one primary action: `Почати розбір`;
- one quiet secondary link: `Розширені інструменти`.

The page must not show the full calculation, ECFA graph, export controls, or technical badges before the visitor starts.

### Guided progress

A compact progress indicator shows five named steps. It communicates position rather than acting as an unexplained navigation menu. Completed steps remain reachable. `Назад` and `Далі` buttons are always placed consistently.

#### Step 1 — What happened

Show a short incident card with only the facts needed for the story:

- pilot boat KP-965;
- Port of Koper, Basin I;
- night transit at approximately 22 knots;
- contact with buoy 2/I;
- consequence severity used by the worked example.

End with: `Тепер подивимось, які фактори зробили аварію можливою.`

#### Step 2 — Why it happened

Show exactly five existing factor controls:

1. excessive speed;
2. no second lookout;
3. fatigue during the circadian low;
4. ineffective radar use;
5. training and procedural deficiencies.

Each control gets one plain-language sentence and its visible training weight. A short note explains that these are causal indicators from the worked case, not personal data. The baseline starts with all five enabled.

The step also shows a live factor sum before the `P` ceiling, for example `1 + 2 + 2 + 1 + 1.5 + 1 = 8.5`, followed by `P обмежено до 5`. Removing one factor therefore always produces visible feedback even when the bounded `P` value remains `5`. The visitor is told that several protections may need to improve before the scenario leaves the maximum band.

#### Step 3 — How the score works

Show the result as three large connected values:

`P = 5` → `S = 3` → `R = 15`

Explain beneath them:

- `P` is a bounded educational factor score, not a measured probability;
- `S` is the selected consequence severity;
- `R = P × S` is the scenario's training risk index;
- the current category and threshold.

Changing a factor or severity updates the values, category, and explanation immediately. The user should understand why the baseline is critical without reading methodology documentation.

#### Step 4 — How to prevent recurrence

Render the existing rule-generated mitigations in priority order. Each item answers three questions: what to do, what triggered it, and which rule or recommendation supports it. The trigger is either an active factor or an explicit threshold/default rule such as `R ≥ 10`, `R ≥ 6`, or `базовий чек-лист`; the UI must never invent a factor attribution. The critical baseline should lead with speed restriction and dual lookout.

End with a plain transition: `Заходи випливають із причин, а не генеруються випадково.`

#### Step 5 — Evidence and conclusion

Show a short causal chain in prose before technical evidence:

`high speed + weak lookout + fatigue + ineffective radar + procedural gaps → late hazard detection → contact with buoy`

Then show:

- a generated coursework conclusion;
- `Копіювати висновок`;
- `Друк / PDF`;
- collapsed `Повна діаграма ECFA` containing the existing interactive graph;
- collapsed `Джерела та експорт` containing public sources, JSON, Python, and clipboard fallback.

The visitor can complete the main journey without opening either collapsed technical block.

## Advanced tools

The full existing research suite stays at `?view=tools`. The guided root links to it from the entry screen and after the final step with the label `Відкрити розширені інструменти`.

The tools mode retains:

- original questionnaire and demonstration profiles;
- MAIB aggregate statistics;
- research and academic exports;
- all current calculation modules;
- Ukrainian, English, and Russian UI controls;
- the KP-965 assignment module.

No feature is deleted for `1.0.0`; complexity is moved behind explicit intent.

## Interaction and state

- Guided state is ephemeral and stays in memory; no local storage or cookies.
- The active step is represented in the URL hash (`#step-1` through `#step-5`) so refresh/back navigation remains understandable.
- Unknown or absent hashes open the entry state, not a random intermediate panel.
- Next/back controls update the hash and focus the new step heading.
- Browser back/forward restores the matching step.
- If JavaScript fails, the assignment content remains readable as a linear document.
- Existing factor and severity inputs remain the single source of truth for the calculation.

## Accessibility and responsive behavior

- Progress uses an ordered list with an accessible current-step marker.
- Step panels have headings and are focus-managed after navigation.
- Buttons have explicit labels; no icon-only required actions.
- Hidden technical details use native `details/summary` controls.
- At 360/375 px, values and actions stack vertically without page overflow.
- ECFA may scroll horizontally only inside its labelled diagram container.
- Reduced-motion preference disables guided transitions.
- Print mode outputs the case, active factors, P/S/R, mitigations, conclusion, sources, model boundary, and application version; navigation controls are omitted.

## Calculation and copy boundaries

- The existing port-basin model remains unchanged for this release.
- The model result may expose the pre-cap factor sum as additional explanatory metadata, but weights, cap, thresholds, and final scores do not change.
- The UI consistently calls `P` an educational factor score.
- The baseline remains five enabled factors, `S = 3`, and `R = 15`.
- Generated conclusion text is deterministic and derived from active factor labels, P/S/R, category, and mitigations.
- Python export continues to reproduce the fixed baseline and says so in every language.
- JSON export remains the digitized incident record.

## Architecture approach

Keep the current static HTML/CSS/JavaScript architecture. Add a small guided-flow module with pure helpers for:

- resolving a hash to a valid guided step;
- generating the plain-language conclusion model;
- mapping active factors to explanation text;
- moving focus after a step change.

The module coordinates existing DOM and model functions rather than duplicating calculation logic. Existing element IDs needed by tests and tools mode remain stable. The service-worker cache identity changes with release `1.0.0`, and the complete root/tools shell remains precached.

## Release and documentation

Release markers become `1.0.0` in package metadata, visible footer, README status, and service-worker cache. Model ID `SR-UA-PROTOTYPE-0.1`, coefficient registry `0.1.0`, and dataset versions stay independent.

README and product documentation explain the default guided journey and the advanced tools URL. The public site is updated only after tests, responsive browser checks, offline reload, fresh `dist/` smoke testing, independent review, and explicit publication approval.

## Acceptance criteria

- A first-time visitor sees one primary action and can complete all five steps without instruction.
- The baseline visibly explains `P = 5`, `S = 3`, `R = 15` and the critical classification.
- Five factor controls remain interactive and immediately affect the scenario result.
- Every factor change immediately updates the visible pre-cap sum; `P` may remain `5` while the sum is above the cap, and the UI explains why.
- Mitigations remain tied to active factors and supporting rules.
- Threshold- and default-triggered mitigations are labelled with the real rule trigger rather than a fabricated active factor.
- The final step offers a deterministic conclusion, copy action, and print/PDF action.
- ECFA, sources, JSON, and Python remain available through progressive disclosure.
- `?view=tools` preserves the current extended suite and translations.
- No registration-gated or Google Drive link appears in the guided journey.
- Automated tests and build pass.
- Browser verification passes at 360, 375, 768, and 1280 px with no console errors.
- Offline reload serves the `1.0.0` shell.

## Builder decisions

These are implementation calls, not user-provided requirements:

- Use URL hashes for guided navigation instead of persistent storage.
- Use native `details/summary` for technical disclosure.
- Keep the numerical model unchanged for `1.0.0`; the release improves comprehension and workflow, not scientific validation.
- Preserve all advanced functionality at `?view=tools` rather than showing it during the main journey.
- Expose and explain the raw factor sum so capped scenarios still provide immediate feedback.
- Attribute a mitigation to an active factor only when the rule actually uses that factor; otherwise show the threshold or default trigger.
