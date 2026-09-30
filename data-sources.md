# Data sources and method

Every number in the explorer comes from a public source listed here. This file
records what each layer uses, how it is calculated, what was checked, and the
known gaps, so the work can be reproduced and improved. The same source list is
shown in the app for the layer on screen.

Audited 2026-09-30 against the live sources. Figures below are from that audit.

## Shared: police precinct boundaries

| | |
|---|---|
| Dataset | NYPD Police Precincts |
| Publisher | NYC Department of City Planning / NYPD, via NYC Open Data |
| Link | https://data.cityofnewyork.us/d/y76i-bdw7 |
| Used | `precinct`, `the_geom` |
| Coverage | 78 precincts (current boundaries, including precinct 116 created in 2024) |

Borough outlines come from the NYC Department of City Planning
(https://www.nyc.gov/site/planning/), served from `public/data`. The map shows
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

EMS still files almost all southeast Queens calls under 105. To keep the time
series honest, **the fire and EMS layers treat 105 and 116 as one area
("Precincts 105 & 116")** for every year. Population density can separate them
(it is built from census blocks) and does.

## 01 Demographic — Population density

Residents per square mile of land, by precinct, per year.

| Source | Publisher | Link | Used |
|---|---|---|---|
| American Community Survey 5-year estimates, table B01003 (total population), by census tract | U.S. Census Bureau | https://www2.census.gov/programs-surveys/acs/summary_file/ (table-based summary file, `acsdt5y{year}-b01003.dat`) | Tract population, 2021–2024 releases |
| American Community Survey 5-year estimates, table B01001 (sex by age), by census tract | U.S. Census Bureau | same, `acsdt5y{year}-b01001.dat` | Age breakdown |
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

## 03 Medical — EMS calls

Medical emergencies that FDNY EMS was dispatched to, by precinct, per month.

| Source | Publisher | Link | Used |
|---|---|---|---|
| EMS Incident Dispatch Data | FDNY, via NYC Open Data | https://data.cityofnewyork.us/d/76xm-jjuj | `incident_datetime`, `policeprecinct`, `final_call_type` |
| EMS call type descriptions | FDNY (attachment to the dataset: `EMS_incident_dispatch_data_description.xlsx`, sheet "Call Type Descriptions") | same page | Call type code meanings |
| NYPD Police Precincts | see above | | Boundaries |

**Method:** count per precinct per calendar month, aggregated server-side as
for fires. A year of data takes about 2.5 minutes to aggregate, so the build
script queries one year at a time.

**Coverage checked**

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

**Call type breakdown** groups `final_call_type`. 185 codes appear 2019–2026;
the dictionary describes all 185. The grouping (Illness; Injury; Breathing or
cardiac; Psychiatric; Drugs or alcohol; Unconscious or altered; Unknown or
other) is defined code by code in the build script, with a test that every code
in the dictionary is assigned to exactly one group.

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
