import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calculateRisk, categoryFor } from "../src/model.js";
import { approvedValue, COEFFICIENTS, REGISTRY_ID, REQUIRED_METADATA, validateRegistry } from "../src/coefficients.js";
import { copyText, formatEngineeringIndex, initializeModule, resolveViewMode } from "../src/ui-runtime.js";
import { normalizeTables, parseDelimited, stableJson, validateNormalized } from "./import-maib.mjs";
import { aggregateMaib } from "./aggregate-maib.mjs";
import { runReleaseChecks, validateReleaseDataset } from "./release-checks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = ["src/index.html", "src/styles.css", "src/app.js", "src/model.js", "src/coefficients.js", "src/ui-runtime.js", "src/manifest.webmanifest", "src/data/incidents.maib.aggregate.json", "AGENTS.md"];
await Promise.all(required.map((file) => access(path.join(root, file))));

assert.equal(formatEngineeringIndex(0, "uk-UA"), "0", "zero engineering index must stay legible");
assert.equal(formatEngineeringIndex(0.00232, "uk-UA"), "2,32 × 10⁻³", "engineering index must use the selected locale and exponent glyphs");

const initializationEvents = [];
const fallbackTarget = {
  textContent: "",
  attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; }
};
const silentLogger = { error(message) { initializationEvents.push(message); } };
assert.equal(initializeModule("assignment", () => initializationEvents.push("assignment-ready"), null, silentLogger), true);
assert.equal(initializeModule("optional-dashboard", () => { throw new Error("dashboard failed"); }, fallbackTarget, silentLogger), false);
assert.deepEqual(initializationEvents, ["assignment-ready", "optional-dashboard initialization failed"]);
assert.equal(fallbackTarget.attributes.role, "alert", "failed module fallback must be announced");
assert.equal(fallbackTarget.textContent, "Цей розділ тимчасово недоступний. Оновіть сторінку або спробуйте пізніше.");

assert.equal(resolveViewMode(""), "assignment", "the root URL must default to the assignment");
assert.equal(resolveViewMode("?view=tools"), "tools", "the explicit tools URL must expose the research suite");
assert.equal(resolveViewMode("?source=teacher&view=tools"), "tools", "view mode must tolerate unrelated query parameters");
assert.equal(resolveViewMode("?view=unknown"), "assignment", "unknown view values must fail closed to the assignment");

const copiedValues = [];
assert.equal(await copyText({ async writeText(value) { copiedValues.push(value); } }, "baseline-script"), true);
assert.deepEqual(copiedValues, ["baseline-script"], "clipboard helper must write the complete requested value once");
await assert.rejects(() => copyText(null, "baseline-script"), /Clipboard API is unavailable/);
await assert.rejects(() => copyText({ async writeText() { throw new Error("denied"); } }, "baseline-script"), /denied/);

const baseline = calculateRisk({ age: 35, sex: "male", residence: "city", role: "officer", hours: 2024, night: 25, ppe: true });
assert.ok(baseline.total > 0 && baseline.total < 1, "prototype index must remain bounded");
assert.equal(baseline.modelId, "SR-UA-PROTOTYPE-0.1");
assert.equal(baseline.registryId, REGISTRY_ID);
assert.equal(baseline.modelStatus, "provisional");
assert.equal(baseline.uncertainty.status, "not_quantified");
assert.ok(baseline.assumptions.length >= 4, "prototype assumptions must be returned with every result");
assert.ok(Object.values(baseline.componentEvidence).flat().every((item) => item.source && item.status && item.unit && item.population && item.period), "component evidence must expose source and status metadata");

assert.equal(validateRegistry(), true);
for (const item of Object.values(COEFFICIENTS)) {
  assert.ok(REQUIRED_METADATA.every((field) => field in item), `${item.id} must have complete provenance`);
  assert.notEqual(item.status, "approved", "prototype coefficients must not be approved");
  assert.equal(item.eligibleForApprovedModel, false, "prototype coefficients must stay outside approved calculations");
}
assert.throws(() => approvedValue("ageBaseline"), /not approved/, "disputed coefficients must be rejected by approved calculations");
assert.throws(() => validateRegistry({ broken: { id: "broken", value: 1 } }), /missing coefficient metadata/);

