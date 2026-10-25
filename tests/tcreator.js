// v1.59: the character creator. A bot with it on starts each chat by creating your character for that chat (story
// scenes with choices, or quiz screens), with trait pairs that the story keeps in mind; any bot can start such a chat.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = body => String(body.messages?.[0]?.content || ""), userOf = body => String(body.messages?.[1]?.content || "");
  const plan = {
    pairs: [{ a: "Brutal", b: "Subtle" }, { a: "Proud", b: "Watchful" }],
    questions: [
      { q: "The knight charges. What do you do?", scene: "A knight in silver armour charges up the hill at you.", about: "temperament", opts: [{ t: "*I rake my claws across his shield.*", lean: "Brutal", sets: "fights head on" }, { t: "*I melt into the mist and wait.*", lean: "Subtle", sets: "patient" }, { t: "*I watch which way he favours.*", lean: "Watchful", sets: "careful" }] },
      { q: "What do they call you?", scene: "The dying knight asks your name.", about: "name", opts: [{ t: "\"Vyrax.\"", lean: "", sets: "named Vyrax" }, { t: "\"Sereth.\"", lean: "", sets: "named Sereth" }] },
      { q: "What do you look like?", scene: "You catch your reflection in the lake.", about: "look", opts: [{ t: "*Black scales, a torn wing.*", lean: "Proud", sets: "black, scarred" }, { t: "*Small and quick, green as moss.*", lean: "", sets: "small, green" }] }
    ]
  };
  const own = { name: "Vyrax", look: "A huge black dragon with a torn left wing.", personality: "Blunt and proud.\nHates being ignored.", background: "Took the mountain at fifty.", color: "#cc3322", traits: [{ a: "Brutal", b: "Subtle", v: 30 }, { a: "Proud", b: "Watchful", v: 40 }] };
  const json = body => {
    const s = sysOf(body);
    if (/character creation that opens a roleplay chat/.test(s)) return plan;
    if (/write the player's own character/.test(s)) return own;
    if (/You are revising what you made/.test(s)) return { ...own, look: "A huge black dragon with a scar over one eye." };
    return { summary: "x", facts: [] };
  };
  const Q = [];
  const tag = x => `\n[[mood: calm | place: Hill | ambience: none | activity: none | harm: none | hearing: outside${x.traits ? " | traits: " + x.traits : ""}]]`;
  const { b, pg, errs, calls } = await open({ width: W, json, stream: () => { const x = Q.shift() || {}; return (x.text || "*The wind howls over the hill.*") + tag(x); } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  const until = (fn, arg, t = 15000) => pg.waitForFunction(fn, arg, { timeout: t }).catch(() => {});
  const lastSys = () => String(calls.filter(c => c.stream).at(-1)?.messages?.[0]?.content || "");
  const lastMsgs = () => JSON.stringify(calls.filter(c => c.stream).at(-1)?.messages || []);
  const beats = () => pg.evaluate(() => S.chat.messages.filter(m => m.role === "assistant").length);
  const idle = () => until(() => !S.busy);

  // ---- a story-style creator bot
  const ids = await pg.evaluate(async () => {
    const d = Object.assign(blankChar("character"), { name: "Dragon Peak", description: "You are a young dragon claiming a mountain.", scenario: "A mountain kingdom.", firstMessage: "*Hello {{user}}.*", creator: { on: true, style: "story", pins: [{ q: "What colour is your fire?", opts: ["Blue", "Gold"] }], pairs: [] } });
    const q = Object.assign(blankChar("character"), { name: "Quiz Keep", description: "A castle of knights.", firstMessage: "*The gate opens for {{user}}.*", creator: { on: true, style: "quiz" } });
    const n = Object.assign(blankChar("character"), { name: "Plain Inn", description: "An inn.", firstMessage: "*The innkeeper nods.*" });
    S.chars.unshift(d, q, n); await saveChars(); renderHome(); return { d: d.id, q: q.id, n: n.id };
  });
  await pg.evaluate(id => openProfile(id), ids.d); await wait(300);
  chk("creator bot's profile says chats start by creating a character", /creating your character/.test(await pg.textContent("#sheetBody")) && !await pg.$("#pfCreate"));
  await pg.click("#pfNew");
  await until(() => S.chat?.creating?.plan && S.chat.messages.some(m => m.crStep === 0) && !S.busy); await wait(300);
  const st0 = await pg.evaluate(() => ({ qs: S.chat.creating.plan.qs.map(q => q.q), msgs: S.chat.messages.length, bar: $("ownBar").textContent, barOn: !$("ownBar").hidden, choices: $("choiceBar").querySelectorAll(".choice").length, hidden: $("chat").classList.contains("choosing"), greet: S.chat.messages.some(m => m.greeting) }));
  chk("the author's must-ask question is in the plan", st0.qs.length === 4 && st0.qs.includes("What colour is your fire?"));
  chk("story opens with a scene, not the bot's opening", st0.msgs === 1 && !st0.greet);
  chk("bar shows progress 0 / 4", st0.barOn && /Creating your character/.test(st0.bar) && /0 \/ 4/.test(st0.bar));
  chk("the question's options show as choices with the box hidden", st0.choices === 3 && st0.hidden);
  let sys = lastSys();
  chk("prompt: character creation section leads into the first moment", /# Character creation/.test(sys) && /knight in silver armour charges/.test(sys) && /Choice of the Dragon/.test(sys) && !/# Choices/.test(sys));
  chk("prompt: planner got the bot's setting and the pinned question", calls.some(c => /character creation that opens/.test(sysOf(c)) && /What colour is your fire\?/.test(sysOf(c)) && /young dragon/.test(userOf(c))));
  // pick "rake my claws" (Brutal)
  await pg.click('#choiceBar .choice[data-i="0"]');
  await until(n => S.chat.messages.filter(m => m.role === "assistant").length > n && !S.busy, 1); await wait(200);
  const st1 = await pg.evaluate(() => ({ cr: S.chat.messages.find(m => m.role === "user")?.create, step: S.chat.messages.at(-1).crStep, tr: crNowTraits(S.chat), bar: $("ownBar").textContent }));
  chk("the pick is stored on your message", st1.cr && st1.cr.i === 0 && st1.cr.opt === 0);
  chk("traits lean Brutal after the pick", st1.tr[0].a === "Brutal" && st1.tr[0].v === 35 && /1 \/ 4/.test(st1.bar));
  sys = lastSys();
  chk("next prompt: shows the last choice and leads into the next moment", /Settled so far/.test(sys) && /rake my claws/.test(sys) && /What colour is your fire/.test(sys) && /a little brutal/.test(sys));
  chk("pinned question offers its options", st1.step === 1 && (await pg.$$("#choiceBar .choice")).length === 2);
  await pg.click('#choiceBar .choice[data-i="1"]'); // Gold
  await until(n => S.chat.messages.filter(m => m.role === "assistant").length > n && !S.busy, 2); await wait(200);
  // the name: write my own
  await pg.click("#chOwn"); await wait(100);
  chk("Write my own shows the box", !(await pg.evaluate(() => $("chat").classList.contains("choosing"))));
  await pg.fill("#input", "\"Kazrath,\" I growl."); await pg.evaluate(() => send());
  await until(n => S.chat.messages.filter(m => m.role === "assistant").length > n && !S.busy, 3); await wait(200);
  chk("a written answer counts too", await pg.evaluate(() => { const u = S.chat.messages.filter(m => m.role === "user").at(-1); return u.create && u.create.i === 2 && u.create.opt === null; }));
  // the last question → the character is written and reviewed
  await pg.click('#choiceBar .choice[data-i="0"]');
  await until(() => !!document.getElementById("crBegin")); await wait(200);
  const rv = await pg.textContent("#sheetBody");
  chk("last answer opens the review with name, look and traits", /Vyrax/.test(rv) && /torn left wing/.test(rv) && /Brutal/.test(rv) && /Watchful/.test(rv));
  chk("the builder got every answer", calls.some(c => /write the player's own character/.test(sysOf(c)) && /Kazrath/.test(userOf(c)) && /Gold/.test(userOf(c)) && /Brutal \/ Subtle: 35/.test(userOf(c))));
  // rewrite the look
  await pg.click('#crParts [data-p="look"]'); await pg.fill("#crNote", "a scar"); await pg.click("#crRe");
  await until(() => /scar over one eye/.test(document.getElementById("sheetBody")?.textContent || "") && !!document.getElementById("crBegin")); await wait(200);
  chk("rewrite changes only the look and keeps the traits", await pg.evaluate(() => { const c = S.chat.creating.card; return /scar over one eye/.test(c.look) && c.traits[0].v === 30 && c.answers.length === 4; }));
  // begin
  Q.push({ text: "*The knight's sword clatters down. You stand over him, Vyrax.*" });
  const nb = await beats();
  await pg.click("#crBegin");
  await until(n => S.chat.messages.filter(m => m.role === "assistant").length > n && !S.busy, nb); await wait(300);
  const st2 = await pg.evaluate(() => ({ own: S.chat.own, creating: !!S.chat.creating, u: uname(), bar: $("ownBar").textContent, chip: !!$("ownOpen"), got: !!ACHS.got.born_anew }));
  chk("the chat now has its own character", st2.own?.name === "Vyrax" && !st2.creating && st2.u === "Vyrax" && st2.own.traits[0].v0 === 30);
  chk("bar shows the name and the traits", st2.chip && /Vyrax/.test(st2.bar) && /Brutal/.test(st2.bar));
  sys = lastSys(); const ms = lastMsgs();
  chk("prompt: about the character, its nature and the traits field", /About Vyrax/.test(sys) && /scar over one eye/.test(sys) && /# Vyrax's nature/.test(sys) && /traits: Brutal\/Subtle=number, Proud\/Watchful=number/.test(sys) && !/# Character creation/.test(sys));
  chk("prompt: the last creation choice says the story carries on", /last character-creation choice/.test(ms));
  chk("Born Anew badge", st2.got);
  // traits drift from the hidden line, at most 8 a reply
  Q.push({ traits: "Brutal/Subtle=5, Proud/Watchful=44" });
  await pg.fill("#input", "*I roar.*"); await pg.evaluate(() => send()); await idle(); await wait(200);
  chk("traits drift a little from the tag", await pg.evaluate(() => S.chat.own.traits[0].v === 22 && S.chat.own.traits[1].v === 44));
  // chat lists
  const ix = await pg.evaluate(async id => (await getIndex(id)).find(e => e.id === S.chat.id), ids.d);
  chk("chat index carries the character's name", ix && ix.own === "Vyrax" && await pg.evaluate(() => chatPreview({ ...S.chat, messages: [{ role: "user", content: "hi" }] }).startsWith("Vyrax:")));
  await pg.evaluate(id => openChats(id), ids.d); await wait(250);
  chk("chat list shows the name and Own badge", /Vyrax/.test(await pg.textContent("#chList")) && /Own/.test(await pg.textContent("#chList")));
  await pg.evaluate(() => closeSheet());
  // edit and save as a persona
  await pg.click("#ownOpen"); await wait(250);
  await pg.fill("#owBg", "Queen of the peak."); await pg.click("#owKeep"); await wait(400);
  const per = await pg.evaluate(() => { const p = S.personas.find(x => x.name === "Vyrax"); return p && { desc: p.description, col: p.color, saved: S.chat.own.savedAs === p.id, bg: S.chat.own.background, badge: !!ACHS.got.made_official }; });
  chk("saved as a real persona with its nature", per && /Queen of the peak/.test(per.desc) && /Nature:/.test(per.desc) && per.col === "#cc3322" && per.saved && per.badge);
  await pg.click("#ownOpen"); await wait(250);
  chk("the persona button now updates it", /Update the saved persona/.test(await pg.textContent("#sheetBody")));
  await pg.evaluate(() => closeSheet());
  // the options menu
  await pg.click("#btnMore"); await wait(200);
  const opt = await pg.textContent("#sheetBody");
  chk("Options: your character, no persona switch", /Your character: Vyrax/.test(opt) && !await pg.$("#oPer"));
  await pg.evaluate(() => closeSheet());

  // ---- skip a creation
  await pg.evaluate(async id => { const c = byId(id); const ch = newChat(c, S.personaId); S.charId = id; S.chat = ch; await saveChat(); await openChat(id, ch.id); }, ids.d);
  await until(() => S.chat?.messages.some(m => m.crStep === 0) && !S.busy); await wait(200);
  await pg.click("#ownSkip"); await wait(100); await pg.click("#ownSkip"); await wait(300);
  const sk = await pg.evaluate(() => ({ cr: !!S.chat.creating, g: S.chat.messages[0]?.content, n: S.chat.messages.length, bar: $("ownBar").hidden, u: uname() }));
  chk("Skip: the usual persona and the bot's opening", !sk.cr && sk.n === 1 && /Hello/.test(sk.g) && sk.bar && sk.u !== "You");

  // ---- quiz style
  await pg.evaluate(id => openProfile(id), ids.q); await wait(250);
  await pg.click("#pfNew");
  await until(() => !!document.querySelector("#sheetBody .cr-o")); await wait(200);
  const q0 = await pg.evaluate(() => ({ q: document.querySelector(".qz-q")?.textContent, n: document.querySelectorAll(".cr-o").length, step: document.querySelector(".qz-step")?.textContent, msgs: S.chat.messages.length, tr: document.querySelectorAll("#sheetBody .trait").length }));
  chk("quiz: first question on its own screen, no opening yet", /knight charges/.test(q0.q) && q0.n === 3 && /1 \/ 3/.test(q0.step) && q0.msgs === 0 && q0.tr === 2);
  await pg.click('.cr-o[data-k="1"]'); await wait(450);
  chk("quiz: picking moves on and the traits follow", await pg.evaluate(() => /2 \/ 3/.test(document.querySelector(".qz-step")?.textContent || "") && crNowTraits(S.chat)[0].v === 65));
  await pg.click("#crBack"); await wait(250);
  chk("quiz: Back returns to the first question", await pg.evaluate(() => /1 \/ 3/.test(document.querySelector(".qz-step")?.textContent || "") && document.querySelector('.cr-o[data-k="1"]').classList.contains("on")));
  await pg.click("#crNext"); await wait(300);
  await pg.click("#crNext"); await wait(200);
  chk("quiz: Next needs an answer", /Pick an answer/.test(await pg.textContent("#crMsg")));
  await pg.fill("#crOther", "Mira"); await pg.click("#crNext"); await wait(300);
  await pg.click('.cr-o[data-k="0"]');
  await until(() => !!document.getElementById("crBegin")); await wait(200);
  chk("quiz: the builder heard the written name", calls.some(c => /write the player's own character/.test(sysOf(c)) && /Mira/.test(userOf(c)) && !/creation scenes/.test(userOf(c))));
  // closing asks first and keeps everything
  await pg.click("#sheetClose"); await wait(150);
  chk("closing the review asks first", /answers are kept/.test(await pg.textContent("#sheet")));
  await pg.click("#scClose"); await wait(200);
  chk("bar offers Review your character", /Review your character/.test(await pg.textContent("#ownBar")));
  await pg.click("#ownGo"); await wait(250);
  await pg.click("#crBegin"); await wait(500);
  const qz = await pg.evaluate(() => ({ g: S.chat.messages[0]?.content, own: S.chat.own?.name, style: S.chat.own?.style }));
  chk("quiz: the bot's opening plays with the new name", qz.own === "Vyrax" && /gate opens for Vyrax/.test(qz.g) && qz.style === "quiz");

  // ---- any bot: a chat with a character made for it
  await pg.evaluate(id => openProfile(id), ids.n); await wait(250);
  chk("other bots offer a chat with a character made for it", !!await pg.$("#pfCreate"));
  await pg.click("#pfCreate");
  await until(() => S.chat?.creating?.plan && S.chat.messages.some(m => m.crStep === 0) && !S.busy); await wait(200);
  chk("…which starts a story-style creation", await pg.evaluate(() => S.chat.creating.style === "story" && !$("ownBar").hidden));
  await pg.evaluate(async () => { const nc = newChat(char(), S.personaId); S.chat = nc; await saveChat(); await openChat(S.charId, nc.id); }); await wait(300);
  chk("its normal New chat still plays your persona", await pg.evaluate(() => !S.chat.creating && !S.chat.own && $("ownBar").hidden && /innkeeper/.test(S.chat.messages[0].content)));

  // opened while another chat's reply is still winding down: the creation starts once it has
  await pg.evaluate(async id => { S.busy = true; const nc = newChat(byId(id), S.personaId, { create: true }); S.chat = nc; await saveChat(); await openChat(id, nc.id); setTimeout(() => { S.busy = false; }, 700); }, ids.n);
  await until(() => S.chat?.creating?.plan && S.chat.messages.some(m => m.crStep === 0) && !S.busy); await wait(200);
  chk("a creation opened while busy still starts", await pg.evaluate(() => S.chat.messages.some(m => m.crStep === 0)));

  // ---- the editor
  await pg.evaluate(id => editChar(byId(id), false), ids.n); await wait(300);
  chk("editor has the Character creator group", !!await pg.$("#cCreator #cCrOn"));
  await pg.check("#cCrOn"); await pg.click('#cCrStyle [data-s="quiz"]'); await wait(100);
  await pg.click("#cCrPair"); await wait(100);
  await pg.fill('.cr-pair [data-f="a"]', "greedy"); await pg.fill('.cr-pair [data-f="b"]', "Generous");
  await pg.click("#cCrPin"); await wait(100);
  await pg.fill('.cr-pin [data-f="q"]', "Which god do you pray to?"); await pg.fill('.cr-pin [data-f="opts"]', "The Moon\nThe Deep\n");
  await pg.click("#cCrPin"); await wait(100); // an empty one is dropped
  await pg.click("#cSave"); await wait(600);
  const ed = await pg.evaluate(id => byId(id).creator, ids.n);
  chk("editor saves the switch, style, pairs and questions", ed && ed.on && ed.style === "quiz" && ed.pairs[0].a === "Greedy" && ed.pairs[0].b === "Generous" && ed.pins.length === 1 && ed.pins[0].opts.join() === "The Moon,The Deep");

  // ---- the generator can turn it on
  const gen = await pg.evaluate(async () => {
    const card = genNormalize({ name: "Ashborn", summary: "x", tags: [], description: "d", appearance: "a", scenario: "s", firstMessages: ["hi"], creator: { on: true, style: "story", pairs: [["Brutal", "Subtle"]] } }, "character", "auto");
    const off = genNormalize({ name: "Nope", creator: null }, "character", "auto");
    const w = await cardToBot(card, "character");
    return { card: card.creator, off: off.creator, bot: w.creator, spec: genSpec("character", "auto") };
  });
  chk("generator: creator field asked for, kept, copied to the bot", /"creator"/.test(gen.spec) && gen.card?.on && gen.card.pairs[0].b === "Subtle" && gen.off === null && gen.bot?.on);

  // ---- badges and layout
  chk("badges are in the list", await pg.evaluate(() => ["born_anew", "many_lives", "made_official", "all_the_way", "change_heart"].every(k => ACH_BY[k])));
  await pg.evaluate(() => { S.chat.own && (S.chat.own.traits[0].v = 0); achEvent("trait", { traits: [{ a: "A", b: "B", v: 0, v0: 50 }] }); });
  chk("trait badges", await pg.evaluate(() => !!ACHS.got.all_the_way && !!ACHS.got.change_heart));
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
