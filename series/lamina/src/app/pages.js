// Page textures: typeset canvases → GPU textures, rendered lazily around the
// current spread and evicted LRU. Each page is uploaded as soon as it is
// printed and its 2D canvas is freed at once: the GPU copy is all the book
// samples, and a 2048 × 2826 canvas is another 22 MB of CPU/IOSurface memory
// per page (a retina reader held ~0.7 GB of them). Budget: `capacity` pages
// of ~30 MB (2048 px, with mips) or ~17 MB (1536 px) on the GPU.
//
// A language switch swaps the specs (setSides): the pages on screen are
// re-printed at once — from canvases typeset ahead (print()) while the new
// edition loaded — and every other page is dropped, to be printed again
// when it is wanted. Nothing is kept "stale": a page in the cache is always
// a page of the current edition.
import * as THREE from 'three/webgpu';
import { renderPage } from '../engine/typeset/index.js';

export class PageCache {
  /**
   * @param {object} o
   * @param {THREE.WebGPURenderer} o.renderer
   * @param {object[]} o.sides     page specs from buildSides()
   * @param {object} o.theme
   * @param {number} o.width       canvas width in px
   * @param {Function} [o.stepDrawer]
   * @param {number} [o.capacity]  max textures kept (pages in `keep` may exceed it briefly)
   */
  constructor({ renderer, sides, theme, width, stepDrawer, capacity = 8 }) {
    this.renderer = renderer;
    this.sides = sides;
    this.theme = theme;
    this.width = width;
    this.stepDrawer = stepDrawer;
    this.capacity = capacity;
    this.cache = new Map(); // side index → { texture, hits, used }
    this.tick = 0;
    this.maxAniso = renderer.getMaxAnisotropy?.() ?? 8;
    this._keep = new Set();
  }

  has(i) {
    return this.cache.has(i);
  }

  hits(i) {
    return this.cache.get(i)?.hits ?? [];
  }

  /** Whether side i is in the current keep set (see keep()). */
  isKept(i) {
    return this._keep.has(i);
  }

  /** The sides in the current keep set. */
  kept() {
    return [...this._keep];
  }

  /** Render (or fetch) the texture for side i. */
  get(i) {
    const hit = this.cache.get(i);
    if (hit) {
      hit.used = ++this.tick;
      return hit.texture;
    }
    const printed = this.print(i);
    if (!printed) return null;
    const texture = this._adopt(i, printed);
    this._evict(this._keep, i);
    return texture;
  }

  /**
   * Typeset side i of `sides` (default: the current specs) into a canvas,
   * without uploading it. Pages are pure functions of their spec, so a
   * language switch prints the pages on screen ahead, while nothing visible
   * changes yet, and refresh() adopts them.
   * @param {number} i
   * @param {object[]} [sides]
   * @returns {{ canvas: HTMLCanvasElement, hits: object[], spec: object } | null}
   */
  print(i, sides = this.sides) {
    const spec = sides[i];
    if (!spec) return null;
    try {
      const { canvas, hits } = renderPage(spec, {
        theme: this.theme,
        width: this.width,
        stepDrawer: this.stepDrawer ? (g, step, box) => this.stepDrawer(g, spec, step, box) : undefined,
      });
      return { canvas, hits: hits ?? [], spec };
    } catch (err) {
      console.error('[pages] render failed', spec?.layout, err);
      return null;
    }
  }

  /** Wrap a printed canvas as side i's texture, upload it and free the canvas. */
  _adopt(i, { canvas, hits, spec }) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(16, this.maxAniso);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.name = `page-${i}-${spec?.layout}`;
    this.cache.set(i, { texture, hits, used: ++this.tick });
    try {
      // Upload now (inside the print budget) and free the canvas. Not in
      // texture.onUpdate: three records renderer.info sizes after it runs.
      // The texture is never re-uploaded (its version never changes).
      this.renderer.initTexture(texture);
      releaseCanvas(canvas);
    } catch (err) {
      console.warn('[pages] upload deferred to first draw', err); // keeps the canvas; three uploads it when drawn
    }
    return texture;
  }

  /**
   * A new edition of the same book (a language switch): the same page
   * structure, new specs. Every cached page is dropped (onEvict puts a blank
   * on its leaf) except `onScreen`, whose old textures stay on their leaves
   * until refresh() replaces them, so no visible page goes blank.
   * @param {object[]} sides
   * @param {Iterable<number>} [onScreen]
   */
  setSides(sides, onScreen = []) {
    this.sides = sides;
    const shown = new Set(onScreen);
    for (const [j, e] of [...this.cache]) {
      if (shown.has(j)) continue;
      this._drop(e);
      this.cache.delete(j);
      this.onEvict?.(j);
    }
  }

  /**
   * Re-print side i from the current specs, adopting `printed` (from print())
   * when it was typeset from this very spec. Returns the new texture and the
   * entry it replaces: the caller puts the new texture on its leaf first and
   * then free()s the old one, so no frame ever draws a freed texture. If the
   * page cannot be printed the old texture stays (the old language beats a
   * blank page).
   * @param {number} i
   * @param {{ canvas, hits, spec }|null} [printed]
   * @returns {{ texture: THREE.Texture|null, old: object|null }}
   */
  refresh(i, printed = null) {
    const old = this.cache.get(i) ?? null;
    const p = printed && printed.spec === this.sides[i] ? printed : this.print(i);
    if (printed && p !== printed) releaseCanvas(printed.canvas);
    if (!p) return { texture: old?.texture ?? null, old: null };
    this.cache.delete(i);
    return { texture: this._adopt(i, p), old };
  }

  /** Free an entry refresh() replaced (after its leaf took the new texture). */
  free(old) {
    if (old) this._drop(old);
  }

  /** Free a canvas print() returned that was never adopted. */
  discard(printed) {
    if (printed) releaseCanvas(printed.canvas);
  }

  /**
   * Drop textures beyond capacity (least recently used), never those in
   * `keep` and never `protect` (the page get() is about to hand out: a
   * disposed texture on a leaf would re-upload from a freed canvas).
   */
  _evict(keep = this._keep, protect = -1) {
    if (this.cache.size <= this.capacity) return;
    const entries = [...this.cache.entries()].filter(([j]) => j !== protect && !keep?.has(j)).sort((a, b) => a[1].used - b[1].used);
    while (this.cache.size > this.capacity && entries.length) {
      const [j, e] = entries.shift();
      this._drop(e);
      this.cache.delete(j);
      this.onEvict?.(j);
    }
  }

  /** Free an entry: GPU texture and (if still held) its canvas pixels. */
  _drop(e) {
    const c = e.texture.image;
    e.texture.dispose();
    releaseCanvas(c);
  }

  /** Mark sides as in-use so eviction keeps them. */
  keep(indices) {
    this._keep = new Set(indices);
  }

  /**
   * Drop what is beyond capacity now (least recently used, never kept
   * sides): after a narrower keep() — a jump that held its source pages has
   * landed — instead of at the next print, which may be minutes away.
   */
  trim() {
    this._evict(this._keep);
  }

  dispose() {
    for (const e of this.cache.values()) this._drop(e);
    this.cache.clear();
    this._keep = new Set();
    this.onEvict = null;
  }
}

/** Shrink a 2D canvas to 1 × 1 (frees its backing store; 0 × 0 would fail a later upload). */
function releaseCanvas(c) {
  if (!c || !(c.width > 1 || c.height > 1)) return;
  c.width = 1;
  c.height = 1;
}
