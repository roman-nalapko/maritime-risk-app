import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  generateOfflineWatchHandoverQr,
  calculateWilsonInterval,
  getBridgeAlertPattern,
  evaluateWatchTeamRisk,
  createDefaultWatchSchedule,
  validateRestHoursSchedule,
  KP965_GISIS_RECORD,
  calculatePortBasinRisk,
  generatePythonAssignmentScript
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

// 18. Test Wilson Score 95% Confidence Interval & Sparse Data Warnings (Issue #13)
const zeroInterval = calculateWilsonInterval(0, 0);
assert.equal(zeroInterval.point, 0, "Zero sample size must return point 0");
assert.equal(zeroInterval.lower, 0, "Zero sample size must return lower bound 0");
assert.equal(zeroInterval.upper, 0, "Zero sample size must return upper bound 0");
assert.equal(zeroInterval.isSparse, true, "n = 0 must be marked sparse");

// Small sample size (n = 20 < 30)
const sparseInterval = calculateWilsonInterval(15, 20);
assert.equal(sparseInterval.isSparse, true, "n = 20 must be marked sparse (n < 30)");
assert.equal(sparseInterval.point, 0.75, "15/20 must give point estimate 0.75");
assert.ok(sparseInterval.lower > 0.5 && sparseInterval.lower < 0.75, "Wilson lower bound must be conservative and positive");
assert.ok(sparseInterval.upper > 0.75 && sparseInterval.upper < 1.0, "Wilson upper bound must be < 1.0");
assert.equal(sparseInterval.confidence, 0.95, "Confidence level must be 95%");

// Large sample size (n = 1000 >= 30)
const largeInterval = calculateWilsonInterval(250, 1000);
assert.equal(largeInterval.isSparse, false, "n = 1000 must NOT be marked sparse");
assert.equal(largeInterval.point, 0.25, "250/1000 must give point estimate 0.25");
assert.ok(largeInterval.lower > 0.22 && largeInterval.lower < 0.25, "Wilson lower bound for large sample");
assert.ok(largeInterval.upper > 0.25 && largeInterval.upper < 0.28, "Wilson upper bound for large sample");

// Boundary conditions: 0 positive events in 100
const zeroCountInterval = calculateWilsonInterval(0, 100);
assert.equal(zeroCountInterval.lower, 0, "Lower bound for 0 count must clamp to 0");
assert.ok(zeroCountInterval.upper > 0 && zeroCountInterval.upper < 0.05, "Upper bound for 0 count must be positive non-zero");

// 19. Test IMO MSC.302(87) Bridge Alert Management (BAM) & SOLAS III/6.4.2 Emergency Audio Patterns
const generalEmergency = getBridgeAlertPattern("general_emergency");
assert.equal(generalEmergency.frequency, 800, "General Emergency frequency must be 800 Hz");
assert.equal(generalEmergency.pulses.length, 8, "General emergency must have 8 pulses (7 short + 1 prolonged)");
assert.equal(generalEmergency.pulses[0].duration, 0.2, "Short pulse duration must be 0.2s");
assert.equal(generalEmergency.pulses[7].duration, 1.5, "Prolonged pulse duration must be 1.5s");
assert.ok(generalEmergency.code.includes("SOLAS III/6.4.2"), "Code must cite SOLAS III/6.4.2");

const abandonShip = getBridgeAlertPattern("abandon_ship");
assert.equal(abandonShip.frequency, 800, "Abandon ship must share General Emergency standard tone");
assert.equal(abandonShip.pulses.length, 8, "Abandon ship must have 8 pulses");

const fireAlarm = getBridgeAlertPattern("fire");
assert.equal(fireAlarm.frequency, 1000, "Fire alarm frequency must be 1000 Hz");
assert.ok(fireAlarm.pulses.length >= 4, "Fire alarm must have rapid continuous cadence");

