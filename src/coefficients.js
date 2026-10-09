export const REGISTRY_ID = "SR-UA-COEFFICIENTS-0.1.0";
export const MODEL_VERSION = "SR-UA-PROTOTYPE-0.1";

const educationalSource = Object.freeze({
  source: "User-supplied 2013 educational tables; see docs/methodology/educational-source-audit.md",
  sourceVersion: "2013 teaching material; primary dataset not reported",
  period: "not reported",
  status: "disputed",
  eligibleForApprovedModel: false
});

const syntheticSource = Object.freeze({
  source: "SeaRisk UA prototype design assumption",
  sourceVersion: "prototype 0.1",
  period: "not applicable",
  status: "synthetic_demo",
  eligibleForApprovedModel: false
});

function record(id, value, unit, population, provenance) {
  return Object.freeze({
    id,
    value,
    unit,
    population,
    period: provenance.period,
    source: provenance.source,
    sourceVersion: provenance.sourceVersion,
    modelVersion: MODEL_VERSION,
    status: provenance.status,
    eligibleForApprovedModel: provenance.eligibleForApprovedModel
  });
}

export const COEFFICIENTS = Object.freeze({
  ageBaseline: record(
    "prototype.health.age_baseline",
    [[20, 0.0003], [25, 0.0004], [30, 0.0005], [35, 0.0009], [40, 0.0016], [45, 0.0027], [50, 0.0048], [55, 0.0084], [60, 0.015], [65, 0.025], [70, 0.038], [75, 0.059], [80, 0.091], [null, 0.143]],
    "dimensionless educational index by upper age bound",
    "unspecified general population",
    educationalSource
  ),
  demographicMultiplier: record(
    "prototype.health.demographic_multiplier",
    { city: { male: 1.45, female: 0.38 }, village: { male: 1.7, female: 0.42 } },
    "dimensionless multiplier",
    "unspecified population grouped by sex and residence",
    educationalSource
  ),
  hourlyRoleRate: record(
    "prototype.occupation.hourly_role_rate",
    { deck: 6e-7, engine: 5e-7, officer: 3e-7, port: 1.2e-7, cadet: 5e-8, diver: 6e-6 },
    "educational index per hour",
    "mixed occupation proxies; not a defined maritime cohort",
    educationalSource
  ),
  lifestyle: record(
    "prototype.lifestyle.annual_contribution",
    { smoking: 0.008, alcohol: 0.000212 },
    "dimensionless educational index per person-year",
    "unspecified general population",
    educationalSource
  ),
  chronicMultiplier: record(
    "prototype.health.chronic_marker_multiplier",
    1.25,
    "dimensionless multiplier",
    "synthetic demonstration profiles",
    syntheticSource
  ),
  nightExposureSlope: record(
    "prototype.occupation.night_exposure_slope",
    0.6,
    "dimensionless multiplier per full night-work share",
    "synthetic demonstration profiles",
    syntheticSource
  ),
  ppeMultiplier: record(
    "prototype.occupation.ppe_multiplier",
    0.75,
    "dimensionless multiplier",
    "synthetic demonstration profiles",
    syntheticSource
  ),
  previousIncidentMultiplier: record(
    "prototype.occupation.previous_incident_multiplier",
    1.2,
    "dimensionless multiplier",
    "synthetic demonstration profiles",
    syntheticSource
  )
});

export const REQUIRED_METADATA = Object.freeze([
  "id", "value", "unit", "population", "period", "source",
  "sourceVersion", "modelVersion", "status", "eligibleForApprovedModel"
]);

export function validateRegistry(registry = COEFFICIENTS) {
  const ids = new Set();
  for (const [key, item] of Object.entries(registry)) {
    for (const field of REQUIRED_METADATA) {
      if (!(field in item) || item[field] === "") throw new Error(`${key} is missing coefficient metadata: ${field}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate coefficient id: ${item.id}`);
    ids.add(item.id);
    if (item.status === "approved" && item.eligibleForApprovedModel !== true) {
      throw new Error(`${item.id} has contradictory approval metadata`);
    }
  }
  return true;
}

export function approvedValue(key) {
  const item = COEFFICIENTS[key];
  if (!item) throw new Error(`Unknown coefficient: ${key}`);
  if (item.status !== "approved" || item.eligibleForApprovedModel !== true) {
    throw new Error(`Coefficient ${item.id} is not approved for operational calculation`);
  }
  return item.value;
}

validateRegistry();
