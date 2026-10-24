// The rider in Trick School's demo poses, frozen mid-air, one per column (checks the body
// through grabs, spins and flips): node tools/posecheck.mjs <out.png>
//   SPECS='[{"grab":"mute","t":1.3}, ...]' (demo spec + t, the time into the loop)
import { chromium } from 'playwright-core';
import { CHROME, ANGLE } from './chrome.mjs';
const [out = 'shots/rid/poses.png'] = process.argv.slice(2);
const specs = JSON.parse(process.env.SPECS ?? '[{"grab":"mute","t":1.4},{"grab":"tail","t":1.4},{"grab":"japan","t":1.4},{"grab":"safety","t":1.4},{"type":"back","flips":1,"t":1.25},{"t":0.45}]');
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: [ANGLE, '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 400 * specs.length, height: 500 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5270}/?tod=bluebird`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.evaluate(async (specs) => {
  const g = window.__game;
  const { Preview } = await import('/src/preview.js');
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;display:flex;background:#c9d6e6';
  g.renderer.setAnimationLoop(null);
  for (const sp of specs) {
    const el = document.createElement('div');
    el.id = 'demo';
    el.style.cssText = 'width:400px;height:500px;position:relative';
    document.body.appendChild(el);
    const p = new Preview();
    p.setOutfit(g.meta.outfit(g.myOutfit, false));
    p.mount(el, { spin: 0, zoom: 1, look: 1.0, eye: 1.3 });
    p.demoSpec = sp; p.demoT = 0;
    p.canvas.style.cssText = 'width:100%;height:100%';
    const n = Math.round(sp.t / 0.016);
    for (let i = 0; i < n; i++) p.render(0.016);
  }
}, specs);
await page.waitForTimeout(400);
await page.screenshot({ path: out });
console.log('saved', out);
await browser.close();
