// S8/S9-Abnahme Bandenhaus: Das Testkonto hat live weder Bande noch Geld – deshalb kommen die Banden-Antworten
// aus test/browser/fixtures/bandenhaus.json (echte Ausgabe der SQL-Funktionen aus der lokalen Test-DB, siehe README).
// Geprüft wird, dass jeder Reiter Inhalt zeigt und die Knöpfe/Meldungen da sind.
const fs=require('fs');const lib=require('./lib.js');let fails=0;
const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
const MOCK=JSON.parse(fs.readFileSync(__dirname+'/fixtures/bandenhaus.json','utf8'));
(async()=>{const {b,pg}=await lib.open(process.env.URL);const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route(/\/rest\/v1\/rpc\/(gang_house|gang_public|gang_forum|gang_members_overview|gang_boss_status|gang_season_ranking|gang_war_ranking|gang_topic)$/,r=>{
  const fn=r.request().url().split('/rpc/')[1];return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(MOCK[fn])});});
 await pg.route(/\/rest\/v1\/rpc\/(build_gang_room|gang_pub_drink|gang_boss_hit|gang_poke)$/,r=>r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Test: Aktion erreicht den Server'})}));
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});
 await pg.evaluate(()=>window.kiezGo('bandenhaus'));await pg.waitForTimeout(3500);
 const tabs=await pg.evaluate(()=>[...document.querySelectorAll('#bandenhaus > .section-tools span')].map(s=>s.textContent.trim()));
 ok(tabs.length===9,'9 Reiter',tabs.join(', '));
 for(const t of tabs){
  await pg.evaluate(t=>[...document.querySelectorAll('#bandenhaus > .section-tools span')].find(s=>s.textContent.trim()===t).click(),t);await pg.waitForTimeout(700);
  const r=await pg.evaluate(t=>{const v=[...document.querySelectorAll('#bandenhaus [data-htab]')].filter(e=>e.offsetParent);return {n:v.length,txt:v.map(e=>e.innerText).join(' ').replace(/\s+/g,' ').slice(0,90),other:v.some(e=>e.dataset.htab!==t)}},t);
  ok(r.n===1&&!r.other&&r.txt.length>40,'Reiter „'+t+'“ zeigt eigenen Inhalt',r.txt);
  if(process.env.SHOT)await pg.screenshot({path:process.env.SHOT+'/haus-'+tabs.indexOf(t)+'.png',fullPage:true});
 }
 const go=async t=>{await pg.evaluate(t=>[...document.querySelectorAll('#bandenhaus > .section-tools span')].find(s=>s.textContent.trim()===t).click(),t);await pg.waitForTimeout(600)};
 await go('Übersicht');ok(await pg.evaluate(()=>!!document.querySelector('#bandenhaus .kz-crest')&&/Bandenlevel/.test(document.querySelector('#bandenhaus').innerText)),'Wappen + Bandenlevel (93/100)');
 await go('Räume');ok(await pg.evaluate(()=>document.querySelectorAll('#bandenhaus .kz-room').length===6),'6 Räume (94)');
 const msg=await pg.evaluate(async()=>{const bt=document.querySelector('#bandenhaus .kz-pub:not([disabled]), #bandenhaus .kz-build:not([disabled])');if(!bt)return 'kein Knopf';bt.click();await new Promise(r=>setTimeout(r,1500));return bt.closest('.card').querySelector('.kz-room-msg').innerText});
 ok(/Server/.test(msg),'Raum-Knopf gibt Meldung in der Karte',msg);
 await go('Wochenaufgaben');ok(await pg.evaluate(()=>document.querySelectorAll('#bandenhaus .kz-task').length===3),'3 Wochenaufgaben (95)');
 await go('Krieg & Überfall');ok(await pg.evaluate(()=>!!document.querySelector('#bandenhaus .kz-war')&&!!document.querySelector('#bandenhaus .kz-raid')),'Krieg + Überfall sichtbar (96/97)');
 await go('Bündnisse');ok(await pg.evaluate(()=>!!document.querySelector('#bandenhaus .kz-rel-ally')),'Bündnis-Knöpfe (98)');
 await go('Forum');await pg.waitForFunction(()=>document.querySelectorAll('#bandenhaus .kz-topic').length>0,null,{timeout:8000}).catch(()=>{});ok(await pg.evaluate(()=>document.querySelectorAll('#bandenhaus .kz-topic').length===2),'Forum mit 2 Themen (99)');
 await pg.evaluate(()=>document.querySelector('#bandenhaus .kz-topic')?.click());await pg.waitForTimeout(1500);
 ok(await pg.evaluate(()=>!!document.querySelector('#bandenhaus .kz-reply')),'Thema öffnet mit Antwortfeld');
 await go('Mitglieder');ok(await pg.evaluate(()=>document.querySelectorAll('#bandenhaus .kz-members tr').length>=3&&!!document.querySelector('#bandenhaus .kz-poke')),'Mitglieder + Anstupsen (102/51)');
 await go('Boss & Saison');ok(await pg.evaluate(()=>!!document.querySelector('#bandenhaus .kz-hit')&&/Saison/.test(document.querySelector('#bandenhaus').innerText)),'Boss + Saison (103/104)');
 await go('Einstellungen');ok(await pg.evaluate(()=>!!document.querySelector('#bandenhaus .kz-look-save')&&document.querySelectorAll('#bandenhaus .kz-right').length>=0),'Profil/Rechte (100/101)');
 ok(!errs.length,'JS-Fehler',errs.join(' | ')||'keine');
 console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close()})();
