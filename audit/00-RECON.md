# PASS 0 — RECON & GROUND TRUTH

**Audited:** commit `5659429`, branch `fix/beta-story-rings-fab-overlap`, 2026-08-20.
**Scope note:** `/audit/` is written at repo root (`/home/user/wtm/audit/`), not filesystem root.

**Auditor conflict of interest — read this first.** The agent writing this audit authored a
large share of the `beta/` changes in this branch earlier the same session, including code it
later found broken (the canvas `YOU` label). Findings against `beta/` are self-review and should
be weighted accordingly. Findings against `wtm/` (the React Native app) are against code this
agent did not write. Pass 9 must run in a fresh session, per the contract, precisely for this
reason.

---

## 1. Repo map

Two independent halves that share no code:

| Half | Path | What it is | Source LOC |
|---|---|---|---|
| BETA | `beta/` | The demo. One self-contained HTML file + build script + Playwright harness. No runtime deps. | 5,057 (16 files) |
| RAW | `wtm/` | The product. Expo / React Native / Supabase. **This is the liability surface.** | 4,032 app + 3,448 src + 2,985 supabase |

Non-source: `WTM_REPORTS/` (23 md, 31 png), `.github/workflows/wtm-demo-pages.yml` (65 lines).

**10 largest source files**

```
3095  beta/wtm-beta.html
 616  beta/wtm-share-shell.html
 481  wtm/src/types/database.ts
 471  wtm/app/(tabs)/index.tsx
 424  wtm/app/move/[id].tsx
 383  wtm/app/(tabs)/create.tsx
 375  beta/map-real.html
 342  wtm/supabase/tests/01_functional.sql
 292  wtm/src/types/app.ts
 278  wtm/app/add-spot.tsx
```

**Blast radius — 10 most-imported internal modules in RAW** (change one, retest all consumers):

```
32  @/types/app          26  @/lib/supabase       22  @/store/authStore
10  @/lib/queryClient     8  @/components/ui/Avatar   7  @/utils/time
 4  @/lib/log             3  @/store/filterStore   3  @/lib/storage
 3  @/hooks/useSpots
```

`@/lib/supabase` (26 importers) and `@/store/authStore` (22) are the two single points of
failure. Every network call and every auth decision routes through them.

**Dependencies:** 1,551 packages in lock, 1,510 installed by `npm ci`. Lockfile present
(764,864 bytes, lockfileVersion 3). **Lockfile drift: 0 entries** — `package.json` and the lock
root agree exactly on every dependency and devDependency.

> **Correction to existing docs:** `WTM_REPORTS/DECISIONS_FOR_MICHAEL.md` §7 says "Commit a
> lockfile — without it, installs are not reproducible." That is stale. `wtm/package-lock.json`
> exists, is committed, and has zero drift. Delete that line.

---

## 2. Does it build? — raw output

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | 1,510 packages, 23s |
| `npx tsc --noEmit` | **0** | clean, no output |
| `npx jest` | **1** | **2 suites failed, 0 tests ran** |
| `npx eslint . --ext .ts,.tsx` | **2** | **no config file found** |
| `npx expo export --platform ios` | **1** | **bundling failed on first module** |
| `wtm/supabase/tests/run.sh` | 0 | 21 migrations, 0 errors, **49 assertions passed** |
| `beta: node build.js && tools/diag-layout.js` | 0 | 10 layout assertions pass |

> **Correction to existing docs:** `STATE.md` claims "19 migrations, 41 assertions". Actual on
> this commit: **21 migration files (001–020 incl. 013a), 49 assertions.** Migration
> `020_admin_ban.sql` and 8 further assertions landed after that line was written.

### F0-1 — The app cannot be built. `expo export` fails on the first module. — CRITICAL

**Location:** `wtm/package.json:57` (`"nativewind": "^4.0.1"`) resolving to nativewind 4.2.6 →
`node_modules/react-native-css-interop/babel.js:13`.

**Reproduction:**
```bash
cd wtm && npm ci && npx expo export --platform ios --output-dir /tmp/out
```
```
iOS Bundling failed 833ms node_modules/expo-router/entry.js (1 module)
SyntaxError: node_modules/expo-router/entry.js: [BABEL] Cannot find module 'react-native-worklets/plugin'
Require stack: … react-native-css-interop/dist/metro/transformer.js …
```

