# The rider, built from scratch to Cork7's: measured off its locker turntable (front, side and
# back, shots/c7/locker*.png) and drawn at the same overall height, 1.74 m from the soles to the
# top of the helmet. A long straight shell down past the seat (its hem at 0.40 of the height), a
# funnel collar up to the chin and the hood lying flat on the upper back, dropped round shoulders,
# slim sleeves hanging to black gloves below the hem, straight baggy pants over the boots, and a
# big head with a long face under the goggles. The legs are shorter than a real rider's (as
# Cork7's are) and the skeleton is drawn for them: the same Bip01 bones, so the game's rig poses
# it from its own limb lengths. toyrider.js BONES must match.
# Lofted, then smoothed with subdivision; the soft shading of the folds is baked into 'Col'.
# blender -b --python blender/rider.py  ->  blender/out/rider.glb
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from common import G, reset, loft, ellipsoid, subdivide, smooth, join, bake_ao, export, part_into_green, pack

reset()
V = lambda x, y, z: Vector((x, y, z))

# the rest pose: an A-pose facing +z, +x the rider's left
BONES = [
    ('Bip01', V(0, 0.82, 0), None), ('Bip01_Pelvis', V(0, 0.82, 0), 'Bip01'), ('Bip01_Spine', V(0, 0.93, 0), 'Bip01_Pelvis'),
    ('Bip01_L_Thigh', V(0.09, 0.82, 0), 'Bip01_Spine'), ('Bip01_L_Calf', V(0.104, 0.46, 0.012), 'Bip01_L_Thigh'), ('Bip01_L_Foot', V(0.112, 0.1, -0.012), 'Bip01_L_Calf'),
    ('Bip01_R_Thigh', V(-0.09, 0.82, 0), 'Bip01_Spine'), ('Bip01_R_Calf', V(-0.104, 0.46, 0.012), 'Bip01_R_Thigh'), ('Bip01_R_Foot', V(-0.112, 0.1, -0.012), 'Bip01_R_Calf'),
    ('Bip01_Spine1', V(0, 1.04, 0), 'Bip01_Spine'), ('Bip01_Spine2', V(0, 1.15, -0.01), 'Bip01_Spine1'), ('Bip01_Neck', V(0, 1.36, -0.012), 'Bip01_Spine2'),
    ('Bip01_Head', V(0, 1.458, 0.008), 'Bip01_Neck'),
    ('Bip01_L_Clavicle', V(0.075, 1.29, -0.024), 'Bip01_Neck'), ('Bip01_L_UpperArm', V(0.235, 1.225, -0.025), 'Bip01_L_Clavicle'),
    ('Bip01_L_Forearm', V(0.458, 1.01, -0.02), 'Bip01_L_UpperArm'), ('Bip01_L_Hand', V(0.642, 0.812, 0.083), 'Bip01_L_Forearm'),
    ('Bip01_R_Clavicle', V(-0.075, 1.29, -0.024), 'Bip01_Neck'), ('Bip01_R_UpperArm', V(-0.235, 1.225, -0.025), 'Bip01_R_Clavicle'),
    ('Bip01_R_Forearm', V(-0.458, 1.01, -0.02), 'Bip01_R_UpperArm'), ('Bip01_R_Hand', V(-0.642, 0.812, 0.083), 'Bip01_R_Forearm'),
]
P = {n: p for n, p, _ in BONES}
UP, X, Z = (0, 1, 0), (1, 0, 0), (0, 0, 1)
# the head (and the helmet the game puts on it) is this much bigger than a real one, grown from
# the head bone: toyrider.js HEAD_SCALE must match
HS = 1.15
HEAD = P['Bip01_Head']
SPINE = [('Bip01_Pelvis', 0.82), ('Bip01_Spine', 0.93), ('Bip01_Spine1', 1.04), ('Bip01_Spine2', 1.15), ('Bip01_Neck', 1.36)]


def spineW(y):
    if y <= SPINE[0][1]:
        return {SPINE[0][0]: 1}
    for i in range(len(SPINE) - 1):
        if y <= SPINE[i + 1][1]:
            t = (y - SPINE[i][1]) / (SPINE[i + 1][1] - SPINE[i][1])
            return {SPINE[i][0]: 1 - t, SPINE[i + 1][0]: t}
    return {'Bip01_Neck': 1}


