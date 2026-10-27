// v1.86: tildes stretch words, burps inside speech pause the voice, pitch/speed on Cartesia, the voice picker, persona voices
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const reply = `*She pats her round belly.* "That was [sfx=burp]***Hrrrp***[/sfx] delicious~" *She grins.* "Come here, darling~"\n[[mood: happy | place: Inn | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  const { b, pg, errs } = await open({ width: W, stream: () => reply });
  const cart = [];
  const VOICES = [
    { id: "f1", name: "Velvet", description: "A sultry, smooth American woman's voice", gender: "feminine", language: "en" },
    { id: "f2", name: "Pip", description: "A young, bubbly and energetic girl", gender: "feminine", language: "en" },
    { id: "m1", name: "Grim", description: "A deep, gravelly British man, perfect for villains", gender: "masculine", language: "en" },
    { id: "m2", name: "Hank", description: "Warm southern drawl, older man", gender: "masculine", language: "en" },
    { id: "n1", name: "Echo", description: "Calm, neutral narrator for audiobooks", gender: "gender_neutral", language: "en" },
    { id: "my1", name: "My Clone", description: "", gender: "feminine", language: "en", is_owner: true }];
  await pg.route("https://api.cartesia.ai/**", async r => { const q = r.request(), u = q.url(); cart.push({ url: u, body: q.postData() || "" });
    if (/\/voices\?/.test(u)) { const after = new URL(u).searchParams.get("starting_after"); const page = after ? VOICES.slice(3) : VOICES.slice(0, 3); return r.fulfill({ status: 200, body: JSON.stringify({ data: page, has_more: !after }), headers: { "content-type": "application/json" } }); }
    return r.fulfill({ status: 200, body: Buffer.from([0xff, 0xfb, 0x90, 0]), headers: { "content-type": "audio/mpeg" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(() => {
    window.__said = []; window.__t0 = performance.now();
    const V = [{ name: "Samantha", lang: "en-US", localService: true }, { name: "Daniel", lang: "en-GB", localService: true }, { name: "Karen", lang: "en-AU", localService: true }];
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => V, speak: u => { __said.push({ t: u.text, v: u.voice?.name, p: u.pitch, r: u.rate, at: performance.now() }); setTimeout(() => u.onend && u.onend(), 20); }, cancel: () => {} }, configurable: true });
    window.Audio = function (src) { const a = this; this.play = async () => { __said.push({ t: "[audio]", rate: a.playbackRate, keep: a.preservesPitch, at: performance.now() }); setTimeout(() => a.onended && a.onended(), 20); }; this.pause = () => {}; this.addEventListener = () => {}; };
    // burps: a recording that takes 400 ms
    window.playKey = async k => { const at = performance.now(); let fin; const done = new Promise(r => fin = r); __said.push({ t: "[sfx " + k + "]", at }); setTimeout(() => { __said.push({ t: "[sfx end]", at: performance.now() }); fin(); }, 400); return { dur: 0.4, done, stop() {} }; };
  });
  chk("version 1.86 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 86));

  // ---------- tildes
  const tl = await pg.evaluate(() => ({ hi: untilde("hi~"), pl: untilde("please~"), so: untilde("so~~"), hm: untilde("Hmm~"), you: untilde("love you~♡"), lone: untilde("okay ~ fine"), dar: untilde("darling~") }));
  chk(`a tilde stretches the word instead of being read (${Object.values(tl).join(" | ")})`, tl.hi === "hiii" && tl.pl === "pleeease" && tl.so === "sooo" && tl.hm === "Hmmmm" && tl.you === "love youuu" && tl.lone === "okay fine" && tl.dar === "darliiing");

  // ---------- burps inside speech
  const parts = await pg.evaluate(() => voiceParts({ role: "assistant", content: `*She pats her belly.* "That was [sfx=burp]***Hrrrp***[/sfx] delicious~" "Come here, darling~"` }, "dialogue").map(p => ({ t: p.text, s: p.segs && p.segs.map(x => x.sfx ? "<" + x.sfx + ">" : x.text).join(" / ") })));
  chk(`a burp inside a line splits it: words, the burp, the rest (${parts.map(p => p.s || p.t).join(" || ")})`, parts.length === 2 && parts[0].s === "That was / <burp> / deliciiious" && parts[0].t === "That was deliciiious" && parts[1].t === "Come here, darliiing" && !parts.some(p => /~|tilde/.test(p.t)));
  const fx = await pg.evaluate(() => fixFormat(`*She pats her belly.* "That was [sfx=burp]***Hrrrp***[/sfx] delicious~"`));
  chk(`new replies keep the burp inside the quote (${fx})`, fx === `*She pats her belly.* "That was [sfx=burp]***Hrrrp***[/sfx] delicious~"`);
  const pr = await pg.evaluate(() => { const c = S.chars[0], ch = newChat(c, S.personas[0].id); ch.messages.push({ role: "user", content: "hi", id: "u" }); return /burp or belch may break into someone's speech/.test(onoPrompt(c, ch, ch.messages.length)); });
  chk("the prompt says burps may break into speech when the moment calls for it", pr);
  await pg.evaluate(async () => { S.settings.voiceOn = true; S.settings.voiceTone = false; await saveSettings(); await openChat(S.chars[0].id); });
  await pg.waitForTimeout(300);
  const seq = await pg.evaluate(async () => { __said = []; $("input").value = "hi"; $("send").click(); for (let i = 0; i < 160 && (S.busy || !__said.some(x => /darli/.test(x.t))); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 100)); return __said; });
  const iT = seq.findIndex(x => x.t === "That was"), iB = seq.findIndex(x => x.t === "[sfx burp]"), iE = seq.findIndex(x => x.t === "[sfx end]"), iD = seq.findIndex(x => /delici/.test(x.t));
  chk(`reading it: the words, then the burp, then the rest only after the burp has finished (${seq.map(x => x.t.slice(0, 14)).join(" | ")})`, iT >= 0 && iB > iT && iE > iB && iD > iE && seq[iD].at - seq[iE].at >= 150);
  const html = await pg.evaluate(() => { const q = [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /That was/.test(x.textContent)); return q ? { sfx: !!q.querySelector(".sfx-k"), txt: q.textContent } : null; });
  chk("in the chat the burp shows inside the speech as a sound word", html && html.sfx);
  const tap = await pg.evaluate(async () => { __said = []; const q = [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /That was/.test(x.textContent)); q.click(); await new Promise(r => setTimeout(r, 900)); return __said.map(x => x.t); });
  chk(`tapping that line plays it with the burp again (${tap.join(" | ")})`, tap[0] === "That was" && tap.includes("[sfx burp]") && /delici/.test(tap.at(-1)));

  // ---------- pitch and speed on Cartesia
  const cp = await pg.evaluate(async () => {
    S.settings.voiceEngine = "cartesia"; S.settings.cartKey = "sk_car_t"; S.chars[0].voice = { cart: "m1", pitch: 0.8, rate: 1.2 }; __said = []; VQ.cache.clear();
    voiceSay([{ text: "Deep and quick.", who: S.chars[0] }]); for (let i = 0; i < 40 && !__said.length; i++) await new Promise(r => setTimeout(r, 25));
    const a = __said[0]; S.chars[0].voice = { cart: "m1" }; __said = [];
    voiceSay([{ text: "Plain.", who: S.chars[0] }]); for (let i = 0; i < 40 && !__said.length; i++) await new Promise(r => setTimeout(r, 25));
    return { a, b: __said[0] };
  });
  const tts = cart.filter(x => /tts\/bytes/.test(x.url)).map(x => JSON.parse(x.body));
  chk(`a deeper, faster Cartesia voice: pitch shifted on playback, Cartesia asked for the matching pace (speed ${tts[0]?.generation_config?.speed}, played at ${cp.a?.rate}, keep pitch ${cp.a?.keep})`, tts[0]?.generation_config?.speed === 1.5 && Math.abs(cp.a.rate - 0.8) < 0.001 && cp.a.keep === false);
  chk("without pitch and speed nothing changes (no speed sent, normal playback)", !tts[1]?.generation_config && cp.b?.rate === 1 && cp.b?.keep === true);

  // ---------- the voice picker
  const pk = await pg.evaluate(async () => {
    openVoices(S.chars[0]); await new Promise(r => setTimeout(r, 150));
    const sliders = !!$("cvPitch") && /Cartesia voices too/.test($("voEd").textContent);
    $("cvList").click(); for (let i = 0; i < 40 && !document.querySelector("#voPop .vp-card"); i++) await new Promise(r => setTimeout(r, 25));
    const P = $("voPop"), names = () => [...P.querySelectorAll(".vp-card b")].map(x => x.textContent);
    const all = [...new Set(names())], tabs = [...P.querySelectorAll("[data-tab]")].map(x => x.textContent.trim());
    const secs = [...P.querySelectorAll(".vp-sec")].map(x => x.textContent.replace(/\d+/g, "").trim());
    P.querySelector('[data-tab="m"]').click(); const male = names();
    P.querySelector('[data-tab="all"]').click(); P.querySelector('[data-tr="Deep"]').click(); const deep = names(); P.querySelector('[data-tr="Deep"]').click();
    const qi = P.querySelector("#vpQ"); qi.value = "bubbly"; qi.dispatchEvent(new Event("input")); const srch = names(); const qi2 = P.querySelector("#vpQ"); qi2.value = ""; qi2.dispatchEvent(new Event("input"));
    P.querySelector('[data-tab="mine"]').click(); const mine = names(); P.querySelector('[data-tab="all"]').click();
    const card = [...P.querySelectorAll(".vp-card")].find(c => c.dataset.id === "f1"); card.querySelector("[data-fav]").click(); const fav = (S.settings.voiceFavs || []).includes("f1");
    __said = []; [...P.querySelectorAll(".vp-card")].find(c => c.dataset.id === "f2").querySelector("[data-play]").click(); for (let i = 0; i < 80 && !__said.length; i++) await new Promise(r => setTimeout(r, 50)); const heard = __said.length;
    const wide = document.documentElement.scrollWidth <= innerWidth + 1 && P.querySelector(".pix-card").scrollWidth <= P.querySelector(".pix-card").clientWidth + 1;
    [...P.querySelectorAll(".vp-card")].find(c => c.dataset.id === "f2").querySelector("[data-use]").click(); await new Promise(r => setTimeout(r, 60));
    const btn = $("cvList").textContent, id = $("cvCart").value;
    $("cvList").click(); for (let i = 0; i < 40 && !document.querySelector("#voPop"); i++) await new Promise(r => setTimeout(r, 25));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await new Promise(r => setTimeout(r, 60));
    const escOk = !$("voPop") && !$("sheet").hidden;
    await new Promise(r => setTimeout(r, 500));
    return { sliders, all, tabs, secs, male, deep, srch, mine, fav, heard, wide, btn, id, escOk, saved: S.chars[0].voice?.cart };
  });
  chk(`the picker lists every page of voices (${pk.all.length}) with gender tabs (${pk.tabs.join(", ")})`, pk.all.length === 6 && pk.tabs.some(t => /^Female\s*3/.test(t)) && pk.tabs.some(t => /^Male\s*2/.test(t)) && pk.tabs.some(t => /Cloned\s*1/.test(t)));
  chk(`sections by accent (${pk.secs.join(", ")})`, pk.secs.includes("American") && pk.secs.includes("British") && pk.secs.includes("Southern US"));
  chk(`Male tab, Deep filter and search narrow it (${pk.male.join(",")} | ${pk.deep.join(",")} | ${pk.srch.join(",")} | yours: ${pk.mine.join(",")})`, pk.male.join() === "Grim,Hank" && pk.deep.join() === "Grim" && pk.srch.join() === "Pip" && pk.mine.join() === "My Clone");
  chk("★ keeps a favourite, ▶ plays a sample, no sideways scroll", pk.fav && pk.heard >= 1 && pk.wide);
  chk(`Use picks it, shown by name, saved with the bot (${pk.btn.trim()})`, /Pip/.test(pk.btn) && pk.id === "f2" && pk.saved === "f2");
  chk("Esc closes only the picker", pk.escOk);
  chk("the phone list is the list's paged requests (2 pages, then cached)", cart.filter(x => /\/voices\?/.test(x.url)).length === 2);

  // ---------- persona voices
  const pv = await pg.evaluate(async () => {
    S.settings.voiceEngine = "phone"; await saveSettings(); closeSheet();
    const p = S.personas[0]; editPersona(p, false); await new Promise(r => setTimeout(r, 120));
    const has = !!$("peVoice") && !!$("cvPhoneB");
    $("cvPhoneB").click(); for (let i = 0; i < 40 && !document.querySelector("#voPop .vp-card"); i++) await new Promise(r => setTimeout(r, 25));
    const ph = [...document.querySelectorAll("#voPop .vp-sec")].map(x => x.textContent.replace(/\d+/g, "").trim());
    [...document.querySelectorAll("#voPop .vp-card")].find(c => c.dataset.id === "Daniel").querySelector("[data-use]").click(); await new Promise(r => setTimeout(r, 40));
    $("cvPitch").value = "0.75"; $("cvPitch").dispatchEvent(new Event("input"));
    $("peSave").click(); await new Promise(r => setTimeout(r, 200));
    return { has, ph, saved: S.personas[0].voice };
  });
  chk(`the persona editor has Your voice; phone voices sorted by accent too (${pv.ph.join(", ")})`, pv.has && pv.ph.includes("British") && pv.ph.includes("Australian"));
  chk(`the persona's voice is saved (${JSON.stringify(pv.saved)})`, pv.saved?.phone === "Daniel" && pv.saved?.pitch === 0.75);
  await pg.evaluate(async () => { closeSheet(); if ($("chat").hidden) await openChat(S.chars[0].id); });
  await pg.waitForTimeout(200);
  const me = await pg.evaluate(async () => {
    S.chat.messages.push({ id: "mine1", role: "user", content: `*I stretch.* "Morning~ did I sleep long?"` }); renderMsgs(); await new Promise(r => setTimeout(r, 60));
    __said = []; const q = [...document.querySelectorAll("#msgs .msg.user .q")].find(x => /Morning/.test(x.textContent)); if (!q) return null; q.click(); await new Promise(r => setTimeout(r, 120)); return __said[0];
  });
  chk(`tapping your own line reads it in your persona's voice (${me?.t} · ${me?.v} · ${me?.p})`, me && me.t === "Morniiing did I sleep long?" && me.v === "Daniel" && Math.abs(me.p - 0.75) < 0.2);

  // ---------- Settings: narrator and default voice use the picker
  const st = await pg.evaluate(async () => { S.settings.voiceEngine = "cartesia"; await saveSettings(); closeSheet(); $("btnSettings").click(); await new Promise(r => setTimeout(r, 150)); const ok = !!$("vNarC") && !!$("vDef") && !!$("vNarP");
    $("vNarC").click(); for (let i = 0; i < 40 && !document.querySelector("#voPop .vp-card"); i++) await new Promise(r => setTimeout(r, 25));
    [...document.querySelectorAll("#voPop .vp-card")].find(c => c.dataset.id === "n1").querySelector("[data-use]").click(); await new Promise(r => setTimeout(r, 60));
    return { ok, nar: S.settings.narrator?.cart, lbl: $("vNarC")?.textContent }; });
  chk(`Settings picks the narrator's voice from the picker (${st.lbl?.trim()}), with narrator pitch and speed`, st.ok && st.nar === "n1" && /Echo/.test(st.lbl));
  // ---------- a voice for each group member and world character
  const gw = await pg.evaluate(async () => {
    S.settings.voiceEngine = "phone"; await saveSettings(); closeSheet();
    const m1 = { ...blankChar("character"), id: "mm1", name: "Mara", description: "she is fierce" }, m2 = { ...blankChar("character"), id: "mm2", name: "Tom", description: "he is calm" }, g = { ...blankChar("group"), id: "gg1", name: "Pair", members: ["mm1", "mm2"] };
    const w = { ...blankChar("world"), id: "ww1", name: "Realm", description: "A realm.", cast: [{ name: "Guard", type: "character", details: "a gruff man" }, { name: "Castle", type: "location", details: "big" }, { name: "Queen", type: "character", details: "she rules" }] };
    S.chars.push(m1, m2, g, w); await saveChars();
    const pick = async (btn, id) => { btn.click(); for (let i = 0; i < 40 && !document.querySelector("#voPop .vp-card"); i++) await new Promise(r => setTimeout(r, 25)); [...document.querySelectorAll("#voPop .vp-card")].find(c => c.dataset.id === id).querySelector("[data-use]").click(); await new Promise(r => setTimeout(r, 50)); };
    openVoices(g); await new Promise(r => setTimeout(r, 150));
    const gt = [...document.querySelector(".vo-tabs").querySelectorAll(".tab")].map(x => x.textContent.trim());
    document.querySelector('[data-vt="2"]').click(); await new Promise(r => setTimeout(r, 30));
    await pick($("voEd").querySelector("#cvPhoneB"), "Karen"); const tabNow = document.querySelector('[data-vt="2"]').textContent;
    await new Promise(r => setTimeout(r, 500));
    const mv = byId("mm2").voice, m1v = byId("mm1").voice;
    openVoices(byId("ww1")); await new Promise(r => setTimeout(r, 150));
    const wt = [...document.querySelector(".vo-tabs").querySelectorAll(".tab")].map(x => x.textContent.trim());
    document.querySelector('[data-vt="1"]').click(); await new Promise(r => setTimeout(r, 30));
    await pick($("voEd").querySelector("#cvPhoneB"), "Daniel"); const narr = byId("ww1").voice;
    await new Promise(r => setTimeout(r, 500));
    const was = S.charId; S.charId = "ww1"; const wp = voiceParts({ role: "assistant", content: `*The Guard steps forward.* "Halt."` }, "dialogue"); const wv = voiceFor(wp[0]?.who, wp[0]?.who?.id).phone?.name; S.charId = was;
    return { gt, tabNow, mv, m1v, wt, narr, guard: byId("ww1").cast[0].voice, wv };
  });
  chk(`a group's Voices window has a tab per member (${gw.gt.join(", ")}); picking one marks it (${gw.tabNow})`, gw.gt.join() === "Whole group,Mara,Tom" && /🎙/.test(gw.tabNow));
  chk(`the member's voice is saved on them, the other untouched (${JSON.stringify(gw.mv)})`, gw.mv?.phone === "Karen" && !gw.m1v);
  chk(`a world's Voices window has a tab per character listing, not places (${gw.wt.join(", ")}); the world narrator stays as it was`, gw.wt.join() === "Narrator,Guard,Queen" && !gw.narr?.phone);
  chk(`the world character speaks in their own voice (${gw.wv})`, gw.guard?.phone === "Daniel" && gw.wv === "Daniel");
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
