## How to help in this repository — Copilot instructions

This project is a Next.js + TypeScript SaaS (Multisigner - "SignTusk") with multiple modules (SendTusk, SignTusk, Admin, etc.). Below are concise, actionable instructions for coding agents to be immediately productive here.

1. Big picture & where to look
   - Frontend (App Router): `src/app/*` — pages, API route handlers live under `src/app/api/*`.
   - Core services & business logic: `src/lib/` (e.g. `dynamic-supabase.ts`, `realtime-service.ts`, `documents-service.ts`). Read these first to understand data flows.
   - Components: `src/components/` organized by feature (e.g. `features/send`, `features/sign`). Prefer editing UI through these feature folders.
   - Docs & design decisions: `PROJECT_DOCUMENTATION/` and `docs/` (notably `00_PROJECT_OVERVIEW.md` and `docs/guides/MODULE_FLOWS_DOCUMENTATION.md`). Use these as the truth for module responsibilities and current status.

2. Key integrations & conventions (do not break)
   - Supabase is the primary backend (Auth, Postgres, Storage). DB table prefix conventions are important: `send_` tables for SendTusk, `sign_` (or `signing_`) for SignTusk. Do not rename tables or buckets without updating verification docs and RLS policies in `PROJECT_DOCUMENTATION`.
   - Storage buckets use `send-` / `documents` naming. Keep prefixes consistent.
   - Real-time channels use Supabase channels in `src/lib/realtime-service.ts` and `src/lib/send-tab-realtime-service.ts`. Prefer subscribing through those helpers.
   - Queues & caching: Upstash Redis and QStash are used. Search for `@upstash` references when changing queue logic.

3. Project-specific patterns
   - App Router + API routes: API route files are under `src/app/api/<module>/.../route.ts`. Use the same pattern when adding endpoints (never add top-level `pages/api/`).
   - Error handling: use `src/lib/api-error-handler.ts` and `src/lib/auth-interceptor.ts` where applicable—keep consistent error shape (see existing routes for examples).
   - Authentication: Supabase Auth + JWT cookies. Look at `src/lib/auth-config.ts`, `src/lib/auth-cookies.ts`, and middleware in `middleware/redis-middleware.ts` for request patterns.
   - Services layer: business logic lives in `src/lib/*-service.ts`. Prefer adding helpers there instead of inline in route handlers.

4. Build, dev, and test commands (what to run locally)
   - Start dev server: `npm run dev` (uses `next dev`).
   - Build: `npm run build` or `npm run build:static` to export static artifacts.
   - Tests & checks: `npm run lint` runs ESLint; there are custom scripts: `npm run test:schedule`, `npm run validate:mail` (see `package.json`).
   - Environment: copy `.env.example` → `.env.local` and configure Supabase/Upstash/Resend credentials before running.

5. Quick debugging checklist
   - Reproduce locally with `npm run dev` + `.env.local` configured.
   - Use `test-supabase-connection.js` and `test-send-module.md` for quick validation of Supabase connections and send flow.
   - Check Supabase table prefixes and RLS errors in server logs; missing permissions usually indicate RLS misconfiguration.

6. Where to modify & examples
   - Add new SendTusk API: create `src/app/api/send/<resource>/route.ts` and call service in `src/lib/documents-service.ts` or a new `src/lib/send-*.ts` service.
   - To adjust realtime events: update/extend `src/lib/realtime-service.ts` or `src/lib/send-tab-realtime-service.ts` and update frontend subscription code in `src/components/features/send/*`.
   - To change authentication flow: modify `src/lib/auth-config.ts`, `src/lib/auth-cookies.ts`, and corresponding middleware.

7. Tests and non-obvious checks
   - Many functional checks are documented under `PROJECT_DOCUMENTATION/` (e.g., `SEND_MODULE_VERIFICATION.md`). After changes, run the documented manual checks there.
   - There are small helper scripts in repo root (e.g., `test-supabase-connection.js`, `test-send-module-dynamic-updates.js`) — use them to validate integrations.

8. Do NOTs (important safety/conventions)
   - Do not change DB table or bucket prefixes (`send_`, `send-`, etc.) without updating all code and documentation and RLS policies.
   - Avoid editing large service files without adding tests or updating the docs in `PROJECT_DOCUMENTATION/`.
   - Don’t add API routes outside `src/app/api/*` or change the App Router structure.

9. Where to find help/context
   - Module status, design decisions, and checklists: `PROJECT_DOCUMENTATION/` (start at `00_PROJECT_OVERVIEW.md`).
   - Send module deep-dive: `SEND_MODULE_COMPREHENSIVE_ANALYSIS.md`, `SEND_MODULE_VERIFICATION.md`.
   - Real-time patterns: `SUPABASE_REALTIME_SEND_MODULE_ANALYSIS.md`.

If anything here is unclear or you'd like the file to include CI, code-owner, or additional examples for common edits (e.g., adding an API route + test), tell me which sections to expand and I will iterate.
