/**
 * KK UNDERWEAR — GOOGLE SHEETS WA HANDOFF SYNCHRONIZATION
 * Source of truth: WordPress custom plugin database, not the spreadsheet.
 * Intended worksheet: "Klik WA" in KK_Underwear_Offline_Conversion_Purchase.xlsx
 * Adapted from PusatGrosir.id; separate business namespace and credentials.
 *
 * DO NOT deploy to the live Google Ads connection before validating the
 * WordPress API, sheet formulas, Purchase conversion action and mapping.
 *
 * PREREQUISITES (Google Apps Script -> Project Settings -> Script Properties):
 * KK_SYNC_API_URL: https://kk-underwear.id/wp-json/kk-offline/v1/handoffs
 * KK_SYNC_API_SECRET: (private bearer token from WordPress backend)
 * KK_SPREADSHEET_ID: (ID of the native Google Sheet made from the XLSX)
 * KK_LAST_SYNCED_LEAD_ID: 0
 *
 * Required WordPress REST contract (to implement later in Antigravity):
 * GET {KK_SYNC_API_URL}?after_id=0&limit=100
 * Authorization: Bearer <KK_SYNC_API_SECRET>
 * JSON: {
 *   "success": true,
 *   "data": [{
 *     "id": 1, "reference_code": "KK-GA2601",
 *     "gclid": null, "gbraid": null, "wbraid": null,
 *     "wa_context": "hero",
 *     "landing_page": "/grosir/",
 *     "created_at": "2026-11-11T02:00:00Z"
 *   }],
 *   "last_id": 1,
 *   "has_more": false
 * }
 * created_at MUST be a canonical UTC timestamp. If timezone is missing,
 * this script interprets it as UTC, never as the local browser timezone.
 *
 * Google Sheets roles: "Klik WA" auto-populated; "Closing" edited by CS;
 * "Upload", "Ringkasan", "Panduan", "Pengaturan" remain untouched.
 * All paid purchases incl. repeat orders are recorded by CS in "Closing".
 * This script NEVER uploads Purchase to Google Ads and NEVER fires a tag.
 */

var KK_SYNC = Object.freeze({
  sheetName: 'Klik WA',
  timezone: 'Asia/Jakarta',
  pageLimit: 100,
  maxPagesPerRun: 25,
  maxExecutionMs: 240000,
  lockWaitMs: 30000,
  handler: 'syncWaLeadsToSheet'
});

function kkGetConfig_() {
  var props = PropertiesService.getScriptProperties();
  var apiUrl = String(props.getProperty('KK_SYNC_API_URL') || '').trim();
  var secret = String(props.getProperty('KK_SYNC_API_SECRET') || '').trim();
  var id = String(props.getProperty('KK_SPREADSHEET_ID') || '').trim();
  var lastId = Number(props.getProperty('KK_LAST_SYNCED_LEAD_ID') || '0');
  if (!/^https:\/\/kk-underwear\.id\/wp-json\/kk-offline\/v1\/handoffs\/?$/.test(apiUrl)) {
    throw new Error('KK_SYNC_API_URL belum sesuai endpoint resmi WordPress KK Underwear.');
  }
  if (secret.length < 16 || /PASTE|CHANGE_ME|YOUR_TOKEN/i.test(secret)) {
    throw new Error('KK_SYNC_API_SECRET belum dikonfigurasi dengan aman.');
  }
  if (!id) throw new Error('KK_SPREADSHEET_ID belum dikonfigurasi.');
  if (!Number.isSafeInteger(lastId) || lastId < 0) {
    throw new Error('KK_LAST_SYNCED_LEAD_ID tidak valid.');
  }
  return { apiUrl: apiUrl.replace(/\/$/, ''), secret: secret, spreadsheetId: id, lastId: lastId };
}

function kkSafeText_(input) {
  if (input === null || input === undefined) return '';
  var s = String(input).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  // Prevent spreadsheet formula injection through a network payload.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function kkParseUtcDate_(value) {
  var raw = String(value === null || value === undefined ? '' : value).trim();
  if (!raw) throw new Error('Tanggal created_at kosong.');
  if (/^\d{4}-\d\d-\d\d \d\d:\d\d(?::\d\d)?$/.test(raw)) {
    raw = raw.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(raw)) {
    raw += 'Z';
  }
  var date = new Date(raw);
  if (isNaN(date.getTime())) throw new Error('created_at tidak valid: ' + raw);
  return date;
}

