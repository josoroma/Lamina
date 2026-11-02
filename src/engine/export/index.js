// Export: portable artwork from the living plate (CONTRACTS §9).
//
//   exportFigureSVG  the figure on the visible recto as a VECTOR plate: the
//                    figure alone is rendered into ID buffers (mesh, depth,
//                    unlit albedo, tone band), every part is traced (marching
//                    squares → RDP → centripetal Catmull-Rom Béziers) and
//                    composed with its colours — the part colour and the
//                    pattern read from its albedo (rings, saddles, bands) —
//                    in three tones, shadow hatching, ink contours on part
//                    boundaries, folds and overlaps, a heavier silhouette, the
//                    figure's ink lines, numbered labels on leaders, caption
//                    and credit. mode 'line' = white fills + ink only (a
//                    colouring page, pattern borders drawn fine).
//   exportPNG        the whole view at print resolution, tone-mapped exactly
//                    like the screen, composited over white.
//   exportFileName   the download name of a plate in a language.
//   downloadText / downloadBlob  browser download helpers.
//
// A plate is written in one language (`lang`, default: the current one,
// fixed when the call starts so a switch during the read-back cannot mix
// two): the key, the parts' and colours' tooltips and the plate's own
// sentences are translated here from the figure's English strings; the
// caller passes title, caption and credit already in that language.
import * as THREE from 'three/webgpu';
import { renderIdBuffer, findKeyTime } from './idpass.js';
import { traceRegion, labelBounds, loopArea, smoothLoop, simplifyLoop, simplifyOpen, bezierSegments, pathData, fmt } from './trace.js';
import { composePlate, toneRamp, hexToOklab } from './svg.js';
import { despeckle, pixelsByRegion, readPattern, foldChains, smoothOpen, shadowGrid, dropUngrounded } from './raster.js';
import { inkGlobals } from '../../kits/ink/index.js';
import { tl, getLang, isLang } from '../../i18n/index.js';

export { composePlate, toneRamp, mixHex, mixOklab } from './svg.js';
export { traceRegion, simplifyLoop, bezierSegments, pathData } from './trace.js';
export { regionNames } from './idpass.js';

/** The file-name word for each kind of plate, per language (PNG has none). */
const FILE_KIND = { en: { color: 'color', line: 'line' }, es: { color: 'color', line: 'lineal' } };

/**
 * Download name of an exported plate: `serpientes-terciopelo-color.svg`,
 * `serpientes-terciopelo-line.svg`, `serpientes-terciopelo.png` in English;
 * `…-color-es.svg`, `…-lineal-es.svg`, `…-es.png` in Spanish, so both
 * editions' plates can share a folder.
 * @param {object} o
 * @param {string|{ id: string }} o.book     book id (or manifest)
 * @param {string|{ id: string }|null} [o.plate]  plate id (or plate); none: 'figure' / 'view'
 * @param {'color'|'line'|'png'|'svg-color'|'svg-line'} [o.kind='color']
 * @param {'en'|'es'} [o.lang]               default: the current language
 * @returns {string}
 */
export function exportFileName({ book, plate = null, kind = 'color', lang } = {}) {
  const L = isLang(lang) ? lang : getLang();
  const k = String(kind).replace(/^svg-/, '');
  const png = k === 'png';
  const name = [book?.id ?? book ?? 'lamina', plate?.id ?? plate ?? (png ? 'view' : 'figure')];
  if (!png) name.push((FILE_KIND[L] ?? FILE_KIND.en)[k] ?? k);
  if (L !== 'en') name.push(L);
  return `${name.join('-')}.${png ? 'png' : 'svg'}`;
}

/**
 * The name of a colour the exporter read from a part (not one the subject
 * declared), in the plate's language: the part's name with what the colour
 * is (keys literal, so the string extractor finds them).
 */
function markingName(L, kind, part) {
  switch (kind) {
    case 'dark': return tl(L, '{part} — dark markings', { part });
    case 'pale': return tl(L, '{part} — pale markings', { part });
    case 'coloured': return tl(L, '{part} — coloured markings', { part });
    default: return tl(L, '{part} — markings', { part });
  }
}

/**
 * Trigger a browser download of a text file.
 * @param {string} filename
 * @param {string} text
 * @param {string} [mime='text/plain']
 */
export function downloadText(filename, text, mime = 'text/plain') {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
}

/**
 * Trigger a browser download of a Blob.
 * @param {string} filename
 * @param {Blob} blob
 */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---------------------------------------------------------------- PNG

/**
 * Render the scene at `width` px (camera aspect) through the renderer's own
 * output transform (tone mapping + sRGB, MSAA), composite over white and
 * encode as PNG. Pixel-sized ink (hatch spacing, outlines, ink lines) is
 * scaled with the resolution so the print matches the screen.
 * @param {{ renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera,
 *           width?: number, background?: string|null }} o  background null → transparent
 * @returns {Promise<Blob>}
 */
export async function exportPNG({ renderer, scene, camera, width = 2400, background = '#ffffff' }) {
  const aspect = camera.isPerspectiveCamera ? camera.aspect : (camera.right - camera.left) / (camera.top - camera.bottom);
  const w = Math.max(64, Math.round(width / 64) * 64);
  const h = Math.max(1, Math.round(w / aspect));
  const rt = new THREE.RenderTarget(w, h, { samples: 4, type: THREE.UnsignedByteType, depthBuffer: true });
  const prevOut = renderer.getOutputRenderTarget();
  const prevRT = renderer.getRenderTarget();
  const cssW = renderer.domElement?.clientWidth || renderer.getSize(new THREE.Vector2()).x || w;
  const scale = w / Math.max(1, cssW * renderer.getPixelRatio());
  const prevScale = inkGlobals.pixelScale.value;
  const lineMats = [];
  scene.traverse((o) => {
    if (o.userData?.isInkLine && o.material?.isLine2NodeMaterial) {
      lineMats.push([o.material, o.material.linewidth]);
      o.material.linewidth *= scale;
    }
  });
  let px;
  try {
    inkGlobals.pixelScale.value = prevScale * scale;
    renderer.setOutputRenderTarget(rt);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  } finally {
    renderer.setOutputRenderTarget(prevOut);
    renderer.setRenderTarget(prevRT);
    inkGlobals.pixelScale.value = prevScale;
    for (const [m, lw] of lineMats) m.linewidth = lw;
  }
  try {
    px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h);
  } finally {
    rt.dispose();
  }
  return pixelsToPNG(px, w, h, !renderer.backend?.isWebGPUBackend, background);
}

