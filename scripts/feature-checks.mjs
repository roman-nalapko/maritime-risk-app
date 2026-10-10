import assert from "node:assert/strict";
import { calculateRisk, evaluateMlcCompliance, generateWhatIfScenarios, generateChecklist } from "../src/model.js";

console.log("Running platform feature checks...");

// 1. Test MLC 2006 & STCW compliance evaluation
const standardWorker = { age: 30, sex: "male", residence: "city", role: "deck", hours: 2000, night: 15, ppe: true };
const standardMlc = evaluateMlcCompliance(standardWorker);
assert.equal(standardMlc.hasWarnings, false, "Standard hours must not trigger MLC warnings");
assert.equal(standardMlc.findings.length, 0, "Standard worker has no warnings");

const exhaustedWorker = { age: 35, sex: "male", residence: "city", role: "engine", hours: 2800, night: 45, ppe: true };
const exhaustedMlc = evaluateMlcCompliance(exhaustedWorker);
assert.equal(exhaustedMlc.hasWarnings, true, "Heavy hours + high night shifts must trigger MLC warnings");
assert.ok(exhaustedMlc.findings.some((f) => f.rule.includes("MLC 2006") && f.severity === "warning"), "Must flag MLC 2006 Standard A2.3 warning for hours > 2600");
assert.ok(exhaustedMlc.findings.some((f) => f.rule.includes("IMO MSC/Circ.1598") && f.severity === "warning"), "Must flag fatigue warning for night work >= 40%");

// 2. Test What-If scenarios generation
const highRiskProfile = { age: 40, sex: "male", residence: "city", role: "deck", hours: 3000, night: 50, ppe: false, smoking: true, alcohol: true };
const scenarios = generateWhatIfScenarios(highRiskProfile);
assert.ok(scenarios.length >= 3, "High-risk profile should generate multiple what-if reduction scenarios");

const ppeScenario = scenarios.find((s) => s.id === "ppe");
assert.ok(ppeScenario, "Must generate PPE scenario when ppe is false");
assert.ok(ppeScenario.deltaPercent > 0, "PPE scenario must show positive risk reduction percentage");
assert.ok(ppeScenario.simulatedTotal < calculateRisk(highRiskProfile).total, "Simulated total must be strictly less than base total");

const nightScenario = scenarios.find((s) => s.id === "night");
assert.ok(nightScenario, "Must generate night optimization scenario when night >= 20%");
assert.ok(nightScenario.deltaPercent > 0, "Night reduction must show risk reduction");

const lifestyleScenario = scenarios.find((s) => s.id === "lifestyle");
assert.ok(lifestyleScenario, "Must generate lifestyle scenario when smoking or alcohol active");
assert.ok(lifestyleScenario.deltaPercent > 0, "Lifestyle optimization must show positive reduction");

// Verify that generateWhatIfScenarios does not mutate input
assert.equal(highRiskProfile.ppe, false, "Input ppe must remain unmutated");
assert.equal(highRiskProfile.smoking, true, "Input smoking must remain unmutated");

// 3. Test Checklist generation
for (const role of ["deck", "engine", "officer", "cadet", "port", "diver"]) {
  const checklist = generateChecklist({ role, night: 20, ppe: true });
  assert.equal(checklist.role, role, `Checklist role must match ${role}`);
  assert.ok(checklist.items.length >= 3, `Every role must have at least 3 checklist items (found ${checklist.items.length} for ${role})`);
  assert.ok(checklist.items.some((item) => item.id === "rest-hours"), "All checklists must include MLC 2006 rest hours verification");
  assert.ok(checklist.items.some((item) => item.id === "stop-work"), "All checklists must include Stop Work Authority procedure");
  assert.ok(checklist.items.every((item) => typeof item.label === "string" && item.label.length > 10), "All checklist items must have detailed Ukrainian descriptions");
}

// Deck-specific checks
const deckChecklist = generateChecklist({ role: "deck", night: 30, ppe: false });
assert.ok(deckChecklist.items.some((i) => i.id === "deck-mooring"), "Deck checklist must include snap-back mooring line checks");
assert.ok(deckChecklist.items.some((i) => i.id === "night-adaptation"), "High night work must include night vision adaptation check");
assert.ok(deckChecklist.items.some((i) => i.id === "ppe-audit"), "Missing PPE must mandate a PPE audit check");

// Engine-specific checks
const engineChecklist = generateChecklist({ role: "engine", night: 10, ppe: true });
assert.ok(engineChecklist.items.some((i) => i.id === "engine-confined"), "Engine checklist must include enclosed space entry check");
assert.ok(engineChecklist.items.some((i) => i.id === "engine-hearing"), "Engine checklist must include hearing protection check");

// 4. Test Incidents statistics aggregation
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const incidentsData = JSON.parse(await readFile(path.join(root, "src/data/incidents.maib.aggregate.json"), "utf8"));
assert.ok(Array.isArray(incidentsData.cells) && incidentsData.cells.length > 50, "Incident aggregate cells must exist");
const totalIncidents = incidentsData.cells.reduce((sum, item) => sum + item.count, 0);
assert.ok(totalIncidents > 2000, "Incident aggregate dataset must contain over 2000 recorded cases");

// Check filtering consistency
const deckCells = incidentsData.cells.filter((item) => item.role === "deck");
assert.ok(deckCells.length > 0, "Deck role must have records in dataset");
const deckTotal = deckCells.reduce((sum, item) => sum + item.count, 0);
assert.ok(deckTotal > 0 && deckTotal < totalIncidents, "Deck total must be a valid subset of all incidents");

// Check severity distribution
const injuries = incidentsData.cells.filter((item) => item.severity === "injury").reduce((sum, item) => sum + item.count, 0);
const fatal = incidentsData.cells.filter((item) => item.severity === "fatal").reduce((sum, item) => sum + item.count, 0);
assert.ok(injuries > 0, "Dataset must record non-fatal injuries");
assert.ok(fatal > 0, "Dataset must record fatal cases");
assert.ok(injuries + fatal <= totalIncidents, "Severity counts must not exceed total cases");

// 5. Test Live Radar geometry calculation
const testRadarResult = calculateRisk({ age: 25, hours: 2000, night: 20, ppe: true, role: "deck" });
assert.ok(testRadarResult.components.health > 0, "Health component must be positive");
assert.ok(testRadarResult.components.occupation > 0, "Occupation component must be positive");

console.log("All platform feature checks passed.");

