import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const DEFAULT_MINIMUM_CELL = 5;
const FORBIDDEN_KEYS = new Set([
  "name", "fullName", "email", "phone", "address", "dateOfBirth",
  "sourceAffectedPersonId", "affectedPersonId", "latitude", "longitude",
  "shortDescription", "description"
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Release check failed: ${message}`);
}

function inspectKeys(value, location = "root") {
  if (Array.isArray(value)) return value.forEach((item, index) => inspectKeys(item, `${location}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    assert(!FORBIDDEN_KEYS.has(key), `${location}.${key} is not allowed in the public bundle`);
    inspectKeys(nested, `${location}.${key}`);
  }
}

export function validateReleaseDataset(entry, data) {
  assert(entry.id && entry.file, "every dataset needs id and file");
  assert(["synthetic", "aggregate"].includes(entry.releaseMode), `${entry.id} must be synthetic or aggregate; record-level external data is blocked`);
  assert(entry.source?.publisher && entry.source?.url && entry.source?.retrievedOn, `${entry.id} lacks source provenance`);
  assert(entry.license?.status === "approved", `${entry.id} licence is not approved`);
  assert(entry.license?.id && entry.license?.attribution, `${entry.id} lacks licence id or attribution`);
  assert(entry.privacy?.status === "reviewed", `${entry.id} privacy review is incomplete`);
  assert(entry.privacy?.directIdentifiersRemoved === true, `${entry.id} may contain direct identifiers`);
  assert(entry.quality?.status === "approved", `${entry.id} quality status is not approved`);
  inspectKeys(data, entry.id);

  if (entry.releaseMode === "synthetic") {
    assert(entry.privacy.containsRealPeople === false, `${entry.id} synthetic data cannot contain real people`);
    assert(Array.isArray(data), `${entry.id} synthetic data must be an array`);
    assert(data.every((record) => String(record.id ?? "").startsWith("DEMO-")), `${entry.id} contains an unlabelled synthetic record`);
  }

  if (entry.releaseMode === "aggregate") {
    const minimum = entry.quality.minimumCellCount;
    assert(Number.isInteger(minimum) && minimum >= DEFAULT_MINIMUM_CELL, `${entry.id} minimum aggregation size must be at least ${DEFAULT_MINIMUM_CELL}`);
    assert(Array.isArray(data.cells), `${entry.id} aggregate data must expose a cells array`);
    assert(data.cells.every((cell) => Number.isInteger(cell.count) && cell.count >= minimum), `${entry.id} contains a cell below its minimum aggregation size`);
  }
  return true;
}

export async function runReleaseChecks(dataDirectory = path.join(root, "src/data")) {
  const manifestPath = path.join(dataDirectory, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version ?? ""), "release manifest needs a semantic version");
  assert(Array.isArray(manifest.datasets) && manifest.datasets.length, "release manifest contains no datasets");

  const files = (await readdir(dataDirectory)).filter((file) => file.endsWith(".json") && file !== "release-manifest.json").sort();
  const declared = manifest.datasets.map((entry) => entry.file).sort();
  assert(new Set(declared).size === declared.length, "release manifest contains duplicate files");
  assert(JSON.stringify(files) === JSON.stringify(declared), `public data files and manifest differ (files=${files.join(",")}; declared=${declared.join(",")})`);

  for (const entry of manifest.datasets) {
    const data = JSON.parse(await readFile(path.join(dataDirectory, entry.file), "utf8"));
    validateReleaseDataset(entry, data);
  }
  return { manifestVersion: manifest.version, datasetsChecked: manifest.datasets.length };
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  const result = await runReleaseChecks();
  console.log(`Release checks passed for ${result.datasetsChecked} dataset(s), manifest ${result.manifestVersion}.`);
}
