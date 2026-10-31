// v1.97: Play a story: Choice of Games style interactive novels (built-in Choice of the Dragon, classic or random route,
// or a story made from any bot), fixed choices that move stat pairs and meters, hidden checks, chapters, stats, the ending
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || "");
  let noJson = false, sysSeen = [], userSeen = [];
  const tag = "\n[[mood: calm | place: Lair | ambience: cave | activity: none | hearing: outside]]";
  const story = j => `\n[[story: ${JSON.stringify(j)}]]`;
  const scene = { choices: [{ t: "Burn him where he stands.", leans: [{ side: "Brutality", amt: 2 }], meters: { Infamy: 5 } }, { t: "Charm him into polishing your hoard.", leans: [{ side: "Finesse", amt: 2 }, { side: "Cunning", amt: 1 }], check: { stat: "Finesse", need: 40 } }, { t: "Eat him.", leans: [{ side: "Bogus", amt: 3 }], meters: { Wealth: 10, Nope: 4 } }] };
  const stream = body => { const s = sysOf(body); sysSeen.push(s); userSeen.push(String(body.messages.at(-1)?.content || ""));
    if (/FINAL scene/.test(s)) return `The war ends. Your legend is written in fire.${story({ choices: [], ending: true })}${tag}`;
    if (noJson) return `**Chapter 1: The Knight**\n\nA knight clanks into your lair.${tag}`;
    return `**Chapter 1: The Knight**\n\nA knight clanks into your lair, sword shaking. "Foul wyrm!" he cries.${story(scene)}${tag}`; };
  const json = body => { const s = sysOf(body);
    if (/You write the choices for a scene/.test(s)) return { choices: [{ t: "Roar.", leans: [{ side: "Brutality", amt: 1 }] }, { t: "Wait.", leans: [{ side: "Vigilance", amt: 1 }] }] };
    if (/You plan the next chapters/.test(s)) return { chapters: [{ t: "Aftermath", goal: "Pick up the pieces of the war.", scenes: 3 }, { t: "New Rivals", goal: "Young dragons test you.", scenes: 3 }, { t: "Old Age", goal: "Your legacy.", scenes: 4 }] };
    if (/You plan a new story/.test(s)) return { chapters: [1, 2, 3, 4, 5, 6, 7].map(i => ({ t: "Fresh " + i, goal: "Something new happens " + i, scenes: 3 })) };
    if (/You design a Choice of Games/.test(s)) return { title: "Wren's Lighthouse", you: "a shipwrecked sailor", setting: "A stormy coast.", pairs: [{ a: "Bold", b: "Wary", ca: "#ff0000", cb: "#0000ff" }, { a: "Kind", b: "Cold" }, { a: "Honest", b: "Sly" }], meters: [{ n: "Supplies", v: 30, max: 100, desc: "food" }, { n: "Trust", v: 10, max: 100, desc: "Wren's trust" }], chapters: [1, 2, 3, 4, 5, 6, 7].map(i => ({ t: "Tide " + i, goal: "The sea does something " + i, scenes: 3 })) };
    return { summary: "x", facts: [] }; };
  const { b, pg, errs } = await open({ width: W, json, stream });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 1.97 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1097));
  // the list of stories
  const list = await pg.evaluate(async () => { $(innerWidth >= 780 ? "railStories" : "btnStories").click(); await new Promise(r => setTimeout(r, 300)); return { title: document.querySelector("#sheet .sheet-title, #sheetTitle")?.textContent, packs: [...document.querySelectorAll(".st-pack b")].map(x => x.textContent), bot: !!$("stFromBot") }; });
  chk(`Home → Stories lists Choice of the Dragon and making one from a bot (${list.title})`, /Play a story/.test(list.title || "") && list.packs.includes("Choice of the Dragon") && list.bot);
  // set up and begin the classic route
  const begin = await pg.evaluate(async () => {
    document.querySelector('[data-pk="dragon"]').click(); await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-k="content"][data-v="lewd"]').click(); $("stVore").checked = true; $("stVore").dispatchEvent(new Event("change"));
    $("stName").value = "Ember"; document.querySelector('[data-pron="she/her"]').click(); $("stColor").value = "red"; $("stColor").dispatchEvent(new Event("change"));
    $("stGo").click(); for (let i = 0; i < 200 && (!S.chat?.story || S.busy || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 300));
    const m = S.chat.messages[0], bot = byId(S.charId);
    return { opts: S.chat.story.opts, hero: S.chat.story.hero, n: S.chat.messages.length, content: m?.content, choices: m?.choices?.map(x => x.t + ":" + JSON.stringify(x.st)), bot: { pack: bot.storyPack, hidden: bot.hidden }, bar: $("ownBar").textContent, choosing: $("chat").classList.contains("choosing"), btns: [...document.querySelectorAll("#stPick .st-opt")].map(x => x.textContent), own: !!$("chOwn") };
  });
  const s0 = sysSeen.at(-1) || "";
  chk(`Begin makes a hidden story bot and writes the first scene (${begin.n} message)`, begin.n === 1 && begin.bot.pack === "dragon" && begin.bot.hidden && begin.opts.content === "lewd" && begin.opts.vore && begin.hero.name === "Ember" && begin.hero.pron === "she/her" && begin.hero.color === "red");
  chk("the prompt sets up the novel: chapter 1 of 7, The Knight, scene 1 of 6, stats, hero, content, adults", /chapter 1 of 7, "The Knight"/.test(s0) && /scene 1 of 6/.test(s0) && /Brutality 50 · Finesse 50/.test(s0) && /Wealth 20/.test(s0) && /Their name is Ember/.test(s0) && /Colour: red/.test(s0) && /Sexual content is welcome/.test(s0) && /Vore/.test(s0) && /fully grown, mature being/.test(s0) && /\*\*Chapter 1: The Knight\*\*/.test(s0));
  chk(`the hidden story line is taken out and the scene keeps its plain prose (${(begin.content || "").slice(0, 50)}…)`, !/\[\[/.test(begin.content) && /^\*\*Chapter 1/.test(begin.content) && /"Foul wyrm!"/.test(begin.content));
  chk(`choices are checked against the real stat names (${begin.choices?.length} kept)`, begin.choices?.length === 3 && /"side":"Brutality","amt":2/.test(begin.choices[0]) && /"infamy":5/.test(begin.choices[0]) && /"check":\{"stat":"Finesse","need":40\}/.test(begin.choices[1]) && /"leans":\[\]/.test(begin.choices[2]) && /"wealth":10/.test(begin.choices[2]) && !/Nope/.test(begin.choices[2]));
  chk(`the screen: fixed choices only, no message box or Write my own; the bar shows the chapter (${begin.bar})`, begin.choosing && begin.btns.length === 3 && !begin.own && /Chapter 1: The Knight/.test(begin.bar) && /1 \/ 6/.test(begin.bar));
  // pick the checked choice: the check is settled by the app, stats move, the next scene hears about it
  const pick = await pg.evaluate(async () => { window.rand01 = () => 0.5; (document.querySelectorAll("#stPick .st-opt")[1].click(), $("stNext").click());
    for (let i = 0; i < 200 && (S.busy || S.chat.messages.length < 3); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 200));
    const u = S.chat.messages[1], st = storyState(S.chat); return { st: u.st, line: document.querySelector("#msgs .st-div")?.textContent, fin: st.pairs[0].v, cun: st.pairs[1].v, bar: $("ownBar").textContent, scenes: st.scenes }; });
  const s1 = sysSeen.at(-1) || "", u1 = userSeen.at(-1) || "";
  chk(`the check is settled by the app (Finesse ${pick.st?.check?.val} vs ${pick.st?.check?.need}: ${pick.st?.check?.ok ? "passed" : "failed"}) and shown on your choice (${pick.line})`, pick.st?.check?.ok === true && pick.st.check.val === 50 && /✓ Finesse/.test(pick.line || ""));
  chk(`stats move toward the chosen sides (Brutality/Finesse ${pick.fin}, Cunning/Honor ${pick.cun})`, pick.fin === 60 && pick.cun === 45);
  chk("the next scene is told the choice and the check result, with the new stats, scene 2 of 6", /\[The reader chose: Charm him/.test(u1) && /Check on Finesse: SUCCESS/.test(u1) && /Brutality 40 · Finesse 60/.test(s1) && /scene 2 of 6/.test(s1) && !/Begin the reply with a line/.test(s1));
  // a scene without the story line gets its choices from a follow-up call
  const fb = await pg.evaluate(async () => { window.__nj = 1; return true; });
  noJson = true;
  const fbr = await pg.evaluate(async () => { (document.querySelectorAll("#stPick .st-opt")[0].click(), $("stNext").click()); for (let i = 0; i < 200 && (S.busy || S.chat.messages.length < 5); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 200)); return S.chat.messages.at(-1).choices?.map(x => x.t); });
  noJson = false;
  chk(`a scene that came without choices gets them from a follow-up call (${fbr})`, fbr?.join() === "Roar.,Wait.");
  // stats screen and content switch
  const stats = await pg.evaluate(async () => { $("stStats").click(); await new Promise(r => setTimeout(r, 200)); const t = $("sheetBody").textContent; document.querySelector('[data-c="clean"]').click(); await new Promise(r => setTimeout(r, 200)); const c = S.chat.story.opts.content; closeSheet(); return { t, c }; });
  chk("the stats screen shows your nature, standing, chapters and lets you change the content", /Ember/.test(stats.t) && /Wealth/.test(stats.t) && /Infamy/.test(stats.t) && /The Dragon War/.test(stats.t) && /Your nature/.test(stats.t) && stats.c === "clean");
  // the ending: a short story to reach it quickly
  const end = await pg.evaluate(async () => { S.chat.story.chapters = [{ t: "One", goal: "a", scenes: 2 }, { t: "Two", goal: "b", scenes: 2 }]; await saveChat(); renderChoices();
    (document.querySelectorAll("#stPick .st-opt")[0].click(), $("stNext").click()); for (let i = 0; i < 200 && (S.busy || S.chat.messages.length < 7); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 300));
    return { last: S.chat.messages.at(-1), btns: [...document.querySelectorAll("#stPick .choice")].map(x => x.textContent), bar: $("ownBar").textContent }; });
  chk(`the last scene is the ending: no choices, then your tale / keep going / new story (${end.btns.join(" | ")})`, /FINAL scene/.test(sysSeen.at(-1)) && end.last.ending && !end.last.choices?.length && end.btns.length === 3 && /Keep going/.test(end.btns[1]) && /The end/.test(end.bar));
  const more = await pg.evaluate(async () => { $("stMore").click(); for (let i = 0; i < 200 && (S.busy || S.chat.messages.length < 8); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 200)); return { ch: S.chat.story.chapters.map(x => x.t), len: S.chat.story.opts.length, n: S.chat.messages.length }; });
  chk(`Keep going plans more chapters and writes the next scene (${more.ch.join(", ")})`, more.ch.length === 5 && more.ch[2] === "Aftermath" && more.len === "endless" && more.n === 8 && /chapter 3 of 5, "Aftermath"/.test(sysSeen.at(-1)));
  // the chat list and the Stories list show it
  const runs = await pg.evaluate(async () => { leaveChat(); await new Promise(r => setTimeout(r, 100)); await openStories(); await new Promise(r => setTimeout(r, 300)); const t = [...document.querySelectorAll("[data-run]")].map(x => x.textContent); closeSheet(); return t; });
  chk(`your stories are listed to continue (${runs.length})`, runs.length === 1 && /Choice of the Dragon/.test(runs[0]));
  // a random route plans fresh chapters
  const rnd = await pg.evaluate(async () => { storySetup(STORY_PACKS.dragon, null); await new Promise(r => setTimeout(r, 150)); document.querySelector('[data-k="mode"][data-v="random"]').click(); $("stGo").click();
    for (let i = 0; i < 200 && (S.busy || !S.chat?.story || !S.chat.messages.length || S.chat.story.chapters[0].t !== "Fresh 1"); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 200)); return { ch: S.chat.story.chapters.map(x => x.t), bots: S.chars.filter(c => c.storyPack === "dragon").length }; });
  chk(`A new story plans its own chapters in the same world, on the same story bot (${rnd.ch[0]}…)`, rnd.ch.length === 7 && rnd.ch[0] === "Fresh 1" && rnd.bots === 1);
  // a story made from one of your bots
  const fromBot = await pg.evaluate(async () => { leaveChat(); const c = S.chars.find(x => !x.storyPack); await openProfile(c.id); await new Promise(r => setTimeout(r, 200)); $("pfStory").click(); await new Promise(r => setTimeout(r, 200)); const title = document.querySelector("#sheet .sheet-title, #sheetTitle")?.textContent; $("stGo").click();
    for (let i = 0; i < 200 && (S.busy || !S.chat?.story || S.chat.story.pack !== "bot" || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 200));
    return { title, s: S.chat.story, on: S.charId === c.id }; });
  chk(`📖 Play as a story on a bot's profile plans a story in its world (${fromBot.s?.title}: ${fromBot.s?.pairs?.map(p => p.a + "/" + p.b).join(", ")})`, /Story/.test(fromBot.title || "") && fromBot.on && fromBot.s.title === "Wren's Lighthouse" && fromBot.s.pairs.length === 3 && fromBot.s.pairs[0].ca === "#ff0000" && fromBot.s.meters[0].n === "Supplies" && fromBot.s.chapters.length === 7 && /Bold 50 · Wary 50/.test(sysSeen.at(-1)) && /Supplies 30\/100/.test(sysSeen.at(-1)));
  const wide = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  chk("no sideways scroll", wide);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
