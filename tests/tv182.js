// v1.82: DMs: fewer questions, no pressing for answers, a message sent while they're typing is taken into account,
// the keyboard stays up after sending with the chat at its bottom; the season and news are background; one jam entry each
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  let nU = 0; const seen = { dm: [], posts: [], room: [] }; let dmReply = () => ({ messages: ["ok cool"], interest: 5, leaving: false, promises: [] });
  const json = body => {
    const s = sysOf(body), u = usrOf(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { seen.posts.push(body); const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map(h => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${Math.random().toString(36).slice(2, 7)}`, tags: ["vore"], summary: "A " + Math.random().toString(36).slice(2, 12) + " thing " + Math.random().toString(36).slice(2, 9), appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*", jam: true })) }; }
    if (/private messages with/.test(s)) { seen.dm.push(body); return dmReply(body); }
    if (/You write the next messages in/.test(s)) { seen.room.push(body); return { messages: [] }; }
    if (/write the comments people leave/.test(s)) return { comments: [] };
    if (/sometimes post short blog posts/.test(s)) return { posts: [] };
    if (/You write site news on/.test(s)) return { title: "t" + Math.random(), text: "x" + Math.random() };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY || DM_BUSY || ROOM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  await pg.evaluate(() => { window.commTick = async () => {}; for (const u of COMM.users) { const h = Math.floor(localHour(u)); u.sleep = [(h + 8) % 24, (h + 10) % 24]; } });
  chk("version 1.82 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1082));
  const pump = () => pg.evaluate(async () => { while (DM_BUSY) await new Promise(r => setTimeout(r, 30)); await dmPump(); while (DM_BUSY) await new Promise(r => setTimeout(r, 30)); });
  const U = await pg.evaluate(() => COMM.users[3].id);

  // ---------- questions and pressing
  dmReply = () => ({ messages: ["haha yeah"], interest: 5, leaving: false, promises: [] });
  const q1 = await pg.evaluate(async id => { COMM.dms[id] = { msgs: [{ id: "a", from: "them", text: "what do you like?", at: Date.now() - 9e5 }, { id: "b", from: "me", text: "vore mostly", at: Date.now() - 8e5 }, { id: "c", from: "them", text: "oh nice, which bots?", at: Date.now() - 7e5 }], read: Date.now() }; dmSend(id, "the wyrm one"); const q = COMM.dmq.find(x => x.user === id); q.due = Date.now() + 300; q.typingAt = Date.now() - 1000; return 1; }, U);
  await pump();
  const p1 = seen.dm.at(-1);
  chk("the DM prompt: most texts don't end with a question, let unanswered things go, never press", /Most real texts don't end with a question/.test(sysOf(p1)) && /let it go like a real person would/.test(sysOf(p1)) && /never send a message just to press them/.test(sysOf(p1)));
  chk("after two texts ending in questions, the next one is told not to ask", /this time don't ask anything/.test(sysOf(p1)));
  chk("a first message to you starts something new instead of chasing old questions", await pg.evaluate(() => /start something new, don't chase anything/.test(String(dmWrite).replace(/\s+/g, " "))));

  // ---------- a message sent while they're typing
  await pg.waitForTimeout(800); await pump();
  const t1 = await pg.evaluate(async id => {
    COMM.dmq = COMM.dmq.filter(x => x.user !== id); dmSend(id, "do you like dragons"); const q = COMM.dmq.find(x => x.user === id);
    q.parts = [{ text: "dragons are ok", at: Date.now() + 20e3 }]; q.typingAt = Date.now() - 3000; // written, about to arrive
    dmSend(id, "or snakes"); const q2 = COMM.dmq.find(x => x.user === id);
    return { same: q2 === q, rewrite: !q.parts, due: (q.due - Date.now()) / 1000, typing: q.typingAt <= Date.now() + 7000, n: COMM.dmq.filter(x => x.user === id).length };
  }, U);
  chk(`a message sent while they're typing makes them rewrite their answer soon (${t1.due.toFixed(0)} s)`, t1.same && t1.rewrite && t1.due > 4 && t1.due < 75 && t1.typing && t1.n === 1);
  await pg.evaluate(id => { const q = COMM.dmq.find(x => x.user === id); q.due = Date.now() + 300; q.typingAt = Date.now() - 1000; }, U);
  await pump();
  chk("…and the rewrite answers both of your messages", /all [23] of them/.test(usrOf(seen.dm.at(-1))) && /or snakes/.test(usrOf(seen.dm.at(-1))) && /do you like dragons/.test(usrOf(seen.dm.at(-1))));
  // mid-burst
  dmReply = () => ({ messages: ["one", "two", "three"], interest: 6, leaving: false, promises: [] });
  const t2 = await pg.evaluate(async id => {
    await new Promise(r => setTimeout(r, 900)); while (DM_BUSY) await new Promise(r => setTimeout(r, 30)); await dmPump();
    COMM.dmq = COMM.dmq.filter(x => x.user !== id); dmSend(id, "tell me more"); const q = COMM.dmq.find(x => x.user === id); q.due = Date.now() + 200; q.typingAt = Date.now() - 1000;
    while (DM_BUSY) await new Promise(r => setTimeout(r, 30)); await dmPump(); { const dd = Date.now() - 50 - q.parts[0].at; for (const p of q.parts) p.at += dd; } await new Promise(r => setTimeout(r, 100)); await dmPump();
    const started = !!q.started, left = q.parts?.length, inq = COMM.dmq.includes(q); window.__dbg = JSON.stringify({ started, left, inq, parts: q.parts?.map(p => p.at - Date.now()) });
    dmSend(id, "wait one sec"); const nq = COMM.dmq.filter(x => x.user === id && x !== q);
    const calls0 = window.__c = 0;
    return { started, left, n: nq.length, after: nq[0] && nq[0].due > q.parts.at(-1).at, dbg: window.__dbg + JSON.stringify(COMM.dmq.filter(x => x.user === id).map(x => ({ k: x.kind, p: x.parts?.length, st: x.started, due: x.due - Date.now() }))) };
  }, U);
  if (!t2.after) console.log(t2.dbg);
  chk(`mid-burst (after their first text, ${t2.left} still to come) your message gets its own answer right after`, t2.started && t2.left >= 1 && t2.n === 1 && t2.after);
  const t3 = await pg.evaluate(async id => { const before = window.__dm = 0; const nq = COMM.dmq.find(x => x.user === id && !x.parts); nq.typingAt = Date.now() - 1000; nq.due = Date.now(); while (DM_BUSY) await new Promise(r => setTimeout(r, 30)); await dmPump(); return { written: !!nq.parts }; }, U);
  chk("…but it isn't written until their earlier texts have all arrived", !t3.written);
  // while being written
  const t4 = await pg.evaluate(async id => {
    COMM.dmq = COMM.dmq.filter(x => x.user !== id); dmSend(id, "hello?"); const q = COMM.dmq.find(x => x.user === id); DM_WRITING = q.id; dmSend(id, "also this"); DM_WRITING = null; return { stale: !!q.stale };
  }, U);
  chk("a message that arrives while their reply is being written marks it to be written again", t4.stale);
  const t5 = await pg.evaluate(async id => { const q = COMM.dmq.find(x => x.user === id); q.due = Date.now(); q.typingAt = Date.now() - 1000; while (DM_BUSY) await new Promise(r => setTimeout(r, 30)); await dmPump(); return { parts: !!q.parts, due: (q.due - Date.now()) / 1000 }; }, U);
  chk(`…and it is: nothing sent from the old draft, a fresh one in a few seconds (${t5.due.toFixed(0)} s)`, !t5.parts && t5.due > 2 && t5.due < 30);

  // ---------- the composer
  const cp = await pg.evaluate(async id => {
    openCommunity(); openDM(id); await new Promise(r => setTimeout(r, 60));
    const l = $("hubBody").querySelector(".dm-list"); for (let i = 0; i < 30; i++) dmOf(id).msgs.push({ id: "z" + i, from: i % 2 ? "me" : "them", text: "line " + i + " ".repeat(5) + "more words here", at: Date.now() - (60 - i) * 6e4 }); openDM(id); await new Promise(r => setTimeout(r, 60));
    const L = $("hubBody").querySelector(".dm-list"); L.scrollTop = 0; $("dmIn").focus(); await new Promise(r => setTimeout(r, 700));
    const atBottom = L.scrollHeight - L.scrollTop - L.clientHeight < 4;
    $("dmIn").value = "hey"; const ev = new PointerEvent("pointerdown", { bubbles: true, cancelable: true }); $("dmSend").dispatchEvent(ev); $("dmSend").click(); await new Promise(r => setTimeout(r, 60));
    const L2 = $("hubBody").querySelector(".dm-list");
    return { atBottom, kept: ev.defaultPrevented && document.activeElement === $("dmIn"), cleared: $("dmIn").value === "", bottom2: L2.scrollHeight - L2.scrollTop - L2.clientHeight < 4 };
  }, U);
  chk("focusing the message box shows the bottom of the chat", cp.atBottom);
  chk("pressing Send keeps the box open and focused, and the chat at the bottom", cp.kept && cp.cleared && cp.bottom2);
  const rm = await pg.evaluate(async () => { openRoom("general"); await new Promise(r => setTimeout(r, 60)); $("rmIn").focus(); $("rmIn").value = "hi"; const ev = new PointerEvent("pointerdown", { bubbles: true, cancelable: true }); $("rmSend").dispatchEvent(ev); $("rmSend").click(); await new Promise(r => setTimeout(r, 60)); return ev.defaultPrevented && document.activeElement === $("rmIn"); });
  chk("same in lounges and group chats", rm);

  // ---------- season and news in the background; one jam entry each
  await pg.evaluate(() => { SEASON_FORCE = { k: "halloween" }; });
  const bg = await pg.evaluate(() => ({ season: commSeason(), news: (COMM.blogs.unshift({ id: "n1", by: "staff_wick", news: "staff", title: "New thing", text: "x", at: Date.now(), heat: 1 }), newsFact()) }));
  chk("the season and site news are background in every prompt, never the main topic", /That's background: most of what people post and say is about other things/.test(bg.season) && /background only: most talk is about other things/.test(bg.news));
  const jm = await pg.evaluate(async () => {
    const sn = seasonNow(); COMM.tickP = 0; await commPosts(3); const by = COMM.posts.filter(p => p.jam === sn.id).map(p => p.by);
    const u = COMM.users[0]; COMM.posts.push({ id: "j1", by: u.id, kind: "character", card: { name: "J1", summary: "s" }, tags: [], heat: 1, at: Date.now(), jam: sn.id }, { id: "j2", by: u.id, kind: "character", card: { name: "J2", summary: "s" }, tags: [], heat: 1, at: Date.now() - 1000, jam: sn.id });
    const L = jamOf(sn).filter(x => x.p && x.p.by === u.id).length;
    const c1 = S.chars[0]; await commPublish(c1, true); const c2 = { ...c1, id: uid(), name: "Second" }; S.chars.push(c2); await commPublish(c2, true);
    openJam(); await new Promise(r => setTimeout(r, 40)); $("hubBody").querySelector(`[data-jam="${c1.id}"]`).click(); await new Promise(r => setTimeout(r, 40));
    const swap = /Enter this one instead/.test($("hubBody").textContent); $("hubBody").querySelector(`[data-jam="${c2.id}"]`).click(); await new Promise(r => setTimeout(r, 40));
    const mine = jamOf(sn).filter(x => x.me).map(x => x.name);
    return { prompt: /each person enters at most one bot/.test(String(seen_last())), oneEach: new Set(by).size === by.length, L, swap, mine };
    function seen_last() { return ""; }
  });
  chk("people enter at most one bot each (the listing prompt says so and extra entries are ignored)", /each person enters at most one bot/.test(sysOf(seen.posts.at(-1))) && /about 1 in 5/.test(sysOf(seen.posts.at(-1))) && jm.oneEach && jm.L === 1);
  chk(`you enter one bot; another one replaces it (${jm.mine.join(", ")})`, jm.swap && jm.mine.length === 1 && jm.mine[0] === "Second");
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
