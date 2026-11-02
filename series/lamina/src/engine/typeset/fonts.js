// Webfont loading and font roles for the page typesetter.
//
// Pages are painted into canvases, and a canvas never repaints when a webfont
// arrives later — so every face a page uses must be loaded *before* it is
// drawn. Faces are self-hosted through @fontsource (CSS imported on demand)
// and awaited with document.fonts.load(sample): unicode-range means only the
// subset files the sample touches are fetched. Every face gets the Latin
// subset; a character beyond it (the š of a cited author) is added only to
// the sample of the face that actually sets it — the typesetter finds those
// with a miniature typeset (index.js) — so one name in one citation never
// pulls the extended subset of every family and weight. A timeout keeps pages
// rendering with the Georgia/serif fallback stacks if the network is slow;
// the fallback stacks are always part of every font string.

/** Default family per typographic role (CONTRACTS §6/§13). */
export const DEFAULT_FONTS = {
  display: 'Cormorant Garamond',
  body: 'EB Garamond',
  label: 'IBM Plex Sans Condensed',
  mono: 'IBM Plex Mono',
  condensed: 'Oswald',
};

const FALLBACK = {
  display: '"EB Garamond", Georgia, "Times New Roman", serif',
  body: 'Georgia, "Times New Roman", serif',
  label: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif',
  mono: 'Menlo, Consolas, "Courier New", monospace',
  condensed: '"Arial Narrow", "Helvetica Neue", Impact, sans-serif',
};

// Faces each role uses: [weight, italic]. Kept minimal on purpose.
const ROLE_FACES = {
  display: [[500, false], [600, false], [500, true], [600, true]],
  body: [[400, false], [400, true], [500, false], [600, false]],
  label: [[400, false], [500, false], [600, false]],
  mono: [[400, false], [500, false]],
  condensed: [[500, false], [600, false]],
};

// Static import map so Vite can bundle the @font-face CSS (one file per weight/style).
const SOURCES = {
  'Cormorant Garamond': {
    '500': () => import('@fontsource/cormorant-garamond/500.css'),
    '600': () => import('@fontsource/cormorant-garamond/600.css'),
    '500i': () => import('@fontsource/cormorant-garamond/500-italic.css'),
    '600i': () => import('@fontsource/cormorant-garamond/600-italic.css'),
  },
  'EB Garamond': {
    '400': () => import('@fontsource/eb-garamond/400.css'),
    '400i': () => import('@fontsource/eb-garamond/400-italic.css'),
    '500': () => import('@fontsource/eb-garamond/500.css'),
    '600': () => import('@fontsource/eb-garamond/600.css'),
  },
  'IBM Plex Sans Condensed': {
    '400': () => import('@fontsource/ibm-plex-sans-condensed/400.css'),
    '500': () => import('@fontsource/ibm-plex-sans-condensed/500.css'),
    '600': () => import('@fontsource/ibm-plex-sans-condensed/600.css'),
  },
  'IBM Plex Mono': {
    '400': () => import('@fontsource/ibm-plex-mono/400.css'),
    '500': () => import('@fontsource/ibm-plex-mono/500.css'),
  },
  Oswald: {
    '500': () => import('@fontsource/oswald/500.css'),
    '600': () => import('@fontsource/oswald/600.css'),
  },
};

// Basic Latin + Latin-1 + typographic punctuation: pulls the "latin" subset.
const LATIN_SAMPLE = 'AaBbGgQqRr0123 ÁáÉéÍíÑñÓóÚúÜü — “”‘’ · … ×';

// What the @fontsource "latin" subset covers (its unicode-range); any other
// character needs another subset file (latin-ext, greek…) of its face.
const LATIN_SUBSET = /[\u0000-\u00ff\u0131\u0152\u0153\u02bb\u02bc\u02c6\u02da\u02dc\u0304\u0308\u0329\u2000-\u206f\u20ac\u2122\u2191\u2193\u2212\u2215\ufeff\ufffd]/;
const ONLY_LATIN = new RegExp(`^${LATIN_SUBSET.source}*$`);

/** The characters of `text` the Latin subset does not cover ('' for most text). */
export function beyondLatin(text) {
  if (ONLY_LATIN.test(text)) return '';
  let out = '';
  for (const ch of text) if (!LATIN_SUBSET.test(ch) && !out.includes(ch)) out += ch;
  return out;
}

// Families designed without italics: italic text in these roles is set in the
// body face's italic instead of a synthesized slant.
const NO_ITALIC = new Set(['Oswald', 'Bebas Neue', 'Anton', 'League Gothic', 'Big Shoulders Display']);

/** Whether a family has true italics (bundled or assumed for unknown families). */
export function hasItalic(family) {
  if (NO_ITALIC.has(family)) return false;
  const src = SOURCES[family];
  if (!src) return true;
  return Object.keys(src).some((k) => k.endsWith('i'));
}

const facePromises = new Map(); // "family|weight|italic|sample" → Promise<boolean>
const listeners = new Set();
let generation = 0;

/** Font families for a theme, filled with defaults. */
export function themeFonts(theme = {}) {
  return { ...DEFAULT_FONTS, ...(theme.fonts ?? {}) };
}

/**
 * CSS font shorthand for canvas, always with a fallback stack.
 * @param {object} fonts  role → family map (themeFonts)
 * @param {'display'|'body'|'label'|'mono'|'condensed'} role
 * @param {number} size   px
 * @param {number} [weight=400]
 * @param {boolean} [italic=false]
 */