const warningChime = getBridgeAlertPattern("warning");
assert.equal(warningChime.frequency, 880, "BAM Category A warning chime must be 880 Hz");
// 20. Test Bridge Resource Management (BRM) & Navigation Watch Team Coupling (STCW A-VIII/2)
const safeWatch = evaluateWatchTeamRisk(
  { role: "officer", hours: 1900, night: 15, watchSystem: "4on8off" },
  { role: "deck", hours: 1900, night: 15, watchSystem: "4on8off" },
  { isNight: true, pilotOnBoard: false }
);
assert.equal(safeWatch.redundancyLevel, "optimal", "Two well-rested crew at night must have optimal redundancy");
assert.equal(safeWatch.soleWatchkeeperNight, false, "Lookout present means not a sole watchkeeper");
assert.ok(safeWatch.teamScore < 25, "Safe watch team must have low team risk score");

// Sole watchkeeper at night (Scot Carrier scenario)
const soloNightWatch = evaluateWatchTeamRisk(
  { role: "officer", hours: 2600, night: 60, watchSystem: "6on6off" },
  null,
  { isNight: true }
);
assert.equal(soloNightWatch.soleWatchkeeperNight, true, "Must flag sole watchkeeper at night");
assert.equal(soloNightWatch.redundancyLevel, "compromised", "Solo night watch must be compromised");
assert.ok(soloNightWatch.findings.some((f) => f.rule.includes("STCW A-VIII/2") && f.severity === "critical"), "Must flag critical STCW A-VIII/2 violation");
assert.ok(soloNightWatch.recommendations.some((r) => r.includes("матроса-впередсмотрящого")), "Must recommend placing a dedicated lookout");

// Synchronous fatigue nadir failure
const mutualFatigueWatch = evaluateWatchTeamRisk(
  { role: "officer", hours: 3200, night: 70, watchSystem: "6on6off" },
  { role: "deck", hours: 3200, night: 70, watchSystem: "6on6off" },
  { isNight: true }
);
assert.equal(mutualFatigueWatch.mutualFatigueNadir, true, "Must detect mutual cumulative fatigue failure");
assert.equal(mutualFatigueWatch.redundancyLevel, "compromised", "Mutual fatigue breaks redundancy");
assert.ok(mutualFatigueWatch.teamScore > safeWatch.teamScore, "Fatigued watch team score must exceed safe watch team score");

// Pilot on board integration
const pilotWatch = evaluateWatchTeamRisk(
  { role: "officer", hours: 2000, night: 20, watchSystem: "4on8off" },
  { role: "deck", hours: 2000, night: 20, watchSystem: "4on8off" },
  { isNight: false, pilotOnBoard: true }
);
assert.equal(pilotWatch.pilotOnBoard, true, "Must record pilot presence");
assert.ok(pilotWatch.findings.some((f) => f.rule.includes("IMO Res. A.960")), "Must include Master/Pilot Information Exchange (MPX) advisory");

// 21. Test UI & DOM Contract for BRM and Chart Tooltips
const htmlContent = await readFile(path.join(root, "src/index.html"), "utf8");
const cssContent = await readFile(path.join(root, "src/styles.css"), "utf8");
const appContent = await readFile(path.join(root, "src/app.js"), "utf8");
const runtimeContent = await readFile(path.join(root, "src/ui-runtime.js"), "utf8");

// Assignment-first root view contract (Issue #38)
assert.ok(htmlContent.includes('id="assignment-primary-action"'), "root view must expose a stable assignment primary action");
assert.ok(htmlContent.includes('href="#gisis-ecfa"'), "assignment primary action must jump to the GISIS/ECFA work");
assert.ok(htmlContent.includes('?view=tools#assessment'), "root view must preserve a route to the full research tools");
assert.ok(htmlContent.includes("Автоматизована оцінка ризику судноплавства"), "hero must name the actual course assignment");
assert.equal((htmlContent.match(/role="switch"/g) ?? []).length, 5, "optional questionnaire must preserve exactly five switches");
assert.ok(cssContent.includes('html[data-view="assignment"]'), "styles must define the focused assignment view");
assert.ok(cssContent.includes('html[data-view="tools"]'), "styles must preserve the full tools view");
assert.ok(appContent.includes("applyViewMode"), "app must apply the URL-selected view mode");
assert.ok(htmlContent.includes('data-nav-key="assessment"'), "navigation links must use stable localization keys");
assert.ok(!appContent.includes('document.querySelectorAll("header nav a")'), "navigation translation must not depend on link position");

