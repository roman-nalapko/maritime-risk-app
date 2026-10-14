# Architecture decisions

## ADR-001: Static browser-first MVP

**Decision:** Use a buildless static PWA with no backend or runtime dependencies.

**Why:** It is fast to review and deploy, keeps questionnaire data local, and avoids infrastructure before the hypothesis and methodology are approved.

## ADR-002: Deterministic calculation core

**Decision:** Numeric results come from versioned coefficients and pure functions, never from AI.

**Why:** Risk values must be reproducible, inspectable, and testable.

## ADR-003: Separate methodology and statistics

**Decision:** The methodology estimate and incident explorer are distinct product surfaces.

**Why:** Event shares without exposure denominators cannot be presented as individual probabilities.

## ADR-004: Provider-neutral deployment

**Decision:** Produce a `dist/` directory usable by any static host; do not couple the repository to one provider during the hypothesis phase.

**Why:** The source repository remains private while Cloudflare Pages, Vercel, or another host can be selected later.

## ADR-005: Separate occupational outcomes and retire probability language for prototype 0.1

**Decision:** Treat `SR-UA-PROTOTYPE-0.1` as an educational demonstration index. Model v1.0 will target annual fatal occupational injury as its primary outcome and will keep non-fatal injury, serious injury, incident share, and conditional severity as separate outputs. General mortality and lifestyle mortality will not be added to the occupational model.

**Why:** The prototype combines values with different outcomes, units, populations, and evidence bases. Bounding their sum does not create a valid personal probability. IMO and ILO definitions also distinguish occurrence severity, individual injury cases, and exposure-based rates.

**Consequence:** UI copy must not express the prototype value as “one case in N” or as a probability of injury/death. Port workers and other non-seafarer populations require separate models or compatible coefficient sets.

**Evidence:** See `docs/methodology/outcome-definitions.md`.

## ADR-006: Quarantine the supplied educational coefficients

**Decision:** Retain the supplied teaching tables only as research evidence and an arithmetic test case. Mark the source and every extracted component `eligibleForModel: false`.

**Why:** The material lacks primary provenance and contains exponent, boundary, reference, and percentage contradictions. Its worked example also adds incompatible outcomes and denominators.

**Consequence:** Runtime code must not import `data/research/educational-source-audit.json`. New coefficients require traceable source metadata and review before use.

**Evidence:** See `docs/methodology/educational-source-audit.md`.

## ADR-007: Separate role, vessel, operation, event, and exposure axes

**Decision:** Use versioned controlled vocabularies for role, vessel, operation, and exposure. Keep casualty event type as a separate axis and retain explicit `unknown`/`other` values.

**Why:** IMO reporting records rank, ship operation, casualty event, and consequences separately. Collapsing them would create false mappings and incompatible denominators.

**Consequence:** Imports preserve raw values and mapping versions. The model may aggregate known categories but may not infer one axis from another or split an unspecified category.

**Evidence:** See `docs/methodology/maritime-taxonomy.md`.

## ADR-008: Gate operational calculations on coefficient approval

**Decision:** Store every executable value in a versioned registry with complete provenance metadata. Operational access requires both `status: approved` and `eligibleForApprovedModel: true`.

**Why:** A numeric value without a unit, covered population, period, source, and review status cannot be interpreted or safely reused.

**Consequence:** The demonstration engine can read quarantined values through an explicit prototype path, but the approved-calculation accessor rejects them. Registry and model versions are displayed with each result.

## ADR-009: No personal rate from unmatched public denominators

**Decision:** Do not divide MAIB affected-person counts by DfT seafarer estimates or other convenient public totals. Permit descriptive statistics now and only conditional vessel/arrival rate research after exact scope matching.

**Why:** MAIB's jurisdiction combines UK vessels worldwide with vessels in UK territorial waters, while candidate denominators use different nationality, registration, employer, vessel, and time-at-risk definitions.

**Consequence:** Personal percentages remain disabled. Future rates require the compatibility gate, exact Poisson intervals, and sparse-sample publication rules.

**Evidence:** See `docs/methodology/exposure-and-uncertainty.md`.

## ADR-010: Preserve MAIB grain and unresolved source meaning

**Decision:** Normalize MAIB occurrences, vessels, and affected persons as separate linked tables. Preserve raw category values, publish mapping coverage, and leave ambiguous roles/operations as `unknown`.

