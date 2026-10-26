const { SPRITES } = require("./sprites.js"), { PIX_PALS, SKINS, HAIRS } = require("./pal.js");
const full = rows => rows.map(r => r.length === 16 ? r : r + [...r].reverse().join(""));
function pixSVG(sp, pal, frame = "round", size = 96) {
  const rows = full(sp[3]), cols = { ...pal };
  let rects = "";
  // backdrop: two-tone with a soft dither band
  let bg = `<rect width="24" height="24" fill="${pal.bg[1]}"/><rect width="24" height="13" fill="${pal.bg[0]}"/>`;
  for (let x = 0; x < 24; x += 2) bg += `<rect x="${x + (x % 4 ? 1 : 0)}" y="13" width="1" height="1" fill="${pal.bg[0]}"/>`;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== "." && cols[ch]) rects += `<rect x="${x + 4}" y="${y + 5}" width="1" height="1" fill="${cols[ch]}"/>`; }));
  const mask = frame === "round" ? `<path d="M8 0h8v1h2v1h2v1h1v1h1v2h1v2h1v8h-1v2h-1v2h-1v1h-1v1h-2v1h-2v1h-8v-1h-2v-1h-2v-1h-1v-1h-1v-2h-1v-2h-1v-8h1v-2h1v-2h1v-1h1v-1h2v-1h2z"/>` : frame === "soft" ? `<path d="M3 0h18v1h1v1h1v1h1v18h-1v1h-1v1h-1v1h-18v-1h-1v-1h-1v-1h-1v-18h1v-1h1v-1h1z"/>` : `<rect width="24" height="24"/>`;
  const id = "m" + Math.random().toString(36).slice(2, 8);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" shape-rendering="crispEdges"><defs><clipPath id="${id}">${mask}</clipPath></defs><g clip-path="url(#${id})">${bg}${rects}</g></svg>`;
}
function palFor(sp, k, i) { const p = PIX_PALS[k]; if (sp[2] !== "human") return p; const sk = SKINS[i % SKINS.length], hr = HAIRS[(i * 3 + 1) % HAIRS.length]; return { ...p, b: sk[0], s: sk[1], h: sk[2], c: hr[0], d: hr[1] }; }
if (require.main === module) {
  const keys = Object.keys(PIX_PALS);
  const html = `<body style="background:#16131d;margin:0;padding:16px;display:grid;grid-template-columns:repeat(5,1fr);gap:14px;font:13px sans-serif;color:#eee">${SPRITES.map((sp, i) => `<div>${pixSVG(sp, palFor(sp, keys[i % 8], i))}${pixSVG(sp, palFor(sp, keys[(i + 3) % 8], i + 2), "round", 48)}${pixSVG(sp, palFor(sp, keys[(i + 5) % 8], i + 4), "square", 48)}<div>${sp[1]}</div></div>`).join("")}</body>`;
  require("fs").writeFileSync("draft.html", html);
}
module.exports = { pixSVG, palFor, full };
