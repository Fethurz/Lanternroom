// v1.60: chat with your own personas as another persona. They live in Home's Personas tab, apart from the bots.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const Q = [];
  const tag = `\n[[mood: calm | place: Garden | ambience: none | activity: none | harm: none | hearing: outside]]`;
  const { b, pg, errs, calls } = await open({ width: W, stream: () => (Q.shift() || "*The garden is quiet.*") + tag });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  const until = (fn, arg, t = 15000) => pg.waitForFunction(fn, arg, { timeout: t }).catch(() => {});
  const lastSys = () => String(calls.filter(c => c.stream).at(-1)?.messages?.[0]?.content || "");
  const ids = await pg.evaluate(async () => {
    const a = { id: uid(), name: "Ash", description: "A tall grey wolf, a quiet blacksmith.", color: "#ff8800" };
    const c = { id: uid(), name: "Cleo", description: "A small sly fox thief.", color: "#33aaff" };
    const g = { id: uid(), name: "Ash and friends", description: "", members: [a.id] };
    S.personas.push(a, c, g); S.personaId = a.id; await savePersonas();
    renderHome(); return { a: a.id, c: c.id, g: g.id, bots: S.chars.length };
  });
  chk("Home has a Personas tab", !!await pg.$('#homeTabs [data-tab="personas"]'));
  await pg.click('#homeTabs [data-tab="personas"]'); await wait(300);
  const tab = await pg.evaluate(() => ({ cards: [...document.querySelectorAll("#charList .char-card.k-persona .name")].map(x => x.textContent.trim()), bots: document.querySelectorAll("#charList .char-card:not(.k-persona)").length, tags: $("tagFilter").hidden }));
  chk("the tab lists single personas only, no bots", tab.cards.includes("Ash") && tab.cards.includes("Cleo") && !tab.cards.includes("Ash and friends") && tab.bots === 0 && tab.tags);
  await pg.fill("#search", "fox"); await pg.evaluate(() => { HF.q = "fox"; renderHome(); }); await wait(150);
  chk("search works in the tab", await pg.evaluate(() => [...document.querySelectorAll("#charList .char-card.k-persona .name")].map(x => x.textContent.trim()).join() === "Cleo"));
  await pg.evaluate(() => { $("search").value = ""; HF.q = ""; renderHome(); });
  // Ash's profile: you can't talk to Ash as Ash, nor as a group with Ash in it
  await pg.evaluate(id => openPBProfile(id), ids.a); await wait(250);
  const opts = await pg.evaluate(() => [...document.querySelectorAll("#pbAs option")].map(o => o.textContent));
  chk("Talk as leaves out the persona itself and groups with it", opts.includes("Cleo") && !opts.includes("Ash") && !opts.includes("Ash and friends"));
  chk("start button reads Start chatting", /Start chatting/.test(await pg.textContent("#pbGo")));
  Q.push("*Ash looks up from the anvil as you slip through the door, Cleo.* \"You again.\"");
  await pg.selectOption("#pbAs", ids.c);
  await pg.click("#pbGo");
  await until(() => S.chat?.messages?.[0]?.greeting && !S.busy); await wait(300);
  const st = await pg.evaluate(() => ({ c: char(), pid: S.chat.personaId, u: uname(), m: S.chat.messages[0], inChars: S.chars.some(x => x.fromPersona), n: S.chars.length }));
  chk("a chat opens with Ash as the bot and you as Cleo", st.c.fromPersona === ids.a && st.c.name === "Ash" && st.u === "Cleo" && st.pid === ids.c);
  chk("the AI wrote the opening, with a blank start to swipe to", /anvil/.test(st.m.content) && st.m.alts.length === 2 && st.m.alts[1] === "");
  const sys = lastSys();
  chk("prompt: Ash's persona as the character, Cleo as you", /You are Ash/.test(sys) && /quiet blacksmith/.test(sys) && /About Cleo/.test(sys) && /sly fox thief/.test(sys));
  chk("stand-in bots never join your bots", !st.inChars && st.n === ids.bots && await pg.evaluate(() => S.pbots.length === 1));
  // the persona changes → the bot follows
  await pg.evaluate(async id => { S.personas.find(p => p.id === id).description = "A tall grey wolf with a burn scar, a quiet blacksmith."; await savePersonas(); await openChat(S.charId, S.chat.id); }, ids.a); await wait(300);
  await pg.fill("#input", "\"Hi.\""); await pg.evaluate(() => send()); await until(() => !S.busy); await wait(200);
  chk("editing the persona updates who you talk to", /burn scar/.test(lastSys()));
  // switching persona to Ash inside the chat is refused
  await pg.evaluate(id => usePersona(id), ids.a); await wait(200);
  chk("can't switch to the persona you're talking to", await pg.evaluate(() => uname() === "Cleo"));
  // Options name it a persona; Edit opens the persona editor
  await pg.click("#btnMore"); await wait(200);
  chk("Options: Edit this persona", /Edit this persona/.test(await pg.textContent("#sheetBody")));
  await pg.click("#oEdit"); await wait(250);
  chk("…opens the persona editor", !!await pg.$("#peName"));
  await pg.evaluate(() => closeSheet());
  // Chats sheet: "As …" leaves Ash out
  await pg.evaluate(() => openChats(S.charId)); await wait(200);
  chk("Chats sheet won't offer Ash as yourself", await pg.evaluate(() => [...document.querySelectorAll("#ncP option")].every(o => !/Ash$/.test(o.textContent))));
  await pg.evaluate(() => closeSheet());
  // the stand-in stays out of the other lists
  await pg.evaluate(() => leaveChat()); await wait(300);
  await pg.click('#homeTabs [data-tab="recent"]'); await wait(200);
  chk("not in Recent", await pg.evaluate(() => ![...document.querySelectorAll("#charList .char-card .name")].some(x => /Ash/.test(x.textContent))));
  await pg.click('#homeTabs [data-tab="all"]'); await wait(200);
  chk("not in All", await pg.evaluate(() => ![...document.querySelectorAll("#charList .char-card .name")].some(x => /Ash/.test(x.textContent))));
  chk("not in tags or the daily bot's tags", await pg.evaluate(async () => !allLibTags().includes(undefined) && !JSON.stringify(await dailyTagWeights()).includes("Ash")));
  // Personas tab shows the chat count; the profile continues the chat
  await pg.click('#homeTabs [data-tab="personas"]'); await wait(500);
  chk("the persona card counts its chats", await pg.evaluate(() => !!document.querySelector("#charList .k-persona .bstats:not([hidden])")));
  await pg.evaluate(id => openPBProfile(id), ids.a); await wait(250);
  chk("profile now says Continue chat and lists it", /Continue chat/.test(await pg.textContent("#pbGo")) && /As Cleo/.test(await pg.textContent("#pbChats")));
  const before = await pg.evaluate(() => S.pbots[0].id);
  await pg.click("#pbGo"); await wait(500);
  chk("Continue opens the same chat", await pg.evaluate(id => S.charId === id && S.chat.messages.length >= 3, before));
  await pg.evaluate(() => leaveChat());
  // openProfile on the stand-in goes to the persona's profile
  await pg.evaluate(id => openProfile(id), before); await wait(250);
  chk("the stand-in opens the persona's profile", !!await pg.$("#pbAs"));
  await pg.evaluate(() => closeSheet());
  // only one persona: nothing to talk as
  await pg.evaluate(async () => { S._keep = S.personas; S.personas = [S.personas.find(p => p.name === "Cleo")]; }); await pg.evaluate(id => openPBProfile(id), ids.c); await wait(200);
  chk("with no other persona it asks you to make one", !await pg.$("#pbGo") && /Make another persona/.test(await pg.textContent("#sheetBody")));
  await pg.evaluate(() => { S.personas = S._keep; closeSheet(); });
  // sync knows the key
  chk("pbots sync as a list", await pg.evaluate(() => Sync.synced("pbots") && Sync.listKey("pbots") && Sync.merge("pbots", [{ id: "x", n: 1 }], [{ id: "y" }]).length === 2));
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
