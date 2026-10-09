# Provisional risk model

## Status

Model ID: `SR-UA-PROTOTYPE-0.1`

This model demonstrates product behavior. It is not validated for operational safety decisions. Several seed values are adapted from the supplied educational tables; those tables contain apparent arithmetic inconsistencies, so every coefficient must be reviewed before the model is promoted.

## Concepts

- **Annual individual estimate:** calculated probability-like estimate for one profile.
- **Incident share:** proportion of recorded incidents in a selected category.
- **Severity given incident:** conditional distribution of outcomes among recorded incidents.
- **Exposure rate:** events per worker-hour, voyage, operation, or another explicit denominator.

The last three are not interchangeable.

## Prototype components

The UI reports three independent components:

1. `health`: age baseline adjusted by sex/residence and chronic-condition marker;
2. `occupation`: hourly role rate multiplied by annual exposure and workplace multipliers;
3. `lifestyle`: smoking and alcohol contributions from the educational reference.

For small probabilities, the supplied educational method sums components. The prototype uses the bounded independent-event combination:

```text
R_total = 1 - (1 - R_health) × (1 - R_occupation) × (1 - R_lifestyle)
```

This prevents totals above 100% and remains close to addition when components are small. It does not prove independence; that is a documented modeling assumption for the prototype.

## Risk categories

| Annual estimate | Label |
| ---: | --- |
| `< 1e-6` | negligible |
| `1e-6 … < 1e-5` | low |
| `1e-5 … < 1e-4` | moderately low |
| `1e-4 … < 1e-3` | medium |
| `1e-3 … < 1e-2` | very high |
| `>= 1e-2` | extreme |

These labels follow the supplied educational scale and require domain validation.

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

## Validation backlog

- Verify source-table arithmetic and exponents.
- Define whether health baseline represents all-cause mortality or a narrower outcome.
- Replace generic roles with maritime occupation groups supported by denominators.
- Obtain worker-hours, voyages, or population counts for every incident numerator.
- Quantify confidence intervals and sparse-data behavior.
- Test correlation between components before retaining the independence assumption.
- Have the method reviewed by maritime safety and occupational-risk specialists.

