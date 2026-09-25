// Kauf- und Ausbau-Knöpfe per Klick: gibt jeder Knopf eine sichtbare Rückmeldung?
const fs=require('fs');const lib=require('./lib');
(async()=>{
 const {b,pg}=await lib.open();pg.on('dialog',d=>d.accept());
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim());
 const visNotes=()=>pg.evaluate(()=>[...document.querySelectorAll('.notice')].filter(n=>n.offsetParent).map(n=>n.innerText.replace(/\s+/g,' ').trim()));
 const go=async v=>{await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(2000)};
 const tab=async(label)=>{await pg.evaluate(l=>[...document.querySelectorAll('.panel.active-view .section-tools span, .kiez-quickbar button')].find(x=>x.textContent.trim()===l&&x.offsetParent)?.click(),label);await pg.waitForTimeout(2000)};
 let fails=0;
 // Klickt den ersten sichtbaren passenden Knopf und verlangt eine neue, sichtbare Meldung
 const click=async(label,sel)=>{
  const before=new Set(await visNotes());
  const found=await pg.evaluate(sel=>{const el=[...document.querySelectorAll(sel)].find(e=>e.offsetParent&&!e.disabled);if(!el)return null;el.scrollIntoView({block:'center'});el.click();return (el.textContent||'').trim().slice(0,40)},sel);
  if(!found){console.log('–',label,'(kein klickbarer Knopf – z. B. gesperrt oder schon erledigt)');return}
  await pg.waitForTimeout(3500);
  const neu=(await visNotes()).filter(t=>!before.has(t));
  if(!neu.length){fails++;console.log('✗ KEINE RÜCKMELDUNG:',label,'['+found+']')}
  else console.log('✓',label,'['+found+'] →',neu.join(' | ').slice(0,150));
 };
 const p=await pg.evaluate(()=>window.kiezProfile);console.log('Geld',p.money,'Energie',p.energy,'Level',p.level);
 await go('pfand');
 await click('Pfandtour ausladen','#finishcollect');
 await click('Pfand verkaufen','#sellallbtn, #sellbottlesbtn');
 await go('store');await tab('Waffen');
 await click('Waffe kaufen','.buyitem');
 await tab('Verkaufen');
 await click('Ausrüsten','.equipitem');
 await tab('Verteidigung');
 await click('Verteidigung kaufen','.buydefense');
 await go('pets');
 await click('Begleiter kaufen','.buypet');
 await click('Begleiter mitnehmen','.activatepet');
 await go('gear');
 await click('Umziehen','.haeuser-move-btn');
 await go('income');await tab('Instrumente');
 await click('Instrument kaufen','#buymusic');
 await tab('Schnorrplätze');
 await click('Sammelgebiet kaufen','#buyarea');
 await go('begging');await tab('Körperpflege');
 await click('Waschausstattung kaufen','#buywash');
 await go('apotheke');
 await click('Versicherung abschließen','#apobuyinsurance, #buyinsurance');
 await go('missions');await tab('Glücksspiel');
 await click('Rubbellos','#buyscratch');
 await go('store');await tab('Verkaufen');
 console.log('JS-FEHLER',errs.join(' | ')||'keine');
 console.log(fails?'FEHLENDE RÜCKMELDUNGEN: '+fails:'Alle Knöpfe mit Rückmeldung');
 await b.close();
})();
