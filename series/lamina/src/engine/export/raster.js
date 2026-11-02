// Pixel-level analysis of the exporter's ID buffers (pure JS, no DOM/GPU).
//
// The ID pass says, per pixel, which mesh is seen, how far away it is, its
// unlit albedo and its tone band. Before tracing, this module:
//   * folds slivers too small to trace into their neighbours, so no boundary
//     is ever delegated to a region whose outline is then dropped;
//   * reads each part's colour pattern from its albedo (declared
//     `part.swatches`, or OKLab k-means) — rings, saddles, blotches become
//     flat colour separations like a chromolithograph's stones; smooth
//     gradients (baked occlusion, shading) are not patterns and merge;
//   * finds the contours a part draws over itself (a coil over a coil, one
//     corolla in front of another): depth jumps and mesh changes inside a
//     region, chained into open polylines;
//   * builds a soft contact shadow by projecting the figure onto the paper
//     along the key light, without the stray patches raised parts cast
//     beside it.
import * as THREE from 'three/webgpu';
import { rgbToOklab, oklabToHex, hexToOklab } from './svg.js';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
/** N8 as flat offsets (same order: walks take the first free neighbour). */
const DX8 = Int8Array.from(N8, (d) => d[0]);
const DY8 = Int8Array.from(N8, (d) => d[1]);

// sRGB bytes → OKLab, memoised (direct-mapped, 65 536 slots): a part's albedo
// repeats a few hundred colours over hundreds of thousands of pixels, and
// each conversion costs three cube roots. Values are the float32 ones
// rgbToOklab writes into a Float32Array, so results are unchanged.
const OK_SLOTS = 1 << 16;
const okKey = new Int32Array(OK_SLOTS).fill(-1);
const okVal = new Float32Array(OK_SLOTS * 3);
const okTmp = new Float32Array(3);
/** OKLab of an sRGB byte triple into out[o..o+2] (float32 precision). */
function oklab32(r, g, b, out, o) {
  const key = (r << 16) | (g << 8) | b;
  const slot = Math.imul(key, 0x9e3779b1) >>> 16;
  const v = slot * 3;
  if (okKey[slot] !== key) {
    rgbToOklab(r, g, b, okTmp);
    okKey[slot] = key;
    okVal[v] = okTmp[0];
    okVal[v + 1] = okTmp[1];
    okVal[v + 2] = okTmp[2];
  }
  out[o] = okVal[v];
  out[o + 1] = okVal[v + 1];
  out[o + 2] = okVal[v + 2];
}

// ---------------------------------------------------------------- slivers

/**
 * Fold 4-connected components smaller than `minSize` pixels (any label,
 * background pinholes included) into their most common neighbouring label.
 * Pixels are filled from the outside in, each copying an adjacent pixel of
 * the winning label through `copy(dst, src)` (which must set label[dst]).
 * Background components that touch the image border are left alone.
 * @param {Uint16Array} label
 * @param {number} W
 * @param {number} H
 * @param {number} minSize
 * @param {(dst: number, src: number) => void} copy
 * @returns {number} pixels changed
 */
export function despeckle(label, W, H, minSize, copy) {
  const N = W * H;
  const seen = new Uint8Array(N);
  // breadth-first queue over every pixel of the image (typed, reused per
  // component; neighbours in N4 order: +x, −x, +y, −y)
  const queue = new Int32Array(N);
  const counts = new Map();
  let changed = 0;
  for (let s = 0; s < N; s++) {
    if (seen[s]) continue;
    const L = label[s];
    let len = 0;
    queue[len++] = s;
    seen[s] = 1;
    let border = false;
    let h = 0;
    for (; h < len; h++) {
      const i = queue[h];
      const x = i % W, y = (i / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true;
      if (x + 1 < W && !seen[i + 1] && label[i + 1] === L) { seen[i + 1] = 1; queue[len++] = i + 1; }
      if (x > 0 && !seen[i - 1] && label[i - 1] === L) { seen[i - 1] = 1; queue[len++] = i - 1; }
      if (y + 1 < H && !seen[i + W] && label[i + W] === L) { seen[i + W] = 1; queue[len++] = i + W; }
      if (y > 0 && !seen[i - W] && label[i - W] === L) { seen[i - W] = 1; queue[len++] = i - W; }
      if (len >= minSize) break;
    }
    if (len >= minSize) {
      // big component: finish marking it so it is not revisited piecemeal
      // (only which pixels it covers matters, so a row-by-row fill does it)
      markComponent(queue, len, seen, label, W, H, L);
      continue;
    }
    if (L === 0 && border) continue;
    const comp = Array.from(queue.subarray(0, len));
    // the winning neighbour label
    counts.clear();
    const inComp = new Set(comp);
    for (const i of comp) {
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of N4) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (!inComp.has(j)) counts.set(label[j], (counts.get(label[j]) ?? 0) + 1);
      }
    }
    let win = -1, best = 0;
    for (const [l, c] of counts) if (c > best) [win, best] = [l, c];
    if (win < 0 || win === L) continue;
    // fill from the outside in
    const done = new Set();
    let frontier = [];
    for (const i of comp) {
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of N4) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (!inComp.has(j) && label[j] === win) {
          copy(i, j);
          done.add(i);
          frontier.push(i);
          break;
        }
      }
    }
    while (frontier.length && done.size < comp.length) {
      const next = [];
      for (const i of frontier) {
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of N4) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (inComp.has(j) && !done.has(j)) {
            copy(j, i);
            done.add(j);
            next.push(j);
          }
        }
      }
      frontier = next;
    }
    changed += done.size;
  }
  return changed;
}