export function fontString(fonts, role, size, weight = 400, italic = false) {
  let fam = fonts[role] ?? DEFAULT_FONTS[role] ?? DEFAULT_FONTS.body;
  if (italic && !hasItalic(fam) && role !== 'body') {
    // no true italic in this family: use the body face's italic
    role = 'body';
    fam = fonts.body ?? DEFAULT_FONTS.body;
    weight = 400; // the body italic is loaded at 400 only
  }
  const fb = FALLBACK[role] ?? FALLBACK.body;
  return `${italic ? 'italic ' : ''}${weight} ${Math.max(1, Math.round(size * 100) / 100)}px "${fam}", ${fb}`;
}

/**
 * The face a fontString() sets, as loadFonts keys it ('family|weight|italic'),
 * or null for a font string fontString() did not make.
 */
export function faceKey(font) {
  const m = /^(italic )?(\d+) [\d.]+px "([^"]+)"/.exec(font);
  return m ? `${m[3]}|${+m[2]}|${!!m[1]}` : null;
}

/** Bumped whenever new faces finish loading; text measurement caches key on it. */
export function fontGeneration() {
  return generation;
}

/** Subscribe to font-load completion (used to flush measurement caches). */
export function onFontsChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Load the webfonts a theme uses (CONTRACTS §7). Resolves when every face is
 * ready or when `timeout` ms have passed — pages then render with the
 * fallback stacks, never blank.
 * @param {object} [theme]  manifest.theme ({ style, fonts })
 * @param {object} [opts]
 * @param {object} [opts.manifest]  decides whether the condensed face is
 *   needed; without `glyphs`, every face also fetches the subsets for any of
 *   its characters beyond Latin (the safe, heavier fallback)
 * @param {Map<string, string>} [opts.glyphs]  face key (faceKey) → the
 *   characters beyond the Latin subset that face sets: only those faces fetch
 *   another subset
 * @param {boolean} [opts.only=false]  load only the faces `glyphs` lists (a
 *   caller that prints a few sides, e.g. the library's covers)
 * @param {number} [opts.timeout=4000]
 * @returns {Promise<{ ok: boolean, loaded: string[], failed: string[], ms: number }>}
 */
export async function loadFonts(theme = {}, { manifest = null, glyphs = null, only = false, timeout = 4000 } = {}) {
  const t0 = performance.now();
  if (typeof document === 'undefined' || !document.fonts) return { ok: false, loaded: [], failed: [], ms: 0 };
  const fonts = themeFonts(theme);
  const roles = ['display', 'body', 'label', 'mono'];
  const lessons = manifest?.plates?.some((p) => p.layout === 'lesson');
  if (theme.style === 'engraving' || theme.fonts?.condensed || lessons) roles.push('condensed');
  const everyFace = glyphs || !manifest ? '' : manifestGlyphs(manifest);

  const jobs = [];
  const names = [];
  const seen = new Set();
  for (const role of roles) {
    const family = fonts[role];
    for (const [weight, italic] of ROLE_FACES[role]) {
      if (italic && !hasItalic(family)) continue; // set in the body italic instead
      const id = `${family}|${weight}|${italic}`;
      if (seen.has(id)) continue;
      seen.add(id);
      if (only && glyphs && !glyphs.has(id)) continue;
      names.push(`${family} ${weight}${italic ? ' italic' : ''}`);
      jobs.push(loadFace(family, weight, italic, LATIN_SAMPLE + (glyphs?.get(id) ?? everyFace)));
    }
  }
  let timer;
  const timedOut = new Promise((res) => {
    timer = setTimeout(() => res('timeout'), timeout);
  });
  const all = Promise.all(jobs);
  const r = await Promise.race([all, timedOut]);
  clearTimeout(timer);
  const loaded = [];
  const failed = [];
  if (r === 'timeout') {
    console.warn(`[typeset] webfonts not ready after ${timeout} ms — rendering with fallback faces`);
    names.forEach((n) => failed.push(n));
    // keep listening: when they do arrive, caches flush and callers may re-render
    all.then(() => bump());
  } else {
    r.forEach((ok, i) => (ok ? loaded : failed).push(names[i]));
    if (failed.length) console.warn('[typeset] some faces unavailable, using fallbacks:', failed.join(', '));
  }
  bump();
  return { ok: failed.length === 0, loaded, failed, ms: Math.round(performance.now() - t0) };
}

function bump() {
  generation++;
  listeners.forEach((fn) => fn(generation));
}

function loadFace(family, weight, italic, sample) {
  const key = `${family}|${weight}|${italic}|${sample}`;
  if (facePromises.has(key)) return facePromises.get(key);
  const src = SOURCES[family]?.[`${weight}${italic ? 'i' : ''}`];
  const p = (async () => {
    try {
      if (src) await src();
      else if (!SOURCES[family]) {
        // An unbundled family: maybe the host page provides it; otherwise fallback.
        console.warn(`[typeset] font "${family}" is not bundled; relying on page CSS or fallback`);
      }
      const spec = `${italic ? 'italic ' : ''}${weight} 32px "${family}"`;
      const faces = await document.fonts.load(spec, sample);
      return faces.length > 0;
    } catch (e) {
      console.warn(`[typeset] failed to load ${family} ${weight}${italic ? ' italic' : ''}`, e);
      return false;
    }
  })();
  facePromises.set(key, p);
  return p;
}

/**
 * Every character beyond the Latin subset anywhere in a value (a manifest, a
 * page spec), e.g. 'š'; '' when there is none.
 */
export function manifestGlyphs(value) {
  let out = '';
  const visit = (v) => {
    if (typeof v === 'string') {
      for (const ch of beyondLatin(v)) if (!out.includes(ch)) out += ch;
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(value);
  return out;
}
