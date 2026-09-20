# Location/search regression tests

From `frontend/`, install dependencies and Chromium once:

```sh
npm ci
npx playwright install chromium
npm run test:regression
```

Run one scenario: `npm run test:regression -- --grep "manual override"`.
View failures: `npm run test:regression:report` (HTML, screenshots and traces).
JUnit output: `test-results/location.xml`.

`regression/location-search.spec.ts` exercises the real search page, hook, autocomplete
component and map component in desktop Chromium and a mobile viewport. It protects
initial location ordering, StrictMode duplicate prevention, fresh Search coordinates,
filter preservation, permission/timeout failures, manual overrides, stale responses,
map synchronization and camera stability. Fixtures resolve GPS and API requests explicitly;
the permission deadline uses Playwright's clock rather than a fixed sleep.

`fixtures/location.ts` intercepts all API requests and blocks external traffic.
`fixtures/maps.tsx` replaces only the external Google SDK with a test implementation,
including its direct `event.placePrediction` selection contract. `vite.config.ts` is
a test-only server config: it ignores `.env` files and uses placeholder configuration.
No backend, database, real GPS, Google key or production credentials are required.
Production builds continue to use the real Maps library and the original Vite config.

CI runs on pull requests opened, updated (synchronize), or reopened, and can be started
manually. Failures fail the job; reports are uploaded even on failure. To make this a
mandatory merge gate, select the **Location regression** check in GitHub branch rules.

Add scenarios to the regression directory using the shared fixture. Assert observable
UI behavior and API coordinates; do not add live services or sleep-based waits.
These fixtures do not verify real browser permission dialogs, GPS hardware, Google key
restrictions, map tiles, or backend search/ranking behavior. Those require separate
deployment/device checks. This suite covers location UX; it does not exercise backend
business behavior.

The suite also covers retaining card DOM nodes during refresh, HTTP cancellation,
native request timeout recovery, AI filters during GPS/HTTP work, out-of-order
place detail responses, map failure isolation, and public search request headers.
Initial GPS may use a browser reading up to 30 seconds old; Search still requests
maximumAge=0. Native XHR timeout recovery uses a bounded wait for the UI outcome,
not an assertion about elapsed milliseconds.

To record a controlled browser performance sample:

```powershell
$env:SEARCH_PROFILE_LABEL='after'
npx playwright test --config playwright.profile.config.ts
```

Aggregates are written to `../.pytest_cache/search-browser-after-*.json`.
This runs real React/DOM with 30 fixture cards, 200ms held GPS, 300ms held API,
and a map SDK fixture. It measures response-to-DOM time and retained-card counts;
it does not measure hardware GPS, real Google maps, SQL time or production latency.
