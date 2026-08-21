# PASS 2 — THE DIFF

**Design source:** `wtm/tailwind.config.js` (the `[DESIGN_SOURCE]` placeholder was never
replaced, so it was determined from disk). 23 colour tokens, Tailwind's 4pt spacing scale plus
`safe: 34px`, 5 Inter weights. Registries in `/audit/registry/`.

**Scope:** RAW (`wtm/app`, `wtm/src`) only, per Pass 0 §5. `beta/` is a single-file demo with
its own token block; diffing the two halves would manufacture findings and belongs in the drift
pass.

**The finding that frames all of this:** of 34 `.tsx` files, **3 use `className` and 0 use
`StyleSheet.create`.** Everything is inline `style={{}}` with hand-typed literals. The design
system in `tailwind.config.js` is not a system anyone is consuming — it is a file.

**Verification status — read this before trusting the table.** Findings were checked by
independent adversarial agents instructed to refute them. **Two of my own five candidates were
killed and are recorded as such in §9.** Coverage was cut short twice by session limits: 10 of
34 candidates got a verdict. Rows below are marked `[V]` where an adversarial verdict upheld
them, `[R]` where I read the cited lines myself, `[V+R]` where both. Nothing in the table is
unverified.

---

## 1. Colour — near-identical values that are not identical

**90 distinct colours over 662 uses against a 23-token palette.**

| Registry | Expected | Actual | Locations | Fix |
|---|---|---|---|---|
| R2 `[R]` | App background = `surface.DEFAULT` `#141414` | `#0A0A0A` is used **48×**, `#141414` **6×**. The undocumented colour is the real background; the token is the exception. | `#0A0A0A` at 35 sites incl. `app/(tabs)/index.tsx:197`, `app/move/[id].tsx:389`; `#141414` at 6 | Add `surface.900: '#0A0A0A'` to the palette and keep it, or migrate 48 sites to `#141414`. Decide which is the product. Do not leave both. |
| R2 `[R]` | One grey ramp: `1E1E1E / 252525 / 2E2E2E / 383838` | Four off-ramp neighbours within ΔRGB 3–6: **`#1A1A1A`** (5×), **`#222222`** (3×), **`#2A2A2A`** (3×), **`#3E3E3E`** (3×) | `#1A1A1A` at `src/components/moves/MoveCard.tsx:67` — **the feed card background itself**; `#2A2A2A`, `#3E3E3E`, `#222` across 6 files | Replace with the adjacent token. `#1A1A1A`→`#1E1E1E`, `#2A2A2A`→`#2E2E2E`, `#3E3E3E`→`#383838`, `#222`→`#252525`. Zero visual delta at these deltas. |
| R2 `[R]` | One white: `ink.DEFAULT` `#FAFAFA` | Two: `#FAFAFA` 76× and `#FFFFFF`/`#fff` **48×** | `#fff` 43×, `#FFFFFF` 5×, plus `#ffffffcc`, `#ffffff25`, `#FFFFFF12` | Pick `#FAFAFA` for text/icons; keep pure `#FFF` only where it is deliberately over a photo. |
| R2 `[R]` | `warning: #EAB308` | `#F59E0B` used **11×**, `#EAB308` **2×**. The token loses to the non-token. | `#F59E0B` at `src/components/moves/RSVPButton.tsx:68`, `MoveCard.tsx:200`, +7 | Change the token to `#F59E0B` and migrate the 2 stragglers — the code has already voted. |
| R2 `[R]` | `danger: #EF4444`, `success: #22C55E` | Second reds and greens: `#DC2626` (2×), `#059669` (2×), `#14532D` (2×) | across `app/(auth)/`, `app/move/[id].tsx` | Collapse to the tokens. |
| R2 `[R]` | Palette has no violet, pink, sky or slate | Tailwind defaults never declared: `#7C3AED` (6×), `#EC4899`, `#0EA5E9`, `#6B7280`, `#374151`, `#4C1D95`, `#78350F`, `#0C4A6E`, `#060D18` | 9 hues across `app/(tabs)/activity.tsx`, `app/i/[code].tsx`, `app/invite-friends.tsx` | Either declare them as a named accent set or remove them. Right now they are stowaways from copy-pasted Tailwind snippets. |
| R2 `[R]` | One spelling per colour | Case drift on 6 colours: `#0A0A0A`/`#0a0a0a`, `#1A1A1A`/`#1a1a1a`, `#2A2A2A`/`#2a2a2a`, `#222`/`#222222` | see `registry/R2-color.json` | Normalise to uppercase 6-digit. Harmless to render, but it defeats every grep and every future codemod. |

