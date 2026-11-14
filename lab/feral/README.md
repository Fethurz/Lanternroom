# Feral silhouettes (work in progress, not in the app yet)

The owner's feral art is in `src/` (horse, bird, fish, dragon, boobs). Round 1 is the **horse**: belly + weight gain, on a bench for the owner to rate.

Run from this folder (needs Node + Playwright, Python + numpy + Pillow):
- `node mkmask.js` → `body_feralhorse.png` (white mask, 1035×930 = the art × 1.5).
- `python3 mkfat.py` → `fatG_feralhorse.png` (growth at full weight) and `fat_feralhorse.png` (distance), the app's scheme `alpha = f*G*gmax/255 - D + 0.5`. Each pixel stores the outline point that reaches it first, so edges stay crisp. Where the fat goes: `fatblobs.json`.
- `python3 mkrig.py` → `feral.json`: belly outline at six fill levels (same 240 points in each, `belly.json`), `mob`, the crease (`seam`), the neck bend (rings around `piv`, from `r0`), the mouth.
- `python3 build.py` → `out/feral-horse-bench.html` (the engine functions are copied out of `index.html`).
- `node shot.js '[["name",fill,fat,"belch",520]]'` → screenshots in `out/`.
