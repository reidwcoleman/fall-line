// Our rider the way Cork7's locker shows its: standing tall, a turn of views side by side, framed
// like the reference shots (shots/c7/locker*.png). node tools/locker.mjs <out.png> [yaws deg, comma list]
import { chromium } from 'playwright-core';
import { CHROME, ANGLE } from './chrome.mjs';
const [out = 'shots/rid/locker.png', yaws = '0,90,180,270,30'] = process.argv.slice(2);
const Y = yaws.split(',').map(Number);
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: [ANGLE, '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 500 * Y.length, height: 1050 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5270}/?tod=bluebird${process.env.Q ?? ''}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.evaluate(async ([Y, zoom, look, eye]) => {
  const g = window.__game;
  const { Preview } = await import('/src/preview.js');
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;display:flex;background:#273140';
  g.renderer.setAnimationLoop(null);
  for (const y of Y) {
    const el = document.createElement('div');
    el.style.cssText = 'width:500px;height:1050px;position:relative';
    document.body.appendChild(el);
    const p = new Preview();
    p.setOutfit(g.meta.outfit(g.myOutfit, false));
    p.mount(el, { spin: 0, zoom, look, eye });
    p.yaw = (y * Math.PI) / 180;
    p.canvas.style.cssText = 'width:100%;height:100%';
    for (let i = 0; i < 30; i++) p.render(0.016);
  }
}, [Y, Number(process.env.ZOOM ?? 1.25), Number(process.env.LOOK ?? 0.95), Number(process.env.EYE ?? 1.25)]);
await page.waitForTimeout(500);
await page.screenshot({ path: out });
console.log('saved', out);
await browser.close();
