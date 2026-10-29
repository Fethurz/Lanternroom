// v1.87: voice filters (robotic, reverb, layers…) on Cartesia voices, and how a name is said
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const reply = `*Aelina smiles.* "I'm Aelina, and Aelina never lies." *She turns.* "Ask Siobhan Kerr."\n[[mood: happy | place: Inn | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  const { b, pg, errs } = await open({ width: W, stream: () => reply });
  // a real 0.4 s tone so the filters have something to play
  const sr = 22050, n = Math.round(sr * 0.4), wav = Buffer.alloc(44 + n * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.sin(i / sr * 2 * Math.PI * 220) * 8000), 44 + i * 2);
  const cart = [];
  await pg.route("https://api.cartesia.ai/**", r => { cart.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill({ status: 200, body: wav, headers: { "content-type": "audio/wav" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(() => {
    window.__said = [];
    const V = [{ name: "Samantha", lang: "en-US", localService: true }, { name: "Daniel", lang: "en-GB", localService: true }];
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => V, speak: u => { __said.push({ t: u.text }); setTimeout(() => u.onend && u.onend(), 10); }, cancel: () => {} }, configurable: true });
    const A = window.Audio; window.Audio = function (src) { const a = this; this.play = async () => { __said.push({ t: "[audio]" }); setTimeout(() => a.onended && a.onended(), 10); }; this.pause = () => {}; this.addEventListener = () => {}; };
  });
  chk("version 1.87 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1087));

  // ---------- names
  const nm = await pg.evaluate(async () => {
    const c = S.chars[0]; c.name = "Aelina"; c.voice = { say: "Ay-LEE-nah" }; S.personas[0].voice = { say: "Shi-VAWN Kurr" }; S.personas[0].name = "Siobhan Kerr";
    S.settings.voiceOn = true; await saveSettings(); await openChat(c.id); await new Promise(r => setTimeout(r, 200));
    return { full: sayNames("I'm Aelina, and AELINA never lies. Not Aelinas. Ask Siobhan Kerr or Siobhan."), cart: 0 };
  });
  chk(`names are read the way they're spelled out (${nm.full})`, nm.full === "I'm Ay-LEE-nah, and Ay-LEE-nah never lies. Not Aelinas. Ask Shi-VAWN Kurr or Shi-VAWN.");
  const rd = await pg.evaluate(async () => { __said = []; $("input").value = "hi"; $("send").click(); for (let i = 0; i < 120 && (S.busy || __said.length < 2); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 100)); return __said.map(x => x.t); });
  chk(`a reply is spoken with the names said right (${rd.join(" | ")})`, rd[0] === "I'm Ay-LEE-nah, and Ay-LEE-nah never lies." && rd[1] === "Ask Shi-VAWN Kurr.");
  const ct = await pg.evaluate(async () => { S.settings.voiceEngine = "cartesia"; S.settings.cartKey = "k"; S.chars[0].voice = { say: "Ay-LEE-nah", cart: "v1" }; __said = []; voiceSay([{ text: "Aelina is here.", who: S.chars[0] }]); await new Promise(r => setTimeout(r, 300)); return true; });
  chk(`Cartesia gets the spelled-out name too (${cart.at(-1)?.transcript})`, cart.at(-1)?.transcript === "Ay-LEE-nah is here.");

  // ---------- filters
  const fx = await pg.evaluate(async () => {
    openVoices(S.chars[0]); await new Promise(r => setTimeout(r, 150));
    const box = $("voEd"), chips = [...box.querySelectorAll("[data-fx]")].map(x => x.dataset.fx);
    const say = box.querySelector("#cvSay").value;
    box.querySelector('[data-fx="robot"]').click(); box.querySelector('[data-fx="hall"]').click(); await new Promise(r => setTimeout(r, 30));
    const mix = !!box.querySelector("#cvFxMix"); box.querySelector("#cvFxMix").value = "0.8"; box.querySelector("#cvFxMix").dispatchEvent(new Event("input"));
    box.querySelector("#cvSay").value = "Eye-LYE-nah"; box.querySelector("#cvSay").dispatchEvent(new Event("input"));
    cartN = 0; VQ.fxLast = null; box.querySelector("#cvSayT").click(); await new Promise(r => setTimeout(r, 400));
    await new Promise(r => setTimeout(r, 500));
    return { chips, say, mix, saved: S.chars[0].voice };
  });
  chk(`the editor has the name box and ${fx.chips.length} filters (${fx.chips.join(", ")})`, fx.say === "Ay-LEE-nah" && fx.chips.length >= 10 && ["robot", "hall", "layers", "demon", "echo", "radio"].every(k => fx.chips.includes(k)));
  chk(`trying a new spelling in the editor plays it before saving (${cart.at(-1)?.transcript})`, cart.at(-1)?.transcript === "Eye-LYE-nah.");
  chk(`filters and strength are saved with the voice (${JSON.stringify(fx.saved)})`, fx.saved.fx?.join() === "robot,hall" && fx.saved.fxMix === 0.8 && fx.saved.say === "Eye-LYE-nah" && fx.mix);
  const pl = await pg.evaluate(async () => {
    closeSheet(); __said = []; VQ.fxLast = null; const t0 = performance.now();
    voiceSay([{ text: "Filtered line.", who: S.chars[0] }, { text: "Next line.", who: { name: "Other", voice: {} } }]);
    for (let i = 0; i < 120 && !__said.some(x => x.t === "[audio]" || x.t === "Next line."); i++) await new Promise(r => setTimeout(r, 50));
    return { fx: VQ.fxLast, said: __said.map(x => x.t), ms: performance.now() - t0 };
  });
  chk(`a filtered voice plays through its filters (${pl.fx}), then reading carries on (${pl.said.join(" | ")})`, pl.fx?.join() === "robot,hall" && pl.said.includes("Next line.") && !pl.said.slice(0, 1).includes("[audio]"));
  const each = await pg.evaluate(async () => {
    const ac = acx(), bad = [];
    for (const k of Object.keys(VOICE_FX)) { try { const s = ac.createBufferSource(); s.buffer = ac.createBuffer(1, 2205, 22050); const keep = []; const o = fxStage(ac, s, k, 0.7, keep); o.connect(ac.destination); keep.forEach(x => x.stop()); } catch (e) { bad.push(k + ": " + e.message); } }
    return bad;
  });
  chk(`every filter builds (${each.join("; ") || "all fine"})`, !each.length);
  const stop = await pg.evaluate(async () => { __said = []; voiceSay([{ text: "Long filtered line.", who: S.chars[0] }, { text: "Should not play.", who: { name: "x", voice: {} } }]); await new Promise(r => setTimeout(r, 150)); voiceStop(); await new Promise(r => setTimeout(r, 2500)); return __said.map(x => x.t); });
  chk("stopping cuts a filtered line and nothing after it plays", !stop.includes("Should not play."));
  const ph = await pg.evaluate(async () => { S.settings.voiceEngine = "phone"; openVoices(S.chars[0]); await new Promise(r => setTimeout(r, 120)); const t = $("voEd").textContent; closeSheet(); return /phone's own voices can't be filtered/.test(t); });
  chk("with phone voices the editor says filters need Cartesia", ph);
  // persona and group members have the name box too
  const pe = await pg.evaluate(async () => { editPersona(S.personas[0], false); await new Promise(r => setTimeout(r, 120)); const v = $("peVoice")?.querySelector("#cvSay")?.value; closeSheet(); return v; });
  chk(`your persona's name pronunciation is in the persona editor (${pe})`, pe === "Shi-VAWN Kurr");
  const wide = await pg.evaluate(async () => { openVoices(S.chars[0]); await new Promise(r => setTimeout(r, 120)); $("voEd").scrollIntoView(); return document.documentElement.scrollWidth <= innerWidth + 1; });
  chk("no sideways scroll", wide);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
