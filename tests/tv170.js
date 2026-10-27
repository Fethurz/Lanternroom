// v1.70: read marks survive reloads, Mark all as read / Clear all / ✕ per item; people keep who-said-what straight;
// varied usernames for new people and a one-time rename of most old ones.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nU = 0, nH = 0;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: k % 3 ? `soft_bones${k}` : `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/You pick new usernames/.test(s)) return { people: [...u.matchAll(/^- @(\S+):/gm)].map(m => ({ old: m[1], handle: `moth${++nH}` })) };
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${i}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/a real person who uses/.test(s)) return { messages: ["hey"] };
    if (/^You are @/.test(s)) return { text: "ty!!" };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();

  // ---- usernames
  chk("the people prompt gives each slot a username and shown-name style", calls.some(c => /You invent the regulars/.test(sysOf(c)) && /username: .*(one short plain word|CamelCase|numbers|made-up|pun|letters|gamertag|reference|nickname plus|dot or dash|underscore)/.test(userOf_(c)) && /shown name: /.test(userOf_(c)) && /rarely just their name/.test(sysOf(c))));
  const hs = await pg.evaluate(() => ({ styles: new Set(COMM.users.map(u => u.hs)).size, bad: COMM.users.filter(u => CM_HANDLES.find(h => h[0] === u.hs)?.[1] === 0 && /_/.test(u.handle)).length, n: COMM.users.length, fix: COMM.hFix }));
  chk(`new people get many username styles (${hs.styles}) and no-separator styles drop underscores`, hs.styles >= 10 && hs.bad === 0 && hs.n >= 36);
  chk("cmHandle: spaces and separators follow the style", await pg.evaluate(() => cmHandle("soft bones", CM_HANDLES[0][0]) === "softbones" && cmHandle("soft_bones", CM_HANDLES[0][0]) === "softbones" && cmHandle("soft bones", CM_HANDLES[11][0]) === "soft_bones" && cmHandle("@void.moth", CM_HANDLES[10][0]) === "void.moth"));
  // old community: full-name handles, no styles
  const fix = await pg.evaluate(async () => {
    while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); COMM_BUSY = true;
    COMM.users.forEach((u, i) => { u.name = `Alex Rivera${i}`; u.handle = i % 5 === 0 ? `moonpie${i}` : `alex_rivera${i}`; delete u.hs; delete u.hsKept; delete u.hsTried; }); COMM.hFix = 0;
    const a = COMM.users[1], c = COMM.users[2], t = COMM.posts[0].id;
    COMM.comments[t] = [{ id: "c1", by: c.id, text: `lol @${a.handle} same`, at: Date.now() - 5000 }];
    COMM.dms[a.id] = { msgs: [{ id: "m1", from: "them", text: `ask @${c.handle} about it`, at: Date.now() - 9000 }], read: Date.now() };
    const old = COMM.users.map(u => u.handle);
    for (let i = 0; i < 6 && !COMM.hFix; i++) await commHandleFix();
    COMM_BUSY = false;
    const renamed = COMM.users.filter((u, i) => u.handle !== old[i]);
    return { n: COMM.users.length, renamed: renamed.length, kept: COMM.users.filter(u => u.hsKept).map(u => u.handle), done: COMM.hFix, cm: COMM.comments[t][0].text, dm: COMM.dms[a.id].msgs[0].text, a: a.handle, c: c.handle, oldA: a.oldHandles?.[0], uniq: new Set(COMM.users.map(u => u.handle.toLowerCase())).size };
  });
  chk(`most old people renamed (${fix.renamed}/${fix.n}), the ones kept aren't name-based`, fix.done === 1 && fix.renamed >= fix.n * 0.75 && fix.kept.every(h => /^moonpie/.test(h)) && fix.uniq === fix.n);
  chk("old @mentions in comments and DMs follow the new names", fix.cm === `lol @${fix.a} same` && fix.dm === `ask @${fix.c} about it` && fix.oldA === "alex_rivera1");
  chk("the rename runs once", await pg.evaluate(async () => { const n = calls => 0; await commTick(true); return COMM.hFix === 1; }));

  // ---- notifications
  await pg.evaluate(async () => { await commLoad(); const u = COMM.users[3], t = COMM.posts[1].id, now = Date.now();
    COMM.comments[t] = [...(COMM.comments[t] || []), { id: "me1", by: "me", text: "hi", at: now - 60e3 }, { id: "r1", by: u.id, text: "hey you", at: now - 30e3, replyTo: "me1", toMe: true }];
    COMM.fans[COMM.users[4].id] = now - 20e3; COMM.dms[u.id] = { msgs: [{ id: "d1", from: "them", text: "yo", at: now - 10e3 }], read: 0 }; commSave(); await commFlush(); });
  const before = await pg.evaluate(() => ({ act: actUnseen(), all: commUnseen() }));
  chk(`new things are counted (activity ${before.act}, all ${before.all})`, before.act >= 2 && before.all >= 3);
  await pg.evaluate(() => { openCommunity("home"); }); await wait(300); await pg.evaluate(() => openActivity()); await wait(200);
  chk("opening Activity clears its count", await pg.evaluate(() => actUnseen() === 0));
  await pg.evaluate(async () => { await commFlush(); COMM_DIRTY = false; await commLoad(); await commTick(true); });
  chk("…and it stays cleared after the community reloads (the old bug)", await pg.evaluate(() => actUnseen() === 0 && COMM.actSeen > 0));
  await pg.evaluate(() => hubTab("feed")); await wait(100);
  await pg.evaluate(async () => { await commFlush(); COMM_DIRTY = false; await commLoad(); });
  chk("the Following count stays read after a reload", await pg.evaluate(() => COMM.feedSeen > 0 && feedItems().filter(x => x.at > COMM.feedSeen && x.kind !== "copy").length === 0));
  chk("merging two devices keeps the later read marks", await pg.evaluate(() => { const m = commMerge({ actSeen: 5, feedSeen: 9, actHid: { a: 1 } }, { actSeen: 7, feedSeen: 2, actHid: { b: 2 }, actClear: 3 }); return m.actSeen === 7 && m.feedSeen === 9 && m.actClear === 3 && m.actHid.a && m.actHid.b; }));
  await pg.evaluate(() => openActivity()); await wait(200);
  chk("Activity has Mark all as read, Clear all and ✕ on each item", await pg.evaluate(() => !!$("actRead") && !!$("actClr") && document.querySelectorAll("#hubBody [data-ax]").length >= 2));
  chk("Messages still shows an unread DM", await pg.evaluate(() => dmUnread() >= 1));
  await pg.click("#actRead"); await wait(200);
  chk("Mark all as read clears every count (DMs too, the Community dot)", await pg.evaluate(() => commUnseen() === 0 && dmUnread() === 0 && actUnseen() === 0 && $("commDot").hidden));
  const n0 = await pg.evaluate(() => actItems().length);
  await pg.click("#hubBody [data-ax]"); await wait(200);
  await pg.evaluate(async () => { await commFlush(); COMM_DIRTY = false; await commLoad(); });
  chk("✕ removes one item, and it stays gone after a reload", await pg.evaluate(n => actItems().length === n - 1, n0));
  await pg.click("#actClr"); await wait(100);
  chk("Clear all asks for a second tap", await pg.evaluate(() => actItems().length > 0 && /again/.test($("actClr").textContent)));
  await pg.click("#actClr"); await wait(200);
  chk("…then the Activity list is empty", await pg.evaluate(() => actItems().length === 0 && /Nothing yet/.test(cbody().textContent)));
  await pg.evaluate(() => { const t = COMM.posts[1].id; COMM.comments[t].push({ id: "r2", by: COMM.users[3].id, text: "again!", at: Date.now() + 5, replyTo: "me1", toMe: true }); commSave(); });
  await wait(30);
  chk("new things after clearing still show up", await pg.evaluate(() => actItems().length === 1 && actUnseen() === 1));
  await pg.evaluate(() => hubTab("dms")); await wait(150);
  await pg.evaluate(() => { const u = COMM.users[3]; COMM.dms[u.id].msgs.push({ id: "d2", from: "them", text: "u there", at: Date.now() }); hubTab("dms"); }); await wait(150);
  await pg.click("#dmRead"); await wait(150);
  chk("Messages has its own Mark all as read", await pg.evaluate(() => dmUnread() === 0 && !$("dmRead")));

  // ---- who said what
  const tt = await pg.evaluate(() => { const t = COMM.posts[1].id, u = COMM.users[3]; return { mine: threadText(t, u.id), any: threadText(t) , h: u.handle, me: meName() }; });
  chk("threads mark the person's own comments (you) and who each reply answers", tt.mine.includes(`@${tt.h} (you) (replying to ${tt.me})`) && !tt.any.includes("(you)") && !/the person you are writing for/.test(tt.any));
  await pg.evaluate(async () => { const u = COMM.users[3]; COMM.liked[COMM.posts.find(p => p.by === u.id)?.id || "x"] = { v: 1, at: Date.now() }; COMM.follow[u.id] = { v: 1, at: Date.now() }; COMM.dms[u.id].msgs.push({ id: "d3", from: "me", text: "my cat is called Biscuit", at: Date.now() }); await dmWrite(u, { kind: "reply" }); });
  const dm = calls.filter(c => /a real person who uses/.test(sysOf(c))).at(-1);
  const du = dm ? userOf_(dm) : "", ds = dm ? sysOf(dm) : "";
  chk("DM history labels their own texts (you) and the owner's by name", /\(you\): yo/.test(du) && /: my cat is called Biscuit/.test(du) && !/\] you: /.test(du));
  chk("DM prompt has the who-said-what rule and only true facts", /never invent past conversations/.test(ds) && /Everything you know about/.test(du) && /follows you\./.test(du));
  await pg.evaluate(async () => { const t = COMM.posts[1].id; await commAnswer({ id: "pp", target: t, replyTo: "me1", by: COMM.users[3].id, due: Date.now() }); });
  const an = calls.filter(c => /^You are @/.test(sysOf(c))).at(-1);
  chk("comment replies know which comment is theirs and which is the owner's", an && /\(you\)/.test(userOf_(an)) && /\(they wrote it, not you\)/.test(userOf_(an)) && /never invent past conversations/.test(sysOf(an)));
  await pg.evaluate(() => hubClose());
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
