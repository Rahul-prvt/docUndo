Google Maps deployment review — 12 September 2026

Follow-up: the production Maps issue is fixed. Using the existing authenticated Google Cloud CLI session, the production origin was added to the existing key's allowed referrers. The localhost entry and both API restrictions were preserved. The CLI confirmed that Maps JavaScript API and Places API (New) are enabled, and billing is active. No replacement key was created.

The autocomplete correction was committed and pushed to `main` as `8db4fae` (`fix: read Google Places selection event correctly`). Vercel now serves `index-CI6oYNP_.js`. An isolated browser loaded the map, selected Thrissur through the actual autocomplete UI, and showed the map centered on Thrissur without JavaScript or Google API errors. Clicking Search care sent the selected coordinates (`lat=10.524117600000002&lng=76.2120649`) to Render; the verification passed. Evidence is saved locally in `.pytest_cache/maps-fixed-live.png` and `.pytest_cache/maps-live-verification.json`.

The remaining repository findings below are outside this Maps correction. Render settings and production database records were not changed. Git's saved credential-manager session successfully pushed the change despite the separate `gh` CLI login being invalid.

The following records the initial investigation and recommendations before the fix was applied; statements below about missing access or an undeployed correction describe that initial state.

The production map originally failed because Google rejected the website's HTTP referrer. An isolated Chrome session on https://doc-undo-jgjl-seven.vercel.app/ reproduced this console error:

```text
Google Maps JavaScript API error: RefererNotAllowedMapError
Your site URL to be authorized: https://doc-undo-jgjl-seven.vercel.app/
```