async function pixelsToPNG(px, w, h, flipY, background) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const bg = background ? new THREE.Color(background) : null;
  const br = bg ? Math.round(bg.r * 255) : 0, bgG = bg ? Math.round(bg.g * 255) : 0, bb = bg ? Math.round(bg.b * 255) : 0;
  for (let y = 0; y < h; y++) {
    const sy = flipY ? h - 1 - y : y;
    for (let x = 0; x < w; x++) {
      const s = (sy * w + x) * 4, d = (y * w + x) * 4;
      const a = px[s + 3] / 255;
      if (bg) {
        // premultiplied colour over the background
        img.data[d] = Math.min(255, px[s] + (1 - a) * br);
        img.data[d + 1] = Math.min(255, px[s + 1] + (1 - a) * bgG);
        img.data[d + 2] = Math.min(255, px[s + 2] + (1 - a) * bb);
        img.data[d + 3] = 255;
      } else {
        const inv = a > 0 ? 1 / a : 0;
        img.data[d] = Math.min(255, px[s] * inv);
        img.data[d + 1] = Math.min(255, px[s + 1] * inv);
        img.data[d + 2] = Math.min(255, px[s + 2] * inv);
        img.data[d + 3] = px[s + 3];
      }
    }
  }
  g.putImageData(img, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'));
}

// ---------------------------------------------------------------- SVG

/** Most colours a part's pattern is drawn with (its own colour included). */
const KMAX = 8;
/** Labels per region: KMAX swatches × 3 tone bands. */
const LPR = KMAX * 3;
/** How far (share of the frame's larger side) a hidden label looks for a visible pixel of its structure. */
const RELOCATE_REACH = 0.08;
/**
 * How far in front of a label's anchor a surface must lie to hide it: the
 * reader's tolerance (FigureHost: its ray stops 2.5 % of the figure's radius
 * short of the anchor), never more than OCCLUDE_MAX of the depth range — a
 * muscle over a bone hides the bone's label on the plate as it does on screen.
 */
const OCCLUDE_TOL = 0.025;
const OCCLUDE_MAX = 0.02;
/**
 * A label in view whose anchor shows less than this share of its own
 * structure round it (its mesh, else its part: an anchor on the part's edge,
 * a mesh's origin inside the next rattle segment) points at the nearest
 * visible patch of that structure instead, when there is one.
 */
const OWN_SHARE = 0.5;
/** How far (buffer px at detail 1) a moved anchor steps on into its structure, so its dot sits on it, not on the edge. */
const INSET_PX = 3;
/**
 * How near (share of the figure's size, its box diagonal) that pixel's surface
 * must lie to the anchor in 3D to stand for it: the near side of the same
 * organ or the bone's visible flank beside the anchor, not its far end.
 */
const RELOCATE_NEAR = 0.1;
/**
 * How big a visible patch must be for a hidden label to point at it: this
 * share of the structure's own projected size (its bounding sphere's disc),
 * at most RELOCATE_PATCH px (detail 1) — a calyx glimpsed through a corolla's
 * throat is not the calyx, while a skull bone's visible flank always counts.
 */
const RELOCATE_SHARE = 0.08;
const RELOCATE_PATCH = 400;
/**
 * Leader lengths a marker disc tries, in disc radii: short ones first, then
 * out to MARKER_STEPS' last (the reach), where the nearest paper usually is
 * for an anchor buried in a dense cluster.
 */
const MARKER_STEPS = [2.3, 3.1, 4.1, 5.3, 6.8, 8.6, 10.8, 13.4, 16.4];
/**
 * How far in front of an ink line a surface must lie to hide it: LINE_TOL_PX
 * buffer pixels of depth at the line, at most LINE_TOL of the figure's depth
 * range (the depth buffer's own steps are 1/65535 of it).
 */
const LINE_TOL_PX = 3;
const LINE_TOL = 0.012;
/** Unit-disc sample points (x, y pairs) for a marker's cover test: the centre and two rings. */
const COVER_RING = [0, 0];
for (const [count, ring] of [[8, 0.45], [12, 0.85]]) {
  for (let k = 0; k < count; k++) COVER_RING.push(Math.cos((k / count) * Math.PI * 2) * ring, Math.sin((k / count) * Math.PI * 2) * ring);
}

/**
 * Vector plate of one mounted figure, seen from `camera`.
 * @param {object} o
 * @param {THREE.WebGPURenderer} o.renderer
 * @param {object} o.mount          FigureHost mount (host.active)
 * @param {THREE.Camera} o.camera   the current view
 * @param {'color'|'line'} [o.mode='color']
 * @param {number} [o.width=1600]   page width in px; the ID buffer uses the same width
 * @param {string} [o.title]        defaults to the figure's title
 * @param {string} [o.caption]      *italic* spans allowed
 * @param {string} [o.credit]
 * @param {boolean} [o.labels=true] numbered markers + key for the figure's visible labels
 * @param {Iterable<string>|((id: string) => boolean)} [o.keep]  label ids the reader asked
 *        for (the focused label, the plate's look-closer notes): when such a label's anchor
 *        is hidden and nothing of its structure shows near it, it keeps its number as a
 *        hollow marker; any other hidden label is left out (as the reader does)
 * @param {number} [o.detail=1]     1–2: ID-buffer supersampling (2 = smoother, slower)
 * @param {boolean} [o.hatch=true]  shadow hatching in colour mode
 * @param {boolean} [o.ground=true] soft ground shadow in colour mode
 * @param {{ paper?: string, ink?: string, muted?: string }} [o.palette]
 * @param {'en'|'es'} [o.lang]      language of the key, the tooltips and the plate's own words
 *                                  (default: the current language); `xml:lang` on the root
 * @returns {Promise<string>} SVG markup; rejects with an Error whose `code` is 'no-solids'
 *          (and whose `userMessage` says so in plain words, in `lang`) when no pose of the loop
 *          shows a solid form under the current layers
 */
