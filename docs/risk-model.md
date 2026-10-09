# Provisional risk model

## Status

Model ID: `SR-UA-PROTOTYPE-0.1`

Coefficient registry: `SR-UA-COEFFICIENTS-0.1.0`

This model demonstrates product behavior. It is not validated for operational safety decisions. Several seed values are adapted from the supplied educational tables; those tables contain apparent arithmetic inconsistencies, so every coefficient must be reviewed before the model is promoted.

The supplied tables have now been independently recalculated and quarantined in [the educational source audit](methodology/educational-source-audit.md). No value from that material is eligible for model v1.0 until its primary provenance and definitions are verified.

The current output is an **educational demonstration index, not a probability**. It combines components with incompatible outcomes and source populations. The target outcomes for model v1.0 are defined in [outcome-definitions.md](methodology/outcome-definitions.md); the primary target is annual fatal occupational injury connected with ship operations.

## Concepts

- **Prototype index:** dimensionless demonstration output from the current unvalidated calculation.
- **Annual individual estimate:** future model output for one explicitly named outcome over the next 12 months.
- **Incident share:** proportion of recorded incidents in a selected category.
- **Severity given incident:** conditional distribution of outcomes among recorded incidents.
- **Exposure rate:** events per worker-hour, voyage, operation, or another explicit denominator.

The last three are not interchangeable.

Roles, vessels, operations, events, and exposure units follow [maritime taxonomy v1.0.0](methodology/maritime-taxonomy.md). Unknown values are retained explicitly and must not be inferred from another taxonomy axis.

The [denominator and uncertainty review](methodology/exposure-and-uncertainty.md) records a no-go decision for personal statistical rates from currently identified public MAIB/DfT data. Until compatible exposure is available, real incident data supports descriptive counts, recorded-event shares, and conditional severity only.

## Prototype components

The prototype UI reports three components:

1. `health`: age baseline adjusted by sex/residence and chronic-condition marker;
2. `occupation`: hourly role rate multiplied by annual exposure and workplace multipliers;
3. `lifestyle`: smoking and alcohol contributions from the educational reference.

The supplied educational method sums components. The prototype uses the following bounded combination for demonstration:

```text
R_total = 1 - (1 - R_health) × (1 - R_occupation) × (1 - R_lifestyle)
```

This keeps the demonstration value bounded, but it does not make the components compatible or prove independence. The result must not be interpreted as a probability of injury or death. Model v1.0 must not combine general mortality and occupational injury outcomes.

## Educational index categories

| Annual estimate | Label |
| ---: | --- |
| `< 1e-6` | negligible |
| `1e-6 … < 1e-5` | low |
| `1e-5 … < 1e-4` | moderately low |
| `1e-4 … < 1e-3` | medium |
| `1e-3 … < 1e-2` | very high |
| `>= 1e-2` | extreme |

These labels follow the supplied educational scale, apply only to the prototype index, and require domain validation. They are not approved occupational-risk thresholds.

## Required coefficient metadata

Every future coefficient record must contain:

```json
{
  "id": "role.deck_rating.hourly_fatality",
  "value": 0.0000006,
  "unit": "fatalities per exposed worker-hour",
  "population": "definition required",
  "period": "definition required",
  "source": "source URL or document citation",
  "sourceVersion": "publication year/revision",
  "modelVersion": "SR-UA-PROTOTYPE-0.1",
  "status": "provisional"
}
```

The executable registry is [`src/coefficients.js`](../src/coefficients.js). Repository tests reject missing metadata and the `approvedValue()` boundary rejects every disputed or synthetic coefficient. The prototype may display those values only because its output is explicitly labelled as a demonstration index.

## Validation backlog

- Replace quarantined educational coefficients with traceable primary data.
- Define whether health baseline represents all-cause mortality or a narrower outcome.
- Replace generic roles with maritime occupation groups supported by denominators.
- Obtain worker-hours, voyages, or population counts for every incident numerator.
- Quantify confidence intervals and sparse-data behavior.
- Test correlation between components before retaining the independence assumption.
- Have the method reviewed by maritime safety and occupational-risk specialists.
- Remove general mortality and lifestyle mortality from the occupational-injury model.
- Implement separate fatal, non-fatal, serious-injury, and descriptive incident outputs where evidence supports them.