def shellW(y):
    # below the hips the shell rides with the thighs too (the front more than the back, each side
    # with its own leg), more toward the hem, so a knee lifted into a grab doesn't come through it
    k = max(0, min(1, (0.82 - y) / 0.12)) * 0.6

    def f(p):
        kk = k * (0.5 + 0.5 * min(1, max(0, (p[2] + 0.12) / 0.26)))
        l = 0.5 + 0.5 * max(-1, min(1, p[0] / 0.1))
        w = {b: v * (1 - kk) for b, v in spineW(y).items()}
        w['Bip01_L_Thigh'] = kk * l
        w['Bip01_R_Thigh'] = kk * (1 - l)
        return w
    return f


def creases(n, amp, ph):
    """soft folds round a ring: a few lobes of different sizes"""
    return lambda th: amp * (math.sin(n * th + ph) * 0.6 + math.sin((n + 3) * th - ph * 1.7) * 0.4)


parts = []
# the shell: boxy and straight from the hem to the chest (0.4 m across, 0.31 deep, a touch fuller
# at the hem), the shoulders falling away from the collar, then the funnel collar standing up to
# the chin, open at the top
#         y     half w  half d  z      squareness
SHELL = [(0.7, 0.214, 0.162, -0.008, 2.5), (0.735, 0.212, 0.162, -0.01, 2.6), (0.8, 0.208, 0.16, -0.012, 2.6), (0.9, 0.204, 0.156, -0.012, 2.6),
         (1.0, 0.202, 0.157, -0.01, 2.6), (1.1, 0.203, 0.158, -0.01, 2.5), (1.18, 0.2, 0.155, -0.012, 2.4), (1.235, 0.196, 0.149, -0.015, 2.4),
         (1.28, 0.185, 0.14, -0.018, 2.4), (1.31, 0.162, 0.128, -0.02, 2.3), (1.335, 0.126, 0.112, -0.02, 2.1), (1.355, 0.103, 0.1, -0.016, 2.0),
         (1.38, 0.1, 0.098, -0.008, 2.0), (1.41, 0.102, 0.1, -0.002, 2.0), (1.435, 0.104, 0.102, 0.002, 2.0)]
rings = []
for i, (y, a, b, z, p) in enumerate(SHELL):
    r = dict(c=(0, y, z), t=UP, side=X, a=a, b=b, p=p, part=2, w=shellW(y) if y < 0.9 else spineW(y))
    # (a few long soft folds hanging down the body, none on the collar)
    if y < 1.24:
        r['fold'] = creases(5, 0.012 + 0.012 * max(0, (1.0 - y) / 0.3), i * 0.9)
    rings.append(r)
# (the collar's top rises behind, where the hood joins it)
rings[-1]['c'] = (0, 1.435, 0.002)
parts.append(loft('shell', rings, seg=36, cap0=0.05, cap1=-0.6))

# the hood, lying flat on the upper back: a soft rounded lobe 0.27 m across from the collar down to
# the shoulder blades, its peak pointing down
hood = []
for i in range(9):
    t = i / 8
    y = 1.42 - t * 0.19
    w = 0.145 * math.sin(math.pi * min(1, 0.18 + t * 0.95)) ** 0.7
    hood.append(dict(c=(0, y, -0.118 - 0.05 * math.sin(math.pi * t * 0.8)), t=(0, -1, -0.15), side=X, a=max(0.012, w), b=0.03 + 0.02 * math.sin(math.pi * t), p=2.2, part=2,
                     w=spineW(y)))
parts.append(loft('hood', hood, seg=24, cap0=0.6, cap1=0.6))