## 2. Spacing — values off the 4pt scale

| Registry | Expected | Actual | Locations | Fix |
|---|---|---|---|---|
| R3 `[R]` | 0/4/8/12/16/20/24/32… | **10px (30×), 14px (25×), 6px (22×), 5px (16×), 3px (7×), 7px (7×), 13px (3×), 18px (2×), 22px (1×)** — 116 off-scale uses | `gap:10` at `app/(auth)/verify-age.tsx:83`; `gap:14` at `app/(auth)/sign-in.tsx:53`; `gap:13` at `app/(tabs)/activity.tsx:45` | Snap to the scale. 10→8 or 12, 14→12 or 16, 6→4 or 8, 13→12, 18→16 or 20, 22→24. |
| R3 `[R]` | A radius scale of 3–4 steps | **23 distinct border radii**: 2, 3, 4, 8, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 26, 27, 28, 29, 32, 45, 100, 500, 1000 | `21` at `app/(tabs)/index.tsx:418`; `27` at `app/invite-friends.tsx:116`; `29` at `app/(auth)/verify-age.tsx:169`; `45` at `app/(tabs)/profile/edit.tsx:98` | Define `sm:8 md:14 lg:20 xl:28 pill:999`. The 21/27/29/45 values are almost certainly "half of a height I typed" — they are what a pill radius looks like when nobody owns the scale. |

## 3. Typography

| Registry | Expected | Actual | Locations | Fix |
|---|---|---|---|---|
| R4 `[R]` | A type scale | **25 numeric font sizes**: 9,10,11,12,13,14,15,16,17,18,20,22,24,28,30,32,34,36,44,48,52,56,58,76,80 — 12/13/14/15/16/17 all in use, 34× / 36× / 26× / 26× / 23× / 16× | `13` at `app/(auth)/invite.tsx:111` +35 sites; `17` at `app/(auth)/invite.tsx:130` +15 | Collapse 12–17 into three steps (12, 14, 16). Six adjacent sizes at this volume is the same disease as the greys. |
| R4 `[R]` | Weights from `fontFamily` tokens (Inter 400/500/600/700/900) | Numeric `fontWeight` only — 500,600,700,800,900. **`800` is used 37× and has no token**; the Inter families are never referenced | `fontWeight:'800'` at `app/(auth)/invite.tsx:130` +36 | Inter 800 is not among the 5 loaded faces, so every `'800'` synthesises or snaps to 700/900 depending on platform. Either load Inter 800 or change these 37 to `'700'`. |

## 4. Naming — same concept, different nouns

| Registry | Expected | Actual | Locations | Fix |
|---|---|---|---|---|
| R1 `[R]` | One noun for the friend group | Three: **`crew`** in UI copy, **`squad`** in schema, **`friends`** in nav | UI: `src/components/moves/MoveCard.tsx:191` "from your crew"; schema: `squad_with`/`squad_confirmed` in `supabase/migrations/011_squad_safety.sql`; `crew_going` in `016_one_nearby_moves.sql` | Pick one word. `DECISIONS_FOR_MICHAEL.md` §7 already records that "crew" was rejected for BETA — so the UI string is using the rejected word while the schema uses a third. |
| R1 `[R]` | — | **PASS on the core object.** "move" is used consistently; no "plan"/"event"/"hang" appears in any rendered string. | scanned 204 distinct strings | none |

## 5. Date & time

| Registry | Expected | Actual | Locations | Fix |
|---|---|---|---|---|
| R5 `[V+R]` | A same-day label matches the time it prints | **`formatMoveTime` labels every same-day move "Tonight at", including morning ones.** A move today at 10:00 AM viewed at 07:00 → `minutesUntil` 180 (≥60), `hoursUntil` 3 (not <3) → falls to `isToday()` → renders **"Tonight at 10:00 AM"** | `src/utils/time.ts:8-15`; rendered by `src/components/moves/MoveCard.tsx:13` on every feed card and `app/move/[id].tsx:60,68` in both share strings | Branch on the clock, not on `isToday`: `if (isToday(date)) return format(date, 'h:mm a') < noon ? \`This morning at …\` : \`Tonight at …\`` — or simply `Today at`. Also fixes the share text people send to friends. |

## 6. Errors

