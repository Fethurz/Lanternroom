// v2.10: bot folders. Groups and worlds get automatic folders with the bots made from them; the owner's own folders;
// the main "Bots" tab shows folder cards instead of the bots inside, "All bots" stays flat; profiles list a bot's folders.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.10 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2010000; }));
  await pg.evaluate(async () => {
    const m1 = { ...blankChar("character"), id: "fm1", name: "Member One" }, m2 = { ...blankChar("character"), id: "fm2", name: "Member Two" };
    const g = { ...blankChar("group"), id: "fg1", name: "The Gang", members: ["fm1", "fm2"] };
    const w = { ...blankChar("world"), id: "fw1", name: "Worldy" }, sp = { ...blankChar("character"), id: "fs1", name: "Spun Girl", fromWorld: "fw1" };
    const a = { ...blankChar("character"), id: "fa1", name: "Queen A" }, a2 = { ...blankChar("character"), id: "fa2", name: "Queen A Young" }, lone = { ...blankChar("character"), id: "fl1", name: "Loner" };
    S.chars.push(m1, m2, g, w, sp, a, a2, lone); await saveChars();
    $("homeTabs").querySelector('[data-tab="all"]').click();
  });
  const cardNames = () => pg.evaluate(() => [...document.querySelectorAll("#charList .char-card")].map(e => e.querySelector(".name").textContent.trim()));
  let names = await cardNames();
  chk("a group's members are in its automatic folder, not loose on the main tab", names.some(n => /The Gang/.test(n) && n.startsWith("🗂")) && !names.includes("Member One") && !names.includes("The Gang"));
  chk("a world and its spun-off bot share a folder", names.some(n => n === "🗂 Worldy") && !names.includes("Spun Girl"));
  chk("bots in no folder still show", names.includes("Loner") && names.includes("Queen A"));
  // a hand-made folder
  await pg.evaluate(async () => { await newFolder("Astoria", ["fa1", "fa2"]); renderHome(); });
  names = await cardNames();
  chk("an own folder hides its bots on the main tab", names.includes("🗂 Astoria") && !names.includes("Queen A") && !names.includes("Queen A Young"));
  chk("the folder card shows how many bots", await pg.evaluate(() => [...document.querySelectorAll("#charList .folder-card")].some(e => /Folder · 2/.test(e.textContent) && e.querySelectorAll("img").length === 2)));
  // All bots tab is flat
  await pg.evaluate(() => $("homeTabs").querySelector('[data-tab="flat"]').click());
  names = await cardNames();
  chk("All bots shows everything flat, no folders", names.includes("Queen A") && names.includes("Member One") && names.includes("Spun Girl") && !names.some(n => n.startsWith("🗂")));
  // search on the main tab shows matching bots even if foldered
  await pg.evaluate(() => { $("homeTabs").querySelector('[data-tab="all"]').click(); const s = $("search"); s.value = "queen a young"; s.dispatchEvent(new Event("input")); });
  names = await cardNames();
  chk("searching finds bots inside folders", names.includes("Queen A Young") && !names.some(n => n.startsWith("🗂")));
  await pg.evaluate(() => { const s = $("search"); s.value = ""; s.dispatchEvent(new Event("input")); });
  // open a folder, open a bot from it
  await pg.evaluate(() => [...document.querySelectorAll("#charList .folder-card")].find(e => /Astoria/.test(e.textContent)).click());
  chk("opening a folder lists its bots", await pg.evaluate(() => $("sheetBody").querySelectorAll(".fd-open").length === 2 && /Astoria/.test($("sheetTitle")?.textContent || document.querySelector("#sheet h2, #sheet .title")?.textContent || "Astoria")));
  await pg.evaluate(() => $("sheetBody").querySelector('.fd-open[data-id="fa2"]').click());
  await pg.waitForTimeout(200);
  const prof = await pg.evaluate(() => ({ shelf: !!$("sheetBody").querySelector(".fd-go"), other: [...$("sheetBody").querySelectorAll(".fd-bot")].map(e => e.textContent) }));
  chk(`the profile shows its folder and the other bot in it (${JSON.stringify(prof)})`, prof.shelf && prof.other.includes("Queen A"));
  // add a bot to a folder from the card menu, a bot in two folders
  await pg.evaluate(async () => { const f = S.settings.folders.find(x => x.name === "Astoria"); S.settings.folders = S.settings.folders.map(x => x.id === f.id ? { ...x, bots: [...x.bots, "fl1"] } : x); await newFolder("Loners", ["fl1"]); renderHome(); });
  chk("a bot can be in two folders", await pg.evaluate(() => foldersOf(byId("fl1")).length === 2));
  // removing from a folder, deleting a folder
  await pg.evaluate(async () => { const f = S.settings.folders.find(x => x.name === "Loners"); openFolder(f.id); });
  await pg.evaluate(() => $("sheetBody").querySelector(".fd-out").click());
  await pg.waitForTimeout(150);
  chk("taking a bot out of a folder", await pg.evaluate(() => S.settings.folders.find(x => x.name === "Loners").bots.length === 0));
  // turning an automatic folder off
  await pg.evaluate(() => openFolder("auto:fg1"));
  await pg.evaluate(() => $("fdOff").click());
  await pg.waitForFunction(() => !!(S.settings.folderOff || {})["auto:fg1"]);
  await pg.waitForTimeout(400);
  names = await cardNames();
  chk("an automatic folder can be turned off", !names.some(n => /The Gang/.test(n) && n.startsWith("🗂")) && names.includes("Member One"));
  chk("folders are saved in settings (synced)", await pg.evaluate(async () => { const s = await Store.get("settings"); return (s.folders || []).length === 2 && s.folderOff["auto:fg1"]; }));
  // no sideways scroll
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
