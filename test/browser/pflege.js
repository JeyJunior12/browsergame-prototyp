// S7-Abnahme Körperpflege/Hunger/Sucht (78–85, 24, 25): Zustandskarte mit Stufen, neue Wasch-Stufen, Apotheke, Gegner-Stufe
const fs=require('fs');const lib=require('./lib.js');let fails=0;
const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
(async()=>{const {b,pg}=await lib.open(process.env.URL);const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});
 // seit Nutzerwunsch: eigenes Waschhaus statt Reiter „Körperpflege“ beim Schnorren
 await pg.evaluate(()=>window.kiezGo('waschhaus'));await pg.waitForTimeout(3500);
 const k=await pg.evaluate(()=>{const c=document.querySelector('#waschhaus .kz-wh-state');return c&&c.offsetParent?{t:c.querySelector('h3').textContent,rows:c.querySelectorAll('.kz-wh-why tr').length,now:c.querySelector('.kz-wh-why tr.kz-now td')?.textContent,hunger:/Hunger/.test(c.innerText),sucht:/Sucht/.test(c.innerText)}:null});
 ok(k&&k.rows===4&&k.now,'Zustandskarte mit 4 Stufen, aktuelle markiert (79)',k&&k.t);
 ok(k&&k.hunger&&k.sucht,'Hunger + Sucht sichtbar (24/25)');
 const tiers=await pg.evaluate(()=>[...document.querySelectorAll('#waschhaus .kz-wash')].map(c=>c.dataset.t).join(','));
 ok(tiers==='brunnen,katzenwaesche,schwamm,schwimmbad,waschanlage,friseur','Waschen gestaffelt (85)',tiers);
 const r=await pg.evaluate(async()=>{const c=document.querySelector('#waschhaus .kz-wash[data-t="katzenwaesche"]');const bt=c.querySelector('.kz-wh-go');if(!bt)return 'gesperrt: '+c.querySelector('button')?.textContent;bt.click();await new Promise(r=>setTimeout(r,2500));return c.querySelector('.kz-wash-msg')?.innerText.trim()||document.querySelector('#waschhaus .kz-wash[data-t="katzenwaesche"] .kz-wash-msg')?.innerText.trim()});
 ok(/Katzenwäsche|sauber|blitzsauber|Kohle/i.test(r),'Waschen: Meldung in der Karte',r);
 ok(await pg.evaluate(()=>{window.kiezGo('begging');return true})&&!(await pg.evaluate(()=>new Promise(r=>setTimeout(()=>r([...document.querySelectorAll('#begging .wash-list')].some(e=>e.offsetParent)),2500)))),'Schnorren zeigt keine Körperpflege mehr');
 if(process.env.SHOT)await pg.screenshot({path:process.env.SHOT+'/pflege.png',fullPage:true});
 await pg.evaluate(()=>window.kiezGo('apotheke'));await pg.waitForTimeout(3000);
 ok(await pg.evaluate(()=>{const c=document.querySelector('#apotheke .kz-apo');return !!c&&c.offsetParent!==null&&!!c.querySelector('.kz-heal')&&!!c.querySelector('.kz-detox')}),'Apotheke: Behandeln + Entzugskur (83/25)');
 await pg.evaluate(()=>window.kiezGo('pvp'));await pg.waitForTimeout(3500);
 const tag=await pg.evaluate(()=>document.querySelector('#opponents .kz-tiertag')?.textContent||(document.querySelector('#opponents .card')?'fehlt':'keine Gegner'));
 ok(tag!=='fehlt','Gegner zeigen Aussehen (82)',tag);
 ok(!errs.length,'JS-Fehler',errs.join(' | ')||'keine');
 console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close()})();
