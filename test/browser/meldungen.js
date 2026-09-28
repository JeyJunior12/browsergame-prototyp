// Erscheint die Meldung nach einem Klick direkt beim Knopf? (Abstand Knopf-Karte ↔ Meldung)
const fs=require('fs');const lib=require('./lib');
(async()=>{
 const {b,pg}=await lib.open();pg.on('dialog',d=>d.dismiss());const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim());
 let fails=0,tested=0;
 const cases=[['training','Fähigkeiten','.trainbtn'],['training','Konzentrieren','.concentration-start'],['store','Zubehör','.buyitem'],['store','Waffen','.buyitem'],
  ['store','Verteidigung','.buydefense'],['pfand','','#sellallbtn, #sellbottlesbtn'],['pfand','Verbrechen begehen','.crime-pick'],['pets','','.buypet'],
  ['apotheke','','#apobuyinsurance, #buyinsurance, .pharmacy-card button'],['waschhaus','','.kz-wh-go, .kz-wh-buy'],['waschhaus','','.kz-wash[data-t="friseur"] button, .kz-wash[data-t="schwimmbad"] button'],['income','Instrumente','#buymusic'],
  ['gear','','.haeuser-move-btn'],['missions','Glücksspiel','#buyscratch'],['kronkorken','','.kkbuy'],['schliessfach','','.bdep'],['zockerbude','','.dnew']];
 for(const [v,tab,sel] of cases){
  await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(1800);
  if(tab){await pg.evaluate(l=>[...document.querySelectorAll('.panel.active-view .section-tools span, .kiez-quickbar button')].find(x=>x.textContent.trim()===l&&x.offsetParent)?.click(),tab);await pg.waitForTimeout(1500);}
  await pg.evaluate(()=>document.querySelectorAll('.notice').forEach(n=>n.dataset.alt=n.innerText));
  const ok=await pg.evaluate(sel=>{const el=[...document.querySelectorAll(sel)].find(e=>e.offsetParent&&!e.disabled&&!e.classList.contains('hide'));if(!el)return false;el.scrollIntoView({block:'center'});
   const card=el.closest('.card, .kf-box, .activity-card, .drink, .lead-card, .action-block, .status-detail, .profile-wide-row, li');window.__kzt={title:(card?.querySelector('h3, b, h4')?.textContent||'').trim(),panel:el.closest('section.panel')?.id};
   el.setAttribute('data-kztest','1');el.click();return true},sel);
  if(!ok){console.log('–',v,tab,'(kein Knopf)');continue}
  await pg.waitForTimeout(3500);
  const r=await pg.evaluate(()=>{const S='.card, .kf-box, .activity-card, .drink, .lead-card, .action-block, .status-detail, .profile-wide-row, li';const btn=document.querySelector('[data-kztest]');
   const card=btn?.closest(S)||[...document.querySelectorAll('#'+__kzt.panel+' *')].filter(c=>c.matches(S)&&c.offsetParent).find(c=>(c.querySelector('h3, b, h4')?.textContent||'').trim()===__kzt.title);
   const neu=[...document.querySelectorAll('.notice')].filter(n=>n.offsetParent&&n.dataset.alt!==n.innerText);
   if(!neu.length)return {txt:'(keine neue Meldung)',dist:-1};
   const ref=(card||btn)?.getBoundingClientRect();const n=neu[neu.length-1];const nr=n.getBoundingClientRect();
   const inside=card&&card.contains(n);const dist=ref?Math.round(Math.max(0,nr.top-ref.bottom,ref.top-nr.bottom)):-1;
   document.querySelectorAll('[data-kztest]').forEach(x=>x.removeAttribute('data-kztest'));
   return {txt:n.innerText.trim().slice(0,70),dist:inside?0:dist,where:(n.closest(S)?.querySelector('h3,b')?.textContent||n.parentElement.id||'').trim().slice(0,30),card:__kzt.title.slice(0,30)}});
  tested++;const good=r.dist>=0&&r.dist<200&&(!r.where||!r.card||r.where===r.card||r.dist===0);// nicht nur nah, sondern in der eigenen Karte (Friseur/Brunnen)
 if(!good)fails++;
  console.log(good?'✓':'✗',(v+' '+tab).padEnd(28),'Abstand',String(r.dist).padStart(4),'px →',r.txt,good?'':'[Knopf-Karte: '+r.card+' | Meldung in: '+r.where+']');
 }
 console.log('JS-FEHLER:',errs.join(' | ')||'keine');const few=tested<6;// ohne gedrückte Knöpfe ist „alles gut“ wertlos (pleites Konto → alles gesperrt)
 console.log(few?'ZU WENIG GEPRÜFT: '+tested+' Fälle – Konto mit Geld nehmen':fails?'WEIT WEG / FALSCHE KARTE: '+fails:'ALLE MELDUNGEN BEIM KNOPF ('+tested+' Fälle)');await b.close();
})();