| Registry | Expected | Actual | Locations | Fix |
|---|---|---|---|---|
| R6 `[V+R]` | Users see human copy | **Raw Supabase/Postgres error text is passed straight into the alert body** | `app/(auth)/verify-age.tsx:63` `Alert.alert('Something went wrong', error.message)`; `app/add-spot.tsx:73` and `app/(tabs)/create.tsx:129` `err.message \|\| …` | Map known codes to copy and log the rest: `Alert.alert('Something went wrong', friendly(err) ?? 'Try that again in a second.')`. A 17-year-old should never read `duplicate key value violates unique constraint`. |
| R6 `[R]` | Joining a move you are already in is a no-op | `useRSVP` does a bare `.insert()` into a table with `unique(move_id, user_id)`, and `queryClient` sets `mutations.retry: 1`. A join whose response is lost retries and returns **23505**, surfaced by the row above as a raw duplicate-key string for a join that actually succeeded | `src/hooks/useRSVP.ts:33-41`; constraint at `supabase/migrations/005_rsvps.sql:10`; retry at `src/lib/queryClient.ts:15` | `.upsert({…}, { onConflict: 'move_id,user_id' })`, or swallow 23505 as success. |

## 7. Empty & loading states that render nothing

Pass 2 asks specifically for these. Four confirmed.

| Registry | Expected | Actual | Locations | Fix |
|---|---|---|---|---|
| R7/R8 `[V+R]` | The attendees screen shows a spinner then a list | **Renders a blank black body under a header reading "Who's going (0)"** during load, on error, and when empty. `isLoading` is destructured and never used; no `ListEmptyComponent` | `app/move/[id]/attendees.tsx:15` (binds `isLoading`), `:38` (header count), `:42-64` (FlatList) | Branch on `isLoading` for a spinner; add `ListEmptyComponent`; render the header count only once loaded. |
| R7/R8 `[V+R]` | Profile "My moves" shows a spinner then moves or an empty state | **Renders a blank region while loading and stays blank forever on error.** The guard is `myMoves?.length === 0` — when `myMoves` is `undefined`, `undefined === 0` is false, so the empty state never renders and `myMoves?.map` renders nothing | `app/(tabs)/profile/index.tsx:21-32`, `:145-158` | Destructure `isLoading`/`isError` and branch explicitly; `?? []` is not a substitute for a loading state. |
| R7 `[V+R]` | Feed cards lead with who is going | **Every feed card renders zero faces.** `AttendeePile` is passed the literal `attendees={[]}` at its only live call site, so `display` is always empty and the grey "+N" overflow bubble stands in for the faces | `src/components/moves/MoveCard.tsx:199`; `src/components/moves/AttendeePile.tsx:13-14, 22-64` | Pass the real attendees. `nearby_moves` already returns `crew_going` (`016_one_nearby_moves.sql`) — the data is on the card object and is being discarded. **This is the product's stated differentiator rendering as a grey circle.** |
| R8 `[V+R]` | A failed map fetch says so | **The moves branch discards the error** (`const { data } = await supabase.rpc(...)`), sets `[]`, and the UI shows "No moves in view" — a failed request is indistinguishable from an empty city. The spots branch throws, so `setIsLoading(false)` at `:83` never runs and the spinner hangs forever | `app/(tabs)/index.tsx:66-84`, effect at `:87-91`, empty card at `:268-282` | Destructure `error` and set an error state; wrap `fetchLayer` in try/finally so `setIsLoading(false)` always runs. |

## 8. Button label vs destination

| Registry | Expected | Actual | Locations | Fix |
|---|---|---|---|---|
| R12 `[V]` | Saving Edit Profile returns to Profile | **Save and the back arrow both land the user on the Map tab**, not the profile they were editing — the tab navigator has no `backBehavior` | `app/(tabs)/profile/edit.tsx:60` (after save), `:71-73` (back arrow); root cause `app/(tabs)/_layout.tsx:66-88` | `router.back()` instead of a push, and set `backBehavior="history"` on `Tabs`. |
| R9 `[V]` | One control, one size | The map/list toggle is **44×44 on the map screen and 36×36 on the list screen** — the same control, two sizes, one below the 44pt minimum | `app/(tabs)/index.tsx:193-197` (44) vs `app/(tabs)/list.tsx:33-38` (36) | Make both 44. |

## 9. Candidates that did NOT survive — recorded because null results are the point

