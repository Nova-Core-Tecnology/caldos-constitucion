#!/usr/bin/env python3
"""Genera las hierbas ilustradas de Caldos Constitucion.

Salida (relativa al directorio donde se ejecuta):
  components/shared/botanical-art.js   -> window.BOTANICAL_SPRITE + window.BOTANICAL_ART (SVG inline)
  assets/botanical/*.svg               -> las mismas piezas como SVG independientes

Las hojas se dibujan una sola vez en un "sprite" (<symbol>) y cada planta las reutiliza con <use>,
asi el peso es pequeno y las hojas nunca son identicas (formas, tamanos, giros y tonos varian).
Colores: variables CSS --bt-g1..g6 (verdes), --bt-gy, --bt-gb, --bt-fl, --bt-fl2, --bt-st.
"""
import math, random, json, os

# ---------------------------------------------------------------- utilidades
def r3(v):
    s = ("%.3f" % v).rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s

def r1(v):
    s = ("%.1f" % v).rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s

def path_from(pts, close=True):
    return "M" + "L".join("%s %s" % (r3(x), r3(y)) for x, y in pts) + ("Z" if close else "")

def frac(v):
    return v - math.floor(v)

def bez(p0, p1, p2, p3, t):
    u = 1 - t
    x = u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0]
    y = u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]
    dx = 3*u*u*(p1[0]-p0[0]) + 6*u*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0])
    dy = 3*u*u*(p1[1]-p0[1]) + 6*u*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1])
    return x, y, math.degrees(math.atan2(dx, -dy))   # angulo en grados, 0 = hacia arriba, positivo = horario

# ---------------------------------------------------------------- sprite de hojas
SYMS = []   # cadenas <symbol>

def add_symbol(sid, body, veins, hl):
    SYMS.append('<symbol id="%s" overflow="visible"><path d="%s" fill="var(--lf)"/>'
                '<path d="%s" fill="#fff" opacity=".13"/>'
                '<path d="%s" fill="none" stroke="#12200c" stroke-opacity=".3" stroke-width=".018" stroke-linecap="round"/></symbol>'
                % (sid, body, hl, veins))

def lance(sid, W, p=.75, q=.9, bend=0.0, teeth=0, tooth=0.0, side_veins=0, base_w=0.0):
    """Hoja alargada (recao, laurel, albahaca, menta, oregano, tomillo, romero) apuntando hacia arriba."""
    n = max(30, teeth * 5)
    def w(t, ph):
        v = W * (max(0.0, math.sin(math.pi * t ** p)) ** q)
        if teeth:
            v *= 1 + tooth * (frac(teeth * t + ph) - .5) * 2 * min(1, t * 5) * min(1, (1 - t) * 6 + .2)
        return max(0.0, v) + base_w * (1 - t) ** 3 * W
    right = [(w(i / n, 0) + bend * (i / n) ** 2, -i / n) for i in range(n + 1)]
    left = [(-w(i / n, .5) + bend * (i / n) ** 2, -i / n) for i in range(n + 1)]
    body = path_from(right + left[::-1][1:-1])
    half = path_from([(bend * (i / n) ** 2, -i / n) for i in range(n + 1)] + left[::-1][1:-1] + [(0, 0)][:0])
    mid = [(bend * t ** 2, -t) for t in [k / 10 * .94 for k in range(11)]]
    vs = path_from(mid, close=False)
    for k in range(side_veins):
        t0 = .14 + k * (.62 / max(1, side_veins))
        t1 = min(.92, t0 + .2)
        xc, yc = bend * t0 ** 2, -t0
        for sgn in (1, -1):
            xe = sgn * w(t1, 0 if sgn > 0 else .5) * .88 + bend * t1 ** 2
            vs += "M%s %sL%s %s" % (r3(xc), r3(yc), r3(xe), r3(-t1))
    add_symbol(sid, body, vs, half)

