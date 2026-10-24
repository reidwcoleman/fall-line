// Trick School: every trick with how to do it, a demo the rider performs on the menu, and
// a combo to tap in the air (see COMBOS). A lesson is passed the first time the
// trick lands for real (it goes in the trick book) and pays flakes once.
//   demo / quick: { spin (deg), dir, type, flips, roll, grab, shifty, daffy, butter, rail }
const K = (k) => `<kbd>${k}</kbd>`;
// steps: doing it by hand (the combo way is in comboSteps)
const L = (id, fam, lvl, name, board, re, steps, tip, demo, where = 'jumps') => ({ id, fam, lvl, name, board: board ?? name, re, steps, tip, demo, where, reward: 40 + lvl * 35,
  classic: steps.some((t) => /[←→↑↓]/.test(t)) });

export const FAMS = [['basics', 'First air'], ['grabs', 'Grabs'], ['spins', 'Spins'], ['flips', 'Flips'], ['offaxis', 'Corks & co'], ['rails', 'Rails & butters']];

export const LESSONS = [
  L('mute', 'basics', 1, 'Mute Grab', 'Indy', /Mute|Indy/, ['Ride at any kicker', `Hold ${K('SPACE')} on the way up and through the lip: a bigger pop`, `In the air hold ${K('SHIFT')}`, 'Let go of it before you touch down'], 'Grabs look best held long: a second or more makes it Tweaked.', { grab: 'mute' }),
  L('shifty', 'basics', 1, 'Shifty', null, /Shifty/, ['Pop off a kicker or a roller', `In the air tap ${K('↑')} on its own (no spin)`, 'The hips twist the skis across and back'], 'The easiest style points there are: try one off every little roller.', { shifty: true }),
  L('daffy', 'basics', 1, 'Daffy', 'Boned', /Daffy|Boned/, ['Pop off a kicker', `In the air hold ${K('↓')} on its own`, 'Let go before you land'], 'On a board it is a Boned: front leg straight, nose kicked out.', { daffy: true }),
  L('180', 'basics', 1, '180', 'FS 180', /\b180\b|Half Cab/, ['Pop off a kicker', `In the air tap ${K('D')} (or ${K('A')} the other way)`, 'Let go once you are half way round (it runs on a little): land backwards and you ride away switch'], 'Riding switch? A 180 brings you back round.', { spin: 180, dir: -1 }),
  L('360', 'basics', 2, '360', 'FS 360', /\b360\b/, ['Ride at a medium kicker at its speed (on the sign)', `Hold ${K('D')} (or ${K('A')}) as you leave the lip: that throws the spin`, 'Let go and the throw brings you round on the landing', 'You land facing forward'], 'Start the spin before the lip (hold the key on the ramp): it winds up faster.', { spin: 360, dir: -1 }),
  L('butter', 'rails', 1, 'Nose Butter', null, /Butter/, [`On flat snow hold ${K('B')} to press the nose (add ${K('S')} for the tail)`, `Hold ${K('A')} or ${K('D')} to pivot round on it`, 'Let go of B to pop out of it'], 'Butter 360 and 540 pay more. Pop out of a butter into a spin.', { butter: true }, 'any'),

  L('tail', 'grabs', 2, 'Tail Grab', null, /Tail(?! Butter| Press)/, ['Pop off a kicker', `In the air hold ${K('Q')}`, 'Let go before the landing'], 'Tweak it: hold the key a full second.', { grab: 'tail' }),
  L('japan', 'grabs', 2, 'Japan', 'Melon', /Japan|Melon/, ['Pop off a kicker', `In the air hold ${K('E')}`], 'Japan pulls the skis up behind you. On a board, Melon grabs the heel edge.', { grab: 'japan' }),
  L('safety', 'grabs', 2, 'Safety Grab', 'Method', /Safety|Method/, ['Pop off a kicker', `In the air hold ${K('F')}`], 'On a board the Method arches the back: the classic.', { grab: 'safety' }),
  L('critical', 'grabs', 2, 'Critical', 'Stalefish', /Critical|Stalefish/, ['Pop off a kicker', `In the air hold ${K('X')}`], 'Combine it with a spin for the big scores.', { grab: 'critical' }),
  L('nose', 'grabs', 2, 'Nose Grab', null, /Nose(?! Butter| Press)/, ['Pop off a kicker', `In the air hold ${K('Z')}`], 'Nose grabs and tail grabs look great in slow motion: watch it back with V.', { grab: 'nose' }),
  L('g2g', 'grabs', 3, 'Grab to Grab', null, / to /, ['Off a big kicker, hold one grab key', 'Halfway through the air switch to another grab key', 'Each grab in the chain counts'], 'Two grabs in one air pay 30% more.', { grab: 'mute' }),
  L('tweak', 'grabs', 3, 'Tweaked Grab', null, /Tweaked/, ['Off a medium or big kicker, hold any grab key', 'Keep holding it for a full second', 'Let go just before you land'], 'Tweaked grabs pay up to half as much again.', { grab: 'japan' }),

  L('540', 'spins', 2, '540', 'BS 540', /\b540\b/, ['Medium or large kicker, at its speed', `Load ${K('SPACE')} and carve with ${K('A')} or ${K('D')} up the ramp for half a second: that winds up a 540`, 'Let go of the pop at the lip, keep the carve key held: you land switch'], 'Grab during the spin (hold Shift) and it spins a little faster.', { spin: 540, dir: 1, grab: 'mute' }),
  L('720', 'spins', 3, '720', 'FS 720', /\b720\b/, ['Large kicker, at its speed', `Load ${K('SPACE')} and carve with ${K('D')} up the ramp for three quarters of a second`, 'Pop at the lip; hold the key to stay tucked, the other way if you are coming round too fast'], 'A 720 scores four times a 360: spins pay by the square of the turns.', { spin: 720, dir: -1, grab: 'safety' }),
  L('900', 'spins', 3, '900', 'BS 900', /\b900\b/, ['The XL kicker or the big air', `Wind up with ${K('A')} and ${K('SPACE')} held for about a second up the ramp`, 'Pop at the lip and grab to tuck up: two and a half turns'], 'Hold the pop through the lip: more height, more time to spin. A grab spins you faster.', { spin: 900, dir: 1, grab: 'mute' }),
  L('1080', 'spins', 4, '1080', 'FS 1080', /\b1080\b/, ['Only the biggest jumps: Big Air or the XL', `Wind up on the ramp with ${K('D')} and ${K('SPACE')} held for a second and a quarter`, 'Pop at the lip, grab to tuck up and spin faster'], 'Big Air park: the big kicker gives you over two seconds of air.', { spin: 1080, dir: -1, grab: 'japan' }),
  L('switch', 'spins', 3, 'Switch 360', 'Cab 360', /^Switch|^Cab/, ['Land a 180 or 540 so you ride away backwards', 'Hit the next kicker riding switch', `Spin a 360 with ${K('A')} or ${K('D')}`], 'Switch tricks score 25% more.', { spin: 360, dir: 1 }),

  L('backflip', 'flips', 2, 'Backflip', null, /Backflip/, ['Medium kicker at its speed, a good pop', `Hold ${K('S')} as you leave the lip: that throws the flip`, 'Let go: you hold your shape and come round. Hold it to tuck and turn faster'], 'Flips count as whole turns in the score.', { type: 'backflip', flips: 1 }),
  L('frontflip', 'flips', 3, 'Frontflip', null, /Frontflip/, ['Medium kicker at its speed', `Hold ${K('W')} as you leave the lip`, 'If you are coming round too fast, hold the other way to open up'], 'Frontflips go round faster than you think: open up if you are early.', { type: 'frontflip', flips: 1 }),
  L('sideflip', 'flips', 3, 'Sideflip', 'Wildcat', /Sideflip|Wildcat|Tamedog/, ['Medium kicker', `Hold ${K('←')} or ${K('→')} (classic keys) as you leave the lip`, 'A roll over sideways'], 'On a board this is a Wildcat (or a Tamedog the other way).', { type: 'sideflip', flips: 1, roll: 1 }),
  L('double', 'flips', 4, 'Double Backflip', null, /Double Back/, ['Big Air or the XL kicker, pop at the lip', `Hold ${K('S')} as you leave and keep holding it through the takeoff`, 'Held through the takeoff on a big jump it throws the double'], 'Grab while flipping: tucked up you go round faster, so mind the landing.', { type: 'backflip', flips: 2, grab: 'mute' }),

  L('cork', 'offaxis', 3, 'Cork 720', null, /Cork/, ['Large kicker, at its speed', `Wind up with ${K('D')} and ${K('SPACE')} up the ramp`, `At the lip hold ${K('S')} too: spin and flip thrown together twist round a slow backflip, a cork`], 'Both keys at the lip. The physics does the rest: a fast twist round a slow flip.', { type: 'cork', flips: 1, spin: 720, dir: -1, grab: 'mute' }),
  L('bio', 'offaxis', 3, 'Bio 540', 'Misty 540', /Bio|Misty/, ['Large kicker', `Hold ${K('A')} and ${K('W')} together as you leave the lip`, 'The twist round a forward flip: a bio'], 'On a board the forward off-axis spin is called a Misty.', { type: 'bio', flips: 1, spin: 540, dir: 1, grab: 'japan' }),
  L('rodeo', 'offaxis', 3, 'Rodeo 540', null, /Rodeo/, ['Large kicker', `Throw a 540 with ${K('A')} or ${K('D')} and ${K('S')} together off the lip`, 'Less twist round the flip than a cork: a rodeo'], 'Holding ↑ with W instead gives a misty.', { type: 'rodeo', flips: 1, spin: 540, dir: 1, grab: 'safety' }),
  L('flatspin', 'offaxis', 3, 'Flatspin 360', null, /Flatspin/, ['Medium kicker', `Throw a spin with ${K('D')}`, `and a roll with ${K('←')} or ${K('→')} (classic keys) at the lip: the spin lies down flat`], 'Flatspins pay like a flip and a spin.', { type: 'flatspin', flips: 1, spin: 360, dir: -1, roll: 1 }),
  L('dcork', 'offaxis', 4, 'Double Cork 1080', null, /Double Cork/, ['Big Air at its speed', `Wind up a 1080 with ${K('D')} and ${K('SPACE')} up the ramp`, `At the lip add ${K('S')} and keep it held through the takeoff: two flips`, 'Land it straight: nothing lands it for you'], 'The biggest trick on the mountain. Quick trick it first to see how it goes.', { type: 'cork', flips: 2, spin: 1080, dir: -1, grab: 'mute' }),

  L('5050', 'rails', 1, '50-50', null, /50-50/, [`Ride straight onto a rail or box (the rails line: L in the park)`, 'Keep A and D still: ride it to the end'], 'Boxes are easier than rails: start on the Butter Box.', { rail: 'straight' }, 'rails'),
  L('slide', 'rails', 2, 'Boardslide', null, /Boardslide|Lipslide/, ['Ride at a rail', `Turn sideways with ${K('A')} or ${K('D')} as you get on`, `Tap ${K('A')}/${K('D')} again on the rail to swap the slide`], 'Swaps on the rail pay extra every time.', { rail: 'side' }, 'rails'),
  L('press', 'rails', 2, 'Nose Press', null, /Press/, ['Ride onto a long rail', `Hold ${K('W')} for a nose press (${K('S')} for the tail)`, 'Hold it for most of the rail'], 'A held press pays 30% more.', { rail: 'press' }, 'rails'),
  L('270', 'rails', 3, '270 Out', null, /\b(270|450) Out/, ['Slide a rail sideways', `Off the end hold ${K('A')} or ${K('D')}`, 'Three quarters round and land forward'], 'Spins off a rail count in quarters: 270 out, 450 out.', { rail: 'side', spin: 270, dir: 1 }, 'rails'),
];
export const LESSON = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

