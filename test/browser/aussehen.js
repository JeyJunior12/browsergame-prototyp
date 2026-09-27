// Prüfskript Aussehen (ROADMAP 65–69): geht jeden Menüpunkt und Reiter durch und meldet
// Karten ohne Bild, Emojis in Titeln/Werten/Knöpfen, ungleich hohe Knöpfe/Felder in einer Reihe,
// zu kleine Schrift (<12 px) und überlappende Knöpfe/Bilder. MOBIL=1 prüft in Handybreite.
const fs=require('fs');const lib=require('./lib.js');
const audit=()=>{const s=document.querySelector('section.panel.active-view:not(#rumors)');if(!s)return null;
 const vis=e=>e.offsetParent!==null&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';
 const EM=/\p{Extended_Pictographic}/u,out={bild:[],emoji:[],reihe:[],klein:[],ueberlapp:[],titel:[]};
 const name=c=>(c.querySelector('h3,b,strong')?.textContent||c.textContent||'').replace(/\s+/g,' ').trim().slice(0,32);
 for(const c of [...s.querySelectorAll('.card,.kf-box,.activity-card')].filter(vis)){
  if(c.parentElement.closest('.card,.kf-box'))continue;
  const real=e=>e.matches('.kf-cups')?vis(e):vis(e)&&e.getBoundingClientRect().width>=24&&(e.tagName==='IMG'?e.naturalWidth>0:e.tagName==='CANVAS'||e.tagName==='svg'||/url\(/.test(getComputedStyle(e).backgroundImage));
  const img=[...c.querySelectorAll('img,.kf-cups,.generated-item-thumb,.kz-thumb,.kz-avatar,canvas,svg,[style*="background-image"]')].some(real)||/url\(/.test(getComputedStyle(c).backgroundImage);
  if(!img&&c.getBoundingClientRect().height>60)out.bild.push(name(c));
  const tt=c.querySelector('h3,b,strong');if(tt&&vis(tt)){const cs=getComputedStyle(tt);out.titel.push(Math.round(parseFloat(cs.fontSize))+'px '+cs.fontFamily.split(',')[0].replace(/"/g,'')+' '+cs.fontWeight+' '+cs.color+' ← '+name(c));}}
 for(const e of s.querySelectorAll('h2,h3,h4,b,strong,button,small,label,.cost,th'))if(vis(e)&&EM.test(e.textContent)&&!e.querySelector('h3,b,strong,button'))out.emoji.push(e.textContent.replace(/\s+/g,' ').trim().slice(0,32));
 const ctr=[...s.querySelectorAll('button:not(.kz-place):not(.kz-dist),input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]),select')].filter(vis);
 for(let i=0;i<ctr.length;i++)for(let j=i+1;j<ctr.length;j++){const a=ctr[i].getBoundingClientRect(),b=ctr[j].getBoundingClientRect();
  if(ctr[i].parentElement.closest('.card,.kf-box,div')!==ctr[j].parentElement.closest('.card,.kf-box,div')&&ctr[i].parentElement!==ctr[j].parentElement)continue;
  const same=Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<22&&(a.right<=b.left+2||b.right<=a.left+2);
  if(same&&(Math.abs(a.height-b.height)>4||Math.abs(a.top-b.top)>4))out.reihe.push((ctr[i].textContent||ctr[i].placeholder||ctr[i].tagName).trim().slice(0,18)+' '+Math.round(a.height)+'px / '+(ctr[j].textContent||ctr[j].placeholder||ctr[j].tagName).trim().slice(0,18)+' '+Math.round(b.height)+'px');
  const hit=a.left<b.right-2&&b.left<a.right-2&&a.top<b.bottom-2&&b.top<a.bottom-2;if(hit)out.ueberlapp.push((ctr[i].textContent||ctr[i].tagName).trim().slice(0,18)+' ✕ '+(ctr[j].textContent||ctr[j].tagName).trim().slice(0,18));}
 const w=document.createTreeWalker(s,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode()){const e=t.parentElement;if(!t.textContent.trim()||!vis(e))continue;const fs=parseFloat(getComputedStyle(e).fontSize);if(fs<12)out.klein.push(Math.round(fs)+'px „'+t.textContent.trim().slice(0,24)+'“');}
 for(const k in out)out[k]=[...new Set(out[k])];return {id:s.id,out};};
(async()=>{const {b,pg}=await lib.open(process.env.URL);
 await lib.login(pg,process.env.KIEZ_MAIL,fs.readFileSync(process.env.KIEZ_PW_FILE,'utf8').trim());
 if(process.env.MOBIL)await pg.setViewportSize({width:390,height:844});await pg.waitForTimeout(2000);
 const seen=new Set(),sum={bild:0,emoji:0,reihe:0,klein:0,ueberlapp:0},stile={};
 const record=async label=>{await pg.waitForTimeout(1300);const r=await pg.evaluate(audit);if(!r)return;
  for(const x of r.out.titel){const st=x.split(' ← ')[0];(stile[st]=stile[st]||[]).push(r.id+': '+x.split(' ← ')[1]);}delete r.out.titel;
  for(const k in r.out)for(const x of r.out[k]){const key=r.id+'|'+k+'|'+x;if(seen.has(key))continue;seen.add(key);sum[k]++;console.log(k.toUpperCase().padEnd(9)+' '+label.padEnd(34)+' '+x);}};
 const views=await pg.evaluate(()=>{const out=[];document.querySelectorAll('.kz-drop button, .kz-nav .kz-top').forEach(()=>{});return (window.kiezNavList||[]).map(x=>x)});
 const list=views.length?views:await pg.evaluate(()=>[...new Set([...document.querySelectorAll('section.panel')].map(s=>s.id))].filter(id=>id&&!['rumors','admin'].includes(id)));
 for(const v of list){const [view,tab]=Array.isArray(v)?v:[v];await pg.evaluate(([v,t])=>window.kiezGoTab(v,t||null),[view,tab]);await record(view+(tab?' › '+tab:''));
  const tabs=await pg.evaluate(()=>{const s=document.querySelector('section.panel.active-view:not(#rumors)');return s?[...s.querySelectorAll(':scope > .section-tools span')].map(t=>t.textContent.trim()):[]});
  for(const t of tabs){await pg.evaluate(t=>{const s=document.querySelector('section.panel.active-view:not(#rumors)');[...s.querySelectorAll(':scope > .section-tools span')].find(x=>x.textContent.trim()===t)?.click()},t);await record(view+' › '+t);}}
 const st=Object.entries(stile).sort((a,b)=>b[1].length-a[1].length);console.log('TITELSTILE '+st.length+' verschiedene');st.forEach(([k,v])=>console.log('  '+String(new Set(v).size).padStart(3)+'× '+k+'  z. B. '+[...new Set(v)].slice(0,3).join(' | ')));
 console.log('SUMME',JSON.stringify(sum));await b.close()})();
