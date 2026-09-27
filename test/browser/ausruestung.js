// S2: Besitz sichtbar, Anlegen/Ablegen wirkt, gesperrte Stücke vorab markiert, Gegner-Knöpfe ohne Überlappung,
// Stufenanzeige aktuell, Lernwarteschlange eigener Reiter, Logo führt zur Startseite
const fs=require('fs');const lib=require('./lib');
(async()=>{
 const pw=(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim();let fails=0;
 const ok=(c,l,x)=>{if(!c)fails++;console.log(c?'✓':'✗',l,x??'')};
 const {b,pg}=await lib.open();pg.on('dialog',d=>d.accept());const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL,pw);await pg.waitForTimeout(2500);
 const go=async(v,tab)=>{await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(2200);if(tab){await pg.evaluate(l=>[...document.querySelectorAll('.panel.active-view .section-tools span')].find(x=>x.textContent.trim()===l)?.click(),tab);await pg.waitForTimeout(1800);}};
 await go('store','Waffen');
 ok(await pg.evaluate(()=>!!document.querySelector('#store .kz-combat-box')?.offsetParent),'Kampfwerte-Kasten im Laden');
 let st=await pg.evaluate(()=>({owned:[...document.querySelectorAll('#store .card.kz-is-owned')].filter(c=>c.offsetParent).length,locked:[...document.querySelectorAll('#store .buyitem')].filter(b=>b.offsetParent&&/ab Level/.test(b.textContent)).length,money:window.kiezProfile.money}));
 console.log('  Stand:',JSON.stringify(st));
 if(!st.owned&&st.money>=2){await pg.evaluate(()=>document.querySelector('#store .buyitem[data-id="toothpick"]')?.click());await pg.waitForTimeout(3500);}
 await go('store','Waffen');
 st=await pg.evaluate(()=>({owned:[...document.querySelectorAll('#store .card.kz-is-owned')].filter(c=>c.offsetParent).length,buyVisible:[...document.querySelectorAll('#store .card.kz-is-owned .buyitem')].some(b=>b.offsetParent)}));
 ok(st.owned>0,'Gekaufte Waffe zeigt „✔ IM BESITZ/ANGELEGT“',st.owned);
 ok(!st.buyVisible,'Kein Kaufen-Knopf bei Besitz');
 const total=()=>pg.evaluate(()=>Number(document.querySelector('#store .kz-combat b')?.textContent||0));
 const card=await pg.evaluate(()=>{const c=[...document.querySelectorAll('#store .card.kz-is-owned')].find(c=>c.offsetParent);return c?c.querySelector('b').textContent.trim():null});
 if(card){
  const state=await pg.evaluate(t=>{const c=[...document.querySelectorAll('#store .card.kz-is-owned')].find(c=>c.offsetParent&&c.querySelector('b').textContent.trim()===t);return c.querySelector('.kz-unequip')?'on':'own'},card);
  if(state==='on'){await pg.evaluate(t=>[...document.querySelectorAll('#store .card.kz-is-owned')].find(c=>c.querySelector('b').textContent.trim()===t).querySelector('.kz-unequip').click(),card);await pg.waitForTimeout(3000);}
  const a0=await total();
  await pg.evaluate(t=>[...document.querySelectorAll('#store .card.kz-is-owned')].find(c=>c.querySelector('b').textContent.trim()===t).querySelector('.kz-equip').click(),card);await pg.waitForTimeout(3000);
  const a1=await total();
  ok(a1>a0,'Anlegen erhöht Angriff',a0+' → '+a1);
  ok(await pg.evaluate(t=>/ANGELEGT/.test([...document.querySelectorAll('#store .card')].find(c=>c.querySelector('b')?.textContent.trim()===t).innerText),card),'Karte zeigt „✔ ANGELEGT“');
  await pg.evaluate(t=>[...document.querySelectorAll('#store .card')].find(c=>c.querySelector('b')?.textContent.trim()===t).querySelector('.kz-unequip').click(),card);await pg.waitForTimeout(3000);
  ok(await total()===a0,'Ablegen senkt Angriff wieder',await total());
  await pg.evaluate(t=>[...document.querySelectorAll('#store .card')].find(c=>c.querySelector('b')?.textContent.trim()===t).querySelector('.kz-equip')?.click(),card);await pg.waitForTimeout(2500);
 }
 ok(await pg.evaluate(()=>[...document.querySelectorAll('#store .buyitem')].some(b=>b.offsetParent&&/ab Level/.test(b.textContent)&&b.disabled)),'Zu hohes Level vorab gesperrt („🔒 ab Level X“)');
 // Begleiter
 await go('pets','Begleiter');
 ok(await pg.evaluate(()=>[...document.querySelectorAll('#pets .card.kz-is-owned')].some(c=>c.offsetParent&&/IM BESITZ|DABEI/.test(c.innerText))),'Eigener Begleiter als „✔ DABEI/IM BESITZ“ markiert');
 ok(await pg.evaluate(()=>[...document.querySelectorAll('#pets .card')].some(c=>c.offsetParent&&c.querySelector('.kz-ico-lock')&&!c.querySelector('.buypet:not([disabled])')?.offsetParent)),'Gesperrte Begleiter vorab markiert (🔒, kein Kaufknopf)');
 // Gegner
 await go('pvp');
 const ov=await pg.evaluate(()=>{const c=[...document.querySelectorAll('#opponents .card')].find(c=>c.offsetParent);if(!c)return 'keine Gegner';const row=c.querySelector('.kz-actions');if(!row)return 'keine Knopfreihe';
  const bs=[...row.querySelectorAll('button')].map(b=>b.getBoundingClientRect());const pic=c.querySelector('.generated-item-thumb,img')?.getBoundingClientRect();
  const hit=(a,b)=>a&&b&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
  for(let i=0;i<bs.length;i++){if(hit(bs[i],pic))return 'Knopf über Bild';for(let j=i+1;j<bs.length;j++)if(hit(bs[i],bs[j]))return 'Knöpfe überlappen'}return 'ok '+bs.length+' Knöpfe'});
 ok(/^ok|keine Gegner/.test(ov),'Gegnerkarte ohne Überlappung (69a)',ov);
 // Weiterbildung
 await go('training','Fähigkeiten');
 const sk=await pg.evaluate(()=>{const c=document.querySelector('#training .skill-grid .card');const h=Number(c.querySelector('b span').textContent);const r=c.querySelector('.skill-requirements')?.textContent||'';return h+' | '+r});
 ok(new RegExp('^(\\d+) \\| Aktuelle Stufe: \\1 ').test(sk),'Stufenanzeige passt zum Titel (69c)',sk);
 ok(await pg.evaluate(()=>!document.querySelector('#training .kz-queue')?.offsetParent&&!!document.querySelector('#training .skill-grid')?.offsetParent),'Reiter Fähigkeiten: Karten, keine Warteschlange');
 await go('training','Lernwarteschlange');
 ok(await pg.evaluate(()=>!!document.querySelector('#training .kz-queue')?.offsetParent&&!document.querySelector('#training .skill-grid')?.offsetParent),'Reiter Lernwarteschlange: eigener Inhalt (69d)');
 // Logo
 await go('store');await pg.click('.logo');await pg.waitForTimeout(2000);
 ok(await pg.evaluate(()=>document.getElementById('overview').classList.contains('active-view')),'Klick auf KIEZKÖNIG → Startseite (73a)');
 console.log('JS-FEHLER:',errs.join(' | ')||'keine');console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close();
})();
