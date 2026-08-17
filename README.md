# WTM — What's The Move

A Pittsburgh-first app for finding what's happening tonight. Invite-only, 17 to 25, built
around two kinds of plans:

- **Just Us** — small and private. A few people, someone's place, no crowd.
- **The Scene** — nightlife. Bars, shows, wherever the room is already full.

## Two builds

| | Path | What it is |
|---|---|---|
| **BETA** | [`beta/`](beta/) | The demo. One HTML file, no runtime dependencies. This is what gets shown to people. |
| **RAW** | [`wtm/`](wtm/) | The product. React Native + Expo + Supabase. Not shippable yet. |

They barely share files, which makes them a clean line to split work along.

## Running it

**The demo:**

```bash
cd beta && npm install && node build.js
```

Writes `dist/wtm-share.html`. Open it in a browser. That's the whole loop.

**The app:**

```bash
cd wtm && npm install && npx tsc --noEmit    # must report 0 errors
```

There is no Supabase project yet, so the app cannot reach a backend. The database, however,
runs locally and is fully tested:

```bash
sudo apt-get install -y postgresql-16 postgresql-16-postgis-3
cd wtm && supabase/tests/run.sh
```

Expected: `migrations failed: 0   assertions: 41 passed, 0 failed`. That applies all 19
migrations to a throwaway Postgres and asserts against the result — invite-gated signup, the
age gate, capacity and waitlist behaviour, feed enrichment, ban propagation, column
privileges, and RLS coverage on every table.

## Documentation

- **[`START_HERE.md`](START_HERE.md)** — read this first if you're new to the project.
- **[`WTM_REPORTS/STATE.md`](WTM_REPORTS/STATE.md)** — what is true right now. Kept current.
- **[`WTM_REPORTS/DECISIONS_FOR_MICHAEL.md`](WTM_REPORTS/DECISIONS_FOR_MICHAEL.md)** —
  everything still open, with the reasoning and the cost attached.

Everything else in `WTM_REPORTS/` is a dated snapshot and is labelled as such.

## Constraints

**Zero infrastructure cost.** No paid service, no metered API, no managed database, nothing
that can generate a bill. If the right fix costs money, it gets written up with the price and
the alternative rather than done.

**Nothing deploys itself.** No pushes to the default branch, no deploys, no production data.

## Provenance

WTM was originally built inside a fork of
[Tyrrrz/DiscordChatExporter](https://github.com/Tyrrrz/DiscordChatExporter), which is unrelated
to this project and shared nothing with it but a folder. This repository contains only WTM.