export async function exportFigureSVG({
  renderer, mount, camera, mode = 'color', width = 1600, title, caption = '', credit = '', labels = true, keep,
  detail = 1, hatch = true, ground = true, palette, lang,
} = {}) {
  // the language is fixed before the first await: a switch while the plate
  // is read back must not mix two in one file
  const L = isLang(lang) ? lang : getLang();
  if (!renderer || !mount?.figure || !camera) throw new Error('exportFigureSVG: renderer, mount (with a built figure) and camera are required');
  const pal = { paper: '#fbf8f1', ink: '#1c1a17', muted: '#7b7466', ...(palette ?? {}) };
  if (mount.ctx?.palette?.ink && !palette?.ink) pal.ink = mount.ctx.palette.ink;
  const line = mode === 'line';
  const ss = Math.max(1, Math.min(2, detail));
  const pass = { renderer, mount, camera, width: width * ss, maxHeight: Math.round(2400 * ss) };
  let id = null;
  let keyPose = false;
  try {
    id = await renderIdBuffer(pass);
  } catch (err) {
    if (err?.code !== 'no-solids') throw err;
    // a lesson caught between stages (only its construction lines on the
    // page): the plate shows the finished form instead of failing — the
    // figure's declared key pose, else (no pose declared, or the layers now
    // switched off hide that one too) the loop's most solid moment
    const declared = Number.isFinite(mount.figure.keyTime);
    for (const useDeclared of declared ? [true, false] : [false]) {
      const t = await findKeyTime({ renderer, mount, camera, declared: useDeclared });
      if (t == null) continue;
      try {
        id = await renderIdBuffer({ ...pass, time: t });
        keyPose = true;
        break;
      } catch (e) {
        if (e?.code !== 'no-solids') throw e;
      }
    }
    if (!id) {
      const e = new Error('exportFigureSVG: nothing solid to export — no moment of the loop shows a solid form with the layers now shown');
      e.code = 'no-solids';
      e.userMessage = tl(L, 'Nothing solid to export — switch a figure layer back on');
      throw e;
    }
  }
  const { W, H } = id;
  const N = W * H;
  const eps = 0.7 * ss;
  const minArea = 7 * ss * ss;
  const toPage = (x, y) => [x / ss, y / ss];
  // names in the plate's language: parts' and declared colours' names (and
  // a mesh's, outside every part) are the subject's English; a colour read
  // here is named after its part through a template
  const say = (s) => (typeof s === 'string' && s ? tl(L, s) : s);
  const colourName = (s, reg) => (s.kind ? markingName(L, s.kind, say(reg.name)) : say(s.name ?? reg.name));

  // ---- region per pixel; slivers too small to trace fold into a neighbour
  //      (an edge is never left to a region whose outline is then dropped)
  const region = new Uint16Array(N);
  const shaded = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    region[i] = id.meshRegion[id.mesh[i]];
    shaded[i] = id.mesh[i] ? 1 : 0;
  }
  despeckle(region, W, H, Math.round(12 * ss * ss), (dst, src) => {
    region[dst] = region[src];
    id.mesh[dst] = id.mesh[src];
    id.depth[dst] = id.depth[src];
    id.band[dst] = id.band[src];
    shaded[dst] = shaded[src];
    id.albedo[dst * 3] = id.albedo[src * 3];
    id.albedo[dst * 3 + 1] = id.albedo[src * 3 + 1];
    id.albedo[dst * 3 + 2] = id.albedo[src * 3 + 2];
  });

  // ---- each part's colour pattern, read from its albedo
  const swatch = new Uint8Array(N);
  const byRegion = pixelsByRegion(region, id.regions.length);
  const patterns = id.regions.map((reg, idx) => {
    const r = idx + 1;
    const pixels = byRegion.list.subarray(byRegion.start[r], byRegion.start[r + 1]);
    return readPattern({ albedo: id.albedo, shaded, region, swatch, pixels, W, H, r, reg, ss });
  });
  // one stone per colour: near-identical colours read from different parts
  // (the coral's yellow on body and head) print as one ink, a declared
  // colour winning over a measured one, a large area over a small one
  const inks = [];
  id.regions.forEach((reg, idx) => {
    const n = byRegion.start[idx + 2] - byRegion.start[idx + 1];
    for (const s of patterns[idx] ?? []) inks.push({ s, w: s.declared || s.color === reg.color ? Infinity : s.share * n });
  });
  inks.sort((a, b) => b.w - a.w);
  const stones = [];
  for (const k of inks) {
    const lab = hexToOklab(k.s.color);
    const near = stones.find((t) => (t.lab[0] - lab[0]) ** 2 + (t.lab[1] - lab[1]) ** 2 + (t.lab[2] - lab[2]) ** 2 < 0.03 ** 2);
    if (near) k.s.color = near.color;
    else stones.push({ lab, color: k.s.color });
  }

  // ---- label image: ((region · KMAX + swatch) · 3 + band) + 1, 0 = paper
  const lab = new Uint16Array(N);
  for (let i = 0; i < N; i++) if (region[i]) lab[i] = (region[i] * KMAX + swatch[i]) * 3 + id.band[i] + 1;
  const boxes = labelBounds(lab, W, H);
  const maxLabel = (id.regions.length + 2) * LPR + 1;
  const regionOfLabel = (o) => (o <= 0 ? 0 : ((o - 1) / LPR) | 0);
  const swatchOfLabel = (o) => (((o - 1) / 3) | 0) % KMAX;
  const lbl = (r, s, b) => (r * KMAX + s) * 3 + b + 1;

  /** Closed outlines (path data) of the pixels whose label is in `Ls`. */
  const traceSet = (Ls, minA = minArea * 1.5) => {
    const member = new Uint8Array(maxLabel);
    let bb = null;
    for (const L of Ls) {
      member[L] = 1;
      const b = boxes.get(L);
      if (b) bb = bb ? [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])] : b.slice();
    }
    if (!bb) return { d: '', loops: [] };
    const loops = traceRegion(lab, W, H, member, bb).filter((l) => Math.abs(loopArea(l.xy)) >= minA);
    let d = '';
    for (const loop of loops) {
      const sm = smoothLoop(loop.xy, 3 + ss);
      const keep = simplifyLoop(sm, eps * 1.15);
      const pts = [];
      for (const i of keep) pts.push(...toPage(sm[i * 2], sm[i * 2 + 1]));
      if (pts.length < 6) continue;
      d += pathData(bezierSegments(pts, true), { closed: true });
    }
    return { d, loops };
  };
  const tones = (r, s, color) => {
    const ramp = toneRamp(color, pal);
    return { base: ramp.base, lightColor: ramp.light, shadowColor: ramp.shadow, light: traceSet([lbl(r, s, 0)]).d, shadow: traceSet([lbl(r, s, 2)]).d };
  };

  // ---- per region: fills, pattern, tone shapes, contour runs
  const parts = [];
  const inner = [];
  const silhouette = [];
  const patternLines = [];
  id.regions.forEach((reg, idx) => {
    const r = idx + 1;
    const all = [];
    for (let s = 0; s < KMAX; s++) for (let b = 0; b < 3; b++) all.push(lbl(r, s, b));
    const member = new Uint8Array(maxLabel);
    let bbox = null;
    for (const L of all) {
      member[L] = 1;
      const b = boxes.get(L);
      if (b) bbox = bbox ? [Math.min(bbox[0], b[0]), Math.min(bbox[1], b[1]), Math.max(bbox[2], b[2]), Math.max(bbox[3], b[3])] : b.slice();
    }
    if (!bbox) return;
    const loops = traceRegion(lab, W, H, member, bbox).filter((l) => Math.abs(loopArea(l.xy)) >= minArea);
    if (!loops.length) return;
    let fill = '';
    for (const loop of loops) {
      // outside a lower-index region: that region draws the shared edge
      const n = loop.out.length;
      const cls = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const other = regionOfLabel(loop.out[i]);
        cls[i] = other === 0 ? 0 : other > r ? 1 : 2;
      }
      const t = loopRuns(loop, cls, ss, eps, toPage);
      if (!t) continue;
      fill += t.fill;
      for (const run of t.runs) {
        if (run.c === 0) silhouette.push(run.d);
        else if (run.c === 1) inner.push(run.d);
      }
    }
    if (!fill) return;
    const pat = patterns[idx];
    const baseColor = pat?.[0]?.color ?? reg.color ?? '#a8a196';
    const rec = { id: reg.id, name: say(reg.name), fill, swatches: [], ...(line ? { base: baseColor } : tones(r, 0, baseColor)) };
    for (let s = 1; s < (pat?.length ?? 0); s++) {
      if (line) {
        // the colouring page keeps the pattern as fine borders between colours
        // (each border once: from the swatch with the lower index, or against the base)
        const { loops: sl } = traceSet([lbl(r, s, 0), lbl(r, s, 1), lbl(r, s, 2)], minArea);
        for (const loop of sl) {
          const n = loop.out.length;
          const cls = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            const o = loop.out[i];
            const so = swatchOfLabel(o);
            cls[i] = regionOfLabel(o) === r && (so === 0 || so > s) ? 1 : 0;
          }
          const t = loopRuns(loop, cls, ss, eps, toPage);
          if (t) for (const run of t.runs) if (run.c === 1) patternLines.push(run.d);
        }
      } else {
        const d = traceSet([lbl(r, s, 0), lbl(r, s, 1), lbl(r, s, 2)], minArea).d;
        if (d) rec.swatches.push({ name: colourName(pat[s], reg), color: pat[s].color, d, ...tones(r, s, pat[s].color) });
      }
    }
    if (!line && !hatch) rec.hatch = false;
    // (the metadata keeps the English names: the same keys in every language)
    rec.palette = pat?.map((p) => ({ name: p.name, color: p.color, share: +p.share.toFixed(3) })) ?? null;
    parts.push(rec);
  });

  // ---- folds and overlaps inside a part (a coil over a coil, petal over petal)
  for (const chain of foldChains(region, id.mesh, id.depth, W, H)) {
    if (chain.length / 2 < 8 * ss) continue;
    const sm = smoothOpen(chain, 3);
    const keep = simplifyOpen(sm, 0.7 * ss);
    const pts = [];
    for (const i of keep) pts.push(...toPage(sm[i * 2], sm[i * 2 + 1]));
    if (pts.length >= 4) inner.push(pathData(bezierSegments(pts, false)));
  }

  // ---- occlusion helper (depth of the front surface per pixel)
  const tmp = new THREE.Vector3();
  const viewDepth01 = (world) => {
    tmp.copy(world).applyMatrix4(id.cam.matrixWorldInverse);
    return (-tmp.z - id.near) / Math.max(1e-6, id.far - id.near);
  };
  const project = (world) => {
    tmp.copy(world).project(id.cam);
    return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H, tmp.z];
  };
  const hiddenAt = (x, y, d01, tol, radius = 1) => {
    const cx = Math.round(x - 0.5), cy = Math.round(y - 0.5);
    let front = 0, total = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const xx = cx + dx, yy = cy + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const i = yy * W + xx;
        total++;
        if (region[i] && id.depth[i] < d01 - tol) front++;
      }
    }
    return total > 0 && front / total > 0.5;
  };
  // the depth one buffer pixel spans at a point, as a share of the depth
  // range: an ink line is hidden by a surface more than LINE_TOL_PX of them in
  // front of it (never more than 1.2 % of the range), so a guide inside a thin
  // shell (a corolla's throat, its wall 0.05 cm) stays behind the wall as the
  // reader's depth test keeps it — 1.2 % alone is ≈ 0.5 cm on Flores V
  const pxDepth01 = (world) => {
    tmp.copy(world).applyMatrix4(id.cam.matrixWorldInverse);
    const z = id.cam.isOrthographicCamera ? 1 : Math.max(1e-6, -tmp.z);
    return (2 * z) / (id.cam.projectionMatrix.elements[5] * H) / Math.max(1e-6, id.far - id.near);
  };

  // ---- figure frame (buffer px): the drawn figure, its ink lines, its markers
  let fx0 = Infinity, fy0 = Infinity, fx1 = -Infinity, fy1 = -Infinity;
  const grow = (x0, y0, x1, y1) => {
    fx0 = Math.min(fx0, x0); fy0 = Math.min(fy0, y0);
    fx1 = Math.max(fx1, x1); fy1 = Math.max(fy1, y1);
  };
  for (const [L, b] of boxes) if (L) grow(b[0], b[1], b[2] + 1, b[3] + 1);
  if (!Number.isFinite(fx0)) throw new Error('exportFigureSVG: the figure rendered no pixels (is it in view?)');

  // ---- ink lines (vector, occluded by the figure unless drawn on top)
  const lines = [];
  const linePt = new THREE.Vector3();
  for (const l of id.lines) {
    const n = l.world.length / 3;
    let run = [];
    const flush = () => {
      if (run.length >= 4) {
        const keep = simplifyOpen(run, 0.35 * ss);
        const pts = [];
        for (const i of keep) pts.push(...toPage(run[i * 2], run[i * 2 + 1]));
        if (pts.length >= 4) lines.push({ d: pathData(bezierSegments(pts, false)), width: l.width, color: l.color, dashed: l.dashed });
      }
      run = [];
    };
    for (let i = 0; i < n; i++) {
      linePt.set(l.world[i * 3], l.world[i * 3 + 1], l.world[i * 3 + 2]);
      const d01 = viewDepth01(linePt);
      const [x, y, z] = project(linePt);
      const visible = z < 1 && z > -1 && (l.onTop || !hiddenAt(x, y, d01, Math.min(LINE_TOL, LINE_TOL_PX * pxDepth01(linePt)), 0));
      if (visible) {
        run.push(x, y);
        grow(x, y, x, y);
      } else flush();
    }
    flush();
  }

  // ---- numbered labels. One whose anchor is hidden behind the figure points
  //      at the nearest visible patch of the structure it names — its own
  //      mesh where it hangs on one (the calyx, not the style beside it in the
  //      same part), else its part — that lies near the anchor in 3D (the
  //      side of the same bone, not its far end, nor a coil passing in front)
  //      and is big enough to read (not a sliver glimpsed through a throat).
  //      Failing that it is drawn hollow at the anchor only when the reader
  //      asked for it (`keep`: focused, a look-closer note) or switched its
  //      layer on, and is otherwise left out, as the reader leaves it out: an
  //      'Occipital bone' seen through a frontal skull would point into the orbit.
  //      A face feature is never covered by its own mark: an eye, a pit or a
  //      nostril is ringed (`mark: 'ring'`, the ring sized from the feature's
  //      radius) and a 'tick' leaves the anchor bare, the leader stopping short.
  const marks = [];
  if (labels) {
    const kept = typeof keep === 'function' ? null : new Set(keep ?? []);
    const asked = (lid) => (kept ? kept.has(lid) : !!keep(lid));
    const offByDefault = new Set((mount.figure.layers ?? []).filter((x) => x.visible === false).map((x) => x.id));
    const switchedOn = (layer) => !!layer && offByDefault.has(layer) && mount.layers?.[layer] === true;
    const relocate = relocator(id, ss);
    const right = new THREE.Vector3().setFromMatrixColumn(id.cam.matrixWorld, 0).normalize();
    const edge = new THREE.Vector3();
    for (const l of id.labels) {
      let [x, y, z] = project(l.world);
      if (!(z < 1 && z > -1) || x < 0 || y < 0 || x >= W || y >= H) continue;
      let hollow = false, moved = false;
      if (hiddenAt(x, y, viewDepth01(l.world), 0.02, 1)) {
        const near = l.mesh ? relocate(id.mesh, l.mesh, x, y, l.world, l.sphere)
          : l.region ? relocate(region, l.region, x, y, l.world, l.sphere) : null;
        if (near) {
          [x, y] = near;
          moved = true;
        } else if (asked(l.id) || switchedOn(l.layer)) hollow = true;
        else continue;
      }
      // a ring is drawn round the feature itself: not round a stand-in pixel
      // the leader was moved to, nor round a hidden anchor. When the anchor
      // hangs on the feature's own mesh (an eye), the ring goes round that
      // mesh's drawn pixels — an anchor on the cornea's apex projects off the
      // eye's centre in a three-quarter view
      let mark = l.mark, rr = 0;
      if (mark === 'ring') {
        if (moved || hollow) mark = 'tick';
        else {
          const [ex, ey] = project(edge.copy(l.world).addScaledVector(right, l.radius));
          rr = Math.hypot(ex - x, ey - y);
          const fit = l.mesh ? ringAround(id.mesh, l.mesh, x, y, rr, W, H, ss) : null;
          if (fit) [x, y, rr] = fit;
        }
      }
      marks.push({ n: marks.length + 1, ax: x, ay: y, text: say(l.text), detail: say(l.detail) || '', hollow, mark, rr, asked: asked(l.id) });
    }
    // two rings that would touch (a pit beside a small eye): the label the
    // reader asked for, else the one listed first, keeps its ring; the other
    // becomes a tick, as on screen
    const rings = marks.filter((m) => m.rr > 0).sort((a, b) => b.asked - a.asked || a.n - b.n);
    for (let i = 1; i < rings.length; i++) {
      const a = rings[i];
      for (let j = 0; j < i; j++) {
        const b = rings[j];
        if (b.rr > 0 && Math.hypot(a.ax - b.ax, a.ay - b.ay) < a.rr + b.rr + 4 * ss) {
          a.mark = 'tick';
          a.rr = 0;
          break;
        }
      }
    }
  }

  // ---- markers on short leaders, clear of each other and of every anchor
  const PW = Math.round(width);
  const plateScale = (cw, ch) => {
    const pad = Math.round(PW * 0.07);
    let k = (PW - pad * 2) / Math.max(1, cw);
    if (ch * k > PW * 1.25) k = (PW * 1.25) / Math.max(1, ch);
    return k;
  };
  let markerRadius;
  if (marks.length) {
    const pad0 = Math.max(fx1 - fx0, fy1 - fy0) * 0.04;
    const k0 = plateScale((fx1 - fx0 + pad0 * 2) / ss, (fy1 - fy0 + pad0 * 2) / ss);
    markerRadius = Math.max(9, PW * 0.0085) / k0; // figure units
    layoutMarkers(marks, region, W, H, markerRadius * ss);
    for (const m of marks) grow(m.x - markerRadius * ss, m.y - markerRadius * ss, m.x + markerRadius * ss, m.y + markerRadius * ss);
    for (const m of marks) [m.ax, m.ay, m.x, m.y, m.rr] = [m.ax / ss, m.ay / ss, m.x / ss, m.y / ss, m.rr / ss];
  }

  // ---- the frame is the same in both modes, so a colour plate and its
  //      colouring page register; the ground shadow only bleeds inside it
  // (snapped outwards to a coarse grid: a sub-pixel settle of the camera
  // between the two exports must not change the page size)
  const padPx = Math.round(Math.max(fx1 - fx0, fy1 - fy0) * 0.04);
  const snap = 8 * ss;
  const crop = [
    Math.floor((fx0 - padPx) / snap) * snap / ss, Math.floor((fy0 - padPx) / snap) * snap / ss,
    Math.ceil((fx1 + padPx) / snap) * snap / ss, Math.ceil((fy1 + padPx) / snap) * snap / ss,
  ];
  const groundLevels = ground && !line ? groundShadow(id, region, ss) : [];

  const figure = mount.figure;
  return composePlate({
    mode,
    width,
    crop,
    parts,
    inner,
    silhouette,
    patternLines,
    lines,
    labels: marks,
    markerRadius,
    ground: groundLevels,
    title: title ?? figure.title ?? '',
    caption,
    credit,
    palette: pal,
    lang: L,
    meta: {
      generator: 'Lámina exportFigureSVG',
      type: mount.spec?.type,
      params: mount.spec?.params,
      lang: L,
      time: +(id.time ?? 0).toFixed(3),
      keyPose,
      mode,
      frame: crop.map((v) => +v.toFixed(1)),
      parts: parts.map((p) => p.id),
      swatches: Object.fromEntries(parts.filter((p) => p.palette).map((p) => [p.id, p.palette.map((s) => `${s.name} ${s.color}`)])),
    },
  });
}

