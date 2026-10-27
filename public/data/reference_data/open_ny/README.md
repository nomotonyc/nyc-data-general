# Open NY health facilities in NYC

Source: NYS Department of Health, [Health Facility General Information](https://health.data.ny.gov/Health/Health-Facility-General-Information/vn5v-hh5r), dataset `vn5v-hh5r`. Retrieved October 22, 2026; source rows last updated September 1, 2026.

`facilities_nyc.json` is an array of **all 2,137 source rows** in the five boroughs, with all API fields retained. No facility-type filter or deduplication is applied. Missing fields remain absent. Source numeric fields retain the API's string representation.

The source's **Facility County Code** field is `cnty_cd`. The live dataset uses the following codes, not 031–035. Filtering it by 31–35 would select Niagara, Oneida, Onondaga, Ontario and Orange counties. `borough` and `borough_sort_code` are local additions; the latter preserves the requested 031–035 sorting order without relabeling the source codes.

| Borough | Source county | Source `cnty_cd` | Local `borough_sort_code` | All rows | Hospital rows | Distinct hospital IDs |
| --- | --- | --- | --- | ---: | ---: | ---: |
| Manhattan | New York | 7093 | 031 | 456 | 23 | 21 |
| Bronx | Bronx | 7094 | 032 | 441 | 12 | 12 |
| Brooklyn | Kings | 7095 | 033 | 685 | 16 | 16 |
| Queens | Queens | 7096 | 034 | 449 | 11 | 9 |
| Staten Island | Richmond | 7097 | 035 | 106 | 6 | 4 |
| Total | | | | 2,137 | 68 | 62 |

There are 2,112 distinct facility IDs across all types. The additional 25 rows are retained because repeated facility IDs can carry different cooperator details. Hospitals are identified by `fac_desc_short === 'HOSP'`; extension clinics and other types remain in the full export. Some ambulatory sites have the source classification `HOSP`; this does not establish inpatient or emergency capabilities.

`metadata.json` records provenance, the exact filter, column definitions, mapping, and independent API counts by county and facility description. The download is checked against these counts before outputs are written. The live rows cover more facility types than the dataset's descriptive text suggests.

`hospitals_nyc.geojson` feeds the map's Hospitals toggle. It contains one point per distinct `HOSP` facility ID using the source longitude and latitude. Of 62 distinct hospital IDs, 61 have coordinates; Montefiore's Henry & Lucy Moses site (1169) is omitted from the map because its source coordinates are absent.

## Comparison with the existing hospital list

`hospital_comparison.json` compares the 62 distinct source hospital IDs with the existing 55-entry general-hospital layer. It includes **45 candidate matches, 2 campuses combined into existing entries but missing their own map points, and 15 missing sites**. Names and locations were reviewed to construct local candidate mappings; these are not official identity crosswalks.

Missing source sites:

| Borough | Facility ID | Source facility name |
| --- | --- | --- |
| Manhattan | 3975 | New York-Presbyterian Hospital - Allen Hospital |
| Manhattan | 9700 | Northwell Greenwich Village Hospital |
| Manhattan | 10139 | New York-Presbyterian David H. Koch Center |
| Manhattan | 10355 | David H. Koch Center For Cancer Care |
| Manhattan | 15437 | Mount Sinai - Behavioral Health Center |
| Bronx | 1164 | BronxCare Hospital Center, 1276 Fulton Avenue |
| Bronx | 1176 | SBH Health System |
| Bronx | 1185 | Montefiore Medical Center - Montefiore Westchester Square |
| Bronx | 3058 | Montefiore Med Center - Jack D Weiler Hosp of A Einstein College Div |
| Bronx | 15897 | Montefiore Einstein Children's Center for Mental Health of the Children's Hospital at Montefiore Einstein |
| Brooklyn | 1324 | Mount Sinai Brooklyn |
| Brooklyn | 9753 | NYU Langone Hospital - Joseph S. and Diane H. Steinberg Ambulatory Care Center |
| Brooklyn | 10223 | Calvary Hospital, 150 55th Street |
| Queens | 1630 | Long Island Jewish Medical Center |
| Staten Island | 1473 | RUMC-Bayley Seton |

The Columbia Presbyterian campus (1464) and Staten Island University Hospital Prince's Bay (1737) occur within combined legacy names, but their existing map points are approximately 8.5 km and 12.2 km away respectively. They need distinct points. Long Island Jewish Medical Center was excluded by the old county-based table parser but is classified as Queens in this source.

Additional review findings:

- Montefiore's Henry & Lucy Moses site (1169) lacks source coordinates. No coordinates are inferred.
- The legacy Lincoln Hospital point is approximately 644 m from the source point.
- SUNY Downstate Medical Center and University Hospital of Brooklyn are candidate duplicates for source site 1320.
- Nine legacy general-hospital entries have no direct `HOSP` match. These include subfacilities, research facilities and historical names; absence does not establish closure.
- The 12 legacy psychiatric entries are listed separately as not reconciled. This source alone does not establish complete psychiatric-hospital coverage.

The original layers are retained. This export and comparison establish the source data and gaps before changing map locations.

## Refresh and validate

From the repository root:

```sh
npm run data:open-ny-facilities
node --test scripts/build-open-ny-facilities.test.mjs
```

Refresh uses paginated Socrata queries ordered by county, facility ID and internal row ID. It validates county names against source codes and checks every county/type count. Newly appearing hospital IDs are marked `needs_review`; maintain the reviewed reconciliation in `scripts/build-open-ny-facilities.mjs` when the source or legacy layer changes. This README records the initial snapshot; JSON metadata and comparison are regenerated on refresh.