/**
 * Mark (seen = 1) every pixel of label L 4-connected to the first `len`
 * entries of `stack` (already marked), with a scanline fill: spans are
 * walked along rows, so memory is read in order instead of in a breadth-first
 * wavefront that jumps a whole row per step. `stack` is reused as the work
 * list (each pixel is pushed at most once, so W·H entries suffice).
 */
function markComponent(stack, len, seen, label, W, H, L) {
  let sp = len;
  while (sp > 0) {
    const i = stack[--sp];
    const y = (i / W) | 0;
    const row = y * W;
    let a = i, b = i;
    while (a > row && !seen[a - 1] && label[a - 1] === L) seen[--a] = 1;
    while (b < row + W - 1 && !seen[b + 1] && label[b + 1] === L) seen[++b] = 1;
    // one seed per run of the rows above and below (its span covers the run)
    for (let side = 0; side < 2; side++) {
      if (side === 0 ? y === 0 : y + 1 >= H) continue;
      const off = side === 0 ? -W : W;
      for (let k = a + off, end = b + off; k <= end; k++) {
        if (seen[k] || label[k] !== L) continue;
        seen[k] = 1;
        stack[sp++] = k;
        while (k + 1 <= end && !seen[k + 1] && label[k + 1] === L) k++;
      }
    }
  }
}

/** Pixel indices grouped by region: { start, list } with list[start[r] .. start[r + 1]). */
export function pixelsByRegion(region, count) {
  const start = new Int32Array(count + 2);
  for (let i = 0; i < region.length; i++) start[region[i] + 1]++;
  for (let r = 1; r <= count + 1; r++) start[r] += start[r - 1];
  const fill = start.slice();
  const list = new Int32Array(region.length);
  for (let i = 0; i < region.length; i++) list[fill[region[i]]++] = i;
  return { start, list };
}

// ---------------------------------------------------------------- patterns

/** Colours closer than this (OKLab ΔE) are one colour: shading, mottling, scale seams. */
const MERGE_DE = 0.095;
/** A colour must cover this share of a part to be part of its pattern. */
const MIN_SHARE = 0.015;
/** Most colours read automatically from one part. */
const AUTO_K = 5;
/** Parts smaller than this (px at detail 1) keep one flat colour. */
const MIN_PATTERN_PX = 500;
/** Shadow-of-the-same-pigment test (see shadePairs): chroma off the scaled line, and the deepest ratio. */
const SHADE_RESIDUAL = 0.001;
const SHADE_MIN = 0.55;

const dist2 = (c, k, x, y, z) => (c[k * 3] - x) ** 2 + (c[k * 3 + 1] - y) ** 2 + (c[k * 3 + 2] - z) ** 2;

/**
 * Read the colour pattern of region `r` from the albedo and write each of
 * its pixels' swatch index into `swatch` (0 = the part's base colour).
 *
 * Small features are speckle to this reader (a 3×3 mode filter, islands
 * under 18 px folded away, parts under MIN_PATTERN_PX left flat), which is
 * right for scales and wrong for an eye: a snake's eye at book zoom is a few
 * hundred pixels with a slit pupil and a two-pixel catchlight. Two optional
 * part hooks say so: `part.minPatternPx` (px at detail 1) lowers the size
 * below which the part stays flat, and `part.keepSmall` keeps every island
 * of its colours (no mode filter, no folding); a single declared colour may
 * ask the same for itself (`swatches[i].keepSmall`).
 * @param {object} o
 * @param {Uint8Array} o.albedo   RGB per pixel (sRGB)
 * @param {Uint8Array} o.shaded   1 where the albedo is valid
 * @param {Uint16Array} o.region
 * @param {Uint8Array} o.swatch   out
 * @param {Int32Array} o.pixels   this region's pixel indices
 * @param {number} o.W
 * @param {number} o.H
 * @param {number} o.r            region index
 * @param {{ color: string, name: string, part?: object, swatches?: Array<{ color: string, name?: string, keepSmall?: boolean }> }} o.reg
 * @param {number} o.ss           supersampling (1–2)
 * @returns {Array<{ color: string, name: string, share: number, declared: boolean, kind: string|null }>|null}
 *          swatches (index = swatch id), or null: one flat colour. `name` is English;
 *          `kind` ('dark' | 'pale' | 'coloured' | 'plain') marks a name made up
 *          from the part's (see autoName), so it can be built again in another language
 */