**Why:** The three source tables have different grains. Flattening them before counting duplicates occurrence/vessel totals, while guessing operations from events or voyage segments invents meaning absent from the source.

**Consequence:** Imports validate keys before joins, calculate coverage at source-table grain, and require domain review for `Skipper` and narrative-derived operations.

**Evidence:** See `docs/methodology/maib-field-mapping.md`.

## ADR-011: Offline, deterministic MAIB import

**Decision:** Import locally downloaded MAIB CSV files with a dependency-free offline command. Produce separate occurrence, vessel, and affected-person artifacts plus a manifest and validation report.

**Why:** Separating download from transformation makes source snapshots auditable, keeps CI independent of a changing external service, and prevents one-to-many joins from corrupting counts.

**Consequence:** The caller supplies an explicit retrieval date. Artifacts are sorted by source key, checksummed, schema-validated, and reproducible from the same inputs and mapping version.

## ADR-012: Separate import approval from public release approval

**Decision:** Treat successful import as necessary but insufficient for publication. A build-time release manifest gates licensing, attribution, privacy, aggregation, and quality.

**Why:** Technically valid public-source records can still be unlicensed for the intended reuse, identifying when linked, or misleading at sparse sample sizes.

**Consequence:** Real external record-level data cannot enter `dist/`. MAIB-derived aggregates remain blocked until dataset-specific licensing and attribution are confirmed.

**Evidence:** See `docs/data-release-policy.md`.

## ADR-013: Put model limitations next to every individual result

**Decision:** Display the model status and version, unquantified uncertainty, coefficient source/status details, and plain-language assumptions inside the result card. Round the prototype index to three significant figures and mark it as approximate.

**Why:** A methodology page alone is too easy to miss. The user needs the evidence quality and limitations at the point where a number could otherwise appear authoritative.

**Consequence:** Every calculation result carries the same provisional warning and evidence metadata. Missing confidence intervals are stated explicitly instead of represented by invented precision.

## ADR-014: Keep the pilot self-directed and prohibit individual decisions

**Decision:** The research pilot processes questionnaire values only in browser memory and prohibits employment, work-allocation, disciplinary, medical, insurance, navigational, and fitness-for-duty use. Any remote collection, identifiable health processing, organizational result access, or AI-based worker profiling requires a new legal and governance review before implementation.

**Why:** The questionnaire includes health and lifestyle markers, and an apparently precise result could be coercively reused even when the software stores nothing. Technical privacy alone does not prevent institutional misuse.

**Consequence:** The boundary is visible before and after calculation, pilot materials must name monitored incident contacts, and CI checks prevent silent addition of browser storage or remote questionnaire transmission.

**Evidence:** See `docs/governance/privacy-and-misuse-review.md` and `docs/governance/incident-response.md`.

## ADR-015: Do not add runtime AI before a measured evaluation gate

**Decision:** Keep the public application and numeric calculator AI-free. Optional classification, retrieval, or grounded explanation may be reconsidered only after a frozen human-reviewed evaluation set shows a material gain over deterministic rules and passes zero-tolerance unsupported-claim/citation gates.

**Why:** The active static product has no need for model hosting, remote data transfer, or a large first-use download. Browser inference is technically feasible but varies by model size, device, and WebGPU support; hosted inference adds keys, data flow, retention, and variable usage cost.

**Consequence:** AI experiments stay outside the runtime and public bundle. They cannot receive questionnaire values or change coefficients/results, must be optional and removable, and must record accuracy, abstention, hallucination, latency, size, and cost rather than relying on demonstrations.

**Evidence:** See `docs/research/optional-ai-evaluation-plan.md`.

## ADR-016: Publish MAIB only as suppressed affected-person aggregates

**Decision:** Use the linked MAIB occurrence, vessel, and affected-person downloads to publish 2020–2025 counts at affected-person-record grain. Group source roles into broad public categories, combine fatal and presumed-fatal outcomes, and omit every role × vessel × event × outcome × year cell below five records.

**Why:** Person-level publication is unnecessary for the product and increases linkage risk. The linked tables provide incident numerators but no compatible exposure denominator, so they support descriptive shares rather than personal rates.

**Consequence:** The interface names the unit, suppression, source, period, sample size, filters, and limitation. Displayed totals exclude suppressed records and can be lower than the full source count. Raw IDs, exact ages, gender, nationality, location, narratives, and injury details do not enter the public bundle.

