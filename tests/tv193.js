// v1.93: cut-offs fade out like a catch of breath (about 80 ms) with a short hitch before the next line, and a cut word the
// voice drew out is stopped at about the length it normally takes to say
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W, json: () => ({ summary: "x", facts: [] }), stream: () => "Hi.\n[[mood: calm]]" });
  // 2 s of steady sound (no gaps); "mean" is timed from 0.5 s to 1.4 s (drawn out), "and" starts at 1.4 s
  const pcm = Buffer.alloc(44100 * 2 * 4); for (let i = 0; i < 44100 * 2; i++) pcm.writeFloatLE(Math.sin(i / 8) * 0.4, i * 4);
  let words = null;
  await pg.route("https://api.cartesia.ai/**", r => { const body = JSON.parse(r.request().postData() || "{}"), ws = body.transcript.split(/\s+/);
    const st = ws.map((_, i) => i < ws.length - 3 ? i * 0.1 : 1.4 + (i - (ws.length - 3)) * 0.2), en = ws.map((w, i) => i === ws.length - 4 ? 1.4 : st[i] + 0.1); st[ws.length - 4] = 0.5; words = ws;
    const ev = [`data: ${JSON.stringify({ type: "chunk", data: pcm.toString("base64") })}`, `data: ${JSON.stringify({ type: "timestamps", word_timestamps: { words: ws, start: st, end: en } })}`, `data: ${JSON.stringify({ type: "done", done: true })}`];
    return r.fulfill({ status: 200, body: ev.join("\n\n") + "\n\n", headers: { "content-type": "text/event-stream" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 1.95 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 95));
  const r = await pg.evaluate(async () => {
    Object.assign(S.settings, { voiceOn: true, voiceEngine: "cartesia", cartKey: "k" }); await openChat(S.chars[0].id); S.chars[0].voice = { cart: "v1" };
    const ac = acx(); const G = ac.createGain.bind(ac), gains = []; ac.createGain = () => { const g = G(); gains.push(g); return g; };
    VQ.span = null; const t0 = performance.now(); voiceSay([{ text: "I didn't mean-", who: S.chars[0] }, { text: "Never mind.", who: "narrator" }]);
    for (let i = 0; i < 200 && !VQ.span; i++) await new Promise(r => setTimeout(r, 10)); const span = VQ.span, startAt = performance.now();
    for (let i = 0; i < 300 && !VQ.list.length && VQ.busy && performance.now() - startAt < 4000; i++) await new Promise(r => setTimeout(r, 10));
    // when the cut line finished (the next line starts being worked on)
    let doneAt = 0; for (let i = 0; i < 400 && VQ.busy; i++) { if (!doneAt && VQ.span !== span) doneAt = performance.now(); await new Promise(r => setTimeout(r, 10)); }
    return { span, playMs: (doneAt || performance.now()) - startAt };
  });
  chk(`a drawn-out cut word stops near its normal length, not at the timed end (stops at ${r.span?.to?.toFixed(2)} s; the word starts at 0.5, timed to 1.4)`, r.span?.cut && r.span.to > 0.8 && r.span.to < 1.0);
  const src = await pg.evaluate(() => voiceFxPlay.toString());
  chk("the cut fades out over about 80 ms (not a hard stop) and leaves a short hitch", /setTargetAtTime\(0\.0001, fs, 0\.022/.test(src) && /cutAt - 0\.035/.test(src) && /hitch = opt\.cutAt > 0 \? \(opt\.pause \? 60 : 160\)/.test(src) && /cutAt \+ 0\.05/.test(src));
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
