// Bleibt die Seite stehen, wenn man nichts tut? (Automatisches Neuladen alle 60 s darf nicht nach oben scrollen)
const fs=require('fs');const lib=require('./lib');
(async()=>{
 const {b,pg}=await lib.open(process.env.URL);
 await lib.login(pg,process.env.KIEZ_MAIL,(process.env.KIEZ_PW||fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8')).trim());
 let fails=0;
 for(const v of ['store','training']){
  await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(2500);
  await pg.evaluate(()=>window.scrollTo(0,900));await pg.waitForTimeout(800);
  const vor=await pg.evaluate(()=>scrollY);
  await pg.waitForTimeout(75000);
  const nach=await pg.evaluate(()=>scrollY);
  const ok=Math.abs(nach-vor)<60;if(!ok)fails++;
  console.log(ok?'✓':'✗',v,'nach 75 s ohne Klick: vorher',vor,'nachher',nach);
 }
 await pg.evaluate(()=>window.kiezGo('pets'));await pg.waitForTimeout(2000);
 const oben=await pg.evaluate(()=>scrollY);console.log(oben<60?'✓':'✗','Seitenwechsel scrollt nach oben (',oben,')');if(oben>=60)fails++;
 console.log(fails?'FEHLER: '+fails:'ALLES OK');await b.close();
})();
