import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calculateRisk, categoryFor } from "../src/model.js";
import { approvedValue, COEFFICIENTS, REGISTRY_ID, REQUIRED_METADATA, validateRegistry } from "../src/coefficients.js";

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

const html = await readFile(path.join(root, "src/index.html"), "utf8");
const serviceWorker = await readFile(path.join(root, "src/sw.js"), "utf8");
assert.match(html, /дослідницькою оцінкою/i, "visible research disclaimer is required");
assert.match(html, /Синтетична DEMO-вибірка/i, "demo data label is required");
assert.match(html, /Демонстраційний індекс прототипу/i, "prototype output must be labelled as an index");
assert.match(html, /Реєстр 0\.1\.0/i, "coefficient registry version must be visible");
assert.doesNotMatch(html, /випадок на/i, "prototype must not express an unsupported one-in-N probability");
assert.match(serviceWorker, /\.\/coefficients\.js/, "offline app shell must include the coefficient registry");
console.log("All repository checks passed.");
