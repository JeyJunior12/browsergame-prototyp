// Runde 6 per Klick: Revier wählen, Schließfach, Hütchenspiel, Würfelduell, Chat, Kiez-Geschichte, Basar, Titel, Kampfprotokoll
const fs=require('fs');const lib=require('./lib');
(async()=>{
 const {b,pg}=await lib.open();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim());
 let fails=0;
 const go=async v=>{await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(2200)};
 const visNotes=()=>pg.evaluate(()=>[...document.querySelectorAll('.notice')].filter(n=>n.offsetParent).map(n=>n.innerText.replace(/\s+/g,' ').trim()));
 const click=async(label,sel,fill)=>{
  const before=new Set(await visNotes());if(fill){if(!await pg.$(fill[0])){console.log('–',label,'(Eingabefeld fehlt – z. B. kein Plunder vorhanden)');return}await pg.fill(fill[0],fill[1]);}
  const ok=await pg.evaluate(sel=>{const el=[...document.querySelectorAll(sel)].find(e=>e.offsetParent&&!e.disabled);if(!el)return false;el.scrollIntoView({block:'center'});el.click();return true},sel);
  if(!ok){console.log('–',label,'(kein Knopf sichtbar)');return}
  await pg.waitForTimeout(3000);const neu=(await visNotes()).filter(t=>!before.has(t)).join(' | ');
  if(!neu)fails++;console.log(neu?'✓':'✗',label,'→',(neu||'(keine Meldung)').slice(0,150));};
 await go('stadtteile');await click('Revier wählen','#stadtteile .dpick');
 await go('schliessfach');await click('Einzahlen','#schliessfach .bdep',['#schliessfach .bin','1']);await click('Abheben','#schliessfach .bwd',['#schliessfach .bout','0.5']);
 await go('zockerbude');await click('Hütchenspiel','#zockerbude .kf-cup',['#zockerbude .sstake','0.1']);
 await click('Würfelduell anbieten','#zockerbude .dnew',['#zockerbude .dstake','1']);
 await go('zockerbude');await click('Würfelduell zurückziehen','#zockerbude .dcancel');
 await go('chat');await click('Chat schreiben','#chat .csend',['#chat .cin','Moin, hier testet Claude den neuen Kiez-Chat.']);
 const inChat=await pg.evaluate(()=>document.querySelector('#chat .kf-chat')?.innerText.includes('testet Claude'));console.log(inChat?'✓':'✗','Nachricht steht im Chat');if(!inChat)fails++;
 await click('Chat-Nachricht löschen','#chat .cdel');
 await go('geschichte');const q=await pg.evaluate(()=>document.querySelector('#geschichte .kf-quest')?.innerText.replace(/\s+/g,' ').slice(0,90));console.log(q?'✓':'✗','Kiez-Geschichte →',q);if(!q)fails++;
 await click('Kapitel abholen','#geschichte .qclaim');
 await go('basar');const bz=await pg.evaluate(()=>document.querySelector('#basar')?.innerText.includes('Angebote im Kiez'));console.log(bz?'✓':'✗','Basar geladen');if(!bz)fails++;
 await click('Plunder einstellen','#basar .mlist',['#basar .mprice','1']);
 await go('einstellungen');await click('Titel übernehmen','#einstellungen .tsave');
 await go('kampfprotokoll');const kp=await pg.evaluate(()=>document.querySelector('#kampfprotokoll')?.innerText.includes('Angriffe'));console.log(kp?'✓':'✗','Kampfprotokoll');if(!kp)fails++;
 console.log('JS-FEHLER:',errs.join(' | ')||'keine');console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close();
})();