**Why:** `^4.0.1` floats to nativewind 4.2.6, which depends on `react-native-css-interop@0.2.6`,
whose `babel.js:13` requires `react-native-worklets/plugin`. `react-native-worklets` is a
Reanimated **4** package. This project pins `react-native-reanimated@3.10.1`, which does not
provide it, and css-interop does not declare it as a dependency. The lockfile faithfully records
this broken resolution, so `npm ci` reproduces it every time on every machine.

**Consequence:** There is no path to a build artifact. No EAS build, no TestFlight, no
simulator run from a clean checkout, no store submission. A pre-launch app that cannot produce a
bundle is not pre-launch. This blocks every other launch task and it blocks CI before CI exists.

**Fix (verified, not proposed):**
```diff
--- a/wtm/package.json
+++ b/wtm/package.json
-    "nativewind": "^4.0.1",
+    "nativewind": "4.1.23",
```
then `npm install` to rewrite the lock. Verified on this machine:
```
Exporting 1 bundle for ios:
_expo/static/js/ios/entry-ba5ff3edd7c1e778b7c112cf6a9ef127.hbc (4.82 MB)
App exported to: /tmp/wtm-export2          EXPORT_EXIT=0
```
nativewind 4.1.23 pulls css-interop 0.1.22, which has no worklets requirement and the same
`react-native-reanimated: >=3.6.2` peer range. Pin exactly — do not use a caret here, that is
what caused this.

### F0-2 — The test suite has never executed. 0 of 14 tests run. — HIGH

**Location:** same root cause as F0-1. Affects `wtm/src/utils/__tests__/distance.test.ts` and
`wtm/src/utils/__tests__/time.test.ts`.

**Reproduction:** `cd wtm && npm ci && npx jest`
```
Test Suites: 2 failed, 2 total
Tests:       0 total
```
Both suites die in `babel-jest` at config load, before a single test body is reached.

**Consequence:** `distance.ts` and `time.ts` are the two modules that compute what the product
sells — how far away a move is, and when it starts. They are the only tested modules in the
repo and their tests have never once run. Any regression in either ships silently. `npm test`
appearing in `package.json` creates the false impression that this is covered.

**Fix:** F0-1's pin. Verified after applying it:
```
PASS src/utils/__tests__/distance.test.ts
PASS src/utils/__tests__/time.test.ts
Tests: 14 passed, 14 total          JEST_EXIT=0
```
14 tests exist and all pass. They were simply never reachable.

### F0-3 — `npm run lint` has never run. No ESLint config exists. — MEDIUM

**Location:** `wtm/package.json:19` declares `"lint": "eslint . --ext .ts,.tsx"`;
`eslint-config-expo@^7.0.0` is in devDependencies; there is no `.eslintrc`, `.eslintrc.js`,
`.eslintrc.json`, or `eslintConfig` key anywhere in `wtm/`.

**Reproduction:** `cd wtm && npx eslint . --ext .ts,.tsx`
```
ESLint couldn't find a configuration file.
ESLINT_EXIT=2
```

**Consequence:** Zero static analysis on 76 TS/TSX files. Unused variables, floating promises,
missing hook dependencies, and unreachable code are all uncaught. The installed config package
was paid for in install time and never wired up.

**Fix:** create `wtm/.eslintrc.js`:
```js
module.exports = { extends: 'expo', ignorePatterns: ['/dist/*', 'node_modules'] };
```

### F0-4 — Expo SDK 51 is six generations stale; it will not pass store review. — HIGH

**Location:** `wtm/package.json:24-25` — `"expo": "~51.0.0"`, `"react-native": "0.74.5"`.

**Reproduction:** `npm view expo version` → `57.0.15`. Installed: `51.0.39`, published
**2024-11-08**. `npm view react-native version` → `0.87.0`; installed `0.74.5`. Today is
2026-08-20 — the pinned SDK is ~21 months old and SDK 54, 55, 56 and 57 have all shipped since
(54: 2025-09-10, 55: 2026-02-25, 56: 2026-05-20).

**Consequence:** Two hard gates, both outside this repo's control. EAS Build drops support for
old SDKs on a rolling basis, so `eas build` may refuse the project outright. Google Play
requires `targetSdk` within one year of the current API level and Apple enforces a minimum
Xcode/SDK for new submissions — an SDK-51 binary will be rejected at upload, not at review.
Every day this is deferred, the upgrade gets larger; 51 → 57 crosses the New Architecture
default flip, which is not a version-bump-and-go.

