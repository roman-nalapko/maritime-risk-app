# Data-source plan

## Candidate official sources

| Source | Intended use | Access notes |
| --- | --- | --- |
| [MAIB Data Portal](https://maps.dft.gov.uk/maib-data-portal/web-pages/download_files_section.html) | Occurrences, vessels, affected persons; first import pipeline | Downloadable linked CSV tables |
| [EMSA / EMCIP](https://www.emsa.europa.eu/emcip.html) | European trends and taxonomy cross-check | Public reports; full EMCIP access varies |
| [IMO GISIS MCI](https://www.imo.org/en/ourwork/msas/pages/casualties.aspx) | Investigation reports and lessons learned | Public account available; some records restricted |
| [Shipping Administration of Ukraine](https://marad.gov.ua/ua/diyalnist/stan-avarijnosti-ta-bezpeki-sudnoplavstva-na-vodnomu-transporti) | Ukrainian maritime and inland-waterway context | Primarily periodic reports/PDFs |
| [EMSA STCW-IS](https://portal.emsa.europa.eu/web/stcw/seafarers-stats) | Seafarer population context | Public statistical views and reports |

## Current source status (2026-10-10)

| Source | Product status | Reason |
| --- | --- | --- |
| MAIB | **Published as aggregate v1.0** | Structured linked CSV tables; 2020–2025 affected-person records; small cells suppressed |
| EMSA annual overview / EMCIP | Reference and European trend context; structured extraction pending | Published reports are aggregate and use a different scope; they must not be merged as MAIB rows |
| IMO GISIS | Linked reference only | Search and some material require an account or restricted access; no access control is bypassed |
| Shipping Administration of Ukraine | Ukrainian context; report extraction pending | Periodic reports require source-by-source table validation and terminology mapping |
| EMSA STCW-IS | Denominator candidate only | Population totals are not yet compatible with the MAIB numerator scope |

## Import policy

1. Keep raw downloads outside the public application bundle.
2. Record retrieval date, source URL, license/usage terms, and checksum.
3. Normalize to the schema in `data/incident.schema.json`.
4. Remove direct personal identifiers.
5. Produce aggregate JSON containing only fields required by the UI.
6. Run consistency checks before publishing.

## Denominator requirement

Counts alone support recorded-incident distributions, not individual risk. A statistical risk estimate must document an exposure denominator such as worker-hours, voyages, operations, vessel-years, or exposed-worker population for the same scope and period.

All imports must preserve original source values and map role, vessel, operation, and exposure fields through [maritime taxonomy v1.0.0](methodology/maritime-taxonomy.md). Event type and operation are separate fields; missing values remain `unknown`.

Candidate workforce, fleet, arrival, and passenger denominators are inventoried in [the exposure and uncertainty review](methodology/exposure-and-uncertainty.md). None is currently compatible with a MAIB-derived personal worker rate.

The field-level import contract, controlled value crosswalk, and measured coverage are defined in [MAIB public data mapping v1.0.0](methodology/maib-field-mapping.md). Its unresolved values remain `unknown` pending specialist review.

Run the offline importer after downloading the three official CSV files:

```bash
npm run import:maib -- --input work/maib-source --output work/maib-build --retrieved-on YYYY-MM-DD
```

The command produces three normalized table-grain artifacts, a provenance manifest, and an import report. It performs no network requests.

Imported data is not automatically publishable. The [public data release policy](data-release-policy.md) blocks unlicensed, identifying, record-level, or undersized external data during every build.

## Prototype data

The default product dataset is `src/data/incidents.maib.aggregate.json`. Its unit is an **affected-person record**, not a unique incident, vessel, worker population, or hour of exposure. The dashboard therefore reports descriptive shares only.