assert.ok(htmlContent.includes('id="brm-watch-card"'), "index.html must have brm-watch-card");
assert.ok(htmlContent.includes('id="brm-lookout-toggle"'), "index.html must have brm-lookout-toggle");
assert.ok(htmlContent.includes('id="brm-pilot-toggle"'), "index.html must have brm-pilot-toggle");
assert.ok(htmlContent.includes('id="brm-team-score"'), "index.html must have brm-team-score");
assert.ok(htmlContent.includes('id="brm-redundancy-badge"'), "index.html must have brm-redundancy-badge");
assert.ok(htmlContent.includes('id="chart-tooltip"'), "index.html must have chart-tooltip container");

assert.ok(cssContent.includes(".brm-watch-card"), "styles.css must style brm-watch-card");
assert.ok(cssContent.includes(".brm-badge-optimal"), "styles.css must define brm-badge-optimal");
assert.ok(cssContent.includes(".brm-badge-compromised"), "styles.css must define brm-badge-compromised");
assert.ok(cssContent.includes(".chart-tooltip"), "styles.css must define chart-tooltip");
assert.ok(cssContent.includes(".circ-bar"), "styles.css must define circ-bar");

assert.ok(appContent.includes("renderBrmWatchTeam"), "app.js must implement renderBrmWatchTeam");
assert.ok(appContent.includes("showChartTooltip"), "app.js must implement showChartTooltip");
assert.ok(appContent.includes("hideChartTooltip"), "app.js must implement hideChartTooltip");

// 22. Test MLC 2006 Standard A2.3 & STCW A-VIII/1 7-Day Rest Hours Validator
const sched48 = createDefaultWatchSchedule("4on8off");
const val48 = validateRestHoursSchedule(sched48);
assert.equal(val48.isCompliant, true, "Standard 4/8 watch must be fully compliant with MLC/STCW");
assert.equal(val48.totalRest7Days, 112, "4/8 watch provides 112 rest hours in 7 days");
assert.equal(val48.minDailyRest, 16, "4/8 watch provides 16 rest hours in each 24h window");
assert.equal(val48.complianceScore, 100, "Compliant 4/8 schedule must have 100% compliance score");
assert.equal(val48.violations.length, 0, "Compliant schedule must have zero violations");

const sched66 = createDefaultWatchSchedule("6on6off");
const val66 = validateRestHoursSchedule(sched66);
assert.equal(val66.isCompliant, true, "Standard 6/6 watch without overtime is compliant on paper");
assert.equal(val66.totalRest7Days, 84, "6/6 watch provides 84 rest hours in 7 days");
assert.equal(val66.minDailyRest, 12, "6/6 watch provides 12 rest hours in each 24h window");

const schedOvertime = createDefaultWatchSchedule("cargo_overtime");
const valOvertime = validateRestHoursSchedule(schedOvertime);
assert.equal(valOvertime.isCompliant, false, "Heavy port overtime must trigger MLC non-conformities");
assert.ok(valOvertime.totalRest7Days < 77, "Overtime schedule must fail weekly 77h minimum");
assert.ok(valOvertime.minDailyRest < 10, "Overtime schedule must fail daily 10h minimum");
assert.ok(valOvertime.violations.some((v) => v.type === "daily_minimum"), "Must flag daily minimum violation");
assert.ok(valOvertime.violations.some((v) => v.type === "weekly_minimum"), "Must flag weekly minimum violation");
assert.ok(valOvertime.complianceScore < 60, "Non-compliant schedule must have low compliance score");