export function readPattern({ albedo, shaded, region, swatch, pixels, W, H, r, reg, ss }) {
  const n = pixels.length;
  for (let h = 0; h < n; h++) swatch[pixels[h]] = 0;
  // `part.swatches`: the colours the subject paints the part with (false: keep it flat)
  if (reg.swatches === false) return null;
  const declared = (Array.isArray(reg.swatches) ? reg.swatches : []).filter((s) => s?.color).slice(0, 8);
  const minPx = reg.part?.minPatternPx > 0 ? reg.part.minPatternPx : MIN_PATTERN_PX;
  if (n < minPx * ss * ss) return null;
  const inRegion = (i) => region[i] === r && shaded[i];

  // interior samples (the 1-px fringe mixes with the paper and the neighbours),
  // as positions in `pixels`
  const interior = new Int32Array(n);
  let ni = 0;
  for (let h = 0; h < n; h++) {
    const i = pixels[h];
    if (!shaded[i]) continue;
    const x = i % W, y = (i / W) | 0;
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    if (region[i - 1] !== r || region[i + 1] !== r || region[i - W] !== r || region[i + W] !== r) continue;
    interior[ni++] = h;
  }
  if (ni < n * 0.2) return null;

  // every pixel's OKLab colour, once: the colour assignment below runs up to
  // three times over the whole part
  const labs = new Float32Array(n * 3);
  for (let h = 0; h < n; h++) {
    const i = pixels[h];
    if (shaded[i]) oklab32(albedo[i * 3], albedo[i * 3 + 1], albedo[i * 3 + 2], labs, h * 3);
  }
  const stride = Math.max(1, Math.floor(ni / 24000));
  const m = Math.ceil(ni / stride);
  const S = new Float32Array(m * 3);
  for (let q = 0, k = 0; q < ni; q += stride, k++) {
    const h = interior[q];
    S[k * 3] = labs[h * 3]; S[k * 3 + 1] = labs[h * 3 + 1]; S[k * 3 + 2] = labs[h * 3 + 2];
  }

  let C, K, names = null;
  if (declared.length >= 2) {
    // the subject named its colours: snap to them
    K = declared.length;
    C = new Float32Array(K * 3);
    declared.forEach((s, k) => C.set(hexToOklab(s.color), k * 3));
    names = declared.map((s) => s.name ?? null);
  } else {
    ({ C, K } = kmeans(S, m, AUTO_K));
    if (K < 2) return null;
  }

  // assign every region pixel (fringe included) to its nearest colour
  const nearest = (x, y, z) => {
    let best = 0, bd = Infinity;
    for (let k = 0; k < K; k++) {
      const d = dist2(C, k, x, y, z);
      if (d < bd) {
        best = k;
        bd = d;
      }
    }
    return best;
  };
  const assign = () => {
    for (let h = 0; h < n; h++) {
      const i = pixels[h];
      if (!shaded[i]) continue;
      swatch[i] = nearest(labs[h * 3], labs[h * 3 + 1], labs[h * 3 + 2]);
    }
  };
  assign();

  if (!names) {
    // smooth gradients are not patterns: merge colours whose shared border is
    // soft, and colours that are one pigment in less light (baked occlusion)
    const soft = [...softPairs({ albedo, region, swatch, pixels, W, H, r, C, K, inRegion }), ...shadePairs(C, K)];
    if (soft.length) {
      const parent = Array.from({ length: K }, (_, k) => k);
      const find = (k) => (parent[k] === k ? k : (parent[k] = find(parent[k])));
      for (const [a, b] of soft) parent[find(a)] = find(b);
      const sum = new Float64Array(K * 4);
      for (let h = 0; h < n; h++) {
        const i = pixels[h];
        if (!shaded[i]) continue;
        const k = find(swatch[i]);
        sum[k * 4] += labs[h * 3]; sum[k * 4 + 1] += labs[h * 3 + 1]; sum[k * 4 + 2] += labs[h * 3 + 2]; sum[k * 4 + 3]++;
      }
      const keep = [];
      for (let k = 0; k < K; k++) if (find(k) === k && sum[k * 4 + 3] > 0) keep.push(k);
      if (keep.length < 2) {
        for (let h = 0; h < n; h++) swatch[pixels[h]] = 0;
        return null;
      }
      const C2 = new Float32Array(keep.length * 3);
      keep.forEach((k, j) => {
        const c = sum[k * 4 + 3];
        C2[j * 3] = sum[k * 4] / c; C2[j * 3 + 1] = sum[k * 4 + 1] / c; C2[j * 3 + 2] = sum[k * 4 + 2] / c;
      });
      C = C2;
      K = keep.length;
      assign();
    }
    // a minor colour lying on the line between two others is the blend along
    // their border (antialiasing, a soft lateral line), not a pattern colour
    const share = new Float64Array(K);
    for (let h = 0; h < n; h++) share[swatch[pixels[h]]]++;
    let largest = 0;
    for (let k = 1; k < K; k++) if (share[k] > share[largest]) largest = k;
    const blend = new Set();
    for (let c = 0; c < K; c++) {
      if (c === largest || share[c] / n > 0.12) continue;
      for (let a = 0; a < K && !blend.has(c); a++) {
        for (let b = a + 1; b < K; b++) {
          if (a === c || b === c || blend.has(a) || blend.has(b)) continue;
          const sx = C[b * 3] - C[a * 3], sy = C[b * 3 + 1] - C[a * 3 + 1], sz = C[b * 3 + 2] - C[a * 3 + 2];
          const ss2 = sx * sx + sy * sy + sz * sz || 1e-9;
          const t = ((C[c * 3] - C[a * 3]) * sx + (C[c * 3 + 1] - C[a * 3 + 1]) * sy + (C[c * 3 + 2] - C[a * 3 + 2]) * sz) / ss2;
          if (t < 0.15 || t > 0.85) continue;
          const px = C[a * 3] + sx * t - C[c * 3], py = C[a * 3 + 1] + sy * t - C[c * 3 + 1], pz = C[a * 3 + 2] + sz * t - C[c * 3 + 2];
          if (px * px + py * py + pz * pz < 0.035 * 0.035) {
            blend.add(c);
            break;
          }
        }
      }
    }
    if (blend.size) {
      const keep = [...Array(K).keys()].filter((k) => !blend.has(k));
      if (keep.length < 2) {
        for (let h = 0; h < n; h++) swatch[pixels[h]] = 0;
        return null;
      }
      const C2 = new Float32Array(keep.length * 3);
      keep.forEach((k, j) => C2.set(C.subarray(k * 3, k * 3 + 3), j * 3));
      C = C2;
      K = keep.length;
      assign();
    }
  }

  // unshaded pixels take their neighbours' colour; then clean speckle — but
  // not the islands of a part or a declared colour that keeps its small
  // features (a pupil, a catchlight)
  if (!reg.part?.keepSmall) {
    const keep = names && declared.some((s) => s.keepSmall) ? Uint8Array.from(declared, (s) => (s.keepSmall ? 1 : 0)) : null;
    modeFilter(swatch, region, pixels, W, H, r, K, 2, keep);
    absorbSmall(swatch, region, pixels, W, H, r, K, Math.round(18 * ss * ss), keep);
  }

  // shares, order (base colour first) and printable colours
  const count = new Float64Array(K);
  for (let h = 0; h < n; h++) count[swatch[pixels[h]]]++;
  const order = [...Array(K).keys()].filter((k) => count[k] / n >= (names ? 0.003 : MIN_SHARE * 0.5)).sort((a, b) => count[b] - count[a]);
  if (order.length < 2) {
    for (let h = 0; h < n; h++) swatch[pixels[h]] = 0;
    return null;
  }
  // colours that fell below the share go to their nearest kept colour
  const remap = new Uint8Array(K);
  for (let k = 0; k < K; k++) {
    let j = order.indexOf(k);
    if (j < 0) {
      let bd = Infinity;
      order.forEach((q, jj) => {
        const d = dist2(C, k, C[q * 3], C[q * 3 + 1], C[q * 3 + 2]);
        if (d < bd) [j, bd] = [jj, d];
      });
    }
    remap[k] = j;
  }
  for (let h = 0; h < n; h++) swatch[pixels[h]] = remap[swatch[pixels[h]]];
  const med = medians({ albedo, shaded, swatch, pixels, K: order.length });
  const baseLab = hexToOklab(reg.color ?? '#a8a196');
  const out = order.map((k, j) => {
    let color;
    if (names) color = declared[k].color;
    else {
      const [L, a, b] = med[j];
      // the dominant colour keeps the part's declared colour when they agree
      color = j === 0 && (baseLab[0] - L) ** 2 + (baseLab[1] - a) ** 2 + (baseLab[2] - b) ** 2 < 0.07 ** 2 ? reg.color : oklabToHex(L, a, b);
    }
    const kind = names?.[k] ? null : autoKind(med[j], med[0], j);
    return { color, name: names?.[k] ?? autoName(reg.name, kind), share: count[k] / n, declared: !!names, kind };
  });
  return out;
}