for s in (1, -1):
    S = 'L' if s > 0 else 'R'
    B = lambda n: f'Bip01_{S}_{n}'
    H, K, A = P[B('Thigh')] + V(0, 0.06, 0), P[B('Calf')], P[B('Foot')]
    # pants: one wide straight tube from the hip to the boot, the legs just apart below the seat,
    # the hem stacked over the boot down to its sole
    leg = []
    out = lambda t: V(s * 0.014 * min(1, t), 0, 0)
    TH = [(0, 0.11, 0.108, {'Bip01_Pelvis': 0.5, B('Thigh'): 0.5}), (0.18, 0.106, 0.11, {'Bip01_Pelvis': 0.15, B('Thigh'): 0.85}), (0.4, 0.098, 0.115, {B('Thigh'): 1}),
          (0.65, 0.095, 0.124, {B('Thigh'): 1}), (0.88, 0.094, 0.12, {B('Thigh'): 0.8, B('Calf'): 0.2}), (1.0, 0.094, 0.118, {B('Thigh'): 0.5, B('Calf'): 0.5})]
    for i, (t, a, b, w) in enumerate(TH):
        leg.append(dict(c=tuple(H.lerp(K, t) + out(t)), t=tuple(K - H), side=X, a=a, b=b, w=w, part=6, fold=creases(4, 0.012 + 0.012 * t, i * 1.3 + s)))
    SH = [(0.12, 0.094, 0.116, {B('Thigh'): 0.25, B('Calf'): 0.75}), (0.35, 0.093, 0.112, {B('Calf'): 1}), (0.6, 0.094, 0.11, {B('Calf'): 1}),
          (0.8, 0.096, 0.112, {B('Calf'): 1}), (0.92, 0.098, 0.114, {B('Calf'): 1}), (1.0, 0.099, 0.115, {B('Calf'): 1}), (1.1, 0.098, 0.114, {B('Calf'): 1}),
          (1.15, 0.095, 0.11, {B('Calf'): 1})]
    for i, (t, a, b, w) in enumerate(SH):
        leg.append(dict(c=tuple(K.lerp(A, t) + out(1) + V(0, 0, 0.012 * math.sin(min(1, t) * math.pi))), t=tuple(A - K), side=X, a=a, b=b, w=w, part=7,
                        fold=creases(4, 0.022 if t > 0.85 else 0.014, i * 1.1 - s)))
    # (the hem stays open over the boot)
    parts.append(loft('leg' + S, leg, seg=28, cap0=0.3, cap1=-0.04))

    # the sleeve: set into the dropped shoulder, slim and straight (0.12 m across), hanging in a
    # few folds to the cuff over the glove
    C0, Sh, E, W = V(s * 0.15, 1.245, -0.024), P[B('UpperArm')], P[B('Forearm')], P[B('Hand')]
    arm = [
        (C0, Sh - C0, 0.07, 0.074, {'Bip01_Spine2': 0.7, B('UpperArm'): 0.3}, 3),
        (C0.lerp(Sh, 0.6), Sh - C0, 0.07, 0.074, {'Bip01_Spine2': 0.45, B('UpperArm'): 0.55}, 3),
        (Sh, E - Sh, 0.068, 0.073, {'Bip01_Spine2': 0.2, B('UpperArm'): 0.8}, 3),
        (Sh.lerp(E, 0.3), E - Sh, 0.064, 0.07, {B('UpperArm'): 1}, 3),
        (Sh.lerp(E, 0.65), E - Sh, 0.062, 0.068, {B('UpperArm'): 1}, 3),
        (Sh.lerp(E, 0.9), E - Sh, 0.062, 0.067, {B('UpperArm'): 0.8, B('Forearm'): 0.2}, 3),
        (E, W - Sh, 0.062, 0.066, {B('UpperArm'): 0.5, B('Forearm'): 0.5}, 4),
        (E.lerp(W, 0.3), W - E, 0.061, 0.065, {B('Forearm'): 1}, 4),
        (E.lerp(W, 0.65), W - E, 0.061, 0.064, {B('Forearm'): 1}, 4),
        (E.lerp(W, 0.86), W - E, 0.062, 0.064, {B('Forearm'): 0.9, B('Hand'): 0.1}, 4),
        (E.lerp(W, 0.93), W - E, 0.059, 0.061, {B('Forearm'): 0.85, B('Hand'): 0.15}, 4),
    ]
    parts.append(loft('arm' + S, [dict(c=tuple(c), t=tuple(t), side=Z, a=a, b=b, w=w, part=pt, fold=creases(3, 0.02, k * 0.8))
                                  for k, (c, t, a, b, w, pt) in enumerate(arm)], seg=22, cap0=0.3, cap1=-0.35))
    # the glove: a gauntlet over the cuff, the hand a flat paddle with the thumb on the inside
    d = (W - E).normalized()
    glove = [dict(c=tuple(W + d * t), t=tuple(d), side=Z, a=a, b=b, w={B('Hand'): wh, B('Forearm'): 1 - wh}, part=5)
             for t, a, b, wh in [(-0.07, 0.058, 0.058, 0.3), (-0.04, 0.06, 0.059, 0.5), (-0.012, 0.052, 0.046, 0.8), (0.025, 0.053, 0.04, 1),
                                 (0.065, 0.054, 0.037, 1), (0.1, 0.05, 0.034, 1), (0.125, 0.038, 0.027, 1)]]
    parts.append(loft('glove' + S, glove, seg=18, cap0=0.4, cap1=0.8))
    thumb = W + d * 0.035 + V(0, 0, 0.04)
    parts.append(ellipsoid('thumb' + S, tuple(thumb), (0.02, 0.04, 0.02), {B('Hand'): 1}, 5, rings=6, seg=12, axis=tuple(d + V(0, 0, 0.8)), side=tuple(d.cross(V(0, 0, 1)))))

