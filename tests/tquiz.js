const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const card = { name: "Vex", summary: "A hungry dragoness.", tags: ["dragon", "vore"], appearance: "Huge.", description: "Smug.", scenario: "Cave.", firstMessages: ["Hello, snack."], instructions: "", lore: [], startPlace: "Cave", artType: "feral", members: [{ name: "A", appearance: "x", description: "y", artType: "anthro" }, { name: "B", appearance: "x", description: "y", artType: "human" }] };
  const { b, pg, errs, calls } = await open({ width: W, json: () => card });
  const chk = (n, v) => console.log((v ? "PASS " : "FAIL ") + n);
  await pg.evaluate(async () => { S.settings.tagNotes = { "oral vore": "slow and teasing, lots of belly talk" }; S.settings.myTags = ["belly worship"]; S.settings.tagMeta = { "belly worship": { g: "Kinks" } }; await saveSettings(); });
  await pg.click(W > 1000 ? "#railNew" : "#btnNewChar"); await pg.waitForTimeout(250);
  await pg.click("#genQuiz"); await pg.waitForTimeout(300);
  await pg.click('#sheetBody [data-k="character"]'); await pg.waitForTimeout(200);
  const q = async () => (await pg.textContent(".qz-q")).trim();
  chk("first question name: " + await q(), (await q()).startsWith("What's their name"));
  await pg.fill("#qzOther", "Vex"); await pg.click("#qzNext"); await pg.waitForTimeout(150);
  await pg.click('[data-o="female"]'); await pg.waitForTimeout(400); // auto-advance
  chk("auto advance to pronouns: " + await q(), /Pronouns/.test(await q()));
  await pg.click("#qzSkip"); await pg.waitForTimeout(150);
  await pg.click('[data-o="feral (animal or creature)"]'); await pg.waitForTimeout(400);
  chk("species shown for feral: " + await q(), /Species/.test(await q()));
  await pg.click('[data-o="dragon"]'); await pg.click('[data-o="snake / naga"]'); await pg.click("#qzNext"); await pg.waitForTimeout(150);
  chk("age question", /old/.test(await q()));
  await pg.fill("#qzNum", "16"); await pg.click("#qzNext"); await pg.waitForTimeout(150);
  chk("under 18 refused", /18/.test(await pg.textContent("#qzMsg")));
  await pg.fill("#qzNum", "340"); await pg.click("#qzNext"); await pg.waitForTimeout(150);
  await pg.screenshot({ path: `/tmp/claude-0/s/quiz_q_${W}.png` });
  // close mid-way: draft kept
  await pg.evaluate(() => userClose()); await pg.waitForTimeout(150); chk("close asks", !!await pg.$("#scClose")); await pg.click("#scClose"); await pg.waitForTimeout(700); chk("closing the quiz steps back to the window it came from", await pg.evaluate(() => !$("sheet").hidden)); await pg.evaluate(() => closeSheet());
  const dr = await pg.evaluate(async () => (await drafts()).quiz);
  chk("draft saved at question " + (dr && dr.i), dr && dr.i === 6 && dr.a.q.species.pick.length === 2);
  await pg.evaluate(() => { QUIZ.a = null; });
  await pg.click(W > 1000 ? "#railNew" : "#btnNewChar"); await pg.waitForTimeout(250);
  chk("draft listed", /Quiz · Character/.test(await pg.textContent("#sheetBody")));
  await pg.click(".draft-row [data-go]"); await pg.waitForTimeout(200);
  chk("continues at height: " + await q(), /tall/.test(await q()));
  // skip through the rest with "You decide", but pick a kink on the way
  for (let i = 0; i < 60; i++) {
    if (!await pg.$(".qz-q")) break;
    const t = await q();
    if (/Kinks/.test(t)) { chk("owner tag offered in kinks", !!await pg.$('[data-o="belly worship"]')); await pg.click('[data-o="oral vore"]'); await pg.click('[data-o="belly worship"]'); await pg.click("#qzNext"); }
    else await pg.click("#qzSkip");
    await pg.waitForTimeout(120);
  }
  chk("review screen", !!await pg.$("#qzMake"));
  await pg.screenshot({ path: `/tmp/claude-0/s/quiz_review_${W}.png`, fullPage: false });
  // edit one answer from the review
  await pg.click('.qz-row:has-text("Gender")'); await pg.waitForTimeout(150); chk("jump back to gender", /Gender/.test(await q()));
  await pg.click('[data-o="futa / herm"]'); await pg.waitForTimeout(400);
  const steps = await pg.evaluate(() => qzSteps(QUIZ.a).length); await pg.evaluate(n => { QUIZ.i = n; qzDraw(); }, steps);
  await pg.fill("#qzPName", "my usual dragon"); await pg.click("#qzPSave"); await pg.waitForTimeout(200);
  await pg.click("#qzMake"); await pg.waitForTimeout(1500);
  const gen = calls.find(c => /character quiz/.test(JSON.stringify(c.messages)));
  const up = gen ? gen.messages.at(-1).content : "";
  chk("prompt has answers", /Vex/.test(up) && /futa \/ herm/.test(up) && /340 years old/.test(up) && /dragon, snake/.test(up) && /oral vore, belly worship/.test(up));
  chk("prompt has tag note", /slow and teasing/.test(up));
  chk("you decide passed", /you decide/.test(up));
  chk("review opened", !!await pg.$("#gMake"));
  chk("re-roll button", /same answers/.test(await pg.textContent("#gMore")));
  await pg.click("#gMore"); await pg.click("#gMore"); await pg.waitForTimeout(1500);
  chk("re-rolled", calls.filter(c => /character quiz/.test(JSON.stringify(c.messages))).length === 2 && !!await pg.$("#gMake"));
  chk("draft cleared", await pg.evaluate(async () => !(await drafts()).quiz));
  // preset + last answers on the start screen
  await pg.evaluate(() => { closeSheet(); openQuiz("new"); }); await pg.waitForTimeout(400);
  chk("last answers + preset listed", !!await pg.$("#qzLast") && /my usual dragon/.test(await pg.textContent("#sheetBody")));
  await pg.click('.listrow [data-use]'); await pg.waitForTimeout(200); chk("preset opens review", !!await pg.$("#qzMake"));
  // group quiz: 2 members → member questions twice
  await pg.evaluate(() => { QUIZ.a = qzNew("group"); QUIZ.a.q.count = { pick: ["2"] }; });
  const g = await pg.evaluate(() => { const s = qzSteps(QUIZ.a); return { n: s.length, members: [...new Set(s.filter(x => x.mi != null).map(x => x.mi))] }; });
  chk("group asks for 2 members " + JSON.stringify(g), g.members.length === 2);
  const w = await pg.evaluate(() => qzSteps(qzNew("world")).map(s => s.q.id));
  chk("world questions " + w.join(","), w.includes("tone") && !w.includes("chest"));
  console.log("ERRORS:", errs.length ? errs.join("\n") : "none"); await b.close();
})();