function kkFetchBatch_(config, cursor) {
  var url = config.apiUrl + '?after_id=' + encodeURIComponent(cursor) +
    '&limit=' + encodeURIComponent(KK_SYNC.pageLimit);
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + config.secret,
      Accept: 'application/json'
    },
    followRedirects: false,
    muteHttpExceptions: true,
    validateHttpsCertificates: true
  });
  if (response.getResponseCode() !== 200) {
    // Never print the full server response; it can contain sensitive context.
    throw new Error('Sync API HTTP ' + response.getResponseCode());
  }
  var json;
  try { json = JSON.parse(response.getContentText()); }
  catch (e) { throw new Error('Sync API mengembalikan JSON yang tidak valid.'); }
  if (!json || json.success !== true || !Array.isArray(json.data) ||
      !Number.isSafeInteger(Number(json.last_id)) || typeof json.has_more !== 'boolean') {
    throw new Error('Kontrak response API tidak sesuai.');
  }
  return json;
}

function kkReadExistingLeadIds_(sheet) {
  var ids = Object.create(null);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return ids;
  var data = sheet.getRange(2, 8, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    var v = String(data[i][0] === null ? '' : data[i][0]).trim();
    if (v) ids[v] = true;
  }
  return ids;
}

function kkEnsureRowCapacity_(sheet, requiredLastRow) {
  var currentMax = sheet.getMaxRows();
  if (requiredLastRow > currentMax) {
    sheet.insertRowsAfter(currentMax, requiredLastRow - currentMax);
  }
}

/**
 * Scheduled task. Reads only new WordPress handoffs and appends A:H to Klik WA.
 * Cursor is committed only AFTER a successful write. Duplicate rows are
 * detected using MySQL ID in column H; retries cannot silently duplicate data.
 */
