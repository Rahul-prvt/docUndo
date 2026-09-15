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
