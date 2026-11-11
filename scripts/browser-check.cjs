const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const executablePath = process.env.KKG_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ executablePath, headless:true });
  const errors = [];
  const results = [];
  fs.mkdirSync('artifacts/screenshots', {recursive:true});
  try {
    const page=await browser.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    for(const width of [320,375,390,768,1440]) {
      await page.setViewportSize({width,height:1000});
      const res=await page.goto('http://127.0.0.1:4173/');
      assert.equal(res.status(),200);
      assert.equal(await page.locator('[data-section]').count(),10);
      assert.equal(await page.locator('h1').innerText(),'Kulakan Grosir\nMulai 1 Lusin!');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);
      assert.equal(await page.locator('.kkg-product').count(),5);
      assert.equal(await page.locator('.kkg-stats strong').allTextContents().then(x=>x.join('|')),'70.000+|2.000+|40.000+');
      assert.equal((await page.locator('#kkg-faq-title').innerText()).replace(/\s+/g,' ').trim(),'Sebelum mulai kulakan.');
      const logos=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-logo')).map(el=>({ok:el.complete&&el.naturalWidth===640&&el.naturalHeight===480})));
      assert.equal(logos.length,2,'header and footer logos');
      assert.equal(logos.every(l=>l.ok),true,'logos loaded');
      const ctas=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-kkg-cta]')).map(el=>el.getAttribute('href')));
      assert.equal(ctas.length,9,'all 9 CTAs rendered as links');
      assert.equal(ctas.every(h=>h&&h.startsWith('https://wa.me/62895339293140?text=')),true,'single official WA CS number');
      const overlap=await page.evaluate(()=>{
        const moq=document.querySelector('.kkg-moq').getBoundingClientRect();
        const label=document.querySelector('.kkg-hero-image .kkg-placeholder span:not(.kkg-placeholder-mark)').getBoundingClientRect();
        return !(moq.right<=label.left||moq.left>=label.right||moq.bottom<=label.top||moq.top>=label.bottom);
      });
      assert.equal(overlap,false,'MOQ card overlaps hero placeholder label at '+width);
      const summary=page.locator('summary').first();
      await summary.focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('summary').getAttribute('aria-expanded')==='true');
      await page.keyboard.press('Enter');
      await page.screenshot({path:'artifacts/screenshots/landing-'+width+'.png',fullPage:true});
      results.push({width,sections:10,overflow:false,keyboardFAQ:true});
    }
    const html=await (await fetch('http://127.0.0.1:4173/')).text();
    async function fixture({consentMode='standalone',fail=false,delay=0}={}) {
      const context=await browser.newContext();
      const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
      const body=html.replace(/(["']?fallback["']?):(?:'[^']*'|"[^"]*")/,'$1:"https://wa.me/test-only"')
        .replace(/(["']?consentMode["']?):(?:'[^']*'|"[^"]*")/,'$1:"'+consentMode+'"')
        .replace('<main id="kkg-main">','<main id="kkg-main"><a id="test-cta" data-kkg-cta="hero" href="https://wa.me/test-only">Test-only CTA</a>');
      const requests=[];
      await p.route('http://127.0.0.1:4173/?**',r=>r.fulfill({contentType:'text/html',body}));
      await p.route('https://wa.me/**',r=>r.fulfill({contentType:'text/html',body:'<p>Intercepted test navigation. No WhatsApp request sent.</p>'}));
      await p.route('**/api/handoff',async r=>{
        requests.push(r.request().postDataJSON());
        if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
        await r.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify({
          reference_code:'KK-GA260001',expires_at:new Date(Date.now()+86400000).toISOString(),
          wa_url:'https://wa.me/test-only?text=Kode%20Referensi%3A%20KK-GA260001'
        })}).catch(()=>{});
      });
      await p.goto('http://127.0.0.1:4173/?gclid=fixture-click-only');
      return {context,p,requests};
    }
    let f=await fixture();
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'no tracking before consent');
    await f.p.locator('[data-kkg-reject]').click();
    await f.p.locator('#test-cta').click();
    await f.p.waitForURL('https://wa.me/**');
    assert.equal(f.requests[0].consent.advertising,false);
    assert.deepEqual(f.requests[0].click,{});
    assert.equal(f.requests[0].token,'');
    await f.context.close();results.push({deniedConsent:'WA works without click ID'});
    f=await fixture({delay:200});
    await f.p.locator('[data-kkg-accept]').click();
    await f.p.locator('#test-cta').evaluate(el=>{el.click();el.click();});
    await f.p.waitForURL('https://wa.me/**');
    assert.equal(f.requests.length,1,'rapid double click coalesced');
    assert.equal(f.requests[0].click.gclid,'fixture-click-only');
    assert.match(f.requests[0].token,/^[a-f0-9]{64}$/);
    assert(!f.p.url().includes('fixture-click-only'));
    await f.context.close();results.push({allowedConsent:'ID captured; no ID in WA URL; double click coalesced'});
    f=await fixture({fail:true});
    await f.p.locator('[data-kkg-reject]').click();await f.p.locator('#test-cta').click();
    await f.p.waitForURL('https://wa.me/test-only');
    await f.context.close();results.push({apiFailure:'fallback without reference'});
    f=await fixture({consentMode:'external'});
    assert.equal(await f.p.locator('[data-kkg-banner]').isVisible(),false);
    await f.p.evaluate(()=>window.KKConsent.set({advertising:true}));
    assert.notEqual(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null);
    await f.p.evaluate(()=>window.KKConsent.set({advertising:false}));
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null);
    await f.context.close();results.push({externalCMP:'no second banner; withdrawal clears stored IDs'});
    assert.deepEqual(errors,[]);
    fs.writeFileSync('artifacts/browser-results.json',JSON.stringify({results,errors},null,2));
    console.log(JSON.stringify({checks:results.length,errors,screenshots:path.resolve('artifacts/screenshots')}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
