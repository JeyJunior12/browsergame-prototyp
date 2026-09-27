// Durchspiel-Bot: spielt das Spiel über die echte Oberfläche (Klicks wie ein Spieler) mit einem Testkonto.
// Wartezeiten werden per tester_skip_time (Migration 0039, nur Testkonten) übersprungen – die echten Zeiten stehen in COOLDOWNS.md.
// Jede Aktion wird protokolliert (Meldung, fehlende Rückmeldung, verdächtige Texte), dazu pro Besuch ein Profil-Schnappschuss.
// Aufruf: KIEZ_MAIL=… KIEZ_PW_FILE=… URL=https://…/ OUT=<Ordner> BESUCHE=400 node test/browser/durchspiel.js
// Gegner/Partner nur das zweite Testkonto (PARTNER=Name) – nie echte Spieler angreifen.
const fs = require('fs'); const lib = require('./lib.js');
const OUT = process.env.OUT || require('os').tmpdir(); const PARTNER = process.env.PARTNER || 'KiezTester2';
const BESUCHE = +(process.env.BESUCHE || 50); const START = +(process.env.START || 0);
const log = (o) => fs.appendFileSync(OUT + '/aktionen.jsonl', JSON.stringify(o) + '\n');
const snap = (o) => fs.appendFileSync(OUT + '/verlauf.jsonl', JSON.stringify(o) + '\n');
const SUSPECT = /fehler|error|exception|undefined|null\b|NaN|\+0,00 €|permission|violates|function .* does not exist|\[object/i;
const DANGER = /abmelden|löschen|entfernen|auflösen|verlassen|kündigen|melden|rauswerfen|austreten|kapitulieren|passwort|bewerben/i;
// beim Erkunden unbekannter Seiten zusätzlich nichts gegen andere Spieler auslösen
const DANGER_X = new RegExp(DANGER.source + '|überfall|klauen|angreifen|herausfordern|ausrauben|stehlen|zuschlagen|krieg', 'i');
let visit = START, pg, b, errs = [];
const full = () => visit % 5 === 0;  // alle 5 Besuche: jede Seite, Extras, Aussehen

async function boot() {
  ({ b, pg } = await lib.open(process.env.URL));
  pg.on('pageerror', e => { errs.push(e.message); log({ v: visit, typ: 'JS-FEHLER', msg: e.message.slice(0, 300) }); });
  pg.on('dialog', d => d.accept(d.type() === 'prompt' ? '1' : undefined));
  await lib.login(pg, process.env.KIEZ_MAIL, fs.readFileSync(process.env.KIEZ_PW_FILE, 'utf8').trim());
}
const rpc = (f, a) => pg.evaluate(async ([f, a]) => { const r = await window.kiezSupabase.rpc(f, a || {}); return r.error ? { err: r.error.message } : { data: r.data }; }, [f, a]);
const prof = () => pg.evaluate(() => { const p = window.kiezProfile || {}; return { level: p.level, xp: p.xp, money: +p.money, bank: +(p.bank_balance || 0), energy: p.energy, hunger: p.hunger, clean: p.cleanliness, promille: +p.alcohol_level, atk: p.attack_skill, def: p.defense_skill, street: p.streetwise, social: p.social_skill, bottles: p.bottles, caps: p.bottlecaps, cont: p.container_level, area: p.area_level, jail: p.jail_until && new Date(p.jail_until) > new Date(), cap: +p.cash_capacity }; });
async function refresh() { await pg.evaluate(async () => { const r = await window.kiezSupabase.rpc('refresh_my_profile'); if (r.data) window.kiezRenderProfile(r.data); }).catch(() => {}); }
// Popups (Level-Aufstieg, Kiste, Tutorial) lesen und schließen
async function popups(where) {
  const t = await pg.evaluate(() => { const o = [...document.querySelectorAll('.kz-box-ov,#kz-tut')]; const t = o.map(x => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean); o.forEach(x => x.remove()); return t; });
  t.forEach(x => log({ v: visit, typ: 'POPUP', wo: where, msg: x.slice(0, 200) }));
}
async function go(view, tab) {
  await pg.evaluate(([v, t]) => window.kiezGoTab(v, t), [view, tab || undefined]);
  await pg.waitForTimeout(700);
  await pg.waitForFunction(v => !/Lade[^\n]{0,20}…/.test(document.getElementById(v)?.innerText || ''), view, { timeout: 12000 }).catch(() => log({ v: visit, typ: 'LÄDT-EWIG', wo: view + '/' + (tab || '') }));
  await pg.waitForTimeout(400); await popups(view);
  if (full()) await look(view, tab);
  const leer = await pg.evaluate(v => { const s = document.getElementById(v); return !s || s.innerText.trim().length < 40; }, view);
  if (leer) log({ v: visit, typ: 'LEER', wo: view + '/' + (tab || '') });
}
// Aussehen jeder Seite: kleine/enge Knöpfe, winzige Schrift, Überlappungen, Querscrollen; alle 25 Besuche Bildschirmfoto zum Selbst-Anschauen
const shot = new Set();
async function look(view, tab) {
  const key = view + '_' + (tab || '').replace(/\W+/g, '');
  const r = await pg.evaluate(() => { const s = document.querySelector('section.panel.active-view'); if (!s) return []; const out = [];
    const vis = [...s.querySelectorAll('button,a,select,input')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0);
    vis.forEach(e => { const b = e.getBoundingClientRect(), fs = parseFloat(getComputedStyle(e).fontSize);
      if (e.tagName !== 'A' && b.height < 36) out.push('Knopf zu klein (' + Math.round(b.height) + ' px): ' + (e.textContent || e.placeholder || '').trim().slice(0, 30));
      if (fs < 13) out.push('Schrift zu klein (' + fs + ' px): ' + (e.textContent || '').trim().slice(0, 30)); });
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) { const a = vis[i].getBoundingClientRect(), b = vis[j].getBoundingClientRect();
      if (!vis[i].contains(vis[j]) && !vis[j].contains(vis[i]) && a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) out.push('Knöpfe überlappen: ' + vis[i].textContent.trim().slice(0, 20) + ' / ' + vis[j].textContent.trim().slice(0, 20)); }
    [...s.querySelectorAll('p,span,small,b,div,li,td')].filter(e => e.offsetParent && e.childElementCount === 0 && e.textContent.trim().length > 2).forEach(e => { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) out.push('Text zu klein (' + fs + ' px): ' + e.textContent.trim().slice(0, 30)); });
    if (document.documentElement.scrollWidth > innerWidth + 2) out.push('Seite scrollt quer');
    return [...new Set(out)].slice(0, 12); });
  r.forEach(m => log({ v: visit, typ: 'AUSSEHEN', wo: key, msg: m }));
  const w = Math.floor(visit / 50); if (!shot.has(w + key)) { shot.add(w + key); fs.mkdirSync(OUT + '/bilder', { recursive: true });
    await pg.evaluate(() => scrollTo(0, 0)); await pg.screenshot({ path: OUT + '/bilder/' + visit + '_' + key + '.jpg', fullPage: true, quality: 55, type: 'jpeg' }).catch(() => {}); }
}
// sichtbare Meldungstexte (für vorher/nachher-Vergleich)
const MSEL = '.notice,.kz-near,[class*="msg"],.schnorr-result,.kz-toast';
const mark = () => pg.evaluate(S => document.querySelectorAll(S).forEach(n => n.dataset.kzseen = n.innerText.replace(/\s+/g, ' ').trim()), MSEL);
const fresh = () => pg.evaluate(S => [...document.querySelectorAll(S)].filter(n => n.offsetParent && n.innerText.trim() && n.dataset.kzseen !== n.innerText.replace(/\s+/g, ' ').trim() && !n.querySelector('.notice,[class*="msg"]')).map(n => n.innerText.replace(/\s+/g, ' ').trim()), MSEL);
// Knopf klicken wie ein Spieler, neue Meldung abwarten und protokollieren. pick: 'first' | 'last' | Funktion als String (el => Zahl, höchste gewinnt)
async function click(label, sel, { within, pick = 'first', fill, wait = 5000, quiet } = {}) {
  await mark(); const t0 = Date.now(); let y0 = 0; const m0 = await pg.evaluate(() => +(window.kiezProfile?.money || 0) + +(window.kiezProfile?.bank_balance || 0));
  if (fill) for (const [s, v] of fill) await pg.fill(s, String(v)).catch(() => {});
  const r = await pg.evaluate(([sel, within, pick, D]) => {
    let els = [...document.querySelectorAll('section.panel.active-view ' + sel + ', #kiezmodalbody ' + sel)].filter(e => e.offsetParent && !e.disabled && !e.classList.contains('hide'));
    if (within) els = els.filter(e => (e.closest('.card,li,.kf-box,.drink,.kz-npc,tr,div') || e).innerText.match(new RegExp(within, 'i')));
    els = els.filter(e => !new RegExp(D, 'i').test(e.textContent));
    if (!els.length) return null;
    let el = els[0]; if (pick === 'last') el = els[els.length - 1];
    else if (pick !== 'first') { const f = eval(pick); el = els.map(e => [f(e), e]).filter(x => x[0] != null && !isNaN(x[0])).sort((a, b) => b[0] - a[0])[0]?.[1]; if (!el) return null; }
    el.scrollIntoView({ block: 'center' }); const txt = el.textContent.replace(/\s+/g, ' ').trim(); const y = scrollY; el.click(); return [txt, y];
  }, [sel, within || null, pick, DANGER.source]);
  if (r == null) { if (!quiet) log({ v: visit, typ: 'KEIN-KNOPF', label }); return null; }
  y0 = r[1]; const knopf = r[0];
  let neu = [];
  while (Date.now() - t0 < wait) { await pg.waitForTimeout(250); neu = await fresh(); if (neu.length) { await pg.waitForTimeout(300); neu = [...new Set(await fresh())]; break; } }
  // Aussehen: verdrängt die Meldung den Karteninhalt? springt die Seite?
  const lay = await pg.evaluate(y0 => { const out = []; document.querySelectorAll('.kz-near').forEach(n => { const c = n.parentElement, top = c.getBoundingClientRect().top;
      if ([...c.children].some(k => k !== n && k.offsetParent && k.getBoundingClientRect().bottom < top + 2)) out.push('Meldung verdrängt Karteninhalt: ' + (c.querySelector('h3,b')?.textContent || '').trim()); });
    if (Math.abs(scrollY - y0) > 250) out.push('Seite springt um ' + Math.round(scrollY - y0) + ' px'); return out; }, y0);
  lay.forEach(m => log({ v: visit, typ: 'LAYOUT', label, msg: m }));
  await popups(label);
  const msg = neu.join(' | ').slice(0, 300);
  // Widerspruch: Meldung sagt Gewinn, aber Tasche + Schließfach sind weniger geworden (Lehre: Rubbellos „Gewonnen 5 €“ bei 10 € Einsatz)
  await pg.waitForTimeout(400); const m1 = await pg.evaluate(() => +(window.kiezProfile?.money || 0) + +(window.kiezProfile?.bank_balance || 0));
  if (/gewonnen|gewinn|geklappt|treffer!|\+\d/i.test(msg) && !/verloren|niete|daneben|erwischt/i.test(msg) && m1 < m0 - 0.001 && !/gekauft|kosten|eingezahlt|gebühr|training|gegessen|getrunken|gewaschen|sauber/i.test(msg))
    log({ v: visit, typ: 'WIDERSPRUCH', label, msg: msg.slice(0, 160) + ' | Geld vorher ' + m0.toFixed(2) + ' nachher ' + m1.toFixed(2) });
  const typ = !msg ? 'KEINE-RÜCKMELDUNG' : SUSPECT.test(msg) ? 'VERDÄCHTIG' : 'OK';
  log({ v: visit, typ, label, knopf: knopf.slice(0, 50), msg, ms: Date.now() - t0 });
  return msg || '';
}
const eurOf = (s) => { const m = String(s).match(/(\d[\d.]*,\d\d) ?€/); return m ? +m[1].replace(/\./g, '').replace(',', '.') : null; };
// Preisauswahl: teuerster bezahlbarer Knopf bis Anteil des Geldes
const priceFn = (money, share) => `e=>{const m=e.textContent.match(/(\\d[\\d.]*,\\d\\d) ?€/);if(!m)return null;const p=+m[1].replace(/\\./g,'').replace(',','.');return p<=${money * share}?p:null}`;

