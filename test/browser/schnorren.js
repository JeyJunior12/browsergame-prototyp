// S5-Abnahme (ROADMAP 135–140, 121): Reiter getrennt, Bonus sichtbar, Fortschritt + Ergebnis auf der Karte,
// Statistik pro Platz, Leiter (gesperrt/nächster), Stadtteile „bald verfügbar“
const fs=require('fs');const lib=require('./lib.js');let fails=0;
const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
(async()=>{const {b,pg}=await lib.open(process.env.URL);const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});
 const go=async(v,t)=>{await pg.evaluate(([v,t])=>window.kiezGoTab(v,t||null),[v,t]);await pg.waitForTimeout(2200)};
 const vis=s=>pg.evaluate(s=>{const e=document.querySelector(s);return !!e&&e.offsetParent!==null},s);
 await go('income','Schnorrplätze');
 ok(await vis('#income .schnorr-spots')&&!(await vis('#income .area-list')),'Reiter Schnorrplätze zeigt nur Schnorrplätze (135)');
 ok(await pg.evaluate(()=>/dein bonus/i.test(document.querySelector('#income .kz-beg-bonus')?.innerText||'')),'Bonus sichtbar (139)',await pg.evaluate(()=>document.querySelector('#income .kz-bonus')?.innerText.replace(/\s+/g,' ')));
 ok(await pg.evaluate(()=>[...document.querySelectorAll('#income .card[data-spot] .kz-sp-facts')].every(p=>/pro Spende · bis 10× · \d+ s/.test(p.textContent))),'Karten kurz und gleich (137)');
 ok(await pg.evaluate(()=>document.querySelectorAll('#income .card[data-spot].kz-locked').length>0&&document.querySelectorAll('#income .card[data-spot].kz-next').length===1),'Leiter: gesperrte grau, nächster hervorgehoben (136)');
 const spot=await pg.evaluate(()=>{const c=[...document.querySelectorAll('#income .card[data-spot]:not(.kz-locked)')].pop();c.scrollIntoView({block:'center'});c.querySelector('.schnorr-go').click();return c.dataset.spot});
 await pg.waitForTimeout(3000);
 ok(await pg.evaluate(s=>{const c=document.querySelector('#income .card[data-spot="'+s+'"]');return !c.querySelector('.kz-sp-bar').hidden&&/noch \d+ s/.test(c.querySelector('.schnorr-go').textContent)},spot),'Fortschritt + Restzeit auf der Karte (138)');
 await pg.waitForTimeout(45000);
 const res=await pg.evaluate(s=>document.querySelector('#income .card[data-spot="'+s+'"] .schnorr-result')?.innerText.trim(),spot);
 ok(!!res,'Ergebnis in derselben Karte (138/69g)',res);
 await pg.waitForTimeout(1500);
 ok(await pg.evaluate(s=>/Heute: .*€ in \d+×/.test(document.querySelector('#income .card[data-spot="'+s+'"] .kz-sp-stat')?.textContent||''),spot),'Statistik pro Platz (140)',await pg.evaluate(s=>document.querySelector('#income .card[data-spot="'+s+'"] .kz-sp-stat')?.textContent,spot));
 await go('income','Sammelgebiete');
 ok(await vis('#income .area-list')&&!(await vis('#income .schnorr-spots')),'Reiter Sammelgebiete zeigt nur Sammelgebiete (135)');
 ok(await pg.evaluate(()=>!!document.querySelector('#income .area-card.kz-cur')),'Aktuelles Gebiet markiert (136)');
 if(process.env.SHOT){await go('income','Schnorrplätze');await pg.screenshot({path:process.env.SHOT+'/schnorr.png',fullPage:true});}
 await go('stadtteile');
 const st=await pg.evaluate(()=>({soon:/bald verfügbar/i.test(document.querySelector('#stadtteile')?.innerText||''),pick:document.querySelectorAll('#stadtteile .dpick').length}));
 ok(st.soon&&st.pick===0,'Stadtteile gesperrt: „bald verfügbar“, keine Revierwahl (121)',JSON.stringify(st));
 ok(!errs.length,'JS-Fehler',errs.join(' | ')||'keine');
 console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close()})();
