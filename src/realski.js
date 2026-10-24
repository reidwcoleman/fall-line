// Real ski physics for the player on the snow. Nothing here is tuned to a pace: the speed is
// whatever gravity, the snow and the air give.
//
// - Gravity pulls down the slope; the snow pushes back square to it (the ground-follow in
//   skier.js takes out whatever velocity goes into the snow).
// - Glide friction, mu * N, against the motion: ~0.045 on groomed corduroy, ~0.03 on ice, far
//   more in deep snow until the skis plane (Komissarov, "Modelling of carving turns in alpine
//   skiing": mu ~ 0.04). N is the real load, so a compression costs more and a crest less.
// - Air drag, 0.5 rho CdA v^2: CdA ~0.55 m^2 standing, ~0.24 tucked (Lind & Sanders: Cd 0.5,
//   A 0.4 for a downhiller); rho ~1.0 kg/m^3 at resort altitude. Straight down a 15 degree pitch
//   that settles around 85 km/h standing, 130 tucked.
// - Edging: the rider rolls the skis onto edge at a body's rate (~3 rad/s in, quicker out); how
//   far he can tip grows with speed (slow, there's nothing to lean against).
// - Carving: a ski tipped to edge angle psi bends into an arc of radius R = Rsc cos(psi) (the
//   ideal-carving relation) and, while the snow holds it, travels along that arc: the skis turn
//   at v / R and the velocity follows them with no loss. The edge's hold is a friction limit
//   on the sideways force (peak ~2 g on corduroy, under 1 g on ice) that peaks with almost no
//   slip and falls to a much lower sliding value once the skis are going sideways, like a tyre.
//   So a turn asked for too hard at speed breaks loose into a skid that scrubs speed, exactly as
//   the snow takes it, and a hockey stop is just skis thrown across, their sliding edges braking.
// - Skating and poling get you going on the flat; a crouch and an extension pops you off the snow.
import * as THREE from 'three';
import { heightAt } from './course.js';
import { clamp, smoothstep } from './noise.js';

export const RS = {
  g: 9.81, rho: 1.0, mass: 80,
  cdaUp: 0.55, cdaTuck: 0.24, cdaBoardUp: 0.62, cdaBoardTuck: 0.42,
  // glide friction
  mu: 0.045, muIce: 0.03, muPowder: 0.13, muPlane: 0.06,
  // sideways hold of the edges, in g per g of load: flat ski, peak on edge (corduroy / ice / powder),
  // and the sliding value once the skis have broken loose
  gripFlat: 0.2, gripPeak: 2.0, gripIce: 0.8, gripPowder: 1.2, skid: 0.5, skidIce: 0.22, skidPowder: 0.75,
  slip0: 0.07, slip1: 0.32, // the slip angle (rad) where the hold starts to go, and where it's gone
  // the edge angle: most at speed, a little standing; roll rates in and out (rad/s)
  edgeMax: 1.15, edgeStill: 0.42, rollIn: 3.2, rollOut: 5.5,
  // turning the skis by hand (rotary): fast standing still, gone by 12 m/s
  pivot: 2.6,
  // a hockey stop: skis thrown this far across, this fast
  stopAngle: 1.35, stopRate: 6,
  // skating (skis) / scooting (board): push and the speed it stops helping at
  skate: 2.4, skateTop: 7, scoot: 1.3, scootTop: 4.5,
  // the pop: legs extending off the snow, m/s square to it
  pop0: 1.5, pop1: 1.5,
};

const _f = new THREE.Vector3(), _s = new THREE.Vector3(), _a = new THREE.Vector3();

const wrap = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