const highExposure = calculateRisk({ age: 35, sex: "male", residence: "city", role: "diver", hours: 4000, night: 80, ppe: false, smoking: true });
assert.ok(highExposure.total > baseline.total, "additional exposure must increase estimate");
assert.equal(categoryFor(0.02).key, "extreme");
assert.equal(categoryFor(0.0005).key, "medium");

const calculationFixtures = JSON.parse(await readFile(path.join(root, "data/fixtures/calculation-profiles.v0.1.json"), "utf8"));
assert.equal(calculationFixtures.modelVersion, baseline.modelId, "fixture model version must match the executable model");
assert.equal(calculationFixtures.registryVersion, REGISTRY_ID, "fixture registry version must match the executable registry");
assert.ok(calculationFixtures.cases.length >= 10, "at least ten representative calculation fixtures are required");
assert.ok(calculationFixtures.review.engineeringReviewer && calculationFixtures.review.reviewedOn, "fixture reviewer and date are required");
assert.equal(calculationFixtures.review.domainSafetyApproval, false, "regression fixtures must not imply domain approval");
assert.ok(calculationFixtures.cases.some((item) => item.kind === "boundary"), "boundary fixtures are required");
assert.ok(calculationFixtures.cases.some((item) => item.kind === "invalid_input"), "invalid-input fixtures are required");
assert.equal(new Set(calculationFixtures.cases.map((item) => item.id)).size, calculationFixtures.cases.length, "fixture ids must be unique");
assert.deepEqual([...new Set(calculationFixtures.cases.filter((item) => item.kind !== "invalid_input").map((item) => item.input.role).filter(Boolean))].sort(), ["cadet", "deck", "diver", "engine", "officer", "port"], "representative fixtures must cover every prototype role");
for (const fixture of calculationFixtures.cases) {
  const result = calculateRisk(fixture.input);
  for (const component of ["health", "occupation", "lifestyle"]) {
    assert.ok(Math.abs(result.components[component] - fixture.expected.components[component]) <= calculationFixtures.tolerance, `${fixture.id} ${component} changed`);
  }
  assert.ok(Math.abs(result.total - fixture.expected.total) <= calculationFixtures.tolerance, `${fixture.id} total changed`);
  assert.equal(result.category.key, fixture.expected.category, `${fixture.id} category changed`);
}

const incidents = JSON.parse(await readFile(path.join(root, "src/data/incidents.maib.aggregate.json"), "utf8"));
assert.equal(incidents.unit, "affected_person_record", "public MAIB data must name its analysis unit");
assert.equal(incidents.suppression.minimumCellCount, 5, "public MAIB data must suppress small cells");
assert.ok(incidents.cells.length >= 100, "official aggregates should support meaningful UI filtering");
assert.ok(incidents.cells.every((item) => item.count >= 5), "no sparse MAIB cell may enter the public bundle");
assert.equal(incidents.cells.reduce((sum, item) => sum + item.count, 0), incidents.totals.publishedRecords, "published MAIB total must reconcile");

const educationalAudit = JSON.parse(await readFile(path.join(root, "data/research/educational-source-audit.json"), "utf8"));
assert.equal(educationalAudit.eligibleForModel, false, "unverified educational data must stay quarantined");
assert.ok(educationalAudit.workedExample.components.every((item) => item.eligibleForModel === false), "audited example values must not become model coefficients");
assert.ok(educationalAudit.findings.length >= 12, "all identified source defects must remain recorded");
assert.ok(Math.abs(educationalAudit.workedExample.recalculatedTotal - 0.0429144) < Number.EPSILON, "worked example total must remain reproducible");

