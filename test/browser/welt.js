// S12–S17-Abnahme: neue Seiten (Nebenjobs, Auktionshaus, Kiosk, Kredithai, Kiez-Figuren, Saison, Statistik, Garage)
// und Zusätze (Basar-Ausrüstung, Revanche/Kopfgeld/Turnier, Wettbüro, Ruf, Legende, Ranglisten, Glücksrad, Freunde, Kosmetik, Städte)
const fs=require('fs');const lib=require('./lib.js');let fails=0;
const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const {b,pg}=await lib.open(process.env.URL);const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.dismiss());
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});
 await pg.waitForTimeout(4000);
 await pg.evaluate(()=>document.querySelectorAll('.kz-box-ov').forEach(o=>o.remove()));
 const page=async(view,tab)=>{await pg.evaluate(([v,t])=>t?window.kiezGoTab(v,t):window.kiezGo(v),[view,tab]);await pg.waitForTimeout(3500);
  return pg.evaluate(v=>{const el=document.getElementById(v);return el&&el.offsetParent!==null?el.innerText.replace(/\s+/g,' ').trim():''},view)};
 // Klick auf den ersten freien Knopf im Container und Meldung im selben Container lesen
 const click=(sel,btn,msg)=>pg.evaluate(async([s,bt,m])=>{const c=document.querySelector(s);const b=c&&[...c.querySelectorAll(bt)].find(x=>!x.disabled&&x.offsetParent!==null);if(!b)return null;
   const box=b.closest('.card,.kf-box,.kz-bet,tr')||c;b.click();await new Promise(r=>setTimeout(r,2500));return ((box.querySelector(m)||c.querySelector(m))?.innerText||'').trim()},[sel,btn,msg]);
 for(const [v,l,re] of [['nebenjobs','Nebenjobs (4)',/Anfangen|Lohn/],['auktion','Auktionshaus (16)',/Auktionen/],['kiosk','Kiosk (17)',/Kiosk/],['kredithai','Kredithai (18)',/Kredithai/],
   ['kiezfiguren','Kiez-Figuren (34)',/.{80}/],['saison','Kiez-Saison (7)',/Saison/],['statistik','Statistik (36)',/Punkte/],['garage','Garage (53–64)',/Einkaufswagen|Bollerwagen/]]){
  const t=await page(v);ok(re.test(t)&&t.length>80,l,t.slice(0,70));}
 let m=await click('#nebenjobs','.kz-job-go,.kz-job-fin','.kz-job-msg');ok(m===null||m.length>3,'Nebenjob starten mit Meldung',m);
 // Kredithai nur ansehen (kein echter Kredit im Live-Testkonto); offene Schuld wird zurückgezahlt
 await page('kredithai');ok(await pg.evaluate(()=>!!document.querySelector('#kredithai .kz-l-take,#kredithai .kz-l-pay')),'Kredithai: Leihen/Zahlen-Knopf da');
 m=await click('#kredithai','.kz-l-pay','.kz-l-msg');ok(m===null||!!m,'Kredithai: offene Schuld zurückzahlen',m);
 await page('garage');
 for(const t of ['Fahrzeuge','Werkstatt','Schrottplatz','Rennen','Autoklau']){
  const vis=await pg.evaluate(t=>{const s=[...document.querySelectorAll('#garage > .section-tools span')].find(x=>x.textContent.trim()===t);if(!s)return -1;s.click();
   const el=[...document.querySelectorAll('#garage [data-rtab]')].find(x=>x.dataset.rtab===t);return el&&el.offsetParent!==null?el.innerText.trim().length:0},t);
  await pg.waitForTimeout(300);ok(vis>40,'Garage-Reiter „'+t+'“',vis);}
 m=await click('#garage','.kz-dig','.kz-dig-msg,.kz-scrap-msg');ok(m===null||!!m,'Schrottplatz buddeln',m);
 await page('basar');ok(await pg.evaluate(()=>!!document.querySelector('#basar .kz-ibox')),'Basar: Waffen & Ausrüstung (13)');
 await page('pvp');await pg.waitForTimeout(2000);ok(await pg.evaluate(()=>!!document.querySelector('#kz-fightx .kz-t-go')),'Prügelei: Kopfgeld + Turnier (20/21)');
 await page('zockerbude');await pg.waitForTimeout(1500);ok(await pg.evaluate(()=>!!document.querySelector('#zockerbude .kz-bets')),'Wettbüro (22)');
 await page('career');await pg.waitForTimeout(1000);ok(await pg.evaluate(()=>!!document.querySelector('#career .kz-rep')&&!!document.querySelector('#career .kz-legend')),'Karriere: Ruf + Legende (26/9)');
 await page('leaderboard');await pg.waitForTimeout(1500);ok(await pg.evaluate(()=>document.querySelectorAll('#leaderboard .kz-rk').length===5),'Weitere Ranglisten (14)');
 await page('missions','Glücksspiel');await pg.waitForTimeout(1000);
 ok(await pg.evaluate(()=>{const w=document.querySelector('#missions .kz-wheel');return !!w&&w.offsetParent!==null}),'Glücksrad im Reiter Glücksspiel (29)');
 m=await pg.evaluate(async()=>{const w=document.querySelector('#missions .kz-wheel');w.querySelector('.kz-spin').click();await new Promise(r=>setTimeout(r,5000));return w.querySelector('.kz-wheel-msg').innerText.trim()});ok(!!m,'Glücksrad drehen mit Meldung',m);
 await page('freunde');ok(await pg.waitForFunction(()=>/Zu zweit auf Pfandtour/.test(document.getElementById('freunde').innerText)&&/Geschenke/.test(document.getElementById('freunde').innerText),null,{timeout:12000}).then(()=>true,()=>false),'Freunde: Mentor/Geschenke/Duo (27/28/30)');
 await page('einstellungen');await pg.waitForTimeout(1500);ok(await pg.evaluate(()=>!!document.querySelector('#einstellungen .kz-cos')),'Kosmetik (23)');
 await page('stadtteile');await pg.waitForTimeout(1500);ok(await pg.evaluate(()=>!!document.querySelector('#stadtteile .kz-cities')),'Städte-Übersicht (10/123)');
 if(process.env.SHOT){await page('garage');await pg.evaluate(()=>scrollTo(0,0));await pg.screenshot({path:process.env.SHOT+'/welt.png'});}
 ok(!errs.length,'JS-Fehler',errs.join(' | ')||'keine');
 console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close()})();
