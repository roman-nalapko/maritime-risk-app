# Assignment-Focused SeaRisk Redesign

## Intent

Turn the existing SeaRisk UA prototype into a clear, credible submission for the course assignment “Development of an automated risk-assessment algorithm and preventive safety measures for navigation in inland waterways and basins.”

The project already contains substantial domain work. The redesign must expose that work instead of replacing it: the KP-965 investigation, GISIS coding, port-basin risk calculation, ECFA diagram, generated mitigations, and reproducible exports become the primary product story. The broader worker-risk toolkit remains available as secondary research material.

## Primary audience and success moment

The primary audience is the course instructor opening a shared link without prior explanation.

Within two minutes, the instructor should be able to answer:

1. Which casualty was analysed?
2. Which official methods and classifiers were used?
3. How is `R = P × S` calculated?
4. Which factors make the KP-965 case critical?
5. Which preventive measures are generated from those factors?
6. Where can the structured GISIS record and reproducible script be obtained?

## Goals

- Make the course assignment, not the generic worker questionnaire, the root-page narrative.
- Preserve the completed KP-965, GISIS, ECFA, calculation, mitigation, and export functionality.
- Present one linear flow: case → factors → calculation → generated measures → ECFA → evidence/export.
- Keep the interface in Ukrainian and retain accurate official terminology.
- Keep the static, browser-only, zero-data architecture and zero runtime dependencies.
- Fix the current browser runtime failure and make the assignment module usable on first load.
- Preserve the broader calculator and MAIB material under a clearly secondary “Additional research tools” entry point.
- Keep disclaimers visible without allowing them to dominate the main task.

## Non-goals

- Rebuilding the application with a framework.
- Replacing the current deterministic calculation model.
- Adding accounts, a backend, analytics, or remote AI calls.
- Claiming that the result is a certified navigational or safety decision.
- Deleting the existing worker-risk, fatigue, weather, MAIB, or research modules.
- Publishing or sending the project without separate user approval.

## Anti-goals

- A homepage that looks like a generic maritime startup.
- Showing every capability above the fold.
- Decorative HUD controls, bridge-lighting modes, badges, or terminology that distract from the assignment.
- A long explanation before the user can see the case and calculated result.
- A failure in an optional module preventing the KP-965 assignment module from initializing.

## Product structure

### 1. Compact header

The default header contains:

- SeaRisk UA identity;
- links to “Завдання”, “Розрахунок”, “ECFA”, and “Джерела”;
- one secondary link to “Додаткові інструменти”.

Bridge-lighting, HUD, and language controls are removed from the primary header. Existing capabilities may remain inside the secondary tools area if retaining them costs less than removing them safely.

### 2. Assignment hero

The hero names the actual outcome:

> Автоматизована оцінка ризику судноплавства у внутрішніх водних шляхах і басейнах

It identifies KP-965 as the worked case and states the four-step method: GISIS coding, ECFA, `R = P × S`, preventive measures. The primary action jumps directly to the calculation; the secondary action opens the official-method sources.

### 3. Worked case and algorithm

The existing GISIS/ECFA section moves directly after the hero and becomes the main content. Its internal order is simplified to:

1. concise KP-965 case facts;
2. selectable contributing factors and severity;
3. calculated P, S, R, and acceptance category;
4. generated alert and preventive measures;
5. ECFA diagram and selected-node explanation;
6. official conclusions and exports.

All values must remain traceable to the existing data object and deterministic functions. The UI must not introduce an alternative formula.

### 4. Sources and limitations

A compact section lists the official basis:

- GISIS / Marine Casualties and Incidents;
- MSC-MEPC.3/Circ.4/Rev.1;
- IMO Resolution A.1075(28);
- the KP-965 final safety report.

It states that the tool is an educational implementation and does not replace navigation, SMS, or an official investigation.

### 5. Additional research tools

The existing individual questionnaire, fatigue/weather tooling, MAIB cases, aggregate statistics, and broader methodology are retained below the assignment or behind a clear disclosure labelled “Додаткові дослідницькі інструменти”. They are not shown as prerequisites for understanding the assignment.

## Visual direction

- Retain the existing dark maritime palette and typography because they already look coherent.
- Reduce the number of simultaneous controls, badges, gradients, and navigation items.
- Use a single accent colour for primary actions; reserve amber/red for risk state.
- Prefer white space, short headings, and one main idea per card.
- Avoid emoji as structural icons.
- Preserve visible keyboard focus, semantic headings, accessible labels, and responsive behaviour.
- Validate the default view at 360 px, 375 px, 768 px, and 1280 px.

## Runtime and failure handling

- Replace the undefined `formatEngineeringValue` call with an existing or explicitly defined formatter.
- Initialize the KP-965/GISIS module independently of optional generic-dashboard modules, so a later optional-module failure cannot leave the assignment blank.
- Keep calculation and mitigation functions pure in `src/model.js`.
- Display a concise in-page fallback if the ECFA renderer cannot initialize; do not silently leave an empty black canvas.
- Keep export actions local and deterministic.

## Verification

Required automated checks:

- `npm test`;
- `npm run build`;
- regression coverage for the formatter/runtime failure;
- existing KP-965 record, `R = P × S`, mitigation, and DOM-contract checks.

Required browser checks:

- no console errors on initial load;
- KP-965 factors and `R = 15` render on the default worked case;
- generated preventive measures are visible;
- ECFA nodes render and can be selected with pointer and keyboard;
- the JSON export and Python-copy controls remain reachable;
- the primary assignment flow is understandable without opening additional tools;
- responsive review at 375 px and desktop width.

Repository process also requires a Ready GitHub issue before implementation. If no suitable existing issue covers this redesign, issue creation or an explicit process decision must be resolved before product-code changes begin.

## Delivery boundary

Implementation may prepare a deployable `dist/` build and deployment instructions. Publishing, pushing, or sharing an external link requires explicit user approval at the final delivery step.

