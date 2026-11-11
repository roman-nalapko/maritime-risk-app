# Public data release policy

## Purpose

No external data enters the public browser bundle merely because it passed import validation. Release requires a separate quality, licensing, and privacy gate.

The build executes `npm run release:check` automatically and fails if a rule below is violated.

## Blocking rules

A dataset is blocked when any of the following is true:

- it is not declared in `src/data/release-manifest.json`;
- its source publisher, URL, or retrieval date is absent;
- licence status is not explicitly `approved`, or attribution text is absent;
- privacy review is incomplete or direct-identifier removal is not affirmed;
- quality status is not approved;
- external record-level data is placed in the public bundle;
- an aggregate cell contains fewer than five records;
- direct identifiers, exact coordinates, person-level source IDs, or free-text accident descriptions are present;
- synthetic records are not labelled with `DEMO-` IDs or might represent real people.

The minimum cell count of five is a floor, not proof of anonymity. A privacy reviewer may require larger aggregation based on geography, role rarity, time window, or linkage risk. Statistical display rules in `docs/methodology/exposure-and-uncertainty.md` remain stricter for rate stability.

## MAIB usage and licensing decision

The [MAIB Data Portal](https://maps.dft.gov.uk/maib-data-portal/web-pages/index.html) describes its downloads as a subset of anonymised, releasable accident data and warns that records may change between releases. UK government terms state that most content is Crown copyright and available under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) unless otherwise indicated. No contrary notice was found on the inspected MAIB download pages.

SeaRisk UA therefore permits a narrow OGL v3.0 release of derived, non-substitutive aggregates with the attribution: “Contains public sector information licensed under the Open Government Licence v3.0. Source: Marine Accident Investigation Branch.” The decision excludes logos, third-party material, free-text descriptions, images, and person-level rows. If MAIB or DfT publishes contrary dataset-specific terms, publication must stop until the manifest and use are reviewed.

The release manifest records the three extract hashes, retrieval date, mapping version, OGL link, privacy status, suppression threshold, and limitations. Raw and normalized records remain ignored build artifacts under `work/`; only aggregate cells at `n >= 5` enter `src/data` and `dist/data`.

## Data minimisation

Public output may contain only the fields required for aggregate charts. It must not contain:

- names or contact information;
- `Affected_Person_Id` or equivalent person-level source keys;
- exact age combined with rare role/location detail;
- exact latitude/longitude;
- free-text descriptions that may identify a person or vessel;
- raw nationality, medical, injury, or PPE detail at person level.

Occurrence and vessel source keys may exist in private offline processing when required for deduplication, but must be removed before public release.

## Approved release modes

- `synthetic`: explicitly fictional records used for UI demonstrations.
- `aggregate`: reviewed cells at or above the declared minimum size, with no record-level rows.

External `record_level` release is blocked by design.

## Attribution

Every public external dataset must expose its publisher, source link, period, extraction date, licence identifier/link, attribution, mapping version, sample size, and active filters in the product. Absence of any of these is a release blocker.
