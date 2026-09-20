# Doctor search audit

## Baseline architecture (recorded before implementation)

React `PatientSearch` calls `useDoctorSearch` on mount. StrictMode shares one GPS
promise; an operation counter prevents the replay from issuing a second search.
GPS always requests high accuracy, maximumAge=0, with a 10-second deadline.
Only after location resolution does Axios GET `/api/v1/search`. Specialty/radius
are draft controls applied on Search/Enter; an AI suggestion also submits.
Manual place selection and map clicks update the draft location, not results.
Autocomplete uses Google's widget, fetching three place fields on selection;
typing does not run doctor search. Map pan/zoom never submits a search.

FastAPI's async route calls the synchronous Supabase client on the event loop.
The reused client selects `*, clinics(*), availability(*)` in one joined request.
An optional `%specialty%` ILIKE is the only database filter. Python rejects
unverified doctors (`license_verified` is the active flag), missing clinics and
missing coordinates, calculates Haversine for all remaining doctors, filters by
radius and sorts live-first then rounded distance. Only the first related clinic
is considered. No pagination or deterministic tie-breaker is present. Supabase's
default row cap can silently truncate candidates before distance filtering.

The API already returns a limited SearchResult, though its clinic shape includes
both formatted opening hours and the structured schedule. Cards and the profile
modal use this same response. There is no public detail endpoint and no photo
pipeline: cards use initials. No N+1 queries, frontend distance calculation,
search debounce, free-text doctor input, result cache or repeated geocoding exists.

List and Google Map consume one committed result/location/filter snapshot. The
map preserves its instance/camera and ignores small GPS jitter, but every result
is rendered as a card and marker. During refresh/error the list is hidden while
the map retains old results. Request IDs discard stale responses but do not abort
HTTP work. A busy guard can silently drop an AI filter submitted during a search.

## Measurement

`backend/scripts/profile_search.py` measures real configured Supabase reads, one
cold run and seven warm runs, without logging profile data or credentials.
Database roundtrip includes network/PostgREST; it is not SQL execution time.
Browser provider fixtures are separately labelled and do not measure real GPS
or Google Maps latency. Results and verification are recorded below after changes.

## Problems found

| Category | Finding |
| --- | --- |
| Performance | Remote I/O dominates this eight-doctor dataset. Public search inherited JSON and session/admin headers that require CORS preflight when frontend and API use different origins. |
| Database | Wildcard projections transferred private/internal fields to the backend unnecessarily. Active and geographic filtering happened after transfer. The first-clinic assumption missed nearer clinics. The unpaged request depended on PostgREST's row cap. |
| Backend | Synchronous Supabase I/O blocked the async endpoint's event loop. Live-first ranking could put a faraway live doctor ahead of a nearby offline doctor. Equal distances had no explicit final ordering. |
| Frontend | Obsolete HTTP work continued after manual overrides; an AI suggestion during HTTP work was silently dropped. Concurrent place-detail lookups could commit in reverse order. Requests had no frontend timeout. |
| UX | Existing cards disappeared during every refresh and on API failure while the old map remained visible. Initial GPS could not reuse a recent reading. |

## Implemented changes

