// Shared constants and interpolation helpers for the carousel

export const ACTIVE_WIDTH  = 450;
export const ACTIVE_HEIGHT = 337.5;
export const SLOT_GAP      = 20;
export const VISIBLE_SLOTS = 5; // slots rendered above/below active

// Figma-exact sizes per slot distance from center (index 0 = slot ±1)
export const SLOT_WIDTHS   = [100, 80, 60, 40, 28];
export const SLOT_HEIGHTS  = [75.333, 60.267, 45.2, 30.4, 21];
export const SLOT_BLURS    = [1.5, 3, 4, 6, 8];
export const SLOT_OPACITY  = [0.7, 0.5, 0.35, 0.2, 0.1];

// Full lookup tables indexed by |offset| (0 = active)
export const W_AT  = [ACTIVE_WIDTH,  ...SLOT_WIDTHS];
export const H_AT  = [ACTIVE_HEIGHT, ...SLOT_HEIGHTS];
export const BL_AT = [0,             ...SLOT_BLURS];
export const OP_AT = [1,             ...SLOT_OPACITY];

// Pre-compute Y center of each slot relative to active center
function buildYTable(): number[] {
  const table = [0];
  let prevH = ACTIVE_HEIGHT;
  for (let i = 0; i < SLOT_HEIGHTS.length; i++) {
    const h = SLOT_HEIGHTS[i];
    table.push(table[i] + prevH / 2 + SLOT_GAP + h / 2);
    prevH = h;
  }
  return table;
}
export const Y_AT = buildYTable();
// Y_AT[0]=0, Y_AT[1]≈226.4, Y_AT[2]≈314.2, Y_AT[3]≈387, Y_AT[4]≈444.7 ...

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function interpolateAt(table: number[], absOffset: number): number {
  const max = table.length - 1;
  const clamped = Math.min(absOffset, max);
  const lo = Math.floor(clamped);
  const hi = Math.min(lo + 1, max);
  return lerp(table[lo], table[hi], clamped - lo);
}

// Returns { w, h, blur, opacity, yCenter, x, yTop } for any fractional offset
export function slotStyleAt(virtualOffset: number) {
  const abs = Math.abs(virtualOffset);
  const dir = virtualOffset >= 0 ? 1 : -1;
  const w       = interpolateAt(W_AT,  abs);
  const h       = interpolateAt(H_AT,  abs);
  const blur    = interpolateAt(BL_AT, abs);
  const opacity = abs > W_AT.length - 0.5 ? 0 : interpolateAt(OP_AT, abs);
  const yCenter = interpolateAt(Y_AT, abs) * dir;
  const x       = (ACTIVE_WIDTH - w) / 2;   // center horizontally in column
  const yTop    = yCenter - h / 2;           // top edge, relative to container center
  return { w, h, blur, opacity, yCenter, x, yTop };
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
