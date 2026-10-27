#!/usr/bin/env python3
"""Geocode the photographed EMS roster into a separate reviewable JSON file."""
import csv
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "public/data/reference_data/ems_roster_2026-09-15/ems_stations_roster.csv"
JSON_PATH = ROOT / "public/data/reference_data/ems_roster_2026-09-15/ems_stations_roster.geocoded.json"
GEOCODER = "Nominatim OpenStreetMap"
USER_AGENT = "nyc-data-general/ems-roster-geocoder (local data preparation)"
FALLBACKS = {
    # Exact coordinates from the existing Open NY facility reference, retained here only as
    # review fallbacks; the existing map layer is not changed.
    "ems-27": {"latitude": 40.896570999999845, "longitude": -73.86882500000002, "geocoder": "Open NY existing facility reference", "display_name": "EMS STATION 27, 243 EAST 233 STREET, Bronx, NY 10470"},
    "ems-16": {"latitude": 40.81429399999983, "longitude": -73.93899299999998, "geocoder": "Open NY existing facility reference", "display_name": "HARLEM HOSPITAL/EMS STATION 16, Manhattan, NY 10037"},
    # The photographed roster gives campus/building or Rikers outpost addresses that do not
    # resolve as individual street addresses. These are marked explicitly as campus fallbacks.
    "ems-53": {"latitude": 40.7922123, "longitude": -73.7745855, "geocoder": "NYC Planning geosearch campus fallback", "display_name": "Fort Totten campus, Queens, NY 11359"},
    "ems-49a": {"latitude": 40.794153, "longitude": -73.886701, "geocoder": "NYC Planning geosearch address fallback", "display_name": "14-14 Hazen Street, Rikers Island, Queens, NY 11370"},
}

def search(row):
    params = {
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "us",
        "street": row["address"],
        "city": row["borough"],
        "state": "NY",
        "postalcode": row["zip"],
    }
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        results = json.load(response)
    if not results:
        # A second pass helps addresses that use NYC borough names or abbreviations.
        fallback = f'{row["address"]}, {row["borough"]}, NY {row["zip"]}'
        params = {"format": "jsonv2", "limit": "1", "countrycodes": "us", "q": fallback}
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        with urllib.request.urlopen(request, timeout=30) as response:
            results = json.load(response)
    return results[0] if results else None

rows = list(csv.DictReader(CSV_PATH.open(newline="")))
output = []
for index, row in enumerate(rows):
    result = None if row["station_id"] in FALLBACKS else search(row)
    record = dict(row)
    fallback = FALLBACKS.get(row["station_id"]) if not result else None
    record["latitude"] = float(result["lat"]) if result else (fallback["latitude"] if fallback else None)
    record["longitude"] = float(result["lon"]) if result else (fallback["longitude"] if fallback else None)
    record["geocoder"] = GEOCODER if not fallback else fallback["geocoder"]
    record["geocode_status"] = "matched" if result else ("matched_fallback" if fallback else "not_found")
    record["geocode_display_name"] = result.get("display_name") if result else (fallback["display_name"] if fallback else None)
    output.append(record)
    print(f'{index + 1}/{len(rows)} {row["station_id"]}: {record["geocode_status"]}')
    if index + 1 < len(rows):
        time.sleep(1.1)

JSON_PATH.write_text(json.dumps({
    "source_csv": str(CSV_PATH.relative_to(ROOT)),
    "source_images": ["IMG_2054.jpeg", "IMG_2055.jpeg", "IMG_2056.jpeg"],
    "effective_date": "2026-09-15",
    "geocoder": GEOCODER,
    "records": output,
}, indent=2) + "\n")
print(f"Wrote {JSON_PATH.relative_to(ROOT)} ({len(output)} records)")
