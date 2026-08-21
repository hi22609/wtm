# PASS 6 — LANGUAGE & AUTHENTICITY

Judged against R1: 204 distinct strings, 143 user-facing, read individually.

## The headline, and it is not what you expected

**The copy is good.** I scanned every string for the full tell list — "seamlessly", "effortlessly",
"elevate", "unlock", "empower", "curated", "journey", "revolutionize", "game-changer",
"Let's get started!", "Oops!", tricolons, exclamation marks in system copy.

**Hits: one, and it is a code comment** (`src/types/app.ts:35`, "Unlocks invite-code issuance").
**Exclamation marks in user-facing copy: one** — `'Copied!'` (`app/invite-friends.tsx:105`),
which is the correct place for one.

This copy was written by someone who has been to Pittsburgh:

- `"Bar crawl, pickup game, rooftop hangout..."` — `create.tsx:204`
- `"Smiling Moose, Frick Park, your place..."` — `create.tsx:230`
- `"The rusty bridge, sunset rock, secret ledge..."` — `add-spot.tsx:159`
- `"Know a fire spot? Long-press the map to drop it."` — `index.tsx:278`
- `"The intel (optional)"` / `"...what makes it fire..."` — `add-spot.tsx:241,245`
- `"What's the move?"` / `"Where at?"` — `create.tsx:200,226`

Real venue names in placeholder text is the tell of someone writing from life. I am not going to
manufacture findings against copy that is better than most shipped consumer apps.

**Would a Pitt student send this to a group chat unironically?** The *copy*, yes. The name "WTM"
and "What's The Move" is exactly right — it is what they already say. The icon and App Store
listing I cannot judge: `assets/images/` has no icon, `app.json` points at paths that do not
exist in the tree, and there is no App Store listing, screenshots, or landing page in the repo to
audit. That is not a pass; it is an absence, and it is in Pass 7.

## What is actually wrong — 6 real findings

| # | Location | Actual | Why it is wrong | Rewrite |
|---|---|---|---|---|
| L1 | `src/components/moves/RSVPButton.tsx:76` | `"Join Move"` | The single product-speak string in the app, and it is on **the primary conversion control**. Title case, and it names the object like a table row. Its own sibling states are `"You're in"`, `"On waitlist"`, `"Join waitlist"` — all natural. BETA already uses the better word. | **`"I'm in"`** |
| L2 | `app/(auth)/verify-age.tsx:46-49` | `"You're not eligible yet"` / `"WTM is for ages 17–25. Come back on your 17th birthday."` | The branch is `if (age < 17 \|\| age > 25)` — **both** rejections show this. **A 26-year-old is told to come back on their 17th birthday.** "not eligible *yet*" is permanently false for them, and there is no path forward from the screen. | Split the branch. Under 17: `"Not yet"` / `"WTM is 17 and up. Come back on your birthday."` Over 25: `"WTM is 17–25 right now"` / `"We're starting with the Pittsburgh student scene. We'll open up."` |
| L3 | `app/spot/[id].tsx:103` | `"Community favorite"` | The one genuinely corporate string. This is Yelp voice in an app that says "fire" everywhere else. | **`"Everybody knows this one"`** |
| L4 | `app/(tabs)/profile/index.tsx:107` | `"Moves Created"` | Title Case stat label; nothing else in the app title-cases. | **`"moves posted"`** |
| L5 | `src/types/app.ts:215-222` | `"The Scene"`, `"Bars & Nightlife"`, `"Art & Culture"` alongside `"Fire View"`, `"Photo Op"` | Two registers in one enum. "Art & Culture" is a library shelf; "Fire View" is a group chat. Users see these as filter chips side by side. | `"Bars & Nightlife"` → **`"Bars"`**; `"Art & Culture"` → **`"Art"`** |
| L6 | `app/move/[id].tsx:302,307-309` | `"Reports are reviewed within 24 hours."` → `"Report received"` / `"Thanks for keeping WTM safe."` | Not a voice problem — a **promise problem**. There is no moderation queue, no admin surface, and no one to review anything within 24 hours (Pass 7). Stating an SLA you cannot meet is worse than stating none, and App Review reads this string. | Either build the queue or say **`"We'll look at this."`** |

## Voice consistency: onboarding vs errors vs system copy

The usual failure — onboarding written with care, errors written at 2am — **does not happen
here**. The error copy is the *best-written* copy in the app:

> `"That code doesn't exist. Check for typos."` — `invite.tsx:13`
> `"That code has already been used."` — `invite.tsx:14`
> `"That invite link didn't work. Double-check the code."` — `invite.tsx:26`

Three distinct failure modes, three distinct messages, each telling the user what to do. That is
better error design than most funded apps ship.

**The one real inconsistency** is that two error voices coexist:

| Specific (good) | Vague (worse) |
|---|---|
| `"Failed to create move. Try again."` `create.tsx:129` | `"Something went wrong"` `verify-age.tsx:63` |
| `"Failed to drop the spot. Try again."` `add-spot.tsx:73` | `"Something went wrong"` `user/[id].tsx:64` |
| `"Failed to save. Try again."` `profile/edit.tsx:55` | `"Something went wrong"` `move/[id].tsx:307` |

Note this is a **voice** finding, not the meaning-collision I claimed in Pass 2 §9 and had
refuted — the `message` argument does disambiguate. The fix is to promote the left column's
pattern: name the thing that failed. `verify-age.tsx:63` should read
`"Couldn't save your birthday. Try again."`

## The 10 rewrites

1. `RSVPButton.tsx:76` — `"Join Move"` → **`"I'm in"`**
2. `verify-age.tsx:47` (under 17) — → **`"Not yet"`**
3. `verify-age.tsx:48` (under 17) — → **`"WTM is 17 and up. Come back on your birthday."`**
4. `verify-age.tsx:47-48` (over 25) — new branch → **`"WTM is 17–25 right now"` / `"We're starting with the Pittsburgh student scene. We'll open up."`**
5. `verify-age.tsx:63` — `"Something went wrong"` → **`"Couldn't save your birthday. Try again."`**
6. `spot/[id].tsx:103` — `"Community favorite"` → **`"Everybody knows this one"`**
7. `profile/index.tsx:107` — `"Moves Created"` → **`"moves posted"`**
8. `types/app.ts:216` — `"Bars & Nightlife"` → **`"Bars"`**
9. `types/app.ts:222` — `"Art & Culture"` → **`"Art"`**
10. `move/[id].tsx:302` — `"Reports are reviewed within 24 hours."` → **`"We'll look at this."`** (until a queue exists)

## PASS — checked, clean

- No AI/marketing vocabulary in any user-facing string.
- No exclamation marks in system copy (one in a copy-confirmation toast, correctly).
- No tricolons, no "Let's get started", no "Oops".
- Placeholder text uses real Pittsburgh venues rather than lorem-ipsum abstractions.
- Safety copy (`"You won't see each other's moves, spots, or profiles."` — `user/[id].tsx:34`) is
  plain, specific, and correctly unfunny.