const denominatorReview = JSON.parse(await readFile(path.join(root, "data/research/denominator-inventory.v1.json"), "utf8"));
assert.equal(denominatorReview.personalRateDecision, "no_go", "personal rates require compatible public denominators");
assert.ok(denominatorReview.sources.length >= 4, "denominator inventory must cover the main candidate source types");
assert.ok(denominatorReview.sources.every((source) => source.compatibleWithPersonalRate === false), "no reviewed source may silently enable a personal rate");
assert.equal(denominatorReview.uncertainty.rateInterval, "exact_poisson_garwood_95");
assert.equal(denominatorReview.uncertainty.shareInterval, "wilson_score_95");
assert.equal(denominatorReview.suppression.eventsUnder5, "suppress_public_point_rate");

const officialSources = JSON.parse(await readFile(path.join(root, "data/research/official-source-inventory.v1.json"), "utf8"));
assert.equal(officialSources.version, "1.0.0");
assert.ok(officialSources.sources.some((source) => source.id.startsWith("maib-") && source.localStatus.includes("published")), "source inventory must record the published MAIB aggregate");
assert.ok(officialSources.sources.some((source) => source.id.startsWith("emsa-") && source.localStatus.includes("downloaded")), "source inventory must record the downloaded EMSA report");
assert.ok(officialSources.sources.some((source) => source.id.startsWith("ukraine-") && source.localStatus.includes("downloaded")), "source inventory must record downloaded Ukrainian reports");
assert.ok(officialSources.sources.some((source) => source.id.startsWith("imo-") && source.access.includes("authenticated")), "source inventory must retain GISIS access restrictions");

const taxonomy = JSON.parse(await readFile(path.join(root, "data/taxonomy/maritime-taxonomy.v1.json"), "utf8"));
assert.equal(taxonomy.version, "1.0.0");
for (const [axis, values] of Object.entries(taxonomy.axes)) {
  assert.equal(new Set(values).size, values.length, `${axis} taxonomy values must be unique`);
}
assert.ok(taxonomy.axes.roles.includes("unknown"), "roles require an explicit unknown value");
assert.ok(taxonomy.axes.vessels.includes("unknown"), "vessels require an explicit unknown value");
assert.ok(taxonomy.axes.operations.includes("unknown"), "operations require an explicit unknown value");
assert.equal(taxonomy.mappingRules.allowInferenceAcrossAxes, false, "taxonomy axes must not be inferred from one another");
assert.deepEqual(Object.keys(taxonomy.prototypeMappings.roles).sort(), ["cadet", "deck", "diver", "engine", "officer", "port"]);
assert.deepEqual(Object.keys(taxonomy.prototypeMappings.vessels).sort(), ["cargo", "fishing", "passenger", "service", "tanker"]);
assert.ok(Object.values(taxonomy.prototypeMappings.roles).every((value) => taxonomy.axes.roles.includes(value)), "prototype role mappings must target known categories");
assert.ok(Object.values(taxonomy.prototypeMappings.vessels).every((value) => taxonomy.axes.vessels.includes(value)), "prototype vessel mappings must target known categories");
assert.ok(Object.values(taxonomy.prototypeMappings.eventsToOperations).every((value) => taxonomy.axes.operations.includes(value)), "event crosswalk must target known operation categories");

const maibMapping = JSON.parse(await readFile(path.join(root, "data/mappings/maib-to-maritime-taxonomy.v1.json"), "utf8"));
assert.equal(maibMapping.taxonomyVersion, taxonomy.version, "MAIB mapping must target the current taxonomy version");
assert.ok(Object.values(maibMapping.vesselType.values).every((value) => taxonomy.axes.vessels.includes(value)), "MAIB vessel mappings must target known categories");
assert.ok(Object.values(maibMapping.role.rankValues).every((value) => taxonomy.axes.roles.includes(value)), "MAIB role mappings must target known categories");
assert.ok(taxonomy.axes.roles.includes(maibMapping.role.passengerOverride));
assert.ok(taxonomy.axes.operations.includes(maibMapping.operation.target));
for (const coverage of Object.values(maibMapping.coverageSnapshot)) {
  assert.equal(coverage.mapped + coverage.unknown, coverage.total, "mapping coverage must reconcile to its source-table grain");
  assert.equal(coverage.percent, Number(((coverage.mapped / coverage.total) * 100).toFixed(2)), "stored mapping percentage must be reproducible");
}
assert.equal(maibMapping.rules.inferOperationFromEvent, false, "event labels must not invent operations");
assert.equal(maibMapping.operation.exposureUnit, "none", "MAIB counts have no exposure denominator");

