# Data sources and method

Every number in the explorer comes from a public source listed here. This file
records what each layer uses, how it is calculated, what was checked, and the
known gaps, so the work can be reproduced and improved. The same source list is
shown in the app for the layer on screen.

Audited 2026-09-30 against the live sources. Figures below are from that audit.

## Adding a layer

A layer is one file: `src/layers/<id>.layer.ts`. Add the file and the layer
appears in its story's Layer picker, on the map, in the legend, the hover card
and the Where list. Nothing else needs editing. The file holds:

| Field | What it is |
|---|---|
| `id` | Unique, lower-case and hyphenated; also the file name |
| `story`, `order` | Which story's picker it appears in, and where |
| `label`, `note` | The title, and the one-line subtitle under it |
| `measure` | Exactly what the number is, in one sentence, shown under the headline value with its years |
| `unit` | Shown after values: "fires", "people per sq mi" |
| `aggregation` | `sum` for counts; `ratio` for rates like density (numerator ÷ denominator) |
| `data` | Monthly or yearly, first and last year |
| `breakdown` | The panel's breakdown title and parts |
| `sources` | This layer's own data sources (boundary credits are added for every layer) |
| `method` | Caveats specific to this layer, in plain sentences |
| `build` | How real data is made (see below). Without it the layer shows sample values, and says so |
| `sample` | The value range and seasonality to fake until real data lands |

Added automatically from those fields: the precinct and borough boundary
credits, the 105 & 116 caveat for layers built from dispatch records, the partial-year caveat
for layers reaching the final year, and the legend's note when chosen years
fall outside `data`.

### Building a layer's data

For counts from NYC Open Data, `build` names the dataset, the SoQL filter, the
date and precinct fields, and which raw values of a field make up each
breakdown part. Then:

```
npm run data:layer -- <layer-id>
```

