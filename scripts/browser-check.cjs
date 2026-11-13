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
    for(const width of [320,375,390,768,820,1440]) {
      await page.setViewportSize({width,height:1000});
      const res=await page.goto('http://127.0.0.1:4173/');
      assert.equal(res.status(),200);
      assert.equal(await page.locator('[data-section]').count(),10);
      assert.deepEqual(await page.locator('[data-section]').evaluateAll(els=>els.map(e=>e.getAttribute('data-section'))),['header','hero','statistics','usp','categories','about','order','testimonials','faq','final'],'exact 10-section order with testimonials between order and faq');
      assert.equal(await page.locator('footer').count(),0,'footer removed');
      assert.equal(await page.locator('h1').count(),1,'exactly one H1');
      assert.equal(await page.locator('h1').innerText(),'Kulakan Grosir Pakaian Dalam\nMulai 1 Lusin!');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);
      assert.equal(await page.locator('.kkg-product').count(),5);
      assert.equal(await page.locator('.kkg-product-desc').count(),5,'all 5 categories have SEO/AEO micro descriptions');
      assert.equal(await page.locator('.kkg-question').count(),8,'all 8 AEO/GEO FAQs rendered');
      assert.equal(await page.locator('.kkg-product [data-kkg-cta]').count(),0,'no CTA inside category cards');
      assert.equal(await page.locator('.kkg-review-note').count(),0,'review note removed');
      assert.equal(await page.locator('.kkg-staging, #kkg-setup').count(),0,'staging yellow banner removed');
      assert.equal(await page.locator('.kkg-header').evaluate(el=>Math.abs(el.getBoundingClientRect().top)<=1),true,'no blank strip above header');
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
        const og=prop=>Array.from(document.querySelectorAll(`meta[property="${prop}"]`)).map(m=>m.getAttribute('content')||'');
        const tw=name=>Array.from(document.querySelectorAll(`meta[name="${name}"]`)).map(m=>m.getAttribute('content')||'');
        const counts={
          desc:document.querySelectorAll('meta[name="description"]').length,
          robots:document.querySelectorAll('meta[name="robots"]').length,
          canonical:document.querySelectorAll('link[rel="canonical"]').length,
        };
        const scripts=Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s=>JSON.parse(s.textContent));
        return {title,desc,robots,canonical,counts,ogLocale:og('og:locale'),ogType:og('og:type'),ogSiteName:og('og:site_name'),ogTitle:og('og:title'),ogDesc:og('og:description'),ogUrl:og('og:url'),twCard:tw('twitter:card'),scripts};
      });
      assert.match(seoHead.title,/Grosir & Supplier Pakaian Dalam Surabaya/);
      assert.equal(seoHead.desc.length>=120&&seoHead.desc.length<=165,true,'meta description 120-165 chars');
      assert.match(seoHead.robots,/noindex/);
      assert.equal(seoHead.canonical.endsWith('/grosir/'),true,'canonical points to /grosir/');
      assert.equal(seoHead.canonical,'https://example.test/grosir/','preview canonical uses fixture origin');
      assert.deepEqual(seoHead.counts,{desc:1,robots:1,canonical:1},'single description, robots, canonical tags');
      assert.deepEqual(seoHead.ogLocale,['id_ID'],'single og:locale=id_ID');
      assert.deepEqual(seoHead.ogType,['website'],'single og:type=website');
      assert.deepEqual(seoHead.ogSiteName,['KK Underwear — CV. Kasih Karunia'],'single og:site_name');
      assert.equal(seoHead.ogTitle.length===1&&seoHead.ogDesc.length===1&&seoHead.ogUrl.length===1&&seoHead.twCard.length===1,true,'single OG/Twitter meta tags');
      assert.equal(seoHead.scripts.length,1,'single JSON-LD block');
      const graph=seoHead.scripts[0]['@graph']||[];
      assert.equal(graph.some(n=>Array.isArray(n['@type'])&&n['@type'].includes('WholesaleStore')&&n.address?.addressLocality==='Surabaya'&&n.logo==='https://example.test/assets/logo-kk.webp'),true,'WholesaleStore schema with fixture logo URL');
      assert.equal(graph.find(n=>n['@type']==='FAQPage')?.mainEntity?.length,8,'FAQPage schema count matches 8 FAQs');
      assert.equal(graph.find(n=>n['@type']==='OfferCatalog')?.itemListElement?.length,5,'OfferCatalog schema count matches 5 categories');
      assert.equal(graph.some(n=>n['@type']==='Review'||n['@type']==='AggregateRating'),false,'No Review or AggregateRating schema emitted');
      assert.equal(await page.locator('[data-section="testimonials"] .kkg-testimonial-card').count(),3,'3 testimonial cards rendered');
      assert.deepEqual(await page.locator('[data-section="testimonials"] .kkg-testimonial-meta h3').allTextContents(),['Pak Agus','Pak Budi','Ibu Lala'],'updated testimonial author names rendered');
      assert.equal(await page.locator('[data-section="testimonials"] .kkg-testimonial-badge').count(),0,'CONTOH TESTIMONI badge removed');
      assert.equal(await page.locator('[data-section="testimonials"] .kkg-testimonials-sub').count(),0,'testimonials subheadline removed');
      assert.equal(rawText.includes('Pengalaman berbelanja grosir bersama CV. Kasih Karunia.'),false,'testimonials subheadline text absent');
      assert.equal(rawText.includes('Informasi yang membantu Anda'),false,'FAQ subheadline text absent');
      assert.equal(rawText.includes('CONTOH TESTIMONI'),false,'CONTOH TESTIMONI text absent');
      assert.equal(await page.locator('[data-section="testimonials"] [data-kkg-cta]').count(),0,'no CTA buttons inside testimonials');
      const testiGrid=await page.locator('[data-section="testimonials"]').evaluate(sec=>{
        const grid=sec.querySelector('.kkg-testimonials-grid');
        const hBox=sec.querySelector('#kkg-testimonials-title').getBoundingClientRect();
        const cBox=sec.querySelector('.kkg-container').getBoundingClientRect();
        const disp=getComputedStyle(grid).display;
        const cols=disp==='grid'?getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length:1;
        const boxes=Array.from(grid.querySelectorAll('.kkg-testimonial-card')).map(c=>c.getBoundingClientRect());
        return {disp,cols,row0Diff:Math.abs(boxes[0].height-boxes[1].height),row0TopDiff:Math.abs(boxes[0].top-boxes[1].top),headCenterDiff:Math.abs((hBox.left+hBox.width/2)-(cBox.left+cBox.width/2))};
      });
      assert.equal(testiGrid.headCenterDiff<=2,true,'testimonial heading centered within container at '+width);
      if(width>=1024){assert.equal(testiGrid.cols,3,'3 testimonial columns on desktop');assert.equal(testiGrid.row0Diff<=2&&testiGrid.row0TopDiff<=2,true,'equal card height row on desktop');}
      else if(width>768){assert.equal(testiGrid.cols,2,'2 testimonial columns on tablet '+width);assert.equal(testiGrid.row0Diff<=2&&testiGrid.row0TopDiff<=2,true,'equal card height row on tablet');}
      else{
        assert.equal(testiGrid.disp,'flex','testimonials renders flex carousel on mobile '+width);assert.equal(testiGrid.row0Diff<=2,true,'equal card height across mobile carousel '+width);
        const testiMobile=await page.locator('[data-section="testimonials"] .kkg-testimonial-card').first().evaluate(c=>{
          const p=c.querySelector('.kkg-testimonial-content p');
          const cs=getComputedStyle(p);
          const fs=parseFloat(cs.fontSize);
          const lh=parseFloat(cs.lineHeight)/fs;
          return {cardH:c.getBoundingClientRect().height,fs,lh};
        });
        assert.equal(testiMobile.fs>=14&&testiMobile.fs<=15,true,'testimonial mobile quote font 14-15px at '+width+': '+testiMobile.fs);
        assert.equal(testiMobile.lh>=1.5&&testiMobile.lh<=1.62,true,'testimonial mobile line-height 1.5-1.6 at '+width+': '+testiMobile.lh.toFixed(2));
        assert.equal(testiMobile.cardH<=270,true,'compact mobile testimonial card height at '+width+': '+testiMobile.cardH);
      }
      assert.equal(await page.locator('.kkg-stats strong').allTextContents().then(x=>x.join('|')),'70.000+|2.000+|40.000+');
      assert.equal((await page.locator('#kkg-faq-title').innerText()).replace(/\s+/g,' ').trim(),'Sebelum mulai kulakan.');
      const isMobile=width<=768;
      const fontState=await page.evaluate(async()=>{
        await document.fonts.ready;
        const loaded=Array.from(document.fonts).some(f=>f.family.replace(/['"]/g,'')==='Inter'&&f.status==='loaded');
        const h1Cs=getComputedStyle(document.querySelector('h1'));
        const h1Font=h1Cs.fontFamily;
        const h1Px=parseFloat(h1Cs.fontSize);
        const introPx=parseFloat(getComputedStyle(document.querySelector('.kkg-hero .kkg-intro')).fontSize);
        const bodyFont=getComputedStyle(document.querySelector('.kkg-root')).fontFamily;
        const minFs=Array.from(document.querySelectorAll('.kkg-root *'))
          .filter(el=>getComputedStyle(el).display!=='none'&&!el.children.length&&el.textContent.trim()&&!el.classList.contains('kkg-placeholder-mark'))
          .reduce((m,el)=>Math.min(m,parseFloat(getComputedStyle(el).fontSize)),99);
        const navSmall=Array.from(document.querySelectorAll('.kkg-nav a')).some(el=>{const r=el.getBoundingClientRect();return r.width<44||r.height<44;});
        const faqSmall=Array.from(document.querySelectorAll('.kkg-question summary')).some(el=>el.getBoundingClientRect().height<44);
        const productsCentered=getComputedStyle(document.querySelector('.kkg-products-head')).textAlign==='center';
        const finalBtn=document.querySelector('.kkg-final .kkg-button').getBoundingClientRect();
        const finalSupport=document.querySelector('.kkg-final .kkg-support').getBoundingClientRect();
        return {loaded,h1Font,h1Px,introPx,bodyFont,minFs,navSmall,faqSmall,productsCentered,supportBelow:finalSupport.top>=finalBtn.bottom};
      });
      assert.equal(fontState.loaded,true,'Inter webfont loaded');
      assert.match(fontState.h1Font,/\bInter\b/);
      assert.match(fontState.bodyFont,/\bInter\b/);
      assert.equal(fontState.minFs>=12,true,'all readable text >= 12px at '+width+' got '+fontState.minFs);
      if(isMobile){
        assert.equal(fontState.h1Px<=34,true,'mobile H1 scaled down at '+width+' got '+fontState.h1Px);
        assert.equal(fontState.introPx<=14.5,true,'mobile intro scaled down at '+width+' got '+fontState.introPx);
      }else{
        assert.equal(fontState.navSmall,false,'nav targets >= 44x44 at '+width);
      }
      assert.equal(fontState.faqSmall,false,'FAQ summary height >= 44px at '+width);
      assert.equal(fontState.productsCentered,true,'products heading centered at '+width);
      assert.equal(fontState.supportBelow,true,'final support text below CTA button at '+width);
      assert.equal(await page.locator('.kkg-svg').count()>=9,true,'Lucide inline SVGs rendered');
      const logos=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-logo')).map(el=>({ok:el.complete&&el.naturalWidth===640&&el.naturalHeight===480})));
      assert.equal(logos.length,1,'header logo');
      assert.equal(logos.every(l=>l.ok),true,'logo loaded');
      assert.equal(await page.locator('.kkg-nav').isVisible(),!isMobile,'nav visibility mismatch at '+width);
      assert.equal(await page.locator('[data-kkg-settings]').count(),0,'no active privacy button in default disabled mode at '+width);
      assert.equal(await page.locator('.kkg-hero-copy .kkg-badge').isVisible(),!isMobile,'hero badge visibility mismatch at '+width);
      assert.equal(await page.locator('.kkg-hero-image').isVisible(),!isMobile,'hero image visibility mismatch at '+width);
      assert.equal(await page.locator('.kkg-moq').isVisible(),!isMobile,'MOQ badge visibility mismatch at '+width);
      assert.equal(await page.locator('.kkg-desktop-only').isVisible(),!isMobile,'about desktop tail visibility mismatch at '+width);
      for(const secSel of ['#produk','#testimoni']){
        assert.equal(await page.locator(secSel+' [data-kkg-carousel-controls]').isVisible(),isMobile,'carousel controls visibility mismatch for '+secSel+' at '+width);
        assert.equal(await page.locator(secSel+' [data-kkg-carousel-markers]').isVisible(),isMobile,'carousel markers visibility mismatch for '+secSel+' at '+width);
      }
      if(!isMobile){
        const heroImgs=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-hero-photo')).map(el=>({ok:el.complete&&el.naturalWidth===1200&&el.naturalHeight===1200})));
        assert.equal(heroImgs.length,1,'hero photo rendered');
        assert.equal(heroImgs.every(i=>i.ok),true,'hero photo loaded (1200x1200)');
      }
      await page.locator('.kkg-product-grid').scrollIntoViewIfNeeded();
      if(isMobile){
        const btnSmall=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-carousel-btn')).some(el=>{const r=el.getBoundingClientRect();return r.width<44||r.height<44;}));
        const dotSmall=await page.evaluate(()=>Array.from(document.querySelectorAll('.kkg-carousel-dot')).some(el=>{const r=el.getBoundingClientRect();return r.width<24||r.height<24;}));
        assert.equal(btnSmall,false,'carousel button touch targets >= 44x44 at '+width);
        assert.equal(dotSmall,false,'carousel dot targets >= 24x24 (WCAG 2.2 AA) at '+width);
        for(const [secSel,count] of [['#produk',5],['#testimoni',3]]){
          const sec=page.locator(secSel);
          await sec.scrollIntoViewIfNeeded();
          assert.equal(await sec.locator('[data-kkg-carousel-markers] .kkg-carousel-dot').count(),count,count+' carousel dots in '+secSel+' at '+width);
          assert.equal(await sec.locator('[data-kkg-carousel-status]').innerText(),'',secSel+' carousel status initially silent at '+width);
          assert.equal(await sec.locator('[data-kkg-carousel-markers] .kkg-carousel-dot').first().getAttribute('aria-current'),'true',secSel+' first slide initially current');
          const centerDelta=await page.evaluate((s)=>{
            const track=document.querySelector(s+' [data-kkg-carousel-track]');
            const first=track.querySelector('[data-kkg-carousel-slide]');
            const tr=track.getBoundingClientRect();
            const sr=first.getBoundingClientRect();
            return Math.abs((sr.left+sr.width/2)-(tr.left+tr.width/2));
          },secSel);
          assert.equal(centerDelta<=3,true,secSel+' first slide centered on load at '+width+' diff='+centerDelta);
          if(secSel==='#testimoni'){
            const gapOk=await page.evaluate(()=>{
              const p=document.querySelector('#testimoni [data-kkg-carousel-slide] .kkg-testimonial-content p').getBoundingClientRect();
              const prev=document.querySelector('#testimoni [data-kkg-carousel-prev]').getBoundingClientRect();
              const next=document.querySelector('#testimoni [data-kkg-carousel-next]').getBoundingClientRect();
              const prodW=document.querySelector('#produk [data-kkg-carousel-slide]').getBoundingClientRect().width;
              const testiW=document.querySelector('#testimoni [data-kkg-carousel-slide]').getBoundingClientRect().width;
              return {clearLeft:prev.right<=p.left,clearRight:next.left>=p.right,sameSlideWidth:Math.abs(prodW-testiW)<=1};
            });
            assert.equal(gapOk.clearLeft&&gapOk.clearRight,true,'testimonial controls do not overlap quote text at '+width);
            assert.equal(gapOk.sameSlideWidth,true,'testimonial carousel matches product card width at '+width);
          }
          for(let idx=1;idx<count;idx++){
            await sec.locator('[data-kkg-carousel-markers] .kkg-carousel-dot').nth(idx).click();
            await page.waitForFunction(([s,n,t])=>document.querySelector(s+' [data-kkg-carousel-status]')?.textContent==='Slide '+n+' dari '+t,[secSel,idx+1,count]);
          }
          await sec.locator('[data-kkg-carousel-markers] .kkg-carousel-dot').first().click();
          await page.waitForFunction(([s,t])=>document.querySelector(s+' [data-kkg-carousel-status]')?.textContent==='Slide 1 dari '+t,[secSel,count]);
          await sec.locator('[data-kkg-carousel-next]').click();
          await page.waitForFunction(([s,t])=>document.querySelector(s+' [data-kkg-carousel-status]')?.textContent==='Slide 2 dari '+t,[secSel,count]);
          assert.equal(await sec.locator('[data-kkg-carousel-markers] .kkg-carousel-dot').nth(1).getAttribute('aria-current'),'true',secSel+' dot 2 becomes current on Next');
          await sec.locator('[data-kkg-carousel-prev]').click();
          await page.waitForFunction(([s,t])=>document.querySelector(s+' [data-kkg-carousel-status]')?.textContent==='Slide 1 dari '+t,[secSel,count]);
          await sec.locator('[data-kkg-carousel-prev]').click();
          await page.waitForFunction(([s,t])=>document.querySelector(s+' [data-kkg-carousel-status]')?.textContent==='Slide '+t+' dari '+t,[secSel,count]);
          assert.equal(await sec.locator('[data-kkg-carousel-markers] .kkg-carousel-dot').nth(count-1).getAttribute('aria-current'),'true',secSel+' Previous loops cleanly from 1 to '+count);
          await sec.locator('[data-kkg-carousel-markers] .kkg-carousel-dot').first().click();
          await page.waitForFunction(([s,t])=>document.querySelector(s+' [data-kkg-carousel-status]')?.textContent==='Slide 1 dari '+t,[secSel,count]);
        }
        await page.waitForTimeout(100);
      }
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
      const aboutOrder=await page.evaluate(()=>{
        const head=document.querySelector('#kkg-about-title').getBoundingClientRect();
        const img=document.querySelector('.kkg-about-image').getBoundingClientRect();
        const body=document.querySelector('.kkg-about-body').getBoundingClientRect();
        return {headBottom:head.bottom,imgTop:img.top,imgBottom:img.bottom,imgLeft:img.left,headRight:head.right,bodyTop:body.top};
      });
      if(isMobile){
        assert.equal(aboutOrder.imgTop>=aboutOrder.headBottom-1&&aboutOrder.bodyTop>=aboutOrder.imgBottom-1,true,'about warehouse image sits cleanly below heading and above body on mobile at '+width);
      }else if(width>800){
        assert.equal(aboutOrder.imgLeft>=aboutOrder.headRight,true,'about warehouse image sits cleanly on right column on desktop at '+width);
      }
      if(!isMobile){
        const overlap=await page.evaluate(()=>{
          const moq=document.querySelector('.kkg-moq').getBoundingClientRect();
          const copy=document.querySelector('.kkg-hero-copy').getBoundingClientRect();
          return !(moq.right<=copy.left||moq.left>=copy.right||moq.bottom<=copy.top||moq.top>=copy.bottom);
        });
        assert.equal(overlap,false,'MOQ card overlaps hero copy at '+width);
      }
      const summary=page.locator('summary').first();
      await summary.focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('summary').getAttribute('aria-expanded')==='true');
      await page.keyboard.press('Enter');
      if(isMobile){
        await page.evaluate(()=>window.scrollTo(0,0));
        const fullHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
        await page.setViewportSize({width,height:fullHeight});
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#produk [data-kkg-carousel-markers] .kkg-carousel-dot').first().getAttribute('aria-current'),'true','#produk Slide 1 active before screenshot at '+width);
        assert.equal(await page.locator('#testimoni [data-kkg-carousel-markers] .kkg-carousel-dot').first().getAttribute('aria-current'),'true','#testimoni Slide 1 active before screenshot at '+width);
        if(width===375){
          await page.locator('.kkg-hero').screenshot({path:'artifacts/screenshots/mobile-hero-375.png'});
          await page.locator('#produk').screenshot({path:'artifacts/screenshots/mobile-produk-375.png'});
          await page.locator('#tentang').screenshot({path:'artifacts/screenshots/mobile-tentang-375.png'});
          await page.locator('#testimoni').screenshot({path:'artifacts/screenshots/mobile-testimonials-375.png'});
        }
        await page.screenshot({path:'artifacts/screenshots/landing-'+width+'.png',fullPage:true});
      }else if(width===1440){
        await page.locator('#testimoni').screenshot({path:'artifacts/screenshots/desktop-testimonials-1440.png'});
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.waitForTimeout(80);
        await page.screenshot({path:'artifacts/screenshots/landing-'+width+'.png',fullPage:true});
      }
      results.push({width,mobile:isMobile,sections:10,overflow:false,keyboardFAQ:true,minFontPx:fontState.minFs});
    }
    for(const width of [375,1440]){
      await page.setViewportSize({width,height:1000});
      const res=await page.goto('http://127.0.0.1:4173/?mode=active');
      assert.equal(res.status(),200);
      assert.equal(await page.locator('[data-section]').count(),9,'active public mode hides testimonials placeholder');
      assert.equal(await page.locator('[data-section="testimonials"]').count(),0,'no testimonials section in active DOM');
      const rawActive=await page.locator('.kkg-root').textContent();
      assert.equal(rawActive.includes('Pak Agus')||rawActive.includes('Pak Budi')||rawActive.includes('Ibu Lala')||rawActive.includes('CONTOH TESTIMONI'),false,'placeholder absent in active DOM');
    }
    results.push({activePublicModeHidden:'testimonials placeholder omitted in active mode on desktop and mobile'});
    const htmlCache={};
    async function getModeHtml(consentMode){
      if(!htmlCache[consentMode])htmlCache[consentMode]=await (await fetch('http://127.0.0.1:4173/?consent='+encodeURIComponent(consentMode))).text();
      return htmlCache[consentMode];
    }
    async function fixture({consentMode='standalone',fail=false,delay=0,viewport={width:1280,height:800}}={}) {
      const context=await browser.newContext({viewport});
      const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
      const baseHtml=await getModeHtml(consentMode);
      const body=baseHtml.replace(/(["']?fallback["']?):(?:'[^']*'|"[^"]*")/,'$1:"https://wa.me/test-only"')
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
    f=await fixture({consentMode:'disabled'});
    assert.equal(await f.p.locator('[data-kkg-settings]').count(),0,'disabled mode omits settings reopen control');
    assert.equal(await f.p.locator('[data-kkg-banner]').isVisible(),false,'disabled mode shows no consent banner');
    await f.context.close();results.push({disabledConsent:'no privacy settings control rendered in disabled mode'});
    for(const width of [320,375,390,768,820,1440]){
      f=await fixture({consentMode:'standalone',viewport:{width,height:800}});
      assert.equal(await f.p.locator('[data-kkg-settings]').isVisible(),true,'settings control visible on standalone at '+width);
      await f.p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      await f.p.waitForTimeout(80);
      const bannerClear=await f.p.evaluate(()=>{
        const s=document.querySelector('[data-kkg-settings]').getBoundingClientRect();
        const b=document.querySelector('[data-kkg-banner]').getBoundingClientRect();
        return {width:s.width,height:s.height,clearAboveBanner:s.bottom<=b.top-2,noOverflow:document.documentElement.scrollWidth<=innerWidth};
      });
      assert.equal(bannerClear.width>=44&&bannerClear.height>=44,true,'privacy settings touch target >=44x44 at '+width);
      assert.equal(bannerClear.noOverflow,true,'no horizontal overflow on standalone at '+width);
      assert.equal(bannerClear.clearAboveBanner,true,'privacy control clears open banner at bottom at '+width);
      await f.p.locator('[data-kkg-accept]').click();
      await f.p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      await f.p.waitForTimeout(80);
      assert.equal(await f.p.locator('[data-kkg-banner]').isVisible(),false,'banner hides after accept at '+width);
      assert.equal(await f.p.locator('[data-kkg-sticky]').isVisible(),false,'sticky CTA hidden over Final CTA privacy control at '+width);
      assert.equal(await f.p.locator('[data-kkg-settings]').isVisible(),true,'privacy control remains accessible after banner hidden at '+width);
      const placement=await f.p.evaluate(()=>{
        const sup=document.querySelector('.kkg-final .kkg-support').getBoundingClientRect();
        const set=document.querySelector('[data-kkg-settings]').getBoundingClientRect();
        return {belowSupport:set.top>=sup.bottom-1,noOverflow:document.documentElement.scrollWidth<=innerWidth};
      });
      assert.equal(placement.belowSupport&&placement.noOverflow,true,'privacy control placed cleanly below Final CTA support text at '+width);
      if(width===375||width===1440){
        await f.p.locator('.kkg-final').screenshot({path:'artifacts/screenshots/t01-final-privacy-'+width+'.png'});
      }
      await f.context.close();
    }
    results.push({privacyControlResponsive:'reopen control verified across 320,375,390,768,820,1440 with sticky/banner clearance'});
    f=await fixture({consentMode:'standalone'});
    await f.p.locator('[data-kkg-accept]').click();
    assert.notEqual(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'accept stores click ID');
    await f.p.locator('[data-kkg-settings]').click();
    assert.equal(await f.p.locator('.kkg-dialog').evaluate(d=>d.open),true,'settings button opens dialog');
    assert.equal(await f.p.locator('[name="kkg-advertising"]').isChecked(),true,'dialog reflects accepted advertising consent');
    await f.p.locator('[name="kkg-advertising"]').uncheck();
    await f.p.locator('[data-kkg-save]').click();
    assert.equal(await f.p.locator('.kkg-dialog').evaluate(d=>d.open),false,'dialog closes after save');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'withdrawal removes click ID');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-token')),null,'withdrawal removes token');
    assert.equal(await f.p.evaluate(()=>JSON.parse(localStorage.getItem('kkg-consent')).advertising),false,'consent saved as rejected');
    await f.p.locator('[data-kkg-cta="final_cta"]').click();
    await f.p.waitForURL('https://wa.me/**');
    assert.equal(f.requests[0].consent.advertising,false,'post-withdrawal WA handoff excludes ads');
    assert.deepEqual(f.requests[0].click,{});
    await f.context.close();results.push({consentAcceptThenReject:'accept -> reopen -> reject clears click storage and keeps WA available'});
    f=await fixture({consentMode:'standalone'});
    await f.p.locator('[data-kkg-reject]').click();
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'initial reject keeps click storage empty');
    await f.p.reload();
    assert.equal(await f.p.locator('[data-kkg-banner]').isVisible(),false,'banner stays hidden after reload');
    assert.equal(await f.p.locator('[data-kkg-settings]').isVisible(),true,'settings button stays visible after reload');
    await f.p.locator('[data-kkg-cta="final_cta"]').focus();
    await f.p.keyboard.press('Tab');
    const focusedStyle=await f.p.evaluate(()=>{
      const el=document.activeElement;
      const cs=getComputedStyle(el);
      return {isSettings:el?.hasAttribute('data-kkg-settings')===true,outlineStyle:cs.outlineStyle,outlineWidth:parseFloat(cs.outlineWidth)||0};
    });
    assert.equal(focusedStyle.isSettings&&focusedStyle.outlineStyle!=='none'&&focusedStyle.outlineWidth>=2,true,'keyboard Tab reaches privacy settings with visible focus outline');
    await f.p.keyboard.press('Enter');
    assert.equal(await f.p.locator('.kkg-dialog').evaluate(d=>d.open),true,'Enter opens consent dialog');
    assert.equal(await f.p.locator('[name="kkg-advertising"]').isChecked(),false,'reopened dialog reflects prior reject');
    await f.p.keyboard.press('Escape');
    assert.equal(await f.p.locator('.kkg-dialog').evaluate(d=>d.open),false,'Escape closes consent dialog');
    assert.equal(await f.p.evaluate(()=>document.activeElement?.hasAttribute('data-kkg-settings')),true,'closing dialog returns focus to privacy control');
    await f.p.keyboard.press('Enter');
    await f.p.locator('[name="kkg-advertising"]').check();
    await f.p.locator('[data-kkg-save]').click();
    assert.notEqual(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'re-enabling consent captures click ID');
    await f.p.reload();
    assert.equal(await f.p.locator('[data-kkg-banner]').isVisible(),false,'banner stays hidden after change + reload');
    assert.equal(await f.p.evaluate(()=>JSON.parse(localStorage.getItem('kkg-consent')).advertising),true,'updated choice persists after reload');
    await f.p.locator('[data-kkg-settings]').click();
    assert.equal(await f.p.locator('[name="kkg-advertising"]').isChecked(),true,'dialog matches persisted choice after reload');
    await f.p.locator('[data-kkg-close-secondary]').click();
    await f.p.locator('[data-kkg-cta="final_cta"]').click();
    await f.p.waitForURL('https://wa.me/**');
    assert.equal(f.requests[0].click.gclid,'fixture-click-only','updated consent sends gclid after reload');
    await f.context.close();results.push({consentRejectThenReenableAndReload:'reject -> reload -> keyboard reopen -> change choice -> reload verified'});
    f=await fixture({consentMode:'external'});
    assert.equal(await f.p.locator('[data-kkg-banner]').isVisible(),false);
    assert.equal(await f.p.locator('[data-kkg-settings]').isVisible(),true,'external mode exposes settings button');
    await f.p.evaluate(()=>{window.__openConsentEvents=0;window.addEventListener('kkg:open-consent',()=>window.__openConsentEvents++);});
    await f.p.locator('[data-kkg-settings]').click();
    assert.equal(await f.p.evaluate(()=>window.__openConsentEvents),1,'external mode dispatches kkg:open-consent');
    assert.equal(await f.p.locator('[data-kkg-banner]').isVisible(),false,'no second banner opened in external mode');
    assert.equal(await f.p.locator('.kkg-dialog').evaluate(d=>d.open),false,'standalone dialog stays closed in external mode');
    const extStatus=await f.p.locator('[data-kkg-status]').innerText();
    assert.equal(extStatus.length>0&&!extStatus.toLowerCase().includes('dibuka'),true,'status notifies request dispatch without falsely claiming CMP opened');
    await f.p.evaluate(()=>window.KKConsent.set({advertising:true}));
    assert.notEqual(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null);
    await f.p.evaluate(()=>window.KKConsent.set({advertising:false}));
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null);
    await f.context.close();results.push({externalCMP:'no second banner; dispatches kkg:open-consent safely; withdrawal clears stored IDs'});
    assert.equal((await getModeHtml('disabled')).includes('cookiebot-bridge.js'),false,'disabled mode HTML omits cookiebot-bridge.js');
    assert.equal((await getModeHtml('standalone')).includes('cookiebot-bridge.js'),false,'standalone mode HTML omits cookiebot-bridge.js');
    assert.equal((await getModeHtml('external')).includes('cookiebot-bridge.js'),true,'external mode HTML loads cookiebot-bridge.js');
    function makeCookiebotStub({hasResponse=false,marketing=false,statistics=false,preferences=false,necessary=true,declined=false,omitRenew=false,persistCookie=false}={}){
      const cfg=JSON.stringify({hasResponse,marketing,statistics,preferences,necessary,declined,omitRenew,persistCookie});
      return `<script>(function(){var cfg=${cfg};function readCookie(){var m=document.cookie.match(/(?:^|; )CookieConsent=([^;]+)/);if(!m)return null;try{return JSON.parse(decodeURIComponent(m[1]));}catch(_){return null;}}var state=cfg.persistCookie&&readCookie()||cfg;function apply(s){window.Cookiebot={hasResponse:!!s.hasResponse,consented:!!s.hasResponse&&!s.declined,declined:!!s.declined,dialog:{visible:!s.hasResponse},consent:{necessary:s.necessary!==false,preferences:!!s.preferences,statistics:!!s.statistics,marketing:!!s.marketing}};if(!cfg.omitRenew){window.Cookiebot.renew=function(){window.__renewCalls=(window.__renewCalls||0)+1;window.Cookiebot.dialog.visible=true;window.dispatchEvent(new Event('CookiebotOnDialogDisplay'));};}window.Cookiebot.show=function(){window.__showCalls=(window.__showCalls||0)+1;window.Cookiebot.dialog.visible=true;window.dispatchEvent(new Event('CookiebotOnDialogDisplay'));};}apply(state);window.__mockCookiebotRespond=function(next){state=Object.assign({},state,next);if(cfg.persistCookie){document.cookie='CookieConsent='+encodeURIComponent(JSON.stringify(state))+'; path=/';}apply(state);window.Cookiebot.dialog.visible=false;window.dispatchEvent(new Event('CookiebotOnConsentReady'));window.dispatchEvent(new Event(state.declined?'CookiebotOnDecline':'CookiebotOnAccept'));window.dispatchEvent(new Event('CookiebotOnLoad'));};})();</script>`;
    }
    async function cookiebotFixture({headHtml='',query='?gclid=cb-click-123',viewport={width:1280,height:800},seedStaleStorage=false,seedCookies=null,abortCookiebot=false,asyncCookiebotBody=null}={}){
      const context=await browser.newContext({viewport});
      if(seedCookies)await context.addCookies(seedCookies);
      if(seedStaleStorage){
        await context.addInitScript(()=>{if(!sessionStorage.getItem('__kkgSeeded')){sessionStorage.setItem('__kkgSeeded','1');localStorage.setItem('kkg-click',JSON.stringify({click:{gclid:'stale-gclid'},expires:Date.now()+86400000}));localStorage.setItem('kkg-token',JSON.stringify({value:'a'.repeat(64),expires:Date.now()+86400000}));}});
      }
      const p=await context.newPage();
      const consoleErrors=[];const trackerRequests=[];const requests=[];
      p.on('pageerror',e=>errors.push(e.message));
      p.on('console',msg=>{if(msg.type()==='error'&&!(abortCookiebot&&msg.text().includes('ERR_FAILED')))consoleErrors.push(msg.text());});
      p.on('request',req=>{if(/googletagmanager\.com|google-analytics\.com|doubleclick\.net|connect\.facebook\.net|facebook\.com\/tr/i.test(req.url()))trackerRequests.push(req.url());});
      const baseHtml=await getModeHtml('external');
      const body=baseHtml.replace(/(["']?fallback["']?):(?:'[^']*'|"[^"]*")/,'$1:"https://wa.me/test-only"')
        .replace('<main id="kkg-main" tabindex="-1">','<main id="kkg-main" tabindex="-1"><a id="test-cta" data-kkg-cta="hero" href="https://wa.me/test-only">Test-only CTA</a>')
        .replace('</head>',headHtml+'</head>');
      await p.route('http://127.0.0.1:4173/**',(r)=>{const u=new URL(r.request().url());if(u.pathname==='/'){return r.fulfill({contentType:'text/html',body});}return r.continue();});
      if(abortCookiebot){await p.route('https://consent.cookiebot.com/uc.js',r=>r.abort('failed'));}
      else if(asyncCookiebotBody!==null){await p.route('https://consent.cookiebot.com/uc.js',async r=>{await new Promise(res=>setTimeout(res,80));await r.fulfill({status:200,contentType:'application/javascript',body:asyncCookiebotBody});});}
      await p.route('https://wa.me/**',r=>r.fulfill({contentType:'text/html',body:'<p>Intercepted test WA navigation.</p>'}));
      await p.route('**/api/handoff',async r=>{requests.push(r.request().postDataJSON());await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reference_code:'KK-GA260002',expires_at:new Date(Date.now()+86400000).toISOString(),wa_url:'https://wa.me/test-only?text=Kode%20Referensi%3A%20KK-GA260002'})});});
      await p.goto('http://127.0.0.1:4173/'+query);
      return {context,p,requests,consoleErrors,trackerRequests};
    }
    // 1 & 12. Initial load without response (even with marketing=true in stub) stays fail-closed, clears stale storage, hides sticky on Dialog, allows WA without IDs or trackers.
    f=await cookiebotFixture({headHtml:makeCookiebotStub({hasResponse:false,marketing:true,statistics:false,declined:false}),viewport:{width:375,height:700},seedStaleStorage:true});
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:false,advertising:false,analytics:false,version:'draft-1'},'unresponded Cookiebot stays fail-closed even if marketing=true');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-consent')),null,'external mode clears standalone kkg-consent');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'stale click ID wiped when unresponded');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-token')),null,'stale token wiped when unresponded');
    assert.equal(await f.p.locator('[data-kkg-banner]').isVisible(),false,'external mode hides standalone banner');
    await f.p.evaluate(()=>window.scrollTo(0,1100));await f.p.waitForTimeout(80);
    assert.equal(await f.p.locator('[data-kkg-sticky]').isVisible(),false,'mobile sticky hidden while Cookiebot dialog visible');
    await f.p.locator('#test-cta').click();await f.p.waitForURL('https://wa.me/**');
    assert.deepEqual(f.requests[0].click,{},'WA handoff before response sends empty click');
    assert.equal(f.requests[0].token,'','WA handoff before response sends empty token');
    assert.deepEqual(f.trackerRequests,[],'zero third-party tracker requests emitted');
    assert.deepEqual(f.consoleErrors,[],'zero console errors on unresponded Cookiebot');
    await f.context.close();
    // 2, 3, 4, 5, 6, 11, 13. Consent categories matrix, preferences/necessary isolation, withdraw cleanup without deleting external cookies, renew/show hooks, sticky visibility, WA handoff.
    f=await cookiebotFixture({
      headHtml:makeCookiebotStub({hasResponse:false,persistCookie:true}),viewport:{width:375,height:700},
      seedCookies:[{name:'CookieConsent',value:'{stamp:%27abc%27}',url:'http://127.0.0.1:4173'},{name:'woocommerce_items_in_cart',value:'1',url:'http://127.0.0.1:4173'}]
    });
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:false,statistics:true,preferences:true,necessary:true,declined:false}));
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:false,advertising:false,analytics:true,version:'draft-1'},'statistics/preferences/necessary only keeps advertising=false');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'statistics-only never stores gclid');
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:false,statistics:false,declined:true}));
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:false,advertising:false,analytics:false,version:'draft-1'},'deny clears both advertising and analytics');
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:true,statistics:false,declined:false}));
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:true,advertising:true,analytics:false,version:'draft-1'},'marketing-only grants advertising=true analytics=false');
    assert.equal(await f.p.evaluate(()=>JSON.parse(localStorage.getItem('kkg-click')).click.gclid),'cb-click-123','marketing-only stores gclid');
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:true,statistics:true,declined:false}));
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:true,advertising:true,analytics:true,version:'draft-1'},'allow-all grants both advertising and analytics');
    await f.p.evaluate(()=>window.scrollTo(0,1100));
    await f.p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
    await f.p.evaluate(()=>{document.querySelector('[data-kkg-settings]').click();});
    assert.equal(await f.p.evaluate(()=>window.__renewCalls),1,'privacy settings button invokes Cookiebot.renew()');
    await f.p.waitForFunction(()=>document.querySelector('[data-kkg-sticky]').hidden);
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:true,statistics:true,declined:false}));
    await f.p.locator('#test-cta').click();await f.p.waitForURL('https://wa.me/**');
    assert.equal(f.requests[0].click.gclid,'cb-click-123','WA handoff sends gclid when marketing consented');
    assert.match(f.requests[0].token,/^[a-f0-9]{64}$/,'WA handoff sends 64-hex token when marketing consented');
    assert.equal(f.p.url().includes('cb-click-123'),false,'WA URL excludes gclid');
    await f.p.goto('http://127.0.0.1:4173/?gclid=cb-withdraw');
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:true,statistics:true,declined:false}));
    assert.notEqual(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null);
    assert.notEqual(await f.p.evaluate(()=>localStorage.getItem('kkg-token')),null,'token populated before withdraw');
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:false,statistics:false,declined:true}));
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'withdraw removes kkg-click');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-token')),null,'withdraw removes kkg-token');
    const cookieStr=await f.p.evaluate(()=>document.cookie);
    assert.equal(cookieStr.includes('CookieConsent=')&&cookieStr.includes('woocommerce_items_in_cart=1'),true,'external CookieConsent and WooCommerce cookies preserved');
    assert.deepEqual(f.consoleErrors,[],'zero console errors across consent matrix');
    assert.deepEqual(f.trackerRequests,[],'zero third-party tracker requests in matrix');
    await f.context.close();
    // 11b. Cookiebot.show() fallback when renew() unavailable.
    f=await cookiebotFixture({headHtml:makeCookiebotStub({hasResponse:true,marketing:false,statistics:false,declined:true,omitRenew:true})});
    await f.p.locator('[data-kkg-settings]').click();
    assert.equal(await f.p.evaluate(()=>window.__showCalls),1,'falls back to Cookiebot.show() when renew() missing');
    await f.context.close();
    // 7 & 8. Reload persistence after Deny and after Allow All (without ?gclid= in URL).
    f=await cookiebotFixture({headHtml:makeCookiebotStub({hasResponse:false,persistCookie:true}),query:'?gclid=cb-reload-keep'});
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:false,statistics:false,declined:true}));
    await f.p.goto('http://127.0.0.1:4173/?gclid=cb-reload-deny');
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:false,advertising:false,analytics:false,version:'draft-1'},'reload after Deny stays declined even with ?gclid=');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'reload after Deny does not capture ?gclid=');
    await f.p.goto('http://127.0.0.1:4173/?gclid=cb-reload-keep');
    await f.p.evaluate(()=>window.__mockCookiebotRespond({hasResponse:true,marketing:true,statistics:true,declined:false}));
    assert.equal(await f.p.evaluate(()=>JSON.parse(localStorage.getItem('kkg-click')).click.gclid),'cb-reload-keep');
    await f.p.goto('http://127.0.0.1:4173/');
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:true,advertising:true,analytics:true,version:'draft-1'},'reload without ?gclid= restores consent');
    assert.equal(await f.p.evaluate(()=>JSON.parse(localStorage.getItem('kkg-click')).click.gclid),'cb-reload-keep','reload without ?gclid= preserves stored gclid');
    await f.p.locator('#test-cta').click();await f.p.waitForURL('https://wa.me/**');
    assert.equal(f.requests[0].click.gclid,'cb-reload-keep','WA CTA after clean reload uses preserved gclid');
    assert.match(f.requests[0].token,/^[a-f0-9]{64}$/,'WA CTA after clean reload issues 64-hex token');
    assert.deepEqual(f.consoleErrors,[]);
    await f.context.close();
    // 9. Async late-loaded Cookiebot script syncs cleanly on CookiebotOnConsentReady.
    f=await cookiebotFixture({
      headHtml:'<script id="Cookiebot" async src="https://consent.cookiebot.com/uc.js"></script>',
      query:'?gclid=cb-async-999',
      asyncCookiebotBody:'window.Cookiebot={hasResponse:true,consented:true,declined:false,dialog:{visible:false},consent:{necessary:true,preferences:true,statistics:true,marketing:true},renew:function(){}};window.dispatchEvent(new Event("CookiebotOnConsentReady"));'
    });
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:true,advertising:true,analytics:true,version:'draft-1'},'async Cookiebot synced on ready');
    assert.equal(await f.p.evaluate(()=>JSON.parse(localStorage.getItem('kkg-click')).click.gclid),'cb-async-999','async Cookiebot captured URL gclid');
    assert.deepEqual(f.consoleErrors,[]);
    await f.context.close();
    // 10. Blocked Cookiebot script fails closed safely without JS crash and keeps WA open.
    f=await cookiebotFixture({headHtml:'<script id="Cookiebot" async src="https://consent.cookiebot.com/uc.js"></script>',query:'?gclid=cb-blocked',seedStaleStorage:true,abortCookiebot:true});
    assert.deepEqual(await f.p.evaluate(()=>window.KKConsent.get()),{storage:false,advertising:false,analytics:false,version:'draft-1'},'blocked Cookiebot stays fail-closed');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-click')),null,'blocked Cookiebot wipes stale click ID');
    assert.equal(await f.p.evaluate(()=>localStorage.getItem('kkg-token')),null,'blocked Cookiebot wipes stale token');
    await f.p.locator('[data-kkg-settings]').click();
    const blockedStatus=await f.p.locator('[data-kkg-status]').innerText();
    assert.equal(blockedStatus.includes('Cookiebot')&&!blockedStatus.toLowerCase().includes('dibuka'),true,'blocked Cookiebot displays safe fallback message');
    await f.p.locator('#test-cta').click();await f.p.waitForURL('https://wa.me/**');
    assert.deepEqual(f.requests[0].click,{},'blocked Cookiebot WA handoff omits click ID');
    assert.equal(f.requests[0].token,'','blocked Cookiebot WA handoff omits token');
    assert.deepEqual(f.consoleErrors,[],'no unexpected JS errors when Cookiebot blocked');
    await f.context.close();
    results.push({cookiebotBridge:'15 scenarios verified: fail-closed default, granular categories, withdraw/reload persistence, async & blocked fallback, renew/show hooks, WooCommerce/external cookie safety, zero trackers & zero JS errors'});
    const landingJs=fs.readFileSync('wordpress/kk-grosir/assets/landing.js','utf8');
    assert.equal(/window\.addEventListener\(\s*['"]scroll['"]/.test(landingJs),false,'no ongoing window scroll listener in landing.js');
    for(const width of [320,375,390]){
      const ctx=await browser.newContext({viewport:{width,height:700}});
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto('http://127.0.0.1:4173/');
      assert.equal(await p.locator('[data-kkg-sticky]').isVisible(),false,'sticky hidden at top on '+width);
      await p.evaluate(()=>window.scrollTo(0,1100));
      await p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
      assert.equal(await p.locator('[data-kkg-sticky]').isVisible(),true,'sticky shows past Hero on '+width);
      const stickyMetrics=await p.locator('[data-kkg-sticky]').evaluate(bar=>{
        const meta=bar.querySelector('.kkg-sticky-meta');
        const btn=bar.querySelector('.kkg-button');
        const br=bar.getBoundingClientRect(), mr=meta.getBoundingClientRect(), btr=btn.getBoundingClientRect();
        return {barH:br.height,barW:br.width,metaW:mr.width,btnW:btr.width,btnH:btr.height,fontSize:parseFloat(getComputedStyle(btn).fontSize),overflowX:document.documentElement.scrollWidth>innerWidth,overlap:mr.right>btr.left};
      });
      assert.equal(stickyMetrics.overflowX,false,'no horizontal overflow with sticky bar on '+width);
      assert.equal(stickyMetrics.overlap,false,'sticky meta and CTA do not overlap on '+width);
      assert.equal(stickyMetrics.btnH>=44&&stickyMetrics.btnH<=50,true,'sticky CTA keeps >=44px tap target without bulky height on '+width+': '+stickyMetrics.btnH);
      assert.equal(stickyMetrics.metaW>=100&&stickyMetrics.btnW<stickyMetrics.barW*0.56,true,'sticky CTA balanced vs left copy on '+width+': meta='+stickyMetrics.metaW+' btn='+stickyMetrics.btnW);
      if(width>=375){assert.equal(stickyMetrics.fontSize>=13&&stickyMetrics.fontSize<=14,true,'sticky CTA font 13-14px on '+width+': '+stickyMetrics.fontSize);}
      if(width===375){await p.screenshot({path:'artifacts/screenshots/r02-sticky-375.png'});}
      await p.evaluate(()=>window.scrollTo(0,0));
      await p.waitForFunction(()=>document.querySelector('[data-kkg-sticky]').hidden);
      await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      await p.waitForFunction(()=>document.querySelector('[data-kkg-sticky]').hidden);
      await ctx.close();
    }
    {
      const ctx=await browser.newContext({viewport:{width:375,height:700}});
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto('http://127.0.0.1:4173/#produk');
      await p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
      await p.evaluate(()=>location.hash='#kkg-main');
      await p.waitForFunction(()=>document.querySelector('[data-kkg-sticky]').hidden);
      await p.evaluate(()=>window.scrollTo(0,1100));
      await p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
      await p.reload();
      await p.waitForFunction(()=>window.scrollY>300&&!document.querySelector('[data-kkg-sticky]').hidden);
      await p.setViewportSize({width:768,height:800});
      await p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
      await p.setViewportSize({width:820,height:800});
      assert.equal(await p.locator('[data-kkg-sticky]').isVisible(),false,'sticky hidden on tablet >=769px');
      await p.setViewportSize({width:1280,height:800});
      assert.equal(await p.locator('[data-kkg-sticky]').isVisible(),false,'sticky hidden on desktop');
      await p.setViewportSize({width:390,height:700});
      await p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
      await ctx.close();
    }
    {
      const ctx=await browser.newContext({viewport:{width:375,height:700},reducedMotion:'reduce'});
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto('http://127.0.0.1:4173/?consent=standalone');
      await p.evaluate(()=>window.scrollTo(0,1100));
      await p.waitForTimeout(80);
      assert.equal(await p.locator('[data-kkg-sticky]').isVisible(),false,'sticky hidden while banner open at 1100');
      await p.locator('[data-kkg-choices]').click();
      assert.equal(await p.locator('.kkg-dialog').evaluate(d=>d.open),true);
      await p.waitForFunction(()=>document.querySelector('[data-kkg-sticky]').hidden);
      await p.keyboard.press('Escape');
      await p.locator('[data-kkg-accept]').click();
      await p.waitForFunction(()=>!document.querySelector('[data-kkg-sticky]').hidden);
      await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      await p.waitForFunction(()=>document.querySelector('[data-kkg-sticky]').hidden);
      await p.locator('[data-kkg-settings]').click();
      assert.equal(await p.locator('.kkg-dialog').evaluate(d=>d.open),true);
      await p.waitForFunction(()=>document.querySelector('[data-kkg-sticky]').hidden);
      await p.keyboard.press('Escape');
      await ctx.close();
    }
    results.push({heroObserverSticky:'single IntersectionObserver verified across scroll up/down, anchor, mid-page reload, mobile/tablet/desktop resize, dialog/Final CTA guards, and reducedMotion'});
    assert.deepEqual(errors,[]);
    fs.writeFileSync('artifacts/browser-results.json',JSON.stringify({results,errors},null,2));
    console.log(JSON.stringify({checks:results.length,errors,screenshots:path.resolve('artifacts/screenshots')}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
