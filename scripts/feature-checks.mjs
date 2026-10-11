import assert from "node:assert/strict";
import {
  calculateRisk,
  evaluateMlcCompliance,
  generateWhatIfScenarios,
  generateChecklist,
  retrieveSimilarIncidents,
  evaluateFsaMatrix,
  calculateSensitivity,
  calculateCircadianFatigue,
  calculateOperationalWeatherRisk,
  evaluatePscSireReadiness,
  simulateEmergencyDrillFatigue,
  generateAcademicArtifacts,
  compareProfiles,
  generateOfflineWatchHandoverQr
} from "../src/model.js";

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

// 6. Test Grounded Similar-Incident Retrieval (Issue #11)
const retrieval = retrieveSimilarIncidents({ role: "deck", vesselType: "tanker" }, incidentsData.cells);
assert.ok(retrieval.sampleSize > 0, "Must retrieve records for deck role");
assert.ok(Array.isArray(retrieval.retrievedFacts) && retrieval.retrievedFacts.length >= 2, "Must return separated factual statements");
assert.ok(typeof retrieval.explanation === "string" && retrieval.explanation.length > 10, "Must return neutral grounded explanation");
assert.ok(retrieval.disclaimer.includes("не є персональною ймовірністю"), "Must include explicit disclaimer separating records from probability");

// 7. Test IMO Formal Safety Assessment (FSA) Matrix Evaluation
const baseProfile = { role: "deck", hours: 2000, night: 20, ppe: true, watchSystem: "4on8off", vesselType: "container" };
const fsaNormal = evaluateFsaMatrix(calculateRisk(baseProfile), baseProfile);
assert.ok(["acceptable", "alarp", "unacceptable"].includes(fsaNormal.region), "FSA matrix region must be valid");
assert.ok(fsaNormal.ri >= 2 && fsaNormal.ri <= 8, "Risk Index must be in 2..8 range");

const extremeProfile = { role: "engine", hours: 3200, night: 60, ppe: false, watchSystem: "6on6off", vesselType: "tanker" };
const fsaExtreme = evaluateFsaMatrix(calculateRisk(extremeProfile), extremeProfile);
assert.ok(fsaExtreme.ri > fsaNormal.ri, "High risk profile must have higher Risk Index");
assert.ok(fsaExtreme.region === "unacceptable" || fsaExtreme.region === "alarp", "High risk must fall in ALARP or Unacceptable region");

// 8. Test Marginal Sensitivity & Elasticity Analysis
const sensList = calculateSensitivity(extremeProfile);
assert.ok(Array.isArray(sensList) && sensList.length >= 3, "Sensitivity list must evaluate multiple factors");
assert.ok(sensList[0].weightPercent >= sensList[sensList.length - 1].weightPercent, "Factors must be sorted by marginal weight descending");
assert.ok(sensList.some((f) => f.id === "ppe"), "Must evaluate PPE sensitivity");
assert.ok(sensList.some((f) => f.id === "hours"), "Must evaluate working hours sensitivity");

// 9. Test Epic 1: Circadian Fatigue & Sleep Debt Biodynamics (SAFTE / FAST framework)
const wellRested = calculateCircadianFatigue({ watchSystem: "day_only", night: 0, hours: 1800 });
assert.equal(wellRested.curve24h.length, 24, "Circadian curve must have 24 hourly data points");
assert.equal(wellRested.sleepDebtHours, 0, "Day worker with normal hours has 0 sleep debt");
assert.ok(wellRested.kssScore <= 4, "Rested worker must have low KSS score (1..4)");

const exhaustedNightWorker = calculateCircadianFatigue({ watchSystem: "6on6off", night: 60, hours: 3200 });
assert.ok(exhaustedNightWorker.sleepDebtHours > 5, "Exhausted 6/6 worker must accumulate significant sleep debt");
assert.ok(exhaustedNightWorker.kssScore >= 7, "Exhausted worker must reach high KSS score (>= 7)");
assert.ok(exhaustedNightWorker.recommendations.length >= 2, "High fatigue profile must generate actionable safety recommendations");
// Verify circadian nadir at 03:00 has lower alertness than 14:00
const p03 = exhaustedNightWorker.curve24h.find((p) => p.hour === 3);
const p14 = exhaustedNightWorker.curve24h.find((p) => p.hour === 14);
assert.ok(p03.alertness < p14.alertness, "Alertness at circadian nadir (03:00) must be strictly lower than midday (14:00)");

