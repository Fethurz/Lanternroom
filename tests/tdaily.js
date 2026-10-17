const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  let n = 0, fail = false;
  const card = () => ({ name: "Daily " + (++n), summary: "A test daily bot.", tags: ["dragon", "vore"], appearance: "Big.", description: "Smug.", scenario: "Cave.", firstMessages: ["Hi."], instructions: "", lore: [], startPlace: "Cave", artType: "feral" });
  const { b, pg, errs, calls } = await open({ width: W, json: body => { const t = JSON.stringify(body.messages); if (fail && /Today's bot/.test(t)) return "not json at all"; return /Today's bot/.test(t) ? card() : { visual: "x", summary: "x", facts: [] }; } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(async () => { S.chars[0].tags = ["dragon", "vore", "female", "secretive"]; S.settings.tagMeta = { secretive: { hidden: true } }; S.settings.tagNotes = { vore: "always slow and teasing" }; await saveChars(); await saveSettings(); });
  await pg.evaluate(() => dailyMake(true)); await pg.waitForTimeout(800);
  const req = calls.find(c => /Today's bot/.test(JSON.stringify(c.messages)));
  const up = req ? req.messages.at(-1).content : "";
  chk("daily asked with owner's tags", /dragon|vore|female/.test(up) && !/secretive/.test(up));
  chk("tag note included when vore picked", !/\bvore\b/.test(up.split("\n")[0]) || /always slow and teasing/.test(up));
  chk("banner shows", /Today's bot/.test(await pg.textContent("#daily")) && /Daily 1/.test(await pg.textContent("#daily")));
  await pg.waitForTimeout(2500); await pg.screenshot({ path: `/tmp/claude-0/s/daily_${W}.png` });
  // Keep → a bot
  await pg.click("#dlKeep"); await pg.waitForTimeout(1200);
  chk("kept as a bot", await pg.evaluate(() => S.chars.some(c => c.name === "Daily 1" && c.daily)));
  chk("banner gone after keep", !/Daily 1/.test(await pg.textContent("#daily")));
  chk("no second daily same day", await pg.evaluate(async () => { const before = (await Store.get("daily")).card.name; await dailyMake(); return (await Store.get("daily")).card.name === before; }));
  // next day: unkept one moves to the shelf
  await pg.evaluate(async () => { await dailyMake(true); const d = await Store.get("daily"); d.day = "2026-10-16"; d.status = "new"; await Store.set("daily", d); DAILY_CHECK = 0; });
  await pg.evaluate(() => dailyMake()); await pg.waitForTimeout(600);
  const past = await pg.evaluate(async () => (await Store.get("dailyPast")) || []);
  chk("yesterday's daily on the shelf: " + past.map(p => p.card.name).join(","), past.length === 1 && past[0].day === "2026-10-16");
  chk("today's new one shown", /Today's bot/.test(await pg.textContent("#daily")));
  // skip → shelf
  await pg.click("#dlSkip"); await pg.waitForTimeout(400);
  chk("skipped goes to shelf", (await pg.evaluate(async () => (await Store.get("dailyPast")).length)) === 2 && /Past dailies \(2\)/.test(await pg.textContent("#daily")));
  await pg.click("#dlPast"); await pg.waitForTimeout(300);
  chk("past list", (await pg.$$(".dl-card")).length === 2);
  await pg.screenshot({ path: `/tmp/claude-0/s/dailypast_${W}.png` });
  await pg.click(".dl-card [data-chat]"); await pg.waitForTimeout(1500);
  chk("past daily → chat opened", !(await pg.$eval("#chat", e => e.hidden)));
  chk("shelf shrank", (await pg.evaluate(async () => (await Store.get("dailyPast")).length)) === 1);
  await pg.evaluate(() => leaveChat()); await pg.waitForTimeout(300);
  // error path + retry
  fail = true; await pg.evaluate(() => dailyMake(true)); await pg.waitForTimeout(800);
  chk("error shown with retry", !!await pg.$("#dlRetry"));
  fail = false; await pg.click("#dlRetry"); await pg.waitForTimeout(800);
  chk("retry works", !!await pg.$("#dlChat"));
  // switch off
  await pg.evaluate(async () => { S.settings.dailyOn = false; await saveSettings(); drawDaily(); });
  chk("off hides banner", !await pg.$("#dlChat"));
  console.log("ERRORS:", errs.length ? errs.join("\n") : "none"); await b.close();
})();
