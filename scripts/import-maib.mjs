import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const SCHEMA_VERSION = "1.0.0";
const SOURCE_URL = "https://maps.dft.gov.uk/maib-data-portal/web-pages/download_files_section.html";

export function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV ended inside a quoted field");
  if (field !== "" || row.length) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value !== "")) rows.push(row);
  }
  if (!rows.length) throw new Error("CSV has no rows");

  const headers = rows.shift();
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate headers");
  return rows.map((values, rowIndex) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

const nullable = (value) => value === "" || value == null ? null : value;
const integer = (value) => value === "" || value == null || !Number.isFinite(Number(value)) ? null : Number.parseInt(value, 10);
const decimal = (value) => value === "" || value == null || !Number.isFinite(Number(value)) ? null : Number(value);
const boolean = (value) => value === "True" || value === "Yes" ? true : value === "False" || value === "No" ? false : null;
const mapped = (table, value) => table[value ?? ""] ?? "unknown";

function requireHeaders(rows, required, tableName) {
  if (!rows.length) throw new Error(`${tableName} contains no data rows`);
  const headers = new Set(Object.keys(rows[0]));
  const missing = required.filter((header) => !headers.has(header));
  if (missing.length) throw new Error(`${tableName} is missing required headers: ${missing.join(", ")}`);
}

function assertUnique(rows, key, tableName) {
  const values = new Set();
  for (const row of rows) {
    if (!row[key]) throw new Error(`${tableName} has a blank ${key}`);
    if (values.has(row[key])) throw new Error(`${tableName} has duplicate ${key}: ${row[key]}`);
    values.add(row[key]);
  }
  return values;
}

export function normalizeTables({ occurrences, vessels, affectedPersons }, mapping) {
  requireHeaders(occurrences, ["Occurrence_Id", "Local_Date_Main_Event", "Year_Reported", "Occurrence_Severity", "Main_Event_L1", "Not_Vessel_Operations"], "occurrences");
  requireHeaders(vessels, ["Occurrence_Id", "Vessel_Profile_Id", "Ship_Craft_Type_L1", "Flag_State", "Is_Commercial_Vessel", "Voyage_Segment"], "vessels");
  requireHeaders(affectedPersons, ["Occurrence_Id", "Vessel_Profile_Id", "Affected_Person_Id", "Affected_Person_Type", "Rank", "Physical_Condition_L1"], "affected_persons");

  const occurrenceIds = assertUnique(occurrences, "Occurrence_Id", "occurrences");
  const vesselIds = assertUnique(vessels, "Vessel_Profile_Id", "vessels");
  assertUnique(affectedPersons, "Affected_Person_Id", "affected_persons");
  const vesselOccurrence = new Map(vessels.map((row) => [row.Vessel_Profile_Id, row.Occurrence_Id]));

  for (const row of vessels) {
    if (!occurrenceIds.has(row.Occurrence_Id)) throw new Error(`Orphan vessel ${row.Vessel_Profile_Id}: occurrence ${row.Occurrence_Id} not found`);
  }
  for (const row of affectedPersons) {
    if (!occurrenceIds.has(row.Occurrence_Id)) throw new Error(`Orphan affected person ${row.Affected_Person_Id}: occurrence ${row.Occurrence_Id} not found`);
    if (!vesselIds.has(row.Vessel_Profile_Id)) throw new Error(`Orphan affected person ${row.Affected_Person_Id}: vessel ${row.Vessel_Profile_Id} not found`);
    if (vesselOccurrence.get(row.Vessel_Profile_Id) !== row.Occurrence_Id) throw new Error(`Affected person ${row.Affected_Person_Id} links a vessel to the wrong occurrence`);
  }

  const normalizedOccurrences = occurrences.map((row) => ({
    schemaVersion: SCHEMA_VERSION,
    sourceOccurrenceId: row.Occurrence_Id,
    occurredMonth: nullable(row.Local_Date_Main_Event),
    occurredDateUnconfirmed: boolean(row.Date_Main_Event_Unconfirmed),
    yearReported: integer(row.Year_Reported),
    eventGroup: mapped(mapping.eventGroup.values, row.Main_Event_L1),
    sourceEvent: { level1: nullable(row.Main_Event_L1), level2: nullable(row.Main_Event_L2), level3: nullable(row.Main_Event_L3) },
    sourceOccurrenceSeverity: nullable(row.Occurrence_Severity),
    connectedToVesselOperations: boolean(row.Not_Vessel_Operations) == null ? null : !boolean(row.Not_Vessel_Operations),
    reportingStateGroup: nullable(row.State_Reporting)
  })).sort((a, b) => a.sourceOccurrenceId.localeCompare(b.sourceOccurrenceId));

  const normalizedVessels = vessels.map((row) => ({
    schemaVersion: SCHEMA_VERSION,
    sourceOccurrenceId: row.Occurrence_Id,
    sourceVesselId: row.Vessel_Profile_Id,
    vesselGroup: mapped(mapping.vesselType.values, row.Ship_Craft_Type_L1),
    sourceShipCraftType: {
      level1: nullable(row.Ship_Craft_Type_L1), level2: nullable(row.Ship_Craft_Type_L2), level3: nullable(row.Ship_Craft_Type_L3),
      level4: nullable(row.Ship_Craft_Type_L4), level5: nullable(row.Ship_Craft_Type_L5)
    },
    sourceVesselCategory: { level1: nullable(row.Vessel_Category_L1), level2: nullable(row.Vessel_Category_L2) },
    flagState: nullable(row.Flag_State),
    isCommercial: boolean(row.Is_Commercial_Vessel),
    registeredLengthMetres: decimal(row.Registered_Length_In_Metres),
    grossTonnage: decimal(row.GT_Gross_Tonnage),
    crewOnVoyage: integer(row.Crew_Voyage),
    sourceVoyageSegment: nullable(row.Voyage_Segment),
    operationGroup: mapping.operation.target,
    exposureUnit: mapping.operation.exposureUnit,
    sourceOutcomeTotals: {
      deaths: integer(row.Deaths_Total), injuries: integer(row.Injuries_Total)
    }
  })).sort((a, b) => a.sourceVesselId.localeCompare(b.sourceVesselId));

  const normalizedPeople = affectedPersons.map((row) => ({
    schemaVersion: SCHEMA_VERSION,
    sourceOccurrenceId: row.Occurrence_Id,
    sourceVesselId: row.Vessel_Profile_Id,
    sourceAffectedPersonId: row.Affected_Person_Id,
    roleGroup: row.Affected_Person_Type === "Passenger" ? mapping.role.passengerOverride : mapped(mapping.role.rankValues, row.Rank),
    sourceRole: { personType: nullable(row.Affected_Person_Type), rank: nullable(row.Rank) },
    age: integer(row.Age),
    gender: nullable(row.Gender),
    nationality: nullable(row.Nationality),
    onDutyStatus: nullable(row.On_Duty),
    outcome: mapped(mapping.outcome.values, row.Physical_Condition_L1),
    sourceOutcomeDetail: {
      level1: nullable(row.Physical_Condition_L1), level2: nullable(row.Physical_Condition_L2), level3: nullable(row.Physical_Condition_L3),
      injuryType1: nullable(row.Injury_Type_L1), injuryType2: nullable(row.Injury_Type_L2)
    },
    ppe: { used: nullable(row.PPE_Used), deficient: nullable(row.PPE_Deficient) }
  })).sort((a, b) => a.sourceAffectedPersonId.localeCompare(b.sourceAffectedPersonId));

  return { occurrences: normalizedOccurrences, vessels: normalizedVessels, affectedPersons: normalizedPeople };
}

function actualType(value) {
  if (value === null) return "null";
  if (Number.isInteger(value)) return "integer";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validateRecord(record, schema, label) {
  for (const field of schema.required) {
    if (!(field in record)) throw new Error(`${label} missing required field ${field}`);
  }
  for (const [field, definition] of Object.entries(schema.properties)) {
    if (!(field in record)) continue;
    const allowed = Array.isArray(definition.type) ? definition.type : [definition.type];
    if (!allowed.includes(actualType(record[field]))) throw new Error(`${label}.${field} has invalid type ${actualType(record[field])}`);
  }
}

export function validateNormalized(bundle, schema) {
  const definitions = schema.$defs;
  bundle.occurrences.forEach((record, index) => validateRecord(record, definitions.occurrence, `occurrences[${index}]`));
  bundle.vessels.forEach((record, index) => validateRecord(record, definitions.vessel, `vessels[${index}]`));
  bundle.affectedPersons.forEach((record, index) => validateRecord(record, definitions.affectedPerson, `affectedPersons[${index}]`));
  return true;
}

export const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const coverage = (records, field) => {
  const unknown = records.filter((record) => record[field] === "unknown").length;
  const mappedCount = records.length - unknown;
  return { total: records.length, mapped: mappedCount, unknown, percent: Number(((mappedCount / records.length) * 100).toFixed(2)) };
};

export async function runImport({ inputDirectory, outputDirectory, retrievedOn }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrievedOn ?? "")) throw new Error("--retrieved-on must use YYYY-MM-DD");
  const filenames = { occurrences: "occurrences.csv", vessels: "vessels.csv", affectedPersons: "affected_persons.csv" };
  const buffers = Object.fromEntries(await Promise.all(Object.entries(filenames).map(async ([key, filename]) => [key, await readFile(path.join(inputDirectory, filename))])));
  const tables = Object.fromEntries(Object.entries(buffers).map(([key, buffer]) => [key, parseDelimited(buffer.toString("utf8"))]));
  const mapping = JSON.parse(await readFile(path.join(root, "data/mappings/maib-to-maritime-taxonomy.v1.json"), "utf8"));
  const schema = JSON.parse(await readFile(path.join(root, "data/schemas/maib-normalized.schema.json"), "utf8"));
  const bundle = normalizeTables(tables, mapping);
  validateNormalized(bundle, schema);

  const sources = Object.fromEntries(Object.entries(filenames).map(([key, filename]) => [key, {
    filename, url: `${SOURCE_URL.replace("/web-pages/download_files_section.html", "")}/csv-files/${filename}`,
    retrievedOn, sha256: sha256(buffers[key]), rows: tables[key].length
  }]));
  const report = {
    importId: `MAIB-${retrievedOn}-${mapping.version}`,
    mappingVersion: mapping.version,
    schemaVersion: schema.version,
    sources,
    validation: { uniqueKeys: true, foreignKeys: true, schema: true },
    coverage: {
      vesselType: coverage(bundle.vessels, "vesselGroup"),
      role: coverage(bundle.affectedPersons, "roleGroup"),
      operation: coverage(bundle.vessels, "operationGroup"),
      outcome: coverage(bundle.affectedPersons, "outcome"),
      eventGroup: coverage(bundle.occurrences, "eventGroup")
    }
  };
  const manifest = { sourcePublisher: "Marine Accident Investigation Branch", sourcePage: SOURCE_URL, retrievedOn, mappingId: mapping.id, schemaId: schema.$id, artifacts: {} };

  await mkdir(outputDirectory, { recursive: true });
  for (const [key, records] of Object.entries(bundle)) {
    const filename = `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}.normalized.json`;
    const content = stableJson(records);
    await writeFile(path.join(outputDirectory, filename), content);
    manifest.artifacts[key] = { filename, sha256: sha256(content), rows: records.length };
  }
  await writeFile(path.join(outputDirectory, "import-report.json"), stableJson(report));
  await writeFile(path.join(outputDirectory, "manifest.json"), stableJson(manifest));
  return { bundle, report, manifest };
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) values[argv[index]?.replace(/^--/, "")] = argv[index + 1];
  if (!values.input || !values.output || !values["retrieved-on"]) {
    throw new Error("Usage: npm run import:maib -- --input <directory> --output <directory> --retrieved-on YYYY-MM-DD");
  }
  return { inputDirectory: path.resolve(values.input), outputDirectory: path.resolve(values.output), retrievedOn: values["retrieved-on"] };
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  const result = await runImport(parseArguments(process.argv.slice(2)));
  console.log(`Imported ${result.bundle.occurrences.length} occurrences, ${result.bundle.vessels.length} vessels, and ${result.bundle.affectedPersons.length} affected persons.`);
  console.log(`Artifacts written to ${path.resolve(parseArguments(process.argv.slice(2)).outputDirectory)}`);
}