// 10. Test Epic 2: Hydrometeorological & Operational Hazards
const calmWeather = calculateOperationalWeatherRisk({ vesselType: "container", role: "deck" }, { beaufort: 1, polarZone: false, engineHeat: false });
assert.equal(calmWeather.beaufort, 1, "Beaufort scale preserved");
assert.ok(calmWeather.msiPercent < 10, "Calm sea has negligible Motion Sickness Incidence");
assert.equal(calmWeather.slipMultiplier, 1.0, "Calm sea has base slip multiplier 1.0");
assert.equal(calmWeather.warnings.length, 0, "No warnings for calm weather");

const galeWeather = calculateOperationalWeatherRisk({ vesselType: "tug", role: "engine" }, { beaufort: 9, polarZone: true, engineHeat: true });
assert.ok(galeWeather.msiPercent > 50, "Gale force on tug must produce high MSI (> 50%)");
assert.ok(galeWeather.slipMultiplier >= 4.0, "Storm force must significantly multiply slip hazard");
assert.ok(galeWeather.warnings.some((w) => w.title.includes("Шкала Бофорта")), "Must trigger storm warning");
assert.ok(galeWeather.warnings.some((w) => w.title.includes("Polar Code")), "Must trigger polar icing warning");
assert.ok(galeWeather.warnings.some((w) => w.title.includes("Тепловий стрес")), "Must trigger engine room heat stress warning");

// 11. Test Epic 3: Port State Control (PSC) & SIRE 2.0 Inspection Readiness
const compliantWorkerPsc = evaluatePscSireReadiness({ hours: 2000, night: 15, ppe: true, watchSystem: "4on8off", vesselType: "container" });
assert.equal(compliantWorkerPsc.readinessScore, 100, "Fully compliant profile must have 100 PSC score");
assert.equal(compliantWorkerPsc.deficiencies.length, 0, "Fully compliant profile has 0 deficiencies");

const nonCompliantPsc = evaluatePscSireReadiness({ hours: 2900, night: 50, ppe: false, watchSystem: "6on6off", vesselType: "tanker" });
assert.ok(nonCompliantPsc.readinessScore <= 50, "Major non-compliance must drop PSC score below 50");
assert.ok(nonCompliantPsc.deficiencies.some((d) => d.code === "01220"), "Must flag MLC 2006 rest hours deficiency 01220");
assert.ok(nonCompliantPsc.deficiencies.some((d) => d.code === "07109"), "Must flag PPE deficiency 07109");
assert.ok(nonCompliantPsc.deficiencies.some((d) => d.code.startsWith("SIRE-HF")), "Must flag SIRE 2.0 Human Factors observation on tanker");
assert.ok(nonCompliantPsc.correctiveActions.length >= 2, "Must generate Corrective Action Plan (CAP) items");

// 12. Test Epic 4: Emergency Drills Fatigue Simulation
const drillFresh = simulateEmergencyDrillFatigue({ hours: 1900, watchSystem: "4on8off", night: 10 }, "fire");
assert.equal(drillFresh.readiness, "optimal", "Fresh worker has optimal drill readiness");
assert.ok(drillFresh.reactionDelaySeconds <= 1.5, "Fresh worker has minimal reaction delay");

const drillFatigued = simulateEmergencyDrillFatigue({ hours: 3000, watchSystem: "6on6off", night: 55 }, "abandon_ship");
assert.ok(drillFatigued.reactionDelaySeconds > 4.0, "Fatigued worker suffers significant reaction delay (> 4s)");
assert.ok(drillFatigued.errorRatePercent > 25, "Fatigued worker has high error rate (> 25%)");
assert.equal(drillFatigued.readiness, "critical", "Heavy fatigue must trigger critical drill readiness state");

// 13. Test Epic 5: Academic Research Toolkit & LaTeX/CSV Export
const academicArtifacts = generateAcademicArtifacts(calculateRisk(baseProfile), baseProfile);
assert.ok(academicArtifacts.latexTable.includes("\\begin{table}"), "Must generate valid LaTeX table environment");
assert.ok(academicArtifacts.latexTable.includes("R_{total}"), "LaTeX table must include math notation for R_{total}");
assert.ok(academicArtifacts.bibtexCitations.includes("@misc{imo_fsa_2007"), "Must include IMO FSA BibTeX entry");
assert.ok(academicArtifacts.bibtexCitations.includes("@misc{mlc_2006"), "Must include MLC BibTeX entry");
assert.ok(academicArtifacts.csvHeader.includes("role,hours"), "Must produce valid CSV header");
assert.ok(academicArtifacts.csvRow.includes("deck,2000"), "Must produce valid comma-separated CSV row values");

