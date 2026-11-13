/* Official Cookiebot SDK adapter for KKConsent. Loaded only on /grosir/ when consent_mode = external. */
(() => {
  'use strict';
  const cfg = window.KKG;
  const api = window.KKConsent;
  if (!cfg || cfg.consentMode !== 'external' || !api) return;

  let syncedOnce = false;
  let externalDialogOpen = false;

  function readState() {
    const cb = window.Cookiebot;
    if (!cb || typeof cb !== 'object' || !cb.consent || typeof cb.consent !== 'object') return null;
    if (cb.hasResponse !== true) return { advertising: false, analytics: false };
    return {
      advertising: cb.consent.marketing === true && cb.declined !== true,
      analytics: cb.consent.statistics === true && cb.declined !== true,
    };
  }

  function notifyDialog(open) {
    if (externalDialogOpen === open) return;
    externalDialogOpen = open;
    window.dispatchEvent(new CustomEvent('kkg:external-dialog', { detail: { open } }));
  }

  function applyState(state) {
    const next = {
      advertising: Boolean(state && state.advertising),
      analytics: Boolean(state && state.analytics),
    };
    const cur = api.get();
    if (syncedOnce && cur && cur.advertising === next.advertising && cur.analytics === next.analytics) return;
    syncedOnce = true;
    api.set(next);
  }

  function sync() {
    const state = readState();
    if (!state) return;
    if (window.Cookiebot && window.Cookiebot.hasResponse === true) notifyDialog(false);
    applyState(state);
  }

  function failClosed() {
    notifyDialog(false);
    applyState({ advertising: false, analytics: false });
  }

  function showFallback(message) {
    const status = document.querySelector('.kkg-root [data-kkg-status]');
    if (!status) return;
    status.textContent = message;
    status.hidden = false;
  }

  window.addEventListener('CookiebotOnDialogDisplay', () => notifyDialog(true));
  for (const eventName of ['CookiebotOnConsentReady', 'CookiebotOnAccept', 'CookiebotOnDecline', 'CookiebotOnLoad']) {
    window.addEventListener(eventName, sync);
  }

  window.addEventListener('kkg:open-consent', () => {
    const cb = window.Cookiebot;
    try {
      if (cb && typeof cb.renew === 'function') { cb.renew(); return; }
      if (cb && typeof cb.show === 'function') { cb.show(); return; }
    } catch (_) {}
    failClosed();
    showFallback('Pengelola cookie (Cookiebot) tidak tersedia atau sedang diblokir; tracking opsional tetap nonaktif.');
  });

  const cbScript = document.querySelector('script#Cookiebot, script[src*="cookiebot.com"]');
  if (cbScript) cbScript.addEventListener('error', failClosed);

  const initial = readState();
  if (initial) {
    if (window.Cookiebot && window.Cookiebot.dialog && window.Cookiebot.dialog.visible === true) {
      notifyDialog(true);
    }
    applyState(initial);
  } else if (document.readyState === 'complete') {
    failClosed();
  } else {
    window.addEventListener('load', () => {
      if (!readState()) failClosed();
    }, { once: true });
  }
})();

