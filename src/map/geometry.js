// Map geometry from the UI/UX design (unchanged) + how the backend zones sit on it.
// The backend works in meters on a flat 800 x 600 plan; the design draws a radial Expo site.
// Every backend zone gets one design district ("petal"); points are moved with their zone, so a
// staff member walking between two zones glides between the two districts.

export const CX = 500, CY = 330;
export const f1 = n => Math.round(n * 10) / 10;
export const pol = (a, r) => [f1(CX + r * Math.cos(a * Math.PI / 180)), f1(CY + r * Math.sin(a * Math.PI / 180))];

export const ZGEO = {
  B: { a0: -133, a1: -47, r0: 116, r1: 258, b: 44 }, C: { a0: -43, a1: 43, r0: 116, r1: 258, b: 44 },
  E: { a0: 47, a1: 133, r0: 116, r1: 258, b: 44 }, D: { a0: 137, a1: 223, r0: 116, r1: 258, b: 44 },
  F: { a0: -175, a1: -97, r0: 352, r1: 470, b: 75 }, I: { a0: -83, a1: -5, r0: 352, r1: 470, b: 75 },
  G: { a0: 5, a1: 83, r0: 352, r1: 470, b: 75 }, H: { a0: 97, a1: 175, r0: 352, r1: 470, b: 75 },
};
export const ZK = ['A', 'B', 'C', 'D', 'E', 'F', 'I', 'G', 'H'];
export const ZLBL = { A: [CX, CY], B: pol(-90, 250), C: pol(-24, 252), D: pol(180, 250), E: pol(90, 252), F: pol(-136, 455), I: pol(-44, 455), G: pol(44, 455), H: pol(118, 455) };
export const rOut = (g, a) => g.r1 + g.b * Math.sin(Math.PI * (a - g.a0) / (g.a1 - g.a0));
export const ZHEX = { ok: 0x40B89C, med: 0xE0BE58, high: 0xEF9445, crit: 0xF2655E };
export const ZCOL = { A: 0xCDB89A, B: 0x4CB9D2, C: 0xB98AE0, D: 0x7C98CC, E: 0xE08FB5, F: 0x8BC9F2, I: 0xA6B0C2, G: 0xD88AD0, H: 0x6FD6D0 };
export const LAKE = { a: 136, r: 465, rad: 72 };
export const ZCSS = z => '#' + ZCOL[z].toString(16).padStart(6, '0');
export const LANDMARKS = [
  { p: [-470, -14], h: 18, n: ['محطة المترو', 'Metro station'] },
  { p: [-150, -282], h: 22, n: ['الحلقة الكبرى', 'Grand Ring'] },
];
// the three backend gates on the Grand Ring (west / east / south)
export const GATES = [{ id: 'G1', a: 180 }, { id: 'G2', a: 0 }, { id: 'G3', a: 90 }];

export const rank = { crit: 0, high: 1, med: 2, low: 3, ok: 3 };
export const sevColor = s => ({ crit: 'var(--crit)', high: 'var(--high)', med: 'var(--med)', low: 'var(--ok)', ok: 'var(--ok)' })[s];

// backend zone code -> design district
export const ZONE_MAP = { MP: 'A', PB: 'B', PC: 'C', G1: 'D', G3: 'E', PA: 'F', PD: 'I', TH: 'G', SV: 'H' };
// G2 has no district: it sits on the east gate of the ring
const EXTRA_ANCHOR = { G2: pol(0, 315) };

export const ZONE_AR = {
  MP: 'الساحة الرئيسية', PA: 'الجناح A', PB: 'الجناح B', PC: 'الجناح C', PD: 'الجناح D',
  TH: 'مركز النقل', SV: 'منطقة الخدمات والمطاعم', G1: 'البوابة 1 · الغربية', G2: 'البوابة 2 · الشرقية', G3: 'البوابة 3 · الجنوبية',
};

export const anchorOf = code => EXTRA_ANCHOR[code] || (ZONE_MAP[code] && ZLBL[ZONE_MAP[code]]) || null;

const K = 1.0; // meters -> design units inside a district

// backend (x, y) in meters -> design (x, y). Inverse-distance blend of every zone anchor:
// at a zone center the point lands on its district label, in between it moves smoothly
export function makeTransform(zones) {
  const anchors = (zones || [])
    .map(z => ({ cx: z.centerX, cy: z.centerY, a: anchorOf(z.code) }))
    .filter(p => p.a && p.cx != null && p.cy != null);
  return (bx, by) => {
    if (bx == null || by == null || !anchors.length) return null;
    let sw = 0, sx = 0, sy = 0;
    for (const p of anchors) {
      const d2 = (bx - p.cx) ** 2 + (by - p.cy) ** 2;
      if (d2 < 1e-6) return [p.a[0], p.a[1]];
      const w = 1 / (d2 * d2);
      sw += w; sx += w * (p.a[0] + K * (bx - p.cx)); sy += w * (p.a[1] + K * (by - p.cy));
    }
    return [f1(sx / sw), f1(sy / sw)];
  };
}