1. **Database candidate filtering and projection.** A joined request selects just
   doctor identity/specialty/fee/active flag, clinic display/contact/location fields,
   and the availability boolean. `license_verified=true` filters active doctors.
   `clinics!inner` plus spherical latitude/longitude bounds excludes out-of-area
   doctors before transfer. The bounds handle poles and antimeridian crossings.
   Python still performs exact Haversine rejection, including bounding-box corners.
   [PostgREST embedding semantics](https://postgrest.org/en/v12/references/api/resource_embedding.html)
   require `!inner` for related filters to remove parent rows.
2. **Complete, stable nearby results.** Candidate batches of 200, ordered by doctor
   ID, avoid the default 1,000-row cap. The nearest eligible clinic is chosen per
   doctor. Results sort by unrounded distance, live status on equal distance, then
   ID, and distance is rounded only for display. Active offline doctors stay visible.
   This is internal candidate batching, not public result pagination. It assumes
   the server's configured row cap is at least 200 (default: 1,000).
3. **Backend concurrency and failure handling.** The synchronous route uses
   [FastAPI's worker pool](https://fastapi.tiangolo.com/async/). Lazy client creation
   is locked to reuse one client under concurrent first requests. Invalid/nonfinite
   coordinates are rejected; upstream HTTP/PostgREST failures become a retryable
   503 without exposing connection details.
4. **Smaller API response.** Search omits the duplicate structured opening-hours
   schedule; formatted hours, clinic phone, name, address and fee remain available
   for the existing profile modal. Profile/dashboard endpoints retain structured
   schedules. No new detail request is needed. Consumers of search's optional
   `clinic.opening_hours_schedule` must use the formatted `opening_hours` value;
   the current frontend already does so.
5. **One location per operation.** Initial discovery accepts a browser position up
   to 30 seconds old. Explicit Search still requests `maximumAge=0`. Manual choices
   remain authoritative. StrictMode, one-request-per-submit and no-map-triggered-
   search protections remain intact. No GPS coordinates are put in shareable URLs.
6. **Cancellation and latest intent.** AbortController cancels superseded HTTP
   requests and unmounted searches; the operation ID remains a second guard.
   AI filters during GPS are included in the upcoming request; during HTTP they
   replace the old request using the resolved location. Place detail selection also
   uses a sequence guard. Browser cancellation cannot undo a database request that
   has already started on the server.
7. **Public GET efficiency.** Search omits JSON, Authorization and X-Admin-Key
   headers, avoiding their unnecessary cross-origin preflight. Other endpoints
   retain the existing authentication behavior. Search has a 15-second HTTP timeout.
8. **Stable refresh UX.** Cards remain mounted during GPS, HTTP and API failures;
   list and map keep their last committed snapshot together. A translated live
   status explains that these are previous results. Initial loading still has the
   existing staged location/search indicator; empty states are suppressed while
   loading. Filters stay interactive; Search remains disabled during an identical
   operation. Enter, the 50km recovery action, retry, mobile list/map controls and
   map camera preservation remain covered by tests.
9. **Normalization and unnecessary work.** Specialty whitespace is trimmed and
   collapsed, partial matching remains case-insensitive, and SQL `%`/`_` wildcards
   are escaped. Card opening-hours parsing now runs only in the detail view that
   actually displays it.

## Database/index decision

No migrations, extensions, new indexes or remote database writes were made.
The checked-in schema declares indexes for verified status, specialty, clinic
doctor ID and a GiST `ll_to_earth` expression; availability doctor ID is its primary
key. The existing specialty B-tree does not solve leading-wildcard ILIKE, and the
earth-distance expression index does not support the new scalar bounds directly.
Those are schema declarations, not verified live index inventory.

The real database returned eight baseline rows and three active located candidates.
There is no measured case for additional indexes at this scale. The read-only
PostgREST EXPLAIN request returned `PGRST107`: plan media types are unavailable.
There is no direct PostgreSQL connection configured in the supplied environment.
SQL-only timings, live index usage and execution plans therefore remain unverified.
For a materially larger dataset, use a staging SQL plan before choosing a scalar
location index or a database distance query using the existing earthdistance stack.

## Before versus after: actual measurements

Measured on 2026-09-20 against the configured Supabase, with no database mutation.
Each backend value below is the median of seven runs, excluding the first run.
Origin discovery for the active-clinic scenario happens outside the timer and
warms the connection, so its first sample is not a cold-connection measurement.
Raw aggregate samples are retained in `docs/search-benchmark.json`.

| Metric | Before | After |
| --- | ---: | ---: |
| Active-clinic 10km: database rows transferred | 8 | 3 |
| Active-clinic 10km: database response bytes | 7,010 | 1,822 |
| Active-clinic 10km: database/network roundtrip | 70.356 ms | 73.819 ms |
| Active-clinic 10km: store processing incl. roundtrip | 71.603 ms | 74.999 ms |
| Active-clinic 10km: distance computation | 0.019 ms | 0.017 ms |
| Active-clinic 10km: schema mapping + JSON serialization | 0.248 ms | 0.202 ms |
| Active-clinic 10km: API JSON bytes | 1,372 | 883 |
| Active-clinic 10km: result count | 2 | 2 |
| Empty Palakkad 10km: database response bytes | 7,010 | 2 |
| Empty Palakkad 10km: database/network roundtrip | 81.029 ms | 76.413 ms |
| Empty Palakkad 10km: distance calculations | 3 | 0 |
| Initial doctor requests / duplicate requests | 1 / 0 | 1 / 0 |
| Frontend search debounce | none | none |

The two-result database transfer shrank **74%** and API JSON shrank **36%**.
Backend roundtrip latency did **not** improve reliably: small differences in either
direction are network/sample variation. Serialization measures the API's model
mapping/exclusion plus equivalent compact JSON encoding, not a deployed HTTP
response or compression ratio. No end-to-end production latency claim is made.

Controlled browser measurements use actual React components with 30 fixture cards,
GPS held for 200ms, API held for 300ms, and an SDK map fixture. Each is one sample
per viewport, not a statistically significant render benchmark. Response-to-DOM
includes browser scheduling/response handling; it is not pure React CPU time.

| Browser metric | Before desktop / mobile | After desktop / mobile |
| --- | ---: | ---: |
| Controlled location release-to-request interval incl. 200ms hold | 246.4 / 255.6 ms | 245.5 / 256.7 ms |
| Controlled API interval incl. 300ms hold | 315.6 / 336.5 ms | 322.1 / 337.3 ms |
| Response release to card DOM | 28.0 / 33.6 ms | 52.7 / 34.3 ms |
| Response release to map fixture DOM | 28.1 / 33.7 ms | 52.7 / 34.4 ms |
| Existing cards retained during GPS / HTTP | 0 / 0 | 30 / 30 |

There is no demonstrated initial-render speedup; the desktop sample regressed and
is too small/contended to attribute causally. The verified UX improvement is that
all 30 previous cards remain present through refresh, with stable DOM nodes. Real
GPS timing, tile/Google rendering and production mobile network timing were not
measured. The browser fixture deliberately introduces slow provider responses to
verify immediate status feedback and continued usability.

## Deliberately retained or deferred

- **No new result cache:** Search explicitly refreshes location and live status;
  the dataset is small and repeated-query frequency is not measured. Adding a
  cache would trade away freshness without demonstrated need.
- **No free-text search/debounce/typo engine:** The product has a specialty selector
  and a location autocomplete, not a doctor-name textbox. A minimum text length,
  fuzzy doctor ranking or pg_trgm would introduce a new workflow. Autocomplete
  stays separate from doctor search and fetches only the three required fields.
- **No result pagination/clustering:** The live nearby sample has two results;
  the 30-card fixture does not establish a rendering bottleneck. The current API
  remains list-shaped, and all returned matches remain available to list and map.
- **No new image or compression pipeline:** Cards use initials. The trimmed API
  sample is 883 bytes; adding an application gzip layer is not justified here.
- **No filter proliferation or silent radius expansion:** Existing specialty and
  radius controls, optional manual area and the explicit expand-to-50km action
  already fit the product. Active offline doctors remain included by default.

## Verification and remaining limits

Backend regressions cover the real query-builder wire contract, active/non-live
inclusion, radius corners, nearest clinic, stable ranking, candidate batches,
antimeridian/pole bounds, normalization, field projection, response shape, invalid
coordinates, upstream errors and worker-thread execution. Browser tests cover the
real page/hook/components with isolated external providers on desktop and mobile.

| Check | Final result |
| --- | --- |
| Backend `pytest tests -q` | 32 passed, 0 failed, 0 skipped |
| Desktop/mobile `npm run test:regression` (including test TypeScript compilation) | 56 passed, 0 failed, 0 skipped |
| Browser profiling scenarios | 2 passed, 0 failed, 0 skipped |
| `npm run lint` | Passed |
| `npm run type-check` | Passed |
| `npm run build` | Passed; 171 modules; JS 393.10 kB / 127.02 kB gzip |
| `git diff --check` | Passed |

There is an existing Pydantic class-config deprecation warning. No backend linter
is configured/pinned in this repository, so the lint result refers to frontend
ESLint. The production build does not exercise hardware GPS or Google services.

The remaining measured cost is the Supabase/network roundtrip (~74ms warm for the
two-result sample). The initial connection can be much slower than warm reads.
GPS and Google service delays remain external dependencies with failure UI; their
real-world latency is unmeasured here. Search still sorts candidates in Python and
returns all matches, so dense future result sets would need fresh measurement
and likely database pagination. Current measurements do not justify that rewrite.

## Reproduce

From `backend/` in PowerShell (the provided shell inherits `DEBUG=WARN`, which is
not a valid Pydantic boolean, so override it for these commands):

```powershell
$env:DEBUG='false'
..\.venv\Scripts\python.exe scripts/profile_search.py --near-clinic --output ../.pytest_cache/search-clinic-after.json
..\.venv\Scripts\python.exe scripts/profile_search.py --output ../.pytest_cache/search-after.json
..\.venv\Scripts\python.exe -m pytest tests -q
```

From `frontend/`:

```powershell
npm run lint
npm run type-check
npm run test:regression
npm run build
$env:SEARCH_PROFILE_LABEL='after'
npx playwright test --config playwright.profile.config.ts
```

The benchmark scripts are opt-in and produce aggregate files, not production
debug logs. The existing request telemetry is unchanged. Supabase benchmarks
require configured credentials and perform only reads. Backend unit tests use
isolated stores/transports; browser fixtures block external traffic.

## Main files changed

- `backend/app/services/supabase_store.py`: field projection, active/spatial
  filters, candidate batching, nearest-clinic selection, ranking and client reuse.
- `backend/app/routers/search.py`: worker-pool route, validation, smaller response
  and retryable upstream errors.
- `frontend/src/lib/useDoctorSearch.ts`, `location.ts`, `api.ts`: cancellation,
  AI filter orchestration, bounded requests, initial location reuse and public GET.
- `frontend/src/pages/PatientSearch.tsx`, `lib/i18n.ts`: retained cards and translated
  refresh status; `components/PlaceAutocomplete.tsx`: selection ordering;
  `components/DoctorCard.tsx`: avoid unused opening-hours formatting.
- `backend/tests/test_search_flow.py`, `test_search_store.py` and
  `frontend/tests/regression/location-search.spec.ts`: behavioral regression coverage.
- `backend/scripts/profile_search.py`, `frontend/tests/performance/search-profile.spec.ts`,
  `frontend/playwright.profile.config.ts`: opt-in reproducible measurements.
- Frontend test fixture, test tsconfig and test README updated to support coverage.
- `docs/search-performance.md`, `docs/search-benchmark.json`: audit and measured evidence.

The existing modified `backend/logs/backend.log` was preserved; running the existing
backend test/application logging also appended test output to it.
