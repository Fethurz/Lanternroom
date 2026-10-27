// v1.88: voices live in their own window on the profile (tabs for everyone, side characters), cloned voices are kept and
// sorted on their own, new characters are found in chats, and the AI decides who speaks each line from the whole context
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  let reply = `*The Guard nods.* "Welcome." *The Queen sighs.* "Leave us." *A merchant shouts from the street.* "Fresh bread!"\n[[mood: calm | place: Hall | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  const dir = []; let answer = null;
  const json = body => { if (/You direct voice actors/.test(sysOf(body))) { dir.push({ sys: sysOf(body), usr: usrOf(body) }); return answer; } return { summary: "x", facts: [] }; };
  const { b, pg, errs } = await open({ width: W, json, stream: () => reply });
  const cart = [];
  await pg.route("https://api.cartesia.ai/**", r => { const u = r.request().url(); cart.push(u);
    if (/voices\/clone/.test(u)) return r.fulfill({ status: 200, body: JSON.stringify({ id: "vc-new", name: "x" }), headers: { "content-type": "application/json" } });
    if (/\/voices/.test(u)) return r.fulfill({ status: 200, body: JSON.stringify({ data: [{ id: "c1", name: "Stock One", description: "warm woman", gender: "feminine" }] }), headers: { "content-type": "application/json" } });
    return r.fulfill({ status: 200, body: Buffer.from([0xff, 0xfb, 0x90, 0]), headers: { "content-type": "audio/mpeg" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(() => {
    window.__said = [];
    const V = [{ name: "Samantha", lang: "en-US", localService: true }, { name: "Daniel", lang: "en-GB", localService: true }, { name: "Karen", lang: "en-AU", localService: true }];
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => V, speak: u => { __said.push({ t: u.text, v: u.voice?.name }); setTimeout(() => u.onend && u.onend(), 10); }, cancel: () => {} }, configurable: true });
    window.Audio = function () { const a = this; this.play = async () => { __said.push({ t: "[audio]" }); setTimeout(() => a.onended && a.onended(), 10); }; this.pause = () => {}; this.addEventListener = () => {}; };
  });
  chk("version 1.88 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 88));

  // ---------- the Voices window
  const win = await pg.evaluate(async () => {
    const w = { ...blankChar("world"), id: "ww1", name: "Realm", description: "A realm.", cast: [{ name: "Guard", type: "character", details: "a gruff man" }, { name: "Castle", type: "location", details: "big" }, { name: "Queen", type: "character", details: "she rules" }] };
    S.chars.push(w); await saveChars(); S.settings.voiceOn = true; await saveSettings();
    editChar(w, false); await new Promise(r => setTimeout(r, 150)); const inEditor = !!document.querySelector("#sheetBody #cvPhone, #sheetBody #cVoice"); closeSheet();
    await openProfile("ww1"); await new Promise(r => setTimeout(r, 150)); const btn = !!$("pfVoices"); $("pfVoices").click(); await new Promise(r => setTimeout(r, 120));
    const tabs = [...document.querySelectorAll(".vo-tabs")].map(t => [...t.querySelectorAll(".tab")].map(x => x.textContent.trim()));
    document.querySelector('[data-vt="1"]').click(); await new Promise(r => setTimeout(r, 30));
    const ed = $("voEd"); ed.querySelector("#cvPhone").value = "Daniel"; ed.querySelector("#cvPhone").dispatchEvent(new Event("change"));
    document.querySelector('[data-vt="2"]').click(); await new Promise(r => setTimeout(r, 30)); $("voEd").querySelector("#cvPhone").value = "Samantha"; $("voEd").querySelector("#cvPhone").dispatchEvent(new Event("change"));
    $("voAdd").click(); await new Promise(r => setTimeout(r, 20)); $("voAddN").value = "Old Tom"; $("voAddGo").click(); await new Promise(r => setTimeout(r, 30));
    const after = [...document.querySelectorAll(".vo-tabs")][1].textContent, h = document.querySelector("#sheetBody .group h3")?.textContent;
    await new Promise(r => setTimeout(r, 500));
    const stored = await Store.get("chars"), sw = stored.find(x => x.id === "ww1");
    const back = $("sheetBack") || null; userClose(); await new Promise(r => setTimeout(r, 80));
    return { inEditor, btn, tabs, after, h, guard: sw.cast[0].voice, queen: sw.cast[2].voice, side: sw.sideVoices?.map(x => x.name), backTo: document.querySelector("#sheet:not([hidden]) #pfVoices") ? "profile" : "closed" };
  });
  chk("the bot editor no longer has the voice settings; the profile has 🎙 Voices", !win.inEditor && win.btn);
  chk(`tabs: the narrator and every character listing, then side characters (${JSON.stringify(win.tabs)})`, win.tabs[0].join() === "Narrator,Guard,Queen" && /＋ Add/.test(win.tabs[1].join()));
  chk(`changes save by themselves (Guard ${win.guard?.phone}, Queen ${win.queen?.phone}); a side character can be added by hand (${win.side})`, win.guard?.phone === "Daniel" && win.queen?.phone === "Samantha" && win.side?.join() === "Old Tom" && /Old Tom/.test(win.after) && win.h === "Old Tom");
  chk(`closing steps back to the profile (${win.backTo})`, win.backTo === "profile");

  // ---------- cloned voices are kept (synced settings) and sorted on their own
  const cl = await pg.evaluate(async () => {
    closeSheet(); S.settings.voiceEngine = "cartesia"; S.settings.cartKey = "k"; await saveSettings(); openVoices(byId("ww1")); await new Promise(r => setTimeout(r, 100));
    document.querySelector('[data-vt="1"]').click(); await new Promise(r => setTimeout(r, 30));
    const f = new File([new Uint8Array([1, 2, 3])], "me.webm", { type: "audio/webm" }), dt = new DataTransfer(); dt.items.add(f); const inp = $("voEd").querySelector("#cvFile"); inp.files = dt.files; inp.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 300));
    const mine = S.settings.myVoices, stored = (await Store.get("settings")).myVoices, synced = !LOCAL_ONLY.includes("myVoices");
    CART_LIST = null; try { localStorage.removeItem("lr_cartvoices"); } catch {}
    $("voEd").querySelector("#cvList").click(); for (let i = 0; i < 40 && !document.querySelector("#voPop .vp-card"); i++) await new Promise(r => setTimeout(r, 25));
    const P = $("voPop"), secs = [...P.querySelectorAll(".vp-sec")].map(x => x.textContent.trim()), tabs = [...P.querySelectorAll("[data-tab]")].map(x => x.textContent.trim());
    P.querySelector('[data-tab="mine"]').click(); const only = [...P.querySelectorAll(".vp-card b")].map(x => x.textContent); P._close();
    const label = $("voEd").querySelector("#cvList").textContent;
    return { mine, stored: stored?.length, synced, secs, tabs, only, label };
  });
  chk(`a cloned voice is remembered in your synced settings (${cl.mine?.[0]?.name})`, cl.mine?.[0]?.id === "vc-new" && cl.stored === 1 && cl.synced && /Guard/.test(cl.mine[0].for));
  chk(`the picker shows clones first in their own section and tab (${cl.secs.join(" · ")} | ${cl.tabs.join(", ")})`, /Your cloned voices/.test(cl.secs.filter(x => !/^In use/.test(x))[0] || "") && cl.tabs.some(t => /Cloned\s*1/.test(t)) && cl.only.join() === "Guard (cloned)");
  chk(`the bot shows the clone by name (${cl.label.trim()})`, /Guard \(cloned\)/.test(cl.label));

  // ---------- who says each line, and finding new characters
  answer = { lines: [{ i: 1, emotion: "calm", speaker: "Guard", gender: "m" }, { i: 2, emotion: "tired", speaker: "the Queen", gender: "f" }, { i: 3, emotion: "excited", speaker: "Merchant", gender: "m" }], present: ["Guard", "Queen"] };
  const r1 = await pg.evaluate(async () => {
    closeSheet(); S.settings.voiceEngine = "phone"; S.chars.find(x => x.id === "ww1").cast[0].voice = { phone: "Daniel" }; await saveSettings(); await openChat("ww1"); await new Promise(r => setTimeout(r, 200));
    $("btnMore").click(); for (let i = 0; i < 40 && !$("oVoices"); i++) await new Promise(r => setTimeout(r, 25)); const opt = !!$("oVoices"); $("oVoices").click(); await new Promise(r => setTimeout(r, 100));
    $("voFind").click(); await new Promise(r => setTimeout(r, 50)); const on = S.chat.voiceDetect; closeSheet();
    __said = []; $("input").value = "hello"; $("send").click(); for (let i = 0; i < 160 && (S.busy || __said.length < 3); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 150));
    const m = S.chat.messages.filter(x => x.role === "assistant").at(-1), toast = [...document.querySelectorAll(".vo-new")].map(x => x.textContent).join();
    return { opt, on, said: __said.map(x => x.t + "@" + x.v), side: byId("ww1").sideVoices.map(x => x.name + ":" + x.g), vspk: getSpk(m)?.map(x => x?.n), present: m.vpresent, toast };
  });
  chk("⋯ Options has Character voices with the find-new-characters switch", r1.opt && r1.on === true);
  chk(`each line goes to who the AI says speaks it (${r1.said.join(" | ")})`, r1.said[0] === "Welcome.@Daniel" && r1.said[1] === "Leave us.@Samantha" && /^Fresh bread!@/.test(r1.said[2]));
  chk(`the new merchant is added as a side character, with a notice (${r1.side.join(", ")} · ${r1.toast})`, r1.side.includes("Merchant:m") && /Merchant/.test(r1.toast));
  chk(`who spoke and who's still in the scene are kept on the reply (${r1.vspk} · ${r1.present})`, r1.vspk?.join() === "Guard,the Queen,Merchant" && r1.present?.join() === "Guard,Queen");
  const d1 = dir[0];
  chk("the director is told the known characters (not places) and asked who speaks", d1 && /Known characters:\n- Guard/.test(d1.usr) && /- Queen/.test(d1.usr) && !/- Castle/.test(d1.usr) && /someone who left doesn't speak/.test(d1.sys) && /"speaker"/.test(d1.sys));
  const tn = await pg.evaluate(async () => { const el = document.querySelector(".vo-new"); if (!el) return null; el.click(); await new Promise(r => setTimeout(r, 120)); const h = document.querySelector("#sheetBody .group h3")?.textContent;
    $("voEd").querySelector("#cvPhone").value = "Karen"; $("voEd").querySelector("#cvPhone").dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 450)); closeSheet(); return h; });
  chk(`tapping the notice opens their voice (${tn})`, tn === "Merchant");
  const tap = await pg.evaluate(async () => { __said = []; const q = [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /Fresh bread/.test(x.textContent)); q.click(); await new Promise(r => setTimeout(r, 100)); return __said[0]?.v; });
  chk(`tapping the merchant's line uses his new voice, no new AI call (${tap})`, tap === "Karen" && dir.length === 1);

  // the Guard leaves; the next reply's director knows who was there and the story before
  reply = `*The Guard has left the hall.* "So, at last we're alone," *she murmurs.*\n[[mood: calm | place: Hall | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  answer = { lines: [{ i: 1, emotion: "flirtatious", speaker: "Queen", gender: "f" }], present: ["Queen"] };
  const r2 = await pg.evaluate(async () => { __said = []; $("input").value = "hm"; $("send").click(); for (let i = 0; i < 160 && (S.busy || __said.length < 1); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 120)); return __said.map(x => x.t + "@" + x.v); });
  const d2 = dir[1];
  chk(`the next reading knows who was in the scene and the story before (${(d2?.usr.match(/In the scene before this reply: [^\n]*/) || [])[0]})`, d2 && /In the scene before this reply: Guard, Queen/.test(d2.usr) && /The story just before this reply:[\s\S]*Fresh bread/.test(d2.usr));
  chk(`after the Guard leaves, the line goes to the Queen (${r2.join()})`, r2[0] === "So, at last we're alone,@Samantha");

  // without finding new characters, a newcomer still gets their own automatic voice but isn't added
  reply = `*A stranger in a cloak steps in.* "Pardon me."\n[[mood: calm | place: Hall | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  answer = { lines: [{ i: 1, emotion: "neutral", speaker: "Cloaked stranger", gender: "f" }], present: ["Queen", "Cloaked stranger"] };
  const r3 = await pg.evaluate(async () => { S.chat.voiceDetect = false; __said = []; $("input").value = "who"; $("send").click(); for (let i = 0; i < 160 && (S.busy || __said.length < 1); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 120));
    const m = S.chat.messages.filter(x => x.role === "assistant").at(-1); const p = (await toneParts(m, voiceParts(m, "dialogue")))[0]; return { side: byId("ww1").sideVoices.map(x => x.name), who: p.who?.name, auto: voiceFor(p.who, p.who.id).phone?.name, said: __said[0]?.v }; });
  chk(`with finding off, a newcomer isn't added but speaks as themself (${r3.who}, ${r3.said}); side characters: ${r3.side}`, !r3.side.includes("Cloaked stranger") && r3.who === "Cloaked stranger" && r3.said === r3.auto);
  // no AI at all: nothing is asked
  const n0 = dir.length;
  await pg.evaluate(async () => { S.settings.voiceTone = false; S.chat.voiceDetect = false; const m = { ...S.chat.messages.filter(x => x.role === "assistant").at(-1), id: "z", vspkBy: undefined }; await toneParts(m, voiceParts(m, "dialogue")); });
  chk("with tone and finding both off, no AI call is made", dir.length === n0);
  const wide = await pg.evaluate(async () => { openVoices(byId("ww1")); await new Promise(r => setTimeout(r, 100)); return document.documentElement.scrollWidth <= innerWidth + 1; });
  chk("no sideways scroll", wide);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
