// Klick-Roboter: klickt jedes Hauptmenü, jeden Menüpunkt, jeden Reiter und die Schnellleiste an
// und meldet leere Ansichten, JS-Fehler und fehlgeschlagene Server-Anfragen.
const fs=require('fs');
const URL0=process.argv[2]||'https://kiez.test/';
const MAIL=process.argv[3]||process.env.KIEZ_MAIL;
(async()=>{
 const {b,pg}=await require('./lib').open(URL0);
 const errs=[],bad=[];
 pg.on('pageerror',e=>errs.push(e.message));
 pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,160))});
 pg.on('response',async r=>{if(r.url().includes('supabase.co')&&r.status()>=400){let t='';try{t=(await r.text()).slice(0,160)}catch(e){}bad.push(r.status()+' '+r.url().replace(/^.*\/(rest|auth)\/v1\//,'').slice(0,90)+' '+t)}});
 const pw=(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim();
 await require('./lib').login(pg,MAIL,pw);
 const report=[];let n=0;
 const visibleText=()=>pg.evaluate(()=>{const s=document.querySelector('section.panel.active-view');if(!s)return {id:'KEINE',len:0,txt:''};
   // sichtbarer Inhalt ohne Überschrift und Reiterleiste
   const clone=[...s.querySelectorAll(':scope > *')].filter(x=>!x.matches('h2,.section-tools,.profile-paper-tabs,.section-scene'));
   const txt=clone.map(x=>x.innerText||'').join(' ').replace(/\s+/g,' ').trim();
   const r=s.getBoundingClientRect();return {id:s.id,len:txt.length,txt:txt.slice(0,110),h:Math.round(r.height)}});
 const check=async label=>{await pg.waitForTimeout(1200);const t0=Date.now();await pg.waitForFunction(()=>{const s=document.querySelector('section.panel.active-view');return s&&!s.innerText.includes('Lade …')},null,{timeout:10000}).catch(()=>{});const wt=Date.now()-t0;if(wt>2500)report.push('LANGSAM '+label+' '+wt+' ms');const v=await visibleText();n++;
   const empty=v.len<60;report.push((empty?'LEER ':'ok   ')+label+' → #'+v.id+' ('+v.len+' Zeichen) '+(empty?'“'+v.txt+'”':''));
   if(empty)await pg.screenshot({path:require('os').tmpdir()+'/kiez-leer_'+n+'.png'});
   // Reiter innerhalb der Seite
   const tabs=await pg.evaluate(()=>{const s=document.querySelector('section.panel.active-view');return s?[...s.querySelectorAll('.section-tools span,.section-tools button')].map(t=>t.textContent.trim()):[]});
   for(const t of tabs){
     await pg.evaluate(t=>{const s=document.querySelector('section.panel.active-view');[...s.querySelectorAll('.section-tools span,.section-tools button')].find(x=>x.textContent.trim()===t)?.click()},t);
     await pg.waitForTimeout(1200);const w=await visibleText();n++;const e2=w.len<60;
     report.push('   '+(e2?'LEER ':'ok   ')+'Reiter „'+t+'“ → #'+w.id+' ('+w.len+')'+(e2?' “'+w.txt+'”':''));
     if(e2)await pg.screenshot({path:require('os').tmpdir()+'/kiez-leer_'+n+'.png'});
   }};
 // Hauptmenü
 const groups=await pg.evaluate(()=>[...document.querySelectorAll('.classic-mainnav > button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()));
 for(const g of groups){
   await pg.evaluate(g=>[...document.querySelectorAll('.classic-mainnav > button')].find(b=>b.textContent.trim()===g).click(),g);await pg.waitForTimeout(700);
   const items=await pg.evaluate(()=>[...document.querySelectorAll('.classic-menu:not(.hide) button')].map(b=>b.textContent.trim()));
   if(!items.length){await check('Menü '+g);continue}
   for(const it of items){
     await pg.evaluate(g=>{const m=document.querySelector('.classic-menu');if(m.classList.contains('hide'))[...document.querySelectorAll('.classic-mainnav > button')].find(b=>b.textContent.trim()===g).click()},g);
     await pg.waitForTimeout(500);
     await pg.evaluate(it=>[...document.querySelectorAll('.classic-menu:not(.hide) button')].find(b=>b.textContent.trim()===it)?.click(),it);
     await check(g+' › '+it);
   }
 }
 // Sichtbare Reiterleiste: erst im Übersicht-Modus, dann im Stadt-Modus
 for(const start of ['overview','store']){
  await pg.evaluate(v=>window.kiezGo(v),start);await pg.waitForTimeout(2500);
  const quick=await pg.evaluate(()=>[...document.querySelectorAll('.kiez-quickbar button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()));
  report.push('--- Reiterleiste ('+start+'): '+quick.join(', '));
  for(const t of quick){await pg.evaluate(v=>window.kiezGo(v),start);await pg.waitForTimeout(1500);
   const ok=await pg.evaluate(t=>{const b=[...document.querySelectorAll('.kiez-quickbar button')].find(b=>b.textContent.trim()===t&&b.offsetParent);if(b){b.click();return true}return false},t);
   if(!ok){report.push('FEHLT Reiter „'+t+'“ nicht sichtbar');continue}
   await check('Reiterleiste „'+t+'“');
   await pg.evaluate(()=>{const m=document.querySelector('#kiezmodal');if(m&&!m.classList.contains('hide'))document.querySelector('#kiezmodalclose')?.click()})}
 }
 // Stadtkarte-Kacheln
 await pg.evaluate(()=>window.kiezGo('citymap'));await pg.waitForTimeout(1500);
 const tiles=await pg.evaluate(()=>[...document.querySelectorAll('#citymap [data-go]')].map((b,i)=>i+':'+(b.querySelector('b,h3,strong')?.textContent||b.textContent).trim().slice(0,30)));
 for(const t of tiles){const i=Number(t.split(':')[0]);await pg.evaluate(()=>window.kiezGo('citymap'));await pg.waitForTimeout(900);
   await pg.evaluate(i=>document.querySelectorAll('#citymap [data-go]')[i]?.click(),i);await check('Stadtkarte „'+t.slice(t.indexOf(':')+1)+'“');}
 console.log(report.join('\n'));
 console.log('\nLEER:',report.filter(r=>r.includes('LEER')).length,'von',n);
 console.log('JS-FEHLER:',[...new Set(errs)].join('\n  ')||'keine');
 console.log('SERVER-FEHLER:',[...new Set(bad)].join('\n  ')||'keine');
 await b.close();
})();
