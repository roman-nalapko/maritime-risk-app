import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calculateRisk, categoryFor } from "../src/model.js";
import { approvedValue, COEFFICIENTS, REGISTRY_ID, REQUIRED_METADATA, validateRegistry } from "../src/coefficients.js";
import { normalizeTables, parseDelimited, stableJson, validateNormalized } from "./import-maib.mjs";
import { runReleaseChecks, validateReleaseDataset } from "./release-checks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = ["src/index.html", "src/styles.css", "src/app.js", "src/model.js", "src/coefficients.js", "src/manifest.webmanifest", "src/data/incidents.sample.json", "AGENTS.md"];
await Promise.all(required.map((file) => access(path.join(root, file))));

const baseline = calculateRisk({ age: 35, sex: "male", residence: "city", role: "officer", hours: 2024, night: 25, ppe: true });
assert.ok(baseline.total > 0 && baseline.total < 1, "prototype index must remain bounded");
assert.equal(baseline.modelId, "SR-UA-PROTOTYPE-0.1");
assert.equal(baseline.registryId, REGISTRY_ID);

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

const incidents = JSON.parse(await readFile(path.join(root, "src/data/incidents.sample.json"), "utf8"));
assert.ok(incidents.length >= 20, "sample data should support meaningful UI filtering");
assert.ok(incidents.every((item) => item.id.startsWith("DEMO-")), "synthetic records must be unmistakably labelled");

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

const publicRelease = await runReleaseChecks(path.join(root, "src/data"));
assert.equal(publicRelease.datasetsChecked, 1);
const releaseEntry = {
  id: "test", file: "test.json", releaseMode: "aggregate",
  source: { publisher: "test", url: "https://example.invalid", retrievedOn: "2026-10-09" },
  license: { id: "test", status: "approved", attribution: "test" },
  privacy: { status: "reviewed", directIdentifiersRemoved: true, containsRealPeople: false },
  quality: { status: "approved", minimumCellCount: 5 }
};
assert.equal(validateReleaseDataset(releaseEntry, { cells: [{ count: 5 }] }), true);
assert.throws(() => validateReleaseDataset({ ...releaseEntry, license: { ...releaseEntry.license, status: "unknown" } }, { cells: [{ count: 5 }] }), /licence is not approved/);
assert.throws(() => validateReleaseDataset(releaseEntry, { cells: [{ count: 4 }] }), /below its minimum aggregation size/);
assert.throws(() => validateReleaseDataset({ ...releaseEntry, releaseMode: "record_level" }, []), /record-level external data is blocked/);
assert.throws(() => validateReleaseDataset(releaseEntry, { cells: [{ count: 5, latitude: 1 }] }), /latitude is not allowed/);

const html = await readFile(path.join(root, "src/index.html"), "utf8");
const serviceWorker = await readFile(path.join(root, "src/sw.js"), "utf8");
assert.match(html, /дослідницькою оцінкою/i, "visible research disclaimer is required");
assert.match(html, /Синтетична DEMO-вибірка/i, "demo data label is required");
assert.match(html, /Демонстраційний індекс прототипу/i, "prototype output must be labelled as an index");
assert.match(html, /Реєстр 0\.1\.0/i, "coefficient registry version must be visible");
assert.doesNotMatch(html, /випадок на/i, "prototype must not express an unsupported one-in-N probability");
assert.match(serviceWorker, /\.\/coefficients\.js/, "offline app shell must include the coefficient registry");
console.log("All repository checks passed.");