queries the API one month at a time (counts grouped by precinct, ZIP code,
month and part, computed by the API; each month's response is cached in
`.cache/`, so a rerun only fetches what's missing, and `--refresh` refetches), writes `public/data/layers/<layer-id>.json`, and
prints what it counted per year. It stops, naming the value, if a record has a
part value no part lists or a precinct NYPD doesn't have, so nothing is dropped
silently. Records with no precinct are left out and reported. The app loads the
file at startup and checks it covers every area and month.

The tests check every layer file is complete (a known story, sources, caveats,
breakdown, sample range, valid years) and name the file that is not. Record the
source audit for a new layer in this document too.

## Shared: police precinct boundaries

| | |
|---|---|
| Dataset | NYPD Police Precincts |
| Publisher | NYC Department of City Planning / NYPD, via NYC Open Data |
| Link | https://data.cityofnewyork.us/d/y76i-bdw7 |
| Used | `precinct`, `the_geom` |
| Coverage | 78 precincts (current boundaries, including precinct 116 created in 2024) |

Simplified to about 2 m and written to `public/data/nyc-precincts.geojson` (with label points in `nyc-precinct-labels.geojson`) by `npm run data:precincts`.

Borough outlines come from the NYC Department of City Planning
(https://www.nyc.gov/site/planning/), with each
island and sliver moved to the borough whose precincts cover it
(`scripts/align-boroughs.mjs`, run by `npm run data:precincts`), so a borough on
the map is the area whose numbers it adds up: Rikers and Roosevelt Islands are
drawn with Queens (precinct 114), Marble Hill with the Bronx (precinct 50),
Jamaica Bay's islands with Queens (precinct 100), and Brooklyn Bridge Park's
piers with Brooklyn. The outlines are served from `public/data`. The map shows
no attribution control (its corner holds the legend), so every layer lists this
source in the app instead.

Precinct → borough follows NYPD's numbering blocks: 1–34 Manhattan, 40–52
Bronx, 60–94 Brooklyn, 100–116 Queens, 120–123 Staten Island.

### Precincts 105 and 116

NYPD split precinct 116 out of 105 (southeast Queens). The first fire dispatch
tagged 116 is 2024-12-19. The two dispatch datasets adopted it unevenly:

| Year | Fire: 105 | Fire: 116 | EMS: 105 | EMS: 116 |
|---|---|---|---|---|
| 2023 | 788 | 0 | 27,150 | 458 |
| 2024 | 773 | 16 | 28,023 | 653 |
| 2025 | 373 | 447 | 27,778 | 759 |

EMS still files almost all southeast Queens calls under 105. Both datasets
record a ZIP code, and the two precincts follow ZIP lines: in 2025+ fire
records, ZIPs 11413, 11422, 11430, 11434 and 11436 are 116 and the rest are
105 (11411 splits 99% to 105). **The fire and EMS builds assign every record
tagged 105 or 116 by its ZIP code** (`dispatchPrecinct` in
`src/domain/geography.ts`); records without a ZIP keep the precinct recorded.
Checked against FDNY's own tagging: 99.9% of 2025+ fire records agree, and the
ZIP split reproduces the 2025 fire counts above exactly (105: 373, 116: 447).
So every layer shows all 78 precincts.

## 01 Demographic — Population density

Residents per square mile of land, by precinct, per year.

| Source | Publisher | Link | Used |
|---|---|---|---|
| American Community Survey 5-year estimates, table B01001 (sex by age), by census tract | U.S. Census Bureau | https://www2.census.gov/programs-surveys/acs/summary_file/ (table-based summary file, `acsdt5y{year}-b01001.dat`) | Total population (`B01001_E001`, the same as table B01003) and the age breakdown, 2021–2024 releases |
| 2020 Census Redistricting Data (P.L. 94-171), census blocks | U.S. Census Bureau | https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/New_York/ny2020.pl.zip | Block population (`POP100`), land area (`AREALAND`), interior point (`INTPTLAT`, `INTPTLON`) |
| NYPD Police Precincts | see above | | Boundaries |

No API key is needed; all are bulk files.

**Method**

1. Assign each 2020 census block (37,984 in NYC) to the precinct that contains
   its interior point. Checked: 8,802,430 of 8,804,190 residents (99.98%) land
   in a precinct; 555 blocks (1,760 people) sit on shoreline or water edges
   outside every precinct polygon.
2. Precinct land area = sum of its blocks' `AREALAND`. Water is excluded.
3. Split each tract's ACS population among precincts in proportion to the 2020
   population of its blocks in each precinct. 289 of 2,327 tracts span more
   than one precinct. ACS 2021–2024 all use 2020 tract boundaries (checked:
   2,327 of 2,327 tract IDs match).
4. Density = population ÷ land area. For a borough, the city or a range of
   years: total population ÷ total land area (not an average of densities).

Checked per release: 2021 places 8,734,225 of 8,736,047; 2024 places 8,482,104
of 8,483,844 (the remainder are tracts with no 2020 block population).

**Built** with `npm run data:layer -- population-density` (layer kind
`census-density`, logic in `src/data/build/census.ts`). It downloads the files
above once into `.cache/census/` (the ACS files are about 200 MB each; only the
city's tracts are kept). 2026-09-30:

| Year | ACS residents | Placed in precincts | In tracts with no 2020 residents |
|---|---|---|---|
| 2021 | 8,736,047 | 8,734,228 | 0 |
| 2022 | 8,622,467 | 8,620,770 | 0 |
| 2023 | 8,516,202 | 8,514,611 | 52 |
| 2024 | 8,483,844 | 8,482,105 | 136 |

These reproduce the audit (2024: 8,482,104 placed). The small gap is the
1,760 residents of blocks on the shoreline outside every precinct. Age groups
from B01001: under 18 (cells 003–006, 027–030), 18–34 (007–012, 031–036), 35–64
(013–019, 037–043), 65 and over (020–025, 044–049).

**Caveats**

- An ACS "2024" estimate is an average of 2020–2024 responses. Values move
  slowly and are labelled by release year.
- Only 2021–2024 are shown. The 2020 Census count differs from ACS by design
  (precinct 19: 220,261 in the 2020 Census, 205,124 in ACS 2021), so mixing them
  would show a false drop. ACS 2019 and 2020 use 2010 tract boundaries and would
  need 2010 block weights; not done yet. ACS 2025 is expected around
  December 2026. Years outside 2021–2024 show the nearest available year, with
  a note.
- Precinct 22 (Central Park) has 129 residents in the 2020 Census and 0 in ACS.

## 02 Fire — Structural fires

Fires in buildings that FDNY was dispatched to, by precinct, per month.

| Source | Publisher | Link | Used |
|---|---|---|---|
| Fire Incident Dispatch Data | FDNY, via NYC Open Data | https://data.cityofnewyork.us/d/8m42-w767 | `incident_datetime`, `policeprecinct`, `incident_classification_group`, `incident_classification` |
| NYPD Police Precincts | see above | | Boundaries |

**Filter:** `incident_classification_group = 'Structural Fires'`.

**Method:** count per precinct per calendar month of `incident_datetime`,
aggregated server-side with SoQL (`$group=policeprecinct,date_trunc_ym(incident_datetime)`).
Built with `npm run data:layer -- structural-fires`, last on 2026-09-30; its
counts plus the records with no precinct reproduce the totals below exactly.

**Coverage checked**

| Year | Structural fires | No precinct |
|---|---|---|
| 2019 | 26,154 | 163 |
| 2020 | 25,035 | 131 |
| 2021 | 23,661 | 122 |
| 2022 | 23,779 | 122 |
| 2023 | 24,129 | 143 |
| 2024 | 24,633 | 137 |
| 2025 | 25,576 | 128 |
| 2026 (Jan–Jun) | 13,439 | 447 |

All 78 precincts appear. Records with no precinct are left out, so map totals
run about 0.5% under FDNY's citywide totals (3.3% for 2026 so far, likely
records not yet geocoded).

**Building type breakdown** groups `incident_classification` (17 values seen
2019–2026):

| Part | Classifications |
|---|---|
| Apartment building | Multiple Dwelling 'A' - Food on the stove fire; Multiple Dwelling 'A' - Other fire; Multiple Dwelling 'A' - Compactor fire |
| Hotel, shelter or SRO | Multiple Dwelling 'B' Fire |
| House | Private Dwelling Fire |
| Commercial | Other Commercial Building Fire; Store Fire; Factory Fire; Theater or TV Studio Fire |
| Public or institutional | School Fire; Hospital Fire; Church Fire; Other Public Building Fire; Transit System - Structural |
| Vacant or under construction | Under Contruction / Vacant Fire; Construction or Demolition Building Fire; Untenanted Building Fire |

**Not used, and why:** the Bureau of Fire Investigations "Fire Causes" dataset
(https://data.cityofnewyork.us/d/ii3r-svjz) covers only fires the fire
marshals investigated (about 5,700 a year against about 24,600 structural
fires). It shares no ID with dispatch data; matching on precinct and time found
34 of 40 sampled cases within 30 minutes and none exactly, so a row-level join
is unreliable. It is the source for a future "fire causes" layer, aggregated
separately by precinct and month.

## 02 Fire — Fire apparatus accidents

Police-reported crashes involving an FDNY fire truck, engine or ladder, by
precinct, per month.

| Source | Publisher | Link | Used |
|---|---|---|---|
| Motor Vehicle Collisions – Crashes | NYPD, via NYC Open Data | https://data.cityofnewyork.us/d/h9gi-nx95 | `crash_date`, `latitude`, `longitude`, `vehicle_type_code1`–`vehicle_type_code_3`, `number_of_persons_injured`, `number_of_persons_killed` |

**Which crashes.** The vehicle types are typed by officers and cut to 10
characters, so a fire truck appears as FIRE TRUCK, FIRETRUCK, FDNY FIRET, FIRE
ENGIN, LADDER TRU, Fire Truvk and so on. The layer file lists the 46 spellings
seen 2019–2026 (matched upper-cased) in vehicle type codes 1 to 3. Left out:

| Values | Crashes 2019–2026 | Why |
|---|---|---|
| Tanker | 1,072 | Fuel tankers |
| FDNY AMBUL, FDNY EMS, FD AMBULAN | ~150 | Ambulances are not fire apparatus |
| FDNY, FDNY VEHIC, FDNY CHIEF, FDNY PICKU, FDNY VAN, FIRE DEPT | ~150 | Could be any FDNY vehicle |
| FRIEGHTLIN, PUMP | few | A truck make; concrete pumps |

**Where.** The dataset has no precinct, so the build places each crash in the
precinct its coordinates fall in, using the map's precinct shapes
(`src/data/build/openDataPoints.ts`). Crashes without coordinates are left out
and reported (4–14 a year).

**Built** 2026-09-30:

| Year | Counted | No location |
|---|---|---|
| 2019 | 154 | 4 |
| 2020 | 163 | 12 |
| 2021 | 194 | 6 |
| 2022 | 163 | 14 |
| 2023 | 156 | 11 |
| 2024 | 136 | 13 |
| 2025 | 180 | 5 |
| 2026 (Jan–Jun) | 136 | 8 |

**Breakdown:** the crash's worst outcome: no one hurt, someone injured, someone
killed.

**Caveats:** only crashes police reported are in the dataset (anyone hurt or
killed, or $1,000+ damage). Numbers per precinct are small, a few a year.

## 03 Medical — Ambulance calls

Medical emergencies ambulances responded to, by precinct, per month.

| Source | Publisher | Link | Used |
|---|---|---|---|
| EMS Incident Dispatch Data | FDNY, via NYC Open Data | https://data.cityofnewyork.us/d/76xm-jjuj | `incident_datetime`, `policeprecinct`, `zipcode`, `final_call_type`, `incident_disposition_code` |
| EMS call type descriptions | FDNY (attachment to the dataset: `EMS_incident_dispatch_data_description.xlsx`, sheets "Call Type Descriptions" and "Incident Dispositions") | same page | Call type and disposition meanings; the call types are copied to `src/layers/fdny-ems-call-types.json` |
| NYPD Police Precincts | see above | | Boundaries |

**Filter: incidents an ambulance responded to.** The disposition says how each
incident ended:

| Code | Meaning | Counted |
|---|---|---|
| 82 | Transporting patient | Yes |
| 83 | Patient pronounced dead | Yes |
| 90 | Unfounded (no emergency found on arrival) | Yes |
| 91 | Condition corrected | Yes |
| 92 | Treated, not transported | Yes |
| 93 | Refused medical aid | Yes |
| 94 | Treated and transported | Yes |
| 95 | Triaged at scene, no transport | Yes |
| 96 | Patient gone on arrival | Yes |
| 87, CANCEL | Cancelled | No |
| DUP | Duplicate incident | No |
| NOTSNT | Unit not sent | No |
| ZZZZZZ | No disposition | No |

The disposition is used rather than the on-scene time because about 20,000
incidents a year end in a transport yet have no on-scene time recorded.

**Method:** count per precinct per calendar month, aggregated server-side as
for fires, with 105 and 116 told apart by ZIP code. The build queries one
month at a time: a whole year takes the API longer than a request may wait. Built with
`npm run data:layer -- ambulance-calls`.

**Coverage checked** (every incident, before the disposition filter)

| Year | Calls | No precinct |
|---|---|---|
| 2019 | 1,533,251 | 15,336 |
| 2020 | 1,412,701 | 13,110 |
| 2021 | 1,491,454 | 15,484 |
| 2022 | 1,583,531 | 15,858 |
| 2023 | 1,617,839 | 16,438 |
| 2024 | 1,630,447 | 16,893 |
| 2025 | 1,612,273 | 16,119 |
| 2026 (Jan–Jun) | 792,939 | 21,607 |

About 1% of calls have no precinct and are left out (2.7% for 2026 so far).
Precinct 22 (Central Park) is the lowest, at about 580 calls a year.

**Built** 2026-09-30 (incidents an ambulance responded to):

| Year | Counted | No precinct |
|---|---|---|
| 2019 | 1,474,211 | 13,992 |
| 2020 | 1,362,526 | 12,080 |
| 2021 | 1,443,598 | 14,416 |
| 2022 | 1,526,227 | 14,807 |
| 2023 | 1,546,535 | 15,124 |
| 2024 | 1,546,138 | 15,338 |
| 2025 | 1,514,013 | 14,500 |
| 2026 (Jan–Jun) | 709,753 | 19,077 |

Checked for 2025: counted plus no precinct (1,528,513) is every incident
(1,612,273) less the cancelled, duplicate, unsent and undisposed ones (83,760).

**Call type breakdown** groups `final_call_type`. 185 codes appear 2019–2026;
the dictionary describes all 185. The grouping (Illness; Injury; Breathing or
cardiac; Psychiatric; Drugs or alcohol; Unconscious or altered; Unknown or
other) is defined code by code in `src/layers/ambulance-calls.layer.ts`, with a
test that every code in the dictionary is in exactly one group. Fever, rash and
travel variants, and `T-` codes (text and TTY calls), go with their base code.
Standbys, mass-casualty incidents (fires, collapses, active shooters), special
events, death confirmations and transfers count as Unknown or other.

## 03 Medical — Life-threatening response time

Average minutes for an ambulance to reach a life-threatening emergency, by
precinct, per month.

| Source | Publisher | Link | Used |
|---|---|---|---|
| EMS Incident Dispatch Data | FDNY, via NYC Open Data | https://data.cityofnewyork.us/d/76xm-jjuj | `incident_response_seconds_qy`, `valid_incident_rspns_time_indc`, `final_severity_level_code`, plus the fields used for ambulance calls |
| Reviving EMS | Citizens Budget Commission | https://cbcny.org/research/reviving-ems | FDNY segments 1–3 are life-threatening, 4–8 are not |

`incident_response_seconds_qy` is, in FDNY's words, the time between
`incident_datetime` ("the incident was created in the dispatch system") and
`first_on_scene_datetime` ("the first unit signals that it has arrived").

**Filter:** life-threatening calls (`final_severity_level_code` 1, 2 or 3, the
segment after triage), an ambulance responded (dispositions 82, 83, 90–96), and
FDNY marks the response time valid (`valid_incident_rspns_time_indc = 'Y'`).

**Why life-threatening only.** Response time depends mostly on priority. 2025,
all valid responses:

| Segments | Share | Average | Over 2 hours |
|---|---|---|---|
| 1–3 (life-threatening) | 40% | 9.4 min | 745 |
| 4–7 | 60% | 16.5–27.9 min | 15,084 |
| 8 | 0.2% | 78 min | 559 |

Lower-priority calls wait in a queue, and their multi-hour waits dominate an
all-priority average (16.1 min for 2025, rising to 21–25 min by mid-2026), which
would read as "ambulances take 20 minutes" when it measures the queue. FDNY and
the Mayor's Management Report track life-threatening calls separately for the
same reason.

**Compared with the Mayor's Management Report:** its figure (13:09 for fiscal
2026) is end-to-end, from the 911 call being answered; this one starts when the
incident enters FDNY's EMS dispatch system, so it runs a few minutes shorter.

**Method:** per precinct and month, the API returns the number of responses and
the sum of their response times; the layer is a ratio, total seconds ÷
responses, shown in minutes. A borough, the city or several months combine the
same way (total ÷ total), never by averaging averages. Built with
`npm run data:layer -- ambulance-response-time`.

**Breakdown:** responses by how long they took (under 5, 5–10, 10–15, 15–20,
20 minutes or more), bucketed by the API with a SoQL `case()`.

## Years

The year selects cover 2019 to June 2026. 2026 is labelled "2026 (Jan–Jun)".
Fire and EMS have data for every month in that span. Population density has
2021–2024 (see above).

## Reproducing the audit

The checks above are SoQL queries against `https://data.cityofnewyork.us/resource/<id>.json`
and a block-to-precinct assignment of the 2020 P.L. 94-171 geographic header
(summary level 750, counties 005, 047, 061, 081, 085). The build scripts added
with each story's real data (Milestone 5) perform the same steps and print the
same coverage figures.
