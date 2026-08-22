# WTM — FINAL AUDIT

Commit `90b858e`, branch `fix/beta-story-rings-fab-overlap`, 2026-08-21.
Supporting detail: `00-RECON.md`, `02-CONSISTENCY.md`, `05-ARCHAEOLOGY.md`, `06-LANGUAGE.md`,
`registry/`. Machine-readable: `FINDINGS.json`.

---

## ⚠️ READ THIS BEFORE TRUSTING ANY NUMBER IN THIS REPORT

**Pass 9 (independent falsification) did not run, and the adversarial refutation layer failed
three times.** Session limits killed 87 verifier agents on Pass 2, 73 on the retry, and all 7 on
Pass 3–8. Pass 9 as specified also requires a fresh session with no memory of the prior passes,
which I cannot create — that is `/clear` on your side.

What that means concretely:

- **11 findings are PROVEN.** I executed them against a real Postgres+PostGIS instance with the
  migrations applied, or ran the failing command. These are not readings; they are results.
- **78 findings came from subagents and are UNVERIFIED.** They are specific and well-cited, and
  the six I spot-checked held up — but the contract's own standard says an unverified finding is
  a hypothesis. **Do not treat the 78 as facts.** They are in `FINDINGS.json` with
  `status: "unverified"`.
- The audit is therefore **reliable in its P0s and provisional below that**. I have not met the
  contract's evidence bar for the long tail, and I am saying so rather than presenting volume as
  confidence.

**To finish this properly:** `/clear`, then point a fresh session at `/audit/*.md` with the Pass 9
prompt. That is a real and necessary step, not a formality.

---

## 1. The single thing that kills this app

**Any logged-in user can compute where any other user will be tonight, and the test suite that
gave you confidence cannot see it.**

`rsvps` carries the RLS policy `rsvps_public_read USING (true)` (`005_rsvps.sql:59-60`). In a real
Supabase project, `authenticated` holds `SELECT` on every table in `public` by default, so that
policy is the only gate — and it is open. Three statements, executed against the real schema, turn
that into a complete person-to-planned-location index: read a uuid from `public_profiles` (which
the app exposes deliberately), join `rsvps` to `moves`, and you have the name, place and time.
Drop the `where` clause and you have it for **every user in the city at once**. Separately,
`nearby_moves` accepts the target's uuid as a *caller-supplied parameter* with no check that it
equals `auth.uid()` (`016:30`), and it is `SECURITY DEFINER`, so passing a victim's id returns
their RSVP status for every move in the radius **and** their private invite-tree friend list. I ran
both attacks. They work.

This is not a bug in a feature. It is the product's entire premise — *planned* location — with no
access control on the table that stores it. For a 17–25 audience in one city, that is the
difference between an app and an incident. And the reason it survived 49 green assertions is that
`supabase/tests/00_supabase_shim.sql:6-11` creates the `anon` and `authenticated` roles **without
granting them anything**, so the harness tests RLS in a world where those roles cannot read the
tables at all. The suite is not wrong; it is testing a different database than the one you will
deploy.

---

## 2. Ten items, in execution order, to reach a launchable state

