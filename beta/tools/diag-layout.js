// Layout assertions. The rest of the suite checks that things exist and that
// handlers fire; none of it could see two elements printed on top of each
// other, which is how a floating "+" sat over every card's "I'm in" through
// seven green checks.
//
// The rule asserted here is general rather than a hardcoded pair of boxes:
// every interactive element must own its own centre point. If elementFromPoint
// at the middle of a button returns something that is not that button or one
// of its children, the button is covered, and a tap there goes elsewhere.
// That catches the FAB, and it catches the next overlay too.
//
// Run over the feed at many scroll offsets, because the collision this was
// written for only appears at some of them.
const {chromium} = require('playwright-core');

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    args: ['--no-sandbox'],
  });
  const page = await b.newPage({viewport: {width: 390, height: 844}});
  page.setDefaultTimeout(6000);
  await page.goto('file://' + __dirname + '/../dist/wtm-share.html', {timeout: 15000});
  await page.waitForTimeout(600);
  // Dismiss the invite-only gate, which covers the page until it is.
  await page.waitForSelector('#gate button',{timeout:5000});
  await page.click('#gate button'); await page.waitForTimeout(400);
  await page.click('nav button.btn-primary'); await page.waitForTimeout(1100);
  let f = null;
  for (const fr of page.frames()) {
    if (fr === page.mainFrame()) continue;
    if (await fr.locator('button.wlc-btn').count() > 0) {f = fr; break;}
  }
  await f.click('button.wlc-btn'); await page.waitForTimeout(800);

  // ── the feed, swept ────────────────────────────────────────────────────────
  const covered = await f.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const SEL = 'button,[data-act],[onclick],input,.story,.tab';

    // The visible part of an element: its own box, clipped by every scrolling
    // ancestor. A card scrolled out of the feed window is not "covered", it is
    // simply not on screen, and must not be asserted against.
    // Closed overlays stay in the DOM at inset:0 with opacity:0 and
    // pointer-events:none. They cannot be tapped, so nothing can cover them.
    const tappable = el => {
      for (let p = el; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.pointerEvents === 'none' || cs.visibility === 'hidden' ||
            cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
      }
      return true;
    };

    const visible = el => {
      let r = el.getBoundingClientRect();
      let box = {l: r.left, t: r.top, r: r.right, b: r.bottom};
      for (let p = el.parentElement; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (!/auto|scroll|hidden/.test(cs.overflowY + cs.overflowX)) continue;
        const q = p.getBoundingClientRect();
        box = {l: Math.max(box.l, q.left), t: Math.max(box.t, q.top),
               r: Math.min(box.r, q.right), b: Math.min(box.b, q.bottom)};
      }
      box = {l: Math.max(box.l, 0), t: Math.max(box.t, 0),
             r: Math.min(box.r, innerWidth), b: Math.min(box.b, innerHeight)};
      return (box.r - box.l > 4 && box.b - box.t > 4) ? box : null;
    };

    const hits = [];
    const seen = new Set();
    const feed = document.querySelector('.feed-wrap');
    for (let y = 0; y <= 2400; y += 40) {
      feed.scrollTop = y; await sleep(25);
      for (const el of document.querySelectorAll(SEL)) {
        if (!tappable(el)) continue;
        const box = visible(el);
        if (!box) continue;
        const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
        const top = document.elementFromPoint(cx, cy);
        if (!top || top === el || el.contains(top) || top.contains(el)) continue;
        const label = (el.textContent || '').trim().slice(0, 20) || el.className;
        const by = (top.className && String(top.className)) || top.tagName;
        const key = label + '|' + by;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({el: label, coveredBy: by, atScroll: y});
      }
    }
    feed.scrollTop = 0;
    return hits;
  });

  // ── stories must borrow their move's palette, never carry their own ───────
  const palette = await f.evaluate(() => {
    const grads = [...document.querySelectorAll('.story-inner')]
      .map(e => (e.getAttribute('style') || '').match(/#[0-9A-Fa-f]{6}/g) || []);
    const moveGrads = new Set(
      [...document.querySelectorAll('.card-cover')]
        .flatMap(e => (e.getAttribute('style') || '').match(/#[0-9A-Fa-f]{6}/g) || [])
        .map(h => h.toUpperCase()));
    return {grads, offPalette: grads.flat().map(h => h.toUpperCase())
      .filter(h => moveGrads.size && !moveGrads.has(h))};
  });

  // ── the LIVE ticker must never clip, including strings built at runtime ───
  const ticker = await f.evaluate(() => {
    const t = document.getElementById('ticker-text');
    const bad = [];
    const longest = 'Reese just locked in After the game, North Park at the boathouse lot';
    // Fall back to the raw assignment the app used before setTicker existed, so
    // this assertion still runs — and still fails — against an older build.
    const put = typeof setTicker === 'function' ? setTicker : s => {t.textContent = s;};
    for (const s of TICKER_POOL.concat([longest])) {
      put(s);
      if (t.scrollWidth > t.clientWidth + 1)
        bad.push({s, scrollW: t.scrollWidth, clientW: t.clientWidth});
    }
    put(TICKER_POOL[0]);
    return bad;
  });

  // ── every move needs its own row in each move-keyed table ─────────────────
  const data = await f.evaluate(() => {
    const missing = [], mismatched = [];
    for (const m of MOVES) {
      const gaps = [];
      if (!SEED_RXN[m.id]) gaps.push('SEED_RXN');
      if (!ALL_GOING[m.id]) gaps.push('ALL_GOING');
      if (gaps.length) {missing.push({move: m.id, title: m.title, gaps}); continue;}
      // the sheet heads this list with m.att, so the two must agree
      const roster = ALL_GOING[m.id];
      const extra = roster.find(n => n.startsWith('+'));
      const total = roster.filter(n => !n.startsWith('+')).length +
                    (extra ? parseInt(extra.replace(/\D/g, ''), 10) : 0);
      if (total !== m.att) mismatched.push({move: m.id, roster: total, att: m.att});
    }
    return {missing, mismatched};
  });

  // ── every icon must resolve to a drawn glyph, never to raw text ──────────
  // ico() falls back to the character it was given, so a typo or a bad escape
  // renders as literal text on the card rather than failing loudly.
  const icons = await f.evaluate(() => {
    const drawn = e => /^<svg/.test(ico(e));
    const bad = [];
    SPOTS.forEach(sp => {if (!drawn(sp.emoji)) bad.push({spot: sp.id, emoji: sp.emoji});});
    MOVES.forEach(m => {if (!drawn(m.emoji)) bad.push({move: m.id, emoji: m.emoji});});
    CATS.forEach(c => {if (!drawn(c.emoji)) bad.push({cat: c.id, emoji: c.emoji});});
    NOTIFS.forEach((n, i) => {if (!drawn(n.icon)) bad.push({notif: i, emoji: n.icon});});
    // anything that reached the DOM as an unrendered escape
    const leaked = document.body.innerHTML.match(/U000[0-9A-F]{4}/g);
    return {bad, leaked: leaked ? [...new Set(leaked)] : []};
  });

  // ── the app must not contradict the published schedule ───────────────────
  // The move copy and the pulse row both name the student-section theme. They
  // had said "white out" for the opener, which is the 10/2 theme — 8/28 is
  // beach. Anything that names a theme has to match NA_SEASON.
  const season = await f.evaluate(() => {
    const g = NA_SEASON[NA_NEXT];
    const t = g.theme.toLowerCase();
    const themes = NA_SEASON.map(x => x.theme.toLowerCase());
    const wrong = [];
    const check = (where, text) => {
      if (!text) return;
      const low = text.toLowerCase();
      // a theme is named, but not the one belonging to this game
      const named = themes.filter(x => low.includes(x));
      if (named.length && !named.includes(t))
        wrong.push({where, says: named, shouldBe: g.theme});
    };
    check('m9.desc', (MOVES.find(m => m.id === 'm9') || {}).desc);
    PULSE.forEach((p, i) => {
      if (p.go && p.go.id === 'm9') {check('PULSE[' + i + '].sub', p.sub); check('PULSE[' + i + '].head', p.head);}
    });
    return {wrong, games: NA_SEASON.length};
  });

  // ── the map screen, as before ─────────────────────────────────────────────
  await f.click('#scr-moves .tab:nth-child(2)'); await page.waitForTimeout(1000);
  const map = await f.evaluate(() => {
    const g = s => {
      const e = document.querySelector(s); if (!e) return 'MISSING';
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return {top: Math.round(r.top), bottom: Math.round(r.bottom),
              h: Math.round(r.height), pos: cs.position, cssBottom: cs.bottom};
    };
    return {scr: g('#scr-map'), hint: g('#map-hint'), ctrls: g('.map-ctrls'),
      tabbar: g('#scr-map .tabbar'), topbar: g('.map-topbar'), canvas: g('#map-canvas'),
      safeB: getComputedStyle(document.documentElement).getPropertyValue('--safe-b'),
      innerH: innerHeight};
  });

  let bad = 0;
  const ok = (name, pass, detail) => {
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
    if (!pass) bad++;
  };

  ok('no interactive element is covered by another', covered.length === 0,
     covered.length ? JSON.stringify(covered) : '');
  ok('every story borrows a move gradient', palette.offPalette.length === 0,
     palette.offPalette.length ? 'off-palette: ' + palette.offPalette.join(' ') : '');
  ok('the LIVE ticker never clips', ticker.length === 0,
     ticker.length ? JSON.stringify(ticker) : '');
  ok('every move has reactions and a roster', data.missing.length === 0,
     data.missing.length ? JSON.stringify(data.missing) : '');
  ok('every roster totals the move\'s attendee count', data.mismatched.length === 0,
     data.mismatched.length ? JSON.stringify(data.mismatched) : '');
  ok('every icon renders as a glyph, not as text',
     icons.bad.length === 0 && icons.leaked.length === 0,
     JSON.stringify(icons.bad.concat(icons.leaked)).replace('[]', ''));
  ok('the featured game names its real theme', season.wrong.length === 0,
     season.wrong.length ? JSON.stringify(season.wrong) : '');
  ok('the season carries all ten Fridays', season.games === 10, 'got ' + season.games);
  ok('map controls sit above the tab bar',
     map.ctrls !== 'MISSING' && map.tabbar !== 'MISSING' && map.ctrls.bottom <= map.tabbar.top,
     map.ctrls === 'MISSING' ? 'ctrls MISSING' : '');
  ok('map canvas is on screen', map.canvas !== 'MISSING' && map.canvas.h > 100, '');

  console.log('\nmap boxes: ' + JSON.stringify(map));
  console.log(bad ? `\nlayout: ${bad} failed` : '\nlayout: all passed');
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => {console.error('FATAL', e.message); process.exit(1);});
