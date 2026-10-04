// Türk Bayrağı Kanunu (2994) ölçüleri, G = bayrak yüksekliği.
// Uçkur payı (L) piksel ızgarada yok sayılır.
export const COLS = 54;
export const ROWS = 36;
export const HISTORY_COUNT = 21;
export const FINAL_COUNT = 103;
export const POOL_COUNT = COLS * ROWS - HISTORY_COUNT - FINAL_COUNT; // 1.820

const G = ROWS;
const OUTER = { x: 0.5 * G, y: G / 2, r: 0.25 * G };
const INNER = { x: (0.5 + 1 / 16) * G, y: G / 2, r: 0.2 * G };
const STAR_R = 0.125 * G;
const STAR = { x: INNER.x - INNER.r + G / 3 + STAR_R, y: G / 2 };

const starPoints = (() => {
  const pts = [];
  const inner = STAR_R * Math.cos((2 * Math.PI) / 5) / Math.cos(Math.PI / 5);
  for (let k = 0; k < 10; k++) {
    const a = Math.PI + (k * Math.PI) / 5;
    const r = k % 2 === 0 ? STAR_R : inner;
    pts.push([STAR.x + r * Math.cos(a), STAR.y + r * Math.sin(a)]);
  }
  return pts;
})();

function inCircle(px, py, c) {
  return (px - c.x) ** 2 + (py - c.y) ** 2 <= c.r ** 2;
}

function inStar(px, py) {
  let inside = false;
  for (let i = 0, j = starPoints.length - 1; i < starPoints.length; j = i++) {
    const [xi, yi] = starPoints[i];
    const [xj, yj] = starPoints[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inCrescent(px, py) {
  return inCircle(px, py, OUTER) && !inCircle(px, py, INNER);
}

function coverage(cx, cy, test) {
  const n = 8;
  let hits = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (test(cx + (i + 0.5) / n, cy + (j + 0.5) / n)) hits++;
    }
  }
  return hits / (n * n);
}

// Yıldızın ince uçları yarım hücreyi doldurmaz; daha düşük eşik beş ucu da görünür kılar.
function isWhiteCell(cx, cy) {
  return coverage(cx, cy, inCrescent) >= 0.5 || coverage(cx, cy, inStar) >= 0.35;
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sabit tohumla deterministik yerleşim: aynı veri her tarayıcıda aynı bayrağı üretir.
export function buildLayout(seed = 1923) {
  const cells = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      cells.push({ index: y * COLS + x, x, y, white: isWhiteCell(x, y) });
    }
  }

  const final = cells
    .filter((c) => c.white)
    .sort((a, b) => b.x - a.x || Math.abs(a.y - G / 2) - Math.abs(b.y - G / 2))
    .slice(0, FINAL_COUNT);
  const finalSet = new Set(final.map((c) => c.index));

  const rest = cells.filter((c) => !finalSet.has(c.index));
  const rand = mulberry32(seed);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return {
    cells,
    history: rest.slice(0, HISTORY_COUNT),
    pool: rest.slice(HISTORY_COUNT),
    final,
  };
}
