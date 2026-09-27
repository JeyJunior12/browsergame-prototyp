// Jeder Menüpunkt, jeder Knopf der Stadt-Leiste und jeder Stadtplan-Ort wie ein Spieler anklicken:
// landet man auf der inhaltlich richtigen Seite + Reiter, ganz oben? (Lehre: „Begleiter trainieren“ führte in den Tierladen)
const fs=require('fs');const lib=require('./lib.js');
(async()=>{const {b,pg}=await lib.open(process.env.URL);const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});await pg.waitForTimeout(4000);
 await pg.evaluate(()=>document.querySelectorAll('.kz-box-ov,#kz-tut').forEach(o=>o.remove()));
 const state=()=>pg.evaluate(()=>{const s=document.querySelector('section.panel.active-view');if(!s)return {};const vis=e=>e&&e.offsetParent!==null;
  const first=[...s.querySelectorAll('.card,.kf-box,.activity-card,.lead-card')].find(c=>vis(c)&&c.getBoundingClientRect().height>40);
  return {view:s.id,title:s.querySelector(':scope>h2')?.textContent.trim(),tab:s.querySelector(':scope>.section-tools span.subtab-active')?.textContent.trim()||'',
   first:(first?.querySelector('h3,b,strong')?.textContent||'').trim().slice(0,40),y:Math.round(scrollY)}});
 const seen={};const row=(k,st)=>{seen[k]=st;console.log([k.padEnd(38),(st.view||'?').padEnd(14),(st.tab||'–').padEnd(20),(st.title||'').slice(0,26).padEnd(27),(st.first||'').padEnd(40),'y='+st.y].join(' '))};
 // 1) Menü
 const menu=await pg.evaluate(()=>[...document.querySelectorAll('.kz-nav .kz-top')].map(b=>b.textContent.trim()));
 for(const top of menu){
  const items=await pg.evaluate(t=>{[...document.querySelectorAll('.kz-nav .kz-top')].find(b=>b.textContent.trim()===t).click();return [...document.querySelectorAll('.kz-drop button')].map(b=>b.textContent.trim())},top);
  for(const it of items){await pg.evaluate(()=>scrollTo(0,400));
   await pg.evaluate(([t,i])=>{const tb=[...document.querySelectorAll('.kz-nav .kz-top')].find(b=>b.textContent.trim()===t);if(document.querySelector('.kz-drop').classList.contains('hide'))tb.click();[...document.querySelectorAll('.kz-drop button')].find(b=>b.textContent.trim()===i).click()},[top,it]);
   await pg.waitForTimeout(2200);row('MENÜ '+top+' › '+it,await state());}
  await pg.evaluate(()=>document.body.click());}
 // 2) Stadt-Leiste
 await pg.evaluate(()=>window.kiezGo('store'));await pg.waitForTimeout(2000);
 const qb=await pg.evaluate(()=>[...document.querySelectorAll('.kiez-quickbar button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()));
 for(const q of qb){await pg.evaluate(()=>scrollTo(0,400));await pg.evaluate(q=>[...document.querySelectorAll('.kiez-quickbar button')].find(b=>b.offsetParent&&b.textContent.trim()===q)?.click(),q);await pg.waitForTimeout(2200);row('STADTLEISTE '+q,await state());
  await pg.evaluate(()=>{if(!document.querySelector('.kiez-quickbar button')?.offsetParent)window.kiezGo('store')});await pg.waitForTimeout(800);}
 // 3) Stadtplan-Orte
 await pg.evaluate(()=>window.kiezGo('citymap'));await pg.waitForTimeout(2000);
 const places=await pg.evaluate(()=>[...document.querySelectorAll('#citymap .kz-place')].map(p=>p.textContent.trim()).filter(Boolean));
 for(const pl of places){await pg.evaluate(()=>window.kiezGo('citymap'));await pg.waitForTimeout(1500);await pg.evaluate(p=>[...document.querySelectorAll('#citymap .kz-place')].find(x=>x.textContent.trim()===p)?.click(),pl);await pg.waitForTimeout(2200);row('STADTPLAN '+pl,await state());}
 // feste Erwartungen (inhaltlich richtige Seite + Reiter) – Lehre aus Nutzer-Meldungen
 const EXP={'MENÜ Mein Kiez › Begleiter':['pets','Meine Begleiter'],'MENÜ Kampf › Begleiter trainieren':['pets','Meine Begleiter'],'STADTLEISTE Tierhandlung':['pets','Tierhandlung'],'STADTPLAN Tierhandlung':['pets','Tierhandlung'],
  'MENÜ Stadt › Waschhaus':['waschhaus',''],'STADTLEISTE Waschhaus':['waschhaus',''],'STADTPLAN Waschhaus':['waschhaus',''],'MENÜ Aktionen › Schnorren':['begging',''],
  'MENÜ Aktionen › Pfand sammeln':['pfand','Pfand sammeln'],'MENÜ Aktionen › Verbrechen':['pfand','Verbrechen'],'STADTPLAN Pfandannahme':['pfand','Pfand sammeln'],
  'MENÜ Stadt › Glücksspiel & Lotto':['missions','Glücksspiel'],'STADTLEISTE Musikladen':['income','Instrumente'],'MENÜ Stadt › Schnorrplätze & Musik':['income','Schnorrplätze']};
 let fails=0;for(const [k,[v,t]] of Object.entries(EXP)){const st=seen[k];const good=st&&st.view===v&&(st.tab||'')===t;if(!good){fails++;console.log('✗ ERWARTET',k,'→',v,t||'–','BEKOMMEN',st?st.view+' '+(st.tab||'–'):'nicht gefunden')}}
 const high=Object.entries(seen).filter(([,st])=>st.y>0);if(high.length){fails+=high.length;high.forEach(([k,st])=>console.log('✗ NICHT OBEN',k,'y='+st.y))}
 console.log('JS-FEHLER',errs.join(' | ')||'keine');console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close()})();
