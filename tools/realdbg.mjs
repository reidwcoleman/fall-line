// Real-physics trace: node tools/realdbg.mjs [park] [secs] [steerMode: line|none|left]
import { chromium } from 'playwright-core';
import { CHROME, ANGLE } from './chrome.mjs';
const [park = 'yard', SECS = '20', MODE = 'line'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME, headless: true, args: [ANGLE, '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:5270/?menu=0&mode=run&park=${park}&q=low`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(async ([SECS, MODE]) => {
  const g = window.__game, p = g.player, C = window.__course;
  g.paused = true;
  const dt = 1 / 60, log = [];
  for (const e of ['crash', 'edgeCatch', 'takeoff', 'land', 'recover']) p.on(e, (d) => log.push(`  ! ${e} ${JSON.stringify(d ?? {}).slice(0, 120)}`));
  let t = 0;
  while (t < SECS) {
    const c = p.controls, sp = p.speed;
    const look = Math.max(8, sp * 0.9), tz = p.pos.z + look, tx = C.centerX(tz);
    const hv = Math.atan2(p.vel.x, p.vel.z), want = Math.atan2(tx - p.pos.x, look);
    const err = Math.atan2(Math.sin(want - hv), Math.cos(want - hv));
    c.steer = MODE === 'line' ? (p.onGround ? -Math.max(-1, Math.min(1, err * 3)) : 0) : MODE === 'left' ? -0.6 : 0;
    c.tuck = 0; c.brake = 0; c.jump = false; c.flip = 0;
    p.step(dt); t += dt;
    if (Math.abs(t * 4 - Math.round(t * 4)) < 0.01) log.push(`${t.toFixed(2)} z${p.pos.z.toFixed(1)} x${(p.pos.x - C.centerX(p.pos.z)).toFixed(1)} v${(sp * 3.6).toFixed(0)} st${c.steer.toFixed(2)} e${p.edge.toFixed(2)} slip${(p.slipAngle ?? 0).toFixed(2)} hd${p.heading.toFixed(2)} hv${hv.toFixed(2)} g${p.onGround ? 1 : 0} cr${p.crash} load${(p.load ?? 0).toFixed(2)}`);
  }
  return log.join('\n');
}, [+SECS, MODE]);
console.log(out);
await b.close();
