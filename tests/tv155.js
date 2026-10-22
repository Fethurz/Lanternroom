// v1.55: persona makers (describe, surprise, quiz, group), group personas in chat, spin-offs, choices mode,
// currencies, search to make (bots and lorebooks), the Home "make a bot of …" button.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const card = { name: "Bowser", summary: "King of the Koopas.", tags: ["koopa", "villain"], appearance: "Huge spiked turtle.", description: "Loud and proud.", scenario: "His castle.", firstMessages: ["*He laughs.* \"Welcome!\""], instructions: "", lore: [{ keys: "castle", text: "A lava castle." }], startPlace: "Castle", artType: "anthro", badges: [] };
  const sysOf = body => String(body.messages?.[0]?.content || ""), userOf = body => String(body.messages?.[1]?.content || "");
  const json = body => {
    const s = sysOf(body), u = userOf(body);
    if (/player personas/.test(s)) return /group of personas/.test(u) ? { name: "The Den", about: "Three friends.", members: [{ name: "Bram", look: "A big bear.", personality: "Kind.", background: "Baker.", color: "#ffaa33" }, { name: "Kit", look: "A small fox.", personality: "Sly.", background: "Thief.", color: "#33aaff" }] } : { name: "Otto", look: "A short chubby otter.", personality: "Hungry and chatty.", background: "A fisherman.", color: "#55cc88" };
    if (/user's own group of characters/.test(s)) return { adds: [{ name: "Kit", text: "Kit grins. \"Count me in.\"" }] };
    if (/could become its own bot/.test(s)) return { found: [{ name: "Mira", kind: "character", about: "The innkeeper." }, { name: "Harbor lore", kind: "lorebook", about: "Places." }] };
    if (/make roleplay bots from something they know/.test(s)) return { franchise: "Super Mario", results: [{ name: "Bowser", kind: "character", about: "King of the Koopas" }, { name: "Mushroom Kingdom", kind: "lorebook", about: "Places and people" }] };
    if (/You write lorebooks/.test(s)) return { name: "Mushroom Kingdom", entries: [{ keys: "toad, toads", text: "Small mushroom people." }, { keys: "castle", text: "Peach's castle." }] };
    if (/Pick the money/.test(s)) return { name: "credits", set: "credits" };
    return card;
  };
  const Q = [];
  const tag = x => `\n[[mood: calm | place: Room | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  const { b, pg, errs, calls } = await open({ width: W, json, stream: () => { const x = Q.shift() || {}; return (x.text || "*The scene goes on.*") + tag(x); } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  const until = (fn, arg, t = 15000) => pg.waitForFunction(fn, arg, { timeout: t }).catch(() => {});
  const sendTxt = async (x, text = "go on") => { Q.push(x); const n = await pg.evaluate(() => S.chat.messages.length); await pg.fill("#input", text); await pg.evaluate(() => send()); await until(k => S.chat.messages.filter(m => m.role === "assistant").length > k && !S.busy, await pg.evaluate(() => S.chat.messages.filter(m => m.role === "assistant").length)); await wait(300); };

  // ---- persona makers
  await pg.evaluate(() => openPersonas()); await wait(300);
  chk("personas screen has the makers", !!await pg.$("#pDesc") && !!await pg.$("#pSurp") && !!await pg.$("#pQuiz") && !!await pg.$("#pGroup"));
  await pg.click("#pDesc"); await wait(200);
  await pg.fill("#pmPrompt", "a chubby otter"); await pg.click("#pmGo");
  await until(() => !!document.getElementById("pgUse")); await wait(200);
  chk("persona review shows the result", /Otto/.test(await pg.textContent("#sheetBody")) && /otter/.test(await pg.textContent("#sheetBody")));
  await pg.click("#pgUse"); await wait(500);
  const otto = await pg.evaluate(() => { const p = S.personas.find(x => x.name === "Otto"); return p && { active: S.personaId === p.id, desc: p.description, color: p.color }; });
  chk("persona saved and in use", otto && otto.active && /otter/.test(otto.desc) && otto.color === "#55cc88");
  // a whole group, surprise style
  await pg.evaluate(() => openPersonaMaker("surprise")); await wait(200);
  await pg.click('#pmKind [data-g="1"]'); await wait(100); await pg.click("#pmGo");
  await until(() => !!document.getElementById("pgSave")); await wait(200);
  chk("group review lists members", /Bram/.test(await pg.textContent("#sheetBody")) && /Kit/.test(await pg.textContent("#sheetBody")));
  await pg.click("#pgUse"); await wait(500);
  const den = await pg.evaluate(() => { const g = S.personas.find(x => x.name === "The Den"); return g && { members: groupMembersP(g).map(m => m.name), active: S.personaId === g.id }; });
  chk("group persona saved with its members", den && den.members.join() === "Bram,Kit" && den.active);
  // the persona quiz: body and personality only
  const qn = await pg.evaluate(() => { QUIZ.a = qzNew("persona"); QUIZ.i = 0; const st = qzSteps(QUIZ.a); qzDraw(); return st.map(x => x.q.id); });
  await wait(200);
  chk("persona quiz asks only persona questions (" + qn.length + ")", qn.includes("name") && qn.includes("traits") && !qn.includes("kinks") && !qn.includes("setting"));
  chk("persona quiz title", /Persona quiz/.test(await pg.textContent("#sheetTitle").catch(() => "")) || /Persona quiz/.test(await pg.evaluate(() => document.querySelector("#sheet h2, #sheet .sheet-title, #sheetHead")?.textContent || "")));
  await pg.evaluate(async () => { QUIZ.a.q.name = { pick: [], other: "Pip", decide: false, num: "" }; await qzMake(QUIZ.a); }); await until(() => !!document.getElementById("pgUse")); await wait(200);
  chk("quiz → persona review", !!await pg.$("#pgUse"));
  await pg.click("#pgSave"); await wait(400);
  // hand-made group persona editor
  await pg.evaluate(() => editPersona({ id: uid(), name: "", description: "", members: [] }, true)); await wait(200);
  chk("group editor lists personas to tick", (await pg.$$("#peMem [data-id]")).length >= 2);
  await pg.fill("#peName", "Duo"); await pg.fill("#peNewN", "Zed"); await pg.click("#peNewAdd"); await wait(100);
  await pg.click("#peSave"); await wait(400);
  chk("hand-made group saved with the new member", await pg.evaluate(() => { const g = S.personas.find(x => x.name === "Duo"); return !!g && groupMembersP(g).some(m => m.name === "Zed"); }));

  // ---- group persona in chat
  await pg.evaluate(async () => { closeSheet(); S.personaId = S.personas.find(x => x.name === "The Den").id; await savePersonas(); await openChat(S.chars[0].id); }); await wait(600);
  chk("speak-as chips show", await pg.evaluate(() => !$("asBar").hidden && $("asBar").querySelectorAll("[data-id]").length === 3));
  await pg.click('#asBar [data-id]:nth-of-type(2)'); await wait(150);
  await sendTxt({}, "*I wave.*");
  const asMember = await pg.evaluate(() => { const u = S.chat.messages.filter(m => m.role === "user").at(-1); return { sp: u.speaker }; });
  let sys = JSON.stringify(calls.filter(c => c.stream).at(-1).messages);
  chk("message sent as Bram", asMember.sp === "Bram" && /\*\*Bram:\*\*/.test(sys) && /the user's group of characters/.test(sys));
  await pg.click('#asBar [data-id="all"]'); await wait(150);
  await sendTxt({}, "*We all walk in.*");
  const adds = await pg.evaluate(() => S.chat.messages.filter(m => m.groupAdd).map(m => m.content));
  chk("Everyone: the members' additions come first as your message", adds.length === 1 && /\*\*Kit:\*\*/.test(adds[0]) && /\*Kit grins\.\*/.test(adds[0]));
  chk("the label says together", /The Den · together/.test(await pg.textContent("#msgs")));

  // ---- spin-off from a message
  const nBots = await pg.evaluate(() => S.chars.length);
  await pg.evaluate(async () => { const o = S.chars[0]; o.lore = [{ keys: "harbor", text: "A foggy harbor." }]; o.tags = ["seaside"]; await saveChars(); S.chat.messages.push({ id: uid(), role: "assistant", content: "*Mira the innkeeper waves from the bar.*" }); await saveChat(); renderMsgs(true); spinPick(S.chat.messages.length - 1); });
  await until(() => document.querySelectorAll("#sheetBody [data-i]").length >= 2); await wait(200);
  chk("spin-off lists people", /Mira/.test(await pg.textContent("#sheetBody")) && /Harbor lore/.test(await pg.textContent("#sheetBody")));
  await pg.click('#sheetBody [data-i="0"]'); await until(() => !!document.getElementById("gMake")); await wait(200);
  await pg.click("#gMake"); await until(k => S.chars.length > k, nBots, 30000); await wait(500);
  const sp = await pg.evaluate(() => { const w = S.chars.find(c => c.spunFrom); return w && { lore: w.lore.map(l => l.keys).join(), tags: w.tags.join() }; });
  chk("spin-off keeps the original's lore and tags", sp && /harbor/.test(sp.lore) && /seaside/.test(sp.tags));
  await pg.evaluate(() => closeSheet()); await wait(200);
  chk("message menu has the spin-off", await pg.evaluate(() => { S.openActs = S.chat.messages.at(-1).id; renderMsgs(true); return !!document.querySelector('#msgs [data-act="spin"]'); }));
  await pg.evaluate(() => { S.openActs = null; renderMsgs(true); });

  // ---- choices mode
  await pg.evaluate(async () => { const c = S.chars.find(x => !x.spunFrom && x.kind !== "group"); c.choices = true; await saveChars(); S.personaId = S.personas.find(x => x.name === "Otto").id; await savePersonas(); await openChat(c.id); }); await wait(600);
  await sendTxt({ text: '*She smiles.* "Well?"\n[[choices: *I bow.* ;; *I grab the key.* [risky] ;; "Hello."]]' });
  const ch = await pg.evaluate(() => ({ list: S.chat.messages.at(-1).choices, content: S.chat.messages.at(-1).content, choosing: $("chat").classList.contains("choosing"), shown: document.querySelectorAll("#choiceBar .choice").length }));
  chk("choices read from the reply and kept out of the text", ch.list?.length === 3 && ch.list[1].risky && !/choices/.test(ch.content));
  chk("choices shown, message box hidden", ch.shown === 3 && ch.choosing);
  sys = JSON.stringify(calls.filter(c => c.stream).at(-1).messages);
  chk("prompt asks for choices", /# Choices/.test(sys));
  await pg.click("#chOwn"); await wait(100);
  chk("write my own shows the box", await pg.evaluate(() => !$("chat").classList.contains("choosing")));
  Q.push({}); await pg.evaluate(() => { const r = window.crypto.getRandomValues.bind(window.crypto); window.crypto.getRandomValues = a => { a[0] = Math.floor(0.03 * 4294967296); return a; }; });
  await pg.click('#choiceBar .choice[data-i="1"]');
  await until(() => S.chat.messages.filter(m => m.role === "user").at(-1)?.choice && !S.busy && !S.rolling); await wait(500);
  const pickd = await pg.evaluate(() => S.chat.messages.filter(m => m.role === "user").at(-1));
  sys = JSON.stringify(calls.filter(c => c.stream).at(-1).messages);
  chk("risky choice rolled and sent (" + pickd.choice?.n + ")", pickd.content === "*I grab the key.*" && pickd.choice?.risky && pickd.choice.n >= 1 && /rolled \d+ on a d20/.test(sys));

  // ---- currency
  await until(() => !S.busy && !S.rolling && S.chat.messages.at(-1)?.role === "assistant"); await wait(300);
  await pg.evaluate(async () => { const c = char(); c.rpg = { on: true, gold: 50, items: "", quests: "", cur: { name: "credits", set: "credits" } }; await saveChars(); renderRpg(); });
  await wait(200);
  chk("RPG bar uses the credits icon", await pg.evaluate(() => /4fd1e8/.test($("rpgbar").innerHTML) && /Credits/.test($("rpgbar").innerHTML)));
  await sendTxt({});
  sys = JSON.stringify(calls.filter(c => c.stream).at(-1).messages);
  chk("prompt names the currency", /called credits/.test(sys) && /Credits: 50/.test(sys));
  await pg.evaluate(() => editChar(char(), false)); await wait(400);
  chk("editor: choices switch and every icon for money and bag (" + (await pg.$$("#cCoinIcons .cur-ic")).length + ")", !!await pg.$("#cChoices") && (await pg.$$("#cCoinIcons .cur-ic")).length === 18 && (await pg.$$("#cBagIcons .cur-ic")).length === 18);
  await pg.click('#cCoinIcons [data-k="bones:coin"]'); await pg.click('#cBagIcons [data-k="credits:coin"]');
  await pg.evaluate(() => { const i = document.getElementById("cCoinCol"); i.value = "#ff3366"; i.dispatchEvent(new Event("input")); });
  chk("the picked colour tints the icons", await pg.evaluate(() => /hsl\(/.test(document.querySelector('#cCoinIcons [data-k="bones:coin"]').innerHTML)));
  await pg.fill("#cCurName", "bones"); await pg.click("#cSave"); await wait(600);
  chk("currency icons and colour saved", await pg.evaluate(() => { const c = S.chars.find(x => x.rpg?.cur?.coin === "bones:coin"); return !!c && c.rpg.cur.bag === "credits:coin" && c.rpg.cur.coinCol === "#ff3366" && c.rpg.cur.name === "bones"; }));
  chk("credits coin has no C", await pg.evaluate(() => !/M12 8\.3a2\.6/.test(CUR_SETS.credits.coin)));
  await pg.evaluate(async () => { const c = char() || S.chars[0]; c.rpg.cur = null; const r = await pickCurrency(c); window.__cur = r; });
  chk("the AI picks a currency", await pg.evaluate(() => window.__cur?.name === "credits" && window.__cur.set === "credits"));

  // ---- search to make
  await pg.evaluate(() => { leaveChat(); }); await wait(300);
  await pg.fill("#search", "Zzyzx"); await wait(300);
  chk("Home offers to make a bot of the search", !!await pg.$("#mkSearch"));
  await pg.fill("#search", ""); await wait(100);
  await pg.evaluate(() => openSearchMake("Mario")); await until(() => document.querySelectorAll("#smList [data-i]").length >= 2); await wait(100);
  chk("search lists results", /Bowser/.test(await pg.textContent("#smList")) && /Mushroom Kingdom/.test(await pg.textContent("#smList")));
  await pg.click('#smList [data-i="0"]'); await wait(200);
  await pg.click('#smAcc [data-a="changes"]'); await wait(100);
  await pg.click("#smMake"); await wait(100);
  chk("changes need text", /Write the changes/.test(await pg.textContent("#smMsg2")));
  await pg.fill("#smCh", "make him a dragon"); await pg.click("#smMake");
  await until(() => !!document.getElementById("gMake")); await wait(200);
  const gp = await pg.evaluate(() => GEN.prompt);
  chk("search → generator review with the changes", /Bowser from Super Mario/.test(gp) && /make him a dragon/.test(gp));
  await pg.evaluate(() => openSearchMake("Mario")); await until(() => document.querySelectorAll("#smList [data-i]").length >= 2); await wait(100);
  await pg.click('#smList [data-i="1"]'); await wait(200); await pg.click("#smMake");
  await until(() => !!document.getElementById("bkSave")); await wait(200);
  chk("lorebook result opens the lorebook editor", !!await pg.$("#bkSave") && /Mushroom Kingdom/.test(await pg.inputValue("#bkName")));
  await pg.click("#bkSave"); await wait(400);
  chk("lorebook saved", await pg.evaluate(() => S.books.some(b => b.name === "Mushroom Kingdom" && b.entries.length === 2)));
  // create sheet has the search button
  await pg.evaluate(() => closeSheet()); await pg.click(W > 1000 ? "#railNew" : "#btnNewChar"); await wait(250);
  chk("Create sheet: Search a character", !!await pg.$("#genSearch"));

  chk("no page errors " + errs.join(" | "), errs.length === 0);
  await b.close();
})();
