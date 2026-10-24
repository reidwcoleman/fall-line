// A run ridden like a real park rider: lined up on each kicker, braking or tucking to its sweet
// speed (J.pspeed) over the last 70 m, optional trick input in the takeoff window.
// node tools/realbench.mjs [park] [spin 0|1] [flip 0|1|-1] [board 0|1]
import { chromium } from 'playwright-core';
import { CHROME, ANGLE } from './chrome.mjs';
const [park = 'yard', SPIN = '0', FLIP = '0', BOARD = '0'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROME, headless: true, args: [ANGLE, '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:5270/?menu=0&mode=run&park=${park}&q=low${BOARD === '1' ? '&board=1' : ''}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.waitForTimeout(1500);
const out = await page.evaluate(async ([SPIN, FLIP]) => {
  const g = window.__game, p = g.player, C = window.__course;
  g.paused = true;
  const JUMPS = C.JUMPS.filter((j) => !j.drop).sort((a, b) => a.lip - b.lip);
  const dt = 1 / 60, jumps = [];
  let t = 0, air = null, last = null, crashes = 0, topV = 0, lipV = null;
  p.on('land', (tr) => { last = tr; }); p.on('crash', (e) => { last = { crash: e.reason }; crashes++; jumps.push({ CRASH: e.reason, z: Math.round(p.pos.z), kmh: Math.round(e.speed * 3.6), air: +p.airTime.toFixed(2), ground: p.onGround, grind: !!p.grind }); });
  p.on('grindStart', (gr) => jumps.push({ rail: gr.kind, z: Math.round(p.pos.z) }));
  const zEnd = C.FINISH_Z ?? 1e9;
  while (t < 300 && p.pos.z < zEnd - 5) {
    const sp = p.speed;
    topV = Math.max(topV, sp);
    const J = JUMPS.find((j) => j.lip > p.pos.z - 1);
    const look = Math.max(8, sp * 0.9), tz = p.pos.z + look;
    const toLip = J ? J.lip - p.pos.z : 1e9;
    const tx = J && toLip < J.ramp + 60 ? C.centerX(Math.min(tz, J.lip)) + J.dx : C.centerX(tz);
    const hv = Math.atan2(p.vel.x, p.vel.z), want = Math.atan2(tx - p.pos.x, look);
    const err = Math.atan2(Math.sin(want - hv), Math.cos(want - hv));
    const c = p.controls;
    c.steer = p.onGround ? -Math.max(-1, Math.min(1, err * 2.5)) : 0; c.jump = false; c.flip = 0; c.brake = 0; c.tuck = 0;
    // speed control: to the kicker's speed, quoted at the foot of its ramp
    const target = J && toLip < J.ramp + 70 ? J.pspeed : 24;
    if (p.onGround && toLip > J?.ramp) { if (sp > target * 1.04) c.brake = Math.min(1, (sp - target) / 4); else if (sp < target * 0.97) c.tuck = 1; }
    if (J && toLip < J.ramp && toLip > 0) lipV = sp;
    if (!p.onGround && p.airTime < 0.15) { if (+SPIN) c.steer = -1; if (+FLIP) c.flip = +FLIP; }
    // (SPIN 2: wound up into the lip, the pop loaded over the last 0.5 s of ramp)
    if (+SPIN === 2 && p.onGround && J && toLip > 0 && toLip < sp * 0.5) { c.jump = true; c.steer = -1; }
    const was = !p.onGround;
    p.step(dt); t += dt;
    if (!was && !p.onGround && p.crash <= 0) air = { z: Math.round(p.pos.z), kmh: Math.round(sp * 3.6), want: J && J.lip - p.pos.z < 3 ? Math.round(J.pspeed * 3.6) : null, t, z0: p.pos.z };
    if (was && (p.onGround || p.crash > 0) && air) {
      air.air = +(t - air.t).toFixed(2); air.dist = +(p.pos.z - air.z0).toFixed(1); air.out = Math.round(p.speed * 3.6);
      const L = last; last = null;
      air.dbg = p.landDbg; air.to = p.toDbg; air.th = p.thDbg; p.thDbg = null; air.note = L?.crash ? 'CRASH ' + L.crash : L ? (L.stomp ? 'STOMP' : L.sketchy ? 'SKETCHY' : 'land') + (L.spin ? ' ' + L.spin : '') + (p.spinPlan ? ' plan' + p.spinPlan : '') + (L.flips ? ` ${L.type} F${L.flips}` : '') + ` vn${L.vn.toFixed(1)}` : '?';
      delete air.t; delete air.z0; if (air.air > 0.45) jumps.push(air); air = null;
    }
  }
  return { time: +t.toFixed(1), z: +p.pos.z.toFixed(0), top: Math.round(topV * 3.6), crashes, jumps };
}, [SPIN, FLIP]);
console.log(`time ${out.time}s z ${out.z} top ${out.top} km/h crashes ${out.crashes}`);
for (const j of out.jumps) console.log(JSON.stringify(j));
await b.close();
