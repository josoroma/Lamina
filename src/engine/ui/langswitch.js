// Language switch: "English · Español", a two-option radio group.
//
// One small component for the reader's top bar and the library header. It
// needs no .lam-ui ancestor: its stylesheet is imported here, every rule in
// it carries at least two classes (a host's `header span` rule must not
// restyle it), and its colours fall back when no --lam-* theme is set.
//
// Semantics follow the WAI-ARIA APG radio group: the group is
// role="radiogroup", named by t('Language'); each option is role="radio"
// with aria-checked; Tab enters on the checked option (roving tabindex);
// the arrows, Home and End move *and* check (wrapping), Space checks. Every
// key the group uses is preventDefault-ed, so a reader listening on the
// window (page turns on ← →) leaves it alone. The options are autonyms
// ("English", "Español"), each with its own lang attribute, never
// translated; only the group's label follows the page's language.
//
// Choosing calls onChange(lang) at once and shows the choice; the owner
// confirms with set(lang) once the edition is in place (or reverts with
// set(previous)), and marks a slow first switch with setBusy(true).
import './langswitch.css';
import { t, LANGS, LANG_NAMES, LANG_SHORT, getLang, isLang } from '../../i18n/index.js';

/**
 * @param {object} [o]
 * @param {'en'|'es'} [o.value]        the checked language (default: the current one)
 * @param {(lang: 'en'|'es') => void} [o.onChange]  the reader picked another language
 * @param {'auto'|'full'|'compact'} [o.size]  'full': English · Español; 'compact': EN · ES;
 *        'auto': full, compact at 480 px wide and below
 * @param {string} [o.className]       extra classes on the group
 * @returns {{ el: HTMLDivElement, readonly value: string, set: (lang: string) => void,
 *             setBusy: (on: boolean) => void, destroy: () => void }}
 */
export function createLangSwitch({ value = getLang(), onChange = () => {}, size = 'auto', className = '' } = {}) {
  let current = isLang(value) ? value : getLang();
  const el = document.createElement('div');
  el.className = `lam-lang lam-lang--${['full', 'compact'].includes(size) ? size : 'auto'}${className ? ` ${className}` : ''}`;
  el.setAttribute('role', 'radiogroup');

  const options = LANGS.map((lang) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lam-lang-opt';
    b.setAttribute('role', 'radio');
    b.lang = lang;
    b.dataset.lang = lang;
    b.setAttribute('aria-label', LANG_NAMES[lang]);
    const long = document.createElement('span');
    long.className = 'lam-lang-long';
    long.textContent = LANG_NAMES[lang];
    const short = document.createElement('span');
    short.className = 'lam-lang-short';
    short.setAttribute('aria-hidden', 'true');
    short.textContent = LANG_SHORT[lang];
    b.append(long, short);
    return b;
  });
  options.forEach((b, i) => {
    if (i) {
      const dot = document.createElement('span');
      dot.className = 'lam-lang-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.textContent = '·';
      el.append(dot);
    }
    el.append(b);
  });

  /** Show `lang` as checked (no event, focus stays where it is). */
  function set(lang) {
    if (isLang(lang)) current = lang;
    for (const b of options) {
      const on = b.dataset.lang === current;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    el.setAttribute('aria-label', t('Language'));
  }

  function choose(lang) {
    if (lang === current) return;
    set(lang);
    onChange(lang);
  }

  const onClick = (e) => {
    const b = e.target.closest?.('.lam-lang-opt');
    if (!b || !el.contains(b)) return;
    choose(b.dataset.lang);
    // a mouse click must not leave focus parked here: a later Space would
    // re-check this option instead of reaching the page (play/pause)
    if (e.detail > 0 && document.activeElement === b) b.blur();
  };

  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const i = options.indexOf(e.target.closest?.('.lam-lang-opt'));
    if (i < 0) return;
    const n = options.length;
    let j;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        j = (i + 1) % n;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        j = (i - 1 + n) % n;
        break;
      case 'Home':
        j = 0;
        break;
      case 'End':
        j = n - 1;
        break;
      case ' ':
      case 'Spacebar':
        j = i;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (j !== i) options[j].focus();
    choose(options[j].dataset.lang);
  };

  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKey);
  set(current);

  return {
    el,
    get value() {
      return current;
    },
    set,
    /** @param {boolean} on  a requested language is still loading */
    setBusy(on) {
      if (on) el.setAttribute('aria-busy', 'true');
      else el.removeAttribute('aria-busy');
    },
    destroy() {
      el.removeEventListener('click', onClick);
      el.removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
