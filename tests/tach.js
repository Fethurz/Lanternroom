const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const Q = [];
  const tag = x => `\n[[mood: happy | place: ${x.place || "Cave"} | ambience: ${x.amb || "cave"} | activity: ${x.act || "none"} | harm: ${x.harm || "none"} | hearing: ${x.hear || "outside"} | badges: ${x.badges || "none"}${x.award ? " | award: " + x.award : ""}]]`;
  const { b, pg, errs, calls } = await open({ width: W, stream: () => { const x = Q.shift() || {}; return (x.text || "The scene goes on.") + tag(x); } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const send = async (x, text = "go on") => { Q.push(x); const n = await pg.evaluate(() => S.chat.messages.length); await pg.fill("#input", text); await pg.evaluate(() => send()); await pg.waitForFunction(k => S.chat.messages.length >= k + 2 && !S.busy, n, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(300); };
  await pg.evaluate(async () => { const c = S.chars[0]; c.badges = [{ id: "b1", name: "Lighthouse Snack", how: "Get eaten at the top of the lighthouse" }]; await saveChars(); await openChat(c.id); });
  await pg.waitForTimeout(600);
  await send({ text: "Wren grins and gulps you down whole.", badges: "first_pred, feet, made_up_key", award: "Lighthouse Legend - you climbed it in a storm", act: "vore" });
  let st = await pg.evaluate(() => ({ got: Object.keys(ACHS.got), bot: Object.keys(ACHS.bots[S.charId] || {}), custom: ACHS.custom.map(c => c.name) }));
  chk("story badges granted " + st.got.join(","), st.got.includes("first_pred") && st.got.includes("feet") && !st.got.includes("made_up_key"));
  chk("on the bot's shelf", st.bot.includes("first_pred"));
  chk("one-off award " + st.custom.join(","), st.custom.includes("Lighthouse Legend"));
  chk("toast shown", !!await pg.$(".ach-toast"));
  await pg.waitForTimeout(400); await pg.screenshot({ path: `/tmp/claude-0/s/ach_toast_${W}.png` });
  const sys = JSON.stringify(calls.filter(c => c.stream).at(-1).messages);
  chk("prompt lists badges + bot badge + award", /# Achievements/.test(sys) && /bot:b1/.test(sys) && /badges: keys or none/.test(sys) && /award: none or Title/.test(sys));
  // second award too soon → refused; earned badges leave the list
  await send({ award: "Second Award - too soon", hear: "inside", act: "vore", badges: "bot:b1" });
  st = await pg.evaluate(() => ({ custom: ACHS.custom.length, got: Object.keys(ACHS.got), bot: Object.keys(ACHS.bots[S.charId] || {}), meals: ACHS.n.meals }));
  chk("award cooldown", st.custom === 1);
  chk("bot's own badge", st.bot.includes("bot:b1"));
  chk("swallow spotted by hearing inside", st.got.includes("first_swallow") && Object.values(st.meals || {})[0] === 1);
  const sys2 = JSON.stringify(calls.filter(c => c.stream).at(-1).messages);
  chk("earned ones dropped from prompt; award offer gone", !/first_pred: Swallow/.test(sys2) && !/award: none or Title/.test(sys2));
  // app badges from the scene
  await send({ act: "inflate", amb: "storm", harm: "heavy", place: "Tower" });
  st = await pg.evaluate(() => Object.keys(ACHS.got));
  chk("app badges: pumped, storm, scratch", ["pumped", "storm_chaser", "scratch"].every(k => st.includes(k)));
  // dice
  await pg.evaluate(async () => { S.chat.dice = true; S.chat.pendingRoll = { n: 20 }; await saveChat(); });
  await send({});
  chk("nat 20", await pg.evaluate(() => !!ACHS.got.nat20));
  // tapping a sound word
  await send({ text: "She lets out a [sfx=fart]***Brrrrt***[/sfx]." });
  const sp = await pg.$(".sfx-k"); if (sp) { await sp.click(); await pg.waitForTimeout(300); }
  chk("tap → Toot", await pg.evaluate(() => !!ACHS.got.toot && ACHS.n.taps >= 1));
  // trophy page + profile shelf + editor
  await pg.evaluate(() => { leaveChat(); }); await pg.waitForTimeout(300);
  await pg.click(W > 1000 ? "#railTrophy" : "#btnTrophy"); await pg.waitForTimeout(300);
  const t = await pg.textContent("#sheetBody");
  chk("trophy page totals + secret hint", /\/\s*\d+/.test(t) && /\?\?\?/.test(t));
  await pg.screenshot({ path: `/tmp/claude-0/s/ach_trophy_${W}.png` });
  await pg.click('.ach-tabs [data-t="one"]'); chk("one-offs tab", /Lighthouse Legend/.test(await pg.textContent("#sheetBody")));
  await pg.evaluate(() => openProfile(S.chars[0].id)); await pg.waitForTimeout(400);
  chk("profile shelf", /Badges · \d+/.test(await pg.textContent("#sheetBody")) && !!await pg.$("#pfBadges"));
  await pg.click("#pfBadges"); await pg.waitForTimeout(200); chk("bot tab shows its badges", /Lighthouse Snack/.test(await pg.textContent("#sheetBody")));
  await pg.evaluate(() => editChar(S.chars[0], false)); await pg.waitForTimeout(400);
  chk("editor badges section", !!await pg.$("#cBadges .bdg-row") && !!await pg.$("#cBadgeAI"));
  await pg.click("#cBadgeAdd"); await pg.fill(".bdg-row:nth-of-type(2) .bdg-n", "Storm Rider"); await pg.check("#cBadgeAI"); await pg.click("#cSave"); await pg.waitForTimeout(800);
  chk("editor saves badges + switch", await pg.evaluate(() => S.chars[0].badges.length === 2 && S.chars[0].badges[1].name === "Storm Rider" && S.chars[0].badgeAI === true));
  // generator card badges are kept
  chk("generator keeps badges", await pg.evaluate(() => genNormalize({ name: "X", badges: [{ name: "A", how: "b" }] }, "character", "auto").badges[0].name === "A"));
  // merge across devices
  chk("merge keeps both", await pg.evaluate(() => { const m = achMerge({ got: { a: { at: 5 } }, n: { taps: 3, ambs: ["x"] } }, { got: { b: { at: 2 }, a: { at: 9 } }, n: { taps: 7, ambs: ["y"] } }); return m.got.a.at === 5 && m.got.b && m.n.taps === 7 && m.n.ambs.length === 2; }));
  // switch off → no prompt section
  await pg.evaluate(async () => { S.settings.achOn = false; await saveSettings(); await openChat(S.chars[0].id); }); await pg.waitForTimeout(400);
  await send({});
  chk("off: no achievements in prompt", !/# Achievements/.test(JSON.stringify(calls.filter(c => c.stream).at(-1).messages)));
  chk("persisted", await pg.evaluate(async () => !!(await Store.get("ach")).got.first_pred));
  console.log("ERRORS:", errs.length ? errs.join("\n") : "none"); await b.close();
})();
