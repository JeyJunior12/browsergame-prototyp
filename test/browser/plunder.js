// S6-Abnahme Plunderkiste (111–120): Reiter, Sammlung mit Umrissen, Sets, Sortieren/Filtern, Vergleich, Öffnen-Moment
const fs=require('fs');const lib=require('./lib.js');let fails=0;
const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
(async()=>{const {b,pg}=await lib.open(process.env.URL);const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});
 await pg.evaluate(()=>window.kiezGo('plunder'));await pg.waitForTimeout(3500);
 const tab=async t=>{await pg.evaluate(t=>[...document.querySelectorAll('#plunder > .section-tools span')].find(s=>s.textContent.trim()===t).click(),t);await pg.waitForTimeout(700)};
 const tabs=await pg.evaluate(()=>[...document.querySelectorAll('#plunder > .section-tools span')].map(s=>s.textContent.trim()));
 ok(tabs.join(',')==='Meine Stücke,Sammlung,Basteln,Lager/Material','Reiter (113)',tabs.join(', '));
 const vis=s=>pg.evaluate(s=>{const e=document.querySelector(s);return !!e&&e.offsetParent!==null},s);
 ok(await vis('#plunder .kz-p-slot')&&await vis('#plunder .kz-p-tools'),'Meine Stücke: Angelegt-Platz + Sortieren/Filtern (112/114)');
 await tab('Sammlung');
 const c=await pg.evaluate(()=>({h:document.querySelector('#plunder .kz-p-coll h3')?.textContent,unk:document.querySelectorAll('#plunder .kz-p-unknown').length,sets:document.querySelectorAll('#plunder .kz-p-set').length,mineHidden:document.querySelector('#plunder .kz-p-mine')?.offsetParent===null}));
 ok(/von 21 gefunden/.test(c.h)&&c.unk>0,'Sammlung „x von 21“ + Umrisse mit ? (111)',c.h+' · '+c.unk+' Umrisse');
 ok(c.sets===5,'5 Sets mit Fortschritt (118)');
 ok(c.mineHidden,'Reiter trennen Inhalte');
 await tab('Basteln');ok(await vis('#plunder .craft-list'),'Basteln zeigt Bastelliste');
 await tab('Lager/Material');ok(await vis('#plunder .kiez-inventory-card'),'Lager zeigt Material');
 // Öffnen-Moment (119) mit einem Stück aus dem Katalog
 await pg.evaluate(()=>window.kiezOpenBox('taschenlampe'));await pg.waitForTimeout(1800);
 const box=await pg.evaluate(()=>({open:!!document.querySelector('.kz-box-ov.kz-open'),txt:document.querySelector('.kz-box-item')?.innerText.replace(/\s+/g,' ')}));
 ok(box.open&&/Taschenlampe/.test(box.txt),'Kiste öffnet mit Seltenheit (119)',box.txt);
 if(process.env.SHOT)await pg.screenshot({path:process.env.SHOT+'/kiste.png'});
 await pg.evaluate(()=>document.querySelector('.kz-box-ok')?.click());
 await tab('Sammlung');if(process.env.SHOT)await pg.screenshot({path:process.env.SHOT+'/sammlung.png',fullPage:true});
 ok(!errs.length,'JS-Fehler',errs.join(' | ')||'keine');
 console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close()})();
