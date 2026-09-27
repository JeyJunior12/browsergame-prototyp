// Leerlauf-Test (Scroll-Fehler): pro Seite runterscrollen, W ms warten (Standard 65 s = länger als das 60-s-Neuladen), jedes scrollTo/scrollIntoView/focus mit Aufrufer protokollieren
const fs=require('fs');const lib=require('./lib.js');
(async()=>{const {b,pg}=await lib.open(process.env.URL);
await pg.addInitScript(()=>{window.__log=[];const st=()=>(new Error().stack||'').split('\n').slice(2,6).join(' / ');
 const w=(o,n)=>{const f=o[n];o[n]=function(...a){window.__log.push(n+' '+JSON.stringify(a).slice(0,60)+' @ '+st());return f.apply(this,a)}};
 w(window,'scrollTo');w(window,'scroll');w(window,'scrollBy');w(Element.prototype,'scrollIntoView');w(HTMLElement.prototype,'focus');
 w(Element.prototype,'scrollTo');
 let lastH=0,lastY=0;setInterval(()=>{const h=document.documentElement.scrollHeight,y=scrollY;if(y<lastY-50)window.__log.push('YDROP '+lastY+'->'+y+' h '+lastH+'->'+h);lastH=h;lastY=y},200);});
await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());await pg.waitForTimeout(3000);
for(const v of (process.argv[2]||'overview,store,training,pvp,stadtteile,income').split(',')){await pg.evaluate(v=>window.kiezGo(v),v);await pg.waitForTimeout(2000);
 await pg.mouse.move(600,400);await pg.mouse.wheel(0,1200);await pg.waitForTimeout(800);await pg.evaluate(()=>window.__log=[]);
 const y0=await pg.evaluate(()=>scrollY);await pg.waitForTimeout(+process.env.W||65000);const r=await pg.evaluate(()=>({y:scrollY,log:window.__log}));
 console.log((r.y<y0-50?"FEHL ":"OK   ")+v,"y",y0,"->",r.y);r.log.forEach(l=>console.log('   ',l));}
await b.close()})();