// 23. Test UI & DOM Contract for MLC 2006 Rest Hours Validator
assert.ok(htmlContent.includes('id="mlc-rest-validator-card"'), "index.html must have mlc-rest-validator-card");
assert.ok(htmlContent.includes('id="mlc-hours-grid"'), "index.html must have mlc-hours-grid");
assert.ok(htmlContent.includes('id="mlc-day-tabs"'), "index.html must have mlc-day-tabs");
assert.ok(htmlContent.includes('id="mlc-preset-48"'), "index.html must have mlc-preset-48");
assert.ok(htmlContent.includes('id="mlc-preset-66"'), "index.html must have mlc-preset-66");
assert.ok(htmlContent.includes('id="mlc-preset-overtime"'), "index.html must have mlc-preset-overtime");
assert.ok(htmlContent.includes('id="mlc-compliance-badge"'), "index.html must have mlc-compliance-badge");
assert.ok(htmlContent.includes('id="mlc-violations-box"'), "index.html must have mlc-violations-box");

assert.ok(cssContent.includes(".mlc-rest-validator-card"), "styles.css must style mlc-rest-validator-card");
assert.ok(cssContent.includes(".mlc-hour-slot"), "styles.css must style mlc-hour-slot");
assert.ok(cssContent.includes(".mlc-day-tab"), "styles.css must style mlc-day-tab");
assert.ok(cssContent.includes(".mlc-val-badge-compliant"), "styles.css must style mlc-val-badge-compliant");
assert.ok(cssContent.includes(".mlc-val-badge-violation"), "styles.css must style mlc-val-badge-violation");

assert.ok(appContent.includes("renderMlcRestValidator"), "app.js must implement renderMlcRestValidator");
assert.ok(appContent.includes("validateRestHoursSchedule"), "app.js must use validateRestHoursSchedule");
assert.ok(appContent.includes("createDefaultWatchSchedule"), "app.js must use createDefaultWatchSchedule");

// 24. Test Select Dropdown Styling and Custom Chevron Guard
assert.ok(cssContent.includes("--select-chevron:"), "styles.css must declare --select-chevron token");
assert.ok(cssContent.includes("appearance: none;"), "styles.css must disable native select appearance");
assert.ok(cssContent.includes("background-image: var(--select-chevron);"), "styles.css must use custom chevron icon for select");
assert.ok(cssContent.includes("padding: 0 38px 0 14px;"), "styles.css must set safe right padding for select chevron");

// 25. Test GISIS IMO Standardized Digitized Record for Pilot Boat KP-965 (MSC-MEPC.3/Circ.4/Rev.1)
assert.equal(KP965_GISIS_RECORD.casualtyId, "KP965-KOPER-2026", "KP-965 casualty ID must match");
assert.equal(KP965_GISIS_RECORD.vessel.name, "KP-965", "Vessel name must be KP-965");
assert.equal(KP965_GISIS_RECORD.vessel.voyageSpeedKnots, 22.0, "KP-965 incident speed was 22.0 knots");
assert.equal(KP965_GISIS_RECORD.location.code, 3, "Table 3 Location must be Code 3 (Port)");
assert.equal(KP965_GISIS_RECORD.casualtyEvent.code, 6, "Table 4 Casualty Event must be Code 6 (Contact)");
assert.equal(KP965_GISIS_RECORD.severity.code, 2, "Table 5 Severity must be Code 2 (Marine casualty)");
assert.equal(KP965_GISIS_RECORD.environmentalFactors.seaState.code, 1, "Table 6 Sea State must be Code 1 (Calm rippled)");
assert.equal(KP965_GISIS_RECORD.environmentalFactors.windForce.code, 2, "Table 7 Wind Force must be Code 2 (Light breeze)");
assert.equal(KP965_GISIS_RECORD.environmentalFactors.visibility.code, 4, "Table 9 Visibility must be Code 4 (Good)");
assert.equal(KP965_GISIS_RECORD.environmentalFactors.lightCondition.code, 2, "Table 10 Light must be Code 2 (Darkness)");
assert.equal(KP965_GISIS_RECORD.accidentEvent.code, 1, "Table 16 Accident Event must be Code 1 (Human action)");
assert.ok(KP965_GISIS_RECORD.errorTypes.some((e) => e.code === 1), "Must include Table 19 observation error");
assert.ok(KP965_GISIS_RECORD.temporaryPersonFactors.some((f) => f.code === 2), "Must include Table 20 fatigue");
assert.ok(KP965_GISIS_RECORD.operationalFactors.some((f) => f.code === "22.6"), "Must include Table 22 speed awareness factor");
assert.ok(KP965_GISIS_RECORD.managementFactors.some((f) => f.code === "23.19"), "Must include Table 23 SMS procedures factor");

