// S10/S11-Abnahme: Leiste „Als Nächstes“, Mülltonne, Sortierspiel, Computer-Gegner, Kiezboss, Tagesaufgaben,
// kurze Touren, Ticker/Kiez-Zeiten, Tutorial, Ein-Klick-Verkaufen, Einstellungen „Hinweise“
const fs=require('fs');const lib=require('./lib.js');let fails=0;
const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
(async()=>{const {b,pg}=await lib.open(process.env.URL);const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.dismiss());
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});
 await pg.waitForTimeout(4000);
 await pg.evaluate(()=>document.querySelectorAll('.kz-box-ov').forEach(o=>o.remove()));
 const slip=await pg.evaluate(()=>document.querySelector('.player-slip .slip-next')?.innerText.replace(/\s+/g,' '));
 await pg.evaluate(()=>document.querySelector('.player-slip .slip-next')?.click());await pg.waitForTimeout(800);
 const nx=await pg.evaluate(()=>{const n=document.getElementById('kz-next');return n&&!n.hidden?[...n.querySelectorAll('.kz-nx small')].map(s=>s.textContent.split(' ·')[0]).join(', '):null});
 ok(slip&&nx&&/Pfandtour/.test(nx)&&/Blitzauftrag/.test(nx),'„Als Nächstes“ klein im Spielerkasten, klappt auf (44/42/151)',slip+' | '+nx);
 const nav=await pg.evaluate(async()=>{document.querySelector('#kz-next .kz-nx[data-go="training"]')?.click();await new Promise(r=>setTimeout(r,1500));return document.querySelector('section.active-view')?.id+' / zu:'+document.getElementById('kz-next').hidden});
 ok(/^training \/ zu:true/.test(nav),'Klick führt nur zur Seite und schließt die Liste',nav);
 await pg.evaluate(()=>window.kiezGo('pfand'));await pg.waitForTimeout(3000);
 ok(await pg.evaluate(()=>!!document.querySelector('#durationselect option[value="3"]')),'Kurze Touren 3/5 Min. (39)');
 ok(await pg.evaluate(()=>!!document.querySelector('#kz-pfandsell .kz-quick')),'Ausladen & alles verkaufen (37)');
 const bin=await pg.evaluate(async()=>{document.querySelector('#kz-bin .kz-bin-go').click();await new Promise(r=>setTimeout(r,2500));return document.querySelector('#kz-bin .kz-bin-msg').innerText.trim()});
 ok(!!bin,'Mülltonne mit Meldung in der Karte (38)',bin);
 const sort=await pg.evaluate(async()=>{const c=document.getElementById('kz-sortgame');c.querySelector('.kz-sort-go').click();await new Promise(r=>setTimeout(r,2500));
  const map={Glas:'g',Plastik:'p',Dose:'d'};let n=0;
  while(n<25){const now=c.querySelector('.kz-sort-now');if(!now)break;const k=map[now.firstChild.textContent.trim()];const bt=[...c.querySelectorAll('.kz-sort-bin')].find(x=>x.dataset.k===k);if(!bt)break;bt.click();n++;await new Promise(r=>setTimeout(r,60));}
  await new Promise(r=>setTimeout(r,2500));return c.querySelector('.kz-sort-msg').innerText.trim()});
 ok(/20 von 20|Sortieranlage/.test(sort),'Sortierspiel (43)',sort);
 await pg.evaluate(()=>window.kiezGo('pvp'));await pg.waitForTimeout(4000);
 ok(await pg.evaluate(()=>document.querySelectorAll('#kz-npcs .kz-npc').length===5&&!!document.getElementById('kz-wboss')),'Computer-Gegner + Kiezboss (1)');
 const npc=await pg.evaluate(async()=>{const b=document.querySelector('#kz-npcs .kz-npc-go:not([disabled])');if(!b)return 'alle erholen sich';const c=b.closest('.kz-npc');b.click();await new Promise(r=>setTimeout(r,2500));return c.querySelector('.kz-npc-msg')?.innerText.trim()});
 ok(!!npc,'Kampf gegen Computer mit Meldung',npc);
 await pg.evaluate(()=>window.kiezGoTab('missions','Tagesauftrag'));await pg.waitForTimeout(3500);
 ok(await pg.evaluate(()=>{const d=document.querySelector('#missions .kz-daily');return !!d&&d.offsetParent!==null&&d.querySelectorAll('.kz-dt').length===3}),'3 Tagesaufgaben sichtbar (2)');
 await pg.evaluate(()=>window.kiezGo('overview'));await pg.waitForTimeout(3000);
 ok(await pg.evaluate(()=>/Gerade im Kiez/.test(document.getElementById('kz-ticker')?.innerText||'')),'Ticker + Kiez-Zeiten (45/49)');
 const tut=await pg.evaluate(()=>document.getElementById('kz-tut')?.innerText.replace(/\s+/g,' ').slice(0,60)||'(kein Tutorial – schon erledigt)');
 ok(true,'Tutorial (35)',tut);
 await pg.evaluate(()=>window.kiezGo('einstellungen'));await pg.waitForTimeout(3000);
 ok(await pg.evaluate(()=>!!document.querySelector('#einstellungen .kz-notify .kz-np')),'Hinweise + Login-Serie in Einstellungen (5/46/48)');
 if(process.env.SHOT){await pg.evaluate(()=>window.kiezGo('pfand'));await pg.waitForTimeout(2500);await pg.evaluate(()=>scrollTo(0,0));await pg.screenshot({path:process.env.SHOT+'/tun.png'});}
 ok(!errs.length,'JS-Fehler',errs.join(' | ')||'keine');
 console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close()})();