// Sparen: 60-Min.-Touren (Zeit per Zeitsprung), ausladen + verkaufen, bis Tasche + Schließfach den Preis decken (höchstens 3 Spieltage)
async function earnFor(price, what) {
  let p = await prof(); const start = p.money + p.bank; let tours = 0, mins = 0;
  while (p.money + p.bank < price && mins < 72 * 60) {
    await go('pfand', 'Pfand sammeln'); await pg.selectOption('#durationselect', '60').catch(() => {});
    await click('Spar-Tour', '#collect', { quiet: true });
    await rpc('tester_skip_time', { minutes: 61 }); mins += 61; await refresh();
    await go('pfand', 'Pfand sammeln'); await click('Spar-Ausladen', '.kz-quick', { quiet: true });
    if (tours % 6 === 5) { await go('income', 'Instrumente'); await click('Spar-Hut', '#musiccollect', { quiet: true }); }
    tours++; p = await prof();
  }
  const ok = p.money + p.bank >= price;
  log({ v: visit, typ: 'SPAREN', label: what, level: p.level, preis: price, touren: tours, std: +(mins / 60).toFixed(1), geschafft: ok, geldbehaelter: p.cap,
    msg: `${what}: ${price} € bei Level ${p.level} – ${tours} Touren à 60 Min. = ${(mins / 60).toFixed(1)} Std. Spielzeit (Start ${start.toFixed(2)} €)` + (ok ? '' : ' – NICHT geschafft') + (price > p.cap ? ' – Preis größer als Geldbehälter!' : '') });
}
async function withdraw(need) {
  const p = await prof(); if (p.money >= need || p.bank <= 0) return;
  await go('schliessfach'); await click('Abheben', '.bwd', { fill: [['section.panel.active-view .bout', Math.ceil(Math.min(p.bank, p.cap - p.money, need - p.money + 1))]] });
}
// ---------- ein Besuch ----------
async function besuch() {
  let p = await prof();
  // 1) Pfand: ausladen + verkaufen, Mülltonne, Sortierspiel, Tagesbelohnung
  await go('missions', 'Belohnungsserie'); await click('Tagesbelohnung', '#claimdaily', { quiet: true });
  await go('pfand', 'Pfand sammeln');
  await click('Ausladen & verkaufen', '.kz-quick', { quiet: true });
  await click('Mülltonne', '.kz-bin-go', { quiet: true });
  if (await pg.evaluate(() => !!document.querySelector('#kz-sortgame .kz-sort-go:not([disabled])'))) {
    const fehler = visit % 3 === 0 ? 2 : 0; // manchmal absichtlich daneben sortieren
    const r = await pg.evaluate(async (fehler) => { const c = document.getElementById('kz-sortgame'); c.querySelector('.kz-sort-go').click(); await new Promise(r => setTimeout(r, 2000));
      const map = { Glas: 'g', Plastik: 'p', Dose: 'd' }; let n = 0, f = fehler;
      while (n < 30) { const now = c.querySelector('.kz-sort-now'); if (!now) break; let k = map[now.firstChild.textContent.trim()]; if (f > 0) { k = k === 'g' ? 'p' : 'g'; f--; }
        const bt = [...c.querySelectorAll('.kz-sort-bin')].find(x => x.dataset.k === k); if (!bt) break; bt.click(); n++; await new Promise(r => setTimeout(r, 120)); }
      await new Promise(r => setTimeout(r, 2500)); return c.querySelector('.kz-sort-msg')?.innerText.trim(); }, fehler);
    log({ v: visit, typ: r ? 'OK' : 'KEINE-RÜCKMELDUNG', label: 'Sortierspiel', msg: r });
  }
  // 2) Verbrechen: zwei Versuche mit dem besten Verbrechen, das Energie/Chance erlauben
  p = await prof();
  if (!p.jail && visit % 3 === 0) {
    await go('pfand', 'Verbrechen');
    if (visit < 6) log({ v: visit, typ: 'INFO', label: 'Verbrechen-Karten', msg: await pg.evaluate(() => [...document.querySelectorAll('section.panel.active-view .crime-pick')].map(b => b.closest('.card,li,div').innerText.replace(/\s+/g, ' ').slice(0, 140)).join(' || ')) });
    for (let i = 0; i < 2; i++) {
      const m = await click('Verbrechen', '.crime-pick', { pick: `e=>{const t=e.closest('.card,li,div').innerText;const c=t.match(/(\\d+) ?%/);return c&&+c[1]<=30?+c[1]:null}` });
      if (m == null || /knast|erwischt|festgenommen/i.test(m)) break;
    }
    p = await prof();
    if (p.jail) { await click('Kaution', '.crime-paybail', { quiet: true }) ?? await (async () => { await go('kronkorken'); await click('Wärter bestechen', '.kkbuy[data-id="knast"]', { quiet: true }); })(); }
  }
  // 3) Schnorren (Passanten)
  if (full()) await go('begging'); if (full()) for (let i = 0; i < 2; i++) if (await click('Passanten anschnorren', '#beg', { quiet: i > 0 }) == null) break;
  // 4) Körper: essen / waschen
  p = await prof();
  if (p.hunger != null && p.hunger < 45 || p.energy < 30 || p.promille > 1.5) {
    await pg.evaluate(() => window.openDrinkShopFromQuickbar?.()); await pg.waitForTimeout(1800);
    await click('Essen', '.kf-eat', { pick: priceFn(p.money, 0.1) });
    await pg.evaluate(() => document.querySelector('#kiezmodalclose')?.click()); await pg.waitForTimeout(300);
  }
  if (p.clean != null && p.clean < 55) { await go('waschhaus'); await click('Waschhaus: kaufen', '.kz-wh-buy', { pick: priceFn(p.money, 0.15), quiet: true }); await click('Waschen', '.kz-wh-go', { pick: priceFn(p.money, 0.2) }); }
  // 5) Kämpfe: Computer-Gegner, Kiezboss, Testpartner
  if (!p.jail) {
    await go('pvp');
    for (let k = 1; k <= 5; k++) await click('Computer-Gegner ' + k, `.kz-npc:nth-child(${k}) .kz-npc-go`, { quiet: true });
    await click('Kiezboss', '.kz-wb-hit', { quiet: true });
    await click('Angriff ' + PARTNER, '.attackplayer', { within: PARTNER, quiet: true });
  }
  // 6) Weiterbildung: abschließen, starten, Warteschlange füllen
  await go('training', 'Lernwarteschlange'); await click('Weiterbildung abschließen', '#finishtraining', { quiet: true });
  await go('training', 'Fähigkeiten'); p = await prof();
  const prio = ['streetwise', 'attack', 'defense', 'social', 'stamina', 'speech', 'music', 'pickpocket'];
  const order = prio.slice().sort((a, b) => ((visit + prio.indexOf(a)) % 4) - ((visit + prio.indexOf(b)) % 4));
  // Reicht das Geld nicht für die gewünschte Weiterbildung: Pfand sammeln, bis es reicht – und messen, wie lange das dauert
  const busy = await pg.evaluate(() => { const t = window.kiezProfile?.training_ends_at; return !!t && new Date(t) > new Date(); });
  const pr = await pg.evaluate(s => { const b = document.querySelector(`.trainbtn[data-skill="${s}"]`); const m = b && b.textContent.match(/(\d[\d.]*,\d\d) ?€/); return m ? +m[1].replace(/\./g, '').replace(',', '.') : null; }, order[0]);
  if (!busy && pr != null && (await prof()).money < pr) { await earnFor(pr, 'Weiterbildung ' + order[0]); await withdraw(pr); await go('training', 'Fähigkeiten'); }
  for (const s of order) if (/gestartet/i.test(await click('Weiterbildung ' + s, `.trainbtn[data-skill="${s}"]`, { quiet: true }) || '')) break;
  await go('training', 'Lernwarteschlange');
  let q = 0; for (const s of order) { if (q >= 2) break; await pg.selectOption('section.panel.active-view .kz-q-skill', { index: prio.indexOf(s) }).catch(() => {}); const m = await click('Einplanen ' + s, '.kz-q-add', { quiet: true }); if (m == null || /voll|maximal/i.test(m)) break; if (/eingeplant/i.test(m)) q++; }
  // 7) Einkaufen: Ausrüstung, Sammelgebiet, Instrument, Begleiter, Unterkunft, Lager
  if (visit % 4 === 0 || full()) {
  p = await prof();
  // Geld aus dem Schließfach holen, bis die Tasche voll ist (wie ein Spieler vor dem Einkauf)
  if (p.bank > 1 && p.money < p.cap - 1) { await go('schliessfach'); await click('Abheben', '.bwd', { fill: [['section.panel.active-view .bout', Math.floor(Math.min(p.bank, p.cap - p.money))]] }); p = await prof(); }
  await go('store', 'Zubehör'); await click('Geldbehälter ausbauen', '.buycontainertier', { quiet: true }); p = await prof();
  for (const tab of ['Waffen', 'Kleidung', 'Zubehör']) { await go('store', tab); await click('Kaufen ' + tab, '.buyitem', { pick: priceFn(p.money, 0.6), quiet: true }); p = await prof(); }
  for (const t of ['Waffen', 'Kleidung & Schutz', 'Zubehör']) { await go('ausruestung', t);
    // stärkstes Stück anlegen (ATT + DEF aus der Karte)
    await click('Anlegen ' + t, 'button', { pick: `e=>{if(!/^anlegen/i.test(e.textContent.trim()))return null;const t=e.closest('.card').innerText;const a=t.match(/(?:ATT|Angriff)\\s*\\+?(\\d+)/i),d=t.match(/(?:DEF|Verteidigung)\\s*\\+?(\\d+)/i);const v=x=>{const t=x.closest('.card').innerText;const a=t.match(/(?:ATT|Angriff)\\s*\\+?(\\d+)/i),d=t.match(/(?:DEF|Verteidigung)\\s*\\+?(\\d+)/i);return (a?+a[1]:0)+(d?+d[1]:0)};const cur=Math.max(0,...[...document.querySelectorAll('section.panel.active-view button')].filter(b=>/^ablegen/i.test(b.textContent.trim())).map(v));return v(e)>cur?v(e):null}`, quiet: true }); }
  await go('income', 'Sammelgebiete'); await click('Sammelgebiet', '.area-unlock', { pick: priceFn(p.money, 0.8), quiet: true });
  await go('income', 'Instrumente'); await click('Instrument', '.buyinstrument', { pick: priceFn(p.money, 0.3), quiet: true }); await click('Hut ausleeren', '#musiccollect', { quiet: true });
  p = await prof(); await go('pets', 'Tierhandlung'); await click('Begleiter kaufen', '.buypet', { pick: priceFn(p.money, 0.5), quiet: true });
  await go('pets', 'Meine Begleiter'); await click('Tiertraining abschließen', '.finishpet', { quiet: true }); await click('Tiertraining', '.trainpet', { quiet: true });
  p = await prof(); await go('gear', 'Unterkünfte'); await click('Umziehen', 'button', { pick: `e=>/einziehen|umziehen|mieten|kaufen/i.test(e.textContent)?(${priceFn(p.money, 0.5)})(e):null`, quiet: true });
  }
  if (full()) {
  await go('gear', 'Pfandlager'); await click('Pfandlager ausbauen', 'button', { pick: `e=>/ausbauen|kaufen/i.test(e.textContent)?(${priceFn(p.money, 0.4)})(e):null`, quiet: true });
  }
  // 8) Nebenjob (bester freier)
  await go('nebenjobs'); await click('Nebenjob fertig', 'button', { pick: `e=>/abholen|kassieren|fertig/i.test(e.textContent)?1:null`, quiet: true });
  if (visit % 3 === 1) await click('Nebenjob', '.kz-job-go', { pick: 'last', quiet: true });
  // 9) Aufgaben, Geschichte, Figuren, Erfolge
  if (visit % 3 === 0) { await go('missions', 'Tagesauftrag'); for (let i = 0; i < 3; i++) if (await click('Tagesaufgabe', '.kz-dt-go', { quiet: true }) == null) break;
  await go('geschichte'); await click('Kapitel', 'button', { pick: `e=>/abholen|belohnung/i.test(e.textContent)?1:null`, quiet: true });
  await go('kiezfiguren'); await click('Kiez-Figur', '.kz-fig-go', { quiet: true });
  }
  if (full()) { await go('achievements', 'Erfolge'); await click('Erfolge prüfen', '#checkachievements'); }
  // 10) Seltenere Dinge im Wechsel
  if (full()) for (let k = 0; k < 12; k++) await extras(k);
  // 11) neue Tour: längste, die in den Zeitsprung passt
  // Turbo: nächster Besuch, sobald die Weiterbildung fertig ist (10 Min. bis 12 Std.)
  await refresh(); const tr = await pg.evaluate(() => window.kiezProfile?.training_ends_at).catch(() => null);
  const skip = Math.min(720, Math.max(240, tr ? Math.ceil((new Date(tr) - Date.now()) / 60000) + 1 : 240));  // Geld ist ab Level ~25 der Engpass → mind. 4 Std.
  await go('pfand', 'Pfand sammeln');
  const dur = await pg.evaluate(s => { const o = [...document.querySelectorAll('#durationselect option')].map(o => +o.value).filter(v => v <= s); return o.length ? Math.max(...o) : null; }, skip);
  if (dur) await pg.selectOption('#durationselect', String(dur)).catch(() => {});
  await click('Pfandtour ' + dur + ' Min.', '#collect');
  return skip;
}

