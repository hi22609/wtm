# OPEN DEFECTS

Written 2026-08-17, ~03:40 EST. Everything here was found by **screenshotting the
app and looking at it**, not by reading source. That is the only method that
finds these: every one is about where something lands on screen, and no test in
the suite asserts position.

Reproduce the screenshots yourself:

```bash
cd beta && node build.js && node tools/_look.js   # writes dist/look-*.png
```

Fixed already and pushed: badge collision, magenta second accent, duplicate
category badge, `--violet` progress fill, and the last seven emoji in the feed.
What is below is what is still wrong.

**Update 2026-08-17, branch `fix/beta-story-rings-fab-overlap`: all six are
fixed and measured.** One correction to defect 1 below: the saturated hues were
in `STORIES`, not `MOVES` — every `MOVES` gradient was already on-palette.

Two further defects were found while fixing these and are fixed with them: the
four moves added in `e03ab9c` were missing from every move-keyed table, so the
headline card read 412 going with 0 reactions and no attendees; and the cast
rename left `FRIENDS_LIST.init` hardcoded, so the friends screen showed **A**
for Mike and **D** for Luca. Both are now derived rather than restated. See
section 7.

---

## 1. Story rings use four unrelated gradients — HIGH — FIXED

**Correction:** this section names `MOVES`, but all eight `MOVES` gradients were
already muted and on-palette. The four saturated hues were the `grad:` field on
`STORIES` — `#7C0EBF`, `#10B981`, `#F59E0B`, plus `#2C4A63` which was on-palette
only because it had been copied from `m1`. Measured off the rendered page.

**Fixed by** deleting `grad` from `STORIES` entirely and deriving it from the
move each story points at (`storyGrad()`), so a story cannot hold a palette of
its own to drift with. Chosen over the suggested category ramp because that
would also have flattened all twelve hand-picked card covers, which is a design
change rather than a defect fix — Michael's call if he wants it.

`wtm-beta.html`, the `grad:` field on every entry in `MOVES`.

Purple, green, navy, orange, sitting in a row across the top of the feed. This
is the same defect the magenta badge was: the palette was consolidated to one
accent and these were never brought along. Four saturated hues in the first
200px of the app is the single loudest "generated" tell left on the screen.

**Fix:** derive the gradient from the category instead of hand-picking per move.
Two ramps, both neutral, with amber reserved for hot. The `grad` field can stay
in the data and simply stop being used, or be replaced by a lookup on `m.cat`.

## 2. The + button covers the primary action — HIGH — FIXED

**Measured before fixing:** the FAB spans x 314–370, the card's "I'm in" spans
x 277–353 — 39px of a 76px button, permanently. At scroll offset 80,
`document.elementFromPoint()` at the centre of "I'm in" returned `.fab`, so the
tap opened Create instead of joining the move.

**Fixed by** moving `+` into the topbar (`#btn-create`), which is outside the
scrolling container, so no scroll offset can bring the two together. None of the
three suggested options were taken: left-aligning the RSVP puts it under the
hype row instead, shrinking and tucking still collides at some offset, and
hiding during scroll still leaves it resting on the CTA once scrolling stops.
Only removing it from the scroll area makes the collision impossible to
reintroduce — which is also the only version the new assertion can guarantee.

`wtm-beta.html:389` `.fab`, positioned `bottom: calc(var(--tab-h) + var(--safe-b) + 20px); right:20px`.

It floats over the feed and lands exactly on top of the "I'm in" button of
whichever card is at that scroll position. A floating action button overlapping
*content* is normal; overlapping the app's primary CTA is not.

**Fix options, in order of preference:** move the RSVP button to the left of the
card action row so the FAB never reaches it; or shrink the FAB and tuck it
lower; or hide the FAB while the feed is scrolling.

## 3. The LIVE banner is pink in light mode — MEDIUM — FIXED

`.live-bar` held `rgba(255,59,48,.07)` background and `rgba(255,59,48,.22)`
border — iOS system red, written as a literal. Over the dark background that
reads as a deliberate dark maroon; over `--ink-900:#F2F3F7` it reads pink.
Routed through `--signal`, so both themes derive from one token. Measured after:
light `color(srgb 0.580 0.361 0.137 / 0.08)` = `#945C23`, dark = `#FF9E3D`.

`.map-live-pill` and `.map-live-dot` on the map screen carried the same three
literals and are fixed with it. The canvas heat ramp still uses a warm
red-orange-yellow gradient, which is cartography rather than UI chrome, and is
left alone deliberately.

Renders as a pink-red pill. Light theme was derived at the token level but this
component appears to carry its own background. Find it and route it through
`--signal` like everything else.

## 4. LIVE copy truncates mid-word — MEDIUM — FIXED

Measured: `scrollWidth 306` against `clientWidth 271`, so the CSS ellipsis cut
35px mid-word. Four of the six seed strings overflowed, not just the one in the
screenshot.

