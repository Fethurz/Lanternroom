// v2.4: story danger (Story mode / Real risk / Brutal), deaths with Rewind / Restart the chapter / End the run (obituary,
// 🪦 in Your runs), health-type meters at 0 kill, and who may eat you (by sex + each story's own option).
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || "");
  const Q = [], seen = [];
  const tag = "\n[[mood: calm | place: Lair | ambience: cave | activity: none | hearing: outside]]";
  const scene = (text, x = {}) => `${text}\n[[story: ${JSON.stringify({ choices: x.choices || [{ t: "Press on.", leans: [] }, { t: "Hold back.", leans: [] }], ...(x.dead ? { dead: true, cause: x.cause } : {}) })}]]${tag}`;
  const stream = body => { seen.push(sysOf(body)); const x = Q.shift(); return x || scene("The scene goes on."); };
  const json = body => /You write the obituary/.test(sysOf(body)) ? { epitaph: "She flew too close to the knights.", text: "Ember was a proud young dragon who hoarded more than she could guard. She died as she lived: boldly." }
    : /You write the choices/.test(sysOf(body)) ? { choices: [{ t: "Get up.", leans: [] }, { t: "Lie still.", leans: [] }] } : { summary: "x", facts: [] };
  const { b, pg, errs } = await open({ width: W, stream, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = () => pg.waitForFunction(() => !S.busy, null, { timeout: 15000 }).catch(() => {});
  const lastA = () => pg.evaluate(() => { const m = S.chat.messages.filter(m => m.role === "assistant").at(-1); return { dead: m.dead || null, choices: (m.choices || []).length, n: S.chat.messages.length }; });
  const pick = async (i, next) => { if (next) Q.push(next); const n = await pg.evaluate(() => S.chat.messages.length); await pg.evaluate(i => pickChoice(S.chat.messages.filter(m => m.role === "assistant").at(-1).choices[i]), i); await pg.waitForFunction(k => S.chat.messages.length >= k + 2 && !S.busy, n, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(150); };
  const bar = () => pg.evaluate(() => [...document.querySelectorAll("#choiceBar .choice, #choiceBar .st-dead, #choiceBar .st-obit")].map(x => x.textContent.trim()));
  const begin = (id, o, h = {}) => pg.evaluate(async ([id, o, h]) => { const pk = packOf(id); await storyBegin(pk, null, { mode: "classic", content: "clean", vore: false, length: "standard", era: pk.eras ? Object.keys(pk.eras)[0] : "", danger: "real", voreWho: "all", voreKind: "", ...o }, { name: "Ember", pron: "she/her", color: "", ...h }); for (let i = 0; i < 200 && (S.busy || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50)); }, [id, o, h]);
  chk("version 2.4 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 2004));

  // ---------- setup: danger row (Real risk by default), who may eat you once vore is ticked, each story's own option
  const su = await pg.evaluate(async () => {
    storySetup(packOf("monhun"), null); await new Promise(r => setTimeout(r, 150));
    const dz = [...document.querySelectorAll('[data-k="danger"]')].map(x => x.textContent + (x.classList.contains("on") ? "*" : ""));
    const before = !!document.querySelector("[data-vw]");
    $("stVore").checked = true; $("stVore").dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 100));
    const who = [...document.querySelectorAll('[data-vw="voreWho"]')].map(x => x.textContent), kinds = [...document.querySelectorAll('[data-vw="voreKind"]')].map(x => x.textContent);
    document.querySelector('[data-k="danger"][data-v="brutal"]').click(); await new Promise(r => setTimeout(r, 50));
    const hint = document.body.textContent.includes("one bad call can be fatal"), vk = !!document.querySelector('[data-vw="voreKind"]');
    closeSheet(); return { dz, before, who, kinds, hint, vk };
  });
  chk(`danger choices (${su.dz.join(", ")})`, su.dz.join() === "Story mode,Real risk*,Brutal");
  chk("who may eat you shows only with vore ticked", !su.before && su.who.join() === "Anyone,Males only,Females & futas only");
  chk(`Monster Hunter's own option (${su.kinds.join(", ")})`, su.kinds.join() === "Monsters only,Hunters too");
  chk("picking Brutal explains it and keeps the vore rows", su.hint && su.vk);

  // ---------- a Real-risk run with vore by females only, monsters only: the prompt carries all of it
  Q.push(scene("**Chapter 1: The Hunt**\n\nThe frontier is quiet."));
  await begin("monhun", { vore: true, voreWho: "female", voreKind: "monsters" });
  let sys = seen.at(-1);
  chk("prompt: Real risk with telegraphed danger and the dead line", /# Danger: Real risk/.test(sys) && /Telegraph it/.test(sys) && /"dead": true/.test(sys));
  chk("prompt: only females and futas, only monsters", /Only female and futa characters may ever eat the reader/.test(sys) && /Only monsters may eat the reader/.test(sys));
  chk("prompt: swallowed isn't dead until digested", /dead only once fully digested/.test(sys));
  chk("prompt: no meter kills by itself in this story", /No meter kills by itself|reaching 0 kills by itself/.test(sys));

  // ---------- a death, then Rewind
  await pick(0, scene("You step into the open and the beast is on you. Everything goes dark.", { dead: true, cause: "Torn apart by a Rathalos" }));
  let la = await lastA(); chk(`the scene ends the run: ${JSON.stringify(la.dead)}`, la.dead?.cause === "Torn apart by a Rathalos" && la.choices === 0);
  let bt = await bar(); chk(`death buttons (${bt.join(" | ")})`, bt.some(x => /Torn apart/.test(x)) && bt.some(x => /Rewind that choice/.test(x)) && bt.some(x => /Restart the chapter/.test(x)) && bt.some(x => /End the run/.test(x)));
  chk("the story bar says you died", /You died/.test(await pg.evaluate(() => $("ownBar").textContent)));
  await pg.evaluate(() => storyRewind()); await wait();
  la = await lastA(); bt = await bar();
  chk(`Rewind drops the death and the choice (${la.n} messages, choices back)`, la.n === 1 && !la.dead && la.choices === 2 && bt.some(x => /Press on/.test(x)));

  // ---------- a new version of the death scene that isn't a death clears it
  await pick(0, scene("You fall.", { dead: true, cause: "Fell" }));
  Q.push(scene("You catch a ledge and live."));
  await pg.evaluate(async () => { await reroll(S.chat.messages.length - 1); }); await wait();
  la = await lastA(); chk("a new version that survives clears the death", !la.dead && la.choices === 2);

  // ---------- Restart the chapter: play into chapter 2, die there, go back to chapter 2's first scene
  await pg.evaluate(() => leaveChat());
  Q.push(scene("**Chapter 1**\n\nA knight approaches."));
  await begin("dragon", {});
  const ch1 = await pg.evaluate(() => S.chat.story.chapters[0].scenes);
  for (let i = 1; i < ch1; i++) await pick(0);
  await pick(0, scene("**Chapter 2**\n\nYour hoard glitters."));
  await pick(1, scene("The thieves' poison works fast.", { dead: true, cause: "Poisoned" }));
  const before = await pg.evaluate(() => S.chat.messages.length);
  await pg.evaluate(() => storyRestartChapter()); await wait();
  const rs = await pg.evaluate(() => { const st = storyState(S.chat), m = S.chat.messages.at(-1); return { n: S.chat.messages.length, ch: st.ch, step: st.step, last: m.content.slice(0, 20), choices: (m.choices || []).length }; });
  chk(`Restart the chapter cuts back to chapter 2's first scene (${before} -> ${rs.n} messages)`, rs.n === ch1 * 2 + 1 && rs.ch === 1 && rs.step === 1 && /Chapter 2/.test(rs.last) && rs.choices === 2);
  // dying in a chapter's first scene: that scene is written again
  await pg.evaluate(() => leaveChat());
  Q.push(scene("A trap springs.", { dead: true, cause: "Crushed" })); await begin("dragon", {});
  Q.push(scene("**Chapter 1**\n\nYou wake in your lair."));
  await pg.evaluate(() => storyRestartChapter()); await wait();
  la = await lastA(); chk("dying in the first scene writes it again", la.n === 1 && !la.dead && la.choices === 2);

  // ---------- health at 0 kills (Risk of Rain 2 has Health); in Story mode it only knocks you down
  await pg.evaluate(() => leaveChat());
  const hurt = { choices: [{ t: "Charge the boss.", leans: [], meters: { Health: -1000 } }, { t: "Hide.", leans: [] }] };
  Q.push(scene("The teleporter hums.", hurt)); await begin("ror2", {});
  await pick(0, scene("You charge in and keep fighting."));
  sys = seen.at(-1); la = await lastA();
  chk("Health at 0: the prompt says this scene is the death", /Health has run out: this scene is their death/.test(sys));
  chk(`Health at 0 kills even when the scene forgot to (${la.dead?.cause})`, la.dead?.cause === "Health ran out" && la.choices === 0);
  await pg.evaluate(() => leaveChat());
  Q.push(scene("The teleporter hums.", hurt)); await begin("ror2", { danger: "story" });
  await pick(0, scene("You fall, and wake up later.", { dead: true, cause: "ignored" }));
  sys = seen.at(-1); la = await lastA();
  chk("Story mode: never write the death, Health at 0 only knocks you down", /never write the reader's death/.test(sys) && /never killed, and the story goes on/.test(sys));
  chk("Story mode: a scene marked dead is played on with choices", !la.dead && la.choices === 2);

  // ---------- Brutal + End the run: an obituary card, 🪦 in Your runs and chat lists, the Stats sheet
  await pg.evaluate(() => leaveChat());
  Q.push(scene("**Chapter 1**\n\nA knight approaches.")); await begin("dragon", { danger: "brutal" });
  chk("prompt: Brutal", /# Danger: Brutal/.test(seen.at(-1)) && /one bad call can be fatal/.test(seen.at(-1)));
  await pick(0, scene("The lance finds your heart.", { dead: true, cause: "Slain by Sir Aldric" }));
  await pg.evaluate(() => storyEndRun()); await wait(); await pg.waitForTimeout(200);
  const ob = await pg.evaluate(() => ({ o: S.chat.story.obit, bar: $("choiceBar").textContent, own: $("ownBar").textContent }));
  chk(`End the run writes an obituary (${ob.o?.epitaph})`, ob.o?.epitaph === "She flew too close to the knights." && /Ember was a proud young dragon/.test(ob.o.text) && ob.o.cause === "Slain by Sir Aldric");
  chk("the obituary card shows, with Start a new story", /She flew too close/.test(ob.bar) && /Start a new story/.test(ob.bar) && !/Rewind/.test(ob.bar) && /Run ended/.test(ob.own));
  const runs = await pg.evaluate(async () => { const id = S.chat.id, cid = S.charId; leaveChat(); const e = (await getIndex(cid)).find(x => x.id === id); await openStories(); document.querySelector('[data-stt="runs"]').click(); await new Promise(r => setTimeout(r, 100)); const t = document.querySelector('[data-sp="runs"]').textContent; closeSheet(); return { obit: e.obit, who: chatWho(e), t }; });
  chk("Your runs and chat lists mark it 🪦", runs.obit === 1 && /^🪦/.test(runs.who) && /🪦/.test(runs.t));
  const ss = await pg.evaluate(async () => { const r = []; for (const c of S.chars) for (const e of await getIndex(c.id)) if (e.obit) r.push([c.id, e.id]); await openChat(r[0][0], r[0][1]); await new Promise(x => setTimeout(x, 200)); openStoryStats(); await new Promise(x => setTimeout(x, 100)); const t = $("sheetBody").textContent, dz = !!document.querySelector("[data-dg]"); closeSheet(); return { t, dz }; });
  chk("Stats show the obituary and no danger switch after the run ended", /This run ended in chapter 1/.test(ss.t) && /She flew too close/.test(ss.t) && !ss.dz);

  // ---------- the Stats sheet's danger switch, and Metronome's races
  await pg.evaluate(() => leaveChat());
  Q.push(scene("**Chapter 1**\n\nA knight approaches.")); await begin("dragon", { vore: true });
  const sw = await pg.evaluate(async () => { openStoryStats(); await new Promise(r => setTimeout(r, 100)); document.querySelector('[data-dg="story"]').click(); await new Promise(r => setTimeout(r, 100)); const d = S.chat.story.opts.danger, rows = !!document.querySelector('[data-vw="voreWho"]'); document.querySelector('[data-vw="voreWho"][data-v="male"]').click(); await new Promise(r => setTimeout(r, 100)); const w = S.chat.story.opts.voreWho; closeSheet(); return { d, rows, w }; });
  chk("Stats: danger switch and who may eat you change the run", sw.d === "story" && sw.rows && sw.w === "male");
  const mt = await pg.evaluate(async () => {
    leaveChat(); S.chars.push({ ...blankChar("character"), id: "p28i6soumvrxw4pe", name: "Metronome Galaxy", description: "Space." }); await saveChars(); await applyStoryPresets();
    storySetup(packOf("bot:p28i6soumvrxw4pe"), null); await new Promise(r => setTimeout(r, 150));
    const vored = $("stVore").checked, chips = [...document.querySelectorAll("[data-vr]")].map(x => x.textContent);
    document.querySelector('[data-vr="Vipers"]').click(); await new Promise(r => setTimeout(r, 50)); document.querySelector('[data-vr="Behemi"]').click(); await new Promise(r => setTimeout(r, 50));
    const on = [...document.querySelectorAll("[data-vr].on")].map(x => x.textContent); closeSheet();
    return { vored, chips: chips.length, on, rule: voreWhoRule({ pack: "bot:p28i6soumvrxw4pe", opts: { voreWho: "all", voreKind: on } }), any: voreWhoRule({ pack: "bot:p28i6soumvrxw4pe", opts: { voreWho: "all", voreKind: [] } }) };
  });
  chk(`Metronome: pick the races that may eat you (${mt.on.join(", ")})`, mt.vored && mt.chips === 17 && mt.on.join() === "Vipers,Behemi" && /Only these races may eat the reader: Vipers, Behemi/.test(mt.rule) && mt.any === "");
  chk("Churn Vector's own option", await pg.evaluate(() => /Only contract agents may eat the reader/.test(voreWhoRule({ pack: "churn", opts: { voreWho: "all", voreKind: "agents" } }))));
  const sx = await pg.evaluate(() => { leaveChat(); return document.documentElement.scrollWidth <= innerWidth + 1; });
  chk("no sideways scroll", sx);
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
