// Laden-Seiten in gezielt eingestellten Zuständen prüfen (ROADMAP 176 – Lehre aus dem Nutzer-Screenshot Tierhandlung):
// gekauft + Level zu niedrig, gesperrt, zu teuer. Prüft pro sichtbarer Karte: kein Knopf über Text, kein Sperrtext bei „Im Besitz“,
// keine graue Karte trotz Besitz, keine leere Karte. Der Zustand wird nur im Browser vorgespielt (kiezRenderProfile), nichts am Server.
const fs = require('fs'); const lib = require('./lib.js'); let fails = 0;
const ok = (c, l, x) => { if (!c) fails++; console.log(c ? '✓' : '✗', l, x ?? ''); };
(async () => {
  const { b, pg } = await lib.open(process.env.URL); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await lib.login(pg, process.env.KIEZ_MAIL, fs.readFileSync(process.env.KIEZ_PW_FILE, 'utf8').trim());
  const clean = () => pg.evaluate(() => document.querySelectorAll('.kz-box-ov,#kz-tut').forEach(o => o.remove()));
  const check = () => pg.evaluate(() => { const out = [], s = document.querySelector('section.panel.active-view');
    s.querySelectorAll('.card').forEach(c => { if (!c.offsetParent) return; const name = (c.querySelector('b,h3')?.textContent || '').trim().slice(0, 24);
      const leaves = [...c.querySelectorAll('em,small,p,span,b,i,div')].filter(e => e.offsetParent && e.childElementCount === 0 && e.textContent.trim().length > 2);
      c.querySelectorAll('button').forEach(bt => { if (!bt.offsetParent) return; const q = bt.getBoundingClientRect();
        leaves.forEach(e => { if (bt.contains(e) || e.contains(bt)) return; const r = e.getBoundingClientRect(); if (q.left < r.right - 3 && r.left < q.right - 3 && q.top < r.bottom - 3 && r.top < q.bottom - 3) out.push(name + ': Knopf „' + bt.textContent.trim().slice(0, 16) + '“ über „' + e.textContent.trim().slice(0, 24) + '“'); }); });
      if (c.classList.contains('kz-is-owned')) { if (c.classList.contains('kz-locked') || +getComputedStyle(c).opacity < 0.9) out.push(name + ': im Besitz, aber grau');
        if (leaves.some(e => /Benötigt|Noch gesperrt|Sozialkontakte Stufe/.test(e.textContent))) out.push(name + ': im Besitz, aber Sperrtext'); }
      if (c.getBoundingClientRect().height > 30 && c.innerText.trim().length < 3) out.push('leere Karte'); });
    return [...new Set(out)]; });
  const views = [['pets', 'Tierhandlung'], ['pets', 'Meine Begleiter'], ['store', 'Waffen'], ['store', 'Kleidung'], ['store', 'Zubehör'], ['income', 'Instrumente'], ['garage', 'Fahrzeuge'], ['gear', 'Unterkünfte']];
  const states = [['echt', null], ['Level 1, kein Geld', { level: 1, money: 0, social_skill: 1 }], ['Level 3, viel Geld', { level: 3, money: 99999, social_skill: 2 }]];
  for (const [label, patch] of states) {
    for (const [v, t] of views) {
      await pg.evaluate(([v, t]) => window.kiezGoTab(v, t), [v, t]); await pg.waitForTimeout(2200);
      if (patch) { await pg.evaluate(p => window.kiezRenderProfile({ ...window.kiezProfile, ...p }), patch); await pg.waitForTimeout(2500); }
      await clean(); const f = await check();
      ok(!f.length, label + ' · ' + v + ' › ' + t, f.slice(0, 4).join(' | '));
    }
    // echten Zustand wiederherstellen (kein Neuladen nötig)
    // lädt die Seite dabei neu (Level-Wechsel), einfach abwarten und weiter
    await pg.evaluate(async () => { const r = await window.kiezSupabase.rpc('refresh_my_profile'); if (r.data) window.kiezRenderProfile(r.data); }).catch(async () => { await pg.waitForLoadState('load').catch(() => {}); await pg.waitForFunction(() => window.kiezGoTab, null, { timeout: 30000 }).catch(() => {}); }); await pg.waitForTimeout(2000);
  }
  ok(!errs.length, 'JS-Fehler', errs.join(' | ') || 'keine');
  console.log(fails ? 'FEHLER: ' + fails : 'ALLES OK'); await b.close();
})();
