# MAIB public data mapping v1.0.0

## Scope

Mapping ID: `SR-UA-MAIB-MAPPING-1.0.0`

This mapping connects the three public [MAIB Data Portal](https://maps.dft.gov.uk/maib-data-portal/web-pages/download_files_section.html) CSV tables to the SeaRisk taxonomy without inventing missing meaning. It was profiled from an extract downloaded on 2026-10-09.

The official [How to use MAIB data](https://maps.dft.gov.uk/maib-data-portal/pbix-how-to/How_To_Use_MAIB_Data.pdf) guide states that:

- `Occurrence_Id` links occurrences to vessels and affected persons;
- `Vessel_Profile_Id` links vessels to affected persons;
- `Affected_Person_Id` uniquely identifies an affected-person row;
- dates are rounded down to the first day of the month;
- `Vessel_Category` uses MAIB definitions;
- missing presumed dead is treated as a death;
- minor injuries are not counted as injuries in `Physical_Condition`.

These rules are preserved in the import contract.

## Extract snapshot

| Table | Rows | Unique key | Key result | Event-date range |
| --- | ---: | --- | --- | --- |
| `occurrences.csv` | 9,063 | `Occurrence_Id` | No blank or duplicate keys | 2018-03 to 2026-05 |
| `vessels.csv` | 9,830 | `Vessel_Profile_Id` | No blank or duplicate keys | 2018-03 to 2026-05 |
| `affected_persons.csv` | 3,040 | `Affected_Person_Id` | No blank or duplicate keys | 2018-07 to 2026-05 |

The occurrences file reports `Last_Updated_At = 2026-06-29`, `Occurrences_Reported_From = 2020-01-01`, and `Occurrences_Reported_To = 2026-05-14`. Some event dates predate the stated reporting-from date, so import metadata must retain both the declared coverage and observed date range rather than silently replacing one with the other.

## Join and grain rules

```text
occurrence 1 ── * vessel 1 ── * affected person
```

- Count occurrences only from `occurrences.csv`.
- Count involved vessels only from `vessels.csv`.
- Count deaths/injuries by people only from `affected_persons.csv` when person-level analysis is intended.
- Do not sum vessel-level fatality totals after joining affected-person rows; that would multiply totals.
- Preserve all three source identifiers in normalized records.
- Reject orphan foreign keys and duplicate primary keys during import.

## Field-by-field mapping

### Occurrences

| MAIB field | Internal field | Transformation |
| --- | --- | --- |
| `Occurrence_Id` | `sourceOccurrenceId` | Preserve exact string |
| `Local_Date_Main_Event` | `occurredMonth` | Preserve month-rounded ISO date; do not infer a day |
| `Date_Main_Event_Unconfirmed` | `occurredDateUnconfirmed` | `Yes/No` to boolean |
| `Occurrence_Severity` | `sourceOccurrenceSeverity` | Preserve; do not infer personal outcome |
| `Main_Event_L1/L2/L3` | `eventGroup`, `sourceEvent*` | Map L1 by controlled table and preserve every source level |
| `Not_Vessel_Operations` | `connectedToVesselOperations` | Boolean inverse; preserve source value |
| `State_Reporting` | `reportingStateGroup` | Preserve `UK`/`Non-UK` |
| location and port fields | `location.*` | Preserve hierarchy; missing stays unknown |
| latitude/longitude | `location.coordinates` | Parse numeric only when both valid and not marked unknown |
| environmental fields | `conditions.*` | Preserve source categories |
| publication fields | `publication.*` | Preserve identifiers, type, date, and URL |

### Vessels

| MAIB field | Internal field | Transformation |
| --- | --- | --- |
| `Occurrence_Id` | `sourceOccurrenceId` | Foreign key |
| `Vessel_Profile_Id` | `sourceVesselId` | Primary key |
| `Flag_State` | `flagState` | Preserve source label |
| `Vessel_Category_L1/L2` | `sourceVesselCategory*` | Preserve MAIB reporting category |
| `Ship_Craft_Type_L1` | `vesselGroup` | Controlled mapping below |
| `Ship_Craft_Type_L2…L5` | `sourceShipCraftType*` | Preserve detail for future mapping |
| `Is_Commercial_Vessel` | `isCommercial` | Parse boolean |
| dimensions/year/hull | `vesselAttributes.*` | Parse documented numeric fields; preserve missing |
| death/injury totals | `sourceVesselOutcomeTotals.*` | Validation/context only; do not duplicate after person join |
| `Crew_Voyage` | `crewOnVoyage` | Integer headcount, not voyage count or exposure |
| `Voyage_Segment` | `sourceVoyageSegment` | Preserve as context; do not map to operation |
| `Pilot_On_Board` | `pilotOnBoard` | Preserve controlled source value |

### Affected persons

| MAIB field | Internal field | Transformation |
| --- | --- | --- |
| three source IDs | corresponding source keys | Preserve exactly |
| `Affected_Person_Type` + `Rank` | `roleGroup` | Passenger override plus controlled rank mapping below |
| `Age`, `Gender`, `Nationality` | `personAttributes.*` | Preserve missing/unknown; do not impute |
| `On_Duty` | `onDutyStatus` | Preserve source category |
| `Physical_Condition_L1` | `outcome` | Controlled mapping below |
| condition/injury hierarchy | `sourceOutcomeDetail.*` | Preserve every level |
| affected-person place/deviation | `sourceContext.*` | Preserve; deviation is not an operation |
| `PPE_Used`, `PPE_Deficient` | `ppe.*` | Preserve multi-value source text; blank means not reported, not “none” |

## Controlled value mappings

The canonical rules are machine-readable in `data/mappings/maib-to-maritime-taxonomy.v1.json`.

### Vessel type

| `Ship_Craft_Type_L1` | Target |
| --- | --- |
| Cargo ship | `cargo_dry` |
| Passenger ship | `passenger` |
| Fishing vessel | `fishing` |
| Service ship; Fixed offshore drilling units | `service_offshore` |
| Recreational craft | `recreational` |
| Inland waterway vessel; Navy ship | `other` and out-of-scope flag where applicable |
| Unknown or blank | `unknown` |

Snapshot coverage: **9,824 / 9,830 = 99.94%** mapped to a known or explicit `other` group; six records remain `unknown`.

### Person role

Direct mappings cover deck/engine officers and ratings, electro-technical personnel, pilots, cadets, fishing-vessel ratings, hotel staff, and explicit other crew/non-crew values. `Affected_Person_Type = Passenger` maps to `non_crew_onboard` even when rank is blank.

Snapshot coverage: **2,659 / 3,040 = 87.47%**. The 381 unresolved rows are 361 `Skipper`, 13 `Unknown`, and seven `Not available - PCF`. `Skipper` remains unresolved because the label alone does not establish fishing, commercial, or deck-officer scope. A domain specialist must approve any contextual rule.

### Outcome

| `Physical_Condition_L1` | Target |
| --- | --- |
| Death (confirmed) | `fatal` |
| Missing (death presumed) | `fatal_presumed` |
| Injured | `injured` |
| No injury | `no_injury` |
| blank/unrecognized | `unknown` |

All 3,040 rows in the snapshot contain one of the four mapped values. Serious/minor injury is retained from L2 and must not be reconstructed from other fields.

### Operation and exposure

MAIB's public tables do not expose the exact IMO task/operation field needed by the internal operation taxonomy. `Voyage_Segment` describes arrival, departure, mid-water, transit, or anchored/alongside context; affected-person `Deviation` describes what departed from normal work. Neither field is an exposure denominator or a reliable task label.

Therefore:

- operation coverage is **0 / 9,830** and `operationGroup = unknown`;
- exposure unit is `none` for descriptive statistics;
- raw voyage segment and deviation values are preserved for later reviewed mappings;
- narrative text may be classified experimentally, but AI output cannot become a numeric-rate input without human review.

## Coverage report requirements

Every import publishes, for each mapped field:

```text
total rows, mapped rows, unknown rows, other rows, unmapped source values,
coverage percentage, mapping version, source extract hash and extract date
```

Coverage is calculated on non-duplicated rows at that table's own grain. It must not be calculated after a one-to-many join.

## Review queue

The following require maritime-domain review before mapping v1.1:

1. whether `Skipper` can be mapped using another explicit source field without violating the no-inference rule;
2. treatment of inland-waterway and naval vessels in product scope;
3. whether any detailed L2–L5 ship types warrant separate groups;
4. whether source narrative can support a reviewed operation label;
5. differences between MAIB `Serious` occurrence severity and person-level serious injury.
