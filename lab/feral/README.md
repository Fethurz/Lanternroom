# Feral silhouettes (work in progress, not in the app yet)

The owner's art is in `src/` (horse, wolf, bird, fish, dragon, boobs). Rigged so far, on a bench for the owner to rate: **horse** and **wolf**
(belly that fills, weight gain, a soft rump, belch with a bending neck).

Each animal is one file, `species/<name>.json`, with every number in the drawing's own units (the rig is `(point - origin) * scale`):
the ground line, where the fat goes (`fat.blobs`: x, y, sigma x, sigma y, growth), the belly (a sagging circle: `cx`, `under`, `depth`,
half-width `a`), the rump (`butt`: `tip` on the back line, the cheek's circle lean `c0/r0` and fat `c1/r1`; `seamArc` creases its whole
back edge for a tail that hangs behind it), the near legs drawn back over the belly (`near`), where the cheek may show (`rear`),
and the neck's bend (`neck`).

Run from this folder (Node + Playwright, Python + numpy + Pillow):
- `python3 mk.py horse` (or `wolf`) → `out_<name>/body.png` (white mask), `fatG.png` + `fatD.png` (the app's scheme
  `alpha = f*G*gmax/255 - D + 0.5`; each pixel keeps the outline point that reaches it first), `rig.json`.
- `python3 build.py` → `out/feral-horse-bench.html` (the engine functions are copied out of `index.html`).
- `node shot.js '[["name","wolf",fill,fat,"belch",520]]'` → screenshots in `out/`; `python3 grid.py 3 a b c` joins them.

## Two drawings: a morph (the wolf)
When an animal has a second drawing at full weight (`morph.svg`, same pose), there is no fat map. `mk.py` writes two signed
distance fields (`sdfL.png` lean, `sdfF.png` fat; 16 bits in the red and green channels, 1/64 px) and the figure at weight `f`
is wherever `(1-f)*L + f*F < 0`: one smooth shape for every weight. The fat drawing's rump is lifted out as its own soft part
(`cheek`: outline points along the fat contour between `fatA2`/`fatB`, matched to points on the lean one), so it wobbles as one
mass; under it the fat body keeps the lean back (`under`), and the drawn crease is filled in and redrawn by the bench so it
can grow from a hairline and move with the cheek. `butt_aside` / `fat_aside` in `wolf.json` are the earlier teardrop cheek and
fat blobs, kept but unused.

## The horse now (round 12)
`species/horse.json` is the owner's new slim horse (`src/horse2.svg`) with `src/horse2_fat.svg` as the full-weight morph, used whole
(no `cheek` lift-out), and our own teardrop cheek (`butt`, creased against the hanging tail with `seamArc`) and sagging-circle belly
drawn on top. `species/horse_v1.json` is the first horse (`src/horse.svg`, fat blobs), kept but not built.
