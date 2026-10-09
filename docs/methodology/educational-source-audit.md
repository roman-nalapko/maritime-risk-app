# Audit of the supplied educational tables

## Purpose and scope

This note audits the nine screenshots supplied for the project and the worked example they contain. It supports issue #8 and records what can safely be learned from the material without treating it as an operational maritime-risk data source.

The screenshots appear to be pages from a 2013 Ukrainian life-safety teaching guide. They contain task variants, age-based mortality tables, correction factors, occupational and leisure rates, harmful-habit rates, qualitative risk bands, and a worked calculation for a 50-year-old male construction worker.

The audit is intentionally concise: it records only the values needed to reproduce or diagnose the method, rather than republishing the source tables.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `verified_arithmetic` | The calculation can be reproduced from the displayed inputs. This does not validate the source value. |
| `source_consistent` | The displayed value is internally consistent with adjacent text or tables. Its provenance may still be unknown. |
| `disputed` | The material contains an internal contradiction, apparent typo, or incompatible definition. |
| `unverifiable` | The screenshot does not provide enough primary-source, population, period, or denominator information to validate the value. |

None of these statuses means “approved for model use.”

## Material inventory

| Reference in material | Content | Audit outcome |
| --- | --- | --- |
| Table 2 | Ten student task variants: age, sex, residence, occupation, and an additional-risk activity | Scenario input only; not evidence |
| Table 3 | Male household accidental-death risk by age, per person-year | Transcribed values used by the example; provenance unverifiable |
| Table 4 | Mortality attributed to genetic/somatic disease and ageing by age, per person-year | Transcribed values used by the example; labels and one aggregate value disputed |
| Table 5 | Sex/residence correction factors for accidents and disease | Provenance and derivation unverifiable |
| Occupation table (number not visible) | Hourly fatal-risk values for occupations and leisure activities, described as male values | Reference mismatch and provenance unverifiable |
| Table 7 | Sex shares of accidents by age | One row totals 110%; disputed |
| Table 8 | Annual death-risk values for harmful habits and non-work hazards | Outcome/source/population/period absent; unusable for model calibration |
| Table 9 | Occupational-safety categories | Two contradictory boundaries; disputed |
| Table 10 | Ordered fatal-risk scale | Interval semantics are incomplete; unsuitable as validation thresholds |
| Worked example | Sum of health, work, household, smoking, and driving terms | Arithmetic can be reconstructed, but the summed outcomes are incompatible |

## Recalculation of the worked example

The material describes a 50-year-old man living in a city, working in construction for 2,024 hours per year, smoking, and driving a private car for 100 hours per year.

| Component | Displayed inputs | Recalculation | Audit status |
| --- | --- | ---: | --- |
| `R1`, disease/ageing | `0.0084 × 1.45` | `0.01218` | `verified_arithmetic` |
| `R2`, construction work | `6e-7 × 2024` | `0.0012144` | `verified_arithmetic` |
| `R3`, household accident | `0.0012 × 1.6` | `0.00192` | `verified_arithmetic`; printed once as `1.92e-2` |
| `R4`, smoking | `8000e-6 × 1.45` | `0.0116` | `verified_arithmetic` |
| `R5`, private driving | `1e-4 × 100 × 1.6` | `0.016` | `verified_arithmetic` |
| Total | Sum of the five recalculated terms | `0.0429144` | `verified_arithmetic`, not a valid probability |
| Lifestyle share | `(R4 + R5) / total` | `64.31%` | `verified_arithmetic`; source rounds to 65% |

The source's `4.29e-2` total is reproducible after correcting the typographical errors and rounding the component values. Reproducibility does not make the sum statistically valid: it combines all-cause or disease mortality, occupational fatality, household accidental death, smoking-attributable mortality, and driving risk from unspecified populations and periods.

## Issue ledger

| ID | Finding | Classification | Resolution for this project |
| --- | --- | --- | --- |
| A-001 | The household correction is printed as `1.6 × 1.2e-3 = 1.92e-2`; the product is `1.92e-3`. A later page uses the corrected exponent. | `disputed` | Preserve the correction in the audit only; do not import the coefficient. |
| A-002 | The total formula prints the driving term as `1.6e2`, while the preceding calculation and final total require `1.6e-2`. | `disputed` | Treat as a missing minus sign. |
| A-003 | The female workplace example states `74/26 = 2.8`, then prints division by `1.28`, while the reported result corresponds approximately to division by `2.8`. | `disputed` | Do not implement this correction. |
| A-004 | Table 7 lists 76% men and 34% women for ages 35–44, totaling 110%. | `disputed` | Reject that row pending the original statistical source. |
| A-005 | Table 9's category 3 lower bound is printed as `0 × 10^-3`; the surrounding scale suggests `1 × 10^-3`. | `disputed` | Do not use Table 9 as a classifier. |
| A-006 | Table 9 category 4 says both `>0.001` and `R > 1e-2`, a factor-of-ten contradiction. | `disputed` | Do not use Table 9 as a classifier. |
| A-007 | Table 10 places isolated powers of ten under labels without defining complete open/closed intervals. | `disputed` | Existing prototype bands remain demonstrative and require independent approval. |
| A-008 | The worked example calls the occupation data “Table 5,” but visible Table 5 contains residence/sex correction factors; the occupation table number is cropped or different. | `disputed` | Cite the screenshot descriptively, not as Table 5. |
| A-009 | The visible bibliography cites 2013 teaching material, but the screenshots do not identify the primary statistical datasets, geography, or observation years behind the coefficients. | `unverifiable` | No displayed coefficient is eligible for model calibration. |
| A-010 | Values with different outcomes, populations, denominators, and possibly overlapping causes are added as though they were compatible independent probabilities. | `disputed` | Model v1.0 must keep outcomes separate; see `outcome-definitions.md`. |
| A-011 | Table 4 shows an aggregate “working age” value of `0.03800`, equal to the 65–69 group and far above adjacent working-age rows. | `disputed` | Exclude pending verification from the original table or dataset. |
| A-012 | The “working age” label appears as `15–16 years`, which is incomplete or inconsistent with the age-group rows. | `disputed` | Do not infer the intended range. |

## Values used in the example

The following compact transcription is sufficient to reproduce the example and its faults:

- Table 3, age 50–54: household accidental-death risk `0.00120` per person-year.
- Table 4, age 50–54: disease/ageing mortality risk `0.00840` per person-year.
- Table 5, urban male: accident factor `1.6`; disease factor `1.45`.
- Occupation table, construction worker: `6e-7` per hour; private car driving: displayed range `1e-8 … 1e-5` per hour, while the example selects `1e-4`, outside that displayed range.
- Table 7, age 45–54: 74% men and 26% women.
- Table 8, smoking: `8000e-6` per person-year.
- Table 9 and Table 10: qualitative categories only; their boundary defects are recorded above.

The driving inconsistency is an additional reason not to reproduce the example as a working estimator: the selected `1e-4` hourly value does not fall within the `1e-8 … 1e-5` range visible in the occupation/leisure table.

## Eligibility decision

All numerical values from the supplied educational screenshots are quarantined:

- `eligibleForModel: false`;
- no coefficient is approved for model v1.0;
- the material may be used to demonstrate arithmetic, provenance checks, and UI behavior only;
- any future use requires the primary source, outcome definition, unit, population, geography, observation period, uncertainty, and domain review.

This decision is consistent with [the model outcome boundary](outcome-definitions.md) and [the provisional model documentation](../risk-model.md). The current prototype seed values remain provisional and must not be mistaken for validated maritime statistics.
