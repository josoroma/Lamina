/**
 * Slow a figure's model clock so its shortest caption gets reading time.
 * Beats stay synchronized with their actual figure poses: only the model
 * clock changes, never the page-turn, layer-dissolve or folding clocks.
 * One rate per spread prevents speed jumps at sentence boundaries.
 */
export function recommendedPlaybackRate(beats, duration = 5) {
  if (!Number.isFinite(duration) || duration <= 0 || !Array.isArray(beats)) return 1;
  const rows = beats.map((b) => Array.isArray(b) ? { t: Number(b[0]), text: b[1] } : b)
    .filter((b) => b && Number.isFinite(b.t) && b.t >= 0 && b.t < duration && typeof b.text === 'string' && b.text.trim())
    .sort((a, b) => a.t - b.t);
  let rate = 1;
  for (let i = 0; i < rows.length; i++) {
    const current = rows[i];
    const next = rows[(i + 1) % rows.length];
    const span = next.t - current.t + (i === rows.length - 1 ? duration : 0);
    if (!(span > 0)) continue; // duplicate timestamps do not describe a visible interval
    const words = current.text.trim().split(/\s+/u).length;
    const readingSeconds = Math.max(4, words / 2.5 + 0.8); // 150 wpm plus a short settling pause
    rate = Math.min(rate, span / readingSeconds);
  }
  return rate;
}