/**
 * Fill path and contour runs of one traced loop. `cls` is a class per loop
 * vertex; a segment carries the class of its START vertex — every class
 * change is a kept break, so all original vertices between two kept ones
 * share the start's class (the end vertex may already open the next run).
 */
function loopRuns(loop, cls, ss, eps, toPage) {
  const n = loop.out.length;
  const breaks = [];
  const pinned = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (cls[i] !== cls[(i + n - 1) % n]) {
      breaks.push(i);
      pinned[i] = 1;
      pinned[(i + n - 1) % n] = 1;
    }
  }
  const sm = smoothLoop(loop.xy, 2 + ss, pinned);
  const keep = simplifyLoop(sm, eps, breaks);
  const pts = [];
  const kcls = [];
  for (const i of keep) {
    const [x, y] = toPage(sm[i * 2], sm[i * 2 + 1]);
    pts.push(x, y);
    kcls.push(cls[i]);
  }
  if (pts.length < 6) return null;
  const segs = bezierSegments(pts, true);
  const fill = pathData(segs, { closed: true });
  const ns = segs.length / 8;
  const runs = [];
  const segClass = (s) => kcls[s];
  let start = 0;
  while (start < ns && segClass(start) === segClass((start + ns - 1) % ns)) start++;
  if (start === ns) {
    runs.push({ c: segClass(0), d: pathData(segs, { closed: true }) });
    return { fill, runs };
  }
  let runFrom = start;
  for (let k = 1; k <= ns; k++) {
    const s = (start + k) % ns;
    if (k === ns || segClass(s) !== segClass(runFrom)) {
      runs.push({ c: segClass(runFrom), d: runPath(segs, runFrom, k - ((runFrom - start + ns) % ns), ns) });
      runFrom = s;
    }
  }
  return { fill, runs };
}

