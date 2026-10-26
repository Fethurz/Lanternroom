const { SPRITES } = require("./sprites.js");
const full = rows => rows.map(r => r.length === 16 ? r : r + [...r].reverse().join(""));
// drop the most redundant symmetric column pairs until the sprite is W wide
const edges = g => g.reduce((t, r) => { const l = r.findIndex(c => c !== "."), q = r.length - 1 - [...r].reverse().findIndex(c => c !== "."); return t + (l >= 0 && r[l] === "o") + (l >= 0 && r[q] === "o"); }, 0);
const runs = g => g.reduce((t, r) => t + r.filter((c, k) => "egwa".includes(c) && c !== r[k - 1]).length, 0);
function narrow(rows, W = 12) {
  let g = full(rows).map(r => [...r]);
  while (g[0].length > W) {
    const n = g[0].length, h = n / 2;
    let best = 1, bs = -Infinity;
    for (let j = 1; j < h; j++) { // pair j and n-1-j (never the outer edge column 0)
      let s = 0;
      for (const r of g) { const a = r[j], m = r[n - 1 - j];
        if (a === r[j - 1] || a === r[j + 1]) s++; if (m === r[n - j] || m === r[n - 2 - j]) s++;
        if (a !== "." && a !== "o" && a !== r[j - 1] && a !== r[j + 1]) s -= "egwa".includes(a) ? 1e6 : 3; }
      const cut = g.map(r => r.filter((_, k) => k !== j && k !== n - 1 - j));
      if (runs(cut) < runs(g)) s -= 1e6;
      s -= 8 * (edges(g) - edges(cut)); // never merge or lose eyes and other details
      if (s > bs) { bs = s; best = j; }
    }
    g = g.map(r => r.filter((_, k) => k !== best && k !== n - 1 - best));
    g.forEach((r, y) => { const l = r.findIndex(c => c !== "."); if (l < 0) return; const q = r.length - 1 - [...r].reverse().findIndex(c => c !== ".");
      if (r[l] !== "o" && (y === 0 || g[y - 1][l] !== "." )) r[l] = "o"; if (r[q] !== "o" && (y === 0 || g[y - 1][q] !== ".")) r[q] = "o"; });
  }
  return g.map(r => r.join(""));
}
module.exports = { narrow };
if (require.main === module) for (const sp of SPRITES.slice(0, 4)) console.log(sp[0] + "\n" + narrow(sp[3]).join("\n"));
