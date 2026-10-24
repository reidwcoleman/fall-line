// The rider in the air as a real rigid body: once the skis leave the snow nothing outside can
// change his angular momentum (gravity pulls through the centre of mass), so the momentum he
// took off with is all he has. What he can change is his shape: tucked up or grabbing, the
// moment of inertia falls and he turns faster; opened out with the arms wide it rises and he
// slows. The body's inertia is far smaller about its long axis (head to boots) than end over end
// (Yeadon's aerial-skiing models: roughly 2 vs 16 kg m^2 with skis on), so momentum that's part
// spin and part flip doesn't add up into a whirl: the body twists quickly round a slow
// somersault, which is exactly what a cork or a bio is. Spins and flips come out of Euler's
// equations, nothing is scripted.
//
// Body frame (the same as the rider's model): +X his left, +Y head, +Z the ski tips.
import * as THREE from 'three';

// principal moments of inertia, kg m^2 (rider + skis, ~80 kg): about X (somersault), Y (twist,
// the long axis; the skis across it add most of it), Z (cartwheel)
export const INERTIA = {
  open: new THREE.Vector3(15.5, 2.3, 14.2), // standing tall, arms out
  ride: new THREE.Vector3(13.0, 1.9, 12.0), // the usual relaxed air
  tuck: new THREE.Vector3(7.2, 1.55, 7.8), // knees to the chest, a grab
};
// a board rider: the board along the body's side axis makes cartwheels and twists heavier
export const INERTIA_BOARD = {
  open: new THREE.Vector3(14.5, 2.8, 15.5),
  ride: new THREE.Vector3(12.2, 2.4, 13.0),
  tuck: new THREE.Vector3(7.0, 2.0, 8.4),
};

const _w = new THREE.Vector3(), _l = new THREE.Vector3(), _qi = new THREE.Quaternion(), _dq = new THREE.Quaternion(), _q0 = new THREE.Quaternion();
const _a = new THREE.Vector3(), _up = new THREE.Vector3(), _f = new THREE.Vector3(), _s = new THREE.Vector3();

export class FreeBody {
  constructor(board = false) {
    this.table = board ? INERTIA_BOARD : INERTIA;
    this.q = new THREE.Quaternion(); // body -> world
    this.L = new THREE.Vector3(); // angular momentum, world frame, kg m^2/s (conserved)
    this.I = this.table.ride.clone(); // current principal moments (body frame)
    this.omega = new THREE.Vector3(); // angular velocity, world frame
    this.shape = 0; // -1 open .. 0 ride .. 1 tucked
    // what he's turned through since takeoff
    this.twist = 0; // about his own long axis
    this.yawTurn = 0; // the heading's turn about the world vertical (what a "spin" counts)
    this.som = 0; // end over end, signed (+ front)
    this.inversions = 0;
    this.heading = 0;
    this._inv = false;
  }

  // off the lip: the body's orientation, and the angular velocity (world frame, rad/s) the
  // takeoff gave it
  reset(q, omegaWorld) {
    this.q.copy(q);
    this.shape = 0;
    this.I.copy(this.table.ride);
    this.L.copy(this.worldInertia(omegaWorld, _l));
    this.twist = 0; this.yawTurn = 0; this.som = 0; this.inversions = 0;
    this.heading = this.bodyHeading;
    this._inv = this.upright < -0.3;
    this.updateOmega();
  }

  // I (world frame) times w
  worldInertia(w, out) {
    _qi.copy(this.q).invert();
    out.copy(w).applyQuaternion(_qi);
    out.set(out.x * this.I.x, out.y * this.I.y, out.z * this.I.z);
    return out.applyQuaternion(this.q);
  }

  // w = R I^-1 R^T L
  updateOmega() {
    _qi.copy(this.q).invert();
    _w.copy(this.L).applyQuaternion(_qi);
    _w.set(_w.x / this.I.x, _w.y / this.I.y, _w.z / this.I.z);
    return this.omega.copy(_w.applyQuaternion(this.q));
  }