// ECFA Diagram structure check (IMO Res. A.1075(28) & MAIIS official report Figure 6)
const ecfa = KP965_GISIS_RECORD.ecfaDiagram;
assert.equal(ecfa.events.length, 8, "ECFA must include 8 chronological events (E1..E8)");
assert.equal(ecfa.accidentEvents.length, 4, "ECFA must include 4 accident events (AE1..AE4)");
assert.ok(ecfa.casualtyEvent && ecfa.casualtyEvent.id === "CE1", "ECFA must include casualty event (CE1)");
assert.equal(ecfa.contributingFactors.length, 10, "ECFA must include 10 contributing factors (CF1..CF10)");
assert.equal(ecfa.safetyDeficiencies.length, 7, "ECFA must include 7 safety deficiencies (SD1..SD7)");
assert.equal(ecfa.safetyIssues.length, 5, "ECFA must include 5 systemic safety issues (SI1..SI5)");
assert.equal(ecfa.safetyRecommendations.length, 7, "ECFA must include 7 official MAIIS safety recommendations (SR003..SR009)");
assert.ok(ecfa.synthesis && ecfa.synthesis.keyFindingUk, "ECFA must include synthesis key finding");

// 26. Test Port Basin Risk Assessment Model (R = P x S)
const kp965Scenario = calculatePortBasinRisk({
  excessSpeed: true,
  singleLookout: true,
  circadianFatigue: true,
  glareVisualImpairment: true,
  radarNotUsed: true,
  routineComplacency: true,
  unlitObstacle: true,
  trainingOrOrgDeficiency: true
}, { severityCode: 3 });

assert.equal(kp965Scenario.probabilityScore, 5.0, "KP-965 compound factors clamp to maximum P = 5.0");
assert.equal(kp965Scenario.severityCode, 3, "Table 5 severity code for marine casualty is 3");
assert.equal(kp965Scenario.riskIndex, 15.0, "KP-965 risk score R = 5.0 x 3 = 15.0");
assert.equal(kp965Scenario.riskCategory, "critical", "R >= 10 must fall in Critical (Unacceptable) risk zone");
assert.ok(kp965Scenario.criticalAlertUk.includes("АВТОМАТИЧНЕ ЗАСТЕРЕЖЕННЯ З БЕЗПЕКИ:"), "Must generate coursework automated alert string");
assert.ok(kp965Scenario.mitigationRules.some((r) => r.ruleId === "RULE-BASIN-SPEED-01"), "Must generate speed limit rule <= 10 kt");
assert.ok(kp965Scenario.mitigationRules.some((r) => r.ruleId === "RULE-DUAL-LOOKOUT-02"), "Must generate dual lookout mandate rule");

const safeScenario = calculatePortBasinRisk({
  excessSpeed: false,
  singleLookout: false,
  circadianFatigue: false,
  glareVisualImpairment: false,
  radarNotUsed: false,
  routineComplacency: false,
  unlitObstacle: false,
  trainingOrOrgDeficiency: false
}, { severityCode: 1 });
assert.equal(safeScenario.probabilityScore, 1.0, "Zero hazard factors yield base P = 1.0");
assert.equal(safeScenario.riskIndex, 1.0, "Safe scenario risk score R = 1.0 x 1 = 1.0");
assert.equal(safeScenario.riskCategory, "acceptable", "R < 6 must be Acceptable");
assert.equal(safeScenario.criticalAlertUk, null, "Safe scenario must not trigger critical alert");

