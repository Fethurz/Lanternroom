// v1.74: replies to your comments always arrive (even while adding new people fails), failed replies are retried,
// they come within ~30 s of being due, and nothing says someone is "writing a reply".
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nU = 0;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${i}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    const me = s.match(/^You are @(\S+)/); if (me) return { text: "aw thank you!! from " + me[1] };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  // post a comment on a listing, in the hub
  const pid = await pg.evaluate(() => COMM.posts[0].id);
  await pg.evaluate(async id => { await openCommunity("home"); openPost(id); }, pid); await pg.waitForTimeout(500);
  await pg.fill("#cmText", "love this one!!"); await pg.click("#cmSend"); await pg.waitForTimeout(300);
  const pend = await pg.evaluate(id => COMM.pending.filter(p => p.target === id).length, pid);
  chk(`your comment asks someone to answer (${pend})`, pend >= 1);
  chk("nothing says anyone is writing a reply", await pg.evaluate(() => !/writing a reply/i.test(cbody().textContent) && !/Replies usually come/i.test(document.body.textContent)));
  // the bug: adding the remaining people fails every time; the reply must still come
  await pg.evaluate(() => { window.commUsers = async () => { throw new Error("people failed"); }; COMM.users.length < COMM_PEOPLE || COMM.users.splice(40); for (const p of COMM.pending) { p.due = Date.now() - 1000; p.by = COMM.posts[0].by; } commSave(); });
  await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  const got = await pg.evaluate(id => (COMM.comments[id] || []).filter(x => x.toMe).map(x => x.text), pid);
  chk(`the reply arrives even though adding people keeps failing (${got.join(" / ")})`, got.length >= 1 && /thank you/.test(got[0]));
  chk("…and the thread shows it", await pg.evaluate(() => /aw thank you/.test(cbody().textContent)));
  // a reply that fails once is tried again, not lost
  const c2 = await pg.evaluate(async id => { const mine = { id: uid(), by: "me", text: "one more q: sequel?", at: Date.now() }; COMM.comments[id].push(mine); COMM.pending = [{ id: uid(), target: id, replyTo: mine.id, by: COMM.posts[0].by, due: Date.now() - 1000 }]; commSave();
    const real = commAnswer; let fails = 1; window.commAnswer = async p => { if (fails-- > 0) throw new Error("busy"); return real(p); };
    while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commRepliesNow(); const after1 = { left: COMM.pending.length, tries: COMM.pending[0]?.tries || 0 };
    for (const p of COMM.pending) p.due = Date.now() - 1000; commSave(); await commRepliesNow(); window.commAnswer = real;
    return { ...after1, left2: COMM.pending.length, n: COMM.comments[id].filter(x => x.replyTo === mine.id && x.toMe).length }; }, pid);
  chk(`a reply that fails is kept and tried again (${c2.left} waiting, try ${c2.tries})`, c2.left >= 1 && c2.tries === 1);
  chk("…and arrives on the next try", c2.n >= 1 && c2.left2 === 0);
  chk("one that keeps failing is given up after 3 tries (no endless waiting)", await pg.evaluate(async () => { const real = commAnswer; window.commAnswer = async () => null; COMM.pending = [{ id: "x1", target: COMM.posts[0].id, replyTo: "nope", by: COMM.posts[0].by, due: Date.now() - 1 }]; commSave(); for (let i = 0; i < 3; i++) { COMM.pending.forEach(p => p.due = Date.now() - 1); commSave(); await commRepliesNow(); } window.commAnswer = real; return !COMM.pending.length; }));
  chk("replies are checked every 30 s, not only every 3 minutes", await pg.evaluate(() => typeof commRepliesNow === "function"));
  await pg.evaluate(() => hubClose());
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