| # | Do this | Hours | Open first |
|---|---|---|---|
| 1 | **Fix the grant model in the test harness**, then re-run. Add Supabase's default grants to the shim so RLS is tested as deployed. Everything below depends on being able to see failures. | 1 | `wtm/supabase/tests/00_supabase_shim.sql:6-11` |
| 2 | **Lock `rsvps`.** Replace `USING (true)` with attendee-or-creator-scoped read; expose counts through the existing SECURITY DEFINER RPCs, which already aggregate. Re-run the suite — expect breakage, that is the point. | 4 | `wtm/supabase/migrations/005_rsvps.sql:59` (new migration `021`, never edit an applied one) |
| 3 | **Kill the `uid` parameter.** Drop it from `nearby_moves` and use `auth.uid()` throughout the body; update the one caller. | 2 | `wtm/supabase/migrations/016_one_nearby_moves.sql:30` |
| 4 | **Make it build.** Pin `nativewind` to `4.1.23` — or delete nativewind entirely, which is 9 `className` attributes in 4 files and removes the whole broken chain. | 1 | `wtm/package.json:57` |
| 5 | **Restore the invite mint.** No member can invite anyone; the growth loop is dead at the schema level. | 3 | `wtm/supabase/migrations/015_security_hardening.sql:56-104` |
| 6 | **Ship account deletion.** In-app, discoverable, with a cascade. Hard App Store gate. | 6 | `wtm/app/(tabs)/profile/index.tsx:161-174` |
| 7 | **Wire the feed's faces.** `AttendeePile` is passed the literal `attendees={[]}`; `nearby_moves` already returns `crew_going`. The differentiator currently renders as a grey circle. | 2 | `wtm/src/components/moves/MoveCard.tsx:199` |
| 8 | **Fix the four blank surfaces** (attendees screen, profile's My moves, map fetch failure, RSVP-loading-as-not-going). | 4 | `wtm/app/move/[id]/attendees.tsx:15` |
| 9 | **Seed content, or do not launch.** There is no editorial or public content, so the first user opens an empty map. Twenty real Pittsburgh spots and five real moves for opening week. | 6 | `wtm/supabase/seed.sql` |
| 10 | **Run the real Pass 9** against `/audit/*.md` in a fresh session, then re-rank. | 2 | `/audit/FINDINGS.json` |

**≈31 hours** to a state where the app builds, does not leak location, can grow, and will pass
first review. That is the honest number for the blockers only; it excludes the 78 unverified
findings.

---

## 3. The one-sentence verdict

**No — this cannot go in front of Pittsburgh users**, and the blocker is not polish: the app does
not compile, no member can invite anyone, and any logged-in user can query where any other user
will be tonight; it becomes launchable when items 1–6 above are done and a fresh-session Pass 9
has confirmed the rest of this report.

---

## 4. P0 — LAUNCH BLOCKERS (5 of 5, all PROVEN by execution)

| # | Finding | Evidence |
|---|---|---|
| **P0-1** | **`rsvps` is world-readable → person-to-planned-location index.** `rsvps_public_read USING (true)`. With Supabase's default grants, any authenticated user joins `public_profiles` → `rsvps` → `moves` and gets who is going where, when. Dropping the `where` returns it for everyone at once. | Executed: 4/4 rows returned for an unrelated attacker. `005_rsvps.sql:59-60` |
| **P0-2** | **`nearby_moves` trusts a client-supplied `uid`.** No `= auth.uid()` guard, `SECURITY DEFINER`. Passing a victim's uuid returns their RSVP status for every move in radius **and** their private invite-tree friends. | Executed: honest call → `(not going)`; spoofed call → `going`, plus the victim's friend `vicfriend`. `016:30,88,100-113` |
| **P0-3** | **The app does not build.** `nativewind ^4.0.1` floats to 4.2.6 → `react-native-css-interop@0.2.6` `babel.js:13` requires `react-native-worklets`, absent. Dies on the first module. Also means 0 of 14 tests have ever run. | Executed: `expo export` exit 1. Fix verified: pin `4.1.23` → 4.82 MB bundle, exit 0; 14 tests pass. |
| **P0-4** | **No member can invite anyone, and the app is invite-only.** Migration 015's `handle_new_user` only *consumes* codes; 007's mint was dropped. Every member created through the trigger has zero codes. | Executed: 6 of 8 members hold 0 invite codes; the 2 exceptions were inserted by the test itself. `015:56-104` vs `007:65-73` |
| **P0-5** | **No in-app account deletion.** Guideline **5.1.1(v)** — mechanically checked, automatic first-pass rejection. Aggravated by `privacy-policy.md:52-54` promising an in-app option that does not exist. | grep across `app/`, `src/`, all 21 migrations: zero delete path. |

**Why all five survived to now:** the harness grant gap (P0-1's mechanism) hides 1 and 2; the
broken build (3) means nothing has been exercised; and 4 and 5 are absences, which no test asserts.

## 5. P1 — FIRST WEEK (10)

1. **Test harness omits Supabase's default grants** — `tests/00_supabase_shim.sql:6-11`. The 49 green assertions test a database with no privileges. *(PROVEN.)*
2. **Feed cards render zero faces** — `MoveCard.tsx:199` passes `attendees={[]}`. *(PROVEN.)*
3. **`nearby_moves` only returns moves starting within 24 hours** — `016:132`. A move posted a week out is invisible until the day before, on a *planned*-location product. *(PROVEN by reading; verify against product intent.)*
4. **No font is ever loaded** — 5 Inter faces declared in `tailwind.config.js:44-50`, `useFonts` appears nowhere, no font files in `assets/`. *(PROVEN.)*
5. **Four surfaces render nothing** — attendees screen, profile's My moves, failed map fetch, RSVP-loading-as-"Join Move". *(PROVEN, see `02-CONSISTENCY.md` §7.)*
6. **`get_user_moves` has no block filter** — a blocked user still sees the victim's upcoming moves. *(UNVERIFIED — verify first, it is a P0 if true.)*
7. **Raw Postgres error text reaches users** — `verify-age.tsx:63`, `create.tsx:129`, `add-spot.tsx:73`. *(PROVEN.)*
8. **RSVP double-join surfaces a duplicate-key error** — bare `.insert()` against `unique(move_id,user_id)` with `mutations.retry: 1`. *(PROVEN.)*
9. **`daily-digest` calls `nearby_moves` with a parameter name 016 deleted** — 500s on every invocation. *(UNVERIFIED, high confidence.)*
10. **Push notifications are entirely dead** — nothing ever calls `getExpoPushTokenAsync`, so `push_token` is always NULL and the only retention channel cannot fire. *(PROVEN by grep.)*

## 6. P2 — FIRST MONTH (top items; full list in `FINDINGS.json`)

Realtime is the first thing to break under load — three channels per active user
(`useActivity.ts:38`, `useMoveChat.ts:57`, `move/[id].tsx:42`) against a **200-connection** free
tier ceiling, so the app degrades at roughly **200 concurrent users, not 10,000**, and it fails
*silently* — chat and activity simply stop updating. • Every move created in-app is pinned to
hardcoded downtown coordinates (`create.tsx:107`). • No analytics on any funnel step. • Camera and
storage permissions declared but never used (Play Data Safety + review questions). • An
`Always`-location purpose string is generated for an app that only requests foreground — the worst
possible permission dialog for this audience. • 90 colours over a 23-token palette, 23 radii, 25
font sizes. • Touch targets: the primary RSVP control is 36pt. • The 26-year-old is told *"Come
back on your 17th birthday."*

## 7. P3 — BACKLOG

One line each in `FINDINGS.json` (`severity: "P3"`): orphaned `useSearchUsers.ts`; `zod` +
`react-hook-form` + `@hookform/resolvers` with zero imports; `crew`/`squad`/`friends` naming split;
case drift on six hex colours; `"Community favorite"` and `"Join Move"` copy; category-label
register mismatch; Edit Profile save landing on the Map tab; map/list toggle 36pt vs 44pt;
EAS placeholders; Expo SDK 51 six generations stale.

## 8. Where I was wrong

Recorded because a hostile auditor who never self-corrects is just a confident one. In Pass 2 the
adversarial layer killed **two of my own five candidates** (the "duplicate date-format string" and
"three date formats" claims), a third was refuted 3/3 (the error-title collision — I had the
mechanism wrong), and I refuted two more myself by reading. In this pass, a subagent's P0 claim
that `rsvps` is world-readable **failed** in the harness — and chasing *why* is what uncovered the
grant gap, which is a bigger finding than the original. The refutation layer is the most valuable
part of this protocol and it is the part that kept dying.

## 9. Cost

Nothing was spent. No account created, no service enabled, no key issued, no deploy. The one paid
path this audit touched — EAS Build — is flagged, not used. Postgres and PostGIS are local.
