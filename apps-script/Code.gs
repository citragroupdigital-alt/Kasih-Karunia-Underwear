/**
 * KK Underwear v1. Copy into a bound native Google Sheets Apps Script project.
 * Properties: KK_SYNC_API_URL, KK_SYNC_API_SECRET, KK_SPREADSHEET_ID,
 * KK_LAST_CHANGE_ID (initial 0), KK_IMPORT_RULES_VERIFIED (initial false).
 * No Google Ads upload or messaging. CS owns Closing A:G,J:K.
 */
var KK = Object.freeze({
  tabs: ['Upload', 'Closing', 'Klik WA', 'Panduan', 'Ringkasan', 'Pengaturan'],
  timezone: 'Asia/Jakarta', pageLimit: 100, syncMaxPages: 25, syncFetchMaxMs: 120000, maxMs: 240000,
  handler: 'syncWaLeadsToSheet', editHandler: 'kkOnEdit',
});

function kkConfig_() {
  var p = PropertiesService.getScriptProperties();
  var url = (p.getProperty('KK_SYNC_API_URL') || '').trim().replace(/\/$/, '');
  var secret = p.getProperty('KK_SYNC_API_SECRET') || '';
  var id = p.getProperty('KK_SPREADSHEET_ID') || '';
  var cursor = Number(p.getProperty('KK_LAST_CHANGE_ID') || 0);
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?\/(?:[a-z0-9_-]+\/)*wp-json\/kk-offline\/v1\/handoffs$/i.test(url)) throw Error('URL API HTTPS tidak valid.');
  if (secret.length < 32 || !id || !Number.isSafeInteger(cursor) || cursor < 0) throw Error('Script Properties belum lengkap.');
  return { url: url, secret: secret, id: id, cursor: cursor, verified: p.getProperty('KK_IMPORT_RULES_VERIFIED') === 'true' };
}
function kkBook_(cfg) {
  var ss = SpreadsheetApp.openById(cfg.id);
  var names = ss.getSheets().map(function(s) { return s.getName(); });
  if (JSON.stringify(names) !== JSON.stringify(KK.tabs)) throw Error('Enam nama/urutan tab harus sesuai template.');
  if (ss.getSpreadsheetTimeZone() !== KK.timezone) throw Error('Timezone harus Asia/Jakarta.');
  var h = ss.getSheetByName('Klik WA').getRange('A1:H1').getDisplayValues()[0];
  if (h[0] !== 'Kode Ref' || h[7] !== '(bantu) Lead ID') throw Error('Header Klik WA tidak sesuai.');
  return ss;
}
function kkSafe_(value) {
  var text = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
function kkRef_(value) { return /^KK-GA\d{2}(?!0000)\d{4}$/.test(value); }
function kkUtc_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)) throw Error('Timestamp harus ISO UTC.');
  var date = new Date(value);
  if (isNaN(date.getTime()) || date.toISOString().replace('.000Z', 'Z') !== value) throw Error('Timestamp tidak valid.');
  return date;
}
function kkFetch_(cfg, url, body) {
  var options = { method: body ? 'post' : 'get', headers: { Authorization: 'Bearer ' + cfg.secret, Accept: 'application/json' },
    followRedirects: false, muteHttpExceptions: true, validateHttpsCertificates: true };
  if (body) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
  var res = UrlFetchApp.fetch(url, options);
  if (res.getResponseCode() !== 200) throw Error('API HTTP ' + res.getResponseCode() + '; periksa konfigurasi/cursor.');
  var data;
  try { data = JSON.parse(res.getContentText()); } catch (_) { throw Error('Respons bukan JSON.'); }
  if (!data || data.success !== true || !Array.isArray(data.data)) throw Error('Kontrak respons tidak sesuai.');
  return data;
}
function kkCapacity_(sheet, last) {
  var max = sheet.getMaxRows();
  if (last > max) {
    sheet.insertRowsAfter(max, last - max);
    sheet.getRange(Math.min(2, max), 1, 1, sheet.getMaxColumns())
      .copyTo(sheet.getRange(max + 1, 1, last - max, sheet.getMaxColumns()), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  }
}
function kkValidateBatch_(response, cursor) {
  if (typeof response.has_more !== 'boolean' || !Number.isSafeInteger(response.last_change_id)) throw Error('Cursor respons invalid.');
  var max = cursor;
  var rows = response.data.map(function(item) {
    if (!Number.isSafeInteger(item.change_id) || item.change_id <= max || !Number.isSafeInteger(item.id) || item.id < 1 ||
        !kkRef_(item.reference_code) || item.landing_page !== '/grosir/' ||
        !['header','hero','category','sticky','final_cta','footer'].includes(item.wa_context)) throw Error('Record sync invalid.');
    max = item.change_id;
    var ids = ['gclid','gbraid','wbraid'].map(function(k) {
      var v = item[k] || '';
      if (typeof v !== 'string' || (v && !/^[A-Za-z0-9_-]{1,512}$/.test(v))) throw Error('Click ID invalid.');
      return kkSafe_(v);
    });
    return [item.reference_code, ids[0], ids[1], ids[2], kkUtc_(item.created_at), item.landing_page, 'Konteks: ' + item.wa_context, item.id];
  });
  if (max !== response.last_change_id || (!rows.length && response.has_more)) throw Error('Cursor tidak konsisten.');
  return rows;
}
function kkUpsertPlan_(existing, changes) {
  var rows = existing.map(function(r) { return r.slice(); });
  var index = Object.create(null), codes = Object.create(null);
  rows.forEach(function(r, i) {
    if (r[7] === '') return;
    var id = String(r[7]);
    if (index[id] !== undefined || codes[r[0]] !== undefined) throw Error('Registry duplikat di Klik WA; perbaiki sebelum sync.');
    index[id] = i; codes[r[0]] = id;
  });
  changes.forEach(function(row) {
    var id = String(row[7]);
    if (codes[row[0]] !== undefined && codes[row[0]] !== id) throw Error('Reference Code berubah identitas.');
    if (index[id] !== undefined) {
      if (rows[index[id]][0] !== row[0]) throw Error('ID registry berubah kode.');
      rows[index[id]] = row;
    } else { index[id] = rows.length; rows.push(row); }
    codes[row[0]] = id;
  });
  return rows;
}
function kkSync_(ss, cfg, started) {
  var sheet = ss.getSheetByName('Klik WA'), props = PropertiesService.getScriptProperties(), cursor = cfg.cursor;
  var existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues().filter(function(r) { return r[7] !== ''; }) : [];
  var changes = [];
  for (var page = 0; page < KK.syncMaxPages && Date.now() - started < KK.syncFetchMaxMs; page++) {
    var res = kkFetch_(cfg, cfg.url + '?after_change_id=' + cursor + '&limit=' + KK.pageLimit);
    var batch = kkValidateBatch_(res, cursor);
    if (!batch.length) break;
    Array.prototype.push.apply(changes, batch);
    cursor = res.last_change_id;
    if (!res.has_more) break;
  }
  if (!changes.length) return;
  existing = kkUpsertPlan_(existing, changes);
  kkCapacity_(sheet, existing.length + 1);
  sheet.getRange(2, 1, existing.length, 4).setNumberFormat('@');
  sheet.getRange(2, 6, existing.length, 2).setNumberFormat('@');
  sheet.getRange(2, 5, existing.length, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(2, 1, existing.length, 8).setValues(existing);
  SpreadsheetApp.flush();
  props.setProperty('KK_LAST_CHANGE_ID', String(cursor));
}
function kkOrderKey_(value) { return String(value == null ? '' : value).trim().toUpperCase(); }
function kkPaidAt_(date, time) {
  if (!(date instanceof Date) || isNaN(date.getTime()) || Utilities.formatDate(date, KK.timezone, 'HH:mm:ss') !== '00:00:00') throw Error('Tanggal bayar invalid.');
  var clock;
  if (time instanceof Date && !isNaN(time.getTime())) clock = Utilities.formatDate(time, KK.timezone, 'HH:mm:ss');
  else if (typeof time === 'number' && isFinite(time) && time >= 0 && time < 1) {
    var sec = Math.min(86399, Math.round(time * 86400));
    clock = [Math.floor(sec / 3600), Math.floor(sec % 3600 / 60), sec % 60].map(function(n) { return String(n).padStart(2, '0'); }).join(':');
  } else throw Error('Jam bayar invalid.');
  return new Date(Utilities.formatDate(date, KK.timezone, 'yyyy-MM-dd') + 'T' + clock + '+07:00');
}
function kkBusiness_(row, counts, now) {
  var key = kkOrderKey_(row[9]);
  var hasInput = [0,1,2,3,4,5,6,9,10].some(function(i) { return row[i] !== '' && row[i] != null; });
  if (!hasInput) return { empty: true, valid: false, reason: '' };
  var reason = '';
  if (/^CONTOH/i.test(String(row[6]).trim())) reason = 'Baris contoh';
  else if (kkOrderKey_(row[10]) !== 'LUNAS') reason = 'Pembayaran belum LUNAS';
  else if (!key || key.length > 64) reason = 'Order ID wajib, maksimal 64 karakter';
  else if (counts[key] !== 1) reason = 'Order ID duplikat';
  else if (typeof row[3] !== 'number' || !isFinite(row[3]) || row[3] <= 0) reason = 'Nilai Purchase harus positif';
  var paid;
  if (!reason) {
    try { paid = kkPaidAt_(row[1], row[2]); } catch (_) { reason = 'Tanggal/jam pembayaran invalid'; }
    if (paid && (paid.getTime() > now || paid.getTime() < 0)) reason = 'Waktu pembayaran invalid/masa depan';
  }
  return { empty: false, valid: !reason, reason: reason, key: key, duplicate: Boolean(key && counts[key] > 1), paid: paid, reference: kkOrderKey_(row[0]) };
}
function kkAttribution_(business, match, settings, now) {
  if (!business.valid) return { reason: business.reason, tracking: '', match: null };
  if (!business.reference) return { reason: 'Tanpa kode referensi', tracking: 'Tanpa kode' };
  if (!kkRef_(business.reference)) return { reason: 'Kode referensi invalid', tracking: 'Kode invalid' };
  if (!match) return { reason: 'Rekonsiliasi belum selesai', tracking: 'Belum diperiksa' };
  if (match.status === 'not_found') return { reason: 'Kode tidak ditemukan/retensi berakhir', tracking: 'Kode tidak ditemukan' };
  if (match.status === 'no_eligible_click') return { reason: 'Tidak ada klik iklan sebelum pembayaran', tracking: 'Non-iklan' };
  if (match.status !== 'matched') throw Error('Status lookup invalid.');
  var observed = kkUtc_(match.click_observed_at);
  if (observed > business.paid || observed.getTime() > now ||
      !['gclid','gbraid','wbraid'].some(function(k) { return typeof match[k] === 'string' && /^[A-Za-z0-9_-]{1,512}$/.test(match[k]); })) throw Error('Kronologi/Click ID lookup invalid.');
  ['gclid','gbraid','wbraid'].forEach(function(k) { if (match[k] && !/^[A-Za-z0-9_-]{1,512}$/.test(match[k])) throw Error('Click ID lookup invalid.'); });
  var reason = '';
  if (!settings.verified || !(settings.windowDays > 0) || !(settings.ageDays > 0)) reason = 'Aturan impor belum diverifikasi';
  else if (business.paid - observed > settings.windowDays * 86400000) reason = 'Di luar conversion window';
  else if (now - observed > settings.ageDays * 86400000) reason = 'Click ID melewati usia impor';
  return { reason: reason, tracking: 'Terlacak', match: match, observed: observed };
}
function kkLiteral_(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
function kkSerial_(date) { return (date.getTime() + 7 * 3600000) / 86400000 + 25569; }
function kkSnapshotGuard_(row, n) {
  return [0,1,2,3,5,6,9,10].map(function(i) {
    var v = row[i], col = String.fromCharCode(65 + i);
    if (v instanceof Date) {
      var serial = kkSerial_(v);
      // Sheets dates use an 1899 epoch; time-only cells may be represented as Date.
      if (i === 2) {
        var clock = Utilities.formatDate(v, KK.timezone, 'HH:mm:ss').split(':').map(Number);
        serial = (clock[0] * 3600 + clock[1] * 60 + clock[2]) / 86400;
      }
      return 'ABS(N(Closing!' + col + n + ')-' + serial + ')<0.00000002';
    }
    return 'Closing!' + col + n + '=' + (typeof v === 'number' ? v : kkLiteral_(v));
  }).join(',');
}
function kkUploadRow_(row, n, business, attr, settings, runStamp) {
  if (business.empty) return Array(16).fill('');
  var match = attr.match || {}, observed = attr.observed || '';
  var fingerprint = kkSnapshotGuard_(row, n);
  var expectedDup = business.duplicate ? '"Order ID duplikat"' : '""';
  var duplicateCheck = ',ISFORMULA(Closing!I' + n + '),NOT(ISERROR(Closing!I' + n + ')),Closing!I' + n + '=' + expectedDup;
  var checks = fingerprint + duplicateCheck + ',Pengaturan!B2=' + kkLiteral_(settings.name) +
    ',Pengaturan!B3=' + kkLiteral_(settings.currency) + ',Pengaturan!B7=' + Number(settings.ageDays || 0) +
    ',Pengaturan!B8=' + Number(settings.windowDays || 0);
  var reason = '=IF(IFERROR(AND(' + checks + '),FALSE),' + kkLiteral_(attr.reason || '') + ',"Data berubah; rekonsiliasi ulang")';
  // Expire readiness after a day even if a scheduled job fails or a Property changes.
  var ready = '=IF(IFERROR(AND(B' + n + '="",ISNUMBER(M' + n + '),N' + n + '>=M' + n +
    ',N' + n + '-M' + n + '<=Pengaturan!B8,NOW()-M' + n + '<=Pengaturan!B7,NOW()<=' + (kkSerial_(new Date(runStamp)) + 1) + '),FALSE),"Ya","Tidak")';
  return [ready, reason, kkSafe_(match.gclid), kkSafe_(match.gbraid), kkSafe_(match.wbraid), kkSafe_(settings.name),
    business.paid ? Utilities.formatDate(business.paid, KK.timezone, "yyyy-MM-dd'T'HH:mm:ss") + '+07:00' : '',
    business.valid ? row[3] : '', kkSafe_(settings.currency), kkSafe_(business.key), kkSafe_(row[5]),
    '', observed, business.paid || '', business.duplicate ? 'Order ID duplikat' : '',
    '=UPPER(TRIM(Closing!J' + n + '&""))'];
}
function kkReconcile_(ss, cfg, started) {
  var closing = ss.getSheetByName('Closing'), upload = ss.getSheetByName('Upload');
  var raw = closing.getRange(2, 1, Math.max(1, closing.getLastRow() - 1), 12).getValues();
  while (raw.length && ![0,1,2,3,4,5,6,9,10].some(function(i) { return raw[raw.length - 1][i] !== ''; })) raw.pop();
  var oldRows = Math.max(1, upload.getLastRow() - 1, raw.length);
  kkCapacity_(upload, oldRows + 1);
  // Fail closed before any remote request. Clearing derived output never touches CS input.
  upload.getRange(2, 1, oldRows, 16).clearContent();
  if (!raw.length) return;
  upload.getRange(2, 1, raw.length, 2).setValues(raw.map(function() { return ['Tidak', 'Rekonsiliasi sedang berjalan/belum selesai']; }));
  SpreadsheetApp.flush();
  var counts = Object.create(null);
  raw.forEach(function(r) { var k = kkOrderKey_(r[9]); if (k) counts[k] = (counts[k] || 0) + 1; });
  var now = Date.now();
  var business = raw.map(function(r) { return kkBusiness_(r, counts, now); });
  var requests = [];
  business.forEach(function(b, i) {
    if (b.valid && kkRef_(b.reference)) requests.push({ key: i + 2, reference_code: b.reference, paid_at: b.paid.toISOString().replace('.000Z','Z') });
  });
  var matches = Object.create(null);
  for (var offset = 0; offset < requests.length; offset += 100) {
    if (Date.now() - started > KK.maxMs) throw Error('Waktu rekonsiliasi habis; output tetap diblokir.');
    var batch = requests.slice(offset, offset + 100);
    var response = kkFetch_(cfg, cfg.url.replace(/\/handoffs$/, '/reconcile'), { purchases: batch });
    if (response.data.length !== batch.length) throw Error('Jumlah lookup tidak sesuai.');
    response.data.forEach(function(m) {
      if (!batch.some(function(p) { return p.key === m.key; }) || matches[m.key]) throw Error('Kunci lookup invalid/duplikat.');
      matches[m.key] = m;
    });
  }
  // Refuse results if CS changed any source cell while API calls were in flight.
  var latest = closing.getRange(2, 1, raw.length, 12).getValues();
  if (JSON.stringify(latest.map(kkCsInput_)) !== JSON.stringify(raw.map(kkCsInput_))) throw Error('Closing berubah saat rekonsiliasi; jalankan ulang.');
  var settingsSheet = ss.getSheetByName('Pengaturan');
  var values = settingsSheet.getRange('B2:B8').getValues().map(function(r) { return r[0]; });
  var settings = { name: String(values[0]), currency: String(values[1]), ageDays: Number(values[5]), windowDays: Number(values[6]), verified: cfg.verified };
  if (!settings.name || settings.currency !== 'IDR' || values[2] !== '+07:00') throw Error('Pengaturan nama/IDR/WIB tidak sesuai.');
  var attrs = business.map(function(b, i) { return kkAttribution_(b, matches[i + 2], settings, now); });
  var klik = ss.getSheetByName('Klik WA');
  var registryRows = Object.create(null);
  if (klik.getLastRow() > 1) klik.getRange(2, 8, klik.getLastRow() - 1, 1).getValues().forEach(function(r, i) {
    if (r[0] !== '') registryRows[String(r[0])] = i + 2;
  });
  var output = raw.map(function(r, i) {
    var out = kkUploadRow_(r, i + 2, business[i], attrs[i], settings, now);
    if (attrs[i].match) out[11] = registryRows[String(attrs[i].match.reference_id)] || '';
    return out;
  });
  closing.getRange(2, 8, raw.length, 2).setValues(business.map(function(b, i) {
    var n = i + 2, guard = kkSnapshotGuard_(raw[i], n);
    return [b.empty ? '' : '=IF(AND(' + guard + '),' + kkLiteral_(attrs[i].tracking) + ',"Belum diperiksa")',
      b.empty ? '' : '=IF(AND(TRIM(J' + n + ')<>"",ARRAYFORMULA(SUMPRODUCT(--(UPPER(TRIM(J$2:J))=UPPER(TRIM(J' + n + ')))))>1),"Order ID duplikat","")'];
  }));
  closing.getRange(2, 12, raw.length, 1).setValues(business.map(function(b, i) {
    var n = i + 2;
    return [b.empty ? '' : '=IF(IFERROR(AND(' + kkSnapshotGuard_(raw[i], n) + ',ISFORMULA(I' + n + '),NOT(ISERROR(I' + n + ')),I' + n + '=""),FALSE),' +
      kkLiteral_(b.valid ? 'Valid' : 'Belum lengkap') + ',"Belum lengkap")'];
  }));
  SpreadsheetApp.flush();
  upload.getRange(2, 3, raw.length, 5).setNumberFormat('@');
  upload.getRange(2, 9, raw.length, 3).setNumberFormat('@');
  upload.getRange(2, 13, raw.length, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  upload.getRange(2, 1, raw.length, 16).setValues(output);
  SpreadsheetApp.flush();
}
function kkCsInput_(r) { return [r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[9],r[10]]; }
function syncWaLeadsToSheet() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  var props = PropertiesService.getScriptProperties(), ss;
  try {
    var cfg = kkConfig_(), started = Date.now();
    ss = kkBook_(cfg);
    kkSync_(ss, cfg, started);
    kkReconcile_(ss, cfg, started);
    props.setProperty('KK_LAST_SUCCESS', new Date().toISOString());
    props.deleteProperty('KK_LAST_ERROR');
    ss.getSheetByName('Ringkasan').getRange('C12').setValue('Sync dan rekonsiliasi berhasil: ' + new Date().toISOString());
    Logger.log('[KK] Sync dan rekonsiliasi selesai. Tidak ada upload Google Ads.');
  } catch (_) {
    props.setProperty('KK_LAST_ERROR', new Date().toISOString() + ' Sync/rekonsiliasi gagal; jalankan diagnostics.');
    try { if (ss) ss.getSheetByName('Ringkasan').getRange('C12').setValue('Sync/rekonsiliasi gagal; jalankan diagnostics.'); } catch (__) {}
    // Never log raw exception bodies: network/Sheets exceptions may contain IDs or secrets.
    Logger.log('[KK] Sync/rekonsiliasi gagal. Periksa konfigurasi, cursor, dan data melalui diagnostics.');
    throw new Error('KK sync/rekonsiliasi gagal. Output belum boleh dipakai sebelum diagnostics berhasil.');
  } finally { lock.releaseLock(); }
}
function runDiagnostics() {
  var cfg = kkConfig_(), ss = kkBook_(cfg);
  var response = kkFetch_(cfg, cfg.url + '?after_change_id=' + cfg.cursor + '&limit=1');
  kkValidateBatch_(response, cfg.cursor);
  Logger.log('[KK] Kontrak API dan enam tab OK. Cursor=' + cfg.cursor + '. Data pribadi/token tidak dicetak.');
  Logger.log('[KK] Aturan impor diverifikasi=' + cfg.verified + '. Status terakhir: ' + (PropertiesService.getScriptProperties().getProperty('KK_LAST_SUCCESS') || 'belum'));
  return { ok: true, tabs: KK.tabs, timezone: ss.getSpreadsheetTimeZone() };
}
function kkOnEdit(event) {
  if (!event || !event.range || !['Closing','Pengaturan'].includes(event.range.getSheet().getName())) return;
  var ss = event.source, upload = ss.getSheetByName('Upload'), closing = ss.getSheetByName('Closing');
  var closingRows = closing.getLastRow() > 1 ? closing.getRange(2, 1, closing.getLastRow() - 1, 12).getValues() : [];
  while (closingRows.length && ![0,1,2,3,4,5,6,9,10].some(function(i) { return closingRows[closingRows.length - 1][i] !== ''; })) closingRows.pop();
  if (upload.getLastRow() > 1) upload.getRange(2, 1, upload.getLastRow() - 1, 16).clearContent();
  if (closingRows.length) {
    upload.getRange(2, 1, closingRows.length, 2).setValues(closingRows.map(function(r) {
      var filled = [0,1,2,3,4,5,6,9,10].some(function(i) { return r[i] !== ''; });
      return filled ? ['Tidak', 'Input berubah; menunggu rekonsiliasi'] : ['', ''];
    }));
  }
  if (closing.getLastRow() > 1) {
    closing.getRange(2, 8, closing.getLastRow() - 1, 2).clearContent();
    closing.getRange(2, 12, closing.getLastRow() - 1, 1).clearContent();
  }
}
function installKkSyncTrigger() {
  var cfg = kkConfig_(), ss = SpreadsheetApp.openById(cfg.id);
  ss.setSpreadsheetTimeZone(KK.timezone);
  kkBook_(cfg);
  stopKkSyncTrigger();
  ScriptApp.newTrigger(KK.handler).timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger(KK.editHandler).forSpreadsheet(ss).onEdit().create();
}
function stopKkSyncTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if ([KK.handler, KK.editHandler].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('KK Grosir')
    .addItem('Run Diagnostics', 'runDiagnostics').addItem('Sync / Retry / Rekonsiliasi', 'syncWaLeadsToSheet')
    .addItem('Pasang trigger 15 menit', 'installKkSyncTrigger').addItem('Stop trigger KK', 'stopKkSyncTrigger').addToUi();
}
