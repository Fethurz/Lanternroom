// v1.84: voices: replies read aloud with the phone's voices or Cartesia (own key, cloning), per chat off / dialogue / everything,
// a voice per character, auto-read, tap a line to hear it again
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  let reply = `*She smiles.* "Hello there, traveller." [sfx=burp]***BRAAAP***[/sfx] *She leans in.* "Come closer."\n[[mood: calm | place: Inn | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  const { b, pg, errs } = await open({ width: W, stream: () => reply });
  const cart = []; let cartStatus = 200;
  await pg.route("https://api.cartesia.ai/**", async r => { const q = r.request(); cart.push({ url: q.url(), method: q.method(), h: q.headers(), body: q.postData() || "" });
    if (cartStatus !== 200) return r.fulfill({ status: cartStatus, body: "nope" });
    if (/voices\/clone/.test(q.url())) return r.fulfill({ status: 200, body: JSON.stringify({ id: "vc-cloned-1", name: "x" }), headers: { "content-type": "application/json" } });
    if (/\/voices/.test(q.url())) return r.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: "v-a", name: "Velvet Narrator", description: "deep" }, { id: "v-b", name: "Bright Girl" }] }), headers: { "content-type": "application/json" } });
    return r.fulfill({ status: 200, body: Buffer.from([0xff, 0xfb, 0x90, 0x00]), headers: { "content-type": "audio/mpeg" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  // a stand-in for the phone's speech engine: records what is said, by which voice, at what pitch
  await pg.evaluate(() => {
    window.__said = []; window.__cancel = 0;
    const V = ["Google UK English Female", "Google UK English Male", "Samantha", "Daniel", "Zira"].map((name, i) => ({ name, lang: "en-US", localService: i % 2 === 0 }));
    window.SpeechSynthesisUtterance = function (t) { this.text = t; this.voice = null; this.pitch = 1; this.rate = 1; this.volume = 1; };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => V, speak: u => { __said.push({ t: u.text, v: u.voice?.name, p: u.pitch, r: u.rate }); setTimeout(() => u.onend && u.onend(), 5); }, cancel: () => { __cancel++; } }, configurable: true });
    window.Audio = function (src) { this.src = src; this.play = async () => { __said.push({ t: "[audio]", src }); setTimeout(() => this.onended && this.onended(), 5); }; this.pause = () => {}; this.addEventListener = () => {}; this.removeEventListener = () => {}; };
  });
  chk("version 1.84 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 84));
  chk("voices are off until switched on; the Cartesia key never leaves the device", await pg.evaluate(() => !voiceOn() && LOCAL_ONLY.includes("cartKey") && !("cartKey" in stripLocal({ cartKey: "x", a: 1 }))));

  // ---------- Settings → Sounds → Voices
  const set = await pg.evaluate(async () => {
    $("btnSettings").click(); await new Promise(r => setTimeout(r, 80)); const g = $("sVoices"); const before = !!$("vEng");
    $("vOn").click(); await new Promise(r => setTimeout(r, 30));
    const after = !!$("vEng") && !!$("vMode") && !!$("vAuto") && !!$("vNar") && /Sounds/.test(g.closest(".set-panel")?.dataset.k === "sounds" ? "Sounds" : "");
    $("vTest").click(); await new Promise(r => setTimeout(r, 60));
    return { before, after, on: S.settings.voiceOn, test: __said.length >= 2 && __said[0].t.includes("lantern") };
  });
  chk("Settings → Sounds has Voices: switching them on shows engine, reading mode, auto-read, narrator", !set.before && set.after && set.on);
  chk("Test reads a narrator line and a character line", set.test);
  await pg.evaluate(() => closeSheet());

  // ---------- what gets read
  const parts = await pg.evaluate(() => {
    const m = { role: "assistant", content: `*She smiles.* "Hello there, traveller." [sfx=burp]***BRAAAP***[/sfx] *She leans in.* "Come closer."\n[[mood: calm | place: Inn]]` };
    const d = voiceParts(m, "dialogue").map(p => [p.text, p.who === "narrator" ? "N" : p.who?.name]), a = voiceParts(m, "all").map(p => [p.text, p.who === "narrator" ? "N" : "C"]);
    return { d, a };
  });
  chk(`dialogue only: just the quotes, in the character's voice (${parts.d.map(x => x[0]).join(" | ")})`, parts.d.length === 2 && parts.d[0][0] === "Hello there, traveller." && parts.d[1][0] === "Come closer.");
  chk(`everything: narration in the narrator's voice in between; sound words and the hidden tag never read (${parts.a.map(x => x[1]).join("")})`, parts.a.map(x => x[1]).join("") === "NCNC" && !parts.a.some(x => /BRAA|mood/.test(x[0])));
  const grp = await pg.evaluate(() => { const m1 = { id: "mm1", kind: "character", name: "Mara", description: "she is fierce" }, m2 = { id: "mm2", kind: "character", name: "Tom", description: "he is calm" }, g = { id: "gg1", kind: "group", name: "G", members: ["mm1", "mm2"] }; S.chars.push(m1, m2, g); const was = S.charId; S.charId = "gg1"; const p = voiceParts({ role: "assistant", content: `**Mara:** "Hi there."\n**Tom:** "Yo."` }, "dialogue").map(x => x.who?.name); S.charId = was; S.chars = S.chars.filter(c => !["mm1", "mm2", "gg1"].includes(c.id)); return p; });
  chk(`group replies: each member's lines in their own voice (${grp.join(", ")})`, grp[0] === "Mara" && grp[1] === "Tom");
  const vo = await pg.evaluate(() => { const f = voiceFor({ name: "Ivy", description: "She is a witch", id: "a" }), m = voiceFor({ name: "Rolf", description: "He is a wolf", id: "b" }); return { f: f.phone?.name, fp: f.pitch, m: m.phone?.name, mp: m.pitch, same: voiceFor({ name: "Ivy", description: "She", id: "a" }).phone?.name === f.phone?.name }; });
  chk(`automatic voices: women and men get fitting voices and pitches (${vo.f} ${vo.fp.toFixed(2)}, ${vo.m} ${vo.mp.toFixed(2)}), always the same`, /Female|Samantha|Zira/.test(vo.f) && /Male|Daniel/.test(vo.m) && vo.fp > 1 && vo.mp < 1 && vo.same);

  // ---------- in a chat
  await pg.evaluate(async () => { const c = S.chars[0]; await openChat(c.id); });
  await pg.waitForTimeout(300);
  const auto = await pg.evaluate(async () => { __said = []; $("input").value = "hi"; $("send").click(); for (let i = 0; i < 100 && (S.busy || __said.length < 2); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 100)); return __said.map(x => x.t); });
  chk(`a new reply is read as soon as it's written (dialogue only by default: ${auto.join(" | ")})`, auto.length === 2 && auto[0] === "Hello there, traveller.");
  const opt = await pg.evaluate(async () => {
    $("btnMore").click(); await new Promise(r => setTimeout(r, 60));
    const has = !!$("oVoice"), t1 = $("oVoice")?.textContent; $("oVoice")?.click(); await new Promise(r => setTimeout(r, 30)); const t2 = $("oVoice")?.textContent; const m2 = S.chat.voice;
    closeSheet(); __said = []; voiceAfterReply(S.chat.messages.filter(m => m.role === "assistant").at(-1)); await new Promise(r => setTimeout(r, 80)); const all = __said.length;
    S.chat.voice = "off"; __said = []; voiceAfterReply(S.chat.messages.filter(m => m.role === "assistant").at(-1)); await new Promise(r => setTimeout(r, 60)); const off = __said.length;
    return { has, t1, t2, m2, all, off };
  });
  chk(`⋯ Options switches this chat's voices (${opt.t1} → ${opt.t2})`, opt.has && /Dialogue only/.test(opt.t1) && /Everything/.test(opt.t2) && opt.m2 === "all");
  chk(`everything reads 4 parts; off reads nothing (${opt.all}, ${opt.off})`, opt.all === 4 && opt.off === 0);
  const menu = await pg.evaluate(async () => {
    const i = S.chat.messages.map(m => m.role).lastIndexOf("assistant"); S.openActs = S.chat.messages[i].id; renderMsgs(true); await new Promise(r => setTimeout(r, 30));
    const btn = document.querySelector('#msgs [data-act="read"]'); __said = []; btn?.click(); await new Promise(r => setTimeout(r, 80)); const read = __said.length;
    __said = []; const q = [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /Come closer/.test(x.textContent)); q?.click(); await new Promise(r => setTimeout(r, 40));
    return { btn: !!btn, read, tap: __said.map(x => x.t).join("|") };
  });
  chk("⋯ on a reply has Read aloud (works even with this chat's voices off)", menu.btn && menu.read === 2);
  chk(`tapping a line of speech reads it again (${menu.tap})`, menu.tap === "Come closer.");
  const stop = await pg.evaluate(async () => { const n = __cancel; leaveChat(); await new Promise(r => setTimeout(r, 40)); return __cancel > n; });
  chk("leaving the chat stops the reading", stop);

  // ---------- the bot editor's Voice group
  const ed = await pg.evaluate(async () => {
    const c = S.chars[0]; editChar(c, false); await new Promise(r => setTimeout(r, 120));
    const box = !!$("cVoice") && !!$("cvPhone"); $("cvPhone").value = "Daniel"; $("cvPhone").dispatchEvent(new Event("change")); $("cvPitch").value = "0.7"; $("cvPitch").dispatchEvent(new Event("input"));
    __said = []; $("cvTest").click(); await new Promise(r => setTimeout(r, 40)); const test = __said[0];
    $("cSave").click(); await new Promise(r => setTimeout(r, 150));
    return { box, test, saved: S.chars[0].voice };
  });
  chk(`the editor's Voice group: pick a phone voice and pitch, Test, saved (${JSON.stringify(ed.saved)})`, ed.box && ed.test?.v === "Daniel" && Math.abs(ed.test.p - 0.7) < 0.01 && ed.saved?.phone === "Daniel" && ed.saved?.pitch === 0.7);

  // ---------- Cartesia
  const ct = await pg.evaluate(async () => {
    S.settings.voiceEngine = "cartesia"; S.settings.cartKey = "sk_car_test"; S.chars[0].voice = { ...S.chars[0].voice, cart: "v-char" };
    __said = []; voiceSay([{ text: "Hello from Cartesia.", who: S.chars[0] }]); await new Promise(r => setTimeout(r, 200)); return __said;
  });
  const req = cart.find(x => /tts\/bytes/.test(x.url)), body = req ? JSON.parse(req.body) : {};
  chk("with Cartesia on, a character's line is fetched from Cartesia with your key and played", ct.some(x => x.t === "[audio]") && req && req.h.authorization === "Bearer sk_car_test" && req.h["cartesia-version"] && body.transcript === "Hello from Cartesia." && body.voice?.id === "v-char" && /^sonic/.test(body.model_id));
  const again = await pg.evaluate(async () => { __said = []; voiceSay([{ text: "Hello from Cartesia.", who: S.chars[0] }]); await new Promise(r => setTimeout(r, 120)); return __said.length; });
  chk("the same line again is played from memory (no second charge)", again === 1 && cart.filter(x => /tts\/bytes/.test(x.url)).length === 1);
  cartStatus = 401;
  const fb = await pg.evaluate(async () => { __said = []; voiceSay([{ text: "Different line.", who: S.chars[0] }]); await new Promise(r => setTimeout(r, 200)); return { said: __said.map(x => x.t), toast: [...document.querySelectorAll(".toast")].some(x => /key was refused/.test(x.textContent)) }; });
  chk("a refused key falls back to the phone's voices and says why", fb.said.includes("Different line.") && fb.toast);
  cartStatus = 200;
  const cl = await pg.evaluate(async () => {
    editChar(S.chars[0], false); await new Promise(r => setTimeout(r, 120));
    $("cvList").click(); await new Promise(r => setTimeout(r, 150)); const list = $("cvSel")?.options.length;
    const f = new File([new Uint8Array([1, 2, 3])], "me.webm", { type: "audio/webm" }), dt = new DataTransfer(); dt.items.add(f); $("cvFile").files = dt.files; $("cvFile").dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 200));
    const msg = $("cvMsg").textContent, id = $("cvCart").value; $("cSave").click(); await new Promise(r => setTimeout(r, 150)); return { list, msg, id, saved: S.chars[0].voice?.cart };
  });
  const creq = cart.find(x => /voices\/clone/.test(x.url));
  chk(`your Cartesia voices can be picked (${cl.list - 1})`, cl.list === 3);
  chk("a clip clones a new voice for the bot (sent as a clip with a name)", creq && /name="clip"/.test(creq.body) && /name="name"/.test(creq.body) && cl.id === "vc-cloned-1" && cl.saved === "vc-cloned-1" && /Done/.test(cl.msg));
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