const normalizedSchema = JSON.parse(await readFile(path.join(root, "data/schemas/maib-normalized.schema.json"), "utf8"));
const importSnapshot = JSON.parse(await readFile(path.join(root, "data/research/maib-import-report.snapshot.json"), "utf8"));
assert.equal(importSnapshot.mappingVersion, maibMapping.version);
assert.deepEqual(importSnapshot.coverage, maibMapping.coverageSnapshot, "committed import report must match the profiled mapping snapshot");
assert.ok(Object.values(importSnapshot.validation).every(Boolean), "snapshot import must pass key and schema validation");
const occurrenceFixture = parseDelimited("Occurrence_Id;Local_Date_Main_Event;Date_Main_Event_Unconfirmed;Year_Reported;Occurrence_Severity;Main_Event_L1;Main_Event_L2;Main_Event_L3;Not_Vessel_Operations;State_Reporting\nO-1;2025-01-01;No;2025;Serious;Collision;;;False;UK\n");
const vesselFixture = parseDelimited("Occurrence_Id;Vessel_Profile_Id;Ship_Craft_Type_L1;Ship_Craft_Type_L2;Ship_Craft_Type_L3;Ship_Craft_Type_L4;Ship_Craft_Type_L5;Vessel_Category_L1;Vessel_Category_L2;Flag_State;Is_Commercial_Vessel;Registered_Length_In_Metres;GT_Gross_Tonnage;Crew_Voyage;Voyage_Segment;Deaths_Total;Injuries_Total\nO-1;V-1;Cargo ship;;;;;Merchant Vessel >= 100gt;;UNITED KINGDOM;True;120.5;9000;18;Arrival;0;1\n");
const personFixture = parseDelimited("Occurrence_Id;Vessel_Profile_Id;Affected_Person_Id;Affected_Person_Type;Rank;Age;Gender;Nationality;On_Duty;Physical_Condition_L1;Physical_Condition_L2;Physical_Condition_L3;Injury_Type_L1;Injury_Type_L2;PPE_Used;PPE_Deficient\nO-1;V-1;P-1;Crew;Deck officer;42;Male;UK;Yes - On duty prior to casualty;Injured;Serious injury;;;;;\n");
const normalizedFixture = normalizeTables({ occurrences: occurrenceFixture, vessels: vesselFixture, affectedPersons: personFixture }, maibMapping);
assert.equal(validateNormalized(normalizedFixture, normalizedSchema), true);
assert.equal(normalizedFixture.vessels[0].vesselGroup, "cargo_dry");
assert.equal(normalizedFixture.affectedPersons[0].roleGroup, "deck_officer");
assert.equal(normalizedFixture.vessels[0].operationGroup, "unknown");
assert.equal(stableJson(normalizedFixture), stableJson(normalizedFixture), "normalized serialization must be deterministic");
assert.throws(() => normalizeTables({ occurrences: occurrenceFixture, vessels: vesselFixture, affectedPersons: [{ ...personFixture[0], Vessel_Profile_Id: "missing" }] }, maibMapping), /Orphan affected person/);

const aggregateFixture = aggregateMaib({
  occurrences: [{ ...normalizedFixture.occurrences[0], occurredMonth: "2025-01-01" }],
  vessels: normalizedFixture.vessels,
  affectedPersons: Array.from({ length: 5 }, (_, index) => ({ ...normalizedFixture.affectedPersons[0], sourceAffectedPersonId: `P-${index}` }))
});
assert.equal(aggregateFixture.cells.length, 1);
assert.deepEqual(aggregateFixture.cells[0], { role: "deck", vessel: "cargo_dry", eventType: "collision", severity: "injury", year: 2025, count: 5 });
assert.equal(aggregateFixture.totals.suppressedRecords, 0);
assert.throws(() => aggregateMaib({ occurrences: [], vessels: [], affectedPersons: [] }, { minimumCellCount: 4 }), /at least 5/);

