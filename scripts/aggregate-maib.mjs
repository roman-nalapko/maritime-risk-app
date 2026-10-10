import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { stableJson } from "./import-maib.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const DEFAULT_MINIMUM_CELL = 5;

const ROLE_GROUPS = {
  deck_officer: "deck",
  deck_rating: "deck",
  engine_officer: "engine",
  engine_rating: "engine",
  electro_technical: "engine",
  cadet_trainee: "cadet",
  fishing_crew: "fishing",
  other_crew: "other_crew",
  hotel_service: "other_crew",
  pilot: "other_crew",
  non_crew_onboard: "non_crew",
  unknown: "unknown"
};

const OUTCOMES = {
  injured: "injury",
  fatal: "fatal",
  fatal_presumed: "fatal",
  no_injury: "none"
};

function yearOf(occurrence) {
  const occurredYear = Number.parseInt(String(occurrence.occurredMonth ?? "").slice(0, 4), 10);
  return Number.isInteger(occurredYear) ? occurredYear : occurrence.yearReported;
}

export function aggregateMaib({ occurrences, vessels, affectedPersons }, options = {}) {
  const from = options.from ?? 2020;
  const to = options.to ?? 2025;
  const minimumCellCount = options.minimumCellCount ?? DEFAULT_MINIMUM_CELL;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) throw new Error("Invalid reporting period");
  if (!Number.isInteger(minimumCellCount) || minimumCellCount < DEFAULT_MINIMUM_CELL) throw new Error("minimumCellCount must be at least 5");

  const occurrenceById = new Map(occurrences.map((item) => [item.sourceOccurrenceId, item]));
  const vesselById = new Map(vessels.map((item) => [item.sourceVesselId, item]));
  const cellCounts = new Map();
  let excludedOutsidePeriod = 0;
  let excludedNotConnected = 0;

  for (const person of affectedPersons) {
    const occurrence = occurrenceById.get(person.sourceOccurrenceId);
    const vessel = vesselById.get(person.sourceVesselId);
    if (!occurrence || !vessel) throw new Error("Normalized MAIB foreign keys do not reconcile");
    const year = yearOf(occurrence);
    if (!Number.isInteger(year) || year < from || year > to) {
      excludedOutsidePeriod += 1;
      continue;
    }
    if (occurrence.connectedToVesselOperations === false) {
      excludedNotConnected += 1;
      continue;
    }
    const cell = {
      role: ROLE_GROUPS[person.roleGroup] ?? "unknown",
      vessel: vessel.vesselGroup ?? "unknown",
      eventType: occurrence.eventGroup ?? "unknown",
      severity: OUTCOMES[person.outcome] ?? "none",
      year
    };
    const key = JSON.stringify(cell);
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }

  const allCells = [...cellCounts.entries()].map(([key, count]) => ({ ...JSON.parse(key), count }));
  const cells = allCells
    .filter((cell) => cell.count >= minimumCellCount)
    .sort((a, b) => a.year - b.year || a.role.localeCompare(b.role) || a.vessel.localeCompare(b.vessel) || a.eventType.localeCompare(b.eventType) || a.severity.localeCompare(b.severity));
  const suppressed = allCells.filter((cell) => cell.count < minimumCellCount);
  const publishedRecords = cells.reduce((sum, cell) => sum + cell.count, 0);
  const suppressedRecords = suppressed.reduce((sum, cell) => sum + cell.count, 0);

  return {
    schemaVersion: "1.0.0",
    unit: "affected_person_record",
    measure: "count",
    reportingPeriod: { from, to },
    cells,
    totals: {
      publishedRecords,
      publishedCells: cells.length,
      suppressedRecords,
      suppressedCells: suppressed.length,
      excludedOutsidePeriod,
      excludedNotConnected
    },
    suppression: {
      minimumCellCount,
      rule: "Cells with fewer than five affected-person records are omitted. Displayed totals therefore exclude suppressed records."
    }
  };
}

async function run({ inputDirectory, outputFile, from, to, minimumCellCount }) {
  const [occurrences, vessels, affectedPersons] = await Promise.all([
    readFile(path.join(inputDirectory, "occurrences.normalized.json"), "utf8").then(JSON.parse),
    readFile(path.join(inputDirectory, "vessels.normalized.json"), "utf8").then(JSON.parse),
    readFile(path.join(inputDirectory, "affected-persons.normalized.json"), "utf8").then(JSON.parse)
  ]);
  const aggregate = aggregateMaib({ occurrences, vessels, affectedPersons }, { from, to, minimumCellCount });
  await writeFile(outputFile, stableJson(aggregate));
  return aggregate;
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) values[argv[index]?.replace(/^--/, "")] = argv[index + 1];
  if (!values.input || !values.output) throw new Error("Usage: npm run aggregate:maib -- --input <normalized-directory> --output <public-json> [--from 2020 --to 2025 --minimum-cell 5]");
  return {
    inputDirectory: path.resolve(values.input),
    outputFile: path.resolve(values.output),
    from: Number(values.from ?? 2020),
    to: Number(values.to ?? 2025),
    minimumCellCount: Number(values["minimum-cell"] ?? DEFAULT_MINIMUM_CELL)
  };
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  const result = await run(parseArguments(process.argv.slice(2)));
  console.log(`Published ${result.totals.publishedRecords} affected-person records in ${result.totals.publishedCells} cells; suppressed ${result.totals.suppressedRecords} records.`);
}
