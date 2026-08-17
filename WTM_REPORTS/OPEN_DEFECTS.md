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

---

## 1. Story rings use four unrelated gradients — HIGH

`wtm-beta.html`, the `grad:` field on every entry in `MOVES`.

Purple, green, navy, orange, sitting in a row across the top of the feed. This
is the same defect the magenta badge was: the palette was consolidated to one
accent and these were never brought along. Four saturated hues in the first
200px of the app is the single loudest "generated" tell left on the screen.

**Fix:** derive the gradient from the category instead of hand-picking per move.
Two ramps, both neutral, with amber reserved for hot. The `grad` field can stay
in the data and simply stop being used, or be replaced by a lookup on `m.cat`.

## 2. The + button covers the primary action — HIGH

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

## 6. Nothing asserts layout — MEDIUM, and it is why the rest happened

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
