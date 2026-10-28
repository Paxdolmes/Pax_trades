# Pax Trades

On-demand mobile app connecting Fulham (SW6) customers with vetted plumbers, electricians and Gas Safe heating engineers. Customers book an urgent callout or a fixed-price job; tradespeople accept nearby jobs they are qualified for.

Plan: [MVP plan](https://claude.ai/artifact/F4z5StZkvHjedKoJgYnkAK) · [Phase 0 launch kit](https://claude.ai/artifact/W9jngfqw8W2ubkRBQcGEyp)

## What's here

| Path | What it is |
| --- | --- |
| `mobile/` | One Expo (React Native) codebase that builds two store apps: **Pax** for customers and **Pax Pro** for tradespeople |
| `mobile/src/domain/` | Launch catalogue (trades, job types, prices, required credentials) and pure business rules, with tests |
| `supabase/migrations/` | Postgres schema: profiles, pros, credentials, jobs, offers, row level security, matching functions |
| `supabase/tests/` | SQL behaviour tests for vetting, matching and accepting offers |

## Run the apps

Needs Node 22 and the Expo Go app (or a simulator).

```bash
cd mobile
npm install
npm start          # customer app (Pax)
npm run start:pro  # tradesperson app (Pax Pro)
```

Scan the QR code with Expo Go. When switching between the two apps, add `-- --clear` so the bundler does not reuse the other app's config.

Without Supabase settings the apps run in **demo mode** with sample jobs. To connect a backend, copy `mobile/.env.example` to `mobile/.env.local` and fill in your Supabase URL and anon key.

## Set up the backend

1. Create a project at [supabase.com](https://supabase.com) (London region).
2. From the repo root: `npx supabase init`, `npx supabase link --project-ref <ref>`, then `npx supabase db push`.

`nearest_eligible_pros` is not callable by app users; it is meant for a server-side dispatcher (an Edge Function using the service role), which is the next piece of work.

## Checks

```bash
cd mobile && npm run typecheck && npx eslint . && npm test
supabase/tests/run.sh   # needs psql and Postgres with PostGIS (PG* env vars)
```

CI runs both on every pull request.

## Screenshots (demo mode)

| Customer: choose trade | Customer: describe job | Customer: job status | Pro: nearby jobs |
| --- | --- | --- | --- |
| ![](docs/screenshots/1-customer-home.png) | ![](docs/screenshots/2-customer-request.png) | ![](docs/screenshots/3-customer-status.png) | ![](docs/screenshots/4-pro-jobs.png) |
