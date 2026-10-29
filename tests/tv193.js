// v1.93/1.94: a line broken off with a dash keeps the voice's own pause at the end (it isn't trimmed or faded)
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W, json: () => ({ summary: "x", facts: [] }), stream: () => "Hi.\n[[mood: calm]]" });
  // a real WAV: 0.6 s of sound then 0.4 s of silence (the breath pause)
  const n = 44100, wav = Buffer.alloc(44 + n * 2); wav.write("RIFF", 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(44100, 24); wav.writeUInt32LE(88200, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(i < n * 0.6 ? Math.round(Math.sin(i / 8) * 12000) : 0, 44 + i * 2);
  const cart = [];
  await pg.route("https://api.cartesia.ai/**", r => { cart.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill({ status: 200, body: wav, headers: { "content-type": "audio/wav" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 1.96 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1096));
  const r = await pg.evaluate(async () => {
    Object.assign(S.settings, { voiceOn: true, voiceEngine: "cartesia", cartKey: "k" }); await openChat(S.chars[0].id); S.chars[0].voice = { cart: "v1" };
    const run = async text => { VQ.span = null; VQ.cache.clear(); voiceSay([{ text, who: S.chars[0] }]); for (let i = 0; i < 200 && !VQ.span; i++) await new Promise(r => setTimeout(r, 10)); const s = VQ.span; voiceStop(); return s; };
    return { cut: await run("I didn't mean-"), plain: await run("I didn't mean it.") };
  });
  chk(`a cut-off line keeps its pause (plays to ${r.cut?.to?.toFixed(2)} s of 1.0 s); a normal line is trimmed (${r.plain?.to?.toFixed(2)} s)`, r.cut?.keep && r.cut.to > 0.99 && r.plain && r.plain.to < 0.75);
  chk(`Cartesia hears the trailing backtick (${cart[0]?.transcript})`, cart[0]?.transcript === "I didn't mean `");
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
