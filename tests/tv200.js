// v2.0: the owner's five bots get hand-written stories (added once, never re-added after removal), Warcraft's era picker,
// vore on by default where the preset says, and scenes that read the bot's own lore live (relevant entries in full, the
// rest as one-line gists, chat-format rules left out).
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || "");
  const seen = [];
  const tag = "\n[[mood: calm | place: Gate | ambience: indoors | activity: none | hearing: outside]]";
  const stream = body => { seen.push(sysOf(body)); return `**Chapter 1**\n\nThe gate yawns open.\n[[story: ${JSON.stringify({ choices: [{ t: "Go in.", leans: [{ side: "Brave", amt: 1 }] }, { t: "Wait.", leans: [{ side: "Cautious", amt: 1 }] }] })}]]${tag}`; };
  const { b, pg, errs } = await open({ width: W, stream });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.0 or later", await pg.evaluate(() => VERSION.startsWith("2.") || +VERSION.split(".")[0] >= 2));

  // ---------- presets land on the owner's bots (made-up stand-ins with the same ids)
  const ap = await pg.evaluate(async () => {
    const mk = (id, name, extra = {}) => ({ ...blankChar(extra.kind || "character"), id, name, ...extra });
    S.chars.push(
      mk("00dvpan7mv5j9o0f", "Vez'nan's Dark Castle", { kind: "world", description: "Page:\n\nNEVER speak or act for {{user}}. Responses should always be between 3-4 paragraphs.",
        cast: [{ name: "The Dark Castle", type: "location", details: "A massive black fortress." }, { name: "Castle Interior and Defenses", type: "location", details: "A lava moat and an iron bridge." }, { name: "Minions", type: "group", details: "Countless minions." },
          { name: "Jural", type: "character", details: "Jural is a 12ft obsidian golem who tends the garden." }, { name: "Freyja", type: "character", details: "Freyja is a giant black scorpion with purple sleep venom." },
          { name: "Choosing minions", type: "concept", details: "Choose RANDOM minions." }] }),
      mk("kepw8su1mvrxpypk", "Warcraft", { description: "Azeroth.\n\nNEVER speak or act for {{user}}." }),
      mk("cjozp2phmvrxz0w1", "Prodigies", { description: "Summary: superheroes.\n\n**Vereza Emberthal (Syndicate)**: Emberthal leads the Syndicate.\n\n**Allie Strongarm (Renegade)**: Strongarm grows to 27ft.\n\n**Kaiju (Syndicate)**: Ju becomes a 42ft kaiju.\n\n**Symbress (Renegade)**: a lizard woman.\n\n**Figurine (Renegade)**: shrinks." }));
    await saveChars(); await applyStoryPresets();
    const v = byId("00dvpan7mv5j9o0f"), w = byId("kepw8su1mvrxpypk");
    const r = { vez: v.storyDef?.title, wow: !!w.storyDef?.eras, n: Object.keys(S.settings.storyPresets || {}).length };
    delete byId("cjozp2phmvrxz0w1").storyDef; await saveChars(); await applyStoryPresets(); r.stays = !byId("cjozp2phmvrxz0w1").storyDef;
    r.shelf = allPacks().map(p => p.title);
    return r;
  });
  chk(`the hand-written stories are added to those bots (${ap.vez}; ${ap.n} recorded)`, ap.vez === "Vez'nan's Dark Castle" && ap.wow && ap.n === 3);
  chk("a story you removed is never added back", ap.stays);
  chk(`they're on the Stories shelf (${ap.shelf.join(", ")})`, ap.shelf.includes("Vez'nan's Dark Castle") && ap.shelf.includes("World of Warcraft") && !ap.shelf.includes("Prodigies"));

  // ---------- Warcraft's eras
  const wow = await pg.evaluate(async () => {
    await openStories(); await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-pk="bot:kepw8su1mvrxpypk"]').click(); await new Promise(r => setTimeout(r, 200));
    const eras = [...document.querySelectorAll('[data-k="era"]')].map(x => x.textContent);
    document.querySelector('[data-k="era"][data-v="wrath"]').click(); await new Promise(r => setTimeout(r, 100));
    const vore = $("stVore").checked;
    $("stGo").click(); for (let i = 0; i < 200 && (!S.chat?.story || S.busy || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50));
    return { eras, vore, title: S.chat.story.title, ch: S.chat.story.chapters.map(c => c.t), setting: S.chat.story.setting, bot: S.charId };
  });
  chk(`Warcraft offers its eras (${wow.eras.join(", ")})`, wow.eras.length === 4 && wow.eras.includes("Wrath of the Lich King") && wow.eras.includes("The War Within"));
  chk(`the picked era's chapters and setting (${wow.title}: ${wow.ch[0]} … ${wow.ch.at(-1)})`, wow.title === "World of Warcraft: Wrath of the Lich King" && wow.ch[0] === "Landfall" && wow.ch.at(-1) === "The Frozen Throne" && /Frozen Throne in Icecrown/.test(wow.setting) && wow.bot === "kepw8su1mvrxpypk");
  chk("vore stays off by default for Warcraft", !wow.vore);
  const s1 = seen.at(-1) || "";
  chk("the scene prompt carries the bot's lore, without its chat-format rules", /The world's own lore/.test(s1) && /Azeroth\./.test(s1) && !/NEVER speak or act/.test(s1));

  // ---------- Vez'nan's: vore on by default, live lore
  const vez = await pg.evaluate(async () => {
    leaveChat(); await openStories(); await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-pk="bot:00dvpan7mv5j9o0f"]').click(); await new Promise(r => setTimeout(r, 200));
    const vore = $("stVore").checked, roles = document.querySelectorAll("[data-role]").length;
    $("stGo").click(); for (let i = 0; i < 200 && (!S.chat?.story || S.busy || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50));
    const c = byId("00dvpan7mv5j9o0f"), L1 = storyLore(c, S.chat, S.chat.messages.length);
    S.chat.messages.push({ id: uid(), role: "user", content: "I sneak toward Freyja's den." });
    const L2 = storyLore(c, S.chat, S.chat.messages.length); S.chat.messages.pop();
    return { vore, roles, opts: S.chat.story.opts, L1, L2 };
  });
  chk(`Vez'nan's Dark Castle starts with vore on and 4 roles + your own (${vez.roles})`, vez.vore && vez.opts.vore && vez.roles === 5);
  chk("the castle overview and the 'choose random minions' rule are always there", /massive black fortress/.test(vez.L1) && /RANDOM minions/.test(vez.L1) && !/NEVER speak/.test(vez.L1));
  chk("a minion nobody mentions is only a one-line gist", /Freyja \(character\): Freyja is a giant black scorpion/.test(vez.L1) && /Also in this world/.test(vez.L1));
  chk("once the story mentions her, her whole entry comes in", /Freyja \(character\): Freyja is a giant black scorpion with purple sleep venom\.\n/.test(vez.L2 + "\n"));
  // description sections (Prodigies style): faction words alone don't pull every section in
  const sec = await pg.evaluate(() => {
    const c = byId("cjozp2phmvrxz0w1"); const chat = { messages: [{ role: "assistant", content: "Strongarm stomps in as the Renegade crowd cheers." }], story: { pack: "bot", chapters: [{ t: "A", goal: "Renegade evaluations.", scenes: 4 }], pairs: [], meters: [] } };
    return storyLore(c, chat, 1);
  });
  chk("a section whose name is mentioned comes in whole; 'Renegade' alone doesn't pull in the others", /Strongarm grows to 27ft/.test(sec) && !/Figurine \(Renegade\)\*\*: shrinks/.test(sec) && /Figurine \(Renegade\): shrinks/.test(sec));

  // ---------- the editor handles eras
  const ed = await pg.evaluate(async () => {
    leaveChat(); storyDefEdit(byId("kepw8su1mvrxpypk")); await new Promise(r => setTimeout(r, 200));
    const tabs = document.querySelectorAll("[data-era]").length, first = document.querySelector('[data-ch="0"][data-f="t"]').value;
    document.querySelector('[data-era="legion"]').click(); await new Promise(r => setTimeout(r, 100));
    const leg = document.querySelector('[data-ch="0"][data-f="t"]'); leg.value = "The Broken Shore (edited)";
    $("sdSave").click(); await new Promise(r => setTimeout(r, 300));
    return { tabs, first, saved: byId("kepw8su1mvrxpypk").storyDef.eras.legion.chapters[0].t, classic: byId("kepw8su1mvrxpypk").storyDef.eras.classic.chapters.length };
  });
  chk(`the story editor has era tabs and saves each era's chapters (${ed.saved})`, ed.tabs === 4 && ed.first === "Humble Beginnings" && ed.saved === "The Broken Shore (edited)" && ed.classic === 7);
  const sx = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  chk("no sideways scroll", sx);
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