/** Path data for `count` consecutive Bézier segments starting at `from` (wrapping). */
function runPath(segs, from, count, ns) {
  let d = '';
  for (let k = 0; k < count; k++) {
    const s = (from + k) % ns;
    const o = s * 8;
    if (k === 0) d += `M${fmt(segs[o])} ${fmt(segs[o + 1])}`;
    d += `C${fmt(segs[o + 2])} ${fmt(segs[o + 3])} ${fmt(segs[o + 4])} ${fmt(segs[o + 5])} ${fmt(segs[o + 6])} ${fmt(segs[o + 7])}`;
  }
  return d;
}

/**
 * Where a hidden label may point instead: `relocate(ids, v, x, y, world, sphere)`
 * → the centre of the nearest pixel (within RELOCATE_REACH of the frame, at
 * buffer px (x, y)) whose `ids` value is `v` — a mesh index or a region —
 * whose surface lies within RELOCATE_NEAR of the anchor `world` in 3D (the
 * pixel unprojected from its depth), and whose connected patch of `v` is big
 * enough for the structure (`sphere`: its world bounds; see RELOCATE_SHARE);
 * or null. Offsets are walked nearest first, and a patch found too small is
 * stamped so none of its pixels is tested again.
 */
function relocator(id, ss) {
  const { W, H, cam, near, far, depth } = id;
  const R = Math.round(Math.max(W, H) * RELOCATE_REACH);
  // disc offsets sorted by distance (built on the first hidden label)
  let offX = null, offY = null;
  const offsets = () => {
    const d2 = [], dx = [], dy = [];
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        if (x * x + y * y > R * R) continue;
        d2.push(x * x + y * y);
        dx.push(x);
        dy.push(y);
      }
    }
    const order = Int32Array.from(d2, (_, k) => k).sort((p, q) => d2[p] - d2[q]);
    offX = Int16Array.from(order, (k) => dx[k]);
    offY = Int16Array.from(order, (k) => dy[k]);
  };
  const maxDist = RELOCATE_NEAR * id.worldBox.getSize(new THREE.Vector3()).length();
  const capPatch = Math.round(RELOCATE_PATCH * ss * ss);
  const stamp = new Int32Array(W * H);
  const queue = new Int32Array(capPatch + 4);
  let sid = 0, minPatch = capPatch;
  const inv = cam.projectionMatrixInverse;
  const toView = cam.matrixWorldInverse;
  const a = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
  /** Buffer-px radius of a world sphere seen from the export camera. */
  const pxRadius = (sphere) => {
    p1.copy(sphere.center).project(cam);
    p2.copy(sphere.center).addScaledVector(right, sphere.radius).project(cam);
    return Math.hypot((p2.x - p1.x) * 0.5 * W, (p2.y - p1.y) * 0.5 * H);
  };
  /** View-space distance from pixel i's surface to the anchor (a). */
  const dist3 = (i) => {
    const nx = (((i % W) + 0.5) / W) * 2 - 1, ny = 1 - ((((i / W) | 0) + 0.5) / H) * 2;
    p1.set(nx, ny, 0.25).applyMatrix4(inv);
    p2.set(nx, ny, 0.75).applyMatrix4(inv);
    const zv = -(near + depth[i] * (far - near));
    const t = (zv - p1.z) / (p2.z - p1.z || 1e-9);
    return Math.hypot(p1.x + (p2.x - p1.x) * t - a.x, p1.y + (p2.y - p1.y) * t - a.y, zv - a.z);
  };
  /** Does pixel i's 4-connected patch of value v reach minPatch px? (stamps what it visits) */
  const bigPatch = (ids, v, i) => {
    let len = 0;
    queue[len++] = i;
    stamp[i] = sid;
    const visit = (k) => {
      if (stamp[k] === sid || ids[k] !== v) return false;
      stamp[k] = sid;
      queue[len++] = k;
      return len >= minPatch;
    };
    for (let h = 0; h < len; h++) {
      const j = queue[h];
      const x = j % W;
      if ((x + 1 < W && visit(j + 1)) || (x > 0 && visit(j - 1)) || (j + W < W * H && visit(j + W)) || (j >= W && visit(j - W))) return true;
    }
    return false;
  };
  return (ids, v, x, y, world, sphere) => {
    if (!offX) offsets();
    sid++;
    const rpx = sphere ? pxRadius(sphere) : Infinity;
    minPatch = Math.max(Math.round(12 * ss * ss), Math.min(capPatch, Math.round(RELOCATE_SHARE * Math.PI * rpx * rpx)));
    a.copy(world).applyMatrix4(toView);
    const cx = Math.round(x - 0.5), cy = Math.round(y - 0.5);
    for (let q = 0; q < offX.length; q++) {
      const xx = cx + offX[q], yy = cy + offY[q];
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const i = yy * W + xx;
      if (ids[i] !== v || stamp[i] === sid) continue;
      if (dist3(i) > maxDist) continue;
      if (bigPatch(ids, v, i)) return [xx + 0.5, yy + 0.5];
    }
    return null;
  };
}

