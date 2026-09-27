// S1: Chat-Leiste (PC + Handy), Kiezpost-Empfänger, Meldungen: 69e (bleibt stehen), 69g (Timer-Ergebnis beim richtigen Platz)
const fs=require('fs');const lib=require('./lib');
(async()=>{
 const pw=(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim();let fails=0;
 const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
 const {b,pg}=await lib.open();pg.on('dialog',d=>d.accept());const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,pw);await pg.waitForTimeout(2500);
 // Leiste
 ok(await pg.evaluate(()=>!!document.querySelector('#kz-dock .kz-dock-bar')?.offsetParent),'Leiste unten rechts sichtbar');
 await pg.click('#kz-dock .kz-dock-bar');await pg.waitForTimeout(1500);
 await pg.fill('#kz-dock .kz-dock-in','Testnachricht der Chat-Leiste');await pg.click('#kz-dock .kz-dock-form button');await pg.waitForTimeout(2000);
 ok(await pg.evaluate(()=>document.querySelector('#kz-dock .kz-dock-body').innerText.includes('Testnachricht der Chat-Leiste')),'ALL-Chat senden');
 await pg.evaluate(()=>[...document.querySelectorAll('#kz-dock .kz-cm.mine')].filter(m=>m.innerText.includes('Testnachricht der Chat-Leiste')).forEach(m=>m.querySelector('[data-del]')?.click()));await pg.waitForTimeout(1500);
 ok(await pg.evaluate(()=>!document.querySelector('#kz-dock .kz-dock-body').innerText.includes('Testnachricht der Chat-Leiste')),'eigene Nachricht löschen');
 await pg.click('#kz-dock .kz-dock-tab[data-v="dm"]');await pg.waitForTimeout(1200);await pg.fill('#kz-dock .kz-dm-find','Behaar');await pg.waitForTimeout(1500);
 ok(await pg.evaluate(()=>/BehaarteUhse/.test(document.querySelector('#kz-dock .kz-dm-sugg').innerText)),'Empfänger-Vorschlag beim Tippen');
 const self=await pg.evaluate(()=>window.kiezProfile.username);await pg.fill('#kz-dock .kz-dm-find',self.slice(0,5));await pg.waitForTimeout(1500);
 ok(await pg.evaluate(n=>!document.querySelector('#kz-dock .kz-dm-sugg').innerText.includes(n),self),'eigener Name nie vorgeschlagen');
 await pg.reload();await pg.waitForTimeout(3500);
 ok(await pg.evaluate(()=>document.getElementById('kz-dock')?.classList.contains('open')),'Leiste bleibt nach Neuladen offen');
 await pg.click('#kz-dock .kz-dock-min');await pg.waitForTimeout(400);
 ok(await pg.evaluate(()=>!document.getElementById('kz-dock').classList.contains('open')),'einklappen');
 // Kiezpost
 await pg.evaluate(()=>window.kiezGo('messages'));await pg.waitForTimeout(2000);
 ok(await pg.evaluate(()=>document.getElementById('msgto').classList.contains('hide')&&!!document.getElementById('kz-msgname')?.offsetParent),'Kiezpost: Namensfeld statt Liste aller Spieler');
 // 69e: Meldung im Laden bleibt stehen
 await pg.evaluate(()=>window.kiezGo('store'));await pg.waitForTimeout(2000);
 await pg.evaluate(()=>{const el=[...document.querySelectorAll('.buyitem')].find(e=>e.offsetParent&&!e.disabled);el?.scrollIntoView({block:'center'});el?.click()});
 await pg.waitForTimeout(6500);
 ok(await pg.evaluate(()=>[...document.querySelectorAll('.kz-near .notice')].some(n=>n.offsetParent)),'Meldung nach 6 s noch sichtbar (69e)');
 // 69g: Schnorren am Englischen Garten, dann woanders klicken – Ergebnis muss beim Garten landen
 await pg.evaluate(()=>window.kiezGo('income'));await pg.waitForTimeout(2000);
 await pg.evaluate(l=>[...document.querySelectorAll('.panel.active-view .section-tools span')].find(x=>x.textContent.trim()===l)?.click(),'Schnorrplätze');await pg.waitForTimeout(1500);
 const started=await pg.evaluate(()=>{const c=document.querySelector('.card[data-spot="englischer_garten"]');const bt=c&&[...c.querySelectorAll('button')].find(x=>x.offsetParent&&!x.disabled);if(!bt)return false;bt.scrollIntoView({block:'center'});bt.click();return true});
 if(started){await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{const bt=[...document.querySelectorAll('.area-unlock, #buyarea')].find(x=>x.offsetParent);bt?.click()});
  await pg.waitForTimeout(26000);
  const r=await pg.evaluate(()=>{const n=[...document.querySelectorAll('.notice')].find(x=>x.offsetParent&&!x.classList.contains('kz-moved')&&/Spenden kassiert/i.test(x.innerText));return n?(n.closest('.card')?.dataset.spot||n.closest('.card')?.querySelector('b')?.textContent):null});
  ok(r==='englischer_garten','Schnorr-Ergebnis beim Englischen Garten (69g)','→ '+r);
 } else console.log('– Schnorrplatz gerade nicht startbar (Wartezeit)');
 // Handy
 await pg.setViewportSize({width:390,height:844});await pg.waitForTimeout(800);
 const m=await pg.evaluate(()=>{const r=document.querySelector('#kz-dock .kz-dock-bar').getBoundingClientRect();return {w:Math.round(r.width),right:Math.round(innerWidth-r.right),bottom:Math.round(innerHeight-r.bottom)}});
 ok(m.w<=64&&m.right<30,'Handy: runder Knopf unten rechts',JSON.stringify(m));
 await pg.click('#kz-dock .kz-dock-bar');await pg.waitForTimeout(1200);
 const full=await pg.evaluate(()=>{const r=document.querySelector('#kz-dock .kz-dock-panel').getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)});
 ok(full==='390x844','Handy: Chat als Vollbild',full);
 await pg.screenshot({path:require('os').tmpdir()+'/kz-chat-handy.png'});
 await pg.click('#kz-dock .kz-dock-min');
 console.log('JS-FEHLER:',errs.join(' | ')||'keine');console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close();
})();
