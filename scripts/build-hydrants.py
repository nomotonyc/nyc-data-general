"""Snapshot NYC DEP hydrants as compact map-ready GeoJSON."""
import json
import urllib.parse
import urllib.request
from pathlib import Path

URL = 'https://data.cityofnewyork.us/resource/5bgh-vtsn.json'
OUT = Path(__file__).resolve().parents[1] / 'public/data/reference_data/hydrants.geojson'
BOROUGHS = {'1': 'Manhattan', '2': 'Bronx', '3': 'Brooklyn', '4': 'Queens', '5': 'Staten Island'}


def fetch(params):
    url = URL + '?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=120) as response:
        return json.load(response)


def main():
    features = []
    offset = 0
    while True:
        rows = fetch({'$select': 'boro,unitid,latitude,longitude', '$order': 'unitid', '$limit': 50000, '$offset': offset})
        for row in rows:
            try:
                lat, lon = float(row['latitude']), float(row['longitude'])
                borough = BOROUGHS[row['boro']]
            except (KeyError, ValueError, TypeError):
                continue
            if not (-74.3 < lon < -73.65 and 40.45 < lat < 40.95):
                continue
            features.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
                             'properties': {'id': row.get('unitid', ''), 'borough': borough}})
        offset += len(rows)
        print(f'{offset} rows read, {len(features)} mapped', flush=True)
        if len(rows) < 50000:
            break
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')) + '\n')
    print(f'Wrote {OUT}')


if __name__ == '__main__':
    main()