/**
 * Pairs of colours (OKLab centres) where one is the other in less light: a
 * darkening that multiplies linear RGB (ambient occlusion baked into a colour
 * node, a back face drawn at 60 %) scales OKLab's L, a and b alike, so the
 * darker colour's a and b are the lighter one's times the lightness ratio.
 * A skull's occlusion-darkened ivory stays on that line to within 0.0005; an
 * authored second colour leaves it — a bark's darker furrows by 0.002, a
 * plumage marking by 0.02, a pale midrib by 0.1. Only ratios down to
 * SHADE_MIN count: anything deeper is a dark pigment.
 */
function shadePairs(C, K) {
  const out = [];
  for (let p = 0; p < K; p++) {
    for (let q = 0; q < K; q++) {
      if (p === q || C[q * 3] >= C[p * 3]) continue; // q darker than p
      const s = C[q * 3] / Math.max(1e-6, C[p * 3]);
      if (s < SHADE_MIN) continue;
      const da = C[q * 3 + 1] - s * C[p * 3 + 1], db = C[q * 3 + 2] - s * C[p * 3 + 2];
      if (Math.hypot(da, db) < SHADE_RESIDUAL) out.push([p, q]);
    }
  }
  return out;
}

/**
 * The k-th smallest value of a numeric typed array, selected in place
 * (Hoare/Wirth with a median-of-three pivot; the array is reordered): the
 * value a full ascending sort would put at index k, in linear time.
 */
function kth(a, k) {
  let l = 0, r = a.length - 1;
  while (l < r) {
    const p = a[l], q = a[k], z = a[r];
    const x = p < q ? (q < z ? q : p < z ? z : p) : (p < z ? p : q < z ? z : q);
    let i = l, j = r;
    do {
      while (a[i] < x) i++;
      while (x < a[j]) j--;
      if (i <= j) {
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
        i++;
        j--;
      }
    } while (i <= j);
    if (j < k) l = i;
    if (k < i) r = j;
  }
  return a[k];
}

