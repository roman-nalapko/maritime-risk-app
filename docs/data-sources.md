# Data-source plan

## Candidate official sources

| Source | Intended use | Access notes |
| --- | --- | --- |
| [MAIB Data Portal](https://maps.dft.gov.uk/maib-data-portal/web-pages/download_files_section.html) | Occurrences, vessels, affected persons; first import pipeline | Downloadable linked CSV tables |
| [EMSA / EMCIP](https://www.emsa.europa.eu/emcip.html) | European trends and taxonomy cross-check | Public reports; full EMCIP access varies |
| [IMO GISIS MCI](https://www.imo.org/en/ourwork/msas/pages/casualties.aspx) | Investigation reports and lessons learned | Public account available; some records restricted |
| [Shipping Administration of Ukraine](https://marad.gov.ua/ua/diyalnist/stan-avarijnosti-ta-bezpeki-sudnoplavstva-na-vodnomu-transporti) | Ukrainian maritime and inland-waterway context | Primarily periodic reports/PDFs |
| [EMSA STCW-IS](https://portal.emsa.europa.eu/web/stcw/seafarers-stats) | Seafarer population context | Public statistical views and reports |

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

## Prototype data

`src/data/incidents.sample.json` is synthetic demonstration data. It exists to validate interaction and presentation and must not be used for empirical conclusions.
