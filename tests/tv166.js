// v1.66: windows step back to the one they were opened from (✕, back button, Esc; Close all), varied pixel pictures,
// whole bios with no notes about typing (and a one-time repair of old ones).
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  const LONG = "hi!! i make vore bots mostly, big preds, soft endings sometimes. dms open but i'm slow to answer, i work nights at a hospital so don't take it personally. commissions closed rn, requests maybe. i love dragons, wolves, anything with a big belly. pls credit if u edit my bots!! also i have a cat named Biscuit and she is the boss of this house.";
  let nU = 0;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: k === 1 ? LONG : `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${i}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/customise how the app looks/.test(s)) return { people: [] };
    if (/Some got cut off mid-sentence/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { bios: hs.map(h => ({ handle: h, bio: `fixed bio for ${h}. whole sentences now!!` })) }; }
    return { comments: [], posts: [], summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  await pg.evaluate(async () => { await commLoad(); await commTick(true); });

  // ---- pictures vary
  const vr = await pg.evaluate(() => { const ps = COMM.users.map(userPix).filter(Boolean); return { s: new Set(ps.map(p => p.s)).size, pal: new Set(ps.map(p => p.pal)).size, fr: new Set(ps.map(p => p.frame)).size, cats: ps.filter(p => p.s === "cat").length, n: ps.length }; });
  chk(`people's pictures vary: ${vr.s} sprites, ${vr.pal} colour sets, ${vr.fr} frames, ${vr.cats} cats of ${vr.n}`, vr.s >= 10 && vr.pal >= 6 && vr.fr === 2 && vr.cats <= vr.n / 4);
  chk("random picks spread over the whole list (not stuck on the first)", await pg.evaluate(() => { const seen = new Set(); for (let i = 0; i < 300; i++) seen.add(pixAuto("seed" + i, "", 0).s); return seen.size === PIX_SPRITES.length; }));
  chk("…while a fitting word still wins (wolf bio → wolf)", await pg.evaluate(() => Array.from({ length: 20 }, (_, i) => pixAuto("w" + i, "a wolf", 1).s).every(s => s === "wolf")));
  // pictures saved during the bug (always Ember) get a fresh colour set once
  const fx = await pg.evaluate(async () => { COMM.pixFix = 0; COMM.users.slice(0, 6).forEach(u => { u.pix = { s: "owl", pal: "ember", frame: "round" }; }); await commFlush(); while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commTick(true); return COMM.users.slice(0, 6).map(u => u.pix); });
  chk("old Ember-only pictures get re-coloured once, keeping their sprite", fx.every(p => p.s === "owl") && fx.some(p => p.pal !== "ember") && await pg.evaluate(() => COMM.pixFix === 1));

  // ---- bios
  chk("the people prompt asks for complete bios written in their style, never describing it", calls.some(c => /You invent the regulars/.test(sysOf(c)) && /2-4 complete sentences/.test(sysOf(c)) && /never describing it/.test(sysOf(c))));
  chk("a long bio is kept whole", await pg.evaluate(L => COMM.users.some(u => u.bio === L), LONG));
  chk("bios over 600 characters are cut at a sentence end", await pg.evaluate(() => { const t = "One sentence here. ".repeat(50); const r = commBio(t); return r.length <= 600 && /\.$/.test(r); }));
  const fixed = await pg.evaluate(async () => {
    const [a, c, d] = COMM.users; a.bio = "Types in all lowercase and uses way too many emojis. Loves wolves."; c.bio = "x".repeat(150) + " and then i started making bots because the ones on here were so"; c.bio = c.bio.padEnd(240, " so").slice(0, 240); d.bio = "Just a normal bio."; a.bioTried = c.bioTried = d.bioTried = 0; await commFlush(); while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commTick(true);
    return [userOf(a.id).bio, userOf(c.id).bio, userOf(d.id).bio, a.handle];
  });
  chk("bios that describe typing, or were cut off, are rewritten once", fixed[0] === `fixed bio for ${fixed[3]}. whole sentences now!!` && /^fixed bio for/.test(fixed[1]) && fixed[2] === "Just a normal bio.");
  chk("…the repair prompt sees their typing style and keeps it shown, not described", calls.some(c => /Some got cut off mid-sentence/.test(sysOf(c)) && /written IN their typing style \(shown, never described\)/.test(sysOf(c)) && /Types: /.test(userOf_(c))));
  const before = calls.length; await pg.evaluate(async () => { while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commTick(true); });
  chk("…and no repair call once they're fine", !calls.slice(before).some(c => /Some got cut off mid-sentence/.test(sysOf(c))));
  const uid0 = await pg.evaluate(() => COMM.users[1].id);
  await pg.evaluate(id => { userOf(id).bio = "A long bio. ".repeat(30).trim(); }, uid0);
  await pg.evaluate(id => openCommUser(id), uid0); await wait(300);
  chk("the profile page shows the whole bio", await pg.evaluate(id => document.querySelector(".cm-pfx-in > p").textContent === userOf(id).bio, uid0));

  // ---- windows step back
  const title = () => pg.textContent("#sheetTitle");
  await pg.evaluate(() => { closeSheet(); openCommunity("people"); }); await wait(300);
  await pg.evaluate(() => { $("sheetBody").scrollTop = 120; });
  const t0 = await title();
  await pg.click(".cm-user"); await wait(300);
  const t1 = await title();
  chk("Close all shows once you're a window deep", await pg.evaluate(() => !$("sheetAll").hidden && $("sheetClose").getAttribute("aria-label") === "Back"));
  const pid = await pg.evaluate(() => COMM.posts[0].id);
  await pg.evaluate(id => openPost(id), pid); await wait(300);
  const t2 = await title();
  await pg.click("#sheetClose"); await wait(300);
  chk(`✕ steps back from the bot (${t2}) to the profile (${t1})`, (await title()) === t1 && await pg.evaluate(() => !$("sheet").hidden));
  await pg.click("#cmFollow"); await wait(200);
  chk("a window that redraws itself (Follow) doesn't add a step", await pg.evaluate(() => S.sheetStack.length === 1));
  await pg.click("#sheetClose"); await wait(300);
  chk("✕ again: back to the Community, on the People tab, where you'd scrolled", (await title()) === t0 && await pg.evaluate(() => !!document.querySelector(".cm-user") && $("sheetAll").hidden));
  await pg.click("#sheetClose"); await wait(200);
  chk("✕ on the first window closes it", await pg.evaluate(() => $("sheet").hidden && !S.sheetStack.length));
  // phone back button and Esc step back too
  await pg.evaluate(() => openCommunity("people")); await wait(300); await pg.click(".cm-user"); await wait(300);
  await pg.goBack(); await wait(300);
  chk("the phone's back button steps back one window", (await title()) === t0 && await pg.evaluate(() => !$("sheet").hidden));
  await pg.click(".cm-user"); await wait(300); const tE = await title(); await pg.keyboard.press("Escape"); await wait(300);
  const tE2 = await pg.evaluate(() => [$("sheet").hidden, $("sheetTitle").textContent, S.sheetStack.length, document.activeElement?.tagName, S.sheetGuard, !!$("sheetConfirm"), $("ambPop").hidden].join("|"));
  chk(`Esc steps back one window (${tE} → ${tE2})`, (await title()) === t0 && await pg.evaluate(() => !$("sheet").hidden));
  await pg.click(".cm-user"); await wait(300); await pg.evaluate(id => openPost(id), pid); await wait(300);
  await pg.click("#sheetAll"); await wait(200);
  chk("Close all closes every window at once", await pg.evaluate(() => $("sheet").hidden && !S.sheetStack.length));
  // going "forward" to a window already on the way back (saving a persona reopens the list) doesn't loop
  await pg.evaluate(() => openPersonas()); await wait(200);
  await pg.evaluate(() => editPersona(S.personas[0], false)); await wait(200);
  await pg.click("#peSave"); await wait(400);
  chk("saving a persona goes back to the list with nothing left behind it", (await title()) === "Personas" && await pg.evaluate(() => S.sheetStack.length === 0));
  await pg.click("#sheetClose"); await wait(200);
  chk("…so ✕ then closes", await pg.evaluate(() => $("sheet").hidden));
  // an editor asks first, then steps back to where it was opened from
  const cid = await pg.evaluate(() => S.chars[0].id);
  await pg.evaluate(id => openProfile(id), cid); await wait(300);
  const tp = await title();
  await pg.evaluate(id => editChar(JSON.parse(JSON.stringify(byId(id))), false), cid); await wait(300);
  await pg.fill("#cName", "Changed name"); await wait(100);
  await pg.click("#sheetClose"); await wait(200);
  chk("closing the bot editor still asks first", await pg.evaluate(() => !!$("sheetConfirm")));
  await pg.click("#scClose"); await wait(300);
  chk("…then steps back to the bot's profile", (await title()) === tp && await pg.evaluate(() => !$("sheet").hidden && !$("sheetConfirm")));
  // the generator's wait screen is never stepped back to
  await pg.evaluate(() => { closeSheet(); openSheet("A", b => { b.innerHTML = "<p>a</p>"; }); waitSheet("Making", "Working…"); openSheet("Review", b => { b.innerHTML = "<p>r</p>"; }); });
  chk("wait screens are skipped on the way back", await pg.evaluate(() => S.sheetStack.map(e => e.title).join() === "A"));
  await pg.evaluate(() => closeSheet());

  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