Shortening the strings alone would not have held: the ticker also builds strings
at runtime from move titles (`${who} just locked in ${m.title}`), and the
longest of those measures 438px. So the seeds are shortened **and** `fitTicker()`
trims to the width actually available at a word boundary, measured with the
element's own computed font. Kept to one line on purpose — wrapping to two would
change the bar's height mid-swap and shove the feed down.

"41 people locked in across Pittsburgh ri…" — it clips at the container edge
with no room to finish. Either shorten the string to fit 390px or let it wrap
to two lines.

## 5. The canvas map still draws emoji — LOW — FIXED

Four sites, not three: the airport marker, each friend's face, your own face,
and — the one the line numbers missed — every move pin's label, which was
`${m.emoji} ${title}`.

The airport is now drawn in six line segments and your own marker as a
head-and-shoulders glyph. Friend markers use the initial, which is what every
other avatar in the app already shows. Pin labels are title-only; the vector map
keeps its category icon, because there it is an SVG and not a font character.
The same emoji were also rendered by the **vector** map's `.glface` markers,
which the defect list did not mention and which is the map people actually see.

`wtm-beta.html:1701, 1731, 1842` — `ctx.fillText('✈️')`, `ctx.fillText(f.face)`.

Canvas has no SVG, so these cannot use `ico()`. Only reachable when vector tiles
fail to load, which on the hosted site is close to never. Fix by drawing the
shapes in canvas primitives, or accept it.

## 6. Nothing asserts layout — MEDIUM, and it is why the rest happened — FIXED

**Fixed by** a general rule rather than the suggested named pairs: every
interactive element must own its own centre point. If `elementFromPoint` at the
middle of a control returns something that is not that control or one of its
children, the control is covered and the run goes red. Swept across scroll
offsets 0–2400, since the FAB collision only appears at some of them. This
subsumes the `.fab` / `.card-actions` pair and catches the next overlay too,
which a hardcoded pair list would not.

**Verified to fail on the broken build**, which matters more than it passing on
the fixed one — reverting `wtm-beta.html` and rerunning gives
`FAIL ... [{"el":"I'm in","coveredBy":"fab","atScroll":80}]` and exit 1. It also
independently flagged defect 1: `FAIL every story borrows a move gradient
off-palette: #7C0EBF #1A0030 #10B981 #032018 #F59E0B #6B2E00`.

`node tools/diag-layout.js` — exits non-zero on failure, so it can gate a build.

The suite is 7 green checks and every one of them passes on a screen with the
badges printed on top of each other. `tools/diag-layout.js` measures the map
screen only.

**Fix:** extend it to assert non-overlap of the boxes that must never intersect
— `.card-badges` against `.card-att`, `.fab` against `.card-actions` — using
`getBoundingClientRect()`. Ten lines, and it would have caught defects 1 and 2
before they ever shipped.

---

## Method note

I could not see any of this until I rendered a PNG and read it. Grep found none
of it; the tests found none of it. If you take one process change from tonight,
make it that a change to `beta/` is not done until somebody has looked at the
screenshot.

---

## 7. Found while fixing the above — FIXED

**The four moves added in `e03ab9c` were in `MOVES` and nowhere else.** No
`SEED_RXN`, no `ALL_GOING`. `m9` "NA vs North Hills" is the top trending card,
so the first thing a demo viewer opened read *412 going* over `0 0 0` reactions
and no attendee faces at all. `test-flow` had been reporting `who-going
avatars: 0` since that commit, down from 8, and it was not read as a failure
because the check prints a count rather than asserting one.

**The cast rename left `FRIENDS_LIST.init` behind.** The friends screen showed
**A** for Mike, **D** for Luca, **M** for Brook, **C** for Quinn — the initials
of the names they replaced.

Both are the same shape as defect 1: the same fact written down in more than one
place, and one copy left behind. So both are now derived, not restated:

- `ALL_GOING` is the only place a guest list is written. `FRIENDS_GOING` is it
  intersected with `FRIENDS_LIST`, and each friend's own list of moves is the
  moves whose roster contains them. All three used to be authored by hand and
  had already drifted — `FRIENDS_GOING` claimed Luca was going to `m1` while
  Luca's own row listed only `m8`.
- The avatar initial is `name[0]`. The `init` field is gone.

Two assertions were added to `diag-layout.js` to hold this: every move must have
a row in `SEED_RXN` and `ALL_GOING`, and each roster's names plus its "+ N
others" must total the move's `att`, because the sheet prints `att` as the
heading over that list. Both fail against `origin/main`.

## Still open

- Canvas-map pin labels can overlap each other and the friend name tags. Pin
  cards avoid other pin cards, but the friend tags are not in the same
  collision set. Fallback map only.
- The notification panel still uses OS-drawn emoji (`💬`, `👥`), which have no
  `ico()` entry yet. Same defect class as the feed emoji that were fixed.
- The canvas map's friend ring is `#10B981` and your own ring `#4C6B8A` — two
  literal accents outside the one-accent palette. Left alone because they
  distinguish friends from you and from the amber move pins; worth a decision
  rather than a silent change.
