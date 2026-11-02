# Daughter's left palm orientation

## Request

> en varias escenas la palma de la mano izquierda de la ninia esta mal, se ve al reves

The previous contact repair did not settle the presentation of the raised hand.
The wrist reached forward with its fingers pointing toward the viewer, making
the fingertip and nail planes compete visually with the open palm. Connectivity
and clothing-clearance tests cannot judge that appearance.

## Correction

The daughter's left wrist is closer to her body and moves diagonally toward the
conversation. The hand follows the forearm with only a small directional offset;
the palm faces obliquely forward and upward. This reveals the finger shafts and
the thumb from the high reader camera as well as frontal and side views. The
same character pose serves plates I, IV and VI in both languages.

Only the daughter's speaking-arm targets changed in `characters.js`. Hand
geometry, UVs, anatomical axes, finger curls, the father and supporting hands
were retained. Transform and skinning checks found no reflected hand geometry.
The source hand was also compared with the
[left palmar plate in Gray's Anatomy, hosted by USF](https://etc.usf.edu/clipart/24200/24204/hand_24204.htm).
This reference was inspected, not incorporated as a product asset.

The first upright candidate still read edge-on from the high view and was
discarded. The retained diagonal pose was compared in actual reader captures,
with independent visual review. Local evidence is under
`.scratch/palm-orientation/`.

## Verification

The production review evaluated five poses on each of the three affected
plates and captured 45 frames. Nineteen representative images were inspected,
including every high view at zero, 2.5 and five seconds. The diagonal palm and
thumb remain readable, with no visible intersection with the torso or resting
arm in those views. No runtime errors were recorded.

A separate live-playback run crossed the full cycle in 20 samples; sampled
posed vertices stayed finite, and zero/five-second mean-coordinate checks
agreed within `1.18e-11`. Picking passed before export and after a pose change.
The production build and an actual WebGL reader check passed. These checks do
not substitute for the visual review or prove every possible orbit angle.

The complete Campfire captures and native SVG exports were refreshed in English
and Spanish. Other volumes' files, manifest entries and timestamps were retained.

## Subsequent correction

The user rejected this pose in the next screenshots: the high hand, flared
elbow and palm orientation still looked unnatural. The whole-arm repair in
[13-relaxed-arm.md](13-relaxed-arm.md) supersedes this pose and its visual
assessment; the historical runtime results above do not establish naturalness.