def fan(sid, a_deg, lobes, k, k2, sharp=0.0, skew=0.0):
    """Hoja en abanico lobulada (cilantro, perejil). Nace en el origen y se abre hacia arriba."""
    a = math.radians(a_deg)
    n = 90
    pts = [(0, 0)]
    for i in range(n + 1):
        phi = -a + 2 * a * i / n
        u = (phi + a) / (2 * a)
        rb = 1 - .38 * ((phi + skew) / a) ** 2
        lob = 1 - k * math.cos(2 * math.pi * lobes * u)
        s = math.sin(math.pi * lobes * 3 * u)
        scal = 1 + k2 * (abs(s) - .5) if not sharp else 1 + k2 * ((frac(lobes * 3 * u) - .5) * sharp)
        rr = rb * lob * scal
        pts.append((rr * math.sin(phi), -rr * math.cos(phi)))
    body = path_from(pts)
    half = path_from([(0, 0)] + [p for p in pts[1:] if p[0] <= .001] + [(0, -pts[len(pts)//2][1] * -1)][:0])
    vs = "M0 0L0 -.78"
    for m in range(lobes):
        phi = -a + 2 * a * (m + .5) / lobes
        vs += "M0 0L%s %s" % (r3(.7 * math.sin(phi)), r3(-.7 * math.cos(phi)))
    add_symbol(sid, body, vs, half)

def bloom(sid, seed):
    rr = random.Random(seed)
    cs = ""
    for i in range(9):
        a = rr.uniform(0, 6.28); d = rr.uniform(0, .26)
        cs += '<circle cx="%s" cy="%s" r="%s"/>' % (r3(d * math.cos(a)), r3(d * math.sin(a) - .2), r3(rr.uniform(.07, .13)))
    SYMS.append('<symbol id="%s" overflow="visible"><g fill="var(--lf)">%s</g><g fill="#fff" opacity=".25"><circle cx="-.04" cy="-.26" r=".05"/></g></symbol>' % (sid, cs))

# --- variantes de hoja
for i, (W, b, a) in enumerate([(.17, .06, 62), (.15, -.07, 58), (.14, .0, 64)]):
    lance("rec%d" % i, W, p=.62, q=.8, bend=b, teeth=22, tooth=.5, side_veins=0)       # recao serrado y largo
for i, (a, lb, k, k2) in enumerate([(62, 3, .24, .15), (70, 3, .3, .13), (56, 3, .2, .17), (74, 5, .22, .12)]):
    fan("cil%d" % i, a, lb, k, k2, skew=(i - 1.5) * .06)                                   # cilantro redondeado
for i, (a, lb, k, k2) in enumerate([(66, 3, .34, .3), (72, 3, .38, .34), (60, 5, .3, .32)]):
    fan("par%d" % i, a, lb, k, k2, sharp=1.0, skew=(i - 1) * .05)                          # perejil mas puntiagudo
for i, (W, b) in enumerate([(.4, .05), (.37, -.04), (.43, .0)]):
    lance("bas%d" % i, W, p=.62, q=.78, bend=b, side_veins=4)                              # albahaca ancha y puntiaguda
for i, (W, b) in enumerate([(.2, .05), (.19, -.05), (.22, 0)]):
    lance("lau%d" % i, W, p=.8, q=.8, bend=b, side_veins=0)                                # laurel lanceolado
for i, (W, b) in enumerate([(.4, .04), (.38, -.04), (.42, 0)]):
    lance("men%d" % i, W, p=.62, q=.85, bend=b, teeth=10, tooth=.22, side_veins=5)         # menta aserrada con nervios
for i, (W, b) in enumerate([(.46, 0), (.42, .03), (.44, -.03)]):
    lance("ore%d" % i, W, p=.55, q=.85, bend=b, side_veins=2)                              # oregano ovalado
for i, (W, b) in enumerate([(.3, 0), (.27, .03)]):
    lance("tom%d" % i, W, p=.6, q=.85, bend=b)                                             # tomillo diminuto
for i, (W, b) in enumerate([(.055, .03), (.05, -.03)]):
    lance("rom%d" % i, W * 1.5, p=.9, q=.5, bend=b)                                              # romero en aguja
bloom("blo0", 1); bloom("blo1", 2)

SPRITE = ('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" '
          'aria-hidden="true" focusable="false"><defs>' + "".join(SYMS) + '</defs></svg>')

# ---------------------------------------------------------------- lienzo
class Art:
    def __init__(self, seed, w, h):
        self.r = random.Random(seed)
        self.w, self.h = w, h
        self.plants = []       # (z, orden, svg)
        self.k = 0

    def pick(self, z, extra=None):
        """Tono segun profundidad: atras oscuro, delante claro."""
        r = self.r
        if extra:
            return r.choice(extra)
        return r.choice([["g1", "g2", "g2", "g3"], ["g2", "g3", "g3", "g4", "g4"], ["g3", "g4", "g5", "g5", "g6"]][z])

    def add(self, z, x, y, body, sway=False):
        self.k += 1
        d = self.r.uniform(0, 1.2) + (2 - z) * .15
        cls = "bp" + (" sw" if sway else "")
        self.plants.append((z, self.k, '<g class="%s" style="transform-origin:%spx %spx;--d:%.2fs;--s:%.1fs">%s</g>' % (cls, r1(x), r1(y), d, self.r.uniform(7, 12), body)))

    def svg(self, meta="xMidYMax meet"):
        self.plants.sort(key=lambda t: (t[0], t[1]))
        return ('<svg xmlns="http://www.w3.org/2000/svg" class="botanical-art" viewBox="0 0 %d %d" preserveAspectRatio="%s" aria-hidden="true" focusable="false">%s</svg>'
                % (self.w, self.h, meta, "".join(p[2] for p in self.plants)))

def use(sym, x, y, ang, size, cls, flip=False):
    return '<use href="#%s" class="%s" transform="translate(%s %s) rotate(%s) scale(%s %s)"/>' % (
        sym, cls, r1(x), r1(y), r1(ang), r3(-size if flip else size), r3(size))

def stem(p0, p1, p2, p3, w, cls="bs"):
    return '<path class="%s" d="M%s %sC%s %s %s %s %s %s" stroke-width="%s"/>' % (cls, r1(p0[0]), r1(p0[1]), r1(p1[0]), r1(p1[1]), r1(p2[0]), r1(p2[1]), r1(p3[0]), r1(p3[1]), r1(w))

def curve(x, y, H, a0, bend, r):
    """Tallo desde (x,y) con angulo inicial a0 (grados desde arriba) y curvatura."""
    a = math.radians(a0)
    dx, dy = math.sin(a), -math.cos(a)
    nx, ny = -dy, dx
    p0 = (x, y)
    p1 = (x + dx * H * .35, y + dy * H * .35)
    p2 = (x + dx * H * .72 + nx * bend * H, y + dy * H * .72 + ny * bend * H)
    p3 = (x + dx * H * .98 + nx * bend * H * 1.7, y + dy * H * .98 + ny * bend * H * 1.7)
    return p0, p1, p2, p3

# ---------------------------------------------------------------- plantas
def cilantro(A, x, y, H, z):
    r = A.r; n = r.randint(6, 9); out = ""
    for i in range(n):
        a0 = -40 + 80 * i / (n - 1) + r.uniform(-6, 6)
        h = H * r.uniform(.6, 1) * (1 - .22 * abs(a0) / 40)
        c = curve(x + r.uniform(-4, 4), y, h, a0, r.uniform(-.1, .1), r)
        out += stem(*c, w=max(.7, H * .011))
        s = H * r.uniform(.2, .27)
        for t, k in ((.52, .6), (.76, .78)):
            if r.random() < .8:
                px, py, ang = bez(*c, t)
                out += use("cil%d" % r.randint(0, 3), px, py, ang + r.choice((-1, 1)) * r.uniform(38, 62), s * k, A.pick(z), r.random() < .5)
        px, py, ang = bez(*c, 1)
        out += use("cil%d" % r.randint(0, 3), px, py, ang + r.uniform(-10, 10), s, A.pick(z), r.random() < .5)
    return out

def parsley(A, x, y, H, z):
    r = A.r; n = r.randint(8, 12); out = ""
    for i in range(n):
        a0 = -48 + 96 * i / (n - 1) + r.uniform(-6, 6)
        h = H * r.uniform(.5, .95) * (1 - .3 * abs(a0) / 48)
        c = curve(x, y, h, a0, r.uniform(-.12, .12), r)
        out += stem(*c, w=max(.7, H * .012))
        s = H * r.uniform(.2, .27)
        px, py, ang = bez(*c, 1)
        out += use("par%d" % r.randint(0, 2), px, py, ang + r.uniform(-12, 12), s, A.pick(z), r.random() < .5)
        if r.random() < .7:
            px, py, ang = bez(*c, .7)
            out += use("par%d" % r.randint(0, 2), px, py, ang + r.choice((-1, 1)) * r.uniform(40, 60), s * .65, A.pick(z), r.random() < .5)
    return out

def recao(A, x, y, H, z):
    r = A.r; n = r.randint(9, 13); out = ""
    for i in range(n):
        phi = -78 + 156 * i / (n - 1) + r.uniform(-7, 7)
        L = H * r.uniform(.55, 1) * (1 - .28 * (abs(phi) / 78) ** 1.5)
        out += use("rec%d" % r.randint(0, 2), x + r.uniform(-3, 3), y, phi, L, A.pick(z, ["g2", "g3", "g3", "g4"]), r.random() < .5)
    return out

def thyme(A, x, y, H, z):
    r = A.r; n = r.randint(4, 6); out = ""
    for i in range(n):
        a0 = -62 + 124 * i / (n - 1) + r.uniform(-8, 8)
        h = H * r.uniform(.6, 1)
        c = curve(x, y, h, a0, r.uniform(-.18, .18), r)
        out += stem(*c, w=max(.6, H * .009), cls="bs bw")
        pairs = r.randint(11, 15)
        for j in range(pairs):
            t = .22 + .78 * j / (pairs - 1)
            px, py, ang = bez(*c, t)
            s = H * .075 * (1 - .4 * t) * r.uniform(.8, 1.2)
            col = A.pick(z, ["gy", "gy", "g3", "g4"])
            out += use("tom%d" % r.randint(0, 1), px, py, ang + r.uniform(40, 62), s, col)
            out += use("tom%d" % r.randint(0, 1), px, py, ang - r.uniform(40, 62), s, col)
        px, py, ang = bez(*c, 1)
        out += use("tom0", px, py, ang, H * .06, "gy")
    return out

def rosemary(A, x, y, H, z):
    r = A.r; n = r.randint(3, 4); out = ""
    for i in range(n):
        a0 = -24 + 48 * i / max(1, n - 1) + r.uniform(-6, 6)
        h = H * r.uniform(.75, 1)
        c = curve(x + r.uniform(-5, 5), y, h, a0, r.uniform(-.08, .08), r)
        out += stem(*c, w=max(.8, H * .011), cls="bs bw")
        pairs = r.randint(18, 24)
        for j in range(pairs):
            t = .18 + .82 * j / (pairs - 1)
            px, py, ang = bez(*c, t)
            s = H * (.085 + .03 * (1 - t)) * r.uniform(.8, 1.15)
            col = A.pick(z, ["gb", "gb", "g2", "gy"])
            sp = 62 - 30 * t
            out += use("rom%d" % r.randint(0, 1), px, py, ang + sp + r.uniform(-6, 6), s, col)
            out += use("rom%d" % r.randint(0, 1), px, py, ang - sp + r.uniform(-6, 6), s, col)
        px, py, ang = bez(*c, 1)
        out += use("rom0", px, py, ang, H * .08, "gb")
    return out

def oregano(A, x, y, H, z):
    r = A.r; n = r.randint(3, 5); out = ""
    for i in range(n):
        a0 = -26 + 52 * i / max(1, n - 1) + r.uniform(-6, 6)
        h = H * r.uniform(.7, 1)
        c = curve(x + r.uniform(-4, 4), y, h, a0, r.uniform(-.1, .1), r)
        out += stem(*c, w=max(.7, H * .01))
        pairs = r.randint(6, 8)
        for j in range(pairs):
            t = .2 + .74 * j / (pairs - 1)
            px, py, ang = bez(*c, t)
            s = H * (.19 - .09 * t) * r.uniform(.85, 1.15)
            out += use("ore%d" % r.randint(0, 2), px, py, ang + r.uniform(50, 72), s, A.pick(z))
            out += use("ore%d" % r.randint(0, 2), px, py, ang - r.uniform(50, 72), s, A.pick(z))
        px, py, ang = bez(*c, 1)
        out += use("ore1", px, py, ang, H * .1, A.pick(z))
        if r.random() < .7:
            for b in range(r.randint(2, 3)):
                out += use("blo%d" % (b % 2), px + r.uniform(-4, 4), py + r.uniform(-2, 5), 0, H * r.uniform(.11, .15), "fl" if r.random() < .7 else "fl2")
    return out

def basil(A, x, y, H, z):
    r = A.r; n = r.randint(2, 3); out = ""
    for i in range(n):
        a0 = -16 + 32 * i / max(1, n - 1) + r.uniform(-5, 5)
        h = H * r.uniform(.75, 1)
        c = curve(x + r.uniform(-4, 4), y, h, a0, r.uniform(-.06, .06), r)
        out += stem(*c, w=max(.9, H * .012))
        pairs = r.randint(4, 5)
        for j in range(pairs):
            t = .3 + .62 * j / (pairs - 1)
            px, py, ang = bez(*c, t)
            s = H * (.3 - .13 * t) * r.uniform(.85, 1.12)
            sp = r.uniform(52, 72) - 20 * t
            out += use("bas%d" % r.randint(0, 2), px, py, ang + sp, s, A.pick(z, ["g3", "g4", "g5", "g5"]))
            out += use("bas%d" % r.randint(0, 2), px, py, ang - sp, s * r.uniform(.88, 1.05), A.pick(z, ["g3", "g4", "g5", "g5"]))
        px, py, ang = bez(*c, 1)
        out += use("bas1", px, py, ang, H * .13, A.pick(z, ["g4", "g5"]))
    return out

def laurel(A, x, y, H, z):
    r = A.r; n = r.randint(2, 3); out = ""
    for i in range(n):
        a0 = -50 + 100 * i / max(1, n - 1) + r.uniform(-8, 8)
        h = H * r.uniform(.7, 1)
        c = curve(x, y, h, a0, r.uniform(.1, .22) * r.choice((-1, 1)), r)
        out += stem(*c, w=max(.8, H * .011), cls="bs bw")
        k = r.randint(7, 9); side = r.choice((-1, 1))
        for j in range(k):
            t = .2 + .78 * j / (k - 1)
            px, py, ang = bez(*c, t)
            s = H * (.34 - .12 * t) * r.uniform(.85, 1.1)
            out += use("lau%d" % r.randint(0, 2), px, py, ang + side * r.uniform(42, 60), s, A.pick(z, ["g2", "g3", "g3", "g4"]))
            side = -side
        px, py, ang = bez(*c, 1)
        out += use("lau1", px, py, ang, H * .25, A.pick(z, ["g3", "g4"]))
    return out

def mint(A, x, y, H, z):
    r = A.r; n = r.randint(3, 4); out = ""
    for i in range(n):
        a0 = -30 + 60 * i / max(1, n - 1) + r.uniform(-6, 6)
        h = H * r.uniform(.7, 1)
        c = curve(x + r.uniform(-4, 4), y, h, a0, r.uniform(-.1, .1), r)
        out += stem(*c, w=max(.7, H * .01))
        pairs = r.randint(4, 6)
        for j in range(pairs):
            t = .3 + .65 * j / (pairs - 1)
            px, py, ang = bez(*c, t)
            s = H * (.22 - .09 * t) * r.uniform(.85, 1.12)
            out += use("men%d" % r.randint(0, 2), px, py, ang + r.uniform(46, 66), s, A.pick(z, ["g4", "g5", "g5", "g6"]))
            out += use("men%d" % r.randint(0, 2), px, py, ang - r.uniform(46, 66), s, A.pick(z, ["g4", "g5", "g5", "g6"]))
        px, py, ang = bez(*c, 1)
        out += use("men1", px, py, ang, H * .11, "g5")
    return out

SPECIES = {"cilantro": cilantro, "parsley": parsley, "recao": recao, "thyme": thyme, "rosemary": rosemary,
           "oregano": oregano, "basil": basil, "laurel": laurel, "mint": mint}
TALL = {"cilantro": 1.0, "parsley": .75, "recao": .9, "thyme": .6, "rosemary": 1.15, "oregano": .85,
        "basil": .8, "laurel": 1.0, "mint": .8}

# ---------------------------------------------------------------- composiciones
def clump(seed, w, h, mix, count, hmax, hmin=None, lean=0.0, sides=1.0, ground=6):
    """Macizo: plantas distribuidas a lo ancho, las altas atras y las bajas delante."""
    A = Art(seed, w, h)
    r = A.r
    hmin = hmin or hmax * .4
    plan = []
    for i in range(count):
        sp = mix[i % len(mix)] if i < len(mix) else r.choice(mix)
        plan.append(sp)
    r.shuffle(plan)
    for i, sp in enumerate(plan):
        u = (i + .5) / count + r.uniform(-.3, .3) / count
        x = w * (.06 + .88 * min(max(u, 0), 1))
        edge = 1 - abs(u - .5) * 2 * (1 - sides)               # sides<1 -> mas altas al centro
        z = r.choices([0, 1, 2], weights=[3, 4, 3])[0]
        hh = (hmin + (hmax - hmin) * r.random()) * (1.0 - (2 - z) * 0.0) * TALL[sp] * (.55 + .45 * edge)
        hh *= [1.0, .82, .62][z]
        y = h + ground + (2 - z) * -2
        body = SPECIES[sp](A, x, y, hh, z)
        A.add(z, x, y, body, sway=(hh > hmax * .5))
    return A

def hedge(seed, w, h, mix, count, hmax, hmin=None):
    A = clump(seed, w, h, mix, count, hmax, hmin, sides=1.0)
    return A

ART = {}
ART["bush-a"] = clump(11, 640, 420, ["recao", "cilantro", "basil", "oregano", "thyme", "parsley", "rosemary"], 14, 380, 190).svg()
ART["bush-b"] = clump(29, 640, 420, ["parsley", "mint", "rosemary", "laurel", "cilantro", "thyme", "recao"], 14, 370, 180).svg()
ART["bush-c"] = clump(41, 460, 320, ["cilantro", "oregano", "mint", "thyme", "recao", "basil"], 10, 290, 150).svg()
ART["bush-xl"] = clump(131, 900, 620, ["recao", "cilantro", "basil", "oregano", "parsley", "mint", "laurel", "thyme", "rosemary"], 22, 580, 250).svg()
ART["tall-a"] = clump(53, 300, 600, ["rosemary", "recao", "laurel", "cilantro", "oregano"], 8, 560, 300, sides=.6).svg()
ART["tall-b"] = clump(67, 300, 600, ["laurel", "recao", "rosemary", "parsley", "basil"], 8, 540, 280, sides=.6).svg()
ART["hedge-a"] = hedge(71, 1800, 130, ["thyme", "oregano", "parsley", "cilantro", "mint", "recao", "rosemary", "basil"], 36, 122, 50).svg()
ART["hedge-b"] = hedge(83, 1800, 112, ["oregano", "cilantro", "thyme", "parsley", "mint", "recao", "laurel"], 36, 104, 44).svg()
ART["nav-a"] = clump(97, 300, 90, ["thyme", "oregano", "rosemary", "cilantro"], 6, 80, 40, ground=3).svg()
ART["nav-b"] = clump(101, 300, 90, ["thyme", "parsley", "oregano", "mint"], 6, 80, 40, ground=3).svg()

# ---------------------------------------------------------------- salida
STYLE = (":root,svg{--bt-g1:#2f4a2b;--bt-g2:#3f5e33;--bt-g3:#54733a;--bt-g4:#6e8a47;--bt-g5:#8fa65b;--bt-g6:#b2c27e;"
         "--bt-gy:#7d8a62;--bt-gb:#3d5a4a;--bt-fl:#b78fb8;--bt-fl2:#efe3b8;--bt-st:#4a5a30}"
         ".g1{--lf:var(--bt-g1)}.g2{--lf:var(--bt-g2)}.g3{--lf:var(--bt-g3)}.g4{--lf:var(--bt-g4)}.g5{--lf:var(--bt-g5)}.g6{--lf:var(--bt-g6)}"
         ".gy{--lf:var(--bt-gy)}.gb{--lf:var(--bt-gb)}.fl{--lf:var(--bt-fl)}.fl2{--lf:var(--bt-fl2)}"
         ".bs{fill:none;stroke:var(--bt-st);stroke-linecap:round}.bw{stroke:var(--bt-gy)}")

os.makedirs("assets/botanical", exist_ok=True)

def write_standalone(name, svg):
    inner = svg.replace('class="botanical-art" ', "").replace("</svg>", "")
    head, body = inner.split(">", 1)
    standalone = head + "><style>" + STYLE + "</style><defs>" + "".join(SYMS) + "</defs>" + body + "</svg>"
    with open("assets/botanical/%s.svg" % name, "w", encoding="utf-8") as fh:
        fh.write(standalone)

for name, svg in ART.items():
    write_standalone(name, svg)

# Guarniciones: ramitas pequenas que se apoyan sobre los platos (solo SVG sueltos)
write_standalone("garnish-a", clump(201, 300, 300, ["cilantro", "oregano", "thyme", "parsley"], 5, 250, 150, ground=14).svg())
write_standalone("garnish-b", clump(211, 300, 300, ["basil", "rosemary", "cilantro", "mint"], 5, 250, 150, ground=14).svg())
write_standalone("garnish-s", clump(221, 140, 140, ["oregano", "thyme", "cilantro"], 3, 120, 80, ground=8).svg())

os.makedirs("components/shared", exist_ok=True)
with open("components/shared/botanical-art.js", "w", encoding="utf-8") as fh:
    fh.write("/* Generado por gen_herbs.py. Hierbas ilustradas (sprite de hojas + piezas SVG inline). */\n")
    fh.write("window.BOTANICAL_SPRITE = " + json.dumps(SPRITE, ensure_ascii=False) + ";\n")
    fh.write("window.BOTANICAL_ART = " + json.dumps(ART, ensure_ascii=False, separators=(",", ":")) + ";\n")
print({k: len(v) // 1024 for k, v in ART.items()}, "KB; sprite", len(SPRITE) // 1024, "KB")
