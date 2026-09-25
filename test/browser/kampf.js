// Kampf, Tierkampf und Bandenkrieg per Klick mit vier Testkonten (Testmodus: Werte setzen, Wartezeiten überspringen)
// KIEZ_MAIL_BASE=name+kieztest@example.com → Konten name+kieztest@, …kieztest2@, …kieztest3@, …kieztest4@
const fs=require('fs');const lib=require('./lib');
const pw=(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim();
const mail=n=>process.env.KIEZ_MAIL_BASE.replace('@',(n>1?n:'')+'@');
let fails=0;
async function as(n,fn){const {b,pg}=await lib.open();pg.on('dialog',d=>d.accept());const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,mail(n),pw);try{await fn(pg)}finally{if(errs.length){fails++;console.log('  JS-FEHLER:',errs.join(' | '))}await b.close()}}
const rpc=(pg,f,a)=>pg.evaluate(async([f,a])=>{const r=await window.kiezSupabase.rpc(f,a);return r.error?'FEHLER '+r.error.message:r.data},[f,a]);
const go=async(pg,v)=>{await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(2500)};
const visNotes=pg=>pg.evaluate(()=>[...document.querySelectorAll('.notice')].filter(n=>n.offsetParent).map(n=>n.innerText.replace(/\s+/g,' ').trim()));
// sichtbaren Knopf per Selektor (optional innerhalb einer Karte mit Text) klicken und neue Meldung verlangen
async function click(pg,label,sel,{within,fill,expect}={}){
 const before=new Set(await visNotes(pg));
 if(fill)await pg.fill(fill[0],fill[1]);
 const ok=await pg.evaluate(([sel,within])=>{let els=[...document.querySelectorAll(sel)].filter(e=>e.offsetParent&&!e.disabled);
  if(within)els=els.filter(e=>e.closest('.card,li,.kf-box')?.innerText.includes(within));const el=els[0];if(!el)return false;el.scrollIntoView({block:'center'});el.click();return true},[sel,within]);
 if(!ok){fails++;console.log('✗',label,'– Knopf nicht gefunden');return ''}
 await pg.waitForTimeout(4000);const neu=(await visNotes(pg)).filter(t=>!before.has(t)).join(' | ');
 const good=neu&&(!expect||new RegExp(expect,'i').test(neu));if(!good)fails++;
 console.log(good?'✓':'✗',label,'→',(neu||'(keine Meldung)').slice(0,170));return neu;}
