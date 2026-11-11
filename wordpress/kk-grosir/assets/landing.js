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
    const show = heroPassed && visibleGuards.size === 0 && banner.hidden && !dialog.open;
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
      window.dispatchEvent(new CustomEvent('kkg:open-consent'));
      showStatus('Pengaturan privasi dibuka melalui penyedia cookie website.');
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
  if (cfg.consentMode === 'standalone') {
    const saved = read('kkg-consent');
    if (saved && saved.version === cfg.policyVersion && saved.expires > Date.now()) applyConsent(saved, false);
    else { remove('kkg-consent'); remove('kkg-click'); remove('kkg-token'); banner.hidden = false; }
  } else if (cfg.consentMode === 'disabled') {
    remove('kkg-click'); remove('kkg-token');
  }
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
    const updateHero = () => {
      const passed = heroCtaWrap.getBoundingClientRect().bottom <= 0;
      if (passed !== heroPassed) {
        heroPassed = passed;
        syncOverlays();
      }
    };
    const heroObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      heroPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      syncOverlays();
    }, { threshold: 0 });
    heroObserver.observe(heroCtaWrap);
    window.addEventListener('scroll', updateHero, { passive: true });
    updateHero();
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
})();
