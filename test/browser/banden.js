// Banden- und Sozial-Test per Klick mit zwei Konten
const fs=require('fs');const lib=require('./lib');const pw=(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim();
async function login(mail){const {b,pg}=await lib.open();pg.on('dialog',d=>d.accept());
 await lib.login(pg,mail,pw);return {b,pg};}
const notes=pg=>pg.evaluate(()=>[...document.querySelectorAll('.notice')].map(n=>n.innerText.replace(/\s+/g,' ').trim()).filter(Boolean));
async function click(pg,label,sel,fill){
 const before=new Set(await notes(pg));
 if(fill)await pg.fill(fill[0],fill[1]);
 const ok=await pg.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return false;el.scrollIntoView();el.click();return true},sel);
 if(!ok){console.log('✗',label,'– nicht gefunden:',sel);return}
 await pg.waitForTimeout(3500);const neu=(await notes(pg)).filter(t=>!before.has(t));
 console.log('•',label,'→',neu.join(' | ').slice(0,180)||'(keine neue Meldung)');}
const go=async(pg,v)=>{await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(2500)};
(async()=>{
 let {b,pg}=await login(process.env.KIEZ_MAIL);
 // Geld erspielen: Verbrechen bis 55 € (Knast = Pech, dann Abbruch)
 await go(pg,'pfand');
 for(let i=0;i<14;i++){const p=await pg.evaluate(()=>window.kiezProfile);if(Number(p.money)>=55||(p.jail_until&&new Date(p.jail_until)>new Date())||p.energy<8)break;
  await pg.evaluate(()=>document.querySelector('.crime-pick[data-id="1"]').click());await pg.waitForTimeout(2500);}
 const p=await pg.evaluate(()=>window.kiezProfile);console.log('Kontostand',p.money,'Energie',p.energy,'Knast',p.jail_until);
 await go(pg,'gangs');
 const hasGang=await pg.evaluate(()=>!!document.querySelector('#kiezgang .gleave'));
 if(!hasGang)await click(pg,'Bande gründen','#kiezgang .gcreate',['#kiezgang .gname','Claudes Testbande']);
 await pg.waitForTimeout(2000);
 await click(pg,'ClaudeTester2 einladen','#kiezgang .ginv',['#kiezgang .ginvname','ClaudeTester2']);
 await click(pg,'Bandenchat','#kiezgang .gchatb',['#kiezgang .gchat','Willkommen in der Testbande!']);
 await click(pg,'Einzahlen','#kiezgang .gdonb',['#kiezgang .gdon','1']);
 console.log('Bandenseite:',(await pg.evaluate(()=>document.querySelector('#kiezgang').innerText)).replace(/\s+/g,' ').slice(0,300));
 await b.close();
 ({b,pg}=await login(process.env.KIEZ_MAIL2));
 await go(pg,'messages');await pg.evaluate(()=>[...document.querySelectorAll('#messages .section-tools span')].find(s=>s.textContent.startsWith('System'))?.click());await pg.waitForTimeout(2500);
 console.log('Systemnachrichten T2:',(await pg.evaluate(()=>document.querySelector('#kf-notifications')?.innerText||'-')).replace(/\s+/g,' ').slice(0,250));
 await go(pg,'gangs');
 await click(pg,'Einladung annehmen','#kiezgang .ginvacc');
 await pg.waitForTimeout(2000);
 console.log('T2 Bandenseite:',(await pg.evaluate(()=>document.querySelector('#kiezgang').innerText)).replace(/\s+/g,' ').slice(0,300));
 await pg.screenshot({path:require('os').tmpdir()+'/kiez-shot.png',fullPage:false});
 await b.close();
})();