/** Deterministic k-means in OKLab: maximin seeds, Lloyd steps, then merges of near colours. */
function kmeans(S, m, kMax) {
  // seed 1: the sample nearest the per-channel median
  const med = [0, 1, 2].map((c) => {
    const v = new Float32Array(m);
    for (let k = 0; k < m; k++) v[k] = S[k * 3 + c];
    return kth(v, m >> 1);
  });
  let first = 0, fd = Infinity;
  for (let k = 0; k < m; k++) {
    const d = (S[k * 3] - med[0]) ** 2 + (S[k * 3 + 1] - med[1]) ** 2 + (S[k * 3 + 2] - med[2]) ** 2;
    if (d < fd) {
      first = k;
      fd = d;
    }
  }
  let C = new Float32Array(kMax * 3);
  C.set(S.subarray(first * 3, first * 3 + 3), 0);
  let K = 1;
  const minD = new Float32Array(m).fill(Infinity);
  while (K < kMax) {
    let far = -1, farD = 0;
    for (let k = 0; k < m; k++) {
      const d = dist2(C, K - 1, S[k * 3], S[k * 3 + 1], S[k * 3 + 2]);
      if (d < minD[k]) minD[k] = d;
      if (minD[k] > farD) {
        far = k;
        farD = minD[k];
      }
    }
    if (far < 0 || farD < MERGE_DE * MERGE_DE) break;
    C.set(S.subarray(far * 3, far * 3 + 3), K * 3);
    K++;
  }
  // (255: no sample has been assigned yet, so the first pass always counts as a change)
  const lab = new Uint8Array(m).fill(255);
  const sum = new Float64Array(kMax * 4);
  for (let it = 0; it < 12; it++) {
    sum.fill(0);
    let moved = false;
    for (let k = 0; k < m; k++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < K; c++) {
        const d = dist2(C, c, S[k * 3], S[k * 3 + 1], S[k * 3 + 2]);
        if (d < bd) {
          best = c;
          bd = d;
        }
      }
      if (lab[k] !== best) moved = true;
      lab[k] = best;
      sum[best * 4] += S[k * 3]; sum[best * 4 + 1] += S[k * 3 + 1]; sum[best * 4 + 2] += S[k * 3 + 2]; sum[best * 4 + 3]++;
    }
    // the same assignment as the last pass gives the same sums, hence the
    // same centres, bit for bit: every further pass would repeat this one
    if (!moved) break;
    for (let c = 0; c < K; c++) {
      const w = sum[c * 4 + 3];
      if (w > 0) {
        C[c * 3] = sum[c * 4] / w; C[c * 3 + 1] = sum[c * 4 + 1] / w; C[c * 3 + 2] = sum[c * 4 + 2] / w;
      }
    }
  }
  // merge near colours (weighted), then drop rare ones
  const w = Array.from({ length: K }, (_, c) => sum[c * 4 + 3]);
  let cs = Array.from({ length: K }, (_, c) => [C[c * 3], C[c * 3 + 1], C[c * 3 + 2]]);
  for (;;) {
    let bi = -1, bj = -1, bd = MERGE_DE * MERGE_DE;
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const d = (cs[i][0] - cs[j][0]) ** 2 + (cs[i][1] - cs[j][1]) ** 2 + (cs[i][2] - cs[j][2]) ** 2;
        if (d < bd) [bi, bj, bd] = [i, j, d];
      }
    }
    if (bi < 0) break;
    const W2 = w[bi] + w[bj] || 1;
    cs[bi] = cs[bi].map((v, c) => (v * w[bi] + cs[bj][c] * w[bj]) / W2);
    w[bi] = W2;
    cs.splice(bj, 1);
    w.splice(bj, 1);
  }
  const total = w.reduce((a, b) => a + b, 0) || 1;
  const kept = cs.filter((_, i) => w[i] / total >= MIN_SHARE);
  cs = kept.length ? kept : cs.slice(0, 1);
  C = new Float32Array(cs.length * 3);
  cs.forEach((c, i) => C.set(c, i * 3));
  return { C, K: cs.length };
}

/**
 * Pairs of colours whose shared border is a gradient, not a step: across the
 * border, the albedo 2 px either side should differ by about the whole
 * centre-to-centre step for a printed pattern edge, but only by a fraction of
 * it on a smooth ramp (ambient occlusion baked into a colour node, shading).
 */
function softPairs({ albedo, swatch, pixels, W, H, C, K, inRegion }) {
  const KK = K * K;
  const sums = Array.from({ length: KK }, () => []);
  const A = new Float32Array(3), B = new Float32Array(3);
  const n = pixels.length;
  const step = Math.max(1, Math.floor(n / 400000));
  for (let h = 0; h < n; h += step) {
    const i = pixels[h];
    if (!inRegion(i)) continue;
    const x = i % W, y = (i / W) | 0;
    // right neighbour, then the one below
    for (let dir = 0; dir < 2; dir++) {
      const dx = 1 - dir, dy = dir;
      const xj = x + dx, yj = y + dy;
      if (xj >= W || yj >= H) continue;
      const j = yj * W + xj;
      if (!inRegion(j) || swatch[j] === swatch[i]) continue;
      const xp = x - 2 * dx, yp = y - 2 * dy, xq = xj + 2 * dx, yq = yj + 2 * dy;
      if (xp < 0 || yp < 0 || xq >= W || yq >= H) continue;
      const p = yp * W + xp, q = yq * W + xq;
      if (!inRegion(p) || !inRegion(q)) continue;
      let a = swatch[i], b = swatch[j], lo = p, hi = q;
      if (a > b) [a, b, lo, hi] = [b, a, q, p];
      const list = sums[a * K + b];
      if (list.length >= 3000) continue;
      oklab32(albedo[lo * 3], albedo[lo * 3 + 1], albedo[lo * 3 + 2], A, 0);
      oklab32(albedo[hi * 3], albedo[hi * 3 + 1], albedo[hi * 3 + 2], B, 0);
      const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
      const uu = ux * ux + uy * uy + uz * uz || 1e-9;
      list.push(((B[0] - A[0]) * ux + (B[1] - A[1]) * uy + (B[2] - A[2]) * uz) / uu);
    }
  }
  const soft = [];
  for (let a = 0; a < K; a++) {
    for (let b = a + 1; b < K; b++) {
      const list = sums[a * K + b];
      if (list.length < 24) continue;
      list.sort((u, v) => u - v);
      if (list[list.length >> 1] < 0.5) soft.push([a, b]);
    }
  }
  return soft;
}

/**
 * 3×3 majority vote inside region r (pixels of other regions do not vote);
 * pixels of a colour flagged in `keep` keep it.
 */
function modeFilter(swatch, region, pixels, W, H, r, K, passes, keep = null) {
  const n = pixels.length;
  const next = new Uint8Array(n);
  const votes = new Uint16Array(K);
  for (let p = 0; p < passes; p++) {
    for (let h = 0; h < n; h++) {
      const i = pixels[h];
      const x = i % W, y = (i / W) | 0;
      // inside a patch every voter agrees with the centre: it keeps its colour
      const s0 = swatch[i];
      if (keep?.[s0]) {
        next[h] = s0;
        continue;
      }
      let uniform = true;
      for (let dy = -1; dy <= 1 && uniform; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (region[j] === r && swatch[j] !== s0) {
            uniform = false;
            break;
          }
        }
      }
      if (uniform) {
        next[h] = s0;
        continue;
      }
      for (let k = 0; k < K; k++) votes[k] = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (region[j] === r) votes[swatch[j]]++;
        }
      }
      let best = swatch[i], bv = votes[best];
      for (let k = 0; k < K; k++) {
        if (votes[k] > bv) {
          best = k;
          bv = votes[k];
        }
      }
      next[h] = best;
    }
    for (let h = 0; h < n; h++) swatch[pixels[h]] = next[h];
  }
}