// Combos: arrow taps in the air (U D L R), quick ones (a tap is under a fifth of a second;
// holding an arrow still spins or flips you by hand). More taps, more rotation. The biggest
// ones are secret until you've landed them.
export const COMBOS = [
  { seq: 'DD', id: 'mute' }, { seq: 'UU', id: 'japan' }, { seq: 'LR', id: 'safety' }, { seq: 'RL', id: 'tail' },
  { seq: 'DL', id: 'critical' }, { seq: 'UR', id: 'nose' }, { seq: 'UD', id: 'shifty' }, { seq: 'DU', id: 'daffy' },
  { seq: 'LL', id: '360', dir: 1 }, { seq: 'RR', id: '360', dir: -1 },
  { seq: 'LLL', id: '540', dir: 1 }, { seq: 'RRR', id: '540', dir: -1 },
  { seq: 'LLLL', id: '720', dir: 1 }, { seq: 'RRRR', id: '720', dir: -1 },
  { seq: 'LLLLL', id: '900', dir: 1, secret: true }, { seq: 'RRRRR', id: '900', dir: -1, secret: true },
  { seq: 'LLLLLL', id: '1080', dir: 1, secret: true }, { seq: 'RRRRRR', id: '1080', dir: -1, secret: true },
  { seq: 'DDD', id: 'backflip' }, { seq: 'UUU', id: 'frontflip' }, { seq: 'DDDD', id: 'double', secret: true },
  { seq: 'LRL', id: 'sideflip' }, { seq: 'ULR', id: 'flatspin' },
  { seq: 'LDR', id: 'cork', dir: 1 }, { seq: 'RDL', id: 'cork', dir: -1 },
  { seq: 'LUR', id: 'bio', dir: 1 }, { seq: 'RUL', id: 'bio', dir: -1 },
  { seq: 'DLD', id: 'rodeo', dir: 1 }, { seq: 'DRD', id: 'rodeo', dir: -1 },
  { seq: 'LDLD', id: 'dcork', dir: 1, secret: true }, { seq: 'RDRD', id: 'dcork', dir: -1, secret: true },
];
export const ARROW = { U: '↑', D: '↓', L: '←', R: '→' };
// the first combo listed for a lesson
export const comboFor = (id) => COMBOS.find((c) => c.id === id) ?? null;

// steps for doing a lesson's trick with its combo
export function comboSteps(l, where, secret) {
  const c = comboFor(l.id);
  if (!c || !quickSpec(l.id)) return null;
  const keys = [...c.seq].map((k) => `<kbd>${ARROW[k]}</kbd>`).join(' ');
  return [
    `Pop off ${where}`,
    secret ? 'In the air, tap the secret combo (more taps, more rotation: find it)' : `In the air tap ${keys}, quick taps one after another`,
    'The rider throws it, as big as the air allows, and lands it if you leave it alone',
  ];
}

// a lesson's trick as a quick trick spec
export function quickSpec(id) {
  const l = LESSON[id];
  if (!l || l.demo.rail || l.demo.butter) return null;
  return { ...l.demo };
}