Google documents this error as a website authorization problem for the API key: [Maps JavaScript API error reference](https://developers.google.com/maps/documentation/javascript/error-messages#referer-not-allowed-map-error).

The existing key is already included in the deployed JavaScript. A new key is not required to resolve this error. No API key values or backend secrets are included in this report.

Verified deployment evidence:

| Check | Result |
| --- | --- |
| Local revision | `831bdf0`, merging the Google Maps feature commit `de34a55` |
| Vercel public website | HTTP 200 at `https://doc-undo-jgjl-seven.vercel.app/` |
| Deployed JavaScript | `index-SOdWgMmW.js`; byte-for-byte identical to the local production build before the correction below |
| Maps configuration | Google key present in deployed bundle; browser reports the rejected production referrer |
| Backend URL in deployed bundle | `https://docundo.onrender.com/api/v1` |
| Render health | HTTP 200, `{"status":"ok","version":"0.1.0"}` |
| Render CORS preflight | HTTP 200; explicitly allows `https://doc-undo-jgjl-seven.vercel.app` |
| Public doctor search | Returned `[]` for latitude 10.786, longitude 76.6444, radius 10 km |
| Render clinic request schema | Includes `lat` and `lng`; omits `phone`, which exists in the checked-out source |

The deployed schema difference establishes that Render's API schema differs from this checkout. Public endpoints do not expose the deployed Git commit, so the exact Render revision still needs dashboard confirmation. Health success alone does not verify all database tables or authenticated operations.

The required production fix:

1. Open the Google Cloud project that owns the browser key currently used by this site. In APIs & Services → Credentials, edit that API key.
2. Under application restrictions, use Websites / HTTP referrers. Authorize `https://doc-undo-jgjl-seven.vercel.app/*`. Include the root origin `https://doc-undo-jgjl-seven.vercel.app` if maintaining separate origin entries. Add any actual custom or preview domains individually as needed; the Vercel dashboard URL is not the website referrer.
3. Check that Maps JavaScript API and Places API (New) are enabled and permitted by the key's API restrictions, and that the project has active production billing. These are requirements to verify, not additional errors observed in this audit. [Google key restrictions](https://developers.google.com/maps/api-security-best-practices), [Places widget prerequisites](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new), [production key setup](https://developers.google.com/maps/documentation/javascript/get-api-key).
4. Save the restriction change, allow it to propagate, and reload the website. Changing restrictions on the existing key does not require a new frontend build.
5. Deploy the local autocomplete correction described below through Vercel. If the key itself changes, update `VITE_GOOGLE_MAPS_API_KEY` in the correct Vercel environment and rebuild/redeploy. Vite embeds these values at build time. [Vite environment variables](https://vite.dev/guide/env-and-mode), [Vercel environment changes](https://vercel.com/docs/cli/env).
6. Verify the map loads, selecting a place updates the patient search coordinates, and selecting/saving a clinic location persists coordinates. An empty doctor list can remain valid when no available clinics match the radius.

Local correction prepared:

`frontend/src/components/PlaceAutocomplete.tsx:22` previously treated `gmp-select` as a CustomEvent and accessed `event.detail.placePrediction`. Google supplies `placePrediction` directly on `PlacePredictionSelectEvent`, so the previous handler fails before it retrieves the selected address and coordinates. This affects both PatientSearch and DoctorDashboard.

The handler now uses:

```typescript
const handleSelect = async (event: google.maps.places.PlacePredictionSelectEvent) => {
  const prediction = event.placePrediction;
```

This matches [Google's selection event example](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new). The same faulty property access was present in the production bundle. The correction is local and has not been committed, pushed, or deployed. Fetch failures and Maps loading failures would also benefit from explicit user-facing error states; those improvements are not part of this minimal correction.

Credentials and access needed:

| Service | Needed for this fix | Existing application configuration |
| --- | --- | --- |
| Google Cloud | Project ID and an authenticated session with permission to edit the existing key's website/API restrictions. Permissions to enable APIs or manage billing only if those checks reveal a problem. | Existing browser API key is already present locally and in the deployed frontend. No Google OAuth client secret or service-account JSON is required by this integration. |
| Vercel | Access to project `alok-d5dd/doc-undo-jgjl` to deploy the code correction and inspect build/environment settings. | `VITE_GOOGLE_MAPS_API_KEY`; `VITE_API_URL=https://docundo.onrender.com/api/v1`. Configure Production and any Preview environments that should use Maps. |
| GitHub | Repository write access through an authenticated session if using the Git-based deployment workflow. The current local `gh` login reports an invalid token. | Remote is `Rahul-prvt/docUndo`; local branch is `main`. |
| Render | Not required to correct Google's referrer restriction. Dashboard access would allow checking the deployed revision/schema difference. | `ALLOWED_ORIGINS` already allows the production frontend. No Google Maps key is consumed by the Python backend. |
| Supabase | Not required for the map-loading fix. Schema access is needed for a separate database/authentication repair. | Runtime store requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE`. `SUPABASE_KEY` is declared for an anon client helper, but current auth routes do not use that helper. |
| Groq / Sentry | Not required for the map-loading fix. | `GROQ_API_KEY` powers AI chat/triage; `SENTRY_DSN` is optional monitoring. `ADMIN_SECRET_KEY` protects admin endpoints on Render. |

Use authenticated account access or configure values directly in the hosting dashboards; passwords and private tokens do not need to be pasted into chat. Backend service-role and admin secrets belong on Render, not in `VITE_*` variables that are bundled for browsers.

Repository findings beyond the immediate Maps issue:

| Priority | Finding and consequence | Evidence / recommended follow-up |
| --- | --- | --- |
| Critical | Doctor authentication trusts arbitrary bearer strings as doctor IDs. A known doctor ID can be supplied as the token to access that doctor's protected operations. | `backend/app/deps.py:22`, `backend/app/routers/auth.py:73`. Use verified Supabase Auth access tokens and map the verified user to the doctor record. No production impersonation test was performed. |
| Critical | Registration writes plaintext passwords to the doctors table; login compares them directly. | `backend/app/routers/auth.py:35,82`. Migrate authentication to Supabase Auth and remove plaintext password handling through a planned data migration. |
| High | The two SQL schemas describe incompatible auth/clinic structures. Root `db/schema.sql` has `auth_user_id` and no password field; `backend/db/schema.sql` requires a password and non-null clinic coordinates. Current signup can create clinic stubs without coordinates. | `backend/init_db.py` points to the root schema, while runtime auth expects the legacy password column. Consolidate migrations and inspect the live schema before changing it. Adding columns with `IF NOT EXISTS` also does not remove old NOT NULL constraints. |
| High | Search does not filter on `license_verified`, despite the admin verification workflow. | `backend/app/services/supabase_store.py:102`. Available, unverified doctors can be returned; define and enforce the intended discovery rule. |
| Medium | Render's public clinic request schema lacks the local `phone` field. | Compare `/openapi.json` with `backend/app/models/schemas.py:52`. Align deployed source and verify clinic phone persistence. |
| Medium | Maps failures have limited UI handling; an absent key hides autocomplete and Google detail-fetch rejection is uncaught. | `PlaceAutocomplete.tsx`, `MapView.tsx`, and `App.tsx`. Add useful loading/error feedback and retain manual clinic address entry. |
| Medium | Health checks do not exercise Supabase; search fetches doctor relationships and filters distance in Python. | `backend/app/main.py`, `supabase_store.py`. Add appropriate readiness diagnostics and move distance/filter work into a database query when scale requires it. |
| Medium | Documentation and deployment paths have drifted. Root README still describes Leaflet and different backend hosts; Docker frontend variables are supplied at runtime after the build. | README, Dockerfiles, docker-compose.yml. Document Vercel/Render settings and supply Vite variables during builds. |
| Medium | `render.yaml` uses a `pythonVersion` field absent from the current Blueprint reference. | Verify the dashboard runtime; prefer the documented `PYTHON_VERSION` variable or `.python-version` mechanism. This is not the observed map failure. [Render Python configuration](https://render.com/docs/python-version), [Blueprint reference](https://render.com/docs/blueprint-spec). |
| Medium | The backend log is tracked in Git and logs include account/clinic identifiers. | `backend/logs/backend.log`, auth and clinic routers. Stop tracking runtime logs and reduce personal data in logs in a separate cleanup. The pre-existing local log changes were preserved. |

Validation and limits:

- The frontend production build passed before and after the autocomplete correction (`npm.cmd run build`). The corrected bundle is `index-CI6oYNP_.js`.
- The six existing auth, search, and distance tests passed using `backend/venv`, with `DEBUG=false` and network access for the existing Nominatim-dependent search test. The root `.venv` has incompatible Starlette/httpx versions; both existing virtual environments differ from the pinned production requirements. These test passes do not establish authentication security or verify live Supabase.
- Browser verification established the exact production Google referrer error. Place selection after the Cloud configuration fix still needs an end-to-end check; it was not claimed successful during this review.
- No Google Cloud, Vercel, Render, or Supabase dashboard settings were changed. No production records were created or modified. Billing, API enablement, private deployment logs, and the full live database schema remain uninspected.
