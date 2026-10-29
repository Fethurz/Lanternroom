// v1.76: DMs answer again, comments stick to the listing and never repeat each other, counts never miss new things,
// a notification never moves you off the page you're on, no statuses, you're not the main character, and people
// remember you, keep up with the site and follow through on "I'll DM you".
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  let nU = 0; const seen = { comments: [], dm: [], ans: [], dress: [] }; let commentPlan = null, answerPlan = null;
  const json = body => {
    const s = sysOf(body), u = usrOf(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Dragon ${h} ${i}`, tags: ["vore"], summary: "A greedy dragon who guards a hoard of gold in a mountain cave.", appearance: "a", description: "d", scenario: "sc", firstMessage: "*The dragon yawns.*" })) }; }
    if (/write the comments people leave/.test(s)) { seen.comments.push(body); return { comments: commentPlan ? commentPlan(u) : [] }; }
    if (/cosmetics they've unlocked/.test(s)) { seen.dress.push(body); return { people: [] }; }
    if (/private messages with/.test(s)) { seen.dm.push(body); return { messages: ["heyy", "yeah i saw it"], leaving: false }; }
    const me = s.match(/^You are @(\S+)/); if (me) { seen.ans.push(body); return answerPlan ? answerPlan(me[1]) : { text: "haha fair, thanks", dm: false }; }
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY || DM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  chk("version 1.76 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1076));

  // ---------- 1. DMs answer
  const t1 = await pg.evaluate(() => {
    const now = Date.now(), out = { on: [], off: [] };
    for (const u of COMM.users.slice(0, 40)) for (let i = 0; i < 6; i++) { const d = dmOf(u.id); d.msgs = []; d.run = null; d.leftAt = 0; u.offUntil = 0; u.offFrom = 0;
      const r = dmDelay(u, now); (onBase(u, now) ? out.on : out.off).push([(r.seenAt - now) / 60e3, (r.due - r.seenAt) / 60e3, asleepAt(u, now) || nextSleep(u, now) - now < 7 * 3.6e6]); }
    return out;
  });
  const onMax = Math.max(...t1.on.map(x => x[0])), onDue = t1.on.map(x => x[1]).sort((a, c) => a - c);
  chk(`someone online sees it within ~1.5 min (max ${onMax.toFixed(1)}) and usually answers within minutes (median ${onDue[onDue.length >> 1]?.toFixed(1)} min)`, !t1.on.length || (onMax <= 1.6 && onDue[onDue.length >> 1] < 20));
  const awake = t1.off.filter(x => !x[2]).map(x => x[0]).sort((a, c) => a - c);
  chk(`someone awake (and not off to bed soon) but away sees it within a few hours at most (median ${awake[awake.length >> 1]?.toFixed(0)} min, max ${awake.at(-1)?.toFixed(0)} min)`, !awake.length || awake.at(-1) < 6.5 * 60);
  // the race: the community is reloaded while a reply is being written; the reply must still land
  const r1 = await pg.evaluate(async () => {
    const u = COMM.users[0]; COMM.dms[u.id] = { msgs: [], read: 0 }; COMM.dmq = COMM.dmq.filter(x => x.user !== u.id);
    dmSend(u.id, "hey did you see my new bot?"); const q = COMM.dmq.find(x => x.user === u.id); q.due = Date.now() + 1500; q.typingAt = Date.now() - 1000;
    await commFlush();
    const real = dmWrite; window.dmWrite = async (uu, qq) => { await commLoad(); await commLoad(); return real(uu, qq); };
    await dmPump(); window.dmWrite = real;
    await new Promise(r => setTimeout(r, 1800)); await dmPump(); await new Promise(r => setTimeout(r, 12000)); await dmPump(); await new Promise(r => setTimeout(r, 12000)); await dmPump();
    return { them: COMM.dms[u.id].msgs.filter(m => m.from === "them").map(m => m.text), q: COMM.dmq.filter(x => x.user === u.id).length };
  });
  chk(`a reply written while the community reloads still arrives (${r1.them.join(" / ")})`, r1.them.length === 2 && r1.q === 0);
  chk("the DM prompt says they keep up with the site", seen.dm.some(x => /keep up with the site/.test(usrOf(x))));

  // ---------- 2/3. comments: listing-only facts, never repeats
  const pid = await pg.evaluate(() => COMM.posts[0].id), c1h = await pg.evaluate(() => COMM.users[3].handle);
  await pg.evaluate(id => { COMM.comments[id] = [{ id: "c1", by: COMM.users[3].id, text: "I wish the dragon had a secret twin sister who eats knights", at: Date.now() - 6e5 }]; COMM.comments = { [id]: COMM.comments[id] }; COMM.tickC = 0; commSave(); }, pid);
  commentPlan = u => {
    const k = (u.match(/Listing key (\S+):/) || [])[1]; const h = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]).filter(x => x !== c1h);
    return [
      { on: k, by: h[0], about: "secret twin sister", text: "the secret twin sister is the best part, love how she eats knights", replyTo: "" }, // from a comment, not the listing
      { on: k, by: h[1], about: "", text: "I wish the dragon had a secret twin sister who eats knights!!", replyTo: "" }, // a copy
      { on: k, by: h[2], about: "hoard of gold", text: "a dragon sitting on a hoard of gold in a cave is such a comfy setup, the yawn opening got me", replyTo: "" },
      { on: k, by: h[3], about: "", text: "lmao a twin would be wild", replyTo: "c1" }
    ];
  };
  const made = await pg.evaluate(async id => { const real = commTargets; window.commTargets = () => [id]; const got = await commComments(4); window.commTargets = real; return got.filter(([t]) => t === id).map(([, c]) => c.text); }, pid);
  const cp = seen.comments.at(-1);
  chk("the comment prompt marks the listing as the only facts and earlier comments as opinions", /LISTING \(the only facts/.test(usrOf(cp)) && /EARLIER COMMENTS \(other people's opinions/.test(usrOf(cp)) && /never part of the bot/.test(sysOf(cp)));
  chk("…and asks for every comment to be different", /Every comment must be its own/.test(sysOf(cp)) && /Never echo/.test(sysOf(cp)));
  chk(`a new comment built on someone else's idea is dropped, a copy is dropped, a real one and a reply are kept (${made.length}: ${made.map(t => t.slice(0, 18)).join(" | ")})`, made.length === 2 && made.some(t => /hoard of gold/.test(t)) && made.some(t => /twin would be wild/.test(t)));
  chk("near-copies are caught", await pg.evaluate(() => cmSame("omg the vore scene in the cave is so hot, the gurgles!!", "the vore scene in the cave is SO hot, those gurgles") && !cmSame("love the gurgles", "the art style is gorgeous") && !cmSame("can you add a sequel", "the opening is too short")));
  commentPlan = null;

  // ---------- 4. new things always count, even with an earlier time
  const n4 = await pg.evaluate(async id => {
    commMarkRead(); const before = { act: actUnseen(), dot: commUnseen(), dm: dmUnread() };
    await new Promise(r => setTimeout(r, 30));
    const mine = { id: uid(), by: "me", text: "is there a sequel?", at: Date.now() - 4 * 6e5 };
    COMM.comments[id].push(mine); COMM.pending = [{ id: uid(), target: id, replyTo: mine.id, by: COMM.posts[0].by, due: Date.now() - 10 * 6e5 }]; // due before you last looked
    await commDoReplies();
    while (DM_BUSY) await new Promise(r => setTimeout(r, 50));
    const u = COMM.users[5]; COMM.dms[u.id] = { msgs: [], read: Date.now() - 5 }; COMM.dmq.push({ id: uid(), user: u.id, kind: "open", due: Date.now() - 6e5, parts: [{ text: "hi from earlier", at: Date.now() - 6e5 }] });
    await dmPump();
    commDot(); return { before, act: actUnseen(), dot: commUnseen(), dm: dmUnread(), btn: !document.getElementById("commDot")?.hidden };
  }, pid);
  chk(`a reply stamped before you last looked still lights the bell (${n4.before.act} → ${n4.act})`, n4.act === n4.before.act + 1);
  chk(`…and a DM that came in with an earlier time counts as unread (${n4.dm}), and the Community dot shows (${n4.dot})`, n4.dm >= 1 && n4.dot >= 2 && n4.btn);

  // ---------- 5. notifications never move you off your page
  const p5 = await pg.evaluate(async id => {
    await openCommunity("home"); openPost(id); const post = HUB.cur.title;
    openCommUser(COMM.users[2].id); const prof = HUB.cur.title; hubBack(); const back = HUB.cur.title;
    commRedraw(); await new Promise(r => setTimeout(r, 50)); dmRedraw(); const after = HUB.cur.title; const depth = HUB.stack.length;
    await commTick(true); while (COMM_BUSY) await new Promise(r => setTimeout(r, 50));
    return { post, prof, back, after, depth, after2: HUB.cur.title, depth2: HUB.stack.length };
  }, pid);
  chk(`after going back to a bot, new activity redraws that bot, not the profile you left (${p5.back} → ${p5.after} → ${p5.after2})`, p5.back === p5.post && p5.after === p5.post && p5.after2 === p5.post && p5.depth2 === p5.depth);
  chk("…on a tab page too", await pg.evaluate(async () => { hubTab("feed"); commRedraw(); return HUB.tab === "feed" && HUB.cur.title === "__tab"; }));
  chk("typing in Edit profile is never redrawn away", await pg.evaluate(async () => { openMeEdit(); $("meBio").value = "half typed"; $("meBio").blur(); commRedraw(); return $("meBio")?.value === "half typed"; }));

  // ---------- 6. no statuses
  await pg.evaluate(async () => { for (const u of COMM.users) u.status = "just posted a new bot!!"; COMM.me.status = "hi"; commSave(); await commTick(true); while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  chk("old statuses are cleared", await pg.evaluate(() => COMM.users.every(u => !u.status)));
  chk("profiles show no status line, Edit profile has no status box", await pg.evaluate(() => { openCommUser(COMM.users[1].id); const a = !cbody().querySelector(".cm-stline"); hubTab("you"); const c = !cbody().querySelector(".cm-stline"); openMeEdit(); return a && c && !$("meStatus"); }));
  chk("outfits no longer ask for a status", await pg.evaluate(async () => { COMM.users[7].fit = null; await commDress([COMM.users[7]]); return true; }) && !/"status"/.test(sysOf(seen.dress.at(-1) || { messages: [{ content: "" }] })));
  chk("the profile-update prompt asks for no status", await pg.evaluate(() => !/"status"/.test(commProfileUpdates.toString())));

  // ---------- 7. not the main character
  const share = await pg.evaluate(async () => {
    const c = S.chars[0]; COMM.pub[c.id] = { on: true, at: Date.now() - 3 * 864e5, since: Date.now() - 3 * 864e5, heat: 1 }; COMM.comments["bot:" + c.id] = [1, 2, 3, 4].map(i => ({ id: "m" + i, by: COMM.users[i].id, text: "x" + i, at: Date.now() - 864e5 }));
    let k = 0; for (let i = 0; i < 400; i++) if (commTargets(2).includes("bot:" + c.id)) k++; return k / 400;
  });
  chk(`your public bot is one listing among many in comment rounds (${Math.round(share * 100)}% of rounds)`, share < 0.25);
  chk("blog writers are told you're one member among thousands", await pg.evaluate(() => /one of thousands of members/.test(commBlogs.toString())));

  // ---------- 8. memory, keeping up, following through
  const mem = await pg.evaluate(async id => {
    const u = COMM.users.find(x => x.id === COMM.posts[0].by), c = S.chars[0];
    const mine = { id: "mx", by: "me", text: "would you be up to talk in DMs about bot ideas?", at: Date.now() - 2000 }; COMM.comments[id].push(mine);
    COMM.comments[id].push({ id: "ux", by: u.id, text: "your dragon bot ideas sound sick", replyTo: "c1", at: Date.now() - 1000 });
    COMM.dmq = COMM.dmq.filter(x => x.user !== u.id);
    await commAnswer({ id: uid(), target: id, replyTo: mine.id, by: u.id, due: Date.now() });
    const q = COMM.dmq.find(x => x.user === u.id && x.kind === "open");
    const k = dmKnows(u, { dms: true });
    return { q: !!q, reason: q?.reason || "", dueMin: q ? (q.due - Date.now()) / 60e3 : -1, k, bot: c.name };
  }, pid);
  const ap = seen.ans.at(-1);
  chk("a reply to you sees your history together and the site news", /What you know about/.test(usrOf(ap)) && /In the comments on/.test(usrOf(ap)) && /keep up with the site/.test(sysOf(ap)));
  chk(`what they know lists your public bot with when you shared it (${mem.bot})`, mem.k.includes(`"${mem.bot}"`) && /shared \d+ days ago/.test(mem.k));
  chk("…your comment talks in order, and what's new on the site", /In the comments on .*\n\s+.*: "/.test(mem.k) && /On the site lately/.test(mem.k));
  answerPlan = () => ({ text: "ooh sure, I'll dm you in a bit", dm: true });
  const fol = await pg.evaluate(async id => {
    const u = COMM.users.find(x => x.id === COMM.posts[0].by); COMM.dmq = COMM.dmq.filter(x => x.user !== u.id);
    const mine = { id: "my2", by: "me", text: "can I message you about this?", at: Date.now() }; COMM.comments[id].push(mine);
    await commAnswer({ id: uid(), target: id, replyTo: mine.id, by: u.id, due: Date.now() });
    const q = COMM.dmq.find(x => x.user === u.id && x.kind === "open"); if (!q) return { q: false };
    const due = (q.due - Date.now()) / 60e3; q.due = Date.now() + 1000; q.typingAt = Date.now() - 1000;
    await dmPump(); await new Promise(r => setTimeout(r, 1500)); await dmPump(); await new Promise(r => setTimeout(r, 12000)); await dmPump();
    return { q: true, due, msgs: COMM.dms[u.id]?.msgs.filter(m => m.from === "them").length || 0 };
  }, pid);
  chk(`someone who says "I'll DM you" does, within minutes (${fol.due?.toFixed(1)} min)`, fol.q && fol.due > 0 && fol.due < 45 && fol.msgs >= 1);
  chk("…and their first message knows it's following up on the comments", /following through/.test(usrOf(seen.dm.at(-1))) && !/out of the blue/.test(usrOf(seen.dm.at(-1))));
  answerPlan = null;
  chk("a plain thank-you queues no DM", await pg.evaluate(async id => { const u = COMM.users[9]; COMM.dmq = COMM.dmq.filter(x => x.user !== u.id); const mine = { id: "my3", by: "me", text: "nice bot", at: Date.now() }; COMM.comments[id].push(mine); await commAnswer({ id: uid(), target: id, replyTo: mine.id, by: u.id, due: Date.now() }); return !COMM.dmq.some(x => x.user === u.id); }, pid));

  // merging keeps unsaved and running work
  chk("reloading keeps the same queue entries and people (work in progress isn't thrown away)", await pg.evaluate(async () => { const u = COMM.users[0], q = { id: uid(), user: u.id, kind: "reply", due: Date.now() + 9e9 }; COMM.dmq.push(q); commSave(); await commLoad(); const same = COMM.dmq.find(x => x.id === q.id) === q && COMM.users[0] === u; COMM.dmq = COMM.dmq.filter(x => x.id !== q.id); commSave(); return same; }));
  chk("…and something removed on another device is removed here once nothing is unsaved", await pg.evaluate(async () => { await commFlush(); const v = await Store.get("comm"); const gone = v.blogs[0]?.id || null; v.blogs = v.blogs.slice(1); await Store.set("comm", v); COMM_DIRTY = false; await commLoad(); return !gone || !COMM.blogs.some(x => x.id === gone); }));
  const sideways = await pg.evaluate(() => { hubTab("home"); return document.documentElement.scrollWidth <= innerWidth + 1; });
  chk("no sideways scroll", sideways);
  await pg.evaluate(() => hubClose());
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
