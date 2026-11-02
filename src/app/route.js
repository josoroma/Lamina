// Hash routing, language first: #/<lang>/ (library) ·
// #/<lang>/<book>?plate=3&t=2.5&ui=0&labels=1&explode=0, with <lang> one of
// LANGS ('en', 'es'). The query lives inside the hash so static hosting needs
// no rewrites. A route that names no language — #/, #/serpientes (links from
// before the editions) — or names it with the ?lang=es alias
// (index.html?lang=es#/serpientes) is resolved and rewritten in place by boot.
import { getLang, isLang } from '../i18n/index.js';

/** A two-letter first segment is a language code: book ids never are (validate-books). */
const LANG_SEGMENT = /^[a-z]{2}$/i;

/** The route the hash itself names (location.search left out). */
function parseHash(hash) {
  const raw = String(hash ?? '').replace(/^#\/?/, '');
  const q = raw.indexOf('?');
  const segs = (q < 0 ? raw : raw.slice(0, q)).split('/').filter(Boolean);
  let lang = null;
  // an unsupported code (#/fr/serpientes) is still a language segment: the route resolves a language
  if (segs.length && LANG_SEGMENT.test(segs[0])) {
    const code = segs.shift().toLowerCase();
    if (isLang(code)) lang = code;
  }
  // book ids are lowercase (src/books/<id>.js): #/ES/Serpientes opens serpientes
  return { lang, book: segs[0]?.toLowerCase() ?? null, query: q < 0 ? '' : raw.slice(q + 1) };
}

/**
 * @param {string} [hash]
 * @returns {{ lang: 'en'|'es'|null, book: string|null, params: URLSearchParams }}
 *   lang is null when the route names none (boot resolves it); `lang` never
 *   appears in params.
 */
export function parseRoute(hash = location.hash) {
  const { lang, book, query } = parseHash(hash);
  const params = new URLSearchParams(query);
  // also honour real query params (?plate=…) for convenience
  for (const [k, v] of new URLSearchParams(location.search)) if (!params.has(k)) params.set(k, v);
  // ?lang=es names the language when the path does not (the segment wins)
  const alias = params.get('lang')?.toLowerCase();
  params.delete('lang');
  return { lang: lang ?? (isLang(alias) ? alias : null), book, params };
}

/**
 * '#/es/serpientes?plate=3', '#/es/' (the library).
 * @param {{ lang?: string, book?: string|null, params?: URLSearchParams|Record<string, string|number> }} route
 */
export function routeHash({ lang = getLang(), book = null, params } = {}) {
  const q = new URLSearchParams(params ?? {});
  q.delete('lang');
  const qs = q.toString();
  return `#/${lang}/${book ?? ''}${qs ? `?${qs}` : ''}`;
}

/** The same route in another language (its query kept as written, but for a ?lang= alias). */
export function withLang(hash, lang) {
  const { book, query } = parseHash(hash);
  let qs = query;
  const q = new URLSearchParams(query);
  if (q.has('lang')) {
    q.delete('lang');
    qs = q.toString();
  }
  return `#/${lang}/${book ?? ''}${qs ? `?${qs}` : ''}`;
}

/** Link to a book: '#/es/flores', '#/en/serpientes?plate=3'. */
export function bookHref(id, params = {}, lang = getLang()) {
  return routeHash({ lang, book: id, params });
}

/** Link to the library: '#/es/'. */
export function libraryHref(lang = getLang()) {
  return routeHash({ lang });
}

/**
 * Point the current history entry at `hash` without a new entry or a
 * hashchange (MDN: replaceState fires neither). The entry's state is kept and
 * the ?lang= alias leaves the query (the hash names the language from now on);
 * every other real query parameter (?gl=webgl) stays.
 */
export function replaceHash(hash) {
  const search = new URLSearchParams(location.search);
  let qs = location.search.replace(/^\?/, '');
  if (search.has('lang')) {
    search.delete('lang');
    qs = search.toString();
  }
  const url = `${location.pathname}${qs ? `?${qs}` : ''}${hash}`;
  if (url !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(history.state, '', url);
}
