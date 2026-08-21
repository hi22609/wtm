# PASS 5 — GIT ARCHAEOLOGY

**Verdict: this pass has almost nothing to say, and the reason is itself the finding.**

## The structural fact

27 commits total. 23 of them are dated 2026-08-17 — the day the repo was extracted from the
`DiscordChatExporter` fork. `wtm/` (RAW, the actual product) arrived in a **single commit** and
has been touched twice since.

```
23  2026-08-17     1  2026-08-19     1  2026-08-20     2  2026-08-21
```

There is no history to excavate. Archaeology assumes strata; this repo is one layer of fill.
Every technique in this pass — churn as a risk proxy, panic-commit clustering, TODO decay — needs
a codebase that was *lived in*. Anything RAW's history could tell us was lost in the extraction.

**Consequence:** you have no blame data, no bisect surface, and no way to ask "when did this
break and what else changed with it" for any RAW file. If a production incident happens in
`useRSVP.ts`, `git log` will tell you it was written once, in a batch, four days ago. Budget for
that: the first RAW incident will be debugged without history.

## 1. Secrets in history — PASS

Scanned **every blob in every commit** (`git rev-list --all` × `git grep`) for: JWTs (`eyJ…`),
`sk_live_`/`sk_test_`, Google API keys (`AIza…`), PEM private keys, Slack tokens (`xox…`),
GitHub PATs (`ghp_…`), and literal `SUPABASE_SERVICE_ROLE_KEY=` assignments.

**Zero hits.** The only matches for `service_role` are the literal Postgres *role name* in
`wtm/supabase/tests/00_supabase_shim.sql:9` and a test comment — not credentials.

`.env` was never committed in any commit. The only env file in history is `wtm/.env.example`,
which contains placeholders (`your-anon-key`, `your-project-id`).

This is a genuine pass, not an unchecked box.

## 2. TODO / FIXME / HACK decay — PASS

**Zero** TODO, FIXME, HACK or XXX markers across all `.ts`, `.tsx` and `.sql` files.

Worth naming plainly: a codebase with zero TODOs *and* a build that has never succeeded is
unusual. The comments that exist are unusually good explanatory prose (see
`src/hooks/useNearbyMoves.ts:36-40`, `src/components/moves/MoveCard.tsx:59-61`). The absence of
TODOs is not evidence of finished work — it means the known-unfinished list lives in
`WTM_REPORTS/`, not in the code. That is a legitimate choice, but it means grep will never find
the debt.

## 3. Panic commits — PASS

Zero commits matching `^fix$`, "fix again", "revert", "temp", "wip", "asdf", "oops". Commit
messages are long-form and explanatory throughout. No fragile-module signal available.

## 4. Churn — the ranking is real but points at the wrong half

| Commits | File |
|---|---|
| 14 | `beta/wtm-beta.html` |
| 8 | `WTM_REPORTS/STATE.md` |
| 6 | `beta/tools/diag-layout.js` |
| 5 | `beta/wtm-share-shell.html` |
| **2** | **`wtm/supabase/tests/01_functional.sql`** ← highest-churn file in RAW |

**The highest-churn file in the repo is `beta/wtm-beta.html`, and most of that churn is mine
from earlier today.** It is the demo, not the product. Treating it as "the most fragile module"
would be an artefact of who was typing this week, not a property of the code.

In RAW the maximum is 2. There is no churn signal for the product at all.

## 5. Abandoned code — 1 orphan module, 3 dead dependencies, 5 dead font tokens

| What | Location | Evidence | Cut buys |
|---|---|---|---|
| `useSearchUsers.ts` | `wtm/src/hooks/useSearchUsers.ts` | imported by **zero** files | 30 lines; already flagged in `DECISIONS_FOR_MICHAEL.md` §7 and still here |
| `zod` | `package.json:52` | **0 imports** across all 76 TS/TSX files | install weight — and it means **there is no schema validation anywhere in the app** |
| `react-hook-form` + `@hookform/resolvers` | `package.json:51,53` | **0 imports** | install weight; forms are hand-rolled with `useState` |
| The entire type system | `tailwind.config.js:44-50` declares 5 Inter faces | `useFonts` appears **nowhere**; `assets/` contains only `images` (no font files); `fontFamily` appears in **0 `.tsx` files** | see below |

**The font finding is the one that matters.** Five Inter families are declared as design tokens
and **no font is ever loaded**. Every screen renders in the platform default — SF Pro on iOS,
Roboto on Android. The app has no typographic identity, and the 37 uses of `fontWeight: '800'`
(Pass 2 §3) synthesise differently on each platform because Inter 800 was never there to load.

Fix: either `expo-font` + `useFonts` in `app/_layout.tsx` with the actual Inter files in
`assets/fonts/`, or delete the five `fontFamily` tokens and admit the app is system-font. Do not
leave a type scale that describes a font the binary does not contain.

## 6. Feature flags — none

No flag system, no `if (FLAGS.` pattern, no remote config. Nothing gates live behaviour. Nothing
to report.
