const { chromium } = require(process.env.G+'/playwright');
const fs=require('fs'),path=require('path');
const ROOT=require('path').resolve(__dirname,'../..');
// Seite lokal ausliefern; externe Anfragen (CDN, Supabase) laufen ueber Node (vertraut dem Proxy-CA via NODE_EXTRA_CA_CERTS)
exports.open=async(url='https://kiez.test/')=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',proxy:{server:process.env.HTTPS_PROXY}});
 const ctx=await b.newContext({viewport:{width:1280,height:900}});
 await ctx.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(u.hostname==='kiez.test'){let p=u.pathname;if(p==='/')p='/index.html';const f=path.join(ROOT,decodeURIComponent(p));
   if(!fs.existsSync(f))return r.fulfill({status:404,body:''});
   const t={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.txt':'text/plain','.xml':'application/xml'}[path.extname(f)]||'application/octet-stream';
   return r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)});}
  try{const resp=await r.fetch();return r.fulfill({response:resp});}catch(e){console.log('FETCHFAIL',u.href.slice(0,80),e.message.slice(0,120));return r.abort();}
 });
 const pg=await ctx.newPage();
 pg.on('pageerror',e=>console.log('PAGEERR',e.message));
 await pg.goto(url);await pg.waitForTimeout(4000);
 return {b,pg};
};

// Einloggen wie ein Spieler; wartet das absichtliche Neuladen nach dem Login ab
exports.login=async(pg,mail,pw)=>{
 await pg.click('#openlogin');await pg.waitForSelector('#loginmodalemail',{state:'visible'});await pg.waitForTimeout(600);await pg.fill('#loginmodalemail',mail);await pg.fill('#loginmodalpassword',pw);
 const nav=pg.waitForNavigation({timeout:20000}).catch(()=>{});
 await pg.click('#loginmodalsubmit');await nav;
 const ok=await pg.waitForFunction(()=>window.kiezProfile&&window.kiezGo,null,{timeout:40000}).then(()=>true).catch(()=>false);
 if(!ok){const st=await pg.evaluate(()=>({profil:!!window.kiezProfile,go:!!window.kiezGo,supa:!!window.kiezSupabase,msg:document.querySelector('#loginmodalmsg')?.innerText,url:location.href,game:!document.querySelector('#game')?.classList.contains('hide')}));throw new Error('Login hängt: '+JSON.stringify(st));}
 await pg.waitForTimeout(2500);
};
