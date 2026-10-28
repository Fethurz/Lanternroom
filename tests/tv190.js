// v1.90: voices commit to strong, sad and blunt feelings (intensity, more emotions, pace/loudness that match), and speech
// quirks are spoken naturally (stutters, cut-offs, stretched letters, shouted caps, piled-up punctuation, laughs)
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || "");
  const reply = `*He doesn't look up.* "Leave." *Her voice breaks as tears spill over.* "I-I thought you loved me..." *He slams the table.* "GET OUT!!!"\n[[mood: sad | place: House | ambience: indoors | activity: none | harm: none | hearing: outside]]`;
  let sys = "";
  const json = body => { if (/You direct voice actors/.test(sysOf(body))) { sys = sysOf(body); return { lines: [{ i: 1, emotion: "blunt", intensity: 3, speed: 1, volume: 1 }, { i: 2, emotion: "heartbroken", intensity: 5, speed: 1, volume: 1 }, { i: 3, emotion: "furious", intensity: 5, speed: 1, volume: 1 }] }; } return { summary: "x", facts: [] }; };
  const { b, pg, errs } = await open({ width: W, json, stream: () => reply });
  const cart = [];
  await pg.route("https://api.cartesia.ai/**", r => { cart.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill({ status: 200, body: Buffer.from([0xff, 0xfb, 0x90, 0]), headers: { "content-type": "audio/mpeg" } }); });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  await pg.evaluate(() => {
    window.__said = [];
    const V = [{ name: "Samantha", lang: "en-US", localService: true }, { name: "Daniel", lang: "en-GB", localService: true }];
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => V, speak: u => { __said.push({ t: u.text, p: u.pitch, r: u.rate, v: u.volume }); setTimeout(() => u.onend && u.onend(), 5); }, cancel: () => {} }, configurable: true });
    window.Audio = function () { const a = this; this.play = async () => { __said.push({ t: "[audio]" }); setTimeout(() => a.onended && a.onended(), 5); }; this.pause = () => {}; this.addEventListener = () => {}; };
  });
  chk("version 1.90 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 90));
  // speech quirks
  const q = await pg.evaluate(() => Object.fromEntries([["C-Can you help me?"], ["W-w-what?!?!"], ["N-no, p-please"], ["I-I'm sorry"], ["Th-the door"], ["I was gonna- never mind"], ["STOP IT NOW!!!"], ["Nooooooo!"], ["Mm-hmm, uh-huh."], ["A well-known re-read of the T-shirt and X-ray"], ["Look at the TV, OK? <3 💕"], ["Hahaha, silly hehe"]].map(([t]) => [t, [speakable(t, false), speakable(t, true)]])));
  const st = k => q[k][0];
  chk(`stutters are said as stutters, never letters (${st("C-Can you help me?")} | ${st("W-w-what?!?!")} | ${st("N-no, p-please")} | ${st("I-I'm sorry")} | ${st("Th-the door")})`, st("C-Can you help me?") === "Can— can you help me?" && st("W-w-what?!?!") === "What— what— what?!" && st("N-no, p-please") === "No— no, please— please" && st("I-I'm sorry") === "I— I'm sorry" && st("Th-the door") === "The— the door");
  chk(`cut-offs, shouting, stretching and piled punctuation read naturally (${st("I was gonna- never mind")} | ${st("STOP IT NOW!!!")} | ${st("Nooooooo!")})`, st("I was gonna- never mind") === "I was gonna— never mind" && st("STOP IT NOW!!!") === "Stop It Now!" && st("Nooooooo!") === "Nooo!");
  chk("real hyphenated words, acronyms and noises are left alone; emoji and <3 are dropped", st("Mm-hmm, uh-huh.") === "Mm-hmm, uh-huh." && st("A well-known re-read of the T-shirt and X-ray") === "A well-known re-read of the T-shirt and X-ray" && st("Look at the TV, OK? <3 💕") === "Look at the TV, OK?");
  chk(`written laughs become real laughter on Cartesia (${q["Hahaha, silly hehe"][1]})`, q["Hahaha, silly hehe"][1] === "[laughter], silly [laughter]" && q["Hahaha, silly hehe"][0] === "Hahaha, silly hehe");
  // feelings
  await pg.evaluate(async () => { S.settings.voiceOn = true; await saveSettings(); await openChat(S.chars[0].id); });
  await pg.waitForTimeout(300);
  const ph = await pg.evaluate(async () => { __said = []; $("input").value = "hi"; $("send").click(); for (let i = 0; i < 200 && (S.busy || __said.length < 3); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 100)); return __said; });
  chk("the director is told to commit to strong, sad and blunt feelings with an intensity", /never fall back to neutral/.test(sys) && /blunt, cold or deadpan/.test(sys) && /"intensity": 1-5/.test(sys) && /heartbroken/.test(sys));
  chk(`the phone reads the stutter right (${ph[1]?.t})`, ph[1]?.t === "I— I thought you loved me...");
  chk(`heartbroken is slower and quieter than blunt; furious loudest (rate ${ph[1]?.r?.toFixed(2)} vs ${ph[0]?.r?.toFixed(2)}, vol ${ph[1]?.v?.toFixed(2)})`, ph[1].r < ph[0].r && ph[1].v < 0.8 && ph[0].r >= 1.05);
  const ct = await pg.evaluate(async () => { S.settings.voiceEngine = "cartesia"; S.settings.cartKey = "k"; S.chars[0].voice = { cart: "v1" }; __said = []; await voiceRead(S.chat.messages.filter(m => m.role === "assistant").at(-1), true); for (let i = 0; i < 60 && __said.length < 3; i++) await new Promise(r => setTimeout(r, 50)); return __said.length; });
  const [c1, c2, c3] = cart;
  chk(`Cartesia gets the strong feelings (${c1?.generation_config?.emotion}, ${c2?.generation_config?.emotion}, ${c3?.generation_config?.emotion}) with matching loudness (${c3?.generation_config?.volume}) and pace (${c2?.generation_config?.speed})`, ct === 3 && c1?.generation_config?.emotion === "distant" && c2?.generation_config?.emotion === "sad" && c3?.generation_config?.emotion === "angry" && c3.generation_config.volume >= 1.45 && c2.generation_config.speed <= 0.85);
  chk(`Cartesia hears natural text (${c2?.transcript} | ${c3?.transcript})`, c2?.transcript === "I— I thought you loved me..." && c3?.transcript === "Get Out!");
  const g = await pg.evaluate(() => [toneGuess({ ctx: "he says flatly …", text: "Fine." }).emo, toneGuess({ ctx: "she sobs …", text: "Why?" }).emo, toneGuess({ ctx: "he roars …", text: "Move!" }).emo]);
  chk(`without the AI, words around a line still give blunt, heartbroken and furious (${g})`, g.join() === "blunt,heartbroken,furious");
  chk("the voice picker knows emotive voices", await pg.evaluate(() => voiceInfo({ id: "a", name: "X", d: "An emotive, expressive actress" }).traits.includes("Emotive")));
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
