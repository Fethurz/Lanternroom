// v1.99: risky choices parse and show properly, sideways rows drag with the mouse, Choice of Magics and Mecha Ace,
// picking who you play, and bots turned into full stories of their own (c.storyDef) on the Stories shelf.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.at(-1)?.content || "");
  const seen = { def: [], scene: [] };
  const tag = "\n[[mood: calm | place: Tower | ambience: indoors | activity: none | hearing: outside]]";
  const story = j => `\n[[story: ${JSON.stringify(j)}]]`;
  let normal = "*She grins.* \"Your move.\"\n[[choices: *I bow.* ;; *I lunge at her.* [risky] ;; \"Make me.\" [risky]]]";
  const stream = body => { const s = sysOf(body);
    if (/interactive novel in the style of Choice of Games/.test(s)) { seen.scene.push(body); return `**Chapter 1**\n\nThe tower hums with power.${story({ choices: [{ t: "Study.", leans: [{ side: "Caution", amt: 1 }] }, { t: "Experiment.", leans: [{ side: "Daring", amt: 1 }] }] })}${tag}`; }
    return normal + tag; };
  const json = body => { const s = sysOf(body);
    if (/You turn a roleplay bot into a full interactive novel/.test(s)) { seen.def.push(body); return { title: "Vez'nan's Castle: The Tower", icon: "🏰", blurb: "Serve the dark wizard.", setting: "The dark tower of Vez'nan looms over the land.", you: "a new minion", roles: ["a new minion of the tower", "a captured hero", "a rival sorcerer"], pairs: [{ a: "Loyal", b: "Scheming", ca: "#ff0000", cb: "#0000ff" }, { a: "Cruel", b: "Kind" }, { a: "Bold", b: "Sly" }], meters: [{ n: "Favour", v: 10, max: 100, desc: "Vez'nan's favour" }, { n: "Gold", v: 5, max: 0, desc: "coins" }], chapters: [1, 2, 3, 4, 5, 6, 7].map(i => ({ t: "Part " + i, goal: "Something happens at the tower " + i, scenes: 3 })) }; }
    return { summary: "x", facts: [] }; };
  const { b, pg, errs } = await open({ width: W, json, stream });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 1.99 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 99));

  // ---------- risky choices
  const tk = await pg.evaluate(() => [takeChoices("x\n[[choices: a ;; b [risky] ;; c [risky]]]").list, takeChoices("[[choices: a (risky) ;; b ;; c - risky]]").list, takeChoices("y [[choices: a ;; b [risky]]] z").text]);
  chk(`last choice "[risky]]]" keeps its tag (${JSON.stringify(tk[0])})`, tk[0].length === 3 && tk[0][2].t === "c" && tk[0][2].risky && tk[0][1].risky && !tk[0][0].risky);
  chk(`other ways of writing risky (${JSON.stringify(tk[1])})`, tk[1][0].risky && tk[1][0].t === "a" && tk[1][2].risky && tk[1][2].t === "c");
  chk(`the line is taken out of the reply (${tk[2]})`, tk[2] === "y  z" || tk[2] === "y z");
  await pg.evaluate(async () => { S.chars[0].choices = true; await openChat(S.chars[0].id); });
  await pg.waitForTimeout(500);
  await pg.fill("#input", "hi"); await pg.evaluate(() => send()); await pg.waitForFunction(() => S.chat.messages.length >= 3 && !S.busy, null, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(400);
  const bar = await pg.evaluate(() => [...document.querySelectorAll("#choiceBar .choice")].map(x => ({ t: x.textContent, risky: x.classList.contains("risky"), lbl: !!x.querySelector(".ch-risk"), fits: x.scrollWidth <= x.clientWidth + 1 })));
  chk(`risky choices show a Risky label, no stray "[risky" (${bar.map(x => x.t).join(" | ")})`, bar.length === 3 && bar.filter(x => x.risky && x.lbl).length === 2 && !bar.some(x => /\[risky/i.test(x.t)) && bar.every(x => x.fits));
  const old = await pg.evaluate(() => { const l = S.chat.messages.at(-1); l.choices = [{ t: "*I run.* [risky", risky: false }]; renderChoices(); const x = document.querySelector("#choiceBar .choice"); return { t: x.textContent, risky: x.classList.contains("risky") }; });
  chk(`an older reply saved with "[risky" is shown right (${old.t})`, old.risky && !/\[risky/.test(old.t));

  // ---------- drag sideways rows with the mouse
  const drag = await pg.evaluate(() => { const row = document.createElement("div"); row.id = "tRow"; row.style.cssText = "position:fixed;top:40px;left:10px;width:200px;display:flex;overflow-x:auto;z-index:99999;background:#222"; row.innerHTML = Array.from({ length: 12 }, (_, i) => `<button type="button" class="chip" style="flex:none;width:80px" data-t="${i}">${i}</button>`).join(""); document.body.append(row); window.__clicks = 0; row.querySelectorAll("button").forEach(x => x.onclick = () => window.__clicks++); const r = row.getBoundingClientRect(); return { x: r.left + 150, y: r.top + 10 }; });
  await pg.mouse.move(drag.x, drag.y); await pg.mouse.down(); for (let i = 1; i <= 10; i++) await pg.mouse.move(drag.x - i * 12, drag.y); await pg.mouse.up(); await pg.waitForTimeout(100);
  const d1 = await pg.evaluate(() => ({ left: $("tRow").scrollLeft, clicks: __clicks }));
  chk(`click-dragging a sideways row scrolls it (${Math.round(d1.left)} px) and the drag isn't a click (${d1.clicks})`, d1.left > 60 && d1.clicks === 0);
  await pg.mouse.click(drag.x - 100, drag.y); await pg.waitForTimeout(100);
  chk("a plain click still clicks", await pg.evaluate(() => __clicks === 1));
  await pg.evaluate(() => { $("tRow").scrollLeft = 0; }); await pg.mouse.move(drag.x, drag.y); await pg.mouse.wheel(0, 120); await pg.waitForTimeout(150);
  chk("the mouse wheel moves it sideways", await pg.evaluate(() => $("tRow").scrollLeft > 40));
  await pg.evaluate(() => $("tRow").remove());

  // ---------- new packs + who you play
  await pg.evaluate(async () => { closeSheet(); await openStories(); });
  await pg.waitForTimeout(300);
  const shelf = await pg.evaluate(() => ({ packs: [...document.querySelectorAll(".st-pack b")].map(x => x.textContent), full: !!$("stMakeFull") }));
  chk(`Choice of Magics and Mecha Ace are on the shelf (${shelf.packs.join(", ")})`, shelf.packs.includes("Choice of Magics") && shelf.packs.includes("Mecha Ace") && shelf.full);
  const roles = await pg.evaluate(async () => { document.querySelector('[data-pk="mecha"]').click(); await new Promise(r => setTimeout(r, 200)); return { n: document.querySelectorAll("[data-role]").length, ph: $("stName").placeholder }; });
  chk(`Mecha Ace offers roles to play plus your own (${roles.n}) and asks for a callsign`, roles.n === 5 && /callsign/i.test(roles.ph));
  const begun = await pg.evaluate(async () => {
    document.querySelector('[data-role="own"]').click(); await new Promise(r => setTimeout(r, 100));
    $("stRole").value = "a smuggler pressed into service"; $("stGo").click();
    for (let i = 0; i < 200 && (!S.chat?.story || S.busy || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50));
    return { you: S.chat.story.you, title: S.chat.story.title, opts: Object.keys(S.chat.story.opts) };
  });
  chk(`your own role is who you play (${begun.you})`, begun.you === "a smuggler pressed into service" && begun.title === "Mecha Ace" && !begun.opts.includes("role"));
  chk("the scene prompt says it", /a smuggler pressed into service/.test(sysOf(seen.scene.at(-1))));
  await pg.evaluate(() => leaveChat?.());
  await pg.waitForTimeout(300);

  // ---------- a bot turned into a full story
  const made = await pg.evaluate(async () => {
    const c = { ...blankChar("world"), id: uid(), name: "Vez'nan's Castle", description: "The dark wizard Vez'nan rules from his tower.", scenario: "You arrive at the tower gates.", lore: [{ keys: ["Vez'nan"], text: "Vez'nan wears a purple hood." }], tags: ["fantasy"] };
    S.chars.push(c); await saveChars();
    openProfile(c.id); await new Promise(r => setTimeout(r, 300));
    const btn = $("pfStoryDef")?.textContent || ""; $("pfStoryDef").click();
    for (let i = 0; i < 100 && !$("sdSave"); i++) await new Promise(r => setTimeout(r, 50));
    $("sdT").value = "Vez'nan's Castle: Rise"; $("sdSave").click(); await new Promise(r => setTimeout(r, 400));
    return { btn, def: c.storyDef, id: c.id, shelf: [...document.querySelectorAll(".st-pack b")].map(x => x.textContent) };
  });
  const src = usrOf(seen.def.at(-1) || {});
  chk(`profile → Make it a full story (${made.btn.trim()})`, /Make it a full story/.test(made.btn));
  chk("the AI reads the whole bot, lore included, and is told to stay faithful", /purple hood/.test(src) && /You arrive at the tower gates/.test(src) && /faithful/.test(sysOf(seen.def.at(-1) || {})) && /canon/.test(sysOf(seen.def.at(-1) || {})));
  chk(`edited and saved on the bot (${made.def?.title}, ${made.def?.chapters?.length} chapters, ${made.def?.roles?.length} roles)`, made.def?.title === "Vez'nan's Castle: Rise" && made.def.chapters.length === 7 && made.def.roles.length === 3);
  chk("it's on the Stories shelf as its own story", made.shelf.includes("Vez'nan's Castle: Rise"));
  const run = await pg.evaluate(async id => {
    document.querySelector(`[data-pk="bot:${id}"]`).click(); await new Promise(r => setTimeout(r, 200));
    const n = document.querySelectorAll("[data-role]").length; document.querySelector('[data-role="1"]').click(); await new Promise(r => setTimeout(r, 100));
    $("stGo").click(); for (let i = 0; i < 200 && (!S.chat?.story || S.busy || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50));
    return { n, bot: S.charId === id, you: S.chat.story.you, setting: S.chat.story.setting, pack: S.chat.story.pack };
  }, made.id);
  chk(`a run is the bot's own chat, playing a picked role (${run.you})`, run.bot && run.n === 4 && run.you === "a captured hero" && /dark tower/.test(run.setting) && run.pack === "bot:" + made.id);
  const sx = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  chk("no sideways scroll", sx);
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