// One step of the ground physics. Moves sk.vel and sk.heading; sets what the model, the spray,
// the sound and the tracks read. Returns the speed along the skis (negative riding switch).
export function realGround(sk, dt, c, n, powder, ice, W) {
  const v = sk.vel, R = RS, B = sk.board;
  const speed = v.length();
  const x = sk.pos.x, z = sk.pos.z;

  // --- the load: the snow's curve along the way you're going. A hollow presses the legs, a crest
  // or a roller unweights them (gravity's share square to the snow, plus v^2 times the curve)
  const hs = Math.hypot(v.x, v.z);
  let load = Math.max(n.y, 0.2);
  if (hs > 2) {
    const L = 1.4, ux = v.x / hs, uz = v.z / hs;
    const ha = heightAt(x + ux * L, z + uz * L), hb = heightAt(x - ux * L, z - uz * L), h0 = heightAt(x, z);
    const s1 = (ha - hb) / (2 * L);
    const kap = (ha + hb - 2 * h0) / (L * L) / Math.pow(1 + s1 * s1, 1.5);
    load += (speed * speed * kap) / R.g;
  }
  // (the legs soak up the sharpest of it)
  sk.load = (sk.load ?? 1) + (clamp(load, 0.05, 3.5) - (sk.load ?? 1)) * Math.min(1, dt * 9);
  const Ng = R.g * Math.max(sk.load, 0.05); // N / m

  const brake = c.brake > 0.05 && !sk.butter;
  // --- the edge: tipped toward the stick at a body's rate, further the faster you go
  const eMax = R.edgeStill + (R.edgeMax - R.edgeStill) * smoothstep(1.5, 13, speed);
  const steer = sk.butter ? 0 : clamp(c.steer, -1, 1);
  let eT = steer * eMax;
  // (braking: the edges set hard across the fall line, on the side you were last steering)
  if (brake) eT = (sk.skidSide ?? -1) * -1 * 0.75 * clamp(c.brake, 0, 1);
  const rolling = Math.abs(eT) > Math.abs(sk.edge) && Math.sign(eT) === Math.sign(sk.edge || eT);
  const rate = rolling ? R.rollIn * (B ? 0.8 : 1) : R.rollOut;
  // (well sideways, a rider flattens the skis before he rolls them onto the other edge)
  const sideways = speed > 3 ? Math.abs(wrap(sk.heading - Math.atan2(v.x, v.z))) : 0;
  const across = Math.min(sideways, Math.PI - sideways) > 0.6 && Math.sign(eT) !== Math.sign(sk.edge) && sk.edge !== 0;
  sk.edge += clamp(eT - sk.edge, -rate * dt, rate * dt) * (across ? 0.35 : 1);
  const psi = Math.abs(sk.edge), es = Math.sign(sk.edge);

  // --- the ski's frame on the snow
  const f = sk.forward(_f);
  const side = _s.crossVectors(n, f).normalize(); // the rider's left
  const vLong = v.dot(f);
  const back = vLong < -0.3; // riding it backwards: the tails lead
  const hv = Math.atan2(v.x, v.z);

  // --- turning the skis. Carving: the bent ski runs round its own arc, R = Rsc cos(psi)
  // (a flat ski has no arc to run on). Rotary: turned by the legs, only slow
  const engaged = smoothstep(0.04, 0.22, psi);
  const Rc = sk.sidecut * Math.cos(Math.min(psi, 1.35));
  // (powder: the skis sink and can't bend as clean an arc; a board's heel edge is a rounder one)
  let kap = (engaged / Rc) * (1 - powder * 0.3);
  if (B) kap *= es * (sk.boardSwitch ? -1 : 1) > 0 ? 1.05 : 0.92;
  let w = -es * vLong * kap;
  // what the arc asks of the snow (v^2 / R) against the most the edges hold barely slipping. Asked
  // for more, the line can only bend as fast as the hold lets it; a rider then drifts the skis,
  // holding them a little further round than the way he's going (as far as he's steering), and
  // the sideways slide is what bleeds the speed
  const snowPeak0 = (R.gripPeak * (1 - ice) + R.gripIce * ice) * (1 - powder) + R.gripPowder * powder;
  const hold = (R.gripFlat + (snowPeak0 - R.gripFlat) * smoothstep(0, 0.5, psi)) * (W?.grip ?? 1) * Ng;
  const demand = vLong * vLong * kap;
  if (!brake && !sk.butter && demand > hold && speed > 2) {
    const ref = back ? hv + Math.PI : hv;
    const path = (-es * hold) / Math.max(speed, 1) * (back ? -1 : 1);
    const drift = -es * (0.08 + 0.3 * Math.abs(steer)) * smoothstep(1, 1.6, demand / Math.max(hold, 0.1));
    w = path + wrap(ref + drift - sk.heading) * 7;
  }
  const slow = 1 - smoothstep(3, 12, speed);
  w += -steer * R.pivot * slow * (brake ? 0 : 1);
  // a hockey stop: the skis thrown across the line of travel
  if (brake && speed > 0.8) {
    const ref = back ? hv + Math.PI : hv;
    const want = wrap(ref + (sk.skidSide ?? -1) * R.stopAngle * (B ? 1.1 : 1) * clamp(speed / 4, 0.4, 1) - sk.heading);
    w = clamp(want * R.stopRate, -7, 7);
  } else if (speed > 1.5 && !sk.butter) {
    // the rider won't hold the skis further across the line than he can stand: past ~45 degrees
    // of slip (not stopping) he brings them back round toward the way he's going, quickly
    const ref = back ? hv + Math.PI : hv;
    const slip = wrap(sk.heading - ref);
    const over = Math.abs(slip) - 0.45;
    if (over > 0) w -= Math.sign(slip) * over * 8;
  }
  if (!sk.butter) sk.heading += w * dt;
  sk.avgHeading += wrap(sk.heading - sk.avgHeading) * Math.min(1, dt / 1.1);
  if (!brake && Math.abs(steer) > 0.2) sk.skidSide = -Math.sign(steer);

  // --- forces along the snow: gravity, glide friction, drag, the skate
  _a.set(0, -R.g, 0);
  if (speed > 0.05) {
    const plane = smoothstep(6, 20, speed);
    const deep = powder * (R.muPowder - (R.muPowder - R.muPlane) * plane) * (B ? 0.65 : 1);
    const mu = (R.mu * (1 - ice) + R.muIce * ice + deep + (W?.wet ?? 0) * 0.02) * (W?.mu ?? 1);
    _a.addScaledVector(v, -(mu * Ng) / speed);
    sk.updateDraft(dt);
    const tk = clamp(c.tuck, 0, 1) * smoothstep(4, 8, speed) * (brake ? 0 : 1);
    sk.realTuck = tk;
    const CdA = ((B ? R.cdaBoardUp : R.cdaUp) + ((B ? R.cdaBoardTuck : R.cdaTuck) - (B ? R.cdaBoardUp : R.cdaUp)) * tk) * (1 - sk.draft * 0.38) + powder * 0.03;
    const k = (0.5 * R.rho * CdA) / R.mass;
    _a.addScaledVector(v, -k * speed);
  }
  // skating (skis) or scooting (the board's back foot out): W on the flat
  const top = B ? R.scootTop : R.skateTop;
  sk.skating = c.tuck > 0.5 && !brake && vLong > -0.5 && vLong < top && powder < 0.6 && !sk.butter ? 1 : 0;
  if (sk.skating) {
    sk.skatePhase += dt * (5 + vLong * 0.4);
    const stroke = 0.55 + 0.9 * Math.max(0, Math.sin(sk.skatePhase * 2));
    _a.addScaledVector(f, (B ? R.scoot : R.skate) * (1 - vLong / top) * stroke);
  }
  v.addScaledVector(_a, dt);

  // --- the edges' sideways hold
  const vLat = v.dot(side);
  const vL = Math.abs(v.dot(f));
  const slip = Math.atan2(Math.abs(vLat), Math.max(vL, 0.3));
  // what the snow will hold, in g: the peak (barely slipping) and the sliding value (broken loose)
  const snowPeak = (R.gripPeak * (1 - ice) + R.gripIce * ice) * (1 - powder) + R.gripPowder * powder;
  const snowSkid = (R.skid * (1 - ice) + R.skidIce * ice) * (1 - powder) + R.skidPowder * powder;
  const onEdge = smoothstep(0, 0.5, psi);
  const peak = (R.gripFlat + (snowPeak - R.gripFlat) * onEdge) * (W?.grip ?? 1) * (B && es < 0 ? 0.93 : 1);
  // (sliding: an edge set across scrapes harder than a flat one, and the slush piles against it)
  const slide = snowSkid * (0.45 + 0.55 * smoothstep(0, 0.8, psi)) * (1 + (W?.wet ?? 0) * 0.3);
  const mu = slip <= R.slip0 ? peak : slip >= R.slip1 ? slide : peak + (slide - peak) * smoothstep(R.slip0, R.slip1, slip);
  const maxDv = mu * Ng * dt;
  const sp0 = v.length();
  let applied;
  if (Math.abs(vLat) <= maxDv) {
    // held: the line bends with the skis, and an edge square to the motion does no work, so the
    // speed carries round the turn
    applied = -vLat;
    v.addScaledVector(side, applied);
    const sp1 = v.length();
    if (sp1 > 1e-4) v.multiplyScalar(sp0 / sp1);
  } else {
    // sliding: the edges push back as hard as they can and that's all; the push against skis
    // pointed off the line is what a skid costs
    applied = -Math.sign(vLat) * maxDv;
    v.addScaledVector(side, applied);
  }
  const rem = Math.abs(v.dot(side));
  // deep snow shoved sideways by a skid costs more again
  if (rem > 0.05 && powder > 0.05) { const sp = v.length(); if (sp > 0.01) v.multiplyScalar(Math.max(0, sp - rem * powder * 0.9 * dt) / sp); }
  sk.latAcc = sk.latAcc * 0.8 + (applied / dt) * 0.2;
  sk.slipAngle = slip;

  // catching an edge: sliding well sideways and the edge on the side you're sliding toward digs
  // in (rolling the wrong way mid-skid): over the skis
  sk.catchCool = Math.max(0, (sk.catchCool ?? 0) - dt);
  if (!sk.butter && speed > 9 && slip > 0.75 && psi > 0.5 && Math.sign(vLat) === -es && !sk.catchCool) {
    sk.catchCool = 1.2;
    if (slip > 1.1 && speed > 13) sk.caught = true; // (skier.js takes him down)
    else { sk.flailT = Math.max(sk.flailT, 0.5); v.multiplyScalar(0.94); sk.springV -= 1.2; sk.emit('edgeCatch', { speed }); }
  }

  // what the model, the spray and the sound read
  const clean = !brake && psi > 0.3 && speed > 6 ? Math.min(1, psi / 0.8) * (1 - smoothstep(R.slip0, R.slip1, slip)) : 0;
  sk.press = (sk.press ?? 0) + (clean - (sk.press ?? 0)) * Math.min(1, dt * (clean > (sk.press ?? 0) ? 1.6 : 4));
  sk.landSkid = Math.max(0, (sk.landSkid ?? 0) - dt * 6);
  const skidV = Math.min(rem, 8);
  sk.skid = sk.skid * 0.85 + (skidV * 0.55 + sk.landSkid) * 0.15;
  sk.scrape = sk.scrape * 0.9 + ice * Math.min(1, sk.skid / 1.5 + psi * speed / 40) * 0.1;
  return v.dot(sk.forward(_f));
}

// The natural forward turn a rider gives himself at a lip: weight over the front of the boots
// as the ramp falls away, sized so the body goes from square to the ramp to square to the
// landing over the flight. (angle from the takeoff's normal to the landing's, over the time up)
export function takeoffPitchRate(lipNormalPitch, landPitch, flight) {
  return (landPitch - lipNormalPitch) / Math.max(0.35, flight);
}
