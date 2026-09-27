// 147/148: Reiter „Ausrüstung“ (Anlegen/Ablegen außerhalb des Ladens) und Postfach als Gesprächsliste ohne Überlappung
const fs=require('fs');const lib=require('./lib.js');let fails=0;
const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
(async()=>{const {b,pg}=await lib.open(process.env.URL);const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});
 await pg.evaluate(()=>document.querySelectorAll('.kz-box-ov').forEach(o=>o.remove()));
 // über das Menü öffnen wie ein Spieler
 await pg.evaluate(()=>{const top=[...document.querySelectorAll('.kz-nav .kz-top')].find(b=>/Mein Kiez/i.test(b.textContent));top?.click()});await pg.waitForTimeout(600);
 const inMenu=await pg.evaluate(()=>{const b=[...document.querySelectorAll('.kz-drop button')].find(x=>x.textContent.trim()==='Ausrüstung');if(b)b.click();return !!b});
 ok(inMenu,'Menüpunkt Mein Kiez › Ausrüstung');await pg.waitForTimeout(3500);
 const tabs=await pg.evaluate(()=>[...document.querySelectorAll('#ausruestung > .section-tools span')].map(s=>s.textContent.trim()).join(', '));
 ok(tabs==='Übersicht, Waffen, Kleidung & Schutz, Zubehör','Reiter',tabs);
 ok(await pg.evaluate(()=>document.querySelectorAll('#ausruestung .kz-slot').length===4&&/Deine Kampfwerte/.test(document.getElementById('ausruestung').innerText)),'Übersicht: 4 Plätze + Kampfwerte');
 let done=false;
 for(const t of ['Waffen','Kleidung & Schutz','Zubehör']){
  await pg.evaluate(t=>[...document.querySelectorAll('#ausruestung > .section-tools span')].find(s=>s.textContent.trim()===t).click(),t);await pg.waitForTimeout(600);
  const n=await pg.evaluate(()=>[...document.querySelectorAll('#ausruestung .kz-gear')].filter(c=>c.offsetParent).length);
  console.log('  ',t+':',n,'Stück');
  if(n&&!done){done=true;
   const r=await pg.evaluate(async()=>{const c=[...document.querySelectorAll('#ausruestung .kz-gear')].find(c=>c.offsetParent);const id=c.dataset.id,before=c.querySelector('.kz-geq').textContent;c.querySelector('.kz-geq').click();await new Promise(r=>setTimeout(r,3500));
    const c2=document.querySelector('#ausruestung .kz-gear[data-id="'+id+'"]');return {before,after:c2?.querySelector('.kz-geq').textContent,msg:document.querySelector('#ausruestung .kz-gear-msg:not(:empty)')?.innerText||c.querySelector('.kz-gear-msg')?.innerText}});
   ok(r.before!==r.after,'Anlegen/Ablegen wechselt ('+r.before+' → '+r.after+')',r.msg);
   // zurücksetzen
   await pg.evaluate(async id=>{},null);
  }
 }
 if(process.env.SHOT)await pg.screenshot({path:process.env.SHOT+'/ausruestung.png',fullPage:true});
 await pg.evaluate(()=>window.kiezGo('messages'));await pg.waitForTimeout(4000);
 const ib=await pg.evaluate(()=>{const i=document.getElementById('inbox');const card=i?.closest('.card');const th=card?.querySelector('.generated-item-thumb');if(!i)return null;
  const a=i.getBoundingClientRect(),t=th?th.getBoundingClientRect():null;const over=t&&!(a.top>=t.bottom-2||a.left>=t.right-2||a.bottom<=t.top+2);return {list:!!i.querySelector('.kz-inbox, .kf-muted'),over,txt:i.innerText.slice(0,60)}});
 ok(ib&&ib.list&&!ib.over,'Postfach als Liste, nichts überlappt das Bild (148)',JSON.stringify(ib));
 if(process.env.SHOT)await pg.screenshot({path:process.env.SHOT+'/postfach.png',fullPage:true});
 ok(!errs.length,'JS-Fehler',errs.join(' | ')||'keine');
 console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close()})();