(async()=>{
 // 1) Vorbereitung: alle vier auf Level 11 mit Geld, Sozialkontakten (für Tiere) und frischen Wartezeiten
 for(const n of [1,2,3,4])await as(n,async pg=>{await rpc(pg,'tester_set_stats',{new_money:3000,new_xp:2500,new_caps:60,new_social:45,new_attack:n===1||n===2?40:5,new_defense:5});await rpc(pg,'tester_fast_forward');});
 console.log('Vorbereitung fertig (Level 11, 3000 €)');
 // 2) Zweite Bande: ClaudeTester3 gründet, lädt ClaudeTester4 ein
 await as(3,async pg=>{await go(pg,'gangs');
  if(await pg.evaluate(()=>!document.querySelector('#kiezgang .gleave')))await click(pg,'T3 gründet Bande','#kiezgang .gcreate',{fill:['#kiezgang .gname','Claudes Gegnerbande'],expect:'Chef'});
  await pg.waitForTimeout(1500);await click(pg,'T3 lädt T4 ein','#kiezgang .ginv',{fill:['#kiezgang .ginvname','ClaudeTester4'],expect:'Einladung|Aufgenommen|schon'});
  await go(pg,'pets');await click(pg,'T3 kauft Hamster','.buypet[data-id="hamster"]',{expect:'hinterher|schon'});});
 await as(4,async pg=>{await go(pg,'gangs');if(await pg.evaluate(()=>!!document.querySelector('#kiezgang .ginvacc')))await click(pg,'T4 nimmt Einladung an','#kiezgang .ginvacc',{expect:'Willkommen'});});
 // 3) Angriff, Tierkampf, Bandenkrieg durch ClaudeTester (Chef der ersten Bande)
 await as(1,async pg=>{
  await go(pg,'pets');await click(pg,'T1 kauft Hamster','.buypet[data-id="hamster"]',{expect:'hinterher|schon'});
  await go(pg,'overview');await pg.evaluate(()=>[...document.querySelectorAll('.kiez-quickbar button')].find(b=>b.textContent.trim()==='Haustier')?.click());await pg.waitForTimeout(1500);
  await click(pg,'T1 nimmt Hamster mit','.activatepet',{within:'Hamster'});
  await go(pg,'pvp');await pg.waitForTimeout(2000);
  console.log('  Gegnerliste:',(await pg.evaluate(()=>document.querySelector('#opponents').innerText)).replace(/\s+/g,' ').slice(0,160));
  await click(pg,'T1 greift T3 an','.attackplayer',{within:'ClaudeTester3',expect:'gewinnst|verlierst|verlierst|klaust|Niederlage|gewonnen|verloren'});
  await go(pg,'gangs');
  await click(pg,'T1 zahlt 200 € in die Kasse','#kiezgang .gdonb',{fill:['#kiezgang .gdon','200'],expect:'eingezahlt'});
  await pg.evaluate(()=>{const s=document.querySelector('#kiezgang .wtarget');if(s){const o=[...s.options].find(o=>o.text.includes('Gegnerbande'));if(o)s.value=o.value}});
  await click(pg,'T1 erklärt den Krieg','#kiezgang .wdecl',{expect:'Krieg erklärt|schon in einem Krieg|3 Tagen'});
 });
 // Tierkampf-Knopf gezielt (ohne Angriff) testen
 await as(3,async pg=>{await go(pg,'overview');await pg.evaluate(()=>[...document.querySelectorAll('.kiez-quickbar button')].find(b=>b.textContent.trim()==='Haustier')?.click());await pg.waitForTimeout(1500);
  await click(pg,'T3 nimmt Hamster mit','.activatepet',{within:'Hamster'});});
 await as(1,async pg=>{await rpc(pg,'tester_fast_forward');await go(pg,'pvp');await pg.waitForTimeout(2000);
  await pg.evaluate(()=>{const c=[...document.querySelectorAll('#opponents .card')].find(c=>c.innerText.includes('ClaudeTester3'));const b=c&&[...c.querySelectorAll('button')].find(b=>b.textContent.includes('Tierkampf'));if(b)b.classList.add('kf-test-pet')});
  await click(pg,'T1 Tierkampf gegen T3','.kf-test-pet',{expect:'Hamster|Tier'});});
 // 4) Bandenkrieg: ClaudeTester2 (Bande 1) prügelt sich mit ClaudeTester4 (Bande 2)
 await as(2,async pg=>{await rpc(pg,'tester_fast_forward');await go(pg,'pvp');await pg.waitForTimeout(1500);await pg.waitForTimeout(2000);
  await click(pg,'T2 greift T4 an (zählt im Krieg)','.attackplayer',{within:'ClaudeTester4',expect:'gewinnst|klaust|verl|Sieg|gewonnen'});
  await go(pg,'gangs');console.log('  Kriegsstand:',(await pg.evaluate(()=>[...document.querySelectorAll('#kiezgang .kf-box')].find(b=>b.innerText.includes('Bandenkrieg'))?.innerText||'-')).replace(/\s+/g,' ').slice(0,200));});
 // Krieg vorspulen und auswerten lassen
 await as(1,async pg=>{console.log('  Krieg beenden:',JSON.stringify(await rpc(pg,'tester_end_wars')));await go(pg,'gangs');
  console.log('  Nach Kriegsende:',(await pg.evaluate(()=>[...document.querySelectorAll('#kiezgang .kf-box')].find(b=>b.innerText.includes('Bandenkrieg'))?.innerText||'-')).replace(/\s+/g,' ').slice(0,220));
  console.log('  Bandenkasse/Protokoll:',(await pg.evaluate(()=>[...document.querySelectorAll('#kiezgang .kf-box')].find(b=>b.innerText.includes('Protokoll'))?.innerText||'-')).replace(/\s+/g,' ').slice(0,260));});
 // 5) Systemnachrichten beim Angegriffenen
 await as(3,async pg=>{await go(pg,'messages');await pg.evaluate(()=>[...document.querySelectorAll('#messages .section-tools span')].find(s=>s.textContent.startsWith('System'))?.click());await pg.waitForTimeout(2500);
  const t=(await pg.evaluate(()=>document.querySelector('#kf-notifications')?.innerText||'')).replace(/\s+/g,' ');
  const hat=k=>t.includes(k);console.log((hat('angegriffen')||hat('verprügelt'))&&hat('Tier')&&hat('Krieg')?'✓':'✗','T3 Systemnachrichten →',t.slice(0,300));if(!((hat('angegriffen')||hat('verprügelt'))&&hat('Krieg')))fails++;});
 console.log(fails?'FEHLER: '+fails:'ALLES OK');
})();
