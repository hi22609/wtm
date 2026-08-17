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

**Update 2026-08-17, branch `fix/beta-story-rings-fab-overlap`: 1, 2 and 6 are
fixed and measured.** 3, 4 and 5 are untouched and still stand. One correction
to defect 1 below: the saturated hues were in `STORIES`, not `MOVES` — every
`MOVES` gradient was already on-palette. See each section.

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

## 3. The LIVE banner is pink in light mode — MEDIUM

Renders as a pink-red pill. Light theme was derived at the token level but this
component appears to carry its own background. Find it and route it through
`--signal` like everything else.

## 4. LIVE copy truncates mid-word — MEDIUM

"41 people locked in across Pittsburgh ri…" — it clips at the container edge
with no room to finish. Either shorten the string to fit 390px or let it wrap
to two lines.

## 5. The canvas map still draws emoji — LOW

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
