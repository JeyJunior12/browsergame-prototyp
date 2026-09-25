// Echtes Spielen per Klick: Aktionen auslösen und die Meldung lesen, die ein Spieler sehen würde
const fs=require('fs');
(async()=>{
 const {b,pg}=await require('./lib').open();
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
 const pw=(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim();
 await require('./lib').login(pg,process.argv[2]||process.env.KIEZ_MAIL,pw);
 const prof=()=>pg.evaluate(()=>({geld:Number(window.kiezProfile.money),energie:window.kiezProfile.energy,kk:window.kiezProfile.bottlecaps,level:window.kiezProfile.level,knast:window.kiezProfile.jail_until}));
 const go=async v=>{await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(1500)};
 // Klick wie ein Spieler (Element sichtbar machen falls in anderem Reiter), danach neueste Meldung lesen
 // Klick wie ein Spieler, danach die NEUE Meldung zeigen (Vergleich vorher/nachher)
 const notes=()=>pg.evaluate(()=>[...document.querySelectorAll('.notice, .schnorr-result, #kf-notifications li')].map(n=>n.innerText.replace(/\s+/g,' ').trim()).filter(Boolean));
 const click=async(label,sel)=>{
  const before=new Set(await notes());
  const ok=await pg.evaluate(sel=>{const el=document.querySelector(sel);if(!el)return false;el.scrollIntoView();el.click();return true},sel);
  if(!ok){console.log('✗',label,'– Knopf nicht gefunden:',sel);return}
  await pg.waitForTimeout(3500);
  const neu=(await notes()).filter(t=>!before.has(t));
  console.log('•',label,'→',neu.length?neu.join(' | ').slice(0,200):'(keine neue Meldung)');
 };
 console.log('START',JSON.stringify(await prof()));
 // Tagesbelohnung
 await go('missions');await pg.evaluate(()=>[...document.querySelectorAll('#missions .section-tools span')].find(s=>s.textContent.includes('Belohnung'))?.click());
 await click('Tagesbelohnung','#claimdaily');
 // Verbrechen bis 20 € (Geldbehälter)
 await go('pfand');
 for(let i=0;i<6;i++){const p=await prof();if(p.geld>=19||p.knast&&new Date(p.knast)>new Date())break;
  await click('Verbrechen Handtaschenraub','.crime-pick[data-id="1"]','#pfand .notice, .panel.active-view .notice');}
 console.log('NACH VERBRECHEN',JSON.stringify(await prof()));
 // Schnorren am Platz (wartet 20 s wie ein Spieler)
 await go('income');await pg.evaluate(()=>window.splitIncomeView?.('schnorr'));
 await pg.evaluate(()=>document.querySelector('.schnorr-go[data-spot="englischer_garten"]')?.click());await pg.waitForTimeout(24000);
 console.log('• Schnorren Englischer Garten →',await pg.evaluate(()=>document.querySelector('[data-spot="englischer_garten"] .schnorr-result')?.innerText||'(nichts)'));
 // Waschen
 await go('begging');await click('Waschen','#wash');
 // Kiezaktion
 await go('overview');await pg.evaluate(()=>document.querySelector('.overview-actions-wrap')&&(document.querySelector('.overview-actions-wrap').style.display=''));
 await click('Kiezaktion Zeitungen','.sideaction[data-action="newspapers"]','.overview-actions-wrap .notice, #activitymsg .notice, #activitymsg2 .notice');
 // Weiterbildung
 await go('training');await click('Weiterbildung Verteidigung','.trainbtn[data-skill="defense"]');
 // Pfandtour 10 Minuten starten
 await go('pfand');await click('Pfandtour 10 Min. losschicken','#collect');
 // Geldbehälter-Ausbau
 await go('gear');const cont=await pg.evaluate(()=>{const b=[...document.querySelectorAll('#containertiers button')].find(x=>!x.disabled);if(b){b.click();return b.textContent}return null});
 await pg.waitForTimeout(3000);console.log('• Geldbehälter',cont,'→',await pg.evaluate(()=>[...document.querySelectorAll('.panel.active-view .notice')].pop()?.innerText||'(keine Meldung)'));
 // Getränk
 await pg.evaluate(()=>window.openDrinkShopFromQuickbar?.());await pg.waitForTimeout(2500);
 await click('Dosenbier kaufen','.buy-drink[data-drink="beer"]','#drinkmsg .notice');
 await pg.evaluate(()=>document.querySelector('#kiezmodalclose')?.click());
 // Lotto
 await go('missions');await pg.evaluate(()=>[...document.querySelectorAll('#missions .section-tools span')].find(s=>s.textContent.includes('Glück'))?.click());await pg.waitForTimeout(1500);
 await click('Lotto-Los','#kf-lotto .lbuy','#kf-lotto .notice');
 // Kiez-Brett
 await go('brett');await pg.fill('#brett .bpost','Testbeitrag vom Testkonto – bitte ignorieren.');await click('Kiez-Brett Beitrag','#brett .bsend','#brett .notice, #brett .kf-list');
 // Kronkorken, Plunder, Einstellungen
 await go('kronkorken');await click('Kronkorken tauschen (Energie)','.kkbuy[data-id="energie"]','#kronkorken .notice');
 await go('einstellungen');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==','base64');fs.writeFileSync(require('os').tmpdir()+'/kiez-av.png',png);
 await pg.setInputFiles('#einstellungen .avfile',require('os').tmpdir()+'/kiez-av.png');await pg.waitForTimeout(4000);
 console.log('• Profilbild hochladen →',await pg.evaluate(()=>document.querySelector('#einstellungen .avmsg')?.innerText||'-'),'| Server:',await pg.evaluate(()=>(window.kiezProfile.avatar||'').slice(0,22)));
 // Postfach
 await go('messages');await pg.evaluate(()=>[...document.querySelectorAll('#messages .section-tools span')].find(s=>s.textContent.startsWith('System'))?.click());await pg.waitForTimeout(2500);
 console.log('• Systemnachrichten →',await pg.evaluate(()=>(document.querySelector('#kf-notifications')?.innerText||'-').replace(/\s+/g,' ').slice(0,200)));
 console.log('ENDE',JSON.stringify(await prof()));
 console.log('JS-FEHLER',[...new Set(errs)].join(' | ')||'keine');
 await pg.screenshot({path:require('os').tmpdir()+'/kiez-shot.png'});await b.close();
})();
