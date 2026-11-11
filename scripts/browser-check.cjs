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
      assert.equal(await page.locator('[data-section]').count(),9);
      assert.equal(await page.locator('footer').count(),0,'footer removed');
      assert.equal(await page.locator('h1').count(),1,'exactly one H1');
      assert.equal(await page.locator('h1').innerText(),'Kulakan Grosir Pakaian Dalam\nMulai 1 Lusin!');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);
      assert.equal(await page.locator('.kkg-product').count(),5);
      assert.equal(await page.locator('.kkg-product-desc').count(),5,'all 5 categories have SEO/AEO micro descriptions');
      assert.equal(await page.locator('.kkg-question').count(),8,'all 8 AEO/GEO FAQs rendered');
      assert.equal(await page.locator('.kkg-product [data-kkg-cta]').count(),0,'no CTA inside category cards');
      assert.equal(await page.locator('.kkg-review-note').count(),0,'review note removed');
      const bodyText=await page.locator('.kkg-root').innerText();
      const rawText=await page.locator('.kkg-root').textContent();
      assert.equal(bodyText.includes('Lima kategori kebutuhan harian'),false,'subtitle removed');
      assert.equal(bodyText.includes('KEBUTUHAN HARIAN · PILIHAN UNTUK USAHA ANDA'),false,'hero art caption removed');
      assert.equal(await page.locator('.kkg-art-caption').count(),0,'hero art caption element removed');
      assert.equal(await page.locator('.kkg-hero .kkg-support').innerText(),'Melayani Pengiriman ke Seluruh Indonesia');
      assert.equal(bodyText.toLowerCase().includes('daily needs'),false,'English phrase daily needs replaced with Indonesian');
      assert.equal(bodyText.includes('kebutuhan harian'),true,'Indonesian phrase kebutuhan harian present');
      assert.equal(await page.locator('.kkg-product-number').count(),0,'category numbers removed');
      assert.equal(await page.locator('.kkg-step-number').count(),0,'order step numbers removed');
      assert.equal(await page.locator('.kkg-steps .kkg-step-icon .kkg-svg').count(),4,'order steps show 4 icons');
      assert.equal((await page.locator('.kkg-about-location').innerText()).length<=140,true,'about location text concise');
      for(const kw of ['grosir celana dalam','grosir celana dalam wanita','grosir pakaian dalam','grosir pakaian dalam wanita','grosir bra','bh wanita','supplier bra','supplier pakaian dalam','supplier pakaian dalam wanita','supplier celana dalam','supplier pakaian dalam untuk toko','kulakan pakaian dalam','distributor pakaian dalam','grosir pakaian dalam surabaya','distributor pakaian dalam surabaya','supplier pakaian dalam surabaya','agen pakaian dalam']) {
        assert.equal(rawText.toLowerCase().includes(kw),true,'missing DOM keyword: '+kw+' at '+width);
      }
      for(const kw of ['grosir celana dalam','grosir celana dalam wanita','grosir pakaian dalam','grosir pakaian dalam wanita','grosir bra','bh wanita','supplier bra','supplier pakaian dalam','supplier pakaian dalam wanita','supplier celana dalam','kulakan pakaian dalam','distributor pakaian dalam','agen pakaian dalam','surabaya']) {
        assert.equal(bodyText.toLowerCase().includes(kw),true,'missing visible keyword: '+kw+' at '+width);
      }
      const seoHead=await page.evaluate(()=>{
        const title=document.title;
        const desc=document.querySelector('meta[name="description"]')?.getAttribute('content')||'';
        const robots=document.querySelector('meta[name="robots"]')?.getAttribute('content')||'';
        const canonical=document.querySelector('link[rel="canonical"]')?.getAttribute('href')||'';
        const scripts=Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s=>JSON.parse(s.textContent));
        return {title,desc,robots,canonical,scripts};
      });
      assert.match(seoHead.title,/Grosir & Supplier Pakaian Dalam Surabaya/);
      assert.equal(seoHead.desc.length>=120&&seoHead.desc.length<=165,true,'meta description 120-165 chars');
      assert.match(seoHead.robots,/noindex/);
      assert.equal(seoHead.canonical.endsWith('/grosir/'),true,'canonical points to /grosir/');
      assert.equal(seoHead.scripts.length,1,'single JSON-LD block');
      const graph=seoHead.scripts[0]['@graph']||[];
      assert.equal(graph.some(n=>Array.isArray(n['@type'])&&n['@type'].includes('WholesaleStore')&&n.address?.addressLocality==='Surabaya'),true,'WholesaleStore schema');
      assert.equal(graph.find(n=>n['@type']==='FAQPage')?.mainEntity?.length,8,'FAQPage schema count matches 8 FAQs');
      assert.equal(graph.find(n=>n['@type']==='OfferCatalog')?.itemListElement?.length,5,'OfferCatalog schema count matches 5 categories');
      assert.equal(await page.locator('.kkg-stats strong').allTextContents().then(x=>x.join('|')),'70.000+|2.000+|40.000+');
      assert.equal((await page.locator('#kkg-faq-title').innerText()).replace(/\s+/g,' ').trim(),'Sebelum mulai kulakan.');
      const fontState=await page.evaluate(async()=>{
        await document.fonts.ready;
        const loaded=Array.from(document.fonts).some(f=>f.family.replace(/['"]/g,'')==='Inter'&&f.status==='loaded');
        const h1Font=getComputedStyle(document.querySelector('h1')).fontFamily;
        const bodyFont=getComputedStyle(document.querySelector('.kkg-root')).fontFamily;
        const minFs=Array.from(document.querySelectorAll('.kkg-root *'))
          .filter(el=>!el.children.length&&el.textContent.trim()&&!el.classList.contains('kkg-placeholder-mark'))
          .reduce((m,el)=>Math.min(m,parseFloat(getComputedStyle(el).fontSize)),99);
        const navSmall=Array.from(document.querySelectorAll('.kkg-nav a')).some(el=>{const r=el.getBoundingClientRect();return r.width<44||r.height<44;});
        const faqSmall=Array.from(document.querySelectorAll('.kkg-question summary')).some(el=>el.getBoundingClientRect().height<44);
        const productsCentered=getComputedStyle(document.querySelector('.kkg-products-head')).textAlign==='center';
        const finalBtn=document.querySelector('.kkg-final .kkg-button').getBoundingClientRect();
        const finalSupport=document.querySelector('.kkg-final .kkg-support').getBoundingClientRect();
        return {loaded,h1Font,bodyFont,minFs,navSmall,faqSmall,productsCentered,supportBelow:finalSupport.top>=finalBtn.bottom};
      });
      assert.equal(fontState.loaded,true,'Inter webfont loaded');
      assert.match(fontState.h1Font,/\bInter\b/);
      assert.match(fontState.bodyFont,/\bInter\b/);
      assert.equal(fontState.minFs>=12,true,'all readable text >= 12px at '+width+' got '+fontState.minFs);
      assert.equal(fontState.navSmall,false,'nav targets >= 44x44 at '+width);
      assert.equal(fontState.faqSmall,false,'FAQ summary height >= 44px at '+width);
      assert.equal(fontState.productsCentered,true,'products heading centered at '+width);
      assert.equal(fontState.supportBelow,true,'final support text below CTA button at '+width);
      assert.equal(await page.locator('.kkg-svg').count()>=9,true,'Lucide inline SVGs rendered');
      const logos=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-logo')).map(el=>({ok:el.complete&&el.naturalWidth===640&&el.naturalHeight===480})));
      assert.equal(logos.length,1,'header logo');
      assert.equal(logos.every(l=>l.ok),true,'logo loaded');
      const heroImgs=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-hero-photo')).map(el=>({ok:el.complete&&el.naturalWidth===1200&&el.naturalHeight===1200})));
      assert.equal(heroImgs.length,1,'hero photo rendered');
      assert.equal(heroImgs.every(i=>i.ok),true,'hero photo loaded (1200x1200)');
      await page.locator('.kkg-product-grid').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('.kkg-product .kkg-photo')).every(el=>el.complete&&el.naturalWidth>0));
      await page.locator('.kkg-about-image').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('.kkg-photo')).every(el=>el.complete&&el.naturalWidth>0));
      await page.evaluate(()=>Promise.all(Array.from(document.querySelectorAll('.kkg-photo')).map(el=>el.decode?el.decode().catch(()=>{}):null)));
      const catImgs=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-product .kkg-photo')).map(el=>({ok:el.complete&&el.naturalWidth===826&&el.naturalHeight===1026})));
      assert.equal(catImgs.length,5,'all 5 4:5 category photos rendered');
      assert.equal(catImgs.every(i=>i.ok),true,'all 5 category 4:5 photos loaded cleanly (826x1026)');
      const aboutImgs=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-about-photo')).map(el=>({ok:el.complete&&el.naturalWidth===960&&el.naturalHeight===1192})));
      assert.equal(aboutImgs.length,1,'about photo rendered');
      assert.equal(aboutImgs.every(i=>i.ok),true,'about photo loaded cleanly (960x1192)');
      assert.equal(await page.locator('.kkg-placeholder').count(),0,'no placeholder remaining anywhere on page');
      const ctas=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-kkg-cta]')).map(el=>el.getAttribute('href')));
      assert.equal(ctas.length,4,'all 4 CTAs rendered as links');
      assert.equal(ctas.every(h=>h&&h.startsWith('https://wa.me/62895339293140?text=')),true,'single official WA CS number');
      const overlap=await page.evaluate(()=>{
        const moq=document.querySelector('.kkg-moq').getBoundingClientRect();
        const copy=document.querySelector('.kkg-hero-copy').getBoundingClientRect();
        return !(moq.right<=copy.left||moq.left>=copy.right||moq.bottom<=copy.top||moq.top>=copy.bottom);
      });
      assert.equal(overlap,false,'MOQ card overlaps hero copy at '+width);
      const summary=page.locator('summary').first();
      await summary.focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('summary').getAttribute('aria-expanded')==='true');
      await page.keyboard.press('Enter');
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.waitForTimeout(80);
      await page.screenshot({path:'artifacts/screenshots/landing-'+width+'.png',fullPage:true});
      results.push({width,sections:9,overflow:false,keyboardFAQ:true,minFontPx:fontState.minFs});
    }
    const html=await (await fetch('http://127.0.0.1:4173/')).text();
    async function fixture({consentMode='standalone',fail=false,delay=0,viewport={width:1280,height:800}}={}) {
      const context=await browser.newContext({viewport});
      const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
      const body=html.replace(/(["']?fallback["']?):(?:'[^']*'|"[^"]*")/,'$1:"https://wa.me/test-only"')
        .replace(/(["']?consentMode["']?):(?:'[^']*'|"[^"]*")/,'$1:"'+consentMode+'"')
        .replace('<main id="kkg-main" tabindex="-1">','<main id="kkg-main" tabindex="-1"><a id="test-cta" data-kkg-cta="hero" href="https://wa.me/test-only">Test-only CTA</a>');
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
    let f=await fixture({viewport:{width:375,height:700}});
    await f.p.evaluate(()=>window.scrollTo(0,950));
    await f.p.waitForTimeout(100);
    assert.equal(await f.p.locator('[data-kkg-sticky]').isVisible(),false,'sticky CTA stays hidden while consent banner is visible');
    await f.p.locator('[data-kkg-choices]').click();
    assert.equal(await f.p.locator('.kkg-dialog').evaluate(d=>d.open),true,'dialog opens');
    await f.p.mouse.click(5,5);
    assert.equal(await f.p.locator('.kkg-dialog').evaluate(d=>d.open),false,'light dismiss closes dialog');
    await f.p.locator('[data-kkg-reject]').click();
    await f.p.evaluate(()=>window.scrollTo(0,1100));
    await f.p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
    await f.p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    await f.p.waitForFunction(()=>document.querySelector('[data-kkg-sticky]').hidden);
    await f.p.evaluate(()=>window.scrollTo(0,1100));
    await f.p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
    await f.p.locator('[data-kkg-sticky] [data-kkg-cta="sticky"]').click();
    await f.p.waitForURL('https://wa.me/**');
    assert.equal(f.requests[0].cta_context,'sticky');
    assert.equal(f.requests[0].consent.advertising,false);
    assert.deepEqual(f.requests[0].click,{});
    assert.equal(f.requests[0].token,'');
    await f.context.close();results.push({mobileStickyAndDeniedConsent:'sticky CTA obeys banner/footer guards; WA works without click ID'});
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