const elevatedScenario = calculatePortBasinRisk({
  excessSpeed: false,
  singleLookout: true,
  circadianFatigue: false,
  glareVisualImpairment: false,
  radarNotUsed: false,
  routineComplacency: false,
  unlitObstacle: false,
  trainingOrOrgDeficiency: false
}, { severityCode: 3 });
assert.equal(elevatedScenario.probabilityScore, 3.0, "Single lookout yields P = 1.0 + 2.0 = 3.0");
assert.equal(elevatedScenario.riskIndex, 9.0, "R = 3.0 x 3 = 9.0");
assert.equal(elevatedScenario.riskCategory, "elevated", "6 <= R < 10 must be Elevated (ALARP)");

// 27. Test Standalone Python Assignment Script Generator
const pyScript = generatePythonAssignmentScript(KP965_GISIS_RECORD, kp965Scenario);
assert.ok(pyScript.includes("import matplotlib.pyplot as plt"), "Python script must import matplotlib");
assert.ok(pyScript.includes("KP-965"), "Python script must cite KP-965 case study");
assert.ok(pyScript.includes("calculate_port_basin_risk"), "Python script must implement risk function");
assert.ok(pyScript.includes("R = P x S"), "Python script must implement FSA risk formula");
assert.ok(pyScript.includes("SI-MAIIS-SR003-2026"), "Python script must print MAIIS recommendations");

