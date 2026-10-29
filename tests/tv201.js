// v2.1: ten more built-in stories (Monster Hunter anthro/feral, MiSide, Elden Ring before the Shattering/Nightreign,
// Risk of Rain 2, Beastars university, For Honor, The Elder Scrolls by province, Absolver, Remnant, Dying Light), the
// Direlands bot's story, and tabs in the Stories window.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || "");
  const seen = [];
  const tag = "\n[[mood: calm | place: Camp | ambience: indoors | activity: none | hearing: outside]]";
  const stream = body => { seen.push(sysOf(body)); return `**Chapter 1**\n\nThe camp smells of smoke.\n[[story: ${JSON.stringify({ choices: [{ t: "Wait.", leans: [] }, { t: "Go.", leans: [] }] })}]]${tag}`; };
  const { b, pg, errs } = await open({ width: W, stream });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.1 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 2001));

  const packs = await pg.evaluate(() => {
    const ids = ["monhun", "miside", "eldenring", "ror2", "beastars", "forhonor", "elderscrolls", "absolver", "remnant", "dyinglight"];
    return ids.map(id => { const p = STORY_PACKS[id]; if (!p) return { id, ok: false };
      const lists = p.eras ? Object.values(p.eras).map(e => e.chapters) : [p.chapters];
      return { id, ok: true, eras: p.eras ? Object.keys(p.eras) : [], chOk: lists.every(l => l.length >= 3 && l.every(c => c.t && c.goal && c.scenes >= 3)), roles: (p.roles || []).length, pairs: p.pairs.length, meters: p.meters.length, setting: p.setting + " " + (p.eras ? Object.values(p.eras).map(e => e.setting).join(" ") : "") };
    });
  });
  for (const p of packs) chk(`${p.id}: ready (${p.eras.join("/") || "one route"}, ${p.roles} roles)`, p.ok && p.chOk && p.roles >= 3 && p.pairs === 3 && p.meters >= 2);
  const by = Object.fromEntries(packs.map(p => [p.id, p]));
  chk("Monster Hunter has anthro and feral versions", by.monhun.eras.join() === "anthro,feral" && /anthropomorphic/.test(by.monhun.setting) && /feral beasts/.test(by.monhun.setting));
  chk("Elden Ring: before the Shattering and Nightreign", by.eldenring.eras.join() === "before,nightreign" && /ORIGINAL characters/.test(by.eldenring.setting) && /Wylder, Guardian, Ironeye, Duchess, Raider, Revenant, Recluse and Executor/.test(by.eldenring.setting));
  chk("Elder Scrolls by province", by.elderscrolls.eras.join() === "skyrim,cyrodiil,morrowind");
  chk("Beastars: an original university with an adult original cast, no canon students", /ORIGINAL university/.test(by.beastars.setting) && /all-adult/.test(by.beastars.setting) && !/Juno|Legosi|Haru|Louis/.test(by.beastars.setting));
  chk("MiSide: no childlike Mitas, playful then horror", /no childlike variants/.test(by.miside.setting) && !/Loli/.test(by.miside.setting) && /horror/.test(by.miside.setting));
  chk("Remnant keeps Yaesha and the Empress, otherwise original", /Yaesha/.test(by.remnant.setting) && /Empress/.test(by.remnant.setting) && /ORIGINAL characters/.test(by.remnant.setting));
  chk("Risk of Rain 2 roles: survivor, researcher, security", by.ror2.roles === 3);
  chk("Dying Light is set in a new city", /Vesterhaven/.test(by.dyinglight.setting) && /NEW/.test(by.dyinglight.setting));

  // ---------- the Stories window's tabs, and starting Monster Hunter (feral)
  const ui = await pg.evaluate(async () => {
    S.chars.push({ ...blankChar("character"), id: "xgxcuv78mvrxy8cj", name: "Direlands", description: "(Medieval Fantasy setting. World is called Agatha.)\n\n**Bonepicks**: carved bone money." });
    await saveChars(); await applyStoryPresets();
    await openStories(); await new Promise(r => setTimeout(r, 200));
    const tabs = [...document.querySelectorAll("[data-stt]")].map(x => x.textContent);
    const shown = () => [...document.querySelectorAll("[data-sp]:not([hidden]) .st-pack b")].map(x => x.textContent);
    const built = shown();
    document.querySelector('[data-stt="mine"]').click(); const mine = shown();
    document.querySelector('[data-stt="runs"]').click(); const runsNote = document.querySelector('[data-sp="runs"]').textContent;
    document.querySelector('[data-stt="built"]').click();
    document.querySelector('[data-pk="monhun"]').click(); await new Promise(r => setTimeout(r, 200));
    const eras = [...document.querySelectorAll('[data-k="era"]')].map(x => x.textContent);
    document.querySelector('[data-k="era"][data-v="feral"]').click(); await new Promise(r => setTimeout(r, 100));
    $("stGo").click(); for (let i = 0; i < 200 && (!S.chat?.story || S.busy || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50));
    return { tabs, built, mine, runsNote, eras, title: S.chat.story.title, setting: S.chat.story.setting };
  });
  chk(`the Stories window has tabs (${ui.tabs.join(" | ")})`, ui.tabs.length === 3 && /Stories · 13/.test(ui.tabs[0]) && /From your bots · 1/.test(ui.tabs[1]));
  chk(`built-in tab lists the built-in stories only (${ui.built.length})`, ui.built.length === 13 && ui.built.includes("Mecha Ace") && ui.built.includes("Dying Light") && !ui.built.includes("The Direlands"));
  chk(`your bots' tab lists the Direlands story (${ui.mine.join(", ")})`, ui.mine.includes("The Direlands"));
  chk("Monster Hunter's setup offers Anthro and Feral", ui.eras.join() === "Anthro monsters,Feral monsters");
  chk(`the feral run (${ui.title})`, ui.title === "Monster Hunter: Feral monsters" && /feral beasts/.test(ui.setting) && !/ALL monsters \(small ones too\) are anthropomorphic/.test(ui.setting));
  chk("built-in stories don't read a bot's lore", !/The world's own lore/.test(seen.at(-1) || ""));
  const dl = await pg.evaluate(async () => {
    leaveChat(); await openStories(); await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-pk="bot:xgxcuv78mvrxy8cj"]').click(); await new Promise(r => setTimeout(r, 200));
    const vore = $("stVore").checked; $("stGo").click();
    for (let i = 0; i < 200 && (!S.chat?.story || S.busy || !S.chat.messages.length); i++) await new Promise(r => setTimeout(r, 50));
    return { vore, bot: S.charId };
  });
  chk("the Direlands story runs on your bot, vore ticked, with its lore", dl.vore && dl.bot === "xgxcuv78mvrxy8cj" && /The world's own lore/.test(seen.at(-1) || "") && /Bonepicks/.test(seen.at(-1) || ""));
  const sx = await pg.evaluate(() => { leaveChat(); return document.documentElement.scrollWidth <= innerWidth + 1; });
  chk("no sideways scroll", sx);
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
