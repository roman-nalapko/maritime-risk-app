# Maritime taxonomy v1.0.0

## Status and purpose

Taxonomy ID: `SR-UA-TAXONOMY-1.0.0`

This taxonomy defines stable categories shared by questionnaires, model inputs, calculation fixtures, and imported incident datasets. It is a project crosswalk, not a claim that one universal maritime classification exists.

The four axes must remain separate:

1. **role** — what the person does or their onboard rank/function;
2. **vessel** — the vessel group involved;
3. **operation** — the task or ship operation underway;
4. **event** — what happened, such as a fall, collision, fire, or person overboard.

An event must never be used to infer an operation. When a source does not report a value, use the explicit `unknown` category.

## Primary references

- [IMO STCW Convention and Code](https://www.imo.org/en/ourwork/humanelement/pages/stcw-convention.aspx): separates master/deck, engine, radio, special training, safety, and watchkeeping functions.
- [IMO revised harmonized casualty reporting procedures, MSC-MEPC.3/Circ.4/Rev.1](https://wwwcdn.imo.org/localresources/en/OurWork/IIIS/Documents/Casualty%20documents/4-Rev-1.pdf): Table 12 provides ship/task operations and Table 17 provides ranks, including master, deck and engine officers, ratings, cadets, electro-technical personnel, pilots, other crew, non-crew, and unknown.
- [IMO ship-type definitions](https://www.imo.org/en/ourwork/safety/pages/regulationsdefault.aspx): confirms that no single universally applicable ship-type definition exists and supplies treaty-specific definitions.
- [ILO ISCO-08](https://isco.ilo.org/en/isco-08/): supplies occupational crosswalks such as ships’ engineers (3151), ships’ deck officers and pilots (3152), ships’ deck crews (8350), and deep-sea fishery workers (6223).
- [EMSA EMCIP taxonomy](https://emsa.europa.eu/we-do/safety/accident-investigation/item/3024-emcip-taxonomy.html): reference taxonomy for European casualty reporting and later source-specific mappings.

## Role groups

| ID | Includes | Excludes or requires separate handling |
| --- | --- | --- |
| `deck_officer` | Master, chief mate, deck officer | Deck ratings; pilots |
| `deck_rating` | Boatswain, able/ordinary seafarer, other deck ratings | Deck officers |
| `engine_officer` | Chief, second, and other engineer officers | Engine ratings |
| `engine_rating` | Engine-room ratings | Engineer officers |
| `electro_technical` | Electro-technical officers and ratings | Generic engine roles when not explicitly electrical |
| `pilot` | Maritime pilot acting in that function | Ship master and deck officers |
| `cadet_trainee` | Onboard cadets and trainees | Shore-only students; include in rates only when denominator coverage matches |
| `fishing_crew` | Skippers and crew whose work is commercial fishing | Fish-processing work ashore |
| `hotel_service` | Catering, housekeeping, and passenger-service crew aboard ship | Passengers and shore hospitality staff |
| `specialist_onboard` | Onboard specialists or special personnel not covered above | Divers are tagged here only when the source population and exposure match |
| `other_crew` | Crew member known to be aboard but insufficiently specified | Non-crew persons |
| `non_crew_onboard` | Passengers, contractors, visitors, and other non-crew persons | Crew-based individual-risk model |
| `shore_worker` | Port, terminal, shipyard, and shore-support workers | Seafarer model; requires a separate population and coefficient set |
| `unknown` | Role/rank absent, suppressed, or not mappable | Never redistribute to another group |

Officer/rating and department should be retained at the finest level supplied by the source. Aggregation is allowed at presentation time; splitting an unspecified group is not.

## Vessel groups

| ID | Inclusion rule |
| --- | --- |
| `cargo_dry` | General cargo, container, bulk, and other dry-cargo vessels when no finer compatible group is required |
| `tanker` | Oil, chemical, gas, and other liquid/gas bulk carriers; retain subtype in source fields |
| `passenger` | Passenger ships, ferries, cruise ships, and passenger high-speed craft |
| `fishing` | Commercial fishing vessels |
| `service_offshore` | Offshore support, research, dredging, special-purpose, and comparable service vessels |
| `tug_workboat` | Tugs, towboats, pilot boats, and workboats when reported separately |
| `recreational` | Pleasure and recreational craft; excluded from occupational rates unless a worker population is explicit |
| `other` | Reported vessel type that is known but outside the groups above; preserve original value |
| `unknown` | Vessel type absent, suppressed, or not mappable |

Because IMO notes that ship-type definitions vary by instrument, imports must retain `sourceVesselType` and the mapping version.

## Operation groups

These groups collapse the more detailed IMO Table 12 list for the MVP while retaining the raw source value.

| ID | Includes |
| --- | --- |
| `navigation_watch` | On passage, manoeuvring, turning, pilotage, watchkeeping |
| `mooring_anchoring` | Berthing, mooring, anchoring, anchor handling |
| `cargo_transfer` | Loading, unloading/discharging, ship-to-ship transfer, taking stores |
| `machinery_maintenance` | Starting/stopping machinery, maintenance, repair |
| `fishing_operation` | Preparing, shooting, hauling, towing gear; handling/stowing catch |
| `embarkation` | Embarking or disembarking people |
| `bunkering_tank` | Bunkering, ballasting, tank cleaning, gas freeing, inerting |
| `emergency_drill` | Emergency response, trials, drills, tests |
| `special_service` | Towing/pushing, offshore support, dredging, drilling, icebreaking, replenishment |
| `idle_moored` | Alongside, moored, anchored, drifting, idle/off-hire when no active task is reported |
| `other` | Known operation outside the groups above; preserve original value |
| `unknown` | Operation absent or cannot be mapped without inference |

## Exposure units

| Unit ID | Appropriate numerator | Use |
| --- | --- | --- |
| `worker_hour` | Person-level occupational outcomes among workers whose hours are counted | Preferred task/role rate where reliable worked-hours data exist |
| `worker_year` | Person-level occupational outcomes among workers in the same covered workforce | Annual individual estimate when worker-hours are unavailable but worker population is compatible |
| `vessel_year` | Vessel casualties among the same covered fleet | Vessel-level comparison; never an individual probability |
| `voyage` | Events occurring during covered voyages | Voyage-level operational rate |
| `operation_count` | Events during a defined repeated operation | Mooring, transfer, lifting, or similar task risk when starts/completions are counted |
| `person_onboard_hour` | Outcomes among all covered persons aboard for counted time | Passenger/crew mixed exposure only when the numerator has the same population |
| `none` | Recorded incident counts only | Descriptive shares and conditional severity; not a risk rate |

Every rate must name exactly one unit and document numerator outcome, covered population, geography, period, and source. Numerator and denominator must have matching scope.

## Current prototype crosswalk

| Prototype value | v1 mapping | Rule |
| --- | --- | --- |
| `deck` | `deck_rating` | Temporary assumption documented by the prototype label; future UI must ask officer/rating explicitly |
| `engine` | `engine_rating` | Temporary assumption; future UI must ask officer/rating explicitly |
| `officer` | `unknown` | Too broad to split safely between deck and engine officers |
| `port` | `shore_worker` | Explicitly outside the seafarer model |
| `cadet` | `cadet_trainee` | Include only with matching numerator and denominator coverage |
| `diver` | `specialist_onboard` | Requires an additional `specialism=diving` field and compatible exposure source |
| vessel `cargo` | `cargo_dry` | Direct coarse mapping |
| vessel `tanker` | `tanker` | Direct coarse mapping |
| vessel `passenger` | `passenger` | Direct coarse mapping |
| vessel `fishing` | `fishing` | Direct coarse mapping |
| vessel `service` | `service_offshore` | Provisional coarse mapping; preserve original value |

The prototype event labels `collision`, `fire`, `fall`, `overboard`, and `exposure` map to events, not operations. Only `mooring` and `machinery` provide enough context for provisional operation mappings (`mooring_anchoring` and `machinery_maintenance`).

## Unknown, other, and versioning rules

- `unknown` means the source did not provide enough information. It is not a negative result and must be shown in completeness statistics.
- `other` means the source supplied a known value outside the current controlled list. Preserve the original value for later remapping.
- Never infer role from vessel, operation from event, or exposure from calendar duration.
- Every mapped record stores `taxonomyVersion`, the original source value, and the mapping rule/version.
- Existing versions are immutable. Category changes require a new semantic version and an explicit migration table.
- Aggregated reporting may combine categories; risk estimation may not split an aggregate into invented subgroups.

The canonical machine-readable registry is [`data/taxonomy/maritime-taxonomy.v1.json`](../../data/taxonomy/maritime-taxonomy.v1.json).
