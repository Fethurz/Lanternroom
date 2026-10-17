const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W });
  const chk = (n, v) => console.log((v ? "PASS " : "FAIL ") + n);
  await pg.evaluate(async () => { S.chars[0].tags = ["werewolf", "female", "grumpy"]; await saveChars(); renderHome(); });
  await pg.click(W > 1000 ? "#railTags" : "#btnTags"); await pg.waitForTimeout(300);
  chk("tags screen lists bot tag", !!await pg.$('.tg-row[data-t="werewolf"]'));
  chk("built-in shown", !!await pg.$('.tg-row[data-t="dragon"]'));
  await pg.screenshot({ path: `/tmp/claude-0/s/tags_${W}.png` });
  // new group + new tag in it
  await pg.click("#tgNewG"); await pg.fill("#tgGName", "Body types"); await pg.click("#tgGOk"); await pg.waitForTimeout(200);
  await pg.click("#tgNew"); await pg.fill("#teName", "Chubby"); await pg.fill("#teNote", "soft and round all over");
  await pg.click('#teGroup [data-g="Body types"]'); await pg.click('#teIcons [data-i="hearts"]'); await pg.click('#teCols [data-c="#ff8fb1"]');
  await pg.screenshot({ path: `/tmp/claude-0/s/tagedit_${W}.png` });
  await pg.click("#teSave"); await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => ({ my: S.settings.myTags, meta: S.settings.tagMeta, note: S.settings.tagNotes.chubby, groups: S.settings.tagGroups }));
  chk("new tag saved " + JSON.stringify(st), st.my.includes("chubby") && st.meta.chubby.g === "Body types" && st.meta.chubby.icon === "hearts" && st.note === "soft and round all over");
  // rename werewolf -> lycan with a note
  await pg.click('.tg-row[data-t="werewolf"]'); await pg.fill("#teName", "lycan"); await pg.fill("#teNote", "big and hairy"); await pg.click("#teSave"); await pg.waitForTimeout(300);
  chk("rename updates bot", await pg.evaluate(() => S.chars[0].tags.includes("lycan") && !S.chars[0].tags.includes("werewolf") && S.settings.tagNotes.lycan === "big and hairy"));
  // built-in: name disabled, hide works
  await pg.click('.tg-row[data-t="dragon"]'); chk("built-in name locked", await pg.$eval("#teName", e => e.disabled)); await pg.check("#teHide"); await pg.click("#teSave"); await pg.waitForTimeout(300);
  // merge grumpy into lycan
  await pg.click('.tg-row[data-t="grumpy"]'); await pg.click("details.gen-sec summary"); await pg.selectOption("#teInto", "lycan"); await pg.click("#teMerge"); await pg.waitForTimeout(300);
  chk("merge", await pg.evaluate(() => JSON.stringify(S.chars[0].tags) === JSON.stringify(["lycan", "female"])));
  // surprise me sections
  await pg.evaluate(() => { closeSheet(); openSurprise(); }); await pg.waitForTimeout(300);
  const labels = await pg.$$eval("#sheetBody .lbl", l => l.map(x => x.textContent));
  chk("surprise groups " + labels.join("|"), labels.includes("Body types") && labels.includes("Your tags"));
  chk("hidden dragon not offered", !await pg.$('#sheetBody [data-t="dragon"]'));
  chk("chubby in surprise", !!await pg.$('#sheetBody [data-t="chubby"]'));
  // delete chubby
  await pg.evaluate(() => editTag("chubby")); await pg.click("details.gen-sec summary"); await pg.click("#teDel"); await pg.click("#teDel"); await pg.waitForTimeout(300);
  chk("deleted", await pg.evaluate(() => !(S.settings.myTags || []).includes("chubby") && !S.settings.tagMeta.chubby));
  await pg.evaluate(() => { closeSheet(); renderHome(); }); await pg.waitForTimeout(300);
  await pg.screenshot({ path: `/tmp/claude-0/s/home_${W}.png` });
  console.log("ERRORS:", errs.length ? errs.join("\n") : "none"); await b.close();
})();
