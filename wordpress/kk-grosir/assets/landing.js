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
    if (!stickyBar) return;
    const show = heroPassed && visibleGuards.size === 0 && banner.hidden && !dialog.open && !externalDialogOpen;
    stickyBar.hidden = !show;
    root.classList.toggle('kkg-has-sticky', show);
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
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    let pressedOutside = false;
    const outside = e => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    dialog.addEventListener('pointerdown', e => { pressedOutside = outside(e); });
    dialog.addEventListener('pointerup', e => { if (pressedOutside && outside(e)) dialog.close(); });
  }
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
        prevBtn.disabled = false;
        nextBtn.disabled = false;
      } else {
        prevBtn.disabled = idx <= 0;
        nextBtn.disabled = idx >= total - 1;
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

    function cancelPending() { pendingTarget = null; }

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
      if (mobileMq.matches) enableCarousel();
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
    if (typeof mobileMq.addEventListener === 'function') {
      mobileMq.addEventListener('change', syncCarouselMode);
    } else if (typeof mobileMq.addListener === 'function') {
      mobileMq.addListener(syncCarouselMode);
    }
    syncCarouselMode();
  }

  root.querySelectorAll('[data-kkg-carousel]').forEach(initCarousel);
})();
