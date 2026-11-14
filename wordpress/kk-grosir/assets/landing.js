/* No third-party tags. External CMP must call KKConsent.set after its own audit. */
(() => {
  'use strict';
  const cfg = window.KKG;
  const root = document.querySelector('.kkg-root');
  if (!cfg || !root) return;
  const banner = root.querySelector('[data-kkg-banner]');
  const dialog = root.querySelector('.kkg-dialog');
  const status = root.querySelector('[data-kkg-status]');
  const stickyBar = root.querySelector('[data-kkg-sticky]');
  const heroCtaWrap = root.querySelector('[data-kkg-hero-cta]');
  const endGuards = Array.from(root.querySelectorAll('[data-kkg-end-guard]'));
  const DAY = 86400000;
  let consent = { storage: false, advertising: false, analytics: false, version: cfg.policyVersion };
  let memoryToken = null;
  let pending = false;
  let toastTimer = null;
  let heroPassed = false;
  let externalDialogOpen = false;
  const visibleGuards = new Set();

  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
  function remove(key) { try { localStorage.removeItem(key); } catch (_) {} }
  function randomHex(bytes) {
    return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), n => n.toString(16).padStart(2, '0')).join('');
  }
  function showStatus(message, autoClear = true) {
    clearTimeout(toastTimer);
    status.textContent = message;
    status.hidden = !message;
    if (message && autoClear) {
      toastTimer = setTimeout(() => { status.hidden = true; status.textContent = ''; }, 4500);
    }
  }
  function syncOverlays() {
    root.classList.toggle('kkg-has-banner', !banner.hidden);
    const anyDialogOpen = Boolean(root.querySelector('dialog[open]'));
    if (!stickyBar) return;
    const show = heroPassed && visibleGuards.size === 0 && banner.hidden && !anyDialogOpen && !externalDialogOpen;
    stickyBar.hidden = !show;
    root.classList.toggle('kkg-has-sticky', show);
  }
  function attachClosedByFallback(modalEl) {
    if (!modalEl || ('closedBy' in HTMLDialogElement.prototype)) return;
    let pressedOutside = false;
    const outside = e => {
      const r = modalEl.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    modalEl.addEventListener('pointerdown', e => { pressedOutside = outside(e); });
    modalEl.addEventListener('pointerup', e => { if (pressedOutside && outside(e)) modalEl.close(); });
  }
  function applyConsent(value, persist) {
    consent = {
      storage: value.advertising === true, advertising: value.advertising === true,
      analytics: value.analytics === true, version: cfg.policyVersion,
    };
    if (!consent.advertising) { remove('kkg-click'); remove('kkg-token'); memoryToken = null; }
    if (persist) write('kkg-consent', { ...consent, expires: Date.now() + 180 * DAY });
    banner.hidden = true;
    if (dialog.open) dialog.close();
    syncOverlays();
    // Only forward consent to an audited integration. Do not create or load Google tags.
    window.dispatchEvent(new CustomEvent('kkg:consent', { detail: { ...consent } }));
    captureClick();
  }
  function captureClick() {
    if (!consent.advertising) return {};
    const params = new URLSearchParams(location.search);
    const current = {};
    for (const key of ['gclid', 'gbraid', 'wbraid']) {
      const value = params.get(key);
      if (value && /^[A-Za-z0-9_-]{1,512}$/.test(value)) current[key] = value;
    }
    if (Object.keys(current).length) {
      const old = read('kkg-click');
      // Re-reading the same URL must not extend the browser ID's 90-day lifetime.
      if (!old || old.expires <= Date.now() || JSON.stringify(old.click) !== JSON.stringify(current)) {
        write('kkg-click', { click: current, expires: Date.now() + 90 * DAY });
      }
    }
    const saved = read('kkg-click');
    if (saved && saved.expires > Date.now() && saved.click) return saved.click;
    remove('kkg-click');
    return Object.keys(current).length ? current : {};
  }
  function token() {
    if (!consent.storage) return '';
    let record = memoryToken || read('kkg-token');
    if (!record || record.expires <= Date.now() || !/^[a-f0-9]{64}$/.test(record.value)) {
      record = { value: randomHex(32), expires: Date.now() + DAY };
    }
    memoryToken = record;
    write('kkg-token', record);
    return record.value;
  }
  function openChoices() {
    if (cfg.consentMode === 'external') {
      showStatus('Permintaan membuka pengaturan privasi dikirim ke pengelola cookie situs.');
      window.dispatchEvent(new CustomEvent('kkg:open-consent'));
    } else if (cfg.consentMode === 'standalone') {
      dialog.querySelector('[name="kkg-advertising"]').checked = consent.advertising;
      dialog.querySelector('[name="kkg-analytics"]').checked = consent.analytics;
      dialog.showModal();
      syncOverlays();
    } else {
      showStatus('Tracking opsional belum diaktifkan.');
    }
  }
  window.KKConsent = Object.freeze({
    set(value) { if (cfg.consentMode === 'external') applyConsent(value || {}, false); },
    get() { return { ...consent }; },
  });
  const hasConsentUi = cfg.consentMode === 'standalone' || cfg.consentMode === 'external';
  const privacyRow = root.querySelector('[data-kkg-privacy-row]');
  root.querySelectorAll('[data-kkg-settings]').forEach(el => { el.hidden = !hasConsentUi; });
  if (privacyRow) privacyRow.hidden = !hasConsentUi && !privacyRow.querySelector('a');
  if (cfg.consentMode === 'standalone') {
    const saved = read('kkg-consent');
    if (saved && saved.version === cfg.policyVersion && saved.expires > Date.now()) applyConsent(saved, false);
    else { remove('kkg-consent'); remove('kkg-click'); remove('kkg-token'); banner.hidden = false; }
  } else if (cfg.consentMode === 'external') {
    remove('kkg-consent');
  } else if (cfg.consentMode === 'disabled') {
    remove('kkg-consent'); remove('kkg-click'); remove('kkg-token');
  }
  window.addEventListener('kkg:external-dialog', event => {
    externalDialogOpen = Boolean(event && event.detail && event.detail.open);
    syncOverlays();
  });
  syncOverlays();

  root.querySelectorAll('[data-kkg-settings],[data-kkg-choices]').forEach(el => el.addEventListener('click', openChoices));
  root.querySelector('[data-kkg-reject]').addEventListener('click', () => applyConsent({}, true));
  root.querySelector('[data-kkg-accept]').addEventListener('click', () => applyConsent({ advertising: true, analytics: true }, true));
  root.querySelector('[data-kkg-save]').addEventListener('click', () => applyConsent({
    advertising: dialog.querySelector('[name="kkg-advertising"]').checked,
    analytics: dialog.querySelector('[name="kkg-analytics"]').checked,
  }, true));
  root.querySelectorAll('[data-kkg-close],[data-kkg-close-secondary]').forEach(btn => btn.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', syncOverlays);
  attachClosedByFallback(dialog);
  if ('IntersectionObserver' in window && stickyBar && heroCtaWrap) {
    heroPassed = heroCtaWrap.getBoundingClientRect().bottom <= 0;
    syncOverlays();
    const heroObserver = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      const passed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      if (passed !== heroPassed) {
        heroPassed = passed;
        syncOverlays();
      }
    }, { threshold: 0 });
    heroObserver.observe(heroCtaWrap);
    if (endGuards.length) {
      const endObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) visibleGuards.add(entry.target);
          else visibleGuards.delete(entry.target);
        });
        syncOverlays();
      }, { threshold: 0 });
      endGuards.forEach(el => endObserver.observe(el));
    }
  }
  root.querySelectorAll('details').forEach(el => {
    const summary = el.querySelector('summary');
    summary.setAttribute('aria-expanded', String(el.open));
    el.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(el.open)));
  });
  root.querySelectorAll('[data-kkg-cta]').forEach(link => link.addEventListener('click', async event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!cfg.fallback) return;
    event.preventDefault();
    if (pending) return;
    pending = true;
    link.setAttribute('aria-busy', 'true');
    let url = cfg.fallback;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (cfg.nonce) headers['X-WP-Nonce'] = cfg.nonce;
      const response = await fetch(cfg.endpoint, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers,
        body: JSON.stringify({ request_id: randomHex(24), token: token(), cta_context: link.dataset.kkgCta,
          landing_path: '/grosir/', consent, click: captureClick() }),
      });
      if (!response.ok) throw new Error('handoff');
      const result = await response.json();
      const candidate = new URL(result.wa_url);
      const fallback = new URL(cfg.fallback);
      if (candidate.origin !== 'https://wa.me' || candidate.pathname !== fallback.pathname ||
          !/^KK-GA\d{2}(?!0000)\d{4}$/.test(result.reference_code)) throw new Error('invalid_response');
      url = candidate.href;
      const expires = Date.parse(result.expires_at);
      if (memoryToken && consent.storage && expires > Date.now() && expires <= Date.now() + DAY + 10000) {
        memoryToken.expires = expires; write('kkg-token', memoryToken);
      }
    } catch (_) {
      showStatus('Membuka WhatsApp tanpa kode referensi.', false);
    } finally {
      clearTimeout(timeout);
      link.removeAttribute('aria-busy');
      pending = false;
    }
    // Same-tab navigation works after async requests and is not subject to popup blocking.
    window.location.assign(url);
  }));

  const mobileMq = window.matchMedia('(max-width: 768px)');
  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsCssSibling = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
    CSS.supports('order', 'sibling-index()') && CSS.supports('order', 'sibling-count()');
  const supportsScrollEnd = 'onscrollend' in window;

  function initCarousel(carousel) {
    const track = carousel.querySelector('[data-kkg-carousel-track]');
    const controls = carousel.querySelector('[data-kkg-carousel-controls]');
    const prevBtn = carousel.querySelector('[data-kkg-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-kkg-carousel-next]');
    const markersNav = carousel.querySelector('[data-kkg-carousel-markers]');
    const statusEl = carousel.querySelector('[data-kkg-carousel-status]');
    const slides = track ? Array.from(track.querySelectorAll('[data-kkg-carousel-slide]')) : [];
    const total = slides.length;
    const alwaysActive = carousel.dataset.carouselScope === 'always';
    const supportsLoop = total >= 3 && supportsCssSibling;
    const earlyPark = total >= 4 ? 1 : 0;
    let active = false;
    let activeMarker = -1;
    let settledIndex = -1;
    let pendingTarget = null;
    let pendingDest = 0;
    let rafId = 0;
    let settleTimer = null;
    let unlockA = 0;
    let unlockB = 0;
    let markers = [];

    function clampOffset(slide) {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const raw = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
      return Math.min(max, Math.max(0, raw));
    }

    function nearestSlide() {
      const center = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let minDist = Infinity;
      for (let i = 0; i < total; i += 1) {
        const sCenter = slides[i].offsetLeft + slides[i].offsetWidth / 2;
        const d = Math.abs(sCenter - center);
        if (d < minDist) { minDist = d; best = i; }
      }
      return best;
    }

    function updateMarker(idx) {
      if (idx === activeMarker) return;
      activeMarker = idx;
      for (let i = 0; i < markers.length; i += 1) {
        if (i === idx) markers[i].setAttribute('aria-current', 'true');
        else markers[i].removeAttribute('aria-current');
      }
    }

    function applySettled(idx, announce) {
      if (!active || !slides[idx]) return;
      if (supportsLoop) {
        const parkLastLeft = idx <= earlyPark;
        const parkFirstRight = idx >= total - 1 - earlyPark;
        slides[0].inert = parkFirstRight;
        slides[total - 1].inert = parkLastLeft;
        const prevVar = track.style.getPropertyValue('--current');
        const nextVar = String(idx);
        if (prevVar !== nextVar) {
          cancelAnimationFrame(unlockA);
          cancelAnimationFrame(unlockB);
          const anchor = slides[idx];
          const beforeLeft = anchor.offsetLeft;
          track.style.scrollSnapType = 'none';
          track.style.overflowX = 'hidden';
          track.style.setProperty('--current', nextVar);
          const afterLeft = anchor.offsetLeft;
          const delta = afterLeft - beforeLeft;
          if (delta !== 0) track.scrollTo({ left: track.scrollLeft + delta, behavior: 'instant' });
          unlockA = requestAnimationFrame(() => {
            unlockB = requestAnimationFrame(() => {
              if (!active) return;
              track.style.overflowX = '';
              track.style.scrollSnapType = '';
            });
          });
        }
        if (prevBtn) prevBtn.disabled = false;
        if (nextBtn) nextBtn.disabled = false;
      } else {
        if (prevBtn) prevBtn.disabled = idx <= 0;
        if (nextBtn) nextBtn.disabled = idx >= total - 1;
      }
      updateMarker(idx);
      if (announce && idx !== settledIndex && statusEl) {
        statusEl.textContent = 'Slide ' + (idx + 1) + ' dari ' + total;
      }
      settledIndex = idx;
    }

    function onSettle() {
      if (!active) return;
      if (pendingTarget !== null && Math.abs(track.scrollLeft - pendingDest) > 12) return;
      pendingTarget = null;
      applySettled(nearestSlide(), true);
    }

    function goToSlide(idx) {
      if (!active || !total) return;
      if (!supportsLoop && (idx < 0 || idx >= total)) return;
      cancelAnimationFrame(unlockA);
      cancelAnimationFrame(unlockB);
      track.style.overflowX = '';
      track.style.scrollSnapType = '';
      const targetIdx = ((idx % total) + total) % total;
      if (!slides[targetIdx]) return;
      const dest = clampOffset(slides[targetIdx]);
      pendingTarget = targetIdx;
      pendingDest = dest;
      updateMarker(targetIdx);
      if (Math.abs(dest - track.scrollLeft) <= 1) {
        pendingTarget = null;
        applySettled(targetIdx, false);
        return;
      }
      track.scrollTo({ left: dest, behavior: reduceMq.matches ? 'auto' : 'smooth' });
    }

    function onScroll() {
      if (!active) return;
      if (pendingTarget === null && !rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          if (active && pendingTarget === null) updateMarker(nearestSlide());
        });
      }
      if (!supportsScrollEnd) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(onSettle, 120);
      }
    }

    function cancelPending() {
      pendingTarget = null;
    }

    function buildMarkers() {
      if (markers.length || !markersNav) return;
      slides.forEach((slide, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kkg-carousel-dot';
        btn.setAttribute('aria-label', slide.dataset.markerName || ('Pilih slide ' + (idx + 1)));
        btn.addEventListener('click', () => goToSlide(idx));
        markersNav.appendChild(btn);
        markers.push(btn);
      });
    }

    function enableCarousel() {
      if (active || !track || total < 2) return;
      active = true;
      buildMarkers();
      carousel.setAttribute('role', 'region');
      carousel.setAttribute('aria-roledescription', 'carousel');
      carousel.setAttribute('aria-label', carousel.dataset.carouselLabel || 'Galeri');
      track.setAttribute('tabindex', '0');
      track.setAttribute('role', 'group');
      track.setAttribute('aria-label', carousel.dataset.trackLabel || 'Daftar slide');
      slides.forEach(slide => {
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', 'slide');
        if (slide.dataset.slideLabel) slide.setAttribute('aria-label', slide.dataset.slideLabel);
      });
      if (controls) controls.hidden = false;
      if (markersNav) markersNav.hidden = false;
      activeMarker = -1;
      settledIndex = -1;
      pendingTarget = null;
      applySettled(0, false);
      track.scrollTo({ left: clampOffset(slides[0]), behavior: 'instant' });
      updateMarker(0);
      if (statusEl) statusEl.textContent = '';
    }

    function disableCarousel() {
      if (!active) return;
      active = false;
      pendingTarget = null;
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(unlockA);
      cancelAnimationFrame(unlockB);
      clearTimeout(settleTimer);
      rafId = 0;
      carousel.removeAttribute('role');
      carousel.removeAttribute('aria-roledescription');
      carousel.removeAttribute('aria-label');
      track.removeAttribute('tabindex');
      track.removeAttribute('role');
      track.removeAttribute('aria-label');
      track.style.removeProperty('--current');
      track.style.overflowX = '';
      track.style.scrollSnapType = '';
      slides.forEach(slide => {
        slide.inert = false;
        slide.removeAttribute('role');
        slide.removeAttribute('aria-roledescription');
        slide.removeAttribute('aria-label');
      });
      if (controls) controls.hidden = true;
      if (markersNav) markersNav.hidden = true;
      if (statusEl) statusEl.textContent = '';
    }

    function syncCarouselMode() {
      if (alwaysActive || mobileMq.matches) enableCarousel();
      else disableCarousel();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => {
      const base = pendingTarget !== null ? pendingTarget : nearestSlide();
      goToSlide(base - 1);
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const base = pendingTarget !== null ? pendingTarget : nearestSlide();
      goToSlide(base + 1);
    });
    if (track) {
      track.addEventListener('scroll', onScroll, { passive: true });
      if (supportsScrollEnd) track.addEventListener('scrollend', onSettle);
      track.addEventListener('pointerdown', cancelPending, { passive: true });
      track.addEventListener('touchstart', cancelPending, { passive: true });
      track.addEventListener('wheel', cancelPending, { passive: true });
    }
    if (alwaysActive) {
      carousel.addEventListener('keydown', e => {
        if (!active || total < 2 || root.querySelector('dialog[open]')) return;
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        e.preventDefault();
        const base = pendingTarget !== null ? pendingTarget : nearestSlide();
        goToSlide(e.key === 'ArrowRight' ? base + 1 : base - 1);
      });
    }
    if (!alwaysActive) {
      if (typeof mobileMq.addEventListener === 'function') {
        mobileMq.addEventListener('change', syncCarouselMode);
      } else if (typeof mobileMq.addListener === 'function') {
        mobileMq.addListener(syncCarouselMode);
      }
    }
    syncCarouselMode();
  }

  function initProofLightbox() {
    const lightbox = root.querySelector('[data-kkg-lightbox]');
    if (!lightbox) return;

    function readJson(selector) {
      const el = root.querySelector(selector);
      if (!el) return [];
      try {
        const parsed = JSON.parse(el.textContent || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }

    const proofItems = readJson('[data-kkg-proof-data]');
    const invoiceItems = readJson('[data-kkg-invoice-data]');
    if (!proofItems.length && !invoiceItems.length) return;

    const badgeEl = lightbox.querySelector('[data-kkg-lightbox-badge]');
    const nameEl = lightbox.querySelector('[data-kkg-lightbox-name]');
    const metaEl = lightbox.querySelector('[data-kkg-lightbox-meta]');
    const toolsEl = lightbox.querySelector('[data-kkg-lightbox-tools]');
    const counterEl = lightbox.querySelector('[data-kkg-lightbox-counter]');
    const zoomBtn = lightbox.querySelector('[data-kkg-lightbox-zoom]');
    const zoomLabelEl = lightbox.querySelector('[data-kkg-lightbox-zoom-label]');
    const figureEl = lightbox.querySelector('[data-kkg-lightbox-figure]');
    const prevImgBtn = lightbox.querySelector('[data-kkg-lightbox-prev]');
    const nextImgBtn = lightbox.querySelector('[data-kkg-lightbox-next]');
    const pagesEl = lightbox.querySelector('[data-kkg-lightbox-pages]');
    const closeBtn = lightbox.querySelector('[data-kkg-lightbox-close]');
    const dismissEl = lightbox.querySelector('[data-kkg-lightbox-dismiss]');

    let activeKind = null;
    let currentItem = null;
    let currentIdx = 0;
    let isZoomed = false;

    function setZoom(nextZoom) {
      isZoomed = !!nextZoom && activeKind === 'invoice';
      if (figureEl) {
        figureEl.classList.toggle('is-zoomed', isZoomed);
        if (!isZoomed) {
          figureEl.scrollTop = 0;
          figureEl.scrollLeft = 0;
        }
      }
      if (zoomBtn) zoomBtn.setAttribute('aria-pressed', isZoomed ? 'true' : 'false');
      if (zoomLabelEl) zoomLabelEl.textContent = isZoomed ? 'Ukuran Normal' : 'Perbesar Faktur';
    }

    function ensureImgEl(imgData) {
      if (!imgData || !figureEl) return;
      let imgEl = figureEl.querySelector('img');
      if (!imgEl) {
        imgEl = document.createElement('img');
        imgEl.className = 'kkg-lightbox-img';
        imgEl.decoding = 'async';
        figureEl.appendChild(imgEl);
      }
      imgEl.src = imgData.url || '';
      imgEl.alt = imgData.alt || '';
      if (imgData.width) imgEl.width = Number(imgData.width);
      else imgEl.removeAttribute('width');
      if (imgData.height) imgEl.height = Number(imgData.height);
      else imgEl.removeAttribute('height');
    }

    function renderPager(total, labelPrefix, selectedIdx, onSelect) {
      const multi = total > 1;
      if (prevImgBtn) prevImgBtn.hidden = !multi;
      if (nextImgBtn) nextImgBtn.hidden = !multi;
      if (!pagesEl) return;
      pagesEl.hidden = !multi;
      pagesEl.textContent = '';
      if (!multi) return;
      for (let i = 0; i < total; i += 1) {
        const pBtn = document.createElement('button');
        pBtn.type = 'button';
        pBtn.className = 'kkg-lightbox-page-btn';
        pBtn.textContent = labelPrefix + ' ' + (i + 1);
        if (i === selectedIdx) pBtn.setAttribute('aria-current', 'true');
        pBtn.addEventListener('click', () => onSelect(i));
        pagesEl.appendChild(pBtn);
      }
    }

    function renderProofImage() {
      const images = currentItem && Array.isArray(currentItem.images) ? currentItem.images : [];
      const imgData = images[currentIdx];
      if (!imgData) return;
      ensureImgEl(imgData);
      renderPager(images.length, 'Halaman', currentIdx, idx => {
        currentIdx = idx;
        renderProofImage();
      });
    }

    function renderInvoiceItem() {
      const inv = invoiceItems[currentIdx];
      if (!inv) return;
      if (nameEl) nameEl.textContent = inv.title || 'Dokumentasi Transaksi Grosir';
      if (metaEl) metaEl.textContent = (inv.date_label ? 'Tanggal: ' + inv.date_label + ' · ' : '') + (inv.category || '');
      if (counterEl) {
        counterEl.hidden = invoiceItems.length < 2;
        counterEl.textContent = 'Faktur ' + (currentIdx + 1) + ' dari ' + invoiceItems.length;
      }
      setZoom(false);
      ensureImgEl(inv);
      renderPager(invoiceItems.length, 'Faktur', currentIdx, idx => {
        currentIdx = idx;
        renderInvoiceItem();
      });
    }

    function showDialog() {
      if (typeof lightbox.showModal === 'function') lightbox.showModal();
      else lightbox.setAttribute('open', '');
      syncOverlays();
    }

    function openProofModal(idx) {
      const item = proofItems[idx];
      if (!item || !Array.isArray(item.images) || !item.images.length) return;
      activeKind = 'testimonial';
      currentItem = item;
      currentIdx = 0;
      lightbox.classList.remove('kkg-lightbox--wide');
      if (badgeEl) badgeEl.textContent = 'Bukti Chat WhatsApp Asli';
      if (nameEl) nameEl.textContent = item.name || '';
      if (metaEl) metaEl.textContent = item.order_highlight || item.category || '';
      if (toolsEl) toolsEl.hidden = true;
      if (closeBtn) closeBtn.setAttribute('aria-label', 'Tutup tampilan bukti chat');
      if (prevImgBtn) prevImgBtn.setAttribute('aria-label', 'Foto bukti chat sebelumnya');
      if (nextImgBtn) nextImgBtn.setAttribute('aria-label', 'Foto bukti chat berikutnya');
      if (dismissEl) dismissEl.textContent = 'Tutup Bukti Chat';
      setZoom(false);
      renderProofImage();
      showDialog();
    }

    function openInvoiceModal(idx) {
      if (!invoiceItems[idx]) return;
      activeKind = 'invoice';
      currentItem = null;
      currentIdx = idx;
      lightbox.classList.add('kkg-lightbox--wide');
      if (badgeEl) badgeEl.textContent = 'Bukti Transaksi Grosir Nyata';
      if (toolsEl) toolsEl.hidden = false;
      if (closeBtn) closeBtn.setAttribute('aria-label', 'Tutup detail faktur');
      if (prevImgBtn) prevImgBtn.setAttribute('aria-label', 'Faktur sebelumnya');
      if (nextImgBtn) nextImgBtn.setAttribute('aria-label', 'Faktur berikutnya');
      if (dismissEl) dismissEl.textContent = 'Tutup Detail Faktur';
      renderInvoiceItem();
      showDialog();
    }

    function stepLightbox(delta) {
      if (activeKind === 'invoice') {
        if (invoiceItems.length < 2) return;
        currentIdx = (currentIdx + delta + invoiceItems.length) % invoiceItems.length;
        renderInvoiceItem();
        return;
      }
      if (activeKind === 'testimonial') {
        const totalImgs = currentItem && currentItem.images ? currentItem.images.length : 0;
        if (totalImgs < 2) return;
        currentIdx = (currentIdx + delta + totalImgs) % totalImgs;
        renderProofImage();
      }
    }

    root.querySelectorAll('[data-kkg-lightbox-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.proofIndex);
        if (!Number.isNaN(idx)) openProofModal(idx);
      });
    });

    root.querySelectorAll('[data-kkg-invoice-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.invoiceIndex);
        if (!Number.isNaN(idx)) openInvoiceModal(idx);
      });
    });

    if (zoomBtn) zoomBtn.addEventListener('click', () => setZoom(!isZoomed));
    if (figureEl) figureEl.addEventListener('click', () => {
      if (activeKind === 'invoice') setZoom(!isZoomed);
    });

    attachClosedByFallback(lightbox);
    if (closeBtn) closeBtn.addEventListener('click', () => lightbox.close());
    if (prevImgBtn) prevImgBtn.addEventListener('click', () => stepLightbox(-1));
    if (nextImgBtn) nextImgBtn.addEventListener('click', () => stepLightbox(1));
    lightbox.addEventListener('keydown', e => {
      if (!lightbox.open) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
    });
    lightbox.addEventListener('close', () => {
      activeKind = null;
      currentItem = null;
      setZoom(false);
      lightbox.returnValue = '';
      syncOverlays();
    });
  }

  root.querySelectorAll('[data-kkg-carousel]').forEach(initCarousel);
  initProofLightbox();
})();
