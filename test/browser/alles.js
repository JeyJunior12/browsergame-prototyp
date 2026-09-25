// Restliche Spielfunktionen per Klick (Testkonto 2 im Testmodus): Knast/Kaution, Konzentration, Weiterbildung abschließen,
// Tiertraining, Basteln, Plunder, Kronkorken-Tausch, Ausbauten, Umzug, Namensänderung, Erfolge, Melden
const fs=require('fs');const lib=require('./lib');
const pw=(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim();
let fails=0;
(async()=>{
 const {b,pg}=await lib.open();pg.on('dialog',d=>d.accept('Nur ein Test der Meldefunktion'));
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await lib.login(pg,process.env.KIEZ_MAIL2,pw);
 const rpc=(f,a)=>pg.evaluate(async([f,a])=>{const r=await window.kiezSupabase.rpc(f,a);return r.error?'FEHLER '+r.error.message:r.data},[f,a]);
 const go=async v=>{await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(1500);await pg.waitForFunction(v=>!/Lade( Bande)? …/.test(document.getElementById(v)?.innerText||''),v,{timeout:15000}).catch(()=>{});await pg.waitForTimeout(800)};
 const tab=async l=>{await pg.evaluate(l=>[...document.querySelectorAll('.panel.active-view .section-tools span, .kiez-quickbar button')].find(x=>x.textContent.trim()===l&&x.offsetParent)?.click(),l);await pg.waitForTimeout(1800)};
 const visNotes=()=>pg.evaluate(()=>[...document.querySelectorAll('.notice')].filter(n=>n.offsetParent).map(n=>n.innerText.replace(/\s+/g,' ').trim()));
 const click=async(label,sel,{fill,expect,within}={})=>{
  const before=new Set(await visNotes());if(fill)await pg.fill(fill[0],fill[1]);
  const ok=await pg.evaluate(([sel,w])=>{let els=[...document.querySelectorAll(sel)].filter(e=>e.offsetParent&&!e.disabled);if(w)els=els.filter(e=>e.closest('.card,li,.kf-box,.drink')?.innerText.includes(w));const el=els[0];if(!el)return false;el.scrollIntoView({block:'center'});el.click();return true},[sel,within]);
  if(!ok){fails++;console.log('✗',label,'– Knopf nicht gefunden/gesperrt');return}
  await pg.waitForTimeout(3800);const neu=(await visNotes()).filter(t=>!before.has(t)).join(' | ');
  const good=neu&&(!expect||new RegExp(expect,'i').test(neu));if(!good)fails++;console.log(good?'✓':'✗',label,'→',(neu||'(keine Meldung)').slice(0,160));};
 console.log('Werte setzen:',typeof await rpc('tester_set_stats',{new_money:20000,new_xp:5000,new_caps:120,new_social:45})==='object'?'ok':'FEHLER');
 await rpc('tester_fast_forward');await pg.evaluate(async()=>window.kiezRenderProfile(await window.kiezRefreshProfile()));await pg.waitForTimeout(1500);
 // Weiterbildung starten, vorspulen, abschließen
 await go('training');await tab('Fähigkeiten');await click('Weiterbildung Angriff starten','.trainbtn[data-skill="attack"]',{expect:'gestartet|lernst'});
 await rpc('tester_fast_forward');await pg.evaluate(async()=>window.kiezRenderProfile(await window.kiezRefreshProfile()));await go('training');await tab('Lernwarteschlange');
 console.log('  Weiterbildung nach Vorspulen:',await pg.evaluate(()=>document.querySelector('#trainingstatus')?.innerText),'| Angriff',await pg.evaluate(()=>window.kiezProfile.attack_skill));
 if(await pg.evaluate(()=>!!document.querySelector('#finishtraining')?.offsetParent))await click('Weiterbildung abschließen','#finishtraining',{expect:'abgeschlossen|Stufe|Punkte|fertig'});
 // Konzentration starten und abbrechen
 await click('Konzentration starten','.concentration-start',{expect:'Konzentration'});
 await click('Konzentration abbrechen','.concentration-cancel',{expect:'abgebrochen|beendet|Konzentration'});
 // Ausbauten mit genug Geld
 await go('store');await tab('Zubehör');await click('Geldbehälter ausbauen','#containertiers button',{expect:'verbessert|gekauft'});
 await go('income');await tab('Schnorrplätze');await click('Sammelgebiet freischalten','#buyarea',{expect:'freigeschaltet|gekauft|Geschick'});
 await go('begging');await tab('Körperpflege');await pg.evaluate(()=>window.kiezSupabase.rpc('tester_set_stats',{new_money:20000,new_xp:null,new_caps:null}));
 await pg.evaluate(async()=>{const s=window.kiezSupabase;const p=(await s.rpc('refresh_my_profile')).data;window.kiezRenderProfile(p)});
 await click('Schwamm freischalten','.washbuy',{expect:'freigeschaltet'});await pg.evaluate(async()=>window.kiezRenderProfile((await window.kiezSupabase.rpc('refresh_my_profile')).data));
 if(await pg.evaluate(()=>window.kiezProfile.cleanliness>=100))console.log('✓ Waschen gesperrt, weil schon 100 % sauber →',await pg.evaluate(()=>document.querySelector('.washuse[data-tier="schwamm"]')?.title));
 else await click('Mit Schwamm waschen','.washuse[data-tier="schwamm"]',{expect:'Sauberkeit'});
 await go('gear');await click('Umziehen','.haeuser-move-btn',{expect:'Eingezogen|Umzug|Sozialkontakte'});
 // Tiere: kaufen, mitnehmen, trainieren, vorspulen, abschließen
 await go('pets');await click('Hamster kaufen','.buypet[data-id="hamster"]',{expect:'hinterher|schon'});
 await go('overview');await tab('Haustier');await click('Tier mitnehmen','.activatepet',{expect:'gewechselt'});
 await click('Tiertraining starten','.trainpet',{expect:'Training|trainiert|läuft'});
 await rpc('tester_fast_forward');await pg.evaluate(async()=>window.kiezRenderProfile(await window.kiezRefreshProfile()));await go('overview');await tab('Haustier');
 await click('Tiertraining abschließen','.finishpet',{expect:'fertig|abgeschlossen|Stufe|gestiegen'});
 // Kronkorken-Tausch und Plunder
 await go('kronkorken');await click('Plunderkiste für Kronkorken','.kkbuy[data-id="plunderkiste"]',{expect:'In der Kiste'});
 await click('Energydrink','.kkbuy[data-id="energie"]',{expect:'Energie'});
 await go('plunder');await click('Plunder anlegen','.peq',{expect:'.'}).catch(()=>{});
 await pg.waitForTimeout(1500);console.log('  angelegt:',await pg.evaluate(()=>window.kiezProfile.equipped_plunder));
 // Basteln (Materialien kommen von Pfandtouren; ohne Material muss eine klare Meldung kommen)
 await go('plunder');await click('Pfand verkaufen','#sellallbtn',{expect:'Verkauft|keine Flaschen'});await click('Basteln','.craft-go',{expect:'.'});
 // Knast: Verbrechen bis zur Festnahme, dann Kaution
 await go('pfand');
 for(let i=0;i<25;i++){const p=await pg.evaluate(()=>window.kiezProfile);if(p.jail_until&&new Date(p.jail_until)>new Date())break;if(p.energy<25)await rpc('tester_fast_forward');
  await pg.evaluate(()=>document.querySelector('.crime-pick[data-id="6"]')?.click());await pg.waitForTimeout(2200);}
 console.log('  im Knast:',await pg.evaluate(()=>!!(window.kiezProfile.jail_until&&new Date(window.kiezProfile.jail_until)>new Date())));
 await click('Kaution zahlen','.crime-paybail',{expect:'frei|Kaution|draußen|bezahlt'});
 // Name ändern (Kronkorken), Erfolge prüfen, Spieler melden
 await go('einstellungen');await click('Name ändern','#einstellungen .nsave',{fill:['#einstellungen .nname','ClaudeTester2'],expect:'heißt|30 Tage|gibt es schon'});
 await go('achievements');await tab('Erfolge');await click('Erfolge prüfen','#checkachievements',{expect:'.'});
 await go('pvp');await click('Spieler melden','.reportplayer',{expect:'Kiezaufsicht|bereits'});
 console.log('JS-FEHLER:',errs.join(' | ')||'keine');console.log(fails?'FEHLER: '+fails:'ALLES OK');
 await b.close();
})();
