// Exports every creative in ads/ads.html as a finished PNG at post size.
//
//   node tools/make-ads.js
//   → beta/dist/ads/*.png
//
// Why this exists: asking a model for an ad gives you a different-looking ad
// every time, and none of them share the product's fonts, palette or accent.
// These are laid out in the same tokens the app uses, so every export is on
// brand by construction, and changing the copy is editing one line of HTML
// rather than re-prompting until something lands.
//
// Costs nothing and needs no network: the fonts are already in the repo and the
// browser is already installed for the test suite.

const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const outDir = path.join(dir, 'dist', 'ads');

const faces = fs.readFileSync(path.join(dir, 'fonts', 'faces.css'), 'utf8');
const html = fs
  .readFileSync(path.join(dir, 'ads', 'ads.html'), 'utf8')
  .replace('__FONTS__', () => faces);

const tmp = path.join(dir, 'dist', '_ads.html');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    args: ['--no-sandbox'],
  });
  // deviceScaleFactor 1 is correct here: the creatives are already authored at
  // full post resolution, so scaling up would only soften the type.
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.goto('file://' + tmp, { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const ids = await page.$$eval('.ad', (els) => els.map((e) => e.id));
  let n = 0;
  for (const id of ids) {
    const el = await page.$('#' + id);
    const box = await el.boundingBox();
    const name = id.replace(/^ad-/, '') + '.png';
    await el.screenshot({ path: path.join(outDir, name) });
    console.log(`${name.padEnd(30)} ${Math.round(box.width)}x${Math.round(box.height)}`);
    n++;
  }

  await browser.close();
  fs.unlinkSync(tmp);
  console.log(`\n${n} creatives -> beta/dist/ads/`);
  if (!n) process.exit(1);
})();
