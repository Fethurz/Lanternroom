// creature colourways: o outline, b base, s shade, h highlight, e dark, w white, a accent, c second colour, d its shade, g glow, bg backdrop [light, dark]
const PIX_PALS = {
  ember: { n: "Ember", o: "#2a1208", b: "#e8a95b", s: "#b86a2c", h: "#ffd89a", e: "#2a1208", w: "#fff6e6", a: "#ff7a6b", c: "#7a4a2a", d: "#4a2a16", g: "#ffef7a", bg: ["#4a2418", "#2a140c"] },
  moss: { n: "Moss", o: "#0f2410", b: "#7fc85a", s: "#4a8a36", h: "#c6f0a4", e: "#0f2410", w: "#f2ffe8", a: "#ff8fa8", c: "#c8b07a", d: "#8a7448", g: "#fff07a", bg: ["#22402a", "#122418"] },
  dusk: { n: "Dusk", o: "#1a0e30", b: "#a884f0", s: "#6e4fc0", h: "#dccaff", e: "#1a0e30", w: "#f6f0ff", a: "#ff8fc8", c: "#4a3a7a", d: "#2e2450", g: "#7ff0ff", bg: ["#33245a", "#1a1232"] },
  tide: { n: "Tide", o: "#06222a", b: "#48c8bc", s: "#2a8890", h: "#b8f2ea", e: "#06222a", w: "#effffd", a: "#ff9a8a", c: "#e8d8a8", d: "#a89868", g: "#fff8a8", bg: ["#123a44", "#08202a"] },
  rose: { n: "Rose", o: "#2e0a1a", b: "#f27aab", s: "#b84878", h: "#ffd0e2", e: "#2e0a1a", w: "#fff2f8", a: "#ff4a6a", c: "#5a2a4a", d: "#3a1830", g: "#ffe07a", bg: ["#4a1a34", "#2a0c1c"] },
  bone: { n: "Bone", o: "#22201a", b: "#e6dcc4", s: "#a89878", h: "#fffaee", e: "#22201a", w: "#ffffff", a: "#e2766f", c: "#6a5a48", d: "#443a2e", g: "#ff6a4a", bg: ["#3c3830", "#1e1c18"] },
  blood: { n: "Blood", o: "#1a0304", b: "#d63a3a", s: "#8a1a22", h: "#ff9a8a", e: "#1a0304", w: "#ffe8e0", a: "#ffd04a", c: "#2a1418", d: "#160a0c", g: "#ffe84a", bg: ["#3a0c10", "#1c0406"] },
  frost: { n: "Frost", o: "#0c1a2e", b: "#a0ccf8", s: "#5f8ac4", h: "#eef8ff", e: "#0c1a2e", w: "#ffffff", a: "#ff9ab8", c: "#e8eef8", d: "#a8b8d0", g: "#7ff8ff", bg: ["#1e3050", "#0c1628"] }
};
// people: skin tones (b/s/h) mixed with hair and clothes (c/d)
const SKINS = [["#f6d6bc", "#d8a888", "#fff0e2"], ["#e8b48c", "#c08860", "#f8d4b4"], ["#c88a5a", "#9a6038", "#e2aa7c"], ["#9a6440", "#6e4226", "#b88058"], ["#6a4028", "#482814", "#8a5a3a"], ["#dfe8f0", "#a8b8c8", "#ffffff"]];
const HAIRS = [["#2a1a14", "#160c08"], ["#7a4a2a", "#4a2a16"], ["#e8c070", "#b08a40"], ["#c8402a", "#8a2414"], ["#f0f0f0", "#b8b8c0"], ["#5a7aff", "#3a50c0"], ["#ff6aa8", "#c03a78"], ["#4ad0a0", "#2a9070"]];
if (typeof module !== "undefined") module.exports = { PIX_PALS, SKINS, HAIRS };