/**
 * Swatch islands smaller than `minSize` inside region r join their most
 * common neighbour (islands of a colour flagged in `keep` stay).
 */
function absorbSmall(swatch, region, pixels, W, H, r, K, minSize, keep = null) {
  // visited marks for the whole image (a Set of pixel indices was the cost here)
  const seen = new Uint8Array(W * H);
  const comp = [];
  const votes = new Uint32Array(K);
  for (let h = 0; h < pixels.length; h++) {
    const s = pixels[h];
    if (seen[s]) continue;
    const k = swatch[s];
    if (keep?.[k]) {
      seen[s] = 1;
      continue;
    }
    comp.length = 0;
    comp.push(s);
    seen[s] = 1;
    for (let c = 0; c < comp.length && comp.length < minSize; c++) {
      const i = comp[c];
      const x = i % W, y = (i / W) | 0;
      // N4 order: +x, −x, +y, −y
      if (x + 1 < W && region[i + 1] === r && swatch[i + 1] === k && !seen[i + 1]) { seen[i + 1] = 1; comp.push(i + 1); }
      if (x > 0 && region[i - 1] === r && swatch[i - 1] === k && !seen[i - 1]) { seen[i - 1] = 1; comp.push(i - 1); }
      if (y + 1 < H && region[i + W] === r && swatch[i + W] === k && !seen[i + W]) { seen[i + W] = 1; comp.push(i + W); }
      if (y > 0 && region[i - W] === r && swatch[i - W] === k && !seen[i - W]) { seen[i - W] = 1; comp.push(i - W); }
    }
    if (comp.length >= minSize) continue;
    votes.fill(0);
    for (const i of comp) {
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of N4) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (region[j] === r && swatch[j] !== k) votes[swatch[j]]++;
      }
    }
    let best = -1, bv = 0;
    for (let q = 0; q < K; q++) {
      if (votes[q] > bv) {
        best = q;
        bv = votes[q];
      }
    }
    if (best >= 0) for (const i of comp) swatch[i] = best;
  }
}

/**
 * Per-swatch colour in OKLab: the exact pigment when one value clearly
 * dominates (procedural patterns paint flat colours, scale shading only
 * varies the rest), else the per-channel median (robust to edge blending).
 */
function medians({ albedo, shaded, swatch, pixels, K }) {
  const step = Math.max(1, Math.floor(pixels.length / 60000));
  // samples per swatch first, so each channel is one typed array whose
  // median is selected in place (no sort)
  const count = new Int32Array(K);
  let samples = 0;
  for (let h = 0; h < pixels.length; h += step) {
    const i = pixels[h];
    if (shaded[i]) {
      count[swatch[i]]++;
      samples++;
    }
  }
  const per = Array.from({ length: K }, (_, k) => [new Float64Array(count[k]), new Float64Array(count[k]), new Float64Array(count[k])]);
  const fill = new Int32Array(K);
  // exact-colour counts per swatch in an open-addressing table keyed by
  // swatch·2²⁴ + rgb; `order` lists its slots in first-seen order (the
  // pigment is the most frequent colour, the first seen winning a tie)
  let bits = 10;
  while (1 << bits < samples * 2) bits++;
  const mask = (1 << bits) - 1;
  const hKey = new Int32Array(mask + 1).fill(-1);
  const hCount = new Int32Array(mask + 1);
  const order = new Int32Array(samples);
  let seenColours = 0;
  const ok = new Float32Array(3);
  for (let h = 0; h < pixels.length; h += step) {
    const i = pixels[h];
    if (!shaded[i]) continue;
    const r = albedo[i * 3], g = albedo[i * 3 + 1], b = albedo[i * 3 + 2];
    oklab32(r, g, b, ok, 0);
    const k = swatch[i];
    const p = per[k];
    const j = fill[k]++;
    p[0][j] = ok[0]; p[1][j] = ok[1]; p[2][j] = ok[2];
    const key = (k << 24) | (r << 16) | (g << 8) | b;
    let slot = Math.imul(key, 0x9e3779b1) >>> (32 - bits);
    while (hKey[slot] !== -1 && hKey[slot] !== key) slot = (slot + 1) & mask;
    if (hKey[slot] === -1) {
      hKey[slot] = key;
      order[seenColours++] = slot;
    }
    hCount[slot]++;
  }
  return per.map((p, k) => {
    const med = p.map((v) => (v.length ? kth(v, v.length >> 1) : 0));
    let top = -1, cnt = 0;
    for (let q = 0; q < seenColours; q++) {
      const slot = order[q];
      if (hKey[slot] >>> 24 !== k) continue;
      if (hCount[slot] > cnt) {
        top = hKey[slot] & 0xffffff;
        cnt = hCount[slot];
      }
    }
    if (top < 0 || cnt < p[0].length * 0.08) return med;
    const mode = rgbToOklab(top >> 16, (top >> 8) & 255, top & 255, [0, 0, 0]);
    // only when the pigment and the median agree (not an edge or seam value)
    return (mode[0] - med[0]) ** 2 + (mode[1] - med[1]) ** 2 + (mode[2] - med[2]) ** 2 < 0.04 ** 2 ? mode : med;
  });
}

/**
 * What a colour read from a part is, against the part's dominant one (j = 0,
 * which is named after the part itself: null): 'dark', 'pale', 'coloured' or
 * plain 'markings'.
 */
