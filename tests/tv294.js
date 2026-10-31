// v2.9.4: the bot profile opens on a big, uncropped portrait; tapping it, the chat header's picture or the scene panel's
// portrait opens a full-screen viewer (✕, the phone's back button or Esc close it, and only it)
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.9.4 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2009004; }));
  await pg.evaluate(async () => {
    const cv = document.createElement("canvas"); cv.width = 832; cv.height = 1216; const x = cv.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 1216); g.addColorStop(0, "#c86"); g.addColorStop(1, "#435"); x.fillStyle = g; x.fillRect(0, 0, 832, 1216);
    x.fillStyle = "#fff"; x.font = "bold 90px sans-serif"; x.fillText("TOP", 300, 110); x.fillText("BOTTOM", 230, 1180);
    const c = { ...blankChar("character"), id: "pv1", name: "Roxy Test", description: "A pop star.", summary: "A world-famous pop star wolf.", customPortrait: cv.toDataURL("image/jpeg", 0.8) };
    const m = { ...blankChar("character"), id: "pv2", name: "Member", description: "m", customPortrait: c.customPortrait };
    const gq = { ...blankChar("group"), id: "pv3", name: "The Group", description: "g", members: ["pv2"] };
    S.chars.push(c, m, gq); await saveChars();
  });
  // the profile
  const p = await pg.evaluate(async () => { await openProfile("pv1"); await new Promise(r => setTimeout(r, 400)); const im = document.querySelector("#pfHero img"), r = im.getBoundingClientRect(), sh = document.querySelector("#sheetBody").getBoundingClientRect();
    return { w: r.width, h: r.height, sheetW: sh.width, ratio: r.width / r.height, small: !!document.querySelector("#sheet .pf-img"), src: im.src.slice(0, 14) }; });
  chk(`the profile shows the portrait big and uncropped (${Math.round(p.w)}×${Math.round(p.h)} in a ${Math.round(p.sheetW)} px window, ratio ${p.ratio.toFixed(3)})`, p.h >= 300 && Math.abs(p.ratio - 832 / 1216) < 0.02 && !p.small && p.src === "data:image/jpe");
  if (process.env.SHOTS) { await pg.waitForFunction(() => !document.getElementById("splash"), null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(3500); await pg.screenshot({ path: `${process.env.SHOTS}/profile-${W}.png` }); }
  const v = await pg.evaluate(async () => { $("pfHero").click(); await new Promise(r => setTimeout(r, 300)); const pv = $("portView"), im = pv?.querySelector("img"), r = im?.getBoundingClientRect();
    return { open: !!pv, name: pv?.querySelector(".pv-cap b")?.textContent, ratio: r ? r.width / r.height : 0, h: r?.height || 0, vh: innerHeight }; });
  chk(`tapping it opens the full-screen viewer with the whole picture (${JSON.stringify(v)})`, v.open && v.name === "Roxy Test" && Math.abs(v.ratio - 832 / 1216) < 0.02 && v.h > v.vh * 0.5);
  if (process.env.SHOTS) await pg.screenshot({ path: `${process.env.SHOTS}/viewer-${W}.png` });
  const e1 = await pg.evaluate(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await new Promise(r => setTimeout(r, 200)); return { viewer: !!$("portView"), sheet: !$("sheet").hidden }; });
  chk(`Esc closes only the viewer; the profile stays (${JSON.stringify(e1)})`, !e1.viewer && e1.sheet);
  await pg.evaluate(async () => { $("pfHero").click(); await new Promise(r => setTimeout(r, 200)); });
  await pg.goBack().catch(() => {}); await pg.waitForTimeout(400);
  const e2 = await pg.evaluate(() => ({ viewer: !!$("portView"), sheet: !$("sheet").hidden }));
  chk(`the phone's back button closes only the viewer (${JSON.stringify(e2)})`, !e2.viewer && e2.sheet);
  // in the chat
  const c1 = await pg.evaluate(async () => { closeSheet(); await openChat("pv1"); await new Promise(r => setTimeout(r, 400)); $("btnWho").click(); await new Promise(r => setTimeout(r, 300));
    const ok = !!$("portView") && $("portView").querySelector(".pv-cap b").textContent === "Roxy Test"; $("portView").querySelector(".pv-x").click(); await new Promise(r => setTimeout(r, 200)); return { ok, closed: !$("portView"), chat: !$("chat").hidden }; });
  chk(`in a chat, tapping the picture at the top opens the viewer and ✕ closes it (${JSON.stringify(c1)})`, c1.ok && c1.closed && c1.chat);
  if (W >= 1180) {
    const s1 = await pg.evaluate(async () => { renderPanes(); await new Promise(r => setTimeout(r, 300)); $("sdPort").click(); await new Promise(r => setTimeout(r, 300)); const ok = !!$("portView"); $("portView")?._close(); return ok; });
    chk("on a computer, the scene panel's portrait opens it too", s1);
  }
  const g1 = await pg.evaluate(async () => { await openChat("pv3"); await new Promise(r => setTimeout(r, 400)); $("btnWho").click(); await new Promise(r => setTimeout(r, 300)); const n = $("portView")?.querySelector(".pv-cap b")?.textContent; $("portView")?._close(); return n; });
  chk(`in a group chat it shows the member in focus (${g1})`, g1 === "Member");
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
