# PagaYa — Agent Guide

## What is this

Next.js 15 web app + Capacitor 8 mobile (Android/iOS). Manages debts between friends.
Stack: React 19, TypeScript, Tailwind, shadcn/ui (Radix), Supabase (Auth + Postgres + Storage).

## Quick commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` → http://localhost:9002 |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Build (web) | `npm run build` |
| Build Android APK (debug) | `npm run mobile:apk:debug` |

No test suite exists. `lint` + `typecheck` is the verification gate.

## Code layout

- `app/` — Next.js App Router pages (auth, debts, friends, groups, history, profile)
- `src/components/` — UI components (shadcn/ui primitives + app components)
- `src/hooks/use-pagaya.ts` — **monolithic context/hook** (3000+ lines). All domain logic: auth, CRUD for friends/debts/groups, Supabase queries, push registration, theme. This is the file to read first for any feature work.
- `src/lib/` — `supabase.ts` (browser client singleton), `types.ts` (all domain types), `utils.ts` (cn helper)
- `supabase/` — `schema.sql` (DB schema), edge functions under `functions/`
- `scripts/` — push dispatcher, release script
- `android/`, `ios/` — Capacitor native shells

## Key conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Supabase client**: always use `getSupabaseBrowserClient()` from `src/lib/supabase.ts`. Returns `null` if not configured — guard against it.
- **UI primitives**: shadcn/ui (Radix-based). Add via `npx shadcn@latest add <component>`. Config in `components.json`.
- **No server-side auth**: everything runs on the client via Supabase browser client.
- **Static export** for mobile: `NEXT_STATIC_EXPORT=true next build` outputs to `out/`, Capacitor reads from `out/` not `public/`.
- **Language**: UI and README are in Spanish. Keep consistency.
- **ESLint ignored during builds** (`next.config.ts`). Lint only via `npm run lint`.
- **TypeScript**: `strict: true`, `--noEmit`. `ignoreDeprecations: "6.0"` (TS 6 dev).

## Environment

Only two vars needed (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

App won't crash without them — `isSupabaseConfigured()` gates all Supabase calls.

## CI

Single workflow: `.github/workflows/android-latest-apk.yml` — builds signed Android APK on push to `main`. Needs `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` secrets.

## Gotchas

- `use-pagaya.ts` is the bottleneck for any feature change. It's a single 3000+ line provider. No splitting yet.
- Mobile builds use static export, so server features (API routes, middleware) won't work on mobile.
- `patch-package` is installed — check for patches in `patches/` if deps behave unexpectedly.
- `capacitor.config.ts` reads `CAP_SERVER_URL` env var for dev mode (points to local server).
- Supabase RLS policies are the real access control. Client code doesn't enforce authorization — the DB does.