// 14. Test Epic 5: Dual Profile Comparison
const comp = compareProfiles(
  { role: "deck", hours: 2000, night: 15, ppe: true, age: 30 },
  { role: "deck", hours: 2800, night: 45, ppe: false, age: 30 }
);
assert.equal(comp.higherRisk, "Профіль Б", "Fatigued profile without PPE must be higher risk");
assert.ok(comp.deltaTotal > 0, "Delta total risk must be positive");
assert.ok(comp.deltaPercent > 0, "Delta percent must be positive");
assert.ok(typeof comp.componentDeltas.occupation === "number", "Must report occupation component delta");

// 15. Test Epic 1 Enhancement: Jet-Lag & Time Zone Desynchronosis
const shiftedCircadian = calculateCircadianFatigue({ watchSystem: "4on8off", night: 30, hours: 2400 }, { timezoneShiftHours: 6 });
assert.equal(shiftedCircadian.timezoneShiftHours, 6, "Must record timezone shift hours");
assert.ok(shiftedCircadian.sleepDebtHours > 0, "Timezone shift must accumulate physiological sleep debt");
assert.ok(shiftedCircadian.recommendations.some((r) => r.includes("Десинхроноз")), "Must flag acute circadian desynchrony recommendation");

// 16. Test Epic 7: Pure SVG Offline 2D Matrix / QR Visual Handover
const testQr = generateOfflineWatchHandoverQr(
  { role: "officer", hours: 2400, watchSystem: "4on8off" },
  calculateRisk({ role: "officer", hours: 2400 })
);
assert.equal(testQr.size, 21, "Must generate valid 21x21 QR Version 1 dimensions");
assert.ok(testQr.svg.startsWith("<svg") && testQr.svg.endsWith("</svg>"), "Must output valid SVG markup");
assert.ok(testQr.rawString.startsWith("SEARISK:"), "Must encode formatted watch handover string");

// 17. Test Epic 8: Tri-Lingual Maritime Localization Coverage (UA / EN IMO SMCP / RU)
const appSource = await readFile(path.join(root, "src/app.js"), "utf8");
const htmlSource = await readFile(path.join(root, "src/index.html"), "utf8");

assert.ok(htmlSource.includes('data-lang="uk"'), "Must provide UA language toggle button");
assert.ok(htmlSource.includes('data-lang="en"'), "Must provide EN language toggle button");
assert.ok(htmlSource.includes('data-lang="ru"'), "Must provide RU language toggle button");

// Extract I18N dictionary from app.js to test dictionary parity
const i18nMatch = appSource.match(/const I18N = (\{[\s\S]*?\n\};)/);
assert.ok(i18nMatch, "Must define I18N dictionary in app.js");

// Validate in a sandbox
import vm from "node:vm";
const i18nSandbox = {};
vm.runInNewContext(i18nMatch[0].replace(/^const /, "var "), i18nSandbox);
const dict = i18nSandbox.I18N;

assert.ok(dict.uk && dict.en && dict.ru, "Dictionary must contain UK, EN, and RU root definitions");
const ukKeys = Object.keys(dict.uk);
const enKeys = Object.keys(dict.en);
const ruKeys = Object.keys(dict.ru);

assert.equal(ukKeys.length, enKeys.length, "English dictionary must have exact same key count as Ukrainian");
assert.equal(ukKeys.length, ruKeys.length, "Russian dictionary must have exact same key count as Ukrainian");
for (const key of ukKeys) {
  assert.ok(key in dict.en, `Key '${key}' missing in English dictionary`);
  assert.ok(key in dict.ru, `Key '${key}' missing in Russian dictionary`);
  assert.ok(dict.uk[key], `Value for '${key}' in Ukrainian must not be empty`);
  assert.ok(dict.en[key], `Value for '${key}' in English must not be empty`);
  assert.ok(dict.ru[key], `Value for '${key}' in Russian must not be empty`);
}

// Check localized markers in FSA matrix
assert.equal(dict.uk.fsaMarker, "● ВИ", "Ukrainian FSA marker must be ● ВИ");
assert.equal(dict.en.fsaMarker, "● YOU", "English FSA marker must be ● YOU");
assert.equal(dict.ru.fsaMarker, "● ВЫ", "Russian FSA marker must be ● ВЫ");

console.log("All platform feature checks passed.");