/**
 * The circle round a small feature's drawn pixels near an anchor at buffer
 * px (x, y): the pixels whose `ids` value is `v` (the feature's mesh) inside
 * a window a few times the feature's projected radius `r`, as [cx, cy,
 * radius] — their centroid and the farthest of them (never less than `r`).
 * Null when too few show, or when they run on to the window's edge (the mesh
 * is no small feature, the head rather than the eye): the ring then stays on
 * the anchor.
 */
function ringAround(ids, v, x, y, r, W, H, ss) {
  const R = Math.ceil(Math.max(r * 3, 8 * ss));
  const x0 = Math.max(0, Math.floor(x) - R), x1 = Math.min(W - 1, Math.floor(x) + R);
  const y0 = Math.max(0, Math.floor(y) - R), y1 = Math.min(H - 1, Math.floor(y) + R);
  let n = 0, sx = 0, sy = 0;
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      if (ids[yy * W + xx] !== v) continue;
      if (xx === x0 || xx === x1 || yy === y0 || yy === y1) return null;
      n++;
      sx += xx + 0.5;
      sy += yy + 0.5;
    }
  }
  if (n < 4 * ss * ss) return null;
  const cx = sx / n, cy = sy / n;
  let far = 0;
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      if (ids[yy * W + xx] === v) far = Math.max(far, Math.hypot(xx + 0.5 - cx, yy + 0.5 - cy));
    }
  }
  return [cx, cy, Math.max(r, far + 0.5)];
}

