# Production readiness — 15 September 2026

**Verdict: the frontend change is ready for review; the application is not ready for an unrestricted production launch.**

## Verified

- Production frontend build and TypeScript checks pass.
- Location regression suite: **30 passed, 0 failed, 0 skipped**, covering desktop and mobile. Application code has not changed since that passing run; the production build was rerun before commit.
- Real Google Maps browser checks passed with simulated browser coordinates and intercepted doctor responses: initial location, fresh Search coordinates, denied permission without a default search, and manual Google Places selection.
- Public Vercel website responds HTTP 200.
- Render `/health` responds HTTP 200 with `status: ok`, version `0.1.0`.
- Render CORS preflight allows the actual Vercel origin.
- PR workflow YAML and triggers validated locally. The workflow is configured for PR opened, synchronized, and reopened events. A remote CI pass and required branch protection have not been verified.

Live health checks only establish reachability; they do not prove the feature branch is deployed or validate every live workflow.

## Release blockers and gaps

1. **Critical: doctor identity is not authenticated.** `backend/app/deps.py` accepts the bearer value as a doctor ID. `backend/app/routers/auth.py` issues doctor IDs as access tokens. Protected routes need verified sessions/tokens and authorization tied to the authenticated identity before handling real patient/doctor data.
2. **Critical: plaintext password handling.** Signup persists the submitted password; login compares it directly. Migrate to a proper authentication provider or password hashing and plan safe migration/reset of existing credentials.
3. **Dependency findings:** `npm audit --omit=dev` reports two moderate affected packages (`react-router` and `react-router-dom`), with no high/critical findings in that frontend runtime audit. Review applicability and a compatible upgrade; this audit does not cover Python dependencies or development tooling. References: [redirect advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6), [SSR advisory](https://github.com/advisories/GHSA-337j-9hxr-rhxg), [router-dom advisory](https://github.com/advisories/GHSA-jjmj-jmhj-qwj2).
4. **Lint gate is broken:** the existing `.eslintrc.cjs` starts with invalid triple-quoted text and uses ESM syntax in a CommonJS file. The referenced TypeScript ESLint dependencies are also missing. Build/test success does not substitute for a working lint check.
5. **Coverage remains scoped:** the new CI suite tests frontend location behavior using isolated service boundaries. Backend security, Supabase schema/RLS, database migrations, full localization, and deployment-specific credentials still need separate verification.

## Git/deployment scope

The feature branch includes the location UX, its tests and PR workflow, and the existing Malayalam localization edits. Backend log changes and the older untracked deployment audit are excluded from this commit. No production database records, authentication settings, or billing settings were changed. Pushing this branch does not merge it into `main`; preview deployment depends on the connected Vercel project settings.