**Fix:** Not a one-liner and must not be attempted as part of any other change. Budget a
dedicated upgrade: `npx expo install --fix` against SDK 57, then work the New Architecture
migration for `react-native-maps` and `react-native-reanimated`. Do this **before** writing more
screens, because every screen written now is a screen that must be re-verified after.

### F0-5 — Every build and submit script fails on unfilled placeholders. — MEDIUM

**Location:** `wtm/app.json:113` `"projectId": "YOUR_EAS_PROJECT_ID"`; `wtm/eas.json:32-34`
`"appleId": "YOUR_APPLE_ID"`, `"ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"`,
`"appleTeamId": "YOUR_APPLE_TEAM_ID"`.

**Reproduction:** `npm run build:ios` / `npm run submit:ios`.

**Consequence:** All four npm scripts that exist to ship the app abort immediately. Compounds
F0-1: even once the bundle builds, there is no configured destination for it.

**Fix:** Fill from the EAS dashboard once an EAS project exists. Free tier is sufficient to
obtain the IDs. **Cost note:** EAS Build's free tier is limited-concurrency but not $0-capped on
paid plans — do not enable a paid plan without a decision; local `expo run:ios` on a Mac is the
zero-cost path.

---

## 3. Stack — determined from files on disk

| Layer | Actual | Evidence |
|---|---|---|
| Framework | Expo SDK 51.0.39 / React Native 0.74.5 / React 18.2.0 | `package.json:24-26`, lock |
| Navigation | `expo-router` 3.5.24 (file-based, 21 routes in `wtm/app/`) | `package.json:25`, `app/` tree |
| Server state | `@tanstack/react-query` 5.101.4 (19 importers) | `src/lib/queryClient.ts` |
| Client state | `zustand` 4.5.7 — `authStore`, `filterStore`, `locationStore` | `src/store/` |
| Backend | Supabase (Postgres 16 + PostGIS), `@supabase/supabase-js` 2.112.3 | `src/lib/supabase.ts` |
| Auth | Supabase Auth, email/password + invite gate + age gate | `app/(auth)/*` |
| DB schema | 21 SQL migrations, RLS on every public table, 49 assertions green | `supabase/migrations/` |
| Serverless | 3 Deno edge functions | `supabase/functions/` |
| Storage | Supabase Storage, public-URL bucket | `src/lib/storage.ts:24-27` |
| Maps/geo | `react-native-maps` 1.14.0 + `expo-location` 17.0.1 + PostGIS `nearby_moves` | `constants/mapStyle.ts` |
| Styling | `nativewind` 4.2.6 + Tailwind 3.4 | `babel.config.js`, `tailwind.config.js` |
| Forms | `react-hook-form` + `zod` 3.25.76 | `package.json` |
| Push | `expo-notifications` 0.28.19 — **installed, configured, and dead** | see below |
| Analytics | **None.** No SDK, no events, no funnel. | grep: no analytics package in lock |

**Push is dead code.** `expo-notifications` is a dependency, `profiles.push_token` exists in
schema, and `supabase/functions/daily-digest/index.ts` reads it — but
`getExpoPushTokenAsync` appears nowhere in `app/` or `src/`. Nothing ever writes a token, so
every notification the product implies is a no-op. Confirmed by grep across all 76 TS/TSX files.

**Analytics absence is a launch finding, not a nicety.** There is no way to answer "did anyone
use it" after launch. Pass 8 should treat this as a product-instrumentation gap.

---

## 4. Trust boundaries — the spine of Pass 3

### 4a. Client data crossing INTO the backend (23 write sites)

Every one is a point where a hostile client controls the payload. RLS is the only thing between
these and the table.

| Write | Location | Table |
|---|---|---|
| age/DOB write | `app/(auth)/verify-age.tsx:58` | `profiles` |
| profile edit | `app/(tabs)/profile/edit.tsx:47` | `profiles` |
| spot submission | `app/add-spot.tsx:65` | `spots` |
| move edit | `app/move/[id].tsx:79` | `moves` |
| move create | `src/hooks/useCreateMove.ts:17,65` | `moves` |
| host auto-RSVP | `src/hooks/useCreateMove.ts:38` | `rsvps` |
| chat send | `src/hooks/useMoveChat.ts:108` | `move_messages` |
| RSVP / un-RSVP | `src/hooks/useRSVP.ts:36,101` | `rsvps` |
| reactions | `src/hooks/useReactions.ts:40,48` | `move_reactions` |
| block / unblock | `src/hooks/useSafety.ts:35,40` | `blocks` |
| **report** | `src/hooks/useSafety.ts:64` | `reports` |
| spot save / fire | `src/hooks/useSpots.ts:53,60,98,105,141,156` | `spot_saves`, `spot_fires`, `spots` |
| waitlist join/leave | `src/hooks/useWaitlist.ts:28,45` | `rsvps` |
| avatar/cover upload | `src/lib/storage.ts:24` | Storage bucket, `upsert:true`, **public URL** |

