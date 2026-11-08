// v2.11: persona pronouns: placeholders in openings, the editor's buttons, the prompt line, the persona maker
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs, calls } = await open({ width: W, json: () => ({ name: "Tess", look: "A tall woman.", personality: "Kind.", background: "A baker.", pron: "she", color: "#ff88aa" }), stream: () => `*Hi.*\n[[mood: calm | place: Home | ambience: none | activity: none | hearing: outside]]` });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.11 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2011000; }));
  const r = await pg.evaluate(async () => {
    const out = {};
    const p = S.personas.find(x => x.id === S.personaId) || S.personas[0]; S.personaId = p.id;
    const txt = "{{They}} said {{they're}} fine. Hi {{Mama|Papa|Parent}}! {{their}} hat, {{them}}, {{THEY}} walk{{s}}. {{girlfriend|boyfriend}}. {{char}} and {{user}}. {{unknown}}";
    for (const pr of ["she", "he", "they", ""]) { p.pron = pr; out[pr || "unset"] = fill(txt, { name: "Lula" }); }
    // the prompt line
    p.pron = "she"; p.description = "A tall adult.";
    const c = { ...blankChar("character"), id: "pr1", name: "Lula", description: "A streamer.", firstMessage: "*Lula waves.* \"Hi {{Mama|Papa|Parent}}! {{They}} look{{s}} tired.\"" };
    S.chars.push(c); await saveChars();
    await openChat(c.id);
    for (let i = 0; i < 40 && S.busy; i++) await new Promise(r => setTimeout(r, 100));
    out.opening = S.chat.messages[0]?.content || "";
    const msgs = buildPrompt(c, S.chat, S.chat.messages.length);
    out.sys = msgs[0].content;
    p.pron = "he"; const msgs2 = buildPrompt(c, S.chat, S.chat.messages.length); out.sysHe = msgs2[0].content;
    // a new chat as a he persona gets the he opening
    out.greetHe = greetingsOf(c)[0];
    // the editor
    leaveChat && leaveChat();
    editPersona(p, false);
    await new Promise(r => setTimeout(r, 200));
    out.btns = [...document.querySelectorAll("#pePron [data-pron]")].map(x => x.dataset.pron);
    document.querySelector('#pePron [data-pron="they"]').click();
    out.on = document.querySelector("#pePron .primary")?.dataset.pron;
    $("peSave").click(); await new Promise(r => setTimeout(r, 400));
    out.saved = (S.personas.find(x => x.id === p.id) || {}).pron;
    const stored = await Store.get("personas"); out.stored = (stored || []).find(x => x.id === p.id)?.pron;
    // the editor shows the hint under First message
    closeSheet(); editChar(c); await new Promise(r => setTimeout(r, 300));
    out.hint = [...document.querySelectorAll("#sheetBody .hint")].some(h => /\{\{Mama\|Papa\|Parent\}\}/.test(h.textContent));
    closeSheet();
    // persona maker keeps pron
    PGEN.card = { name: "Tess", look: "A tall woman.", personality: "Kind.", background: "A baker.", pron: "she", color: "#ff88aa" };
    await pgSave(false);
    out.made = (S.personas.find(x => x.name === "Tess") || {}).pron;
    out.genSpec = typeof genSpec === "function" ? genSpec("character") : "";
    return out;
  });
  chk(`she: ${r.she}`, r.she.startsWith("She said she's fine. Hi Mama! her hat, her, SHE walks. girlfriend. Lula and") && r.she.endsWith("{{unknown}}"));
  chk(`he: ${r.he}`, r.he.startsWith("He said he's fine. Hi Papa! his hat, him, HE walks. boyfriend."));
  chk(`they: ${r.they}`, r.they.startsWith("They said they're fine. Hi Parent! their hat, them, THEY walk. girlfriend."));
  chk("unset counts as they", r.unset === r.they);
  chk(`the opening fits the persona (${r.opening})`, /Hi Mama! She looks tired/.test(r.opening));
  chk("the prompt names the pronouns", /Pronouns: she\/her\. Always refer to and address/.test(r.sys) && /Mama, girlfriend/.test(r.sys));
  chk("he in the prompt", /Pronouns: he\/him/.test(r.sysHe));
  chk(`a he persona's new opening says Papa (${r.greetHe})`, /Hi Papa! He looks tired/.test(r.greetHe));
  chk(`editor has She/He/They (${r.btns})`, r.btns.join() === "she,he,they" && r.on === "they");
  chk(`editor saves the pick (${r.saved}/${r.stored})`, r.saved === "they" && r.stored === "they");
  chk("the First message hint explains the placeholders", r.hint);
  chk(`persona maker keeps pronouns (${r.made})`, r.made === "she");
  chk("the generator asks for placeholders instead of assuming", /never assume \{\{user\}\}'s gender/.test(r.genSpec));
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
