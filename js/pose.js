// RUNA — matemática da realidade aumentada (sem dependências).
// Cada casa do tabuleiro impresso tem um marcador ArUco 4x4 com id = linha * 8 + coluna.
// Com os cantos dos marcadores vistos pela câmera, calcula a homografia
// tabuleiro -> imagem e, dela, a posição da câmera em relação ao tabuleiro.

export const COLS = 8;
export const LINHAS = 6;
export const MARCA = 0.6; // lado do quadrado preto do marcador, em casas

// Cantos do marcador no tabuleiro (unidade = 1 casa), na ordem do js-aruco:
// superior-esquerdo, superior-direito, inferior-direito, inferior-esquerdo.
export function cantosNoTabuleiro(id) {
  const x = id % COLS, y = Math.floor(id / COLS);
  const cx = x + 0.5, cy = y + 0.5, h = MARCA / 2;
  return [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]];
}

function normalizador(pts) {
  let mx = 0, my = 0;
  for (const p of pts) { mx += p[0]; my += p[1]; }
  mx /= pts.length; my /= pts.length;
  let d = 0;
  for (const p of pts) d += Math.hypot(p[0] - mx, p[1] - my);
  d = d / pts.length || 1;
  const s = Math.SQRT2 / d;
  return { s, mx, my, T: [s, 0, -s * mx, 0, s, -s * my, 0, 0, 1] };
}

function resolver(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    if (Math.abs(A[i][i]) < 1e-12) return null;
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

function mul3(a, b) {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
}
function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-15) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
    C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

// Homografia por mínimos quadrados (DLT normalizada). src = tabuleiro, dst = imagem.
export function homografia(src, dst) {
  if (src.length < 4) return null;
  const ns = normalizador(src), nd = normalizador(dst);
  const ATA = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const ATb = new Array(8).fill(0);
  for (let k = 0; k < src.length; k++) {
    const x = (src[k][0] - ns.mx) * ns.s, y = (src[k][1] - ns.my) * ns.s;
    const u = (dst[k][0] - nd.mx) * nd.s, v = (dst[k][1] - nd.my) * nd.s;
    const linhas = [[x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]];
    for (const L of linhas) {
      for (let i = 0; i < 8; i++) {
        ATb[i] += L[i] * L[8];
        for (let j = 0; j < 8; j++) ATA[i][j] += L[i] * L[j];
      }
    }
  }
  const h = resolver(ATA, ATb);
  if (!h) return null;
  const Hn = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  const H = mul3(mul3(inv3(nd.T), Hn), ns.T);
  const s = H[8] || 1;
  return H.map((v) => v / s);
}

export function projetar(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

// Distância focal a partir da homografia (centro óptico no meio da imagem).
// Só confiável quando o tabuleiro está bem inclinado em relação à câmera.
export function focalDaHomografia(H, cx, cy) {
  const h1 = [H[0] - cx * H[6], H[3] - cy * H[6], H[6]];
  const h2 = [H[1] - cx * H[7], H[4] - cy * H[7], H[7]];
  const den = h1[2] * h2[2];
  if (Math.abs(den) < 1e-9) return null;
  const f2 = -(h1[0] * h2[0] + h1[1] * h2[1]) / den;
  if (!(f2 > 0)) return null;
  // segunda equação (|r1| = |r2|) serve de conferência
  const g = (h1[2] * h1[2] - h2[2] * h2[2]);
  if (Math.abs(g) > 1e-9) {
    const f2b = -((h1[0] * h1[0] + h1[1] * h1[1]) - (h2[0] * h2[0] + h2[1] * h2[1])) / g;
    if (f2b > 0 && Math.abs(Math.sqrt(f2b) - Math.sqrt(f2)) / Math.sqrt(f2) > 0.25) return null;
  }
  return Math.sqrt(f2);
}

// Pose da câmera: devolve R (3x3, linhas) e t do tabuleiro no sistema da câmera (OpenCV).
export function pose(H, f, cx, cy) {
  const Ki = [1 / f, 0, -cx / f, 0, 1 / f, -cy / f, 0, 0, 1];
  const M = mul3(Ki, H);
  let m1 = [M[0], M[3], M[6]], m2 = [M[1], M[4], M[7]], m3 = [M[2], M[5], M[8]];
  const l = 2 / (Math.hypot(...m1) + Math.hypot(...m2));
  let r1 = m1.map((v) => v * l), r2 = m2.map((v) => v * l), t = m3.map((v) => v * l);
  if (t[2] < 0) { r1 = r1.map((v) => -v); r2 = r2.map((v) => -v); t = t.map((v) => -v); }
  // ortonormaliza r1, r2 de forma simétrica
  const c = [r1[0] + r2[0], r1[1] + r2[1], r1[2] + r2[2]];
  const p = cruz(r1, r2);
  const dd = cruz(c, p);
  const nc = norm(c), nd = norm(dd);
  const a = [(nc[0] + nd[0]) / Math.SQRT2, (nc[1] + nd[1]) / Math.SQRT2, (nc[2] + nd[2]) / Math.SQRT2];
  const b = [(nc[0] - nd[0]) / Math.SQRT2, (nc[1] - nd[1]) / Math.SQRT2, (nc[2] - nd[2]) / Math.SQRT2];
  const r3 = cruz(a, b);
  return { R: [a[0], b[0], r3[0], a[1], b[1], r3[1], a[2], b[2], r3[2]], t };
}
function cruz(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(v) { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); }

// Erro médio de reprojeção (px) para descartar leituras ruins.
export function erroReproj(H, src, dst) {
  let e = 0;
  for (let i = 0; i < src.length; i++) {
    const p = projetar(H, src[i][0], src[i][1]);
    e += Math.hypot(p[0] - dst[i][0], p[1] - dst[i][1]);
  }
  return e / src.length;
}

// Monta a homografia a partir dos marcadores detectados; ignora ids fora do tabuleiro.
// Faz uma rodada de limpeza: tira marcadores cuja reprojeção destoa muito.
export function homografiaDosMarcadores(marcadores) {
  let usados = marcadores.filter((m) => m.id >= 0 && m.id < COLS * LINHAS);
  if (!usados.length) return null;
  for (let volta = 0; volta < 2; volta++) {
    const src = [], dst = [];
    for (const m of usados) {
      const c = cantosNoTabuleiro(m.id);
      for (let i = 0; i < 4; i++) { src.push(c[i]); dst.push([m.corners[i].x, m.corners[i].y]); }
    }
    const H = homografia(src, dst);
    if (!H) return null;
    if (usados.length < 3) return { H, n: usados.length, erro: erroReproj(H, src, dst) };
    const erros = usados.map((m) => {
      const c = cantosNoTabuleiro(m.id);
      return erroReproj(H, c, m.corners.map((p) => [p.x, p.y]));
    });
    const lado = Math.hypot(dst[1][0] - dst[0][0], dst[1][1] - dst[0][1]) || 10;
    const bons = usados.filter((m, i) => erros[i] < Math.max(3, lado * 0.25));
    if (bons.length === usados.length || bons.length < 2) return { H, n: usados.length, erro: erroReproj(H, src, dst) };
    usados = bons;
  }
  return null;
}
