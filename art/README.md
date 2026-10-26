- art/pfp-drawn-round1.html: the first round of drawn profile pictures (40 SVG subjects, 6 frames, 8 colourways). Owner 2026-10-26: "pretty bad at a first glance"; kept for possible use elsewhere, not used in the app.

## Pixel profile pictures (round 2)
`pixel/` holds the pixel-art sources: `sprites.js` (25 sprites drawn 16×16, mostly as mirrored 8-wide halves),
`pal.js` (colourways, skin tones, hair colours), `narrow.js` (narrows every sprite to 12×16 by dropping
redundant column pairs; eyes and details are never merged or lost, outlines are repaired), `render.js`
(SVG renderer: 24×24 tile, stepped round/soft/square frames). `pfp-bench-round2.html` is the rating page
(PFP Bench https://claude.ai/artifact/5UK3LZnrLV17sM8Guz9m56, db collection `pfp`: x_<sprite>, xf_<frame>,
xp_<colourway>, general2). The owner asked for narrower sprites on 2026-10-26.
