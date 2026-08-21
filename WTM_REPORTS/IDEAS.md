# IDEAS — the board of things we want to build, not yet scheduled

Not blocking, not decided against, not forgotten. When one of these actually
gets picked up, move the write-up into a real report (or just build it) and
strike it here.

---

## Eats of the Week

Requested 2026-08-21. A weekly-rotating spotlight of 4 food spots on the Map,
each tagged with why it's featured: **New** (just opened), **Popular**
(actually busy right now), **Trendy** (everyone's posting it), **Good**
(no-hype reliable favorite). Eventual goal is sponsorship — a business pays
to be one of the 4 — but that is explicitly a *later* phase, not part of the
first build.

**On the Map:** a pin treatment distinct from Moves and Spots (different
icon/ring), so this week's 4 read as "the picks" at a glance rather than
blending into everything else on screen.

**Data shape, sketched, not built:**
```
{ id, name, cat:'new'|'popular'|'trendy'|'good', lat, lng, addr, area,
  blurb, weekOf:'YYYY-MM-DD', sponsored:false }
```
`cat` here is the *reason* it's featured, not a food-type category — which
maps onto the "reason chips" the Ask screen already renders on spot results,
so the UI pattern is reusable rather than new.

**Rotation, given zero-infra-cost is non-negotiable:** no backend exists to
drive a real weekly rotation, so this has to be static content on a cadence,
not live data. Two ways to do that:
- **Manual weekly commit** — a small, reviewable diff swapping in that
  week's 4, the same way every other real-world spot has been added so far.
  Lowest risk, start here.
- **Deterministic client-side rotation** — pre-seed a bigger pool tagged
  new/popular/trendy/good, pick that week's 4 by a pure function of the ISO
  week number. Zero maintenance once seeded, but needs pool depth or the
  rotation repeats obviously.

**Sponsorship is a separate, later decision, not a build task today.**
`sponsored:false` should exist in the data shape from day one so the schema
doesn't need to change later, but turning it into real paid placement means
answering: who pays, how, and how it's disclosed as an ad to a 17-25
audience. That is a "this costs money" fork — same category as every
monetization question already deferred to Michael in
`DECISIONS_FOR_MICHAEL.md` — and needs its own writeup before it's real.

**What building the first version actually needs:** real, sourced
restaurant data (same standard as the skateparks — no fabricated addresses
or hours), a `food`/`eats` category (doesn't exist in `SPOT_CATS` yet), and
a pin treatment that doesn't muddy the map next to Moves and Spots.