| Claim | Verdict | Why it was wrong |
|---|---|---|
| "`create.tsx:267` re-types the shared date format string" | **REFUTED 2/2** | Both literals are real, but `formatMoveTime` is relative-first ("Tonight at…") and the create screen needs an absolute preview of a future picked time. Calling the shared formatter there would be a regression. Duplicate literal, no defect. |
| "The same start time renders in three formats across feed / detail / share" | **REFUTED 2/2** | Miscounted. There are two formatters, not three — feed and share both use `formatMoveTime`; detail uses `formatFullDate` deliberately to give the full absolute date. The real defect is the "Tonight at" bug in §5, not a format count. |
| "Two error titles mean the same thing, and one title means two different things" | **REFUTED 3/3** | The load-bearing half is false: `verify-age.tsx:63` is not an auth failure — `confirm()` writes the profile, so it is a failed profile write, the same class as the other two. The `message` argument disambiguates in every case. Only the raw-`error.message` half survived, and it is in §6. |
| "The map/list toggle stacks screens because it uses `router.push` between tabs" | **REFUTED (self, by reading `_layout.tsx`)** | `list` is a registered `Tabs.Screen` (`app/(tabs)/_layout.tsx:96-100`), so the push resolves as a tab switch, not a stack push. Only the size asymmetry is real. |
| "`/add-spot` is unreachable from a cold start" | **REFUTED (self)** | Reached from `app/(tabs)/index.tsx:125` via the object form, which the `router.push('…')` string grep missed. |
| "Mutation `retry: 1` double-inserts RSVPs" | **PARTIALLY REFUTED (self)** | `unique(move_id, user_id)` prevents the duplicate row. The residual defect is the error surfaced for a join that succeeded — kept in §6, reframed. |

## 10. PASS — scanned, nothing material

- **Core-object naming.** 204 distinct user-facing strings; "move" is used consistently. No "plan", "event" or "hang" in any rendered string.
- **Permission request copy.** One request site (`src/hooks/useLocation.ts:15`). iOS and Android strings differ slightly (`app.json:24` vs `:87`, `:26` vs `:101`) but each platform shows only its own, so no user sees both. Not a collision. *(The unused `CAMERA` permission is a store-review finding, not a consistency one — carried to Pass 3.)*
- **Query key factory.** `src/lib/queryClient.ts:22-40` is consistently used; the one key that omits a parameter is the `rsvps.forMove` limit bug, carried to Pass 4.

## 11. Carried forward, out of Pass 2 scope

Recorded here so they are not lost; they belong to later passes and are **not** consistency findings.

- **R12 navigation traps (5, all `[V]`)** — creating a move unmounts the tab navigator and strands the user on move detail with a dead back arrow (`app/(tabs)/create.tsx:126`); cold-start deep links into `/move/<id>` leave a single-entry stack with an inert back arrow; an existing member tapping an invite link lands on Sign Up with no route to Sign In (`app/i/[code].tsx:55,59`); "Set a move here" pushes a second copy of the whole tab navigator (`app/spot/[id].tsx:218-227`). → **Pass 4.**
- **R9 touch targets (11, all `[V]`)** — the password eye is 20×20 (`sign-in.tsx:85`), every hand-rolled back arrow is 24×24 across 9 screens, radius filter pills are 26pt, and `RSVPButton compact` — the primary conversion control on every feed card — is 36pt (`RSVPButton.tsx:82`). → **Pass 5.**
- **`useMoveAttendees` cache-key collision `[V]`** — `queryKeys.rsvps.forMove(moveId)` omits the limit, so the prefetch's 5 rows satisfy the detail screen's request for 12; `attendees.length > 6` is then false and **"See all" never renders**, making `/move/[id]/attendees` unreachable from the feed path. `src/hooks/useMove.ts:24-35` vs `:54-67`, triggered on every card press at `src/components/moves/MoveCard.tsx:62`. → **Pass 4.**
- **`whatsthemove.app` deep links `HYPOTHESIS`** — every share string points at `https://whatsthemove.app/...` (`app/move/[id].tsx:60,68`, `app/spot/[id].tsx:58`, `app/invite-friends.tsx:23`) and `app.json` declares `applinks:whatsthemove.app` with `autoVerify: true`. Both require `/.well-known/apple-app-site-association` and `/assetlinks.json` served from that domain. I could not check whether the domain is registered — this container's proxy blocks it. If it is not, **every invite and every share lands on a dead URL**, which is the entire growth loop of an invite-only app. Verify with `curl -I https://whatsthemove.app/.well-known/assetlinks.json`. → **Pass 3.**

## 12. Method note

R2/R3/R4/R5/R6/R10/R11 were extracted mechanically by script (`/tmp/extract.py`, output in
`/audit/registry/*.json`) — exhaustive over 76 files, not sampled. R7/R8/R9/R12 were read by
subagents and every claim reproduced here was re-read against the cited lines. Verification
coverage was 10 of 34 candidates before session limits stopped it; the remainder were verified
by hand. **No finding in §1–§8 rests on an unread line.**