### 4b. Another user's data crossing INTO this client (16 RPC + 12 read sites)

Every one is a potential over-disclosure. For a product whose differentiator is **planned
location**, each of these leaks where somebody intends to be.

| Read | Location | Exposes |
|---|---|---|
| `nearby_moves` | `app/(tabs)/index.tsx:71`, `src/hooks/useNearbyMoves.ts:20` | **other users' planned locations + attendee counts** |
| `nearby_spots` / `get_spot` | `src/hooks/useSpots.ts:19,34` | spot geometry |
| `get_move_attendees` | `src/hooks/useMove.ts:27,58`, `app/move/[id]/attendees.tsx:18` | **who is going where** |
| `get_user_moves` | `app/(tabs)/profile/index.tsx:24`, `app/user/[id].tsx:93` | **another user's movement history** |
| `move_chat_page` | `src/hooks/useMoveChat.ts:24` | message bodies + author identity |
| `my_rsvp_status`, `waitlist_position` | `useMove.ts:73`, `useWaitlist.ts:16` | own status |
| `get_my_invite`, `get_my_referrals` | `src/hooks/useInvites.ts:11,24` | invite graph |
| `mark_activity_read`, `mark_chat_read` | `useActivity.ts:83`, `useMoveChat.ts:98` | own state |
| `public_profiles` | `app/user/[id].tsx:81`, `useMoveChat.ts:74`, `useSearchUsers.ts:24` | the 10-column allowlist view |
| `profiles` | `src/hooks/useSession.ts:34`, `verify-age.tsx:57` | own row only (per `019`) |
| `moves_with_counts` | `src/hooks/useMove.ts:15,43` | move + aggregates |
| `activity_feed` | `src/hooks/useActivity.ts:21,71` | cross-user activity |
| `move_reaction_counts` | `src/hooks/useReactions.ts:18` | aggregates |
| `blocks` | `src/hooks/useSafety.ts:14,34,39` | own block list |

### 4c. Unauthenticated / semi-trusted edges

| Edge | Location | Posture |
|---|---|---|
| `validate-invite` | `supabase/functions/validate-invite/index.ts` | called pre-auth from `app/(auth)/invite.tsx:37` and `app/i/[code].tsx:46`. Open oracle over the invite keyspace. |
| `generate-invite-codes` | `supabase/functions/generate-invite-codes/index.ts:24-25` | gated on `ADMIN_SECRET`, documented fail-closed when unset — **Pass 3 must verify the fail-closed claim, not trust the comment** |
| `daily-digest` | `supabase/functions/daily-digest/index.ts:23-25` | holds `SUPABASE_SERVICE_ROLE_KEY`; header comment shows it invoked with an **anon-key Authorization header** (line 18) |
| Storage public URL | `src/lib/storage.ts:24-27` | `upsert: true` + `getPublicUrl` — unguessable-path assumption to be tested in Pass 3 |
| Anon key in bundle | `src/lib/supabase.ts:11-12` | `EXPO_PUBLIC_*` ships inside the app binary by design. Every RLS policy is therefore the entire access control system. |

**Secrets posture:** no `.env` committed; `.env.example` holds only placeholders. No hardcoded
key found in `app/` or `src/`.

---

## 5. What Pass 1 must diff

The registries should be built against **RAW only** (`wtm/app`, `wtm/src`). `beta/` is a
single-file demo with no shared design system, so registry diffs across the two halves would
manufacture findings. Where BETA and RAW disagree on a user-facing promise, that belongs in the
drift pass, not the registry pass.

## 6. Status

Pass 0 complete. Five findings, all reproduced from a clean `npm ci` on this machine, two with
fixes verified by re-running the failing command to green.

**Everything downstream of F0-1 is suspect in one specific way:** no pass can claim runtime
behaviour of RAW, because RAW has never run. Passes 3–8 are reading code that has never
executed on a device. Any finding that depends on observed runtime behaviour must be labelled
`HYPOTHESIS` until the build is fixed and the app is actually launched on a simulator.
