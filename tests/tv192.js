// v1.92: Hear it after changing a line's feeling plays the new feeling (it used to keep the first one), expressiveness and
// intensity audibly change what Cartesia gets, strong lines read stronger, the "now reading" pill sits on the message box
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || "");
  const reply = `*She looks away.* "I thought you cared. I really did." *He snaps.* "Get out of my house."\n[[mood: sad | place: Hall | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  const json = body => /You direct voice actors/.test(sysOf(body)) ? { lines: [{ i: 1, emotion: "sad", intensity: 2, speed: 1, volume: 1 }, { i: 2, emotion: "angry", intensity: 2, speed: 1, volume: 1 }] } : { summary: "x", facts: [] };
  const { b, pg, errs } = await open({ width: W, json, stream: () => reply });
  const cart = [];
  await pg.route("https://api.cartesia.ai/**", r => { cart.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill({ status: 200, body: Buffer.from([0xff, 0xfb, 0x90, 0]), headers: { "content-type": "audio/mpeg" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(() => {
    window.speechSynthesis && Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => [], speak: u => setTimeout(() => u.onend && u.onend(), 5), cancel: () => {} }, configurable: true });
    window.Audio = function () { const a = this; this.play = async () => { setTimeout(() => a.onended && a.onended(), 60); }; this.pause = () => {}; this.addEventListener = () => {}; };
  });
  chk("version 1.92 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 92));
  await pg.evaluate(async () => { Object.assign(S.settings, { voiceOn: true, voiceAuto: false, voiceEngine: "cartesia", cartKey: "k" }); S.chars[0].voice = { cart: "v1" }; await saveSettings(); await openChat(S.chars[0].id); });
  await pg.waitForTimeout(300);
  await pg.evaluate(async () => { $("input").value = "hi"; $("send").click(); for (let i = 0; i < 200 && (S.busy || !S.chat.messages.some(x => /Get out/.test(x.content || ""))); i++) await new Promise(r => setTimeout(r, 50)); });
  const wait = () => pg.evaluate(async () => { for (let i = 0; i < 80 && !VQ.busy; i++) await new Promise(r => setTimeout(r, 10)); for (let i = 0; i < 160 && VQ.busy; i++) await new Promise(r => setTimeout(r, 25)); });
  // the long-press window: Hear it, change the feeling, Hear it again
  await pg.evaluate(async () => { const q = [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /Get out/.test(x.textContent)); openLineOwner(q); for (let i = 0; i < 60 && !$("loHear"); i++) await new Promise(r => setTimeout(r, 30)); });
  const emo = async e => { cart.length = 0; await pg.evaluate(e => { if (e) document.querySelector(`[data-emo="${e}"]`).click(); }, e); await pg.evaluate(() => $("loHear").click()); await wait(); return cart.at(-1)?.generation_config || {}; };
  const h1 = await emo("tender"), h2 = await emo("terrified"), h3 = await emo("furious");
  chk(`Hear it plays each new feeling, not the first one (${h1.emotion}, ${h2.emotion}, ${h3.emotion})`, h1.emotion === "affectionate" && h2.emotion && h2.emotion !== h1.emotion && ["outraged", "angry"].includes(h3.emotion) && h3.emotion !== h2.emotion);
  await pg.evaluate(() => closeSheet());
  // expressiveness: same line, 100% vs 200%
  const at = async x => { cart.length = 0; await pg.evaluate(async x => { S.settings.voiceExpr = x; const m = S.chat.messages.filter(y => y.role === "assistant").at(-1); m.vtoneBy = {}; await voiceRead(m, true); }, x); await wait(); return cart.map(c => ({ e: c.generation_config?.emotion, s: c.generation_config?.speed || 1, v: c.generation_config?.volume || 1, t: c.transcript })); };
  const e1 = await at(1), e2 = await at(2);
  chk(`expressiveness 200% makes the sad line slower and quieter (${e1[0]?.s}/${e1[0]?.v} → ${e2[0]?.s}/${e2[0]?.v}) and the angry one louder (${e1[1]?.v} → ${e2[1]?.v})`, e2[0].s < e1[0].s - 0.05 && e2[0].v < e1[0].v - 0.05 && e2[1].v > e1[1].v + 0.15);
  chk(`at 200% the strong lines read stronger (${e2[0]?.t} | ${e2[1]?.t})`, /\.\.\./.test(e2[0].t) && /!$/.test(e2[1].t) && !/!/.test(e1[1].t));
  await pg.evaluate(() => { S.settings.voiceExpr = 1; });
  // the pill sits right on top of the message box
  const pl = await pg.evaluate(async () => { const m = S.chat.messages.filter(y => y.role === "assistant").at(-1); voiceRead(m, true); for (let i = 0; i < 80 && $("voNow")?.hidden !== false; i++) await new Promise(r => setTimeout(r, 20));
    const a = $("voNow").getBoundingClientRect(), c = $("composer").getBoundingClientRect(); voiceStop(); return { gap: c.top - a.bottom, pe: getComputedStyle($("voNow")).pointerEvents }; });
  chk(`the pill sits just above the message box (gap ${pl.gap?.toFixed(1)} px) and taps pass through it`, pl.gap >= 0 && pl.gap < 20 && pl.pe === "none");
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