async function extras(k) {
  const p = await prof();
  if (k === 0) { await go('missions', 'Glücksspiel'); await click('Glücksrad', '.kz-spin', { quiet: true }); if (p.money > 50) { await click('Rubbellos', '#buyscratch'); await click('Lotto', '.lbuy'); } }
  if (k === 1) { await go('kiosk'); await explore('kiosk', p.money); }
  if (k === 2) { await go('schliessfach'); if (p.money > 100) await click('Einzahlen', '.bdep', { fill: [['section.panel.active-view .bin', Math.floor(p.money * 0.1)]] }); }
  if (k === 3) { await go('zockerbude'); await explore('zockerbude', p.money); }
  if (k === 4) { await go('garage', 'Fahrzeuge'); await click('Führerschein', '.kz-lic', { quiet: true }); await click('Fahrzeug kaufen', '.kz-veh-buy', { pick: priceFn(p.money, 0.5), quiet: true }); await click('Fahrzeug nutzen', '.kz-veh-use', { pick: 'last', quiet: true });
    await go('garage', 'Schrottplatz'); await click('Ausschlachten', '.kz-scrap', { quiet: true }); await go('garage', 'Werkstatt'); await explore('garage', p.money); }
  if (k === 5) { await go('kronkorken'); await click('Plunderkiste', '.kkbuy[data-id="plunderkiste"]', { quiet: true }); await go('plunder', 'Meine Stücke'); await click('Doppelte verkaufen', '.kz-p-dups', { quiet: true }); await click('Plunder anlegen', 'button', { pick: `e=>/anlegen/i.test(e.textContent)?1:null`, quiet: true }); await go('plunder', 'Basteln'); await click('Basteln', '.craft-go', { pick: priceFn(p.money, 0.3), quiet: true }); }
  if (k === 6) { await go('gangs'); if (!(await pg.evaluate(() => /Bandenkasse|Mitglieder/.test(document.getElementById('gangs')?.innerText || ''))) && p.money > 120) await click('Bande gründen', '.gcreate', { fill: [['section.panel.active-view .gname', 'Testbande Durchspiel'], ['section.panel.active-view .gtag', 'TDS']] }); else await explore('gangs', p.money); await go('bandenhaus'); await explore('bandenhaus', p.money); }
  if (k === 7) { await go('basar'); await explore('basar', p.money); await go('auktion'); await explore('auktion', p.money); }
  if (k === 8) { await go('kredithai'); if (p.level > 5 && visit % 24 === 8) await click('Kredit', '.kz-l-take', { fill: [['section.panel.active-view .kz-l-amt', 50]] }); else await explore('kredithai', p.money); await go('apotheke'); await explore('apotheke', p.money); }
  if (k === 9) { await go('chat'); await click('Chat', '.csend', { fill: [['section.panel.active-view textarea, section.panel.active-view input[type=text]', 'Testkonto spielt durch (Besuch ' + visit + ')']] }); await go('stadtteile'); await click('Revier', '.dpick', { quiet: true }); for (const v of ['saison', 'statistik', 'career', 'leaderboard', 'kampfprotokoll', 'profil', 'wettbewerb', 'citymap']) await go(v); }
  if (k === 10) { await go('messages', 'Posteingang'); await explore('messages', p.money); await go('freunde'); await click('Spieler suchen', '.fsearch', { fill: [['section.panel.active-view input', PARTNER]] }); }
  if (k === 11) { await go('store', 'Verteidigung'); await click('Verteidigung kaufen', '.buydefense', { pick: priceFn(p.money, 0.2), quiet: true }); await go('overview'); await explore('overview', p.money); }
}
// Unbekannte Seiten: alle freien, ungefährlichen Knöpfe einmal drücken (Eingabefelder mit kleinen Werten)
async function explore(view, money) {
  const n = await pg.evaluate(() => document.querySelectorAll('section.panel.active-view button').length);
  const seen = new Set();
  for (let i = 0; i < Math.min(n, 14); i++) {
    const t = await pg.evaluate(([D, seen]) => { const els = [...document.querySelectorAll('section.panel.active-view button')].filter(e => e.offsetParent && !e.disabled && !new RegExp(D, 'i').test(e.textContent) && !seen.includes(e.textContent.trim()) && !e.closest('.section-tools,.kz-nav,.kiez-quickbar') && !e.classList.contains('attackplayer'));
      const e = els[0]; if (!e) return null; const c = e.closest('.card,.kf-box,li,div'); c?.querySelectorAll('input[type=number],input:not([type])').forEach(i => { if (!i.value) { i.value = '1'; i.dispatchEvent(new Event('input', { bubbles: true })); } }); e.setAttribute('data-kzbot', '1'); return e.textContent.trim(); }, [DANGER_X.source, [...seen]]);
    if (!t) break; seen.add(t);
    const pr = eurOf(t); if (pr != null && pr > money * 0.3) continue;
    await click(view + ': ' + t.slice(0, 40), '[data-kzbot="1"]', { quiet: true });
    await pg.evaluate(() => document.querySelectorAll('[data-kzbot]').forEach(e => e.removeAttribute('data-kzbot')));
  }
}

(async () => {
  await boot();
  for (; visit < START + BESUCHE; visit++) {
    let skip = 60; const t0 = Date.now();
    try { skip = await besuch(); } catch (e) { log({ v: visit, typ: 'BOT-FEHLER', msg: e.message.slice(0, 300) }); try { await b.close(); } catch {} await boot(); }
    let p = await prof(); if (p.level == null) { log({ v: visit, typ: 'BOT-FEHLER', msg: 'Profil fehlt – neu starten' }); try { await b.close(); } catch {} await boot(); p = await prof(); }
    snap({ v: visit, skip, t: new Date().toISOString(), sek: Math.round((Date.now() - t0) / 1000), ...p });
    console.log('Besuch', visit, 'Sprung', skip, 'Level', p.level, 'Punkte', p.xp, 'Geld', p.money, 'Bank', p.bank, (Date.now() - t0) / 1000 + 's');
    const r = await rpc('tester_skip_time', { minutes: skip }); if (r.err) log({ v: visit, typ: 'BOT-FEHLER', msg: 'skip ' + r.err });
    if (visit % 20 === 19) { await b.close(); await boot(); } else { await refresh(); }
  }
  await b.close();
})();