function autoKind(lab, base, j) {
  if (j === 0) return null;
  const dL = lab[0] - base[0];
  const chroma = Math.hypot(lab[1], lab[2]);
  return dL < -0.12 ? 'dark' : dL > 0.12 ? 'pale' : chroma > Math.hypot(base[1], base[2]) + 0.04 ? 'coloured' : 'plain';
}

/** A readable English name for a colour read from a part ("Body — dark markings"; see markingName in index.js). */
function autoName(part, kind) {
  if (!kind) return part;
  return `${part} — ${kind === 'plain' ? 'markings' : `${kind} markings`}`;
}

// ---------------------------------------------------------------- folds & overlaps

/**
 * Contours a part draws over itself: inside one region, a jump in depth (a
 * coil passing over another, a petal in front of the next) or a change of
 * mesh (one corolla against another). The nearer pixel of each pair is
 * marked — strong above `strong`, weak above `weak`, weak pixels kept only
 * when connected to strong ones — and chained into open polylines.
 * @param {Uint16Array} region
 * @param {Uint16Array} mesh
 * @param {Float32Array} depth  0..1 over the figure's depth range
 * @param {number} W
 * @param {number} H
 * @param {{ strong?: number, weak?: number }} [o]
 * @returns {Array<Float64Array>} chains of pixel-centre coordinates (x, y, …)
 */
