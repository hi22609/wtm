const {chromium}=require('playwright-core');const path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 await p.goto('file://'+path.join(__dirname,'..','dist','wtm-share.html'),{timeout:20000});
 await p.waitForTimeout(700); await p.click('#gate button'); await p.waitForTimeout(300);
 await p.click('nav button.btn-primary'); await p.waitForTimeout(1200);
 let f=null; for(const x of p.frames()){if(x===p.mainFrame())continue;if(await x.locator('button.wlc-btn').count()>0){f=x;break;}}
 await f.click('button.wlc-btn'); await p.waitForTimeout(900);
 const shots=[['feed',null],['map','.tab[onclick*="map"]'],['ask','.tab[onclick*="ask"]'],['friends','.tab[onclick*="friends"]'],['profile','.tab[onclick*="profile"]']];
 for(const [name,sel] of shots){
   if(sel){ await f.locator('.scr.active '+sel).first().click().catch(async()=>{await f.locator(sel).first().click();}); await p.waitForTimeout(900); }
   await p.screenshot({path:path.join(__dirname,'..','dist','look-'+name+'.png')});
   console.log('shot',name);
 }
 await b.close();
})();