/**
 * Atlas-style marker placement: each numbered disc sits on a leader from its
 * anchor, pushed outwards from the figure, never over its own anchor, another
 * anchor or another disc, and on paper rather than over the drawing: an
 * anchor inside a dense cluster (a passion flower's corona, a lily's stamens)
 * sends its disc out to the nearest paper, up to 16 radii away (MARKER_STEPS),
 * on a haloed leader that crosses no other (buffer px). A ringed anchor
 * (`rr`: the ring's radius) keeps discs and other leaders off its ring, and
 * its own leader is measured from the ring.
 */
function layoutMarkers(marks, region, W, H, r) {
  let cx = 0, cy = 0, c = 0;
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      if (region[y * W + x]) {
        cx += x; cy += y; c++;
      }
    }
  }
  cx = c ? cx / c : W / 2;
  cy = c ? cy / c : H / 2;
  /** Share of a disc of radius `rr` at (x, y) that lies over the drawing (rings of samples). */
  const cover = (x, y, rr = r) => {
    let n = 0, t = 0;
    for (let k = 0; k < COVER_RING.length; k += 2) {
      const xx = Math.round(x + COVER_RING[k] * rr), yy = Math.round(y + COVER_RING[k + 1] * rr);
      t++;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && region[yy * W + xx]) n++;
    }
    return n / t;
  };
  const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    const L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  /** Do segments a→b and c→d cross (shared end points do not count)? */
  const crosses = (ax, ay, bx, by, qx, qy, ex, ey) => {
    const o = (px, py, sx, sy, tx, ty) => (sx - px) * (ty - py) - (sy - py) * (tx - px);
    const d1 = o(qx, qy, ex, ey, ax, ay), d2 = o(qx, qy, ex, ey, bx, by);
    const d3 = o(ax, ay, bx, by, qx, qy), d4 = o(ax, ay, bx, by, ex, ey);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  // the most buried anchors first: they need the scarce paper near them,
  // while a label at the figure's edge finds paper on any side
  const order = marks.map((m, i) => ({ m, i, buried: cover(m.ax, m.ay, r * 2.3) }));
  order.sort((a, b) => b.buried - a.buried || a.i - b.i);
  const placed = [];
  for (const { m } of order) {
    const out = Math.atan2(m.ay - cy, m.ax - cx);
    let best = null;
    for (const f of MARKER_STEPS) {
      const dist = f * r + (m.rr ?? 0);
      // a longer leader costs less per radius once past the short ones: paper
      // a little further away beats a disc over the drawing
      const reach = f <= 6.8 ? f : 6.8 + (f - 6.8) * 0.55;
      for (let k = 0; k < 24; k++) {
        const a = out + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12);
        const x = m.ax + Math.cos(a) * dist, y = m.ay + Math.sin(a) * dist;
        if (x < r || y < r || x > W - r || y > H - r) continue;
        if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 2.3 * r)) continue;
        let pen = 0;
        for (const o of marks) {
          const rr = o.rr ?? 0;
          if (Math.hypot(o.ax - x, o.ay - y) < Math.max(1.45 * r, rr + 1.25 * r)) pen += 5;
          else if (o !== m && segDist(o.ax, o.ay, m.ax, m.ay, x, y) < Math.max(r * 0.8, rr)) pen += 3; // a leader through another anchor
        }
        for (const p of placed) {
          if (segDist(p.x, p.y, m.ax, m.ay, x, y) < r * 1.1) pen += 3; // this leader under a disc
          if (segDist(x, y, p.ax, p.ay, p.x, p.y) < r * 1.1) pen += 3; // this disc over a leader
          if (crosses(m.ax, m.ay, x, y, p.ax, p.ay, p.x, p.y)) pen += 6;
        }
        let turn = Math.abs(a - out) % (Math.PI * 2);
        if (turn > Math.PI) turn = Math.PI * 2 - turn;
        const score = reach + cover(x, y) * 9 + pen + (turn / Math.PI) * 1.2;
        if (!best || score < best.score) best = { x, y, score };
      }
    }
    if (!best) best = { x: Math.min(W - r, m.ax + 2.3 * r), y: m.ay };
    m.x = best.x;
    m.y = best.y;
    placed.push({ x: m.x, y: m.y, ax: m.ax, ay: m.ay });
  }
}

