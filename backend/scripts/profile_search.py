"""Read-only search benchmark. Run from backend; prints aggregates, never profiles/keys.

Usage: python scripts/profile_search.py --output ../.pytest_cache/search-before.json
DB roundtrip includes HTTP and PostgREST; it is NOT database execution time.
"""
import argparse
import json
import logging
import statistics
import sys
from pathlib import Path
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.supabase_store import SupabaseStore
from app.models.schemas import SearchResult
from app.routers.search import _clinic_response, router


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    parser.add_argument('--runs', type=int, default=7)
    parser.add_argument('--near-clinic', action='store_true', help='Use a configured active clinic as the origin without printing its coordinates')
    args = parser.parse_args()
    logging.disable(logging.CRITICAL)
    store = SupabaseStore()
    lat, lng = 10.786, 76.6444
    if args.near_clinic:
        candidates = store.client.table('doctors').select('clinics!inner(lat,lng)').eq('license_verified', True).execute().data
        clinic = next(c for d in candidates for c in d['clinics'] if c.get('lat') is not None and c.get('lng') is not None)
        lat, lng = clinic['lat'], clinic['lng']
    session = store.client.postgrest.session
    search_route = next(route for route in router.routes if route.path == '/search')
    exclude = (search_route.response_model_exclude or {}).get('__all__', {})
    original_send = session.send
    original_distance = store._haversine_distance
    samples = []
    current = {}

    def send(*args, **kwargs):
        start = perf_counter()
        response = original_send(*args, **kwargs)
        current['db_roundtrip_ms'] += (perf_counter() - start) * 1000
        current['db_requests'] += 1
        current['db_bytes'] += len(response.content)
        data = response.json()
        if isinstance(data, list):
            current['candidate_rows'] += len(data)
        return response

    def distance(*args):
        start = perf_counter()
        result = original_distance(*args)
        current['distance_ms'] += (perf_counter() - start) * 1000
        current['distance_calls'] += 1
        return result

    session.send = send
    store._haversine_distance = distance
    for _ in range(args.runs + 1):
        current = dict.fromkeys(['db_roundtrip_ms', 'db_requests', 'db_bytes', 'candidate_rows', 'distance_ms', 'distance_calls'], 0)
        start = perf_counter()
        rows = store.search_doctors(lat, lng, None, 10)
        current['store_ms'] = (perf_counter() - start) * 1000
        start = perf_counter()
        body = [SearchResult(id=str(row['id']), name=row['name'], specialty=row['specialty'],
                             consult_fee=row.get('consult_fee'), available=row['available'],
                             distance_km=row['distance_km'], clinic=_clinic_response(row.get('clinic'))).model_dump(mode='json', exclude=exclude)
                for row in rows]
        payload = json.dumps(body, separators=(',', ':'), ensure_ascii=False).encode()
        current['serialization_ms'] = (perf_counter() - start) * 1000
        current['api_bytes'] = len(payload)
        current['results'] = len(rows)
        samples.append(current)
    report = {'fixture': f'configured Supabase, {"active clinic" if args.near_clinic else "Palakkad"} 10km, no specialty, read-only',
              'runs': args.runs, 'cold': samples[0],
              'median': {key: round(statistics.median(s[key] for s in samples[1:]), 3) for key in current},
              'samples': samples[1:]}
    Path(args.output).write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'samples'}, indent=2))


if __name__ == '__main__':
    main()
