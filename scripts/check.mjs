import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calculateRisk, categoryFor } from "../src/model.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = ["src/index.html", "src/styles.css", "src/app.js", "src/model.js", "src/manifest.webmanifest", "src/data/incidents.sample.json", "AGENTS.md"];
await Promise.all(required.map((file) => access(path.join(root, file))));

const baseline = calculateRisk({ age: 35, sex: "male", residence: "city", role: "officer", hours: 2024, night: 25, ppe: true });
assert.ok(baseline.total > 0 && baseline.total < 1, "total must be a bounded probability");
assert.equal(baseline.modelId, "SR-UA-PROTOTYPE-0.1");

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

const html = await readFile(path.join(root, "src/index.html"), "utf8");
assert.match(html, /дослідницькою оцінкою/i, "visible research disclaimer is required");
assert.match(html, /Синтетична DEMO-вибірка/i, "demo data label is required");
assert.match(html, /Демонстраційний індекс прототипу/i, "prototype output must be labelled as an index");
assert.doesNotMatch(html, /випадок на/i, "prototype must not express an unsupported one-in-N probability");
console.log("All repository checks passed.");
