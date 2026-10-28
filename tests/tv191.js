// v1.91: cut-off lines break off right after the word (and the next line follows at once), no long waits between lines
// (prefetch + trimmed silence), stutters start the real word's sound, sounds play in Everything mode and burps between lines,
// and your own tone controls: expressiveness, lowest intensity, a voice's usual mood, a per-line feeling, the "now reading" pill
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || "");
  const reply = `*She steps back.* "I'm sorry, I didn't mean-" *Her belly lets out a [sfx=gurgle]***Grrrbl...***[/sfx] and she covers it.* "A-and you are?" *A [sfx=burp]***BRAAP***[/sfx] slips out.* "S-sorry."\n[[mood: sad | place: Hall | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  let dirN = 0;
  const json = body => { if (/You direct voice actors/.test(sysOf(body))) { dirN++; return { lines: [{ i: 1, emotion: "sad", intensity: 3, speed: 1, volume: 1, }, { i: 2, emotion: "nervous", intensity: 2, }, { i: 3, emotion: "neutral" }] }; } return { summary: "x", facts: [] }; };
  const { b, pg, errs, calls } = await open({ width: W, json, stream: () => reply });
  const cart = []; let sse = "ok";
  // a real little PCM clip for the SSE (timed) endpoint: 1.6 s, the cut word ends at 0.9 s
  const pcm = Buffer.alloc(44100 * 1.6 * 4); for (let i = 0; i < 44100 * 1.6; i++) pcm.writeFloatLE(i > 44100 * 0.89 && i < 44100 * 0.95 ? 0 : Math.sin(i / 8) * 0.4, i * 4); // a little gap after "mean"
  await pg.route("https://api.cartesia.ai/**", async r => { const u = r.request().url(), body = JSON.parse(r.request().postData() || "{}"); cart.push({ u, body, at: Date.now() });
    if (/tts\/sse/.test(u)) { if (sse !== "ok") return r.fulfill({ status: 404, body: "no" });
      const words = body.transcript.split(/\s+/), step = 1.5 / words.length, ts = { words, start: words.map((_, i) => i * step), end: words.map((_, i) => (i + 1) * step) };
      const ev = [`event: chunk\ndata: ${JSON.stringify({ type: "chunk", data: pcm.toString("base64"), done: false })}`, `event: timestamps\ndata: ${JSON.stringify({ type: "timestamps", word_timestamps: ts })}`, `event: done\ndata: ${JSON.stringify({ type: "done", done: true })}`];
      return r.fulfill({ status: 200, body: ev.join("\n\n") + "\n\n", headers: { "content-type": "text/event-stream" } }); }
    await new Promise(x => setTimeout(x, 120)); return r.fulfill({ status: 200, body: Buffer.from([0xff, 0xfb, 0x90, 0]), headers: { "content-type": "audio/mpeg" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(() => {
    window.__said = []; window.__keys = [];
    const V = [{ name: "Samantha", lang: "en-US", localService: true }, { name: "Daniel", lang: "en-GB", localService: true }];
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    // a phone that reports words as it speaks them
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => V, speak: u => { const rec = { t: u.text, p: u.pitch, r: u.rate, v: u.volume, cut: null }; __said.push(rec); let stop = false; window.__cancel = () => { stop = true; };
      const ws = [...u.text.matchAll(/\S+/g)]; let i = 0; const tick = () => { if (stop) { rec.cut = ws[i - 1]?.[0]; return; } if (i < ws.length) { u.onboundary && u.onboundary({ name: "word", charIndex: ws[i].index }); i++; setTimeout(tick, 4); } else u.onend && u.onend(); }; setTimeout(tick, 2); },
      cancel: () => window.__cancel && window.__cancel() }, configurable: true });
    window.Audio = function (src) { const a = this; this.play = async () => { __said.push({ t: "[audio]", at: Date.now() }); setTimeout(() => a.onended && a.onended(), 250); }; this.pause = () => {}; this.addEventListener = () => {}; };
    window.playKey = async k => { __keys.push(k); __said.push({ t: "[sfx " + k + "]" }); return { dur: 0.05, done: new Promise(r => setTimeout(r, 30)), stop() {} }; };
  });
  chk("version 1.91 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 91));
  // stutters
  const st = await pg.evaluate(() => ["A-and you are?", "S-sorry.", "D-don't go", "C-Can you?", "I-I'm fine", "W-w-wait", "Ex-excuse me", "no-no", "T-shirt"].map(t => speakable(t, false)));
  chk(`stutters start the real word's sound and break off (${st.join(" | ")})`, st[0] === "And— and you are?" && st[1] === "Sor— sorry." && st[2] === "Don't— don't go" && st[3] === "Can— can you?" && st[4] === "I— I'm fine" && st[5] === "Wait— wait— wait" && st[6] === "Ex— excuse me" && st[7] === "no no" && st[8] === "T-shirt");
  // v1.94: cut-offs stay whole, with an em dash at the break
  const ex = await pg.evaluate(() => [voiceExpand({ text: "I'm sorry, I didn't mean-", who: "narrator" }).length, speakable("I'm sorry, I didn't mean-", true), speakable("I was going- no, never mind.", true), speakable("Wait –", true)]);
  chk(`a line cut off at its end trails off on " \`" for Cartesia; mid-line breaks keep an em dash (${ex.slice(1).join(" ; ")})`, ex[0] === 1 && ex[1] === "I'm sorry, I didn't mean `" && ex[2] === "I was going— no, never mind." && ex[3] === "Wait `");
  // phone: Everything mode, sounds in the narration play in place; the cut line stops right after "mean"
  await pg.evaluate(async () => { Object.assign(S.settings, { voiceOn: true, voiceAuto: false, voiceMode: "all" }); await saveSettings(); await openChat(S.chars[0].id); });
  await pg.waitForTimeout(300);
  const ph = await pg.evaluate(async () => {
    $("input").value = "hi"; $("send").click(); for (let i = 0; i < 200 && (S.busy || !S.chat.messages.some(x => /didn't mean/.test(x.content || ""))); i++) await new Promise(r => setTimeout(r, 50));
    const m = S.chat.messages.filter(x => x.role === "assistant").at(-1); __said = []; __keys = []; 
    await voiceRead(m, true); for (let i = 0; i < 120 && (VQ.busy || !__said.length); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 100));
    return { said: __said.map(x => x.t + (x.cut ? "{" + x.cut + "}" : "")), keys: __keys.slice() };
  });
  chk(`Everything mode plays every sound where it's written (${ph.keys})`, ph.keys.join() === "gurgle,burp" && ph.said.indexOf("[sfx gurgle]") > ph.said.findIndex(x => /didn't mean/.test(x)) && ph.said.indexOf("[sfx burp]") < ph.said.findIndex(x => /^Sor/.test(x)));
  const cutLine = ph.said.find(x => /didn't mean/.test(x)) || "";
  chk(`the phone says the cut line with an em dash (${cutLine})`, cutLine === "I'm sorry, I didn't mean—");
  chk(`then the next line comes at once (${ph.said.slice(0, 6).join(" · ")})`, ph.said.some(x => /^And— and you are\?/.test(x)));
  // dialogue mode: the burp in the narration plays between the lines, the gurgle doesn't
  const dl = await pg.evaluate(async () => { S.chat.voice = "dialogue"; const m = S.chat.messages.filter(x => x.role === "assistant").at(-1); __said = []; __keys = []; await voiceRead(m); for (let i = 0; i < 120 && (VQ.busy || !__said.length); i++) await new Promise(r => setTimeout(r, 50)); return { keys: __keys.slice(), said: __said.map(x => x.t) }; });
  chk(`Dialogue mode: a burp in the narration plays between the lines (${dl.said.join(" · ")})`, dl.keys.join() === "burp" && dl.said.indexOf("[sfx burp]") > dl.said.findIndex(x => /you are/.test(x)) && dl.said.indexOf("[sfx burp]") < dl.said.findIndex(x => /^Sor/.test(x)));
  // the pill while reading
  const pill = await pg.evaluate(async () => { const m = S.chat.messages.filter(x => x.role === "assistant").at(-1); window.speechSynthesis.speak = u => { __said.push({ t: u.text }); }; voiceRead(m, true); for (let i = 0; i < 60 && ($("voNow")?.hidden !== false); i++) await new Promise(r => setTimeout(r, 25));
    const t = $("voNow")?.textContent || "", on = $("voNow") && !$("voNow").hidden; $("voStop").click(); await new Promise(r => setTimeout(r, 30)); return { t, on, off: $("voNow").hidden, busy: VQ.busy }; });
  chk(`while reading, a pill shows who and how (${pill.t}); ■ stops it`, pill.on && /Narrator|sad|melancholic/.test(pill.t) && pill.off && !pill.busy);
  // tone controls
  const tf = await pg.evaluate(() => { const a = toneFinal({ emo: "sad", int: 3, speed: 0.9, vol: 0.85 }, {}); S.settings.voiceExpr = 2; const b = toneFinal({ emo: "sad", int: 3, speed: 0.9, vol: 0.85 }, {}); S.settings.voiceExpr = 1;
    const c = toneFinal({ emo: "neutral" }, { mood: "cold" }); S.settings.voiceMinInt = 4; const d = toneFinal({ emo: "happy", int: 1 }, {}); S.settings.voiceMinInt = 1; const e = toneFinal({ emo: "angry", int: 2 }, { expr: 1.8 }); return [a, b, c, d, e]; });
  chk(`expressiveness pushes feelings harder (sad ${tf[0].int} → ${tf[1].emo} ${tf[1].int}, speed ${tf[0].speed} → ${tf[1].speed}, volume ${tf[0].vol} → ${tf[1].vol})`, tf[1].int === 5 && tf[1].emo === "heartbroken" && tf[1].speed < tf[0].speed && tf[1].vol < tf[0].vol);
  chk(`a voice's usual mood fills plain lines (${tf[2].emo}); lowest intensity lifts weak ones (${tf[3].int}); a voice's own expressiveness (${tf[4].emo} ${tf[4].int})`, tf[2].emo === "cold" && tf[3].int === 4 && tf[4].int >= 4);
  const ui = await pg.evaluate(async () => {
    $("btnSettings").click(); await new Promise(r => setTimeout(r, 200)); document.querySelector('[data-stab="sounds"], [data-tab="sounds"]')?.click(); await new Promise(r => setTimeout(r, 100));
    const e = $("vExpr"), n = $("vMinInt"); if (!e || !n) return { ok: false };
    e.value = 1.6; e.dispatchEvent(new Event("input")); n.value = 3; n.dispatchEvent(new Event("input")); const lbl = $("vExprV").textContent; closeSheet();
    await new Promise(r => setTimeout(r, 300)); const st = await Store.get("settings"); S.settings.voiceExpr = 1; S.settings.voiceMinInt = 1; await saveSettings();
    openVoices(S.chars[0]); await new Promise(r => setTimeout(r, 150)); const md = document.querySelector("#voEd #cvMood"), ex = document.querySelector("#voEd #cvExpr");
    md.value = "playful"; md.dispatchEvent(new Event("change")); ex.value = 1.4; ex.dispatchEvent(new Event("input")); await new Promise(r => setTimeout(r, 450)); closeSheet();
    return { ok: true, lbl, expr: st.voiceExpr, min: st.voiceMinInt, voice: S.chars[0].voice };
  });
  chk(`Settings → Voices has Expressiveness (${ui.lbl}) and Lowest intensity, saved`, ui.ok && ui.lbl === "160%" && ui.expr === 1.6 && ui.min === 3);
  chk(`each voice has a usual mood and its own expressiveness (${JSON.stringify(ui.voice)})`, ui.voice?.mood === "playful" && ui.voice?.expr === 1.4);
  // a line's feeling set by hand (long-press → How it sounds), heard on Cartesia
  const lo = await pg.evaluate(async () => {
    S.chars[0].voice = { cart: "v1" }; Object.assign(S.settings, { voiceEngine: "cartesia", cartKey: "k" }); S.chat.voice = "dialogue";
    const q = [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /you are/.test(x.textContent)); openLineOwner(q); for (let i = 0; i < 60 && !document.querySelector(".lo-tone"); i++) await new Promise(r => setTimeout(r, 30));
    const before = document.querySelector(".lo-tone")?.textContent; document.querySelector('[data-emo="furious"]').click(); await new Promise(r => setTimeout(r, 50));
    const s1 = $("loInt"); s1.value = 5; s1.dispatchEvent(new Event("input")); s1.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 50));
    const after = document.querySelector(".lo-tone")?.textContent; window.__c0 = 1; $("loHear").click(); await new Promise(r => setTimeout(r, 700)); closeSheet();
    const m = S.chat.messages.filter(x => x.role === "assistant").at(-1), stored = (await Store.get("c2:" + S.chat.id)).messages.find(x => x.id === m.id)?.vtoneBy;
    return { before, after, stored };
  });
  const said1 = cart.filter(x => /tts\/bytes/.test(x.u)).at(-1)?.body;
  chk(`long-press shows what the AI hears (${lo.before}) and lets you set the feeling and intensity (${lo.after})`, /The AI hears: nervous/.test(lo.before) && /You set: furious · 5 of 5/.test(lo.after) && JSON.stringify(lo.stored || {}).includes('"emo":"furious","int":5'));
  chk(`Hear it uses your choice (${said1?.generation_config?.emotion}, volume ${said1?.generation_config?.volume})`, said1?.generation_config?.emotion === "angry" && said1?.generation_config?.volume >= 1.7);
  const rd = await pg.evaluate(async () => { const m = S.chat.messages.filter(x => x.role === "assistant").at(-1); const p = await toneParts(m, voiceParts(m, "dialogue")); return p.map(x => x.emo + (x.ovr ? "*" : "")); });
  chk(`reading the reply keeps your choice for that line (${rd})`, rd[1] === "furious*" && rd[0] !== "furious*");
  // Cartesia: the cut line goes to the normal endpoint with an em dash, so the voice takes its own breath; no timings needed
  cart.length = 0;
  await pg.evaluate(async () => { const m = S.chat.messages.filter(x => x.role === "assistant").at(-1); VQ.cache.clear(); await voiceRead(m, true); for (let i = 0; i < 160 && VQ.busy; i++) await new Promise(r => setTimeout(r, 25)); });
  const fb = cart.filter(x => /tts\/bytes/.test(x.u));
  chk(`Cartesia gets the cut line ending on " \`" (${fb[0]?.body?.transcript}), nothing else`, fb[0]?.body?.transcript === "I'm sorry, I didn't mean `" && !cart.some(x => /tts\/sse/.test(x.u)));
  chk(`the next lines are fetched ahead, so there's no wait between them (${fb.length} fetched)`, fb.length >= 2 && fb[1].at - fb[0].at < 400);
  // the prompt: asked-for burps go inside the speech
  const pr = await pg.evaluate(() => { const c = S.chars[0]; S.chat.messages.push({ id: "u-b", role: "user", content: "Make her burp mid-sentence please" }); const p = buildPrompt(c, S.chat); S.chat.messages.pop(); return { sys: p[0].content, last: p.at(-1).content }; });
  chk("the prompt says to put asked-for burps inside the quotes, and a reminder rides on your message", /whenever .* asks for burps or belches/.test(pr.sys) && /wants burps or belches here: write them inside the characters' quotes/.test(pr.last));
  const pr2 = await pg.evaluate(() => { const c = S.chars[0]; S.chat.messages.push({ id: "u-c", role: "user", content: "hello" }); const p = buildPrompt(c, S.chat); S.chat.messages.pop(); return p.at(-1).content; });
  chk("no burp reminder when you didn't ask", !/wants burps/.test(pr2));
  const wide = await pg.evaluate(async () => { const q = [...document.querySelectorAll("#msgs .msg.assistant .q")][0]; openLineOwner(q); await new Promise(r => setTimeout(r, 300)); const w = document.documentElement.scrollWidth <= innerWidth + 1; closeSheet(); return w; });
  chk("no sideways scroll", wide);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
