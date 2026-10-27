// v1.71: online status from one schedule per person (sessions), "active … ago" only grows, people see and answer only while online.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nU = 0;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${i}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/a real person who uses/.test(s)) return { messages: ["hey", "whats up"] };
    if (/^You are @/.test(s)) return { text: "ty!!" };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();

  const walk = await pg.evaluate(() => {
    const t0 = Date.now(), out = { back: 0, flick: 0, shortOn: 0, onMin: 0, total: 0, mismatch: 0, sleepOn: 0, people: 0, someOn: 0 };
    for (const u of COMM.users) { out.people++; let prevSeen = null, prevOn = null, run = 0, anyOn = false, first = true;
      for (let m = 0; m < 36 * 60; m++) { const t = t0 + m * 60e3, on = isOnline(u, t), ls = lastSeen(u, t); out.total++;
        if (on) { out.onMin++; anyOn = true; if (ls !== t) out.mismatch++; if (asleepAt(u, t) && !(u.last && t - u.last < 5 * 60e3)) out.sleepOn++; }
        else { if (prevSeen != null && prevOn === false && ls < prevSeen) out.back++; if (ls > t) out.back++; }
        if (prevOn !== null && on !== prevOn) { if (prevOn && run < 3 && !first) out.shortOn++; run = 0; first = false; }
        run++; prevSeen = on ? null : ls; prevOn = on; }
      if (anyOn) out.someOn++; }
    return out;
  });
  chk(`"active … ago" never goes back while someone stays offline (${walk.back} times)`, walk.back === 0);
  chk(`online sessions last minutes, not flickers (${walk.shortOn} sessions under 3 min)`, walk.shortOn === 0);
  chk("while online, last seen is now", walk.mismatch === 0);
  chk(`nobody shows online while asleep (${walk.sleepOn})`, walk.sleepOn === 0);
  chk(`everyone is online sometimes in a day and a half (${walk.someOn}/${walk.people}), mostly offline (${Math.round(100 * walk.onMin / walk.total)}% online)`, walk.someOn === walk.people && walk.onMin / walk.total < 0.45 && walk.onMin / walk.total > 0.04);
  chk("the same answer every time (no randomness on each look)", await pg.evaluate(() => { const t = Date.now() + 3.7e6; return COMM.users.every(u => isOnline(u, t) === isOnline(u, t) && lastSeen(u, t) === lastSeen(u, t)); }));
  chk("seenText counts up minute by minute for an offline person", await pg.evaluate(() => { const t0 = Date.now(); for (const u of COMM.users) { for (let m = 0; m < 600; m++) { const t = t0 + m * 60e3; if (!isOnline(u, t) && !isOnline(u, t + 60e3) && !isOnline(u, t + 120e3)) { const a = t - lastSeen(u, t), b = t + 120e3 - lastSeen(u, t + 120e3); return Math.round(b - a) === 120e3; } } } return false; }));
  // DMs to someone offline: they see it and answer only once they come online
  const dm = await pg.evaluate(() => { const now = Date.now(), bad = [], res = [];
    for (const u of COMM.users) for (let k = 0; k < 20; k++) { const t = now + k * 47 * 60e3; if (onBase(u, t)) continue; const r = dmDelay(u, t);
      const seenOn = Array.from({ length: 140 }, (_, i) => r.seenAt - i * 1000).some(x => onBase(u, x));
      const dueOn = Array.from({ length: 200 }, (_, i) => r.due - i * 1000).some(x => onBase(u, x));
      res.push(1); if (!(r.seenAt > t && r.due > r.seenAt && seenOn && dueOn)) bad.push([u.handle, k, r.seenAt - t, r.due - t, seenOn, dueOn]); }
    return { n: res.length, bad: bad.slice(0, 5), nb: bad.length }; });
  chk(`messages to offline people are seen and answered only when they're on (${dm.n} tries, ${dm.nb} wrong)`, dm.n > 50 && dm.nb === 0); if (dm.nb) console.log(JSON.stringify(dm.bad));
  // a real send: offline now, Seen and the reply later, and they show online at those moments
  const send = await pg.evaluate(async () => { const now = Date.now(), u = COMM.users.find(x => !isOnline(x, now) && !asleepAt(x, now)) || COMM.users.find(x => !isOnline(x, now)); if (!u) return null;
    dmSend(u.id, "hey are you around?"); const m = COMM.dms[u.id].msgs.at(-1), q = COMM.dmq.find(x => x.user === u.id);
    return { offNow: !isOnline(u, now + 500), seenLater: m.seenAt > now, onAtSeen: isOnline(u, m.seenAt), onTyping: isOnline(u, q.typingAt), onDue: isOnline(u, q.due), text: seenText(u) }; });
  chk("after you message someone offline they stay offline until they read it", send && send.offNow && send.seenLater && /^active/.test(send.text));
  chk("…they're online when they see it, while typing and when the reply arrives", send && send.onAtSeen && send.onTyping && send.onDue);
  // comment replies wait until the person is on
  const cm = await pg.evaluate(() => { const t = COMM.posts[0].id, mine = { id: uid(), by: "me", text: "love it", at: Date.now() }; (COMM.comments[t] = COMM.comments[t] || []).push(mine); COMM.pending = []; let ok = 0, n = 0;
    for (let i = 0; i < 30; i++) { COMM.pending = []; commSchedule(t, mine); for (const p of COMM.pending) { n++; const u = userOf(p.by); if (Array.from({ length: 300 }, (_, k) => p.due - k * 1000).some(x => onBase(u, x))) ok++; } }
    return { ok, n }; });
  chk(`comment replies are written when the person is online (${cm.ok}/${cm.n})`, cm.n > 0 && cm.ok === cm.n);
  // the DM header and list agree
  await pg.evaluate(() => openCommunity("dms")); await pg.waitForTimeout(300);
  chk("the Messages list dot matches the status", await pg.evaluate(() => [...document.querySelectorAll("#hubBody .dm-row")].every(r => !!r.querySelector(".dm-on") === isOnline(userOf(r.dataset.dm)))));
  await pg.evaluate(() => hubClose());
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