const publicRelease = await runReleaseChecks(path.join(root, "src/data"));
assert.equal(publicRelease.datasetsChecked, 1);
const releaseEntry = {
  id: "test", datasetVersion: "1.0.0", file: "test.json", releaseMode: "aggregate", reportingPeriod: { from: 2024, to: 2025 },
  source: { publisher: "test", url: "https://example.invalid", retrievedOn: "2026-10-09" },
  license: { id: "test", url: "https://example.invalid/license", status: "approved", attribution: "test" },
  privacy: { status: "reviewed", directIdentifiersRemoved: true, containsRealPeople: false },
  quality: { status: "approved", minimumCellCount: 5 }
};
const releaseData = { unit: "test_record", measure: "count", cells: [{ count: 5 }], totals: { publishedRecords: 5 }, suppression: { minimumCellCount: 5 } };
assert.equal(validateReleaseDataset(releaseEntry, releaseData), true);
assert.throws(() => validateReleaseDataset({ ...releaseEntry, license: { ...releaseEntry.license, status: "unknown" } }, releaseData), /licence is not approved/);
assert.throws(() => validateReleaseDataset(releaseEntry, { ...releaseData, cells: [{ count: 4 }], totals: { publishedRecords: 4 } }), /below its minimum aggregation size/);
assert.throws(() => validateReleaseDataset({ ...releaseEntry, releaseMode: "record_level" }, []), /record-level external data is blocked/);
assert.throws(() => validateReleaseDataset(releaseEntry, { ...releaseData, cells: [{ count: 5, latitude: 1 }] }), /latitude is not allowed/);

const html = await readFile(path.join(root, "src/index.html"), "utf8");
const app = await readFile(path.join(root, "src/app.js"), "utf8");
const css = await readFile(path.join(root, "src/styles.css"), "utf8");
const serviceWorker = await readFile(path.join(root, "src/sw.js"), "utf8");
assert.match(html, /дослідницькою оцінкою/i, "visible research disclaimer is required");
assert.match(html, /Офіційні агрегати MAIB/i, "official aggregate data label is required");
assert.match(html, /Демонстраційний індекс прототипу/i, "prototype output must be labelled as an index");
assert.match(html, /Реєстр 0\.1\.0/i, "coefficient registry version must be visible");
assert.match(html, /model-status/, "result must expose model status");
assert.match(html, /uncertainty-status/, "result must expose uncertainty status");
assert.match(html, /component-evidence/, "result must expose component evidence details");
const scenarioMarkup = html.match(/<select id="demo-scenario">([\s\S]*?)<\/select>/)?.[1] ?? "";
assert.equal((scenarioMarkup.match(/<option value="(?:cadet|engine|deck)">/g) ?? []).length, 3, "three fictional demo scenarios are required");
assert.match(html, /id="profile-summary-list"/, "result must expose the active input profile");
assert.match(html, /Орієнтовна оцінка/, "result needs a visible approximate-result disclaimer");
assert.match(html, /id="print-report"/, "result needs a local print/PDF action");
assert.match(app, /window\.print\(\)/, "report action must use the local browser print flow");
assert.match(app, /beforeprint/, "print flow must expose collapsed evidence and assumptions");
assert.match(css, /@media print/, "print report needs a dedicated layout");
assert.match(html, /event-chart-meta/, "event chart must expose source and filter metadata");
assert.match(html, /severity-chart-meta/, "severity chart must expose source and filter metadata");
assert.doesNotMatch(html, /випадок на/i, "prototype must not express an unsupported one-in-N probability");
assert.match(serviceWorker, /\.\/coefficients\.js/, "offline app shell must include the coefficient registry");
assert.match(serviceWorker, /\.\/data\/release-manifest\.json/, "offline app shell must include dataset provenance");
assert.match(serviceWorker, /\.\/data\/incidents\.maib\.aggregate\.json/, "offline app shell must include official MAIB aggregates");
console.log("All repository checks passed.");
