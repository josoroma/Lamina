# Motion: the seamless 5-second scientific loop

Every plate carries one animation that loops forever, lasts exactly **5 seconds** and
teaches one thing: a strike, a bloom, a jaw on its hinge. It must be impossible to
see where the loop restarts.

## The rule that makes everything work

`figure.update(t, dt, state)` is a **pure function of `t ∈ [0, 5)`**. No accumulated
state, no `+= dt` integration, no random numbers at run time. Then:

- scrubbing works (the UI time slider, `lamina.setTime(t)`),
- captures are deterministic (`?t=2.4`),
- `update(0)` and `update(5)` give the same pose, so the loop is seamless by construction,
- reduced motion = freeze at a representative `t`.

Use `dt` only for cosmetic damping that tolerates scrubbing (e.g. label fades).

## Building blocks (src/engine/util/math.js)

| need | recipe |
|---|---|
| periodic motion | `Math.sin(2π·k·t/5)` with **integer** `k` |
| one event per loop | `loopPulse(phase, centre, halfWidth)`: a smooth bump that wraps at the seam |
| ease into/out of a held pose | `smoothstep(a, b, phase)` pairs that return to the start value before `phase = 1` |
| travelling waves (slither, corona ripple) | `sin(k_s·s − 2π·n·t/5)` with integer `n` |
| motion along a closed path | arc-length parameter `u = (u0 + t/5·L_path) mod L_path`; loop length = an integer multiple of the path |
| one-off "drop" (a falling corolla) | animate a *copy*: it detaches at 1.2 s and falls while the original regrows (fade/scale) before 5 s |
| blinks, flicks | short pulses (≤ 0.4 s) placed away from the seam |

## Choreography

Write the loop as 3–5 **beats** (`figure.beats` / manifest `animation.beats`), each a
`[t, text]` pair the UI shows as a caption. The times belong to the motion and are the
same in both editions (the Spanish manifest takes them from English); only the text is
translated — in the Spanish manifest, or for a figure's own beats in its dictionary:

```
[0.0, 'Coiled, tongue flicking — tasting the air']
[1.6, 'Strike: the head covers ~⅓ body length in under 0.2 s']
[2.2, 'Fangs swing forward on the maxilla, then fold back']
[3.4, 'Recoil to the S-coil, ready again']
```

Keep the hero action in the middle (1–4 s) and calm the edges (0–1, 4–5 s) so the
seam lands in a quiet moment.

## Physical honesty

- Respect real speeds: a viper strike lasts tens to hundreds of milliseconds; hummingbird
  wings beat tens of times per second (show **blur**, never literal flaps at 5 s scale);
  flowers open over hours (say "time-lapse" in the beat).
- Snakes never blink (no eyelids). Mandibles hinge at the condyles. Petals hinge at the
  receptacle. If you compress time, the beat text says so.

## Verify

`node scripts/audit.mjs` checks every figure's pose at t = 0 vs t = 5 (vertex hashes) and
reports discontinuities. Also scrub in `lab.html` and watch the seam.
