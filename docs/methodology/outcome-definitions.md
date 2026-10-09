# Outcome definitions and intended use

Decision status: **accepted for research model design; domain review required**  
Decision date: **2026-10-09**  
Applies to: **M1 — Methodology v1.0**

## Decision summary

SeaRisk UA will not treat “general mortality”, “occupational injury”, “marine casualty”, and “incident share” as one interchangeable risk value.

The first reviewed model will target an adult worker engaged on board a ship and will report separate outcomes:

1. **Primary outcome:** annual individual risk of fatal occupational injury connected with ship operations.
2. **Secondary outcome:** annual individual risk of non-fatal occupational injury, only when a compatible exposure denominator and reporting threshold are available.
3. **Secondary severity outcome:** serious occupational injury, using the IMO serious-injury threshold when the source data supports it.
4. **Context only:** distribution of marine casualties, marine incidents, event types, and consequences among recorded reports.

The current `SR-UA-PROTOTYPE-0.1` calculation is an **educational demonstration index**, not a validated probability. Its components use incompatible outcomes and source populations and therefore cannot be presented as a probability of injury or death.

## Target population

The first model is limited to:

- adults aged 18 or older;
- currently engaged or employed in work or supervised training on board a ship;
- commercial, service, passenger, tanker, and fishing-vessel operations where compatible data exists;
- a declared exposure profile for the following 12 months.

For terminology, an onboard worker aligns with the IMO definition of a seafarer: a person employed, engaged, or working in any capacity aboard a ship.

The following require separate populations and coefficient sets and are not part of the first model:

- shore-based port workers;
- recreational passengers and leisure craft users;
- military operations where public civilian data is not comparable;
- offshore installation workers not engaged as shipboard personnel;
- minors;
- people not currently exposed to maritime work.

Cadets may be included only when their onboard training is represented in both numerator and denominator data. Divers may be included only for operations whose population and exposure definition matches the source.

## Time horizon

An individual estimate covers the **next 12 months from the assessment date**, conditional on the declared planned exposure.

The model must not automatically treat a historical calendar-year rate as a personal next-12-month probability. Conversion is permitted only when:

- the numerator and denominator cover a compatible population and period;
- the exposure unit is explicit;
- the conversion method and assumptions are documented;
- uncertainty is reported.

## Controlled vocabulary

### Marine casualty

An event or sequence directly connected with ship operations that results in consequences such as death or serious injury, loss of a person from a ship, ship loss or material damage, collision/stranding/disabling, serious danger from infrastructure damage, or severe environmental damage. Deliberate harmful acts are excluded from the IMO definition.

This is an **occurrence-level** concept and is not itself an individual probability.

### Marine incident

An event or sequence directly connected with ship operations, other than a marine casualty, that endangered or could have endangered a ship, people, or the environment if not corrected.

An incident may have no injury outcome. Incident counts must not be presented as injury probabilities.

### Occupational accident

An unexpected and unplanned occurrence arising out of or in connection with work that results in personal injury, disease, or death. Commuting accidents are outside the first model and, if studied, must be reported separately.

### Case of occupational injury

One worker incurring an occupational injury from one occupational accident. If multiple workers are injured in one occurrence, they represent multiple injury cases but one occurrence.

### Non-fatal occupational injury

An occupational injury not resulting in death. For cross-source statistics, the reporting threshold must be stored with the dataset. The preferred baseline follows the ILO coverage recommendation: absence from work of at least one day, excluding the day of the accident. Sources using a different threshold cannot be silently pooled.

### Serious occupational injury

For maritime compatibility, the first model adopts the IMO serious-injury definition when supported by source fields: an injury causing inability to function normally for more than 72 hours, with that incapacity beginning within seven days of the injury.

This is not synonymous with every non-fatal injury or with permanent disability.

### Fatal occupational injury

An occupational injury leading to death within one year of the occupational accident. The case is attributed to the reference period in which the accident occurred, following the ILO statistical convention.