## ADR-017: Keep official sources source-specific

**Decision:** Do not concatenate MAIB records, EMSA/EMCIP reports, IMO GISIS material, and Ukrainian administration reports into one apparent incident population. MAIB powers the first structured explorer; EMSA supports European context and taxonomy review; IMO GISIS remains an access-controlled reference; Ukrainian reports require a separate verified extraction.

**Why:** These sources differ in access, coverage, reporting grain, classification, publication format, and duplication risk. A combined count would imply comparability that has not been established.

**Consequence:** Every future source gets its own provenance, schema mapping, unit, period, release review, and product view before any cross-source comparison is permitted.

## ADR-018: Remove dist/ from git tracking; build in CI or locally

**Decision:** `dist/` is listed in `.gitignore` and must not be committed. Run `npm run build` locally or in CI to regenerate it before deployment.

**Why:** AGENTS.md explicitly prohibits committing generated build artifacts. `dist/` was historically committed before `.gitignore` was created. Running `git rm -r --cached dist/` removes the tracking without deleting the local directory.

**Consequence:** Any static-host deployment (Cloudflare Pages, Vercel, Netlify) must run `npm run build` as its build command and publish the `dist/` output directory. The source of truth is always `src/`.

## ADR-019: Demographic multiplier applies to health and lifestyle, not occupation

**Decision:** The `demographicMultiplier` (sex × residence) scales `health` and `lifestyle` but not `occupation`.

**Why:** The multiplier comes from a general-population educational source that associates sex and residence with overall health risk. The `hourlyRoleRate` already encodes profession-specific exposure and is sourced from occupation-specific proxies. Applying a general-population demographic scale on top of occupation-specific rates would double-count population differences that the role rate already captures.

**Consequence:** This design choice is explicitly stated in the model assumptions returned with every result. When model v1.0 is built from compatible primary sources, the interaction between demographic and occupational factors must be revisited with domain review.

## ADR-020: Grounding educational recommendations in MLC 2006 and STCW standards

**Decision:** Evaluate input work hours and night shift exposure against international maritime conventions (MLC 2006 Standard A2.3, Guideline B2.3, STCW Section A-VIII/1, and IMO MSC/Circ.1598) and surface non-binding educational alerts.

**Why:** Abstract mathematical indices do not guide seafaring workers on regulatory rest thresholds. Anchoring fatigue and overtime warnings to ratified maritime conventions (minimum 10 hours daily rest, 77 hours weekly rest) provides immediate professional utility without claiming certified navigational authority.

**Consequence:** The evaluation remains deterministic, runs purely in-browser via `evaluateMlcCompliance()`, and provides clear convention citations without altering the numeric prototype index.

## ADR-021: Interactive What-If simulation and offline profile portability

**Decision:** Implement client-side What-If scenario delta calculations, dynamic SVG factor radar visualization, role-specific safety checklists, and offline JSON profile export/import.

**Why:** Educators and seafarers need to see the controllable impact of protective factors (e.g. 25% reduction with full PPE, fatigue abatement by halving night shifts) and share anonymized training profiles without any server-side database.

**Consequence:** All operations are in-memory (`Blob`, `FileReader`, pure functions). No remote API, local storage, cookies, or telemetry are used. Tested with automated platform checks in `scripts/feature-checks.mjs`.

## ADR-022: Complete UI/UX declutter redesign and Ukrainian maritime safety regulation integration

**Decision:** Perform a full UI/UX redesign of the application to remove visual clutter, excessive card borders, and emoji noise while maintaining high readability, mobile-first responsiveness, and WCAG AA contrast. Integrate citations from Ukrainian maritime safety regulations (Правила контролю суден z0353-04) covering vessel risk profiles, GMDSS, GISIS, and CleanSeaNet.

**Why:** User feedback revealed that the previous interface was overly dense and visually overloaded with redundant labels and competing visual elements. The redesign establishes a clean, disciplined information hierarchy, streamlines form and results presentation, and enriches the maritime glossary with national safety definitions.

**Consequence:** CSS footprint was reduced by ~1300 lines of clutter while preserving all 114 interactive element IDs and WCAG AA contrast standards. All 6 automated test suites and build steps pass with exit code 0.

