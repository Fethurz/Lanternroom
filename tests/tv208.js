// v2.8: the story quiz (a world bot plus its story, written from quiz answers; plot ingredients planned in secret per run)
// and remixes (a copy of a story with only the named parts rewritten; the original untouched).
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const seen = [], sys = [];
  const tag = "\n[[mood: calm | place: Hall | ambience: indoors | activity: none | hearing: outside]]";
  const scene = t => `${t}\n[[story: ${JSON.stringify({ choices: [{ t: "Stay.", leans: [] }, { t: "Run.", leans: [] }] })}]]${tag}`;
  const world = { name: "Varrowgate", tags: ["fantasy", "vore", "dungeon"], summary: "A city over hungry dungeons.", description: "Varrowgate sits over the Hollows.", scenario: "{{user}} is a delver.", firstMessages: ["*The guildhall is loud.*", "*The well goes deeper than it should.*"], startPlace: "The guildhall", instructions: ["- Keep the party warm."], lore: [{ keys: "hollow, knot", text: "Hollows close when their Knot is cracked." }], badges: [{ name: "Out", how: "Survive." }], creator: null,
    cast: [{ name: "Maren", type: "character", details: "The party's leader." }, { name: "The Wellstair", type: "location", details: "A copper Hollow." }] };
  const def = { title: "Ignored Title", icon: "🕯️", blurb: "A run goes wrong.", setting: "Varrowgate sits over Hollows. Delvers go down.", you: "a delver", roles: ["a delver", "a lampman"],
    options: [{ id: "You Are!", n: "You are", hint: "", choices: [["Woman", "A woman", "The reader is a woman."], ["man", "A man", "The reader is a man."]] }, { id: "bad", n: "Broken", choices: [["x", "Only one"]] }],
    pairs: [{ a: "Bold", b: "Careful", ca: "#ff0000", cb: "nope" }], meters: [{ n: "Health", v: 100, max: 100, desc: "your health" }, { n: "Hunger", v: 20, max: 100, desc: "its hunger" }],
    chapters: [1, 2, 3, 4, 5].map(i => ({ t: "Chapter " + i, goal: "Things happen " + i + ".", scenes: 4 })), danger: "real", vore: true };
  const remix = { title: "", changes: ["Rhoswen is now a hyena called Rhosa.", "A friendly kobold, Pib, helps the reader."], rename: [{ from: "Rhoswen", to: "Rhosa" }],
    edits: [{ field: "description", find: "Rhoswen is a sly “red” fox who steals.", replace: "Rhoswen is a cackling spotted hyena who steals." }, { field: "cast:Rhoswen", find: "A fox thief.", replace: "A hyena thief." }, { field: "description", find: "This sentence is not in the bot at all.", replace: "x" }, { field: "story.chapters.1", find: "G2", replace: "G2 with Pib's help" }],
    castAdd: [{ name: "Pib", type: "character", details: "A friendly kobold who helps the reader." }], loreAdd: [{ name: "Pib", keys: "pib, kobold", text: "Pib knows the tunnels." }], openings: ["*Pib waves from the tunnel.*"],
    story: { roles: ["a thief", "Pib's friend"] } };
  const { b, pg, errs } = await open({
    width: W,
    stream: body => { seen.push(String(body.messages?.[0]?.content || "")); return scene("**Chapter 1: Chapter 1**\n\nThe guildhall is loud."); },
    json: body => {
      const s = String(body.messages?.[0]?.content || ""); sys.push(s);
      if (/^You design bots for Lanternroom/.test(s)) return world;
      if (/^You turn a world bot into a full interactive novel/.test(s)) return def;
      if (/^You secretly plan the hidden turns/.test(s)) return { plan: "SECRETPLAN: Maren betrays the reader in chapter 3." };
      if (/^You remix an interactive story/.test(s)) return /Rhoswen/.test(String(body.messages?.[1]?.content || "")) ? remix : { title: "Choice of the Wyrm", changes: ["The dragon is a wyrm."], edits: [{ field: "story.setting", find: (c => JSON.parse(c.slice(c.indexOf("\n") + 1, c.indexOf("\n\nWhat the owner"))).story.setting.split(". ")[0])(String(body.messages[1].content)), replace: "WYRMSET" }] };
      return { summary: "x", facts: [], look: "a city", text: "a city" };
    }
  });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = (fn, ms = 15000) => pg.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
  chk("version 2.8 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 2008));

  // the quiz itself
  const q = await pg.evaluate(async () => {
    QUIZ.a = qzNew("character"); QUIZ.a.q.name = { pick: [], other: "Vex", decide: false, num: "" }; QUIZ.i = 1; await qzKeep(true);
    $("btnNewChar").click(); await new Promise(r => setTimeout(r, 150));
    const btn = !!$("genStoryQuiz"); $("genStoryQuiz").click(); await new Promise(r => setTimeout(r, 150));
    const title = $("sheetTitle")?.textContent || document.querySelector("#sheet h2, #sheet .sheet-title")?.textContent || "";
    const sec = document.querySelector(".qz-step span")?.textContent || "", total = document.querySelector(".qz-step span:last-child")?.textContent || "";
    $("qzOther").value = "Last One Out"; $("qzOther").dispatchEvent(new Event("input")); $("qzNext").click(); await new Promise(r => setTimeout(r, 120));
    const sec2 = document.querySelector(".qz-step span")?.textContent || "", q2 = document.querySelector(".qz-q")?.textContent || "";
    await qzKeep(true); const dr = await drafts();
    const withVore = qzSteps({ kind: "story", q: {} }).length, noVore = qzSteps({ kind: "story", q: { vorelaw: { pick: [SQ_NOVORE] } } }).length;
    return { btn, title, sec, total, sec2, q2, both: dr.quiz?.a?.kind === "character" && dr.squiz?.a?.kind === "story" && dr.squiz.a.q.title?.other === "Last One Out", withVore, noVore, qa: QUIZ.a.kind };
  });
  chk("Create has a Story quiz button", q.btn);
  chk(`the story quiz opens on Premise (${q.sec}, ${q.total})`, q.sec === "Premise" && /^1 \/ 2\d$/.test(q.total));
  chk(`next question (${q.q2})`, q.q2 === "What kind of story?");
  chk("its draft has its own slot; the character quiz draft stays", q.both);
  chk(`"no vore" hides the pred and vore-type questions (${q.withVore} → ${q.noVore})`, q.withVore - q.noVore === 2);
  chk("the old character quiz button doesn't resume the story quiz", await pg.evaluate(async () => { closeSheet(); $("btnNewChar").click(); await new Promise(r => setTimeout(r, 120)); $("genQuiz").click(); await new Promise(r => setTimeout(r, 120)); const ok = !!document.querySelector("[data-k='story']") && !document.querySelector(".qz-q"); closeSheet(); return ok; }));

  // making it
  await pg.evaluate(() => {
    const A = (pick, other = "") => ({ pick, other, decide: false, num: "" });
    QUIZ.a = { kind: "story", q: { title: A([], "Last One Out"), genre: A(["dark fantasy"]), hook: A([], "a copper run goes wrong"), vorelaw: A(["known but taboo"]), preds: A(["monsters / creatures"]), picks: A(["your sex"]), beats: A(["betrayal", "sole survivor"], "the cook is a spy"), chapters: A(["5 chapters"]), vtypes: A(["oral vore"]), danger: A(["brutal: one bad call can kill"]), gauges: A(["health", "a pred's hunger"]) }, m: [] };
    QUIZ.i = 0; qzMake(QUIZ.a);
  });
  chk("the review opens", await wait(() => !!document.getElementById("sqMake")));
  const r = await pg.evaluate(() => ({ d: SQ.def, text: $("sheetBody")?.textContent || document.getElementById("sheet").textContent, dr: Object.keys(DRAFTS || {}) }));
  chk(`the user's own title wins (${r.d.title})`, r.d.title === "Last One Out");
  chk(`chapters follow the answer and are 18 scenes (${r.d.chapters.length})`, r.d.chapters.length === 5 && r.d.chapters.every(c => c.scenes === 18));
  chk(`setup choices cleaned (${JSON.stringify(r.d.options.map(o => [o.id, o.choices.map(c => c[0])]))})`, r.d.options.length === 1 && r.d.options[0].id === "youare" && r.d.options[0].choices[0][0] === "woman");
  chk(`danger from the answer (${r.d.danger}), vore on`, r.d.danger === "brutal" && r.d.vore === true);
  chk(`plot ingredients kept as written (${r.d.beats.join("; ")})`, r.d.beats.join("|") === "betrayal|sole survivor|the cook is a spy");
  chk("bad pair colours fall back", r.d.pairs[0].ca === "#ff0000" && /^#[0-9a-f]{6}$/.test(r.d.pairs[0].cb));
  chk("the world prompt keeps the plot out of the card", sys.some(s => /^You design bots/.test(s)) && (await pg.evaluate(() => SQ.prompt)).startsWith("The user filled in a story quiz"));
  chk("the review shows the story parts and the ingredients", /Setup choices · 1/.test(r.text) && /Chapters · 5/.test(r.text) && /Your plot ingredients/.test(r.text) && /the cook is a spy/.test(r.text));
  chk("the result is kept as a draft until it's made", r.dr.includes("sq"));
  const made = await pg.evaluate(async () => {
    const n = S.chars.length; $("sqMake").click();
    for (let i = 0; i < 300 && S.chars.length === n; i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 300));
    const w = S.chars[0], dr = await drafts();
    return { name: w.name, kind: w.kind, story: !!w.storyDef, title: w.storyDef?.title, tags: w.tags, gauges: (w.gauges || []).map(g => g.name + ":" + g.start), instr: w.instructions, cast: (w.cast || []).length, shelf: !!document.querySelector(`[data-pk="bot:${w.id}"]`), draft: !!dr.sq, id: w.id };
  });
  chk(`a world bot with its story (${made.name}, ${made.title})`, made.kind === "world" && made.story && made.title === "Last One Out" && made.cast === 2);
  chk(`gauges from the story's meters (${made.gauges.join(", ")})`, made.gauges.join() === "Health:100,Hunger:20");
  chk("tagged story and vore; the bot's rules carry the ingredients", made.tags.includes("story") && made.tags.includes("vore") && /Plot ingredients to weave in/.test(made.instr));
  chk("it's on the Stories shelf and the draft is gone", made.shelf && !made.draft);

  // a run: the setup uses the story's danger, the twists are planned in secret
  const run = await pg.evaluate(async id => {
    closeSheet(); storySetup(packOf("bot:" + id), null); await new Promise(r => setTimeout(r, 150));
    const dg = document.querySelector("[data-dg].on")?.dataset.dg || [...document.querySelectorAll(".tab.on")].map(x => x.textContent).join("|");
    const opts = document.querySelectorAll("[data-opt]").length;
    $("stGo").click();
    for (let i = 0; i < 300 && !(S.chat?.story && S.chat.messages.length && !S.busy); i++) await new Promise(r => setTimeout(r, 50));
    openStoryStats(); await new Promise(r => setTimeout(r, 120)); const stats = $("sheet").textContent; closeSheet();
    return { dg, opts, secret: S.chat.story.secret, beats: S.chat.story.beats, danger: S.chat.story.opts.danger, stats };
  }, made.id);
  chk(`setup starts on the story's danger (${run.danger}) and shows its choices`, run.danger === "brutal" && run.opts === 2);
  chk("the run plans its twists privately", /SECRETPLAN/.test(run.secret || "") && run.beats.length === 3);
  chk("the narrator gets the secret plan", seen.some(s => /# Secret plan/.test(s) && /SECRETPLAN/.test(s)));
  chk("Stats never show the plan", !/SECRETPLAN|betray/i.test(run.stats));
  await pg.evaluate(() => leaveChat());

  // remixing a bot's story
  const rx = await pg.evaluate(async () => {
    const def = { title: "Thieves' Road", icon: "🗝️", blurb: "Steal.", you: "a thief", roles: ["a thief"], setting: "Rhoswen runs the road.", pairs: [{ a: "Bold", b: "Careful" }], meters: [{ k: "m0", n: "Health", v: 100, max: 100 }], chapters: [1, 2, 3].map(i => ({ t: "C" + i, goal: "G" + i, scenes: 6 })) };
    S.chars.push({ ...blankChar("world"), id: "trx", name: "Thieves' Road", description: "*Rhoswen is a sly \"red\" fox who steals.* She works with Rhoswenna's crew.", firstMessage: "*Rhoswen grins.*", altGreetings: [], tags: ["vore"],
      cast: [{ name: "Rhoswen", type: "character", details: "A fox thief." }], lore: [{ name: "Rhoswen's den", keys: "den", text: "Rhoswen sleeps here." }], storyDef: def }); await saveChars();
    openStories(); await new Promise(r => setTimeout(r, 150));
    const remixBtns = document.querySelectorAll("[data-pkr]").length, packs = allPacks().length;
    document.querySelector('[data-pkr="bot:trx"]').click(); await new Promise(r => setTimeout(r, 120));
    document.querySelector('[data-rc="swap"]').click(); const chip = $("rmNote").value;
    $("rmNote").value = "Make Rhoswen a hyena called Rhosa, add a friendly kobold"; $("rmGo").click();
    for (let i = 0; i < 200 && !$("rmSave"); i++) await new Promise(r => setTimeout(r, 50));
    const text = $("sheet").textContent, res = RM.res;
    const out = { remixBtns, packs, chip, text, applied: res.applied.length, missed: res.missed.length };
    const n = S.chars.length; $("rmSave").click();
    for (let i = 0; i < 200 && S.chars.length === n; i++) await new Promise(r => setTimeout(r, 50));
    const w = S.chars[0], o = byId("trx");
    return { ...out, w: { goal2: w.storyDef.chapters[1].goal, name: w.name, desc: w.description, cast: w.cast.map(x => x.name + ": " + x.details), lore: w.lore.map(l => l.name + ": " + l.text), alts: w.altGreetings, first: w.firstMessage, title: w.storyDef.title, roles: w.storyDef.roles, setting: w.storyDef.setting, remixOf: w.remixOf, sdRemix: w.storyDef.remixOf, id: w.id },
      o: { desc: o.description, cast: o.cast.length, setting: o.storyDef.setting, title: o.storyDef.title } };
  });
  chk(`every story has a Remix button (${rx.remixBtns}/${rx.packs})`, rx.remixBtns === rx.packs && rx.packs > 10);
  chk(`chips start the request (${JSON.stringify(rx.chip)})`, rx.chip === "Swap ");
  chk(`the review lists what changed (${rx.applied} placed, ${rx.missed} left out)`, /Rhosa/.test(rx.text) && rx.applied === 3 && rx.missed === 1 && /couldn't be placed/.test(rx.text));
  chk(`a single chapter's goal can be edited (${rx.w.goal2})`, rx.w.goal2 === "G2 with Pib's help");
  chk(`an edit is placed despite curly quotes, keeping the asterisks (${rx.w.desc})`, /^\*Rhosa is a cackling spotted hyena who steals\.\*/.test(rx.w.desc));
  chk("renames are whole-word only", /Rhoswenna's crew/.test(rx.w.desc) && rx.w.first === "*Rhosa grins.*");
  chk(`listing, lore and openings follow (${rx.w.cast.join(" | ")})`, rx.w.cast.includes("Rhosa: A hyena thief.") && rx.w.cast.some(c => /^Pib:/.test(c)) && rx.w.lore.some(l => /^Pib: Pib knows/.test(l)) && rx.w.lore.some(l => /Rhosa sleeps/.test(l)) && rx.w.alts.includes("*Pib waves from the tunnel.*"));
  chk(`the story copy is renamed and its roles rewritten (${rx.w.title}; ${rx.w.setting})`, rx.w.title === "Thieves' Road (remix)" && rx.w.name === "Thieves' Road (remix)" && rx.w.setting === "Rhosa runs the road." && rx.w.roles.join() === "a thief,Pib's friend");
  chk("the copy remembers its original", rx.w.remixOf === "trx" && rx.w.sdRemix === "bot:trx");
  chk("the original is untouched", /Rhoswen is a sly/.test(rx.o.desc) && rx.o.cast === 1 && rx.o.setting === "Rhoswen runs the road." && rx.o.title === "Thieves' Road");

  // remixing a built-in story makes a world bot for it
  const bi = await pg.evaluate(async () => {
    await new Promise(r => setTimeout(r, 800)); closeSheet(); openRemix("dragon"); await new Promise(r => setTimeout(r, 100));
    $("rmNote").value = "The dragon is a wyrm"; $("rmGo").click();
    for (let i = 0; i < 200 && !$("rmSave"); i++) await new Promise(r => setTimeout(r, 50));
    const n = S.chars.length; $("rmSave").click();
    for (let i = 0; i < 400 && S.chars.length === n; i++) await new Promise(r => setTimeout(r, 50));
    const w = S.chars[0];
    return { name: w.name, kind: w.kind, has: hasStoryDef(w), set: w.storyDef.setting, desc: w.description, of: w.storyDef.remixOf, orig: STORY_PACKS.dragon.setting.includes("WYRMSET") };
  });
  chk(`a built-in story's remix becomes a world bot (${bi.name})`, bi.kind === "world" && bi.has && bi.name === "Choice of the Wyrm" && bi.of === "dragon");
  chk("its setting edit landed, the built-in story is untouched", /WYRMSET/.test(bi.set) && bi.desc === bi.set && !bi.orig);
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
