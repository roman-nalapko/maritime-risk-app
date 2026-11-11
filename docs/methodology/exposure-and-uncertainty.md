# Exposure denominators and statistical uncertainty

## Decision

Research decision ID: `SR-UA-DENOMINATOR-REVIEW-1.0.0`

**No-go for personal statistical injury or fatality rates from the currently identified public MAIB and DfT datasets.** The available incident numerators and workforce denominators do not cover the same people, geography, vessels, or exposure time. Joining them would create a precise-looking but invalid personal probability.

The following uses remain possible:

- **Go:** counts, recorded-incident shares, and severity given a recorded incident, with source scope and sample size shown.
- **Conditional:** vessel-year occurrence rates for a strictly matched UK-registered fleet and period, after record-level scope validation.
- **Conditional:** occurrence rates per UK commercial port arrival for a narrowly defined port-operation analysis, never as a worker probability.
- **No-go:** worker-hour, operation-count, and voyage-level personal rates until compatible denominators are obtained.

This decision applies to public data reviewed on 2026-10-09. It can change only when a compatible numerator and denominator pass the checks below.

## Source inventory

| Source | Candidate measure | Population, geography, period | Compatibility finding | Decision |
| --- | --- | --- | --- | --- |
| [MAIB Data Portal](https://maps.dft.gov.uk/maib-data-portal/web-pages/download_files_section.html) | Occurrences, involved vessels, affected persons | Releasable subset of reported occurrences; MAIB scope covers UK vessels worldwide and vessels in UK territorial waters | Numerator source. It contains no complete exposed workforce, worked hours, voyages, or operation counts. Coverage dates and extract date must be read from every download. | Use for descriptive incident statistics |
| [DfT seafarer statistics](https://www.gov.uk/government/statistics/seafarers-in-the-uk-shipping-industry-2025) | Estimated UK seafarers active at sea, with officer/rating/cadet breakdowns | UK nationals plus selected UK shipping-industry measures; estimates combine certification data and a Chamber of Shipping survey with assumptions and non-response adjustment | Does not match the nationality, flag, geography, employer coverage, or exposure time of MAIB affected persons. It is a stock estimate, not worker-hours. | Do not divide MAIB casualties by this estimate |
| [DfT UK fleet statistics](https://www.gov.uk/government/statistical-data-sets/shipping-fleet-statistics) | Registered-vessel counts and tonnage | UK Ship Register and trading-fleet tables; definitions and size thresholds vary by table | Potential denominator only for MAIB records restricted to the same registration, vessel definitions, and period. End-of-year counts are not automatically vessel-years. | Conditional vessel-level pilot |
| [DfT port-arrival statistics](https://www.gov.uk/government/statistics/port-freight-annual-statistics-2024/port-freight-annual-statistics-2024-arrivals) | Commercial cargo and passenger ship arrivals at UK ports | UK port arrivals; compiled from several sources including CERS; coverage may be variable at the margins | Can support a narrow arrival-level rate only if numerator is restricted to matching commercial vessel types, ports, operations, and years. Does not measure people or time at risk. | Conditional operation-context pilot |
| [DfT sea-passenger statistics](https://www.gov.uk/government/collections/maritime-and-shipping-statistics) | Passenger journeys | International and domestic passenger traffic handled at UK ports | Potential passenger-journey denominator, not a seafarer workforce denominator. Route and casualty coverage still need reconciliation. | Out of scope for worker model |
| ILO occupational-injury framework | Worker-hours or workers exposed | Requires the same covered workers and period as the injury numerator | Defines suitable denominator concepts, but does not provide a UK maritime exposure dataset for this project. | Method reference only |
| No compatible public worker-hour source identified | Actual hours worked aboard | Would need the same roles, fleet, jurisdiction, and period as affected-person records | DfT active-at-sea estimates are people, not hours. Contracted hours must not be substituted for actual exposure. | Data gap |
| No compatible public voyage source identified | Completed voyages | Would need all covered voyages for the same vessels and period | Port arrivals omit non-port and unmatched voyage exposure and are currently under methodological review. | Data gap |
| No compatible public operation-count source identified | Completed mooring, transfer, lifting, fishing, or other operations | Would need standardized operation starts/completions in the same reporting population | Neither MAIB nor the reviewed DfT tables provide these exposure counts. | Data gap |

## Compatibility gate

A rate is eligible only when all answers are “yes”:

1. **Outcome:** Does the numerator use the exact target outcome definition?
2. **Population:** Are the same roles and person types present in numerator and denominator?
3. **Geography/jurisdiction:** Do flag, territorial-water, nationality, and employer rules match?
4. **Vessel scope:** Do vessel type, commercial status, size threshold, and registration match?
5. **Operation:** If task-specific, is the same operation counted in both datasets?
6. **Period:** Do the calendar interval and inclusion rules match?
7. **Unit:** Does the denominator measure actual exposure rather than a convenient proxy?
8. **Completeness:** Are reporting gaps, survey non-response, and suppressed records quantified?
9. **Independence:** Are repeat events/persons handled consistently with the intended estimand?
10. **Provenance:** Are extract date, source version, transformations, and mapping coverage recorded?

Failure of any of questions 1–7 is a hard stop. Questions 8–10 require an explicit limitation and review before publication.

## Supported estimands

### Recorded-incident share

```text
share = events in category / all recorded events in the filtered extract
```

This describes the database, not risk to a person or vessel.

### Conditional severity

```text
severity share = recorded events with outcome / recorded events in the same scope
```

This is conditional on an event being recorded.

### Exposure rate

```text
rate = compatible outcome count / compatible exposure
```

The display must include the exposure unit, such as `per 100,000 worker-years`, `per million worker-hours`, `per 10,000 vessel-years`, or `per 100,000 arrivals`. Units must not be converted without a documented source for the conversion.

## Confidence intervals

### Counts over exposure

Use a two-sided **95% exact Poisson (Garwood) confidence interval** for event counts and divide both limits by the same exposure. This is the default because maritime subgroups are likely to be sparse and a normal approximation can produce misleading or negative limits.

For zero observed events, do not report zero risk. Report the one-sided 95% upper rate bound:

```text
upper bound = -ln(0.05) / exposure ≈ 2.996 / exposure
```

### Shares among recorded events

Use a two-sided **95% Wilson score interval** for binomial shares. The label must continue to say “share among recorded events.”

### Comparisons

- Do not rank groups solely by point estimates when their confidence intervals overlap materially.
- Do not fit demographic or role multipliers until compatible exposure exists for every compared group.
- Do not pool years across a source-methodology break without a documented bridge.

## Sparse-sample and suppression rules

| Condition | Publication rule |
| --- | --- |
| Missing or incompatible denominator | Suppress rate; show counts only with a scope warning |
| `n = 0` events with valid exposure | Show “no events observed” plus one-sided 95% upper bound; never “zero risk” |
| `1 ≤ n < 5` | Suppress the point rate in public UI; show a sparse-data notice and interval only in research export |
| `5 ≤ n < 20` | Show rate and exact interval with “very sparse; do not rank” warning |
| `20 ≤ n < 50` | Show rate and interval with “limited precision” warning |
| `n ≥ 50` | Standard rate display, still with interval and source metadata |
| Any cell risking identification | Apply source licensing/privacy rules and suppress or aggregate regardless of count |

These are project publication rules, not claims of universal statistical thresholds. They should be reviewed with the maritime-domain and statistics reviewers.

## Data needed to revisit the no-go decision

At least one of the following matched packages is required:

1. person-level occupational outcomes plus worker-hours for the same fleet, roles, and period;
2. outcomes plus average exposed worker population for the same employers/fleet and period;
3. vessel occurrences plus time-at-risk or vessel-years for the identical registered fleet;
4. task outcomes plus counts of completed operations under the same reporting system.

Until then, the application must not convert MAIB counts into personal percentages. AI may help classify narrative records, but it may not invent exposure or numeric rates.
