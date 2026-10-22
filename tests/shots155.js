// screenshots of the v1.55 screens (not a test): SHOTS=folder W=390 node shots155.js
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390), OUT = process.env.SHOTS || ".";
  const { b, pg } = await open({ width: W, stream: () => '*She smiles and leans on the bar.* "Well? What will it be?"\n[[choices: *I order the strongest drink.* ;; *I slip a coin off the counter.* [risky] ;; "Just water, thanks." ;; *I lean in close.* "You."]]\n[[mood: calm | place: Inn | ambience: tavern | activity: none | harm: none | hearing: outside]]' });
  await pg.evaluate(async () => {
    const a = { id: uid(), name: "Bram", description: "A big bear.", color: "#ffaa33" }, k = { id: uid(), name: "Kit", description: "A small fox.", color: "#33aaff" };
    const g = { id: uid(), name: "The Den", description: "", color: "#ffaa33", members: [a.id, k.id] };
    S.personas.push(a, k, g); S.personaId = g.id; await savePersonas();
    const c = S.chars[0]; c.choices = true; c.rpg = { on: true, gold: 120, items: "2 Health potion", quests: "", cur: { name: "glimmer", set: "shards", coin: "bones:coin", bag: "gems:bag", coinCol: "#ff4f8b" } }; await saveChars();
    await openChat(c.id);
  });
  await pg.waitForTimeout(500);
  await pg.fill("#input", "*We walk in together.*"); await pg.evaluate(() => send());
  await pg.waitForFunction(() => !S.busy && S.chat.messages.at(-1).role === "assistant", null, { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(700);
  await pg.screenshot({ path: `${OUT}/chat_${W}.png` });
  await pg.evaluate(() => openPersonas()); await pg.waitForTimeout(400);
  await pg.screenshot({ path: `${OUT}/personas_${W}.png` });
  await pg.evaluate(() => editChar(char(), false)); await pg.waitForTimeout(500);
  await pg.evaluate(() => document.getElementById("cRpg").scrollIntoView()); await pg.waitForTimeout(200);
  await pg.screenshot({ path: `${OUT}/editor_rpg_${W}.png` });
  await b.close();
})();
