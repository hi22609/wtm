# STATE — what is true right now

**Last updated: 2026-08-17.**

This is the one file that is kept current. Everything else in `WTM_REPORTS/` is a dated
snapshot of what was known on the night it was written, and some of it has since been
overtaken. Where an older report contradicts this file, **this file is right.**

Read this first. Then `OPEN_DEFECTS.md` for what is visibly wrong right now, and
`DECISIONS_FOR_MICHAEL.md` for what is still open.

---

## Where things are

Branch: **`main`**.

This repository was extracted on 2026-08-17 from a fork of `Tyrrrz/DiscordChatExporter`, where
WTM had been built by accident. Nothing of that project came across — it shared a folder with
WTM and nothing else. Older reports below still refer to the branch `overnight/2026-08-12` and
to `master`; that is the old repo, and the file contents are identical.

| | Path | What |
|---|---|---|
| **BETA** | `beta/` | The demo. One HTML file, no runtime dependencies. This is what gets shown to people. |
| **RAW** | `wtm/` | The product. React Native + Expo + Supabase. Not shippable yet. |

## The database — resolved

The single biggest unknown in this project was whether RAW's schema had ever been deployed.
**It had not.** Seven of sixteen migrations failed outright on a clean database, so nothing
after migration 004 has ever existed anywhere, while the client has been calling all of it.

That is fixed. **19 migrations, 0 errors, 41 assertions passing** against real Postgres +
PostGIS. Reproduce it yourself:

```bash
sudo apt-get install -y postgresql-16 postgresql-16-postgis-3
cd wtm && supabase/tests/run.sh
```

Expected last line: `migrations failed: 0   assertions: 41 passed, 0 failed`.

This supersedes the headline in `02_AUDIT.md` and section 1 of `MORNING_BRIEF.md`, both of
which say the database has never been run and that the fixes are unverified. They were true
when written.

## What changed since the overnight run

| Was | Now |
|---|---|
| 7 of 16 migrations failed; every SQL claim unverified | 19 apply clean, verified under two collation orders |
| Sign-up broken for every user (FK violation in `handle_new_user`) | Fixed and tested |
| `promote_from_waitlist` callable by anyone with the anon key | Revoked from `PUBLIC` — the earlier revoke targeted roles that never held the grant |
| `search_path = ''` silently breaking the functions it hardened | Pinned to `public, extensions` |
| Two `nearby_moves` overloads; client bound the one without `hot_score` / `crew_going` / `waitlist_count` | One signature; feed returns all three |
| `profiles` published every member's push token, birthdate and Instagram handle | Own-row only, with a `public_profiles` view for what others may see |
| "Just Us" and "The Scene" missing from RAW's category enum | Added, and wired into the picker and filter bar |
| BETA's four story circles were raw `#7C0EBF` / `#10B981` / `#F59E0B` against a fully desaturated feed | Each story now derives its gradient from the move it links to, so it cannot drift off-palette again |
| BETA's floating `+` covered every card's "I'm in" — measured 39px of a 76px button, and `elementFromPoint` returned the FAB, so the tap went to Create | `+` moved into the topbar, outside the scroll container. The collision is now structurally impossible |
| Nothing in BETA's suite asserted layout; 7 checks passed green over two elements stacked on top of each other | `tools/diag-layout.js` asserts every interactive element owns its own centre point, swept across scroll offsets. Verified to fail on the pre-fix build |
| BETA's LIVE bar and the map's "moves live" pill hardcoded iOS red, which read pink in light mode | Routed through `--signal`; both themes now derive from one token |
| The LIVE ticker clipped mid-word — "across Pittsburgh ri…" — on 4 of 6 strings | Seeds shortened, and `fitTicker()` trims runtime-built strings at a word boundary |
| The canvas and vector maps drew OS emoji for the airport, friend faces and every pin label | Drawn primitives and name initials; pin labels are title-only |
| The four moves added in `e03ab9c` existed in `MOVES` and no other table — the top card read 412 going, 0 reactions, no attendees | `ALL_GOING` is now the one authored roster; friends-going and each friend's moves derive from it. Asserted |
| The cast rename left `FRIENDS_LIST.init` behind, so Friends showed "A" for Mike and "D" for Luca | The initial is `name[0]`; the field is gone |

## Still open

In `DECISIONS_FOR_MICHAEL.md`, which is current. The short version:

- **0** — the map cannot reach Snap Map quality inside a claude.ai artifact. Needs hosting.
- **3** — demo feedback does not reach Michael automatically.
- **4** — push notifications are entirely dead code. Nothing ever writes a token.
- **5** — four remaining BETA/RAW mismatches (see `01_DRIFT.md`, items 1, 3, 5, 6).
- **6** — every move created in RAW is pinned to downtown Pittsburgh. No geocoding.
- **7** — no lockfile, orphaned files, unfilled EAS placeholders.

Blocked on Michael, nobody else can do it: **GitHub Settings → Pages → Source → "GitHub
Actions"**, which is what publishes the demo with a real vector map.

## The two rules

**Zero infrastructure cost.** No paid service, no metered API, no managed database, nothing
that can generate a bill. If the right fix costs money, write it up in
`DECISIONS_FOR_MICHAEL.md` with the price and the alternative instead of doing it.

**Never push to `main` directly, never deploy, never touch production data.** Work on a
feature branch. Michael merges it — reviewing out loud in the room is still review, and it
still happens before the merge, not after.

This file said the opposite for part of 2026-08-17: *"Push straight to `main`. No pull request
needed."* That was wrong and is corrected here and in `START_HERE.md`. `main` is what the live
demo builds from, so a push to it is public within about a minute — pushing to `main` **is**
deploying, and deploying is Michael's call, not an agent's. Pull before you push so you don't
land on top of whoever else is working, and never commit a key, token or password: the repo
is public.

## Live artifacts

- Share page: `https://claude.ai/code/artifact/01e27f77-0230-4770-81a6-343205a35cc4`
- Raw app demo: `https://claude.ai/code/artifact/141388bc-393f-4d4f-8110-28a209e75919`

Publishing to these is deploying. Michael's call, not an agent's.