  // the shape he holds (-1 open, 0 relaxed, 1 tucked); the body takes ~0.2 s to get there
  setShape(target, dt) {
    this.shape += (target - this.shape) * (1 - Math.exp(-dt * 9));
    const t = this.table, s = this.shape;
    if (s >= 0) this.I.lerpVectors(t.ride, t.tuck, s); else this.I.lerpVectors(t.ride, t.open, -s);
  }

  // an internal torque (in the body frame): the takeoff's last push off the snow, while the skis
  // are still on the lip. In the free air there is none.
  push(torqueBody, dt) {
    _a.copy(torqueBody).applyQuaternion(this.q);
    this.L.addScaledVector(_a, dt);
  }

  // arms and hips moving against each other turn the body a little with no momentum at all
  // (the cat's righting trick; Yeadon: asymmetric arm movements tilt the twist axis a few
  // degrees). rateBody: rad/s about the body's axes, small.
  wriggle(rateBody, dt) {
    const a = rateBody.length();
    if (a < 1e-6) return;
    _a.copy(rateBody).applyQuaternion(this.q).normalize();
    _dq.setFromAxisAngle(_a, a * dt);
    this.q.premultiply(_dq).normalize();
    this.track(_a.multiplyScalar(a), dt);
  }

  // integrate the free rotation (substeps: corks precess quickly)
  update(dt) {
    if (dt <= 0) return;
    const n = Math.max(1, Math.ceil(dt * 360)), h = dt / n;
    for (let i = 0; i < n; i++) {
      // midpoint: the rate at the half-turned body, then the whole step
      this.updateOmega();
      const w0 = this.omega.length();
      if (w0 < 1e-7) break;
      const q0 = _q0.copy(this.q);
      _a.copy(this.omega).divideScalar(w0);
      this.q.premultiply(_dq.setFromAxisAngle(_a, w0 * h * 0.5)).normalize();
      this.updateOmega();
      this.q.copy(q0);
      const w = this.omega.length();
      _a.copy(this.omega).divideScalar(w);
      this.q.premultiply(_dq.setFromAxisAngle(_a, w * h)).normalize();
      this.track(this.omega, h);
    }
    this.updateOmega();
  }

  // book-keeping for the trick's name: the twist about the spine, the heading's turn, the
  // somersault about the body's side axis, and every time he goes upside down
  track(w, h) {
    _up.set(0, 1, 0).applyQuaternion(this.q);
    _s.set(1, 0, 0).applyQuaternion(this.q);
    this.twist += w.dot(_up) * h;
    this.som += w.dot(_s) * h; // (a front flip turns the head forward: about +X, his left)
    const bh = this.bodyHeading;
    let d = bh - this.heading;
    if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
    this.yawTurn += d;
    this.heading = bh;
    const inv = _up.y < -0.3;
    if (inv && !this._inv) this.inversions++;
    this._inv = inv;
  }

  // the angular velocity read in the body frame (x somersault, y twist, z cartwheel)
  bodyOmega(out) {
    _qi.copy(this.q).invert();
    return out.copy(this.omega).applyQuaternion(_qi);
  }

  get upright() { return _up.set(0, 1, 0).applyQuaternion(this.q).y; }
  // where the skis point, seen from above (taken off the up vector when he's on his back)
  get bodyHeading() {
    _f.set(0, 0, 1).applyQuaternion(this.q);
    _s.set(1, 0, 0).applyQuaternion(this.q);
    const e = _f.x - _s.z, t = _f.z + _s.x;
    return e * e + t * t < 1e-12 ? this.heading : Math.atan2(e, t);
  }
  get tilt() { return Math.acos(Math.max(-1, Math.min(1, this.upright))); }
  // compatibility with the old air rotation's names
  get spinAngle() { return this.yawTurn; }
  get flipAngle() { return this.som; }
  correct(dq) { this.q.premultiply(dq).normalize(); this.heading = this.bodyHeading; }
}