### Very serious marine casualty

An occurrence-level severity class involving total loss of a ship, a death, or severe environmental damage. It must not be used as a synonym for “fatal injury”, because the category includes non-person consequences.

## Output contract

Future reviewed outputs must use explicit names and denominators:

| Output | Unit | Permitted interpretation |
| --- | --- | --- |
| `fatalOccupationalInjuryRisk12m` | probability over 12 months | Individual model estimate, only after validation |
| `nonFatalOccupationalInjuryRisk12m` | probability over 12 months | Separate estimate with documented reporting threshold |
| `seriousInjuryRisk12m` | probability over 12 months | Separate estimate using the stated severity definition |
| `incidentShare` | percent of recorded occurrences | Descriptive distribution only |
| `severityGivenIncident` | percent of recorded outcomes conditional on incident | Conditional distribution only |
| `exposureRate` | cases per declared exposure unit | Population statistic, not automatically personal probability |

General mortality, smoking-related mortality, chronic disease, and alcohol-related mortality may appear in a separate educational wellbeing module, but they cannot be added to the occupational injury model. A personal health factor may modify an occupational model only when an authoritative, compatible effect estimate is available and approved.

## Intended users

- maritime cadets and adult shipboard workers exploring controllable risk factors;
- instructors demonstrating risk concepts and data limitations;
- occupational or maritime safety specialists reviewing model assumptions;
- researchers exploring aggregated incident patterns.

## Permitted uses

- education and safety awareness;
- research prototyping;
- discussion of exposure factors and prevention;
- descriptive analysis of anonymized aggregate incidents;
- evaluation of model transparency and user comprehension.

## Prohibited uses

SeaRisk UA must not be used to:

- certify safety or compliance;
- declare a person fit or unfit for duty;
- make hiring, dismissal, promotion, disciplinary, insurance, or compensation decisions;
- provide a medical diagnosis or treatment recommendation;
- authorize or reject a voyage or real-time navigation decision;
- rank identifiable workers;
- claim a precise personal probability from incident counts without a compatible exposure denominator;
- assign blame or liability for an incident.

## Evidence reviewed

- [IMO Resolution MSC.255(84), Casualty Investigation Code](https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.255%2884%29.pdf): definitions of marine casualty, marine incident, seafarer, serious injury, very serious marine casualty, and prevention-focused investigation.
- [IMO MSC-MEPC.3/Circ.4/Rev.1](https://wwwcdn.imo.org/localresources/en/OurWork/MSAS/Documents/MSC-MEPC3/MSC-MEPC.3-Circ.4%20Rev%201%20%20Revised%20harmonized%20reporting%20procedures%20-%20Reports%20required%20under%20SOLAS%20regulations%20I21.pdf): occurrence severity, event, task, rank, and contributing-factor reporting fields.
- [ILO resolution on occupational-injury statistics](https://webapps.ilo.org/ilostat-files/SSM/SSM8/E/ANNEX.html): occupational accident/injury definitions, one-worker case unit, fatal-injury convention, coverage threshold, and hours-worked denominator.
- [EMSA EMCIP](https://www.emsa.europa.eu/emcip.html) and [EMCIP taxonomy](https://emsa.europa.eu/we-do/safety/accident-investigation/item/3024-emcip-taxonomy.html): separation of casualties with ships and occupational accidents, anonymized occurrence data, and European taxonomy context.
- [Directive 2009/18/EC](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32009L0018): EU accident-investigation framework and reliance on IMO definitions.

## Remaining review questions

- Which worker groups and ship types have compatible exposure denominators?
- Should non-fatal injury use one-day absence, IMO 72-hour incapacity, or multiple separately labelled thresholds?
- How should occupational disease be handled, given that it is not an occupational accident outcome?
- Can cadets and divers be supported without mixing materially different exposure populations?
- Which national definitions must be shown alongside IMO/ILO terms for Ukrainian use?