# the neck, down into the collar
parts.append(loft('neck', [dict(c=(0, 1.34, -0.014), t=UP, side=X, a=0.052, b=0.054, w={'Bip01_Spine2': 0.3, 'Bip01_Neck': 0.7}, part=1),
                           dict(c=(0, 1.41, -0.006), t=UP, side=X, a=0.05, b=0.052, w={'Bip01_Neck': 0.7, 'Bip01_Head': 0.3}, part=1),
                           dict(c=(0, 1.47, 0.002), t=UP, side=X, a=0.052, b=0.054, w={'Bip01_Head': 1}, part=1)], seg=20, cap0=0.2, cap1=0.2))
# the head: a long face under the goggles (the chin down at the collar's top), a nose, ears,
# short hair at the back under the helmet
head = []
HC, HW = HEAD + V(0, 0.082, 0.018), {'Bip01_Head': 1}
head.append(ellipsoid('head', tuple(HC), (0.09, 0.114, 0.104), HW, 0, rings=14, seg=28))
# (the jaw: narrower, filling the face out below the cheeks)
head.append(ellipsoid('jaw', tuple(HC + V(0, -0.05, 0.022)), (0.068, 0.06, 0.07), HW, 0, rings=10, seg=24))
head.append(ellipsoid('nose', tuple(HC + V(0, -0.034, 0.1)), (0.014, 0.022, 0.017), HW, 0, rings=6, seg=12, axis=(0, 1, 0.4)))
for s in (1, -1):
    head.append(ellipsoid('ear', tuple(HC + V(s * 0.087, -0.014, -0.012)), (0.011, 0.024, 0.016), HW, 0, rings=6, seg=12))
head.append(ellipsoid('hair', tuple(HC + V(0, 0.014, -0.034)), (0.089, 0.108, 0.094), HW, 8, rings=12, seg=28))
for o in head:
    # (grown from the head bone)
    for v in o.data.vertices:
        p = v.co - Vector(G(*HEAD))
        v.co = Vector(G(*HEAD)) + p * HS
parts += head

# smooth every piece (subdivision carries the bone weights and the part along)
for o in parts:
    subdivide(o, 1)
    smooth(o)
body = join(parts, 'rider')

# the armature, rest pose = the game's
arm_d = bpy.data.armatures.new('rig')
rig = bpy.data.objects.new('rig', arm_d)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = {}
kids = {}
for n, p, par in BONES:
    if par:
        kids.setdefault(par, []).append(n)
for n, p, par in BONES:
    b = arm_d.edit_bones.new(n)
    b.head = G(*p)
    ch = kids.get(n)
    tail = P[ch[0]] if ch and (P[ch[0]] - p).length > 0.02 else p + V(0, 0.06, 0)
    b.tail = G(*tail)
    eb[n] = b
for n, p, par in BONES:
    if par:
        eb[n].parent = eb[par]
bpy.ops.object.mode_set(mode='OBJECT')
body.parent = rig
mod = body.modifiers.new('arm', 'ARMATURE')
mod.object = rig

# flat colours live in the game (the outfit); Blender bakes the shading of the folds
bake_ao([body], distance=0.22, samples=96)
part_into_green(body)
export([rig, body], 'rider', skins=True)
pack('rider')
