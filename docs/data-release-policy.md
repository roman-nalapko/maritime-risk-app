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

## MAIB usage and licensing status

The [MAIB Data Portal](https://maps.dft.gov.uk/maib-data-portal/web-pages/index.html) describes its download as a subset of anonymised, releasable accident data and warns that records may change between releases. The portal page inspected for this project does not display a dataset-specific licence or attribution statement.

UK government guidance identifies the Open Government Licence as the default for Crown copyright information, but the project will not infer a dataset-specific grant from that general rule. Before MAIB-derived aggregates are shipped, the release manifest must record:

1. confirmation of the applicable licence/version from MAIB or DfT;
2. the required attribution wording;
3. the source extract hashes and retrieval date;
4. any third-party or personal-information exclusions.

Until this is confirmed, MAIB-derived files remain research/build artifacts under `work/` and are not copied into `src/data` or `dist/data`.

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
