// v1.72: people say bye when their time runs out (or whenever it fits) and go offline for a while; invested people stay longer, some past bedtime.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nU = 0, leave = false;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${i}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/a real person who uses/.test(s)) return leave ? { messages: ["omg i gotta go", "night!!"], leaving: true } : { messages: ["haha yeah"], leaving: false };
    if (/^You are @/.test(s)) return { text: "ty!!" };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  const lastDM = () => calls.filter(c => /a real person who uses/.test(sysOf(c))).at(-1);

  // a person who's awake now, with a chat going
  const id = await pg.evaluate(() => { const now = Date.now(), u = COMM.users.find(x => !asleepAt(x, now) && nextSleep(x, now) - now > 3 * 3.6e6) || COMM.users[0]; u.sleep = u.sleep || [0, 8];
    const d = dmOf(u.id); d.msgs = []; for (let i = 0; i < 4; i++) d.msgs.push({ id: uid(), from: i % 2 ? "them" : "me", text: "hey there how are you doing today", at: now - (8 - i) * 60e3, seenAt: now - (8 - i) * 60e3 + 5000 }); d.read = now; delete d.run; delete d.leftAt; delete u.offFrom; delete u.offUntil; return u.id; });
  // plenty of time: the prompt says so, and offers the bye
  await pg.evaluate(async id => { const u = userOf(id), d = dmOf(id); dmRunOf(u, d, Date.now()); d.run.until = Date.now() + 40 * 60e3; await dmWrite(u, { kind: "reply", due: Date.now() + 30e3 }); }, id);
  chk("with time left, the prompt says they can keep chatting and may still end it when it fits", /You have time to keep chatting/.test(sysOf(lastDM())) && /end it whenever it fits/.test(sysOf(lastDM())) && /"leaving"/.test(sysOf(lastDM())));
  await pg.evaluate(async id => { const u = userOf(id), d = dmOf(id); d.run.until = Date.now() + 6 * 60e3; await dmWrite(u, { kind: "reply", due: Date.now() + 30e3 }); }, id);
  chk("when their time is nearly up, they're told to wrap up and say bye their own way", /You have to log off in a few minutes/.test(sysOf(lastDM())) && /say you have to go/.test(sysOf(lastDM())));
  // they say bye: texts arrive, then they go offline and your next message waits
  leave = true;
  const bye = await pg.evaluate(async id => { const u = userOf(id), now = Date.now(); COMM.dmq = COMM.dmq.filter(x => x.user !== id); COMM.dmq.push({ id: uid(), user: id, kind: "reply", due: now + 500, typingAt: now - 1000 }); await dmPump(); await new Promise(r => setTimeout(r, 1500)); for (let i = 0; i < 40 && COMM.dmq.some(x => x.user === id); i++) { await dmPump(); await new Promise(r => setTimeout(r, 400)); }
    const d = dmOf(id), last = d.msgs.at(-1);
    return { texts: d.msgs.filter(m => m.from === "them").slice(-2).map(m => m.text), leftAt: d.leftAt, lastAt: last.at, onLater: isOnline(u, last.at + 2 * 60e3), offUntil: u.offUntil, onAfter: isOnline(u, u.offUntil + 1) || nextOnline(u, u.offUntil) >= u.offUntil }; }, id);
  chk(`their goodbye texts arrive (${bye.texts.join(" / ")})`, bye.texts.join("|") === "omg i gotta go|night!!" && bye.leftAt === bye.lastAt);
  chk("…then they're offline for a while", bye.onLater === false && bye.offUntil - bye.lastAt >= 30 * 60e3);
  leave = false;
  const after = await pg.evaluate(id => { const u = userOf(id); dmSend(id, "wait one more thing!"); const d = dmOf(id), m = d.msgs.at(-1), q = COMM.dmq.find(x => x.user === id); return { seen: m.seenAt, due: q.due, off: u.offUntil, online: isOnline(u, Date.now() + 60e3), typingNow: isOnline(u, Date.now()) }; }, id);
  chk("a message after they left isn't seen or answered until they're back", after.seen >= after.off && after.due > after.off && !after.online);
  // staying up: bedtime in 5 minutes, a long invested chat, a night owl
  const late = await pg.evaluate(() => {
    const now = Date.now(), pick = [...COMM.users].sort((a, c) => owlOf(c) - owlOf(a)), out = {};
    const setup = (u, n, longText) => { const h = localHour(u, now); u.sleep = [(h + 5 / 60) % 24, (h + 7) % 24]; delete u.offFrom; delete u.offUntil; COMM.dmq = COMM.dmq.filter(x => x.user !== u.id);
      const d = dmOf(u.id); d.msgs = []; delete d.leftAt; for (let i = 0; i < n; i++) d.msgs.push({ id: uid(), from: i % 2 ? "them" : "me", text: longText ? "honestly this is the most fun I've had talking about bots in ages, tell me more about how you write yours" : "lol", at: now - (n - i) * 60e3, seenAt: now - (n - i) * 60e3 + 3000 });
      d.run = { start: now - n * 60e3, last: now - 60e3, until: now + 4 * 60e3, bed: nextSleep(u, now), ext: 0 }; return d; };
    // invested night owl
    const a = pick[0], da = setup(a, 18, true); for (let i = 0; i < 30 && da.run.until <= da.run.bed; i++) dmRunTouch(a, now);
    out.owl = owlOf(a); out.past = (da.run.until - da.run.bed) / 60e3; out.ext = da.run.ext;
    const r1 = dmDelay(a, now + 3 * 60e3); out.dueSoon = (r1.due - now) / 60e3;
    // barely talking, not an owl
    const z = pick.at(-1), dz = setup(z, 2, false); for (let i = 0; i < 30; i++) dmRunTouch(z, now);
    out.zPast = dz.run.until > dz.run.bed; const r2 = dmDelay(z, now + 8 * 60e3); out.zLast = !!r2.last; out.zDue = (r2.due - now) / 3.6e6; COMM.dmq = COMM.dmq.filter(x => x.user !== z.id); dmLeave(z, dz, now + 9 * 60e3); const r3 = dmDelay(z, now + 30 * 60e3); out.zNext = (r3.due - now) / 3.6e6; out.zAwakeAtDue = !asleepAt(z, r3.due);
    out.aId = a.id; return out; });
  chk(`an invested night owl stays up past bedtime (${Math.round(late.past)} min past, ${late.ext} extensions)`, late.past > 5 && late.ext >= 1);
  chk(`…and keeps answering in the moment (${late.dueSoon.toFixed(1)} min), not the next morning`, late.dueSoon < 30);
  chk(`someone barely talking goes to bed on time: a quick goodnight, then the next answer after waking (${late.zNext.toFixed(1)} h)`, !late.zPast && late.zLast && late.zDue < 0.2 && late.zNext > 5 && late.zAwakeAtDue);
  await pg.evaluate(async id => { const u = userOf(id), d = dmOf(id); await dmWrite(u, { kind: "reply", due: d.run.bed + 10 * 60e3 }); }, late.aId);
  chk("past bedtime the prompt says they stayed up because they're enjoying it", /past when you'd normally be asleep/.test(sysOf(lastDM())));
  chk("staying up shows them online while they chat", await pg.evaluate(id => { const u = userOf(id), d = dmOf(id); dmSend(id, "you still up?"); const q = COMM.dmq.find(x => x.user === id); return asleepAt(u, q.due) ? isOnline(u, q.due) : true; }, late.aId));
  const cap = await pg.evaluate(id => { const u = userOf(id), d = dmOf(id), now = Date.now(); for (let i = 0; i < 200; i++) { d.run.ext = 0; dmRunTouch(u, d.run.until - 60e3); }
    return { past: (d.run.until - d.run.bed) / 60e3, max: 30 + 150 * owlOf(u) }; }, late.aId);
  chk(`even the most invested night owl stops by their limit (${Math.round(cap.past)} of at most ${Math.round(cap.max)} min past bedtime, never over 3 h)`, cap.past <= cap.max + 0.01 && cap.max <= 180);
  // time ran out mid-conversation: one quick goodnight, even if the writer forgets to say it, then off till morning
  const gn = await pg.evaluate(async id => { while (COMM_BUSY) await new Promise(z => setTimeout(z, 50)); COMM_BUSY = true; const u = userOf(id), d = dmOf(id), now = Date.now(), h = localHour(u, now); u.sleep = [(h + 22) % 24, (h + 6) % 24]; delete u.offFrom; delete u.offUntil; delete d.leftAt; COMM.dmq = COMM.dmq.filter(x => x.user !== id);
    d.msgs.push({ id: uid(), from: "them", text: "lmao", at: now - 60e3 }); d.run = { start: now - 90 * 60e3, last: now - 60e3, until: now - 2 * 60e3, bed: now - 2 * 3.6e6, ext: 3 };
    dmSend(id, "nooo one more story"); const q = COMM.dmq.find(x => x.user === id); const r = { last: !!q.last, soon: (q.due - now) / 60e3 };
    q.due = Date.now() + 300; q.typingAt = Date.now() - 1000; for (let i = 0; i < 40 && COMM.dmq.some(x => x.user === id); i++) { await dmPump(); await new Promise(z => setTimeout(z, 300)); }
    COMM_BUSY = false; const u2 = userOf(id), d2 = dmOf(id); r.left = !!d2.leftAt; r.offTill = (u2.offUntil - now) / 3.6e6; r.awakeThen = !asleepAt(u2, u2.offUntil); return r; }, late.aId);
  chk(`out of time mid-chat: a quick goodnight (${gn.soon.toFixed(1)} min), not silence`, gn.last && gn.soon < 3 && /This is your goodbye/.test(sysOf(lastDM())) && /really need to sleep/.test(sysOf(lastDM())));
  chk(`…then they're off until after they wake (${gn.offTill.toFixed(1)} h), even though the writer didn't say bye`, gn.left && gn.offTill > 3 && gn.awakeThen);
  chk("leaving at bedtime keeps them off until after they wake", await pg.evaluate(() => { const u = COMM.users[7], d = dmOf(u.id), now = Date.now(), h = localHour(u, now); u.sleep = [(h + 0.25) % 24, (h + 8) % 24]; dmLeave(u, d, now); return !asleepAt(u, u.offUntil) && u.offUntil - now > 7 * 3.6e6 && !isOnline(u, now + 60e3); }));
  chk("two devices keep the conversation's time and the goodbye", await pg.evaluate(() => { const m = commMerge({ dms: { a: { msgs: [], read: 1, run: { start: 1, last: 5, until: 9 }, leftAt: 3 } } }, { dms: { a: { msgs: [], read: 2, run: { start: 1, last: 2, until: 4 } } } }); return m.dms.a.run.until === 9 && m.dms.a.leftAt === 3; }));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
