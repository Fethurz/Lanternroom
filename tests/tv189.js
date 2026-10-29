// v1.89: press and hold (or right-click) a line of speech to see who says it, set it yourself, and pick their voice;
// speakers are worked out even when replies aren't read aloud
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const reply = `*The Guard nods.* "Welcome." *The Queen sighs.* "Leave us." *A merchant shouts from the street.* "Fresh bread!"\n[[mood: calm | place: Hall | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  const sysOf = b => String(b.messages?.[0]?.content || "");
  let dir = 0, answer = { lines: [{ i: 1, emotion: "calm", speaker: "Guard", gender: "m" }, { i: 2, emotion: "tired", speaker: "Queen", gender: "f" }, { i: 3, emotion: "excited", speaker: "Merchant", gender: "m" }], present: ["Guard", "Queen"] };
  const json = body => { if (/You direct voice actors/.test(sysOf(body))) { dir++; return answer; } return { summary: "x", facts: [] }; };
  const { b, pg, errs } = await open({ width: W, json, stream: () => reply });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(() => {
    window.__said = [];
    const V = [{ name: "Samantha", lang: "en-US", localService: true }, { name: "Daniel", lang: "en-GB", localService: true }, { name: "Karen", lang: "en-AU", localService: true }];
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => V, speak: u => { __said.push({ t: u.text, v: u.voice?.name }); setTimeout(() => u.onend && u.onend(), 10); }, cancel: () => {} }, configurable: true });
    window.copyText = async t => { window.__copied = t; return true; };
  });
  chk("version 1.89 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1089));
  const press = async (sel, find, type = "touch") => pg.evaluate(async ([sel, find, type]) => {
    const q = [...document.querySelectorAll(sel)].find(x => find ? new RegExp(find).test(x.textContent) : true); if (!q) return "none";
    const r = q.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + 3, clientY: r.top + 3, pointerType: type, button: 0 };
    q.dispatchEvent(new PointerEvent("pointerdown", o)); await new Promise(r => setTimeout(r, 650)); q.dispatchEvent(new PointerEvent("pointerup", o)); await new Promise(r => setTimeout(r, 150));
    return $("sheet").hidden ? "closed" : document.querySelector("#sheet .sheet-title, #sheetTitle")?.textContent || "open";
  }, [sel, find, type]);

  // a reply that isn't read aloud still gets its speakers
  const r1 = await pg.evaluate(async () => {
    const w = { ...blankChar("world"), id: "ww1", name: "Realm", description: "A realm.", cast: [{ name: "Guard", type: "character", details: "a gruff man", voice: { phone: "Daniel" } }, { name: "Queen", type: "character", details: "she rules", voice: { phone: "Samantha" } }] };
    S.chars.push(w); await saveChars(); Object.assign(S.settings, { voiceOn: true, voiceAuto: false, voiceDetect: true }); await saveSettings();
    await openChat("ww1"); await new Promise(r => setTimeout(r, 200));
    __said = []; $("input").value = "hello"; $("send").click(); for (let i = 0; i < 300 && (S.busy || !S.chat.messages.some(x => x.role === "assistant")); i++) await new Promise(r => setTimeout(r, 50)); for (let i = 0; i < 60 && !getSpk(S.chat.messages.filter(x => x.role === "assistant").at(-1)); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 200));
    const m = S.chat.messages.filter(x => x.role === "assistant").at(-1);
    return { said: __said.length, spk: getSpk(m)?.map(x => x?.n), side: (byId("ww1").sideVoices || []).map(x => x.name) };
  });
  chk(`with auto-read off, the reply still gets who says each line (${r1.spk}), nothing is read, new people found (${r1.side})`, r1.said === 0 && r1.spk?.join() === "Guard,Queen,Merchant" && r1.side.includes("Merchant") && dir === 1);
  const tap = await pg.evaluate(async () => { __said = []; [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /Leave us/.test(x.textContent)).click(); await new Promise(r => setTimeout(r, 150)); return __said[0]; });
  chk(`tapping a line reads it in the right voice, no new AI call (${tap?.t} @ ${tap?.v})`, tap?.t === "Leave us." && tap?.v === "Samantha" && dir === 1);

  // press and hold a line
  const t1 = await press("#msgs .msg.assistant .q", "Fresh bread");
  const m1 = await pg.evaluate(() => ({ now: document.querySelector(".lo-now")?.textContent, rows: [...document.querySelectorAll(".lo-row")].map(x => x.querySelector("b")?.textContent || x.textContent.trim()), on: document.querySelector(".lo-row.on b")?.textContent, voiceBtn: $("loVoice")?.textContent, copied: window.__copied }));
  chk(`press and hold a line opens Who says this? (${t1}): ${m1.now}`, /Who says this/.test(t1) && /Merchant/.test(m1.now) && /AI worked this out/.test(m1.now) && !m1.copied);
  chk(`it lists everyone it could be (${m1.rows.join(", ")}), the current one ticked, and their voice button`, ["Guard", "Queen", "Merchant", "＋ Someone new…"].every(x => m1.rows.includes(x)) && m1.on === "Merchant" && /Merchant's voice/.test(m1.voiceBtn));
  const set = await pg.evaluate(async () => {
    [...document.querySelectorAll(".lo-row")].find(x => x.querySelector("b")?.textContent === "Queen").click(); await new Promise(r => setTimeout(r, 60));
    const now = document.querySelector(".lo-now")?.textContent; __said = []; $("loHear").click(); await new Promise(r => setTimeout(r, 80)); const heard = __said[0]?.v;
    closeSheet(); const m = S.chat.messages.filter(x => x.role === "assistant").at(-1);
    __said = []; [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /Fresh bread/.test(x.textContent)).click(); await new Promise(r => setTimeout(r, 120));
    const stored = (await Store.get("c2:" + S.chat.id)).messages.find(x => x.id === m.id);
    return { now, heard, tap: __said[0]?.v, spk: getSpk(m)[2], stored: stored?.vspkBy?.["0"]?.[2]?.n };
  });
  chk(`picking Queen sets the line (${set.now}); Hear it and tapping the line use her voice (${set.heard}, ${set.tap}); saved with the chat`, /Queen/.test(set.now) && /you set this/.test(set.now) && set.heard === "Samantha" && set.tap === "Samantha" && set.spk?.set && set.stored === "Queen");
  // someone new
  await press("#msgs .msg.assistant .q", "Welcome");
  const nw = await pg.evaluate(async () => {
    $("loNew").click(); await new Promise(r => setTimeout(r, 30)); $("loName").value = "Bartender"; document.querySelector('[data-g="m"]').click(); await new Promise(r => setTimeout(r, 60));
    const now = document.querySelector(".lo-now")?.textContent; closeSheet(); const m = S.chat.messages.filter(x => x.role === "assistant").at(-1);
    return { now, side: byId("ww1").sideVoices.map(x => x.name + ":" + x.g), spk: getSpk(m)[0] };
  });
  chk(`Someone new adds a side character and gives them the line (${nw.side.join(", ")})`, /Bartender/.test(nw.now) && nw.side.includes("Bartender:m") && nw.spk?.n === "Bartender");
  // ask the AI again: lines you set stay yours
  answer = { lines: [{ i: 1, speaker: "Guard", gender: "m" }, { i: 2, speaker: "Guard", gender: "m" }, { i: 3, speaker: "Merchant", gender: "m" }], present: ["Guard"] };
  await press("#msgs .msg.assistant .q", "Leave us");
  const ag = await pg.evaluate(async () => { $("loAsk").click(); for (let i = 0; i < 60 && /Asking/.test($("loAsk")?.textContent || ""); i++) await new Promise(r => setTimeout(r, 50)); const now = document.querySelector(".lo-now")?.textContent; closeSheet(); const m = S.chat.messages.filter(x => x.role === "assistant").at(-1); return { now, spk: getSpk(m).map(x => x?.n + (x?.set ? "*" : "")) }; });
  chk(`Ask the AI again re-reads the scene; lines you set stay yours (${ag.spk.join(", ")})`, dir === 2 && /Guard/.test(ag.now) && ag.spk.join() === "Bartender*,Guard,Queen*");
  // right-click on a computer
  const rc = await pg.evaluate(async () => { await new Promise(r => setTimeout(r, 1000)); const q = [...document.querySelectorAll("#msgs .msg.assistant .q")].find(x => /Welcome/.test(x.textContent)); q.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 })); await new Promise(r => setTimeout(r, 150)); const t = $("sheet").hidden ? "" : document.querySelector(".lo-now")?.textContent; closeSheet(); return t; });
  chk(`right-click a line opens the same window (${rc})`, /Bartender/.test(rc || ""));
  // narration still copies; the menu can copy too
  const cp = await pg.evaluate(async () => { window.__copied = null; const em = [...document.querySelectorAll("#msgs .msg.assistant em, #msgs .msg.assistant .act")].find(x => /nods/.test(x.textContent)); const d = em.closest("[data-i]"), r = em.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + 2, clientY: r.top + 2, pointerType: "touch", button: 0 };
    em.dispatchEvent(new PointerEvent("pointerdown", o)); await new Promise(r => setTimeout(r, 650)); em.dispatchEvent(new PointerEvent("pointerup", o)); await new Promise(r => setTimeout(r, 100)); return { copied: !!window.__copied, sheet: !$("sheet").hidden }; });
  chk("pressing and holding narration still copies the message", cp.copied && !cp.sheet);
  // your own line
  const mine = await pg.evaluate(async () => { S.chat.messages.push({ id: "u9", role: "user", content: `*I wave.* "Hi there."` }); renderMsgs(); await new Promise(r => setTimeout(r, 80)); return true; });
  const tm = await press("#msgs .msg.user .q", "Hi there");
  const my = await pg.evaluate(() => { const r = { now: document.querySelector(".lo-now")?.textContent, btn: !!$("loMyV"), rows: document.querySelectorAll(".lo-row").length }; closeSheet(); return r; });
  chk(`your own line says it's yours, with My voice (${my.now})`, /Who says this/.test(tm) && /Your line/.test(my.now) && my.btn && my.rows === 0);
  // another version of the reply has its own speakers
  const alt = await pg.evaluate(() => { const m = S.chat.messages.filter(x => x.role === "assistant").at(-1); const a = m.alt; m.alt = 1; const x = getSpk(m); m.alt = a; return x; });
  chk("each version of a reply keeps its own speakers", alt === null);
  const wide = await pg.evaluate(async () => { const q = [...document.querySelectorAll("#msgs .msg.assistant .q")][0]; openLineOwner(q); await new Promise(r => setTimeout(r, 200)); const w = document.documentElement.scrollWidth <= innerWidth + 1; closeSheet(); return w; });
  chk("no sideways scroll", wide);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