// 28. Test UI & DOM Contract for GISIS IMO & ECFA Module
assert.ok(htmlContent.includes('id="gisis-ecfa"'), "index.html must have gisis-ecfa section");
assert.ok(htmlContent.includes('id="port-basin-risk-card"'), "index.html must have port-basin-risk-card");
assert.ok(htmlContent.includes('id="factor-speed"'), "index.html must have factor-speed checkbox");
assert.ok(htmlContent.includes('id="factor-lookout"'), "index.html must have factor-lookout checkbox");
assert.ok(htmlContent.includes('id="factor-training"'), "index.html must have factor-training checkbox");
assert.equal((htmlContent.match(/id="factor-[^"]+"/g) || []).length, 5, "assignment must expose exactly five factor switches");
assert.ok(htmlContent.includes('id="gisis-critical-alert"'), "index.html must have gisis-critical-alert box");
assert.ok(htmlContent.includes('id="gisis-severity-select"'), "index.html must have gisis-severity-select");
assert.ok(htmlContent.includes('id="gisis-risk-display"'), "index.html must have gisis-risk-display");
assert.ok(htmlContent.includes('id="gisis-mitigation-list"'), "index.html must have gisis-mitigation-list");
assert.ok(htmlContent.includes('id="ecfa-diagram-card"'), "index.html must have ecfa-diagram-card");
assert.ok(htmlContent.includes('id="ecfa-diagram-wrap"'), "index.html must have ecfa-diagram-wrap");
assert.ok(htmlContent.includes('id="ecfa-node-details"'), "index.html must have ecfa-node-details");
assert.ok(htmlContent.includes('id="ecfa-synthesis-box"'), "index.html must have ecfa-synthesis-box");
assert.ok(htmlContent.includes('id="maiis-recs-list"'), "index.html must have maiis-recs-list");
assert.ok(htmlContent.includes('id="gisis-export-card"'), "index.html must have gisis-export-card");
assert.ok(htmlContent.includes('id="download-gisis-json-btn"'), "index.html must have download-gisis-json-btn");
assert.ok(htmlContent.includes('id="copy-python-script-btn"'), "index.html must have copy-python-script-btn");

assert.ok(cssContent.includes(".gisis-ecfa-section"), "styles.css must style gisis-ecfa-section");
assert.ok(cssContent.includes(".port-basin-risk-card"), "styles.css must style port-basin-risk-card");
assert.ok(cssContent.includes(".gisis-critical-alert-box"), "styles.css must style gisis-critical-alert-box");
assert.ok(cssContent.includes(".ecfa-diagram-svg"), "styles.css must style ecfa-diagram-svg");
assert.ok(cssContent.includes(".ecfa-node"), "styles.css must style ecfa-node");
assert.ok(cssContent.includes(".gisis-risk-critical"), "styles.css must style gisis-risk-critical");
assert.ok(cssContent.includes(".ecfa-synthesis-box"), "styles.css must style ecfa-synthesis-box");
assert.ok(cssContent.includes(".maiis-recs-list"), "styles.css must style maiis-recs-list");

assert.ok(appContent.includes("renderPortBasinRisk"), "app.js must implement renderPortBasinRisk");
assert.ok(appContent.includes("renderEcfaDiagram"), "app.js must implement renderEcfaDiagram");
assert.ok(appContent.includes("initGisisEcfaModule"), "app.js must implement initGisisEcfaModule");

// 29. Assignment narrative, evidence, and truthful export contract (Issue #38)
assert.ok(htmlContent.includes("KP-965 (GRP, L = 14.2 м)"), "assignment must identify the worked vessel");
assert.ok(htmlContent.includes("Басейн I порту Копер"), "assignment must identify the worked location");
assert.ok(htmlContent.includes("KP-965 = 22 вузли"), "assignment must expose the incident speed");
assert.ok(htmlContent.indexOf('id="gisis-mitigation-title"') < htmlContent.indexOf('id="ecfa-diagram-card"'), "generated measures must precede the ECFA diagram");
assert.ok(htmlContent.includes('id="assignment-sources"'), "assignment must expose a compact official-source section");
for (const sourceLabel of ["GISIS", "MSC-MEPC.3/Circ.4/Rev.1", "A.1075(28)", "Final safety report for less serious marine casualty of Pilot boat KP-965"]) {
  assert.ok(htmlContent.includes(sourceLabel), `assignment sources must include ${sourceLabel}`);
}
assert.ok(htmlContent.includes("базового кейсу KP-965"), "Python export must be labelled as a baseline-case reproduction");
assert.ok(appContent.includes("async function copyPythonAssignment"), "clipboard UI must have an observable asynchronous boundary");
assert.ok(runtimeContent.includes("await copyText("), "clipboard success must wait for the real write operation");
assert.ok(appContent.includes("Не вдалося скопіювати"), "clipboard denial must produce truthful failure feedback");
assert.ok(htmlContent.includes('id="python-copy-fallback"'), "clipboard denial must reveal a manual-copy fallback");
assert.ok(htmlContent.includes('id="python-script-preview"'), "manual-copy fallback must expose the complete Python script");
assert.ok(appContent.includes("reproduces the KP-965 baseline"), "English export copy must retain the fixed-baseline disclosure");
assert.ok(appContent.includes("воспроизводит базовый кейс KP-965"), "Russian export copy must retain the fixed-baseline disclosure");

// 30. Assignment responsive containment contract
assert.match(cssContent, /\.gisis-grid\s*>\s*\*[^}]*min-width:\s*0/s, "assignment grid children must be allowed to shrink");
assert.match(cssContent, /\.ecfa-diagram-wrap[^}]*overscroll-behavior-inline:\s*contain/s, "wide ECFA content must scroll only inside its labelled region");
assert.match(cssContent, /@media \(max-width: 620px\)[\s\S]*?\.gisis-export-actions[^}]*flex-direction:\s*column/s, "mobile export actions must stack");
assert.match(cssContent, /@media \(max-width: 620px\)[\s\S]*?\.gisis-export-actions \.button[^}]*width:\s*100%/s, "mobile export buttons must use the available width");
assert.match(cssContent, /@media \(max-width: 620px\)[\s\S]*?\.port-basin-risk-card[^}]*padding:/s, "mobile assignment cards need compact padding");

console.log("All platform feature checks passed.");




