// v1.52 minigames: offers by the message box, each game plays, its result goes with the next message, badges, switch off
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const Q = [];
  const tag = x => `\n[[mood: happy | place: ${x.place || "Market"} | ambience: ${x.amb || "market"} | activity: ${x.act || "none"} | harm: none | hearing: ${x.hear || "outside"}${x.duel ? " | duel: " + x.duel : ""}]]`;
  const SHOP = { shopkeeper: "Marla", mood: "cheerful", items: [{ name: "Lantern oil", desc: "Burns all night", price: 12 }, { name: "Healing potion", desc: "Mends a wound", price: 40 }, { name: "Silk rope", desc: "Fifty feet", price: 20 }], buys: [{ name: "Old ring", price: 15 }] };
  const { b, pg, errs, calls } = await open({ width: W, stream: () => { const x = Q.shift() || {}; return (x.text || "The scene goes on.") + tag(x); }, json: body => /stock a shop/.test(body.messages[0].content) ? SHOP : { summary: "x", facts: [] } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const send = async (x, text = "go on") => { if (x) Q.push(x); const n = await pg.evaluate(() => S.chat.messages.length); await pg.fill("#input", text); await pg.evaluate(() => send()); await pg.waitForFunction(k => S.chat.messages.length >= k + 2 && !S.busy, n, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(400); await pg.evaluate(() => updateAmbience()); await pg.waitForTimeout(200); };
  const offers = () => pg.evaluate(() => [...document.querySelectorAll("#gameNow .game-offer")].map(b => b.textContent.trim()));
  const lastUser = () => { const m = calls.filter(c => c.stream).at(-1).messages.filter(m => m.role === "user").at(-1); return typeof m.content === "string" ? m.content : m.content[0].text; };
  await pg.evaluate(async () => { const c = S.chars[0]; c.rpg = { on: true, gold: 100, items: "Old ring" }; await saveChars(); await openChat(c.id); });
  await pg.waitForTimeout(600);

  // 1) Struggle: being swallowed offers "Fight going in" with the oral way in
  await send({ text: "Wren tips her head back and swallows you whole; you slide down her throat.", act: "swallow", place: "Cave", amb: "cave" });
  let o = await offers(); chk("swallow offers Fight going in: " + o, o.includes("Fight going in"));
  await pg.click("#gameNow .game-offer"); await pg.waitForTimeout(300);
  chk("way-in title Throat to Gut", (await pg.textContent("#sheetTitle")) === "Throat to Gut");
  await pg.click("#stGo"); for (let i = 0; i < 12; i++) { if (await pg.evaluate(() => /climb/.test($("stCue").textContent))) await pg.click("#stPush"); await pg.waitForTimeout(250); }
  await pg.click("#stGive"); await pg.waitForTimeout(200);
  let pend = await pg.evaluate(() => S.chat.pendingGame); chk("struggle result waits: " + pend?.short, pend?.kind === "struggle");
  chk("surrender badge", await pg.evaluate(() => !!ACHS.got.surrender));
  await pg.evaluate(() => closeSheet()); chk("result chip shows", await pg.evaluate(() => !!document.querySelector("#gameNow .game-res")));
  await send({ text: "Wren pats her belly. Inside, the walls clench around you.", act: "vore", hear: "inside", place: "Cave", amb: "cave" }, "");
  let um = await pg.evaluate(() => S.chat.messages.filter(m => m.role === "user").at(-1));
  chk("empty send carries the result", um.game?.kind === "struggle" && !!um.content);
  chk("prompt has the minigame note", /Minigame result, decided by the app/.test(JSON.stringify(calls.filter(c => c.stream).at(-1).messages)));
  chk("message shows the result line", await pg.evaluate(() => [...document.querySelectorAll(".msg.user")].some(d => d.querySelector(".rub-line"))));
  o = await offers(); chk("inside offers Struggle: " + o, o.includes("Struggle"));
  await pg.click("#gameNow .game-offer"); await pg.waitForTimeout(300);
  chk("inside title", (await pg.textContent("#sheetTitle")) === "Struggle or Submit");
  await pg.evaluate(() => closeSheet());

  // 2) Duel: the bot challenges through the hidden line
  await send({ text: "Wren slaps the table. 'Arm-wrestle me for it.'", duel: "loser buys the drinks", place: "Tavern", amb: "tavern" });
  o = await offers(); chk("duel offered: " + o, o.includes("Duel"));
  chk("prompt explains duels", /# Duels/.test(calls.filter(c => c.stream).at(-1).messages[0].content));
  await pg.click("#gameNow .game-offer >> text=Duel"); await pg.waitForTimeout(300);
  for (let i = 0; i < 8; i++) { if (await pg.evaluate(() => S.chat.pendingGame?.kind === "duel")) break; await pg.click("[data-p=attack]"); await pg.waitForTimeout(1000); }
  pend = await pg.evaluate(() => S.chat.pendingGame); chk("duel result: " + pend?.short, pend?.kind === "duel" && /loser buys the drinks/.test(pend.text));
  await pg.evaluate(() => closeSheet()); await pg.evaluate(() => updateAmbience()); await pg.waitForTimeout(200);
  o = await offers(); chk("duel not offered twice: " + o, !o.includes("Duel"));
  await pg.evaluate(async () => { S.chat.pendingGame = null; await saveChat(); });

  // 3) Chest: RPG bot, a chest in the reply; force the mimic and a bite
  await send({ text: "Behind the altar sits a dusty iron chest.", place: "Crypt", amb: "dungeon" });
  o = await offers(); chk("chest offered: " + o, o.includes("Open a chest"));
  await pg.click("#gameNow .game-offer >> text=Open a chest"); await pg.waitForTimeout(300);
  await pg.evaluate(() => { window.__r = Math.random; window.__g = crypto.getRandomValues; Math.random = () => 0.5; crypto.getRandomValues = x => { x[0] = 0.5 * 4294967296; return x; }; }); // mimic in chest 2, the die rolls 11: bitten
  await pg.evaluate(() => closeSheet()); await pg.click("#gameNow .game-offer >> text=Open a chest"); await pg.waitForTimeout(300);
  await pg.click(".chest[data-i='1']"); await pg.waitForTimeout(2200);
  await pg.evaluate(() => { Math.random = window.__r; crypto.getRandomValues = window.__g; });
  pend = await pg.evaluate(() => S.chat.pendingGame); chk("mimic bites: " + pend?.short, pend?.kind === "chest" && /bitten/.test(pend.short));
  chk("had_teeth badge", await pg.evaluate(() => !!ACHS.got.had_teeth));
  await pg.evaluate(async () => { closeSheet(); S.chat.pendingGame = null; await saveChat(); });

  // 4) Haggle: the AI stocks the shop; a deal changes gold and the bag
  await send({ text: "Marla's market stall is piled with wares.", place: "Market", amb: "market" });
  o = await offers(); chk("haggle offered: " + o, o.includes("Haggle"));
  await pg.click("#gameNow .game-offer >> text=Haggle"); await pg.waitForSelector(".shop-item", { timeout: 8000 });
  chk("shop stocked by the AI", (await pg.evaluate(() => document.querySelectorAll(".shop-item").length)) === 3);
  const gold0 = await pg.evaluate(() => rpgState(char(), S.chat).gold);
  await pg.evaluate(() => { window.__g = crypto.getRandomValues; crypto.getRandomValues = x => { x[0] = 0.99 * 4294967296; return x; }; }); await pg.click("#hgGo"); await pg.waitForTimeout(1600); await pg.evaluate(() => { crypto.getRandomValues = window.__g; }); // the die rolls 20
  const st = await pg.evaluate(() => { const s = rpgState(char(), S.chat); return { gold: s.gold, oil: s.items.get("lantern oil") || 0 }; });
  chk(`bought lantern oil: gold ${gold0} -> ${st.gold}`, st.gold === gold0 - 12 && st.oil === 1);
  await pg.click("#hgSell"); await pg.waitForTimeout(200);
  chk("sell list shows what Marla buys", (await pg.evaluate(() => [...document.querySelectorAll(".shop-item")].map(x => x.textContent).join())).includes("Old ring"));
  await pg.click("#hgDone"); await pg.waitForTimeout(300);
  pend = await pg.evaluate(() => S.chat.pendingGame); chk("haggle result: " + pend?.short, pend?.kind === "haggle" && /Lantern oil/.test(pend.text));

  // 5) Options and the switch
  await pg.click("#btnMore"); await pg.waitForTimeout(200); chk("Options has Start a duel", await pg.evaluate(() => !!$("oDuel")));
  await pg.evaluate(() => closeSheet());
  await pg.evaluate(async () => { S.settings.gamesOn = false; await saveSettings(); S.chat.pendingGame = null; await saveChat(); updateAmbience(); }); await pg.waitForTimeout(300);
  chk("switch off: no offers", (await offers()).length === 0);
  await send({ text: "Another merchant waves you over.", duel: "a bet" });
  chk("switch off: no duel field in prompt", !/duel:/.test(calls.filter(c => c.stream).at(-1).messages[0].content));
  console.log("ERRORS:", errs.length ? errs.join("\n") : "none"); await b.close();
})();
