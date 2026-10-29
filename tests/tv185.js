// v1.85: HTML-coloured text from Janitor-style cards (<font color="pink">…</font>) shows in colour; voices read each line's tone
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || "");
  const reply = `*She hugs herself, her glow dimming.* <font color="pink">Please don't leave…</font> "You're not supposed to be here," *she whispers.* *Then she giggles, spinning in the air.* "Okay, okay, you can stay!" *Her voice cracks.* "I've been alone so long..."\n[[mood: sad | place: House | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  let toneCalls = 0;
  const json = body => { if (/You direct voice actors/.test(sysOf(body))) { toneCalls++; return { lines: [{ i: 1, emotion: "anxious", speed: 0.9, volume: 0.6 }, { i: 2, emotion: "playful", speed: 1.1, volume: 1.1, laugh: true }, { i: 3, emotion: "lonely", speed: 0.85, volume: 0.8 }] }; } return { summary: "x", facts: [] }; };
  const { b, pg, errs } = await open({ width: W, json, stream: () => reply });
  const cart = []; let refuse = null;
  await pg.route("https://api.cartesia.ai/**", async r => { const q = r.request(); const body = JSON.parse(q.postData() || "{}"); cart.push(body);
    if (refuse && body.generation_config?.emotion === refuse) return r.fulfill({ status: 400, body: "invalid emotion" });
    return r.fulfill({ status: 200, body: Buffer.from([0xff, 0xfb, 0x90, 0]), headers: { "content-type": "audio/mpeg" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(() => {
    window.__said = [];
    const V = [{ name: "Samantha", lang: "en-US", localService: true }, { name: "Daniel", lang: "en-US", localService: true }];
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => V, speak: u => { __said.push({ t: u.text, p: u.pitch, r: u.rate, v: u.volume }); setTimeout(() => u.onend && u.onend(), 5); }, cancel: () => {} }, configurable: true });
    window.Audio = function (src) { this.play = async () => { __said.push({ t: "[audio]" }); setTimeout(() => this.onended && this.onended(), 5); }; this.pause = () => {}; this.addEventListener = () => {}; };
  });
  chk("version 1.85 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1085));

  // ---------- coloured thoughts
  const col = await pg.evaluate(() => {
    const h = fmt(`*She beams.* <font color="pink">I'm blending in!</font> <span style="color:#9fd">Quiet.</span> "Trick or treat!"`), d = document.createElement("div"); d.innerHTML = h;
    const spans = [...d.querySelectorAll("span.cx")].map(x => [x.textContent, x.style.color]);
    const fixed = fixFormat(`*She beams.* <font color="pink">I'm blending in!</font> *She drifts away.*`);
    return { raw: /&lt;font|<font/.test(h), spans, fixed, strip: stripColor(`<font color="pink">a</font>`), prompt: /character.s thoughts/.test(String(onoPrompt)) };
  });
  chk(`<font color="pink"> thoughts show in pink, not as raw code (${col.spans.map(x => x[0] + ":" + x[1]).join(", ")})`, !col.raw && col.spans.length === 2 && col.spans[0][0] === "I'm blending in!" && /pink|rgb/.test(col.spans[0][1]));
  chk(`new replies keep the coloured thought as it is (${col.fixed})`, col.fixed === "*She beams.* [color=pink]I'm blending in![/color] *She drifts away.*");
  chk("stripped text has no font tags; the prompt welcomes coloured thoughts", col.strip === "a" && col.prompt);

  // ---------- tone
  const g = await pg.evaluate(() => {
    const p = (ctx, text = "Hi.") => toneGuess({ ctx, text });
    return { wh: p("she whispers …"), sh: p("he shouts …"), gi: p("She giggles …"), cr: p("Her voice cracks …"), ex: p("", "Get out!"), dots: p("", "I don't know...") };
  });
  chk(`without the AI, words around a line set its tone (whisper ${g.wh.vol}, shout ${g.sh.emo} ${g.sh.vol}, giggle ${g.gi.emo}${g.gi.laugh ? "+laugh" : ""}, voice cracks ${g.cr.emo})`, g.wh.vol < 0.7 && g.sh.emo === "angry" && g.sh.vol > 1.3 && g.gi.laugh && g.cr.emo === "sad" && g.ex.emo === "excited" && g.dots.speed < 1);
  await pg.evaluate(async () => { S.settings.voiceOn = true; await saveSettings(); const c = S.chars[0]; await openChat(c.id); });
  await pg.waitForTimeout(300);
  const ph = await pg.evaluate(async () => { __said = []; $("input").value = "hi"; $("send").click(); for (let i = 0; i < 120 && (S.busy || __said.length < 3); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 100)); return __said; });
  chk(`a reply's lines are read with the AI's directions (${ph.map(x => x.t.slice(0, 12)).join(" | ")}; one tone call)`, ph.length === 3 && toneCalls === 1 && ph[0].t.startsWith("You're not"));
  chk(`phone voices carry it in pace, pitch and loudness (whispered ${ph[0].v.toFixed(2)}, playful rate ${ph[1].r.toFixed(2)} vs lonely ${ph[2].r.toFixed(2)})`, ph[0].v < 0.7 && ph[1].r > ph[2].r && ph[1].p > ph[2].p);
  chk("the thought in pink isn't read as dialogue", !ph.some(x => /leave/.test(x.t)));
  const again = await pg.evaluate(async () => { __said = []; await voiceRead(S.chat.messages.filter(m => m.role === "assistant").at(-1), true); await new Promise(r => setTimeout(r, 120)); return __said.length; });
  chk("reading it again uses the same directions (no second AI call)", again === 3 && toneCalls === 1);
  const tp = await pg.evaluate(async () => { __said = []; const q = [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /alone so long/.test(x.textContent)); q.click(); await new Promise(r => setTimeout(r, 60)); return __said[0]; });
  chk(`tapping a line keeps its tone (rate ${tp?.r?.toFixed(2)})`, tp && tp.r < 1);

  // ---------- Cartesia gets emotion, speed, volume and laughter
  const ct = await pg.evaluate(async () => { S.settings.voiceEngine = "cartesia"; S.settings.cartKey = "sk_car_t"; S.chars[0].voice = { cart: "v1" }; __said = []; await voiceRead(S.chat.messages.filter(m => m.role === "assistant").at(-1), true); for (let i = 0; i < 40 && __said.length < 3; i++) await new Promise(r => setTimeout(r, 50)); return __said.length; });
  const [c1, c2, c3] = cart;
  chk(`Cartesia hears each line's emotion, pace and loudness (${c1?.generation_config?.emotion}, ${c2?.generation_config?.emotion}, ${c3?.generation_config?.emotion})`, ct === 3 && c1?.generation_config?.emotion === "anxious" && c1.generation_config.volume === 0.6 && c1.generation_config.speed === 0.9);
  chk("names Cartesia doesn't have are sent as the closest (playful → happy, lonely → melancholic), and a laugh gets [laughter]", c2?.generation_config?.emotion === "happy" && /^\[laughter\] /.test(c2.transcript) && c3?.generation_config?.emotion === "melancholic");
  refuse = "melancholic"; cart.length = 0;
  const rf = await pg.evaluate(async () => { VQ.cache.clear(); __said = []; voiceSay([{ text: "So alone.", who: S.chars[0], emo: "lonely", speed: 0.9, vol: 0.8 }]); for (let i = 0; i < 40 && !__said.length; i++) await new Promise(r => setTimeout(r, 50)); return { said: __said.length, bad: TONE_BAD.has("melancholic") }; });
  chk(`an emotion the service refuses falls back to its main one and is remembered (${cart.map(x => x.generation_config?.emotion || "none").join(" → ")})`, rf.said === 1 && rf.bad && cart.length === 2 && cart[1].generation_config?.emotion === "sad");
  const off = await pg.evaluate(async () => { S.settings.voiceTone = false; S.settings.voiceEngine = "phone"; const m = { ...S.chat.messages.filter(m => m.role === "assistant").at(-1), id: "other" }; const n = window.__n = 0; await toneParts(m, voiceParts(m, "dialogue")); return true; });
  chk("with Read each line's tone off, no AI call is made", toneCalls === 1);
  const st = await pg.evaluate(async () => { $("btnSettings").click(); await new Promise(r => setTimeout(r, 120)); return !!$("vTone"); });
  chk("Settings → Voices has the tone switch", st);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
