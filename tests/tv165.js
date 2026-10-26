// v1.65: fan bots (adults in their source, From/OC badge), profile updates (incl. a new picture), pixel pictures
// (renderer, picker: sprites, colours (own colours, skin/hair), frames, drawing, upload), community people, you,
// personas and bots without portraits.
const open = require("./base.js");
const path = require("path");
(async () => {
  const W = +(process.env.W || 390);
  const ROOT = process.env.LR_ROOT || "/home/claude/lanternroom";
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nU = 0;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: k % 2 ? ["wolf", "vore"] : ["knight", "rpg"], voice: "v", fandoms: k % 3 ? ["Skyrim"] : [] }; }) }; }
    if (/customise how the app looks/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { people: hs.map(h => ({ handle: h, theme: "pal:lantern", accent: "", flame: "", lantern: "", finish: "", status: "hi" })) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: i % 2 ? "" : "Skyrim", kind: "character", name: `Bot ${h} ${i}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/update their profiles now and then/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { updates: hs.map((h, i) => ({ handle: h, status: i === 0 ? "new status!!" : "", bio: i === 1 ? "a brand new bio" : "", outfit: {}, pin: "", picture: "owl" })) }; }
    if (/write the comments people leave/.test(s)) return { comments: [] };
    if (/short blog posts or announcements/.test(s)) return { posts: [] };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  await pg.evaluate(async () => { await commLoad(); await commTick(true); });

  // ---- fan bots
  const lp = calls.find(c => /write new bot listings/.test(sysOf(c)));
  chk("the listing prompt allows fan bots of existing media and OCs, with any focus", !!lp && /fan bot of characters, worlds or groups from existing media/.test(sysOf(lp)) && /Any focus a real site has/.test(sysOf(lp)) && /"source"/.test(sysOf(lp)));
  chk("…fan bots only use characters who are adults in their source, never real people", /only use characters who are adults in their source material \(never characters who are minors in their source, not even aged up\) and never real people/.test(sysOf(lp)) && /fully grown, mature/.test(sysOf(lp)));
  chk("…each poster is marked fan bot or OC, with their fandoms", /This one: (a fan bot from existing media|an OC)/.test(userOf_(lp)) && /fan of Skyrim/.test(userOf_(lp)));
  await pg.evaluate(() => openCommunity("discover")); await wait(300);
  chk("listings show 'From Skyrim' or 'OC'", await pg.evaluate(() => { const t = [...document.querySelectorAll(".cm-src")].map(x => x.textContent); return t.includes("From Skyrim") && t.includes("OC"); }));
  chk("people know their fandoms", await pg.evaluate(() => COMM.users.some(u => (u.fandoms || []).includes("Skyrim"))));

  // ---- pixel renderer
  const rnd = await pg.evaluate(() => {
    const all = PIX_SPRITES.flatMap(s => PIX_FRAMES.map(([f]) => pixSVG({ s: s[0], pal: "moss", frame: f, skin: 2, hair: 3 }, 52)));
    const parse = t => new DOMParser().parseFromString(t, "image/svg+xml").querySelector("parsererror");
    const cus = pixColors({ s: "cat", pal: "custom", cols: { b: "#3366ff", c: "#ffcc00", a: "#ff0000", bg: "#112233" } });
    const hu = pixColors({ s: "girl", pal: "ember", skin: 4, hair: "#22cc88" });
    return { n: PIX_SPRITES.length, ok: all.every(t => !parse(t) && /<rect x=/.test(t) && /clipPath/.test(t)), ids: new Set(all.map(t => t.match(/id="([^"]+)"/)[1])).size === all.length,
      cus: cus.b === "#3366ff" && cus.c === "#ffcc00" && cus.a === "#ff0000" && cus.bg[0] === "#112233" && cus.s !== cus.b && cus.h !== cus.b,
      hu: hu.b === PIX_SKINS[4][0] && hu.c === "#22cc88", w: PIX_SPRITES.every(s => s[3].length === 12 * 16),
      dropped: !["demon", "dragon", "frog", "mushroom", "slime", "vampire"].some(k => PIX_BY[k]), frames: PIX_FRAMES.map(f => f[0]).join() };
  });
  chk("19 kept sprites (the 6 dropped ones are gone), all 12×16", rnd.n === 19 && rnd.dropped && rnd.w);
  chk("every sprite draws in both frames (round, soft; no square) with its own clip", rnd.ok && rnd.ids && rnd.frames === "round,soft");
  chk("own colours: main, second, detail and backdrop, with shades worked out", rnd.cus);
  chk("people sprites take a skin tone and any hair colour", rnd.hu);
  chk("a fitting picture from text (wolf bio → wolf), the same every time", await pg.evaluate(() => pixAuto("x1", "a big grey wolf").s === "wolf" && JSON.stringify(pixAuto("x1", "a big grey wolf")) === JSON.stringify(pixAuto("x1", "a big grey wolf"))));

  // ---- community people
  const ppl = await pg.evaluate(() => ({ px: COMM.users.filter(u => /<svg/.test(avatarOf(u))).length, all: COMM.users.length }));
  chk(`most people wear a pixel picture, a few keep their letter (${ppl.px} of ${ppl.all})`, ppl.px >= ppl.all * 0.7 && ppl.px < ppl.all);
  chk("…the same picture on every device (from their id, nothing stored)", await pg.evaluate(() => COMM.users.every(u => u.pix === undefined) && JSON.stringify(userPix(COMM.users[3])) === JSON.stringify(userPix(JSON.parse(JSON.stringify(COMM.users[3]))))));

  // ---- profile updates (status, bio, picture)
  const u0 = await pg.evaluate(() => { const u = COMM.users.find(x => x.fit); u.sleep = [(Math.floor(localHour(u)) + 8) % 24, (Math.floor(localHour(u)) + 9) % 24]; COMM.follow[u.id] = { v: true, at: Date.now() - 864e5 }; COMM.users.filter(x => x !== u).forEach(x => { x.sleep = [(Math.floor(localHour(x)) + 1) % 24, (Math.floor(localHour(x)) + 23) % 24]; }); commSave(); return u.id; });
  // only u0 is awake, so they're the one who updates
  const pu = await pg.evaluate(async id => { COMM.users.forEach(x => { if (x.id !== id) { const h = Math.floor(localHour(x)); x.sleep = [h, (h + 2) % 24]; } }); const got = await commProfileUpdates(1); commSave(); return got.map(([u, w]) => ({ id: u.id, w: w.map(x => x[0]), st: u.status, pix: u.pix })); }, u0);
  chk("a person updates their profile: new status and a new picture", pu.length === 1 && pu[0].id === u0 && pu[0].w.includes("status") && pu[0].w.includes("pic") && pu[0].st === "new status!!" && pu[0].pix?.s === "owl");
  chk("the profile prompt offers the picture list", calls.some(c => /update their profiles now and then/.test(sysOf(c)) && /"picture": a new profile picture from this list/.test(sysOf(c)) && /knight, wizard/.test(sysOf(c))));
  await pg.evaluate(id => openCommUser(id), u0); await wait(300);
  chk("…their profile shows the owl", await pg.evaluate(() => !!document.querySelector(".cm-emb .px-av svg")));
  await pg.evaluate(() => openCommunity("feed")); await wait(300);
  chk("…and the Following feed says they changed their status and picture", /changed their status/.test(await pg.evaluate(() => cbody().textContent)) && /changed their profile picture/.test(await pg.evaluate(() => cbody().textContent)));

  // ---- your picture: the picker
  await pg.evaluate(() => openCommunity("yours")); await wait(300);
  chk("Yours offers Choose a profile picture", /Choose a profile picture/.test(await pg.textContent("#cmPic")));
  await pg.click("#cmPic"); await wait(200);
  chk("the picker opens over the window, with Picture / Colours / Frame / Draw / Upload", await pg.evaluate(() => !!$("pixPop") && HUB.open && [...document.querySelectorAll("#pixPop [data-tab]")].map(x => x.textContent).join() === "Picture,Colours,Frame,Draw,Upload" && document.querySelectorAll("#pixPop .pix-cell").length === 19));
  await pg.click('#pixPop [data-s="knight"]'); await pg.click('#pixPop [data-tab="col"]'); await pg.click('#pixPop [data-pal="custom"]');
  chk("Your own colours shows four colour pickers", await pg.evaluate(() => document.querySelectorAll("#pixPop [data-col]").length === 4));
  await pg.evaluate(() => { const i = document.querySelector('#pixPop [data-col="b"]'); i.value = "#3366ff"; i.dispatchEvent(new Event("input")); i.dispatchEvent(new Event("change")); });
  chk("…the preview takes the colour at once", await pg.evaluate(() => /#3366ff/i.test(document.querySelector("#pixPop .pix-big").innerHTML)));
  await pg.click('#pixPop [data-tab="frame"]'); await pg.click('#pixPop [data-fr="soft"]');
  await pg.click("#pxSave"); await wait(250);
  const me1 = await pg.evaluate(() => ({ ...COMM.me.pix, gone: !$("pixPop") }));
  chk("Save: your picture is the knight, in your own blue, soft frame", me1?.s === "knight" && me1.pal === "custom" && me1.cols.b === "#3366ff" && me1.frame === "soft" && me1.gone);
  chk("…shown on Yours", await pg.evaluate(() => !!document.querySelector(".hub-youcard .px-av svg") && /#3366ff/i.test(document.querySelector(".hub-youcard").innerHTML)));
  // a human sprite: skin and hair
  await pg.click("#cmPic"); await pg.click('#pixPop [data-s="girl"]'); await pg.click('#pixPop [data-tab="col"]');
  chk("people sprites add Skin and Hair rows with any-colour pickers", await pg.evaluate(() => document.querySelectorAll("#pixPop [data-skin]").length === 6 && document.querySelectorAll("#pixPop [data-hair]").length === 8 && !!document.querySelector("#pixPop [data-anyhair]")));
  await pg.click('#pixPop [data-skin="3"]');
  chk("…picking a skin tone marks it", await pg.evaluate(() => document.querySelector('#pixPop [data-skin="3"]').classList.contains("on")));
  // drawing
  await pg.click('#pixPop [data-tab="draw"]');
  chk("Draw offers Start blank or from the sprite", await pg.evaluate(() => !!$("pxBlank") && /Start from Long hair/.test($("pxFrom").textContent)));
  await pg.click("#pxBlank"); await wait(100);
  const cell = async i => { const r = await pg.evaluate(i => { const e = document.querySelector(`#pxCanvas i[data-i="${i}"]`).getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2]; }, i); await pg.mouse.click(r[0], r[1]); await wait(40); };
  chk("a 12×16 grid with every colour, an eraser, Mirror on", await pg.evaluate(() => document.querySelectorAll("#pxCanvas i").length === 192 && document.querySelectorAll("#pixPop [data-tool]").length === 11 && $("pxMir").classList.contains("on")));
  await cell(13);
  chk("painting a square paints its mirror twin too", await pg.evaluate(() => { const r = document.querySelectorAll("#pxCanvas i"); return !!r[13].style.background && !!r[22].style.background && !r[14].style.background; }));
  await pg.click('#pixPop [data-tool="e"]'); await cell(30);
  await pg.click("#pxMir"); await cell(40);
  chk("…another colour, and with Mirror off only one square", await pg.evaluate(() => { const r = document.querySelectorAll("#pxCanvas i"); return r[30].style.background !== r[13].style.background && !!r[40].style.background && !r[43].style.background; }));
  // drag painting
  const a = await pg.evaluate(() => { const e = document.querySelector('#pxCanvas i[data-i="96"]').getBoundingClientRect(), f = document.querySelector('#pxCanvas i[data-i="100"]').getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2, f.x + f.width / 2]; });
  await pg.mouse.move(a[0], a[1]); await pg.mouse.down(); for (let x = a[0]; x <= a[2]; x += 4) await pg.mouse.move(x, a[1]); await pg.mouse.up(); await wait(60);
  chk("dragging paints a line", await pg.evaluate(() => [96, 97, 98, 99, 100].every(i => !!document.querySelectorAll("#pxCanvas i")[i].style.background)));
  // fill + undo
  await pg.click('#pixPop [data-tool="b"]'); await pg.click("#pxFill"); await cell(191);
  const filled = await pg.evaluate(() => [...document.querySelectorAll("#pxCanvas i")].filter(x => x.style.background).length);
  await pg.click("#pxUndo"); await wait(60);
  const unfilled = await pg.evaluate(() => [...document.querySelectorAll("#pxCanvas i")].filter(x => x.style.background).length);
  chk(`Fill fills the open area (${filled}) and Undo takes it back (${unfilled})`, filled > 150 && unfilled < 15);
  await pg.click("#pxSave"); await wait(250);
  const own = await pg.evaluate(() => COMM.me.pix);
  chk("Save keeps the drawing as your picture (own pixels, in the palette keys)", own?.s === "own" && own.rows.length === 192 && own.rows[13] === "b" && own.rows[22] === "b" && own.rows[30] === "e" && own.rows[43] === "." && own.skin === 3);
  chk("…drawn in its colours", await pg.evaluate(() => (document.querySelector(".hub-youcard .px-av svg").innerHTML.match(/<rect x=/g) || []).length > 12));
  await pg.click("#cmPic"); await wait(100);
  chk("reopening the picker keeps your drawing among the pictures", await pg.evaluate(() => !!document.querySelector('#pixPop [data-s="own"].on')));
  // upload
  await pg.click('#pixPop [data-tab="up"]'); await pg.setInputFiles("#pxFile", path.join(ROOT, "icons/icon-192.png")); await wait(400);
  chk("Upload shows your picture in the preview", await pg.evaluate(() => /^data:image\/jpeg/.test(document.querySelector("#pixPop .pix-big img")?.src || "")));
  await pg.click("#pxSave"); await wait(250);
  chk("…and saves it as your picture", await pg.evaluate(() => /^data:image\/jpeg/.test(COMM.me.pic) && !COMM.me.pix && /^data:image\/jpeg/.test(document.querySelector(".hub-youcard img.px-av")?.src || "")));
  // closing without saving changes nothing; Esc and the phone's back button close only the picker
  await pg.click("#cmPic"); await pg.click(`#pixPop [data-tab="pic"]`); await pg.click(`#pixPop [data-s="cat"]`); await pg.click("#pxX"); await wait(100);
  chk("✕ closes without changing anything", await pg.evaluate(() => !$("pixPop") && /^data:image\/jpeg/.test(COMM.me.pic)));
  await pg.click("#cmPic"); await pg.keyboard.press("Escape"); await wait(100);
  chk("Esc closes the picker, the Community window stays", await pg.evaluate(() => !$("pixPop") && HUB.open));
  await pg.click("#cmPic"); await wait(100); await pg.goBack(); await wait(300);
  chk("the back button closes the picker, the Community window stays", await pg.evaluate(() => !$("pixPop") && HUB.open && !!$("cmPic")));
  // your picture in comments
  await pg.evaluate(() => { const p = COMM.posts[0]; openPost(p.id); }); await wait(300);
  await pg.fill("#cmText", "love it"); await pg.click("#cmSend"); await wait(300);
  chk("your picture shows on your comment", await pg.evaluate(() => /^data:image\/jpeg/.test(document.querySelector(".cm-c.me img.px-av")?.src || "")));
  await pg.evaluate(() => { COMM.me = { ...COMM.me, pic: "", pix: null, at: Date.now() }; commSave(); });

  // ---- personas
  await pg.evaluate(() => { hubClose(); closeSheet(); openPersonas(); }); await wait(300);
  chk("the persona list shows a picture for every persona (a pixel stand-in until chosen)", await pg.evaluate(() => { const rows = document.querySelectorAll("#pList .listrow"); return rows.length > 0 && [...rows].every(r => r.querySelector(".px-av")); }));
  await pg.evaluate(() => editPersona(S.personas.find(p => p.id === S.personaId), false)); await wait(300);
  chk("the persona editor has Choose a picture", /Choose a picture/.test(await pg.textContent("#pePic")));
  await pg.click("#pePic"); await wait(100); await pg.click('#pixPop [data-s="fox"]'); await pg.click("#pxSave"); await wait(150);
  chk("…the chosen picture shows in the editor", await pg.evaluate(() => !!$("pePicV").querySelector("svg") && /Change picture/.test($("pePic").textContent)));
  await pg.click("#peSave"); await wait(400);
  const pp = await pg.evaluate(() => S.personas.find(p => p.id === S.personaId).pix);
  chk("saving the persona keeps the picture", pp?.s === "fox");
  chk("your community picture falls back to your persona's", await pg.evaluate(() => mePicOf()?.pix?.s === "fox" && /<svg/.test(meAvatar(30))));
  await pg.evaluate(() => editPersona(S.personas.find(p => p.id === S.personaId), false)); await wait(200);
  await pg.click("#pePic"); await pg.click('#pixPop [data-tab="up"]'); await pg.setInputFiles("#pxFile", path.join(ROOT, "icons/icon-192.png")); await wait(400); await pg.click("#pxSave"); await wait(150); await pg.click("#peSave"); await wait(400);
  chk("a persona can use an uploaded picture instead", await pg.evaluate(() => { const p = S.personas.find(p => p.id === S.personaId); return /^data:image\/jpeg/.test(p.pic) && !p.pix; }));
  // a second persona, shown on the Personas tab
  await pg.evaluate(async () => { S.personas.push({ id: "pp2", name: "Second", description: "A tall knight in armour.", pix: { s: "wizard", pal: "tide", frame: "round" } }); await savePersonas(); closeSheet(); HF.tab = "personas"; renderHome(); }); await wait(300);
  chk("the Personas tab cards show each persona's picture", await pg.evaluate(() => { const imgs = [...document.querySelectorAll(".char-card.k-persona img")].map(i => i.src); return imgs.length >= 2 && imgs.some(s => /^data:image\/jpeg/.test(s)) && imgs.some(s => /^data:image\/svg\+xml/.test(s)); }));
  await pg.evaluate(async () => { const c = await pbSync(S.personas.find(p => p.id === "pp2"), true); return c; });
  chk("…and the persona's stand-in bot uses it", await pg.evaluate(() => /^data:image\/svg/.test(portraitURL(pbOf("pp2")))));
  await pg.evaluate(() => { HF.tab = "all"; renderHome(); });

  // ---- bots without portraits
  await pg.evaluate(async () => { S.settings.portraits = false; await saveSettings(); renderHome(); }); await wait(300);
  chk("bots without a portrait show a pixel picture (not a letter)", await pg.evaluate(() => { const i = document.querySelector("#grid .char-card img, .char-card img"); return !!i && /^data:image\/svg\+xml/.test(i.src) && /rect/.test(decodeURIComponent(i.src)) && !/<text/.test(decodeURIComponent(i.src)); }));
  const cid = await pg.evaluate(() => S.chars[0].id);
  await pg.evaluate(id => editChar(JSON.parse(JSON.stringify(byId(id))), false), cid); await wait(300);
  chk("the bot editor offers Make a pixel picture", /Make a pixel picture/.test(await pg.textContent("#cPix")));
  await pg.click("#cPix"); await wait(100);
  chk("…its picker has no Upload tab (the portrait section has its own)", await pg.evaluate(() => !document.querySelector('#pixPop [data-tab="up"]')));
  await pg.click('#pixPop [data-s="robot"]'); await pg.click("#pxSave"); await wait(300);
  chk("…the editor shows it with Stop using it", await pg.evaluate(() => !!$("cPixX") && /Change pixel picture/.test($("cPix").textContent)));
  await pg.click("#cSave"); await wait(500);
  chk("saved: the bot uses its pixel picture", await pg.evaluate(id => byId(id).pix?.s === "robot" && /^data:image\/svg/.test(portraitURL(byId(id))), cid));
  await pg.evaluate(async () => { S.settings.portraits = true; await saveSettings(); renderHome(); }); await wait(300);
  chk("…even with generated portraits on (its own choice wins)", await pg.evaluate(id => /^data:image\/svg/.test(portraitURL(byId(id))), cid));
  chk("a broken portrait falls back to the pixel picture", await pg.evaluate(() => new Promise(res => { const img = new Image(); setImg(img, "http://local/lr/missing.png", { id: "zz", name: "Zed", description: "a wolf" }); setTimeout(() => res(/^data:image\/svg/.test(img.src)), 600); })));

  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
