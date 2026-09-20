"""Exercise the real PostgREST query builder with an isolated HTTP transport."""
import math
from types import SimpleNamespace

import httpx
import pytest
from postgrest._sync.request_builder import SyncRequestBuilder

from app.services.supabase_store import SupabaseStore, search_bounds


def doctor(identifier, lat=10.0, lng=76.0, live=False, verified=True, clinics=None):
    return {'id': identifier, 'name': identifier, 'specialty': 'General Practitioner',
            'license_verified': verified, 'availability': {'available': live},
            'clinics': clinics if clinics is not None else [
                {'id': f'c-{identifier}', 'doctor_id': identifier, 'lat': lat, 'lng': lng}]}


@pytest.fixture
def make_store(monkeypatch):
    monkeypatch.setattr(SupabaseStore, 'is_configured', lambda self: True)
    clients = []

    def build(rows, validate=lambda request: None):
        def handle(request):
            validate(request)
            offset = int(request.url.params.get('offset', 0))
            limit = int(request.url.params.get('limit', 200))
            return httpx.Response(200, json=rows[offset:offset + limit])
        session = httpx.Client(base_url='https://fixture.invalid', transport=httpx.MockTransport(handle))
        clients.append(session)
        store = SupabaseStore()
        store._client = SimpleNamespace(table=lambda table: SyncRequestBuilder(session, f'/{table}'))
        return store

    yield build
    for session in clients:
        session.close()


def test_query_filters_active_and_bounds_without_private_fields(make_store):
    calls = []
    def validate(request):
        params = request.url.params
        calls.append(params)
        assert params['license_verified'].lower() == 'eq.true'
        assert params['specialty'] == 'ilike.%General Practitioner%'
        assert params['clinics.lat'].startswith('gte.')
        assert len(params.get_list('clinics.lat')) == 2
        assert len(params.get_list('clinics.lng')) == 2
        assert 'clinics!inner(' in params['select']
        assert 'availability(available)' in params['select']
        assert not any(field in params['select'] for field in ['*', 'bio', 'email', 'admin_notes', 'license_no', 'created_at'])
        assert 'availability.available' not in params
    result = make_store([doctor('offline'), doctor('live', live=True), doctor('inactive', verified=False)], validate).search_doctors(10, 76, '  General   Practitioner  ')
    assert [item['id'] for item in result] == ['live', 'offline']
    assert len(calls) == 1


def test_exact_radius_rejects_bbox_corners_and_uses_nearest_clinic(make_store):
    rows = [doctor('corner', 10.08, 76.08), doctor('missing', lat=None),
            doctor('multi', clinics=[{'id': 'far', 'lat': 20, 'lng': 76}, {'id': 'near', 'lat': 10, 'lng': 76}])]
    result = make_store(rows).search_doctors(10, 76, radius_km=10)
    assert [item['id'] for item in result] == ['multi']
    assert result[0]['clinic']['id'] == 'near'


def test_nearer_offline_doctor_ranks_before_farther_live_and_ties_are_stable(make_store):
    rows = [doctor('far-live', 10.05, live=True), doctor('z'), doctor('a')]
    assert [item['id'] for item in make_store(rows).search_doctors(10, 76)] == ['a', 'z', 'far-live']
    assert [item['id'] for item in make_store(list(reversed(rows))).search_doctors(10, 76)] == ['a', 'z', 'far-live']


def test_candidate_batches_do_not_drop_matches_beyond_first_page(make_store):
    calls = []
    rows = [doctor(f'{i:04}') for i in range(205)]
    results = make_store(rows, lambda request: calls.append(request.url.params['offset'])).search_doctors(10, 76)
    assert len(results) == 205
    assert calls == ['0', '200']


@pytest.mark.parametrize('lat,lng', [(0, 179.99), (0, -179.99), (89.999, 0), (-89.999, 0), (10, 76)])
def test_spherical_bounds_include_radius_edge_in_all_directions(lat, lng):
    south, north, west, east = search_bounds(lat, lng, 50)
    angle = 49.999 / 6371
    phi = math.radians(lat)
    for bearing in range(0, 360, 5):
        theta = math.radians(bearing)
        target_lat = math.asin(math.sin(phi) * math.cos(angle) + math.cos(phi) * math.sin(angle) * math.cos(theta))
        target_lng = math.radians(lng) + math.atan2(math.sin(theta) * math.sin(angle) * math.cos(phi), math.cos(angle) - math.sin(phi) * math.sin(target_lat))
        target_lng = (math.degrees(target_lng) + 180) % 360 - 180
        assert south <= math.degrees(target_lat) <= north
        if west is not None:
            assert (west <= target_lng <= east) if west <= east else (target_lng >= west or target_lng <= east)


def test_antimeridian_uses_or_filter_and_pole_does_not_restrict_longitude(make_store):
    calls = []
    store = make_store([], lambda request: calls.append(request.url.params))
    store.search_doctors(0, 179.99)
    assert 'lng.gte.' in calls[0]['clinics.or'] and 'lng.lte.' in calls[0]['clinics.or']
    store.search_doctors(90, 20)
    assert 'clinics.or' not in calls[1] and 'clinics.lng' not in calls[1]


def test_specialty_sql_wildcards_are_literal(make_store):
    calls = []
    make_store([], lambda request: calls.append(request.url.params)).search_doctors(10, 76, '50%_care')
    assert calls[0]['specialty'] == r'ilike.%50\%\_care%'
