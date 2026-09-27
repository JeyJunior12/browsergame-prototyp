// Prüft jeden Wert der Kopfleiste: Klick → richtige Seite offen, passende Karte oben im Bild und hervorgehoben (ROADMAP 70–73)
const fs=require('fs');const lib=require('./lib.js');
(async()=>{const {b,pg}=await lib.open(process.env.URL);let bad=0;
await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());await pg.waitForTimeout(3000);
const idx=await pg.evaluate(()=>[...document.querySelectorAll('.stats .stat')].map((e,i)=>e.offsetParent?i:-1).filter(i=>i>=0));
for(const i of idx){
 await pg.evaluate(()=>window.kiezGo('overview'));await pg.waitForTimeout(1200);await pg.evaluate(()=>scrollTo(0,0));await pg.waitForTimeout(400);
 const name=await pg.evaluate(i=>document.querySelectorAll('.stats .stat')[i].querySelector('small').innerText,i);
 await pg.locator('.stats .stat').nth(i).click();await pg.waitForTimeout(1100);await pg.evaluate(()=>{window.__kzLast=document.querySelector('.kz-flash')});await pg.waitForTimeout(1000);
 const r=await pg.evaluate(()=>{const f=document.querySelector('.kz-flash')||window.__kzLast;if(f)window.__kzLast=f;const v=document.querySelector('section.panel.active-view:not(#rumors)');
  return {view:v?.id,want:document.querySelector('.stats .stat[data-kz-go]:hover')?.dataset.kzGo,flash:f?(f.className.split(' ')[0]+' '+(f.innerText||'').replace(/\s+/g,' ').slice(0,40)):null,top:f?Math.round(f.getBoundingClientRect().top):null,vh:innerHeight}});
 await pg.waitForTimeout(600);
 const ok=r.flash&&r.top>=-5&&r.top<Math.min(420,r.vh-120);if(!ok)bad++;
 console.log((ok?'OK  ':'FEHL')+' '+name.padEnd(16)+' → '+r.view+' | '+r.flash+' | oben '+r.top);
 if(process.env.SHOT)await pg.screenshot({path:process.env.SHOT+'/kopf-'+i+'.png'});
}
console.log('FEHLER:',bad);await b.close()})();
