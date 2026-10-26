// v1.63: 36 distinct regulars and private messages timed like real texting.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nUsers = 0, burst = ["hey!!", "omg hi", "what's up"];
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const slots = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: slots }, (_, i) => { const k = ++nUsers; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore", "dragon"], voice: "quirky" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { posts: hs.map(h => ({ by: h, kind: "character", name: `Bot of ${h}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/write the comments people leave/.test(s)) return { comments: [] };
    if (/a real person who uses/.test(s)) return { messages: burst };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  await pg.evaluate(async () => { await commLoad(); await commTick(true); });
  // ---- the people
  const ppl = await pg.evaluate(() => { const us = COMM.users; return { n: us.length, styles: new Set(us.map(u => u.style)).size, places: new Set(us.map(u => u.place)).size, roles: new Set(us.map(u => u.role)).size, clocks: us.every(u => typeof u.tz === "number" && Array.isArray(u.sleep) && u.speed && u.age >= 19), sys: "" }; });
  chk(`36 regulars, each a different mix (${ppl.styles} typing styles, ${ppl.places} places, ${ppl.roles} roles)`, ppl.n === 36 && ppl.styles >= 24 && ppl.places >= 20 && ppl.roles >= 10 && ppl.clocks);
  chk("the people prompt hands out the slots (style, place, age, role, focus)", calls.filter(c => /You invent the regulars/.test(sysOf(c))).length === 3 && calls.some(c => /You invent the regulars/.test(sysOf(c)) && /-year-old/.test(userOf_(c)) && /types:/.test(userOf_(c)) && /loves/.test(userOf_(c))));
  // people from v1.62 get a clock too
  chk("people from before get their own clock and habits", await pg.evaluate(() => { COMM.users.push({ id: "old1", name: "Old", handle: "old", bio: "b", taste: [], voice: "dry", color: "#888", at: 1 }); const ch = commFillSlots(); const o = userOf("old1"); return ch && typeof o.tz === "number" && o.style === "dry"; }));
  // ---- their clock
  const clk = await pg.evaluate(() => { const u = { id: "z", tz: 0, sleep: [0, 8], speed: "fast", active: 1 }; const night = Date.UTC(2026, 9, 26, 3, 0), day = Date.UTC(2026, 9, 26, 14, 0); return { asleep: asleepAt(u, night), awake: !asleepAt(u, day), wake: new Date(wakeAfter(u, night)).getUTCHours(), onlineNight: isOnline(u, night) }; });
  chk("asleep at night in their timezone, awake by day, never online asleep", clk.asleep && clk.awake && clk.wake === 8 && !clk.onlineNight);
  const del = await pg.evaluate(() => {
    COMM.dms = {}; const now = Date.now();
    const fast = { ...COMM.users[0], id: "f1", speed: "fast", active: 1, tz: 0, sleep: [new Date(now).getUTCHours() + 12 % 24, (new Date(now).getUTCHours() + 13) % 24] };
    fast.sleep = [(new Date(now).getUTCHours() + 10) % 24, (new Date(now).getUTCHours() + 12) % 24];
    const slow = { ...fast, id: "s1", speed: "slow" }, sleeper = { ...fast, id: "z1", sleep: [(new Date(now).getUTCHours() + 23) % 24, (new Date(now).getUTCHours() + 3) % 24] };
    const ds = n => Array.from({ length: n }, () => dmDelay(fast, now).due - now), dz = dmDelay(sleeper, now);
    return { fastMax: Math.max(...ds(40)), fastMin: Math.min(...ds(40)), slowMed: Array.from({ length: 40 }, () => dmDelay(slow, now).due - now).sort((a, b) => a - b)[20], sleeperAfterWake: dz.due >= wakeAfter(sleeper, now), seenBefore: dz.seenAt <= dz.due };
  });
  chk(`reply times follow the person: fast ${Math.round(del.fastMin / 1e3)}s+, slow ~${Math.round(del.slowMed / 6e4)} min`, del.fastMin >= 30e3 && del.slowMed > 20 * 60e3);
  chk("someone asleep answers after they wake, and sees it first", del.sleeperAfterWake && del.seenBefore);
  // ---- a conversation
  const uid0 = await pg.evaluate(() => { const u = COMM.users.find(x => x.style); u.sleep = [(new Date().getUTCHours() + u.tz + 10 + 24) % 24, (new Date().getUTCHours() + u.tz + 11 + 24) % 24].map(h => Math.floor(h)); return u.id; });
  await pg.evaluate(id => openCommUser(id), uid0); await wait(300);
  chk("a profile shows when they were last around and a Message button", !!await pg.$("#cmDM") && /online|active/.test(await pg.textContent(".cm-status")));
  await pg.click("#cmDM"); await wait(300);
  chk("the DM window opens with their status", !!await pg.$(".dm-list") && /online|active/.test(await pg.textContent(".dm-st")));
  await pg.fill("#dmIn", "hey, loved your bot!"); await pg.click("#dmSend"); await wait(300);
  const q1 = await pg.evaluate(id => { const q = COMM.dmq.filter(x => x.user === id); return { n: q.length, wait: q[0] && q[0].due - Date.now(), mine: dmOf(id).msgs.length }; }, uid0);
  chk(`your message is sent and their reply is on its way (in ${Math.round(q1.wait / 1e3)}s), not instant`, q1.n === 1 && q1.mine === 1 && q1.wait > 10e3);
  await pg.fill("#dmIn", "the opening especially"); await pg.click("#dmSend"); await wait(200);
  chk("a second message doesn't queue a second reply", await pg.evaluate(id => COMM.dmq.filter(x => x.user === id).length === 1 && dmOf(id).msgs.length === 2, uid0));
  // time passes: typing… then the texts arrive one after another
  await pg.evaluate(id => { const q = COMM.dmq.find(x => x.user === id); q.typingAt = Date.now() - 1000; q.due = Date.now() + 6000; dmOf(id).msgs.forEach(m => { m.seenAt = Date.now() - 500; }); }, uid0);
  await pg.evaluate(() => DM_VIEW()); await wait(200);
  chk("they're shown typing, and your message as Seen", await pg.evaluate(() => !!document.querySelector(".dm-typing") && /Seen/.test(document.querySelector(".dm-list").textContent)));
  await pg.evaluate(() => dmPump()); await wait(400);
  const mid = await pg.evaluate(id => ({ them: dmOf(id).msgs.filter(m => m.from === "them").length, parts: COMM.dmq.find(x => x.user === id)?.parts?.length }), uid0);
  chk("the reply is written before it's due, but held until then", mid.them === 0 && mid.parts === 3);
  await wait(6500); await pg.evaluate(() => dmPump()); await wait(300);
  const got = await pg.evaluate(id => { const th = dmOf(id).msgs.filter(m => m.from === "them"); return { n: th.length, gaps: th.slice(1).map((m, i) => m.at - th[i].at) }; }, uid0);
  chk(`the first text arrives, the others follow seconds apart (${got.n} so far)`, got.n >= 1 && got.n < 3 || got.gaps.every(g => g >= 2000));
  await pg.evaluate(id => { const q = COMM.dmq.find(x => x.user === id); if (q?.parts) q.parts.forEach(p => { p.at = Date.now() - 1; }); }, uid0);
  await pg.evaluate(() => dmPump()); await wait(300); await pg.evaluate(() => DM_VIEW()); await wait(200);
  chk("all three texts arrive as separate bubbles", await pg.evaluate(id => dmOf(id).msgs.filter(m => m.from === "them").length === 3 && document.querySelectorAll(".dm-m.them .dm-b").length === 3 && !document.querySelector(".dm-typing"), uid0));
  const dsys = calls.filter(c => /a real person who uses/.test(sysOf(c))).at(-1);
  chk("the DM prompt: a real person with their age, place, local time and typing style", dsys && /You are Person \d+ \(@p\d+\)/.test(sysOf(dsys)) && /year-old/.test(sysOf(dsys)) && /right now it's \w+day \d\d:\d\d/.test(sysOf(dsys)) && /How you type:/.test(sysOf(dsys)));
  chk("…never admits being an AI, keeps the adults line, sees the whole conversation", /never say or hint that you are an AI/.test(sysOf(dsys)) && /fully grown, mature being/.test(sysOf(dsys)) && /loved your bot/.test(userOf_(dsys)) && /opening especially/.test(userOf_(dsys)));
  // the app was closed: replies that came in meanwhile show with their own times
  burst = ["sorry was asleep lol", "but yes!!"];
  await pg.fill("#dmIn", "you there?"); await pg.click("#dmSend"); await wait(200);
  // as if "you there?" was sent four hours ago and they answered three hours ago, while the app was closed
  await pg.evaluate(id => { const d = dmOf(id), m = d.msgs.at(-1); m.at = Date.now() - 4 * 3.6e6; m.seenAt = null; const q = COMM.dmq.find(x => x.user === id); q.due = Date.now() - 3 * 3.6e6; q.typingAt = q.due - 20e3; }, uid0);
  await pg.evaluate(() => dmPump()); await wait(400); await pg.evaluate(() => dmPump()); await wait(300);
  chk("replies that came while the app was closed keep their real times", await pg.evaluate(id => { const th = dmOf(id).msgs.filter(m => m.from === "them").slice(-2); return th.length === 2 && Date.now() - th[0].at > 2.9 * 3.6e6 && th[1].at > th[0].at; }, uid0));
  await pg.evaluate(() => { hubClose(); closeSheet(); });
  // ---- someone messages first
  burst = ["hiii saw u liked my bot 👀"];
  const opener = await pg.evaluate(() => { const p = COMM.posts.find(x => userOf(x.by) && !COMM.dms[x.by]); const u = userOf(p.by); u.sleep = [(Math.floor(localHour(u)) + 8) % 24, (Math.floor(localHour(u)) + 9) % 24]; COMM.liked[p.id] = { v: true, at: Date.now() }; COMM.dmNext = Date.now() - 1; COMM.dmq = COMM.dmq.filter(x => x.kind !== "open"); dmMaybeOpen(); const q = COMM.dmq.find(x => x.kind === "open"); return q && { user: q.user, by: p.by, reason: q.reason, wait: q.due - Date.now() }; });
  chk(`now and then someone messages you first (${opener?.reason?.slice(0, 40)}…)`, opener && opener.wait > 0 && /liked your bot|saved your bot|comments|public bot|haven't talked/.test(opener.reason));
  await pg.evaluate(() => { const q = COMM.dmq.find(x => x.kind === "open"); q.due = Date.now() - 1000; q.typingAt = q.due - 1000; COMM.seen = { at: Date.now() - 5000 }; });
  await pg.evaluate(() => dmPump()); await wait(400); await pg.evaluate(() => { const q = COMM.dmq.find(x => x.kind === "open"); if (q?.parts) q.parts.forEach(p => { p.at = Date.now() - 1; }); return dmPump(); }); await wait(400); await pg.evaluate(() => commDot()); await wait(100);
  const un = await pg.evaluate(() => ({ unread: dmUnread(), dot: (document.documentElement.classList.contains("wide") ? $("railCommDot") : $("commDot")).textContent, toast: !!document.querySelector(".dm-toast") }));
  chk("their message shows as unread, lights the dot and pops a notice", un.unread >= 1 && +un.dot >= 1 && un.toast);
  chk("the opener's prompt says why they're writing", calls.some(c => /a real person who uses/.test(sysOf(c)) && /messaging .* first/.test(userOf_(c)) && /liked your bot/.test(userOf_(c))));
  await pg.evaluate(() => openCommunity("dms")); await wait(300);
  chk("Messages tab lists your chats, newest first, with unread counts", await pg.evaluate(() => document.querySelectorAll(".dm-row").length === 2 && !!document.querySelector(".dm-row.un .dm-n") && /\d/.test(document.querySelector('[data-ht="dms"] .hub-n')?.textContent || "")));
  await pg.click(".dm-row.un"); await wait(400);
  chk("opening a chat marks it read", await pg.evaluate(() => dmUnread() === 0));
  await pg.evaluate(() => { hubClose(); closeSheet(); });
  // ---- two devices' DMs merge
  chk("DMs from two devices merge", await pg.evaluate(() => { const a = { ...commBlank(), dms: { u: { msgs: [{ id: "1", at: 1 }], read: 5 } } }, b2 = { ...commBlank(), dms: { u: { msgs: [{ id: "2", at: 2 }], read: 9 } }, dmq: [{ id: "q" }] }; const m = commMerge(a, b2); return m.dms.u.msgs.length === 2 && m.dms.u.read === 9 && m.dmq.length === 1; }));
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
