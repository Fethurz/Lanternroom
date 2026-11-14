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