export function foldChains(region, mesh, depth, W, H, { strong = 4 / 255, weak = 2 / 255 } = {}) {
  const N = W * H;
  const mark = new Uint8Array(N);
  const visit = (i, j) => {
    const r = region[i];
    if (!r || region[j] !== r) return;
    const near = depth[i] <= depth[j] ? i : j;
    let m = 0;
    if (mesh[i] !== mesh[j]) m = 2;
    else {
      const d = Math.abs(depth[i] - depth[j]);
      if (d > strong) m = 2;
      else if (d > weak) m = 1;
    }
    if (m > mark[near]) mark[near] = m;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!region[i]) continue;
      if (x + 1 < W) visit(i, i + 1);
      if (y + 1 < H) visit(i, i + W);
    }
  }
  // hysteresis: weak pixels survive when 8-connected to a strong one
  const keep = new Uint8Array(N);
  const stack = [];
  for (let i = 0; i < N; i++) {
    if (mark[i] === 2) {
      keep[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % W, y = (i / W) | 0;
    for (let q = 0; q < 8; q++) {
      const xx = x + DX8[q], yy = y + DY8[q];
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx;
      if (!keep[j] && mark[j]) {
        keep[j] = 1;
        stack.push(j);
      }
    }
  }
  return chainPixels(keep, W, H);
}

/** Chain marked pixels into 8-connected open polylines (endpoints first, then loops). */
export function chainPixels(keep, W, H) {
  const N = W * H;
  const used = new Uint8Array(N);
  const free = (i) => {
    const x = i % W, y = (i / W) | 0;
    let c = 0;
    for (let q = 0; q < 8; q++) {
      const xx = x + DX8[q], yy = y + DY8[q];
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx;
      if (keep[j] && !used[j]) c++;
    }
    return c;
  };
  const walk = (s) => {
    const pts = [];
    let cur = s;
    used[cur] = 1;
    for (;;) {
      pts.push((cur % W) + 0.5, ((cur / W) | 0) + 0.5);
      const x = cur % W, y = (cur / W) | 0;
      let next = -1;
      for (let q = 0; q < 8; q++) {
        const xx = x + DX8[q], yy = y + DY8[q];
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (keep[j] && !used[j]) {
          next = j;
          break;
        }
      }
      if (next < 0) break;
      used[next] = 1;
      cur = next;
    }
    return Float64Array.from(pts);
  };
  const chains = [];
  for (let i = 0; i < N; i++) if (keep[i] && !used[i] && free(i) <= 1) chains.push(walk(i));
  for (let i = 0; i < N; i++) if (keep[i] && !used[i]) chains.push(walk(i));
  return chains;
}

/** Laplacian smoothing of an open polyline (¼ ½ ¼), endpoints fixed. */
export function smoothOpen(xy, iterations = 3) {
  const n = xy.length / 2;
  if (n < 3) return xy;
  let a = Float64Array.from(xy);
  let b = Float64Array.from(xy);
  for (let it = 0; it < iterations; it++) {
    for (let i = 1; i < n - 1; i++) {
      b[i * 2] = 0.25 * a[i * 2 - 2] + 0.5 * a[i * 2] + 0.25 * a[i * 2 + 2];
      b[i * 2 + 1] = 0.25 * a[i * 2 - 1] + 0.5 * a[i * 2 + 1] + 0.25 * a[i * 2 + 3];
    }
    [a, b] = [b, a];
  }
  return a;
}

// ---------------------------------------------------------------- ground shadow

/**
 * A soft contact shadow: every figure pixel, lifted back into the world from
 * its depth, is projected onto the paper along the key light, weighted by
 * how close it is to the paper, splatted on a coarse grid and blurred.
 * Besides the shade, per cell: `low`, the height of the lowest pixel cast
 * there (in `reach`, the fall-off's scale, 6 % of the figure's size;
 * Infinity: none), and `under`, 1 where the figure itself covers the cell —
 * what dropUngrounded asks of a patch of shade.
 * @returns {{ grid: Float32Array, low: Float32Array, under: Uint8Array, GW: number, GH: number, cell: number }|null}
 */
export function shadowGrid({ region, depth, W, H, cam, near, far, keyDir, paperY, worldBox, ss }) {
  if (!cam?.isPerspectiveCamera || !keyDir || keyDir.y < 0.2 || !worldBox || worldBox.isEmpty()) return null;
  // the fall-off follows the figure's size, not its height (a snake lying
  // flat is only as tall as it is thick, and still sits on the paper)
  const size = worldBox.getSize(new THREE.Vector3());
  const reach = Math.max(1e-6, 0.06 * Math.max(size.x, size.y, size.z));
  const cell = Math.max(2, Math.round(4 * ss));
  const GW = Math.ceil(W / cell), GH = Math.ceil(H / cell);
  const grid = new Float32Array(GW * GH);
  const low = new Float32Array(GW * GH).fill(Infinity);
  const camPos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const v = new THREE.Vector3();
  const P = new THREE.Vector3();
  const stride = Math.max(1, Math.round(2 * ss));
  const area = stride * stride;
  for (let y = 0; y < H; y += stride) {
    for (let x = 0; x < W; x += stride) {
      const i = y * W + x;
      if (!region[i]) continue;
      v.set(((x + 0.5) / W) * 2 - 1, 1 - ((y + 0.5) / H) * 2, 0.5).unproject(cam).sub(camPos).normalize();
      const z = near + depth[i] * (far - near);
      P.copy(camPos).addScaledVector(v, z / Math.max(1e-6, v.dot(fwd)));
      // a contact shadow: dark where the figure meets the paper, gone a
      // little above it (high parts would only cast faint drifting smudges)
      const h = Math.max(0, P.y - paperY);
      const w = 1 / (1 + (h / reach) ** 3);
      if (w < 0.03) continue;
      P.addScaledVector(keyDir, -h / keyDir.y);
      P.project(cam);
      const sx = ((P.x * 0.5 + 0.5) * W) / cell, sy = ((-P.y * 0.5 + 0.5) * H) / cell;
      const gx = Math.floor(sx), gy = Math.floor(sy);
      if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
      const g = gy * GW + gx;
      grid[g] += (w * area) / (cell * cell);
      if (h < low[g] * reach) low[g] = h / reach;
    }
  }
  blur(grid, GW, GH, 2.2);
  const under = new Uint8Array(GW * GH);
  for (let y = 0; y < H; y++) {
    const row = Math.min(GH - 1, (y / cell) | 0) * GW;
    for (let x = 0; x < W; x++) if (region[y * W + x]) under[row + Math.min(GW - 1, (x / cell) | 0)] = 1;
  }
  return { grid, low, under, GW, GH, cell };
}

/**
 * Clear the shade nothing grounds: every 8-connected patch of grid cells at
 * or above `level` that nothing lower than `contact` casts into (in reach;
 * shadowGrid's `low`) and that lies mostly beside the figure (less than
 * `share` of its cells under it) is zeroed in place. A contact shadow is
 * shade where the figure meets the paper; a patch cast only by raised parts
 * and lying apart from them — a head lifted over the coils, a tail hanging
 * beside the skull, whose bulk above casts nothing — reads as a stain on the
 * page. A patch under its figure (a mandible floating in an exploded view)
 * or holding a low part (a sea snake swimming just above the page) is kept
 * whole.
 * @param {{ grid: Float32Array, low: Float32Array, under: Uint8Array, GW: number, GH: number }} g  shadowGrid's result
 * @param {number} level  the faintest level that is drawn
 * @param {number} contact  how low (in reach) a part must come for its shade to count as contact
 * @param {number} share  the share of a patch under the figure that makes it the figure's own
 * @returns {number} the cells cleared
 */
export function dropUngrounded({ grid, low, under, GW, GH }, level, contact, share) {
  const n = GW * GH;
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  let cleared = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s] || !(grid[s] >= level)) continue;
    let len = 0, lowest = Infinity, covered = 0;
    queue[len++] = s;
    seen[s] = 1;
    for (let h = 0; h < len; h++) {
      const j = queue[h];
      if (low[j] < lowest) lowest = low[j];
      covered += under[j];
      const x = j % GW, y = (j / GW) | 0;
      for (let d = 0; d < 8; d++) {
        const xx = x + DX8[d], yy = y + DY8[d];
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
        const k = yy * GW + xx;
        if (seen[k] || !(grid[k] >= level)) continue;
        seen[k] = 1;
        queue[len++] = k;
      }
    }
    if (lowest <= contact || covered >= share * len) continue;
    for (let h = 0; h < len; h++) grid[queue[h]] = 0;
    cleared += len;
  }
  return cleared;
}

/** Separable Gaussian blur in place (edges clamped). */
function blur(g, W, H, sigma) {
  const R = Math.ceil(sigma * 3);
  const k = new Float32Array(R * 2 + 1);
  let s = 0;
  for (let i = -R; i <= R; i++) s += k[i + R] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= s;
  // every sum adds its taps in the same order (i = −R … R), so the clamped
  // edge loops and the unclamped interior loops give the same values
  const tmp = new Float32Array(g.length);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      let a = 0;
      if (x >= R && x + R < W) {
        for (let i = 0, o = row + x - R; i <= 2 * R; i++, o++) a += g[o] * k[i];
      } else {
        for (let i = -R; i <= R; i++) a += g[row + Math.min(W - 1, Math.max(0, x + i))] * k[i + R];
      }
      tmp[row + x] = a;
    }
  }
  // vertical: accumulate whole rows (memory read in order), tap by tap
  const acc = new Float64Array(W);
  for (let y = 0; y < H; y++) {
    acc.fill(0);
    for (let i = -R; i <= R; i++) {
      const src = Math.min(H - 1, Math.max(0, y + i)) * W;
      const w = k[i + R];
      for (let x = 0; x < W; x++) acc[x] += tmp[src + x] * w;
    }
    const row = y * W;
    for (let x = 0; x < W; x++) g[row + x] = acc[x];
  }
}