/**
 * A patch of ground shadow is kept when some part casting into it comes
 * within GROUND_CONTACT of the paper (in the shadow's fall-off scale, 6 % of
 * the figure's size: where its shade is still half strength), or when at
 * least GROUND_UNDER of it lies under the figure; see dropUngrounded.
 */
const GROUND_CONTACT = 1;
const GROUND_UNDER = 0.3;

/** Ground shadow levels (path data in figure units, stacked opacities). */
function groundShadow(id, region, ss) {
  const g = shadowGrid({ region, depth: id.depth, W: id.W, H: id.H, cam: id.cam, near: id.near, far: id.far, keyDir: id.keyDir, paperY: id.paperY, worldBox: id.worldBox, ss });
  if (!g) return [];
  const { grid, GW, GH, cell } = g;
  const out = [];
  const levels = [[0.12, 0.035], [0.3, 0.04], [0.55, 0.045], [0.8, 0.04]];
  // shade where the figure meets the paper: a patch only raised parts cast,
  // lying beside them (a head lifted over the coils, a tail hanging beside
  // the skull), would read as a stain, and goes
  dropUngrounded(g, levels[0][0], GROUND_CONTACT, GROUND_UNDER);
  const bin = new Uint16Array(GW * GH);
  for (const [level, opacity] of levels) {
    let any = false;
    for (let i = 0; i < bin.length; i++) {
      bin[i] = grid[i] >= level ? 1 : 0;
      any ||= bin[i] === 1;
    }
    if (!any) continue;
    const member = new Uint8Array(2);
    member[1] = 1;
    let d = '';
    for (const loop of traceRegion(bin, GW, GH, member, [0, 0, GW - 1, GH - 1])) {
      if (Math.abs(loopArea(loop.xy)) < 3) continue;
      const sm = smoothLoop(loop.xy, 4);
      const keep = simplifyLoop(sm, 0.35);
      const pts = [];
      for (const i of keep) pts.push((sm[i * 2] * cell) / ss, (sm[i * 2 + 1] * cell) / ss);
      if (pts.length < 6) continue;
      d += pathData(bezierSegments(pts, true, 150), { closed: true });
    }
    if (d) out.push({ d, opacity });
  }
  return out;
}