function syncWaLeadsToSheet() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(KK_SYNC.lockWaitMs)) {
    Logger.log('[KK-SYNC] Sinkronisasi sebelumnya masih berjalan, kali ini dilewati.');
    return;
  }
  try {
    var config = kkGetConfig_();
    var ss = SpreadsheetApp.openById(config.spreadsheetId);
    if (ss.getSpreadsheetTimeZone() !== KK_SYNC.timezone) {
      throw new Error('Timezone Google Sheets wajib Asia/Jakarta. Jalankan installKkSyncTrigger() atau ubah File > Settings.');
    }
    var sheet = ss.getSheetByName(KK_SYNC.sheetName);
    if (!sheet) throw new Error('Tab "Klik WA" tidak ditemukan.');
    var header = sheet.getRange('A1:H1').getDisplayValues()[0];
    if (header[0] !== 'Kode Ref' || header[1] !== 'GCLID' ||
        header[4] !== 'Waktu Klik (WIB)' || header[7] !== '(bantu) Lead ID') {
      throw new Error('Header tab Klik WA berbeda dari template yang disetujui.');
    }

    var props = PropertiesService.getScriptProperties();
    var ids = kkReadExistingLeadIds_(sheet);
    var cursor = config.lastId;
    var started = Date.now();
    var pages = 0;
    var appended = 0;
    var stillMore = true;

    while (stillMore && pages < KK_SYNC.maxPagesPerRun &&
           (Date.now() - started) < KK_SYNC.maxExecutionMs) {
      var response = kkFetchBatch_(config, cursor);
      var batch = response.data;
      if (batch.length === 0) {
        if (response.has_more) throw new Error('API tidak konsisten: has_more true tetapi data kosong.');
        break;
      }

      var rowsToAdd = [];
      var maxId = cursor;
      for (var i = 0; i < batch.length; i++) {
        var item = batch[i];
        var leadId = Number(item.id);
        if (!Number.isSafeInteger(leadId) || leadId <= cursor) {
          throw new Error('Lead ID API harus integer positif dan meningkat.');
        }
        if (leadId <= maxId) throw new Error('Urutan Lead ID API tidak ascending.');
        maxId = leadId;
        if (ids[String(leadId)]) continue;

        var reference = kkSafeText_(item.reference_code);
        if (reference && !/^KK-GA\d{4,}$/.test(reference)) {
          throw new Error('Reference Code bukan format KK-GA yang disepakati.');
        }
        var rawLanding = kkSafeText_(item.landing_page);
        if (rawLanding && rawLanding.slice(0, 1) !== '/') {
          throw new Error('landing_page wajib path relatif dari domain KK Underwear.');
        }
        var note = kkSafeText_(item.wa_context);
        rowsToAdd.push([
          reference,
          kkSafeText_(item.gclid),
          kkSafeText_(item.gbraid),
          kkSafeText_(item.wbraid),
          kkParseUtcDate_(item.created_at), // REAL Date cell, not a text timestamp
          rawLanding,
          note ? 'Konteks: ' + note : '',
          leadId
        ]);
        ids[String(leadId)] = true;
      }
      if (Number(response.last_id) !== maxId || maxId <= cursor) {
        throw new Error('API last_id tidak sama dengan baris terakhir batch.');
      }

      if (rowsToAdd.length) {
        var firstRow = sheet.getLastRow() + 1;
        kkEnsureRowCapacity_(sheet, firstRow + rowsToAdd.length - 1);
        sheet.getRange(firstRow, 1, rowsToAdd.length, 4).setNumberFormat('@');
        sheet.getRange(firstRow, 6, rowsToAdd.length, 2).setNumberFormat('@');
        sheet.getRange(firstRow, 5, rowsToAdd.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');
        sheet.getRange(firstRow, 1, rowsToAdd.length, 8).setValues(rowsToAdd);
        SpreadsheetApp.flush();
        appended += rowsToAdd.length;
      }
      // If the previous run wrote a batch but failed before saving the cursor,
      // the existing Lead ID Set above prevents duplicate records on replay.
      cursor = maxId;
      props.setProperty('KK_LAST_SYNCED_LEAD_ID', String(cursor));
      stillMore = response.has_more;
      pages++;
    }
    Logger.log('[KK-SYNC] Selesai. append=' + appended + ' cursor=' + cursor + ' halaman=' + pages);
  } catch (e) {
    Logger.log('[KK-SYNC] Gagal: ' + (e && e.message ? e.message : 'unknown'));
    throw e; // preserve Apps Script error reporting
  } finally {
    lock.releaseLock();
  }
}

/** Read-only diagnostics. It does NOT append data or advance the cursor. */
function runDiagnostics() {
  var config = kkGetConfig_();
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var sheet = ss.getSheetByName(KK_SYNC.sheetName);
  if (!sheet) throw new Error('Tab Klik WA tidak ditemukan.');
  var response = kkFetchBatch_(config, config.lastId);
  Logger.log('[KK-SYNC] API OK; next batch size=' + response.data.length);
  Logger.log('[KK-SYNC] Sheet timezone=' + ss.getSpreadsheetTimeZone());
  Logger.log('[KK-SYNC] Cursor=' + config.lastId + '; last sheet row=' + sheet.getLastRow());
  Logger.log('[KK-SYNC] Token dan data pribadi tidak ditampilkan pada log.');
}

/**
 * Run manually once after Script Properties and WP API are ready.
 * This function only installs a trigger for syncWaLeadsToSheet and sets
 * the workbook timezone needed by the existing Closing/Upload formulas.
 */
function installKkSyncTrigger() {
  var config = kkGetConfig_();
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  if (!ss.getSheetByName(KK_SYNC.sheetName)) {
    throw new Error('Tab Klik WA tidak ditemukan.');
  }
  ss.setSpreadsheetTimeZone(KK_SYNC.timezone);
  removeKkSyncTriggers_();
  ScriptApp.newTrigger(KK_SYNC.handler).timeBased().everyMinutes(15).create();
  Logger.log('[KK-SYNC] Trigger setiap 15 menit terpasang; timezone Asia/Jakarta.');
}

function removeKkSyncTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === KK_SYNC.handler) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

/** Run manually to disable only the KK sync trigger, not other scripts. */
function stopKkSyncTrigger() {
  removeKkSyncTriggers_();
  Logger.log('[KK-SYNC] Sinkronisasi KK dinonaktifkan.');
}
