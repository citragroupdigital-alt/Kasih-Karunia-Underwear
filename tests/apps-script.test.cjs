const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('apps-script/Code.gs','utf8');
function format(date, timezone, pattern) {
  const d = new Date(date.getTime()+7*3600000), iso=d.toISOString();
  if(pattern==='HH:mm:ss')return iso.slice(11,19);
  if(pattern==='yyyy-MM-dd')return iso.slice(0,10);
  return iso.slice(0,19);
}
const ctx = vm.createContext({ Date, console, Utilities:{formatDate:format} });
vm.runInContext(code,ctx);
const clean = value => JSON.parse(JSON.stringify(value));
const now = Date.parse('2026-11-11T10:00:00Z');
function row(order='ORDER-1', ref='KK-GA260001', status='LUNAS') {
  return [ref,new Date('2026-11-10T17:00:00Z'),0.5,100000,'','Repeat','', '', '',order,status,''];
}
function business(r) { return ctx.kkBusiness_(r,{[r[9].trim().toUpperCase()]:1},now); }
const settings={verified:true,windowDays:90,ageDays:90,name:'Purchase',currency:'IDR'};
const match={status:'matched',event_id:1,reference_id:1,gclid:'abc',gbraid:'',wbraid:'',click_observed_at:'2026-11-11T04:00:00Z'};
test('UTC and code validation reject invalid dates, timezone omissions and old codes',()=>{
  for(const v of ['2026-02-30T00:00:00Z','2026-11-11 00:00:00','2026-11-11T25:00:00Z']) assert.throws(()=>ctx.kkUtc_(v));
  assert.equal(ctx.kkRef_('KK-GA260001'),true);
  for(const v of ['KK-GA2601','KK-GA260000','KK-GA2610000']) assert.equal(ctx.kkRef_(v),false);
});
test('repeat and no-code paid orders count as business Purchase; not LUNAS does not',()=>{
  assert.equal(business(row()).valid,true);
  assert.equal(business(row('ORDER-2','')).valid,true);
  assert.equal(business(row('ORDER-3','','BELUM LUNAS')).valid,false);
  const r=row();r[3]=0;assert.equal(business(r).valid,false);
});
test('duplicates and future/malformed payment dates are rejected',()=>{
  assert.match(ctx.kkBusiness_(row(),{'ORDER-1':2},now).reason,/duplikat/);
  const r=row();r[1]='2026-11-11';assert.equal(business(r).valid,false);
  r[1]=new Date('2026-11-11T17:00:00Z');assert.equal(business(r).valid,false);
  r[1]=new Date('2026-11-10T18:00:00Z');assert.equal(business(r).valid,false);
});
test('attribution never uses future clicks and stays blocked before import validation',()=>{
  const b=business(row());
  assert.equal(ctx.kkAttribution_(b,match,settings,now).reason,'');
  assert.throws(()=>ctx.kkAttribution_(b,{...match,click_observed_at:'2026-11-11T06:00:00Z'},settings,now));
  assert.match(ctx.kkAttribution_(b,match,{...settings,verified:false},now).reason,/belum diverifikasi/);
  assert.equal(ctx.kkAttribution_(business(row('ORDER-2','')),null,settings,now).tracking,'Tanpa kode');
  assert.equal(ctx.kkAttribution_(b,{status:'not_found'},settings,now).tracking,'Kode tidak ditemukan');
});
test('upsert updates same registry and is replay safe including multiple changes per batch',()=>{
  const a=['KK-GA260001','old','','',new Date(),'/grosir/','hero',1];
  const b=[...a];b[1]='new';
  const result=ctx.kkUpsertPlan_([a],[b,b]);
  assert.equal(result.length,1);assert.equal(result[0][1],'new');
  assert.deepEqual(clean(ctx.kkUpsertPlan_(result,[b])),clean(result));
  assert.throws(()=>ctx.kkUpsertPlan_([a,a],[]));
  assert.throws(()=>ctx.kkUpsertPlan_([a],[[...a.slice(0,7),2]]));
});
test('change cursor permits existing registry IDs, rejects disorder and empty has_more',()=>{
  const item={id:1,change_id:12,reference_code:'KK-GA260001',gclid:'abc',created_at:'2026-11-11T04:00:00Z',wa_context:'hero',landing_page:'/grosir/'};
  assert.equal(ctx.kkValidateBatch_({data:[item],last_change_id:12,has_more:false},11).length,1);
  assert.throws(()=>ctx.kkValidateBatch_({data:[item,item],last_change_id:12,has_more:false},11));
  assert.throws(()=>ctx.kkValidateBatch_({data:[],last_change_id:11,has_more:true},11));
});
test('formula injection guarded; readiness contains source snapshot and moving age checks',()=>{
  assert.equal(ctx.kkSafe_('=HYPERLINK("https://evil")').charAt(0),"'");
  const r=row(),b=business(r),a=ctx.kkAttribution_(b,match,settings,now);
  const out=ctx.kkUploadRow_(r,502,b,a,settings,now);
  assert.equal(out.length,16);assert.match(out[0],/IFERROR\(AND\(.*NOW\(\)-M502/);assert.match(out[1],/Closing!J502="ORDER-1"/);
  assert.equal(out[1].includes('SUMPRODUCT'),false);
  assert.match(out[1],/ISFORMULA\(Closing!I502\),NOT\(ISERROR\(Closing!I502\)\),Closing!I502=""/);
  assert.match(out[1],/rekonsiliasi ulang/);
});
test('row capacity expands beyond original 5000 row limit',()=>{
  let inserted;
  const range={copyTo(){}};
  ctx.SpreadsheetApp={CopyPasteType:{PASTE_FORMAT:'format'}};
  ctx.kkCapacity_({getMaxRows:()=>5000,getMaxColumns:()=>8,insertRowsAfter:(a,b)=>inserted=[a,b],getRange:()=>range},6100);
  assert.deepEqual(inserted,[5000,1100]);
});
test('cursor is not committed on failed sheet writes',()=>{
  let committed=false;
  ctx.PropertiesService={getScriptProperties:()=>({setProperty(){committed=true}})};
  const item={id:1,change_id:1,reference_code:'KK-GA260001',created_at:'2026-11-11T04:00:00Z',wa_context:'hero',landing_page:'/grosir/'};
  const original=ctx.kkFetch_;ctx.kkFetch_=()=>({data:[item],last_change_id:1,has_more:false});
  const range={setNumberFormat(){return this},setValues(){throw Error('write failed')}};
  const sheet={getLastRow:()=>1,getMaxRows:()=>1000,getRange:()=>range};
  assert.throws(()=>ctx.kkSync_({getSheetByName:()=>sheet},{cursor:0,url:'https://example.test'},Date.now()));
  assert.equal(committed,false);ctx.kkFetch_=original;
});
test('fractional payment clock rounds cleanly and duplicate checks handle empty and duplicate Order IDs',()=>{
  const paid=ctx.kkPaidAt_(new Date('2026-11-10T17:00:00Z'),(13*60+45)/1440);
  assert.equal(paid.toISOString(),'2026-11-11T06:45:00.000Z');
  const emptyOrderRow=row('','KK-GA260001','BELUM LUNAS');
  const emptyBiz=ctx.kkBusiness_(emptyOrderRow,{},now);
  const emptyOut=ctx.kkUploadRow_(emptyOrderRow,2,emptyBiz,ctx.kkAttribution_(emptyBiz,null,settings,now),settings,now);
  assert.equal(emptyOut[1].includes('=1,'),false);
  const dupRow=row('ORDER-DUP','KK-GA260001','BELUM LUNAS');
  const dupBiz=ctx.kkBusiness_(dupRow,{'ORDER-DUP':2},now);
  const dupOut=ctx.kkUploadRow_(dupRow,3,dupBiz,ctx.kkAttribution_(dupBiz,null,settings,now),settings,now);
  assert.equal(dupOut[14],'Order ID duplikat');
  assert.equal(dupOut[1].includes('SUMPRODUCT'),false);
  assert.match(dupOut[1],/ISFORMULA\(Closing!I3\),NOT\(ISERROR\(Closing!I3\)\),Closing!I3="Order ID duplikat"/);
});
test('reconcile handles >500 Closing rows, repeat orders, and kkOnEdit avoids marking empty rows',()=>{
  const closingData=Array.from({length:550},(_,i)=>[
    'KK-GA260001',new Date('2026-11-10T17:00:00Z'),0.5,150000,'',i%2?'Repeat':'Baru','', '', '',`ORD-${i+1}`,'Lunas',''
  ]);
  const sheets={
    Closing:{
      rows:closingData, written:{}, maxRows:1000, maxCols:12,
      getLastRow(){return this.rows.length+1;},
      getMaxRows(){return this.maxRows;},
      getMaxColumns(){return this.maxCols;},
      getRange(r,c,nr,nc){
        const self=this;
        return {
          getValues(){return self.rows.slice(r-2,r-2+nr).map(x=>x.slice(c-1,c-1+nc));},
          setValues(v){self.written[`${r}:${c}:${nr}:${nc}`]=v;},
          clearContent(){self.written[`clear:${r}:${c}:${nr}:${nc}`]=true;},
        };
      },
    },
    Upload:{
      rows:Array.from({length:499},()=>Array(16).fill('')), maxRows:500, maxCols:16, inserted:null,
      getLastRow(){return this.rows.length+1;},
      getMaxRows(){return this.maxRows;},
      getMaxColumns(){return this.maxCols;},
      insertRowsAfter(a,b){this.inserted=[a,b];this.maxRows+=b;},
      getRange(r,c,nr,nc){
        const self=this;
        return {
          copyTo(){},
          setNumberFormat(){return this;},
          clearContent(){self.rows=self.rows.map(()=>Array(16).fill(''));},
          setValues(v){
            for(let i=0;i<v.length;i++) for(let j=0;j<v[i].length;j++) {
              if(!self.rows[r-2+i]) self.rows[r-2+i]=Array(16).fill('');
              self.rows[r-2+i][c-1+j]=v[i][j];
            }
          },
        };
      },
    },
    'Klik WA':{
      getLastRow(){return 2;},
      getRange(){return {getValues(){return [[77]];}};}
    },
    Pengaturan:{
      getRange(){return {getValues(){return [['Purchase'],['IDR'],['+07:00'],['Ya'],[0.5],[90],[90]];}};}
    },
  };
  const origFetch=ctx.kkFetch_, origSS=ctx.SpreadsheetApp;
  ctx.SpreadsheetApp={CopyPasteType:{PASTE_FORMAT:'format'},flush(){}};
  ctx.kkFetch_=(cfg,url,body)=>({success:true,data:body.purchases.map(p=>({key:p.key,status:'matched',event_id:10,reference_id:77,gclid:'g1',gbraid:'',wbraid:'',click_observed_at:'2026-11-11T04:00:00Z'}))});
  ctx.kkReconcile_({getSheetByName:n=>sheets[n]},{url:'https://example.test/wp-json/kk-offline/v1/handoffs',secret:'s'.repeat(32),verified:true},Date.now());
  assert.deepEqual(sheets.Upload.inserted,[500,51]);
  assert.equal(sheets.Upload.rows[549][9],'ORD-550');
  assert.equal(sheets.Upload.rows[549][11],2);
  assert.match(sheets.Closing.written['2:8:550:2'][0][1],/ARRAYFORMULA/);
  sheets.Closing.rows=[...closingData.slice(0,2)];
  sheets.Upload.rows=Array.from({length:999},()=>['old','old']);
  ctx.kkOnEdit({source:{getSheetByName:n=>sheets[n]},range:{getSheet:()=>({getName:()=>'Closing'})}});
  assert.equal(sheets.Upload.rows[0][0],'Tidak');
  assert.equal(sheets.Upload.rows[2][0],'');
  ctx.kkFetch_=origFetch; ctx.SpreadsheetApp=origSS;
});

function withSyncEnv(initialRows, maxRows, fetchImpl, opts = {}) {
  const saved = {
    Props: ctx.PropertiesService, SS: ctx.SpreadsheetApp,
    Fetch: ctx.kkFetch_, Lock: ctx.LockService, Logger: ctx.Logger, Now: Date.now,
  };
  const propStore = {
    KK_SYNC_API_URL: 'https://example.test/wp-json/kk-offline/v1/handoffs',
    KK_SYNC_API_SECRET: 's'.repeat(32),
    KK_SPREADSHEET_ID: 'sheet-id-1',
    KK_LAST_CHANGE_ID: String(opts.cursor || 0),
  };
  const metrics = { reads: 0, writes: 0, cellsWritten: 0, formatCalls: 0, flushes: 0, cursorCommits: 0, inserted: [], pages: 0 };
  const sheet = {
    rows: initialRows.map(r => r.slice()),
    maxRows,
    maxCols: 8,
    getLastRow() { return this.rows.length + 1; },
    getMaxRows() { return this.maxRows; },
    getMaxColumns() { return this.maxCols; },
    insertRowsAfter(a, b) { metrics.inserted.push([a, b]); this.maxRows += b; },
    getRange(r, c, nr, nc) {
      const self = this;
      return {
        copyTo() {},
        setNumberFormat() { metrics.formatCalls++; return this; },
        getValues() {
          metrics.reads++;
          return self.rows.slice(r - 2, r - 2 + nr).map(x => x.slice(c - 1, c - 1 + nc));
        },
        setValues(vals) {
          metrics.writes++;
          for (const v of vals) metrics.cellsWritten += v.length;
          for (let i = 0; i < vals.length; i++) {
            if (!self.rows[r - 2 + i]) self.rows[r - 2 + i] = Array(8).fill('');
            for (let j = 0; j < vals[i].length; j++) self.rows[r - 2 + i][c - 1 + j] = vals[i][j];
          }
        },
      };
    },
  };
  ctx.PropertiesService = {
    getScriptProperties() {
      return {
        getProperty(k) { return Object.prototype.hasOwnProperty.call(propStore, k) ? propStore[k] : null; },
        setProperty(k, v) {
          if (opts.failCursorCommit && k === 'KK_LAST_CHANGE_ID') throw Error('cursor store failed');
          propStore[k] = String(v);
          if (k === 'KK_LAST_CHANGE_ID') metrics.cursorCommits++;
        },
        deleteProperty(k) { delete propStore[k]; },
      };
    },
  };
  ctx.SpreadsheetApp = {
    CopyPasteType: { PASTE_FORMAT: 'format' },
    flush() { if (opts.failFlush) throw Error('flush failed'); metrics.flushes++; },
  };
  ctx.kkFetch_ = (cfg, url, body) => { metrics.pages++; return fetchImpl(cfg, url, body); };
  const run = fn => {
    try { return fn({ sheet, metrics, propStore, ss: { getSheetByName: n => n === 'Klik WA' ? sheet : null } }); }
    finally {
      ctx.PropertiesService = saved.Props; ctx.SpreadsheetApp = saved.SS;
      ctx.kkFetch_ = saved.Fetch; ctx.LockService = saved.Lock; ctx.Logger = saved.Logger; Date.now = saved.Now;
    }
  };
  return { run, metrics, propStore, sheet, opts };
}

test('T02: 6100 existing + 25 pages updating single registry writes once (48800 cells, 3 formats, 1 commit)', () => {
  const existing = Array.from({ length: 6100 }, (_, i) => [
    'KK-GA26' + String(i + 1).padStart(4, '0'), 'g' + (i + 1), '', '', new Date('2026-11-11T00:00:00Z'), '/grosir/', 'Konteks: hero', i + 1,
  ]);
  let page = 0;
  const env = withSyncEnv(existing, 10000, () => {
    page++;
    const start = (page - 1) * 100 + 1;
    const data = Array.from({ length: 100 }, (_, k) => ({
      change_id: start + k, id: 6100, reference_code: 'KK-GA266100',
      gclid: 'g6100_' + (start + k), gbraid: '', wbraid: '',
      created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero',
    }));
    return { success: true, data, last_change_id: start + 99, has_more: page < 25 };
  });
  env.run(({ ss, metrics, propStore, sheet }) => {
    ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now());
    assert.equal(metrics.pages, 25);
    assert.equal(metrics.reads, 1);
    assert.equal(metrics.writes, 1);
    assert.equal(metrics.cellsWritten, 48800);
    assert.equal(metrics.formatCalls, 3);
    assert.equal(metrics.flushes, 1);
    assert.equal(metrics.cursorCommits, 1);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '2500');
    assert.equal(sheet.rows.length, 6100);
    assert.equal(sheet.rows[6099][1], 'g6100_2500');
  });
});

test('T02: mixed new/existing rows >5000 expansion, empty batch, conflicts and out-of-order rejection', () => {
  const existing = Array.from({ length: 4950 }, (_, i) => [
    'KK-GA26' + String(i + 1).padStart(4, '0'), 'g' + (i + 1), '', '', new Date('2026-11-11T00:00:00Z'), '/grosir/', 'Konteks: hero', i + 1,
  ]);
  let step = 0;
  const mixed = withSyncEnv(existing, 5000, () => {
    step++;
    const baseId = step === 1 ? 4951 : 5011;
    const baseChange = step === 1 ? 1 : 62;
    const data = [];
    if (step === 1) data.push({ change_id: 1, id: 1, reference_code: 'KK-GA260001', gclid: 'g1_updated', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' });
    for (let k = 0; k < 60; k++) {
      const id = baseId + k;
      data.push({ change_id: baseChange + (step === 1 ? 1 : 0) + k, id, reference_code: 'KK-GA26' + String(id).padStart(4, '0'), gclid: 'new_' + id, created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'sticky' });
    }
    return { success: true, data, last_change_id: data[data.length - 1].change_id, has_more: step === 1 };
  });
  mixed.run(({ ss, metrics, propStore, sheet }) => {
    ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now());
    assert.deepEqual(metrics.inserted, [[5000, 71]]);
    assert.equal(sheet.rows.length, 5070);
    assert.equal(sheet.rows[0][1], 'g1_updated');
    assert.equal(metrics.writes, 1);
    assert.equal(metrics.cellsWritten, 5070 * 8);
    assert.equal(metrics.cursorCommits, 1);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '121');
  });

  const emptyEnv = withSyncEnv(existing.slice(0, 5), 100, () => ({ success: true, data: [], last_change_id: 121, has_more: false }));
  emptyEnv.run(({ ss, metrics }) => {
    ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 121 }, Date.now());
    assert.equal(metrics.writes, 0);
    assert.equal(metrics.formatCalls, 0);
    assert.equal(metrics.flushes, 0);
    assert.equal(metrics.cursorCommits, 0);
  });

  let cp = 0;
  const conflictEnv = withSyncEnv([existing[0]], 100, () => {
    cp++;
    if (cp === 1) return { success: true, has_more: true, last_change_id: 1, data: [{ change_id: 1, id: 2, reference_code: 'KK-GA260002', gclid: 'ok', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }] };
    return { success: true, has_more: false, last_change_id: 2, data: [{ change_id: 2, id: 99, reference_code: 'KK-GA260002', gclid: 'bad', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }] };
  });
  conflictEnv.run(({ ss, metrics, propStore, sheet }) => {
    assert.throws(() => ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now()), /identitas/);
    assert.equal(metrics.writes, 0);
    assert.equal(metrics.cursorCommits, 0);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '0');
    assert.equal(sheet.rows.length, 1);
  });

  let op = 0;
  const disorderEnv = withSyncEnv([existing[0]], 100, () => {
    op++;
    if (op === 1) return { success: true, has_more: true, last_change_id: 5, data: [{ change_id: 5, id: 1, reference_code: 'KK-GA260001', gclid: 'a', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }] };
    return { success: true, has_more: false, last_change_id: 5, data: [{ change_id: 4, id: 1, reference_code: 'KK-GA260001', gclid: 'b', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }] };
  });
  disorderEnv.run(({ ss, metrics, propStore }) => {
    assert.throws(() => ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now()));
    assert.equal(metrics.writes, 0);
    assert.equal(metrics.cursorCommits, 0);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '0');
  });
});

test('T02: page 2 API fail, flush fail, cursor commit fail replay idempotently; sync fails when reconcile fails', () => {
  let apiTry = 0;
  const apiFail = withSyncEnv([], 100, () => {
    apiTry++;
    if (apiTry === 1) return { success: true, has_more: true, last_change_id: 1, data: [{ change_id: 1, id: 1, reference_code: 'KK-GA260001', gclid: 'g1', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }] };
    throw Error('API HTTP 503');
  });
  apiFail.run(({ ss, metrics, propStore, sheet }) => {
    assert.throws(() => ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now()), /503/);
    assert.equal(metrics.writes, 0);
    assert.equal(metrics.cursorCommits, 0);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '0');
    assert.equal(sheet.rows.length, 0);
  });

  const flushFail = withSyncEnv([], 100, () => ({
    success: true, has_more: false, last_change_id: 1,
    data: [{ change_id: 1, id: 1, reference_code: 'KK-GA260001', gclid: 'g1', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }],
  }), { failFlush: true });
  flushFail.run(({ ss, metrics, propStore }) => {
    assert.throws(() => ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now()), /flush failed/);
    assert.equal(metrics.writes, 1);
    assert.equal(metrics.cursorCommits, 0);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '0');
  });

  const cursorFail = withSyncEnv([], 100, () => ({
    success: true, has_more: false, last_change_id: 1,
    data: [{ change_id: 1, id: 1, reference_code: 'KK-GA260001', gclid: 'g1', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }],
  }), { failCursorCommit: true });
  cursorFail.run(({ ss, metrics, propStore, sheet }) => {
    assert.throws(() => ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now()), /cursor store failed/);
    assert.equal(sheet.rows.length, 1);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '0');
    cursorFail.opts.failCursorCommit = false;
    ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now());
    assert.equal(sheet.rows.length, 1);
    assert.equal(metrics.cursorCommits, 1);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '1');
  });

  const fullEnv = withSyncEnv([], 100, () => ({
    success: true, has_more: false, last_change_id: 1,
    data: [{ change_id: 1, id: 1, reference_code: 'KK-GA260001', gclid: 'g1', created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }],
  }));
  fullEnv.run(({ sheet, propStore }) => {
    let summaryMsg = '';
    const origOpenById = ctx.SpreadsheetApp.openById;
    const origReconcile = ctx.kkReconcile_;
    ctx.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) };
    ctx.Logger = { log() {} };
    ctx.SpreadsheetApp.openById = () => ({
      getSheets: () => ctx.KK.tabs.map(name => ({ getName: () => name })),
      getSpreadsheetTimeZone: () => ctx.KK.timezone,
      getSheetByName(name) {
        if (name === 'Klik WA') return {
          ...sheet,
          getRange(r, c, nr, nc) {
            if (r === 'A1:H1') return { getDisplayValues: () => [['Kode Ref', '', '', '', '', '', '', '(bantu) Lead ID']] };
            return sheet.getRange(r, c, nr, nc);
          },
        };
        if (name === 'Ringkasan') return { getRange: () => ({ setValue(v) { summaryMsg = v; } }) };
        return null;
      },
    });
    ctx.kkReconcile_ = () => { throw Error('reconcile boom'); };
    try {
      assert.throws(() => ctx.syncWaLeadsToSheet(), /KK sync\/rekonsiliasi gagal/);
      assert.equal(propStore.KK_LAST_CHANGE_ID, '1');
      assert.equal(propStore.KK_LAST_SUCCESS, undefined);
      assert.match(propStore.KK_LAST_ERROR, /Sync\/rekonsiliasi gagal/);
      assert.match(summaryMsg, /gagal/);
    } finally {
      ctx.SpreadsheetApp.openById = origOpenById;
      ctx.kkReconcile_ = origReconcile;
    }
  });
});

test('T02: 25-page limit and soft clock budget stop with committed cursor and resume remainder', () => {
  const pageCapEnv = withSyncEnv([], 5000, (cfg, url) => {
    const after = Number(new URL(url).searchParams.get('after_change_id'));
    const next = after + 100;
    return {
      success: true, has_more: next < 2700, last_change_id: next,
      data: [{ change_id: next, id: next / 100, reference_code: 'KK-GA26' + String(next / 100).padStart(4, '0'), gclid: 'g_' + next, created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }],
    };
  });
  pageCapEnv.run(({ ss, metrics, propStore, sheet }) => {
    ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, Date.now());
    assert.equal(metrics.pages, 25);
    assert.equal(metrics.writes, 1);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '2500');
    ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: Number(propStore.KK_LAST_CHANGE_ID) }, Date.now());
    assert.equal(metrics.pages, 27);
    assert.equal(metrics.writes, 2);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '2700');
    assert.equal(sheet.rows.length, 27);
  });

  let clock = 1000;
  const clockEnv = withSyncEnv([], 100, (cfg, url) => {
    const after = Number(new URL(url).searchParams.get('after_change_id'));
    clock += 60000;
    const next = after + 1;
    return {
      success: true, has_more: next < 3, last_change_id: next,
      data: [{ change_id: next, id: next, reference_code: 'KK-GA26' + String(next).padStart(4, '0'), gclid: 't_' + next, created_at: '2026-11-11T01:00:00Z', landing_page: '/grosir/', wa_context: 'hero' }],
    };
  });
  clockEnv.run(({ ss, metrics, propStore, sheet }) => {
    Date.now = () => clock;
    const started = clock;
    ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: 0 }, started);
    assert.equal(metrics.pages, 2);
    assert.equal(metrics.writes, 1);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '2');
    clock += 1000;
    ctx.kkSync_(ss, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', cursor: Number(propStore.KK_LAST_CHANGE_ID) }, clock);
    assert.equal(metrics.pages, 3);
    assert.equal(metrics.writes, 2);
    assert.equal(propStore.KK_LAST_CHANGE_ID, '3');
    assert.equal(sheet.rows.length, 3);
  });
});

function evalSheetFormula(expr, env) {
  const src = String(expr || '');
  if (!src.startsWith('=')) return src;
  let pos = 1;
  const skip = () => { while (pos < src.length && /\s/.test(src[pos])) pos++; };
  const err = new Error('#FORMULA_ERR');
  const parseExpr = () => {
    const left = parseSum();
    skip();
    for (const op of ['<>', '<=', '>=', '=', '<', '>']) {
      if (src.startsWith(op, pos)) {
        pos += op.length;
        const right = parseSum();
        if (left instanceof Error) throw left;
        if (right instanceof Error) throw right;
        if (op === '=') return left === right;
        if (op === '<>') return left !== right;
        if (op === '<') return Number(left) < Number(right);
        if (op === '<=') return Number(left) <= Number(right);
        if (op === '>') return Number(left) > Number(right);
        return Number(left) >= Number(right);
      }
    }
    return left;
  };
  const parseSum = () => {
    let val = parseTerm();
    while (true) {
      skip();
      if (src[pos] === '+' || src[pos] === '-' || src[pos] === '&') {
        const op = src[pos++];
        const right = parseTerm();
        if (val instanceof Error) throw val;
        if (right instanceof Error) throw right;
        val = op === '&' ? String(val) + String(right) : op === '+' ? Number(val) + Number(right) : Number(val) - Number(right);
      } else break;
    }
    return val;
  };
  const parseTerm = () => {
    skip();
    if (src.startsWith('--', pos)) { pos += 2; return parseTerm() ? 1 : 0; }
    if (src[pos] === '"') {
      pos++;
      let out = '';
      while (pos < src.length) {
        if (src[pos] === '"' && src[pos + 1] === '"') { out += '"'; pos += 2; }
        else if (src[pos] === '"') { pos++; break; }
        else out += src[pos++];
      }
      return out;
    }
    if (src[pos] === '(') {
      pos++; const v = parseExpr(); skip();
      if (src[pos] !== ')') throw err;
      pos++; return v;
    }
    const m = src.slice(pos).match(/^([A-Za-z_][A-Za-z0-9_!$:]*|-?\d+(?:\.\d+)?)/);
    if (!m) throw err;
    pos += m[0].length;
    const tok = m[0];
    if (/^-?\d/.test(tok)) return Number(tok);
    skip();
    if (src[pos] === '(') {
      pos++;
      const argsRaw = [];
      let depth = 0, inStr = false, start = pos;
      for (; pos < src.length; pos++) {
        const ch = src[pos];
        if (ch === '"') inStr = !inStr;
        else if (!inStr) {
          if (ch === '(') depth++;
          else if (ch === ')') {
            if (depth === 0) { argsRaw.push(src.slice(start, pos)); pos++; break; }
            depth--;
          } else if (ch === ',' && depth === 0) { argsRaw.push(src.slice(start, pos)); start = pos + 1; }
        }
      }
      const fn = tok.toUpperCase();
      const ev = sub => evalSheetFormula('=' + sub.trim(), env);
      const safe = sub => { try { return ev(sub); } catch (e) { return e; } };
      if (fn === 'IF') { const cond = safe(argsRaw[0]); if (cond instanceof Error) return cond; return safe(cond ? argsRaw[1] : argsRaw[2]); }
      if (fn === 'IFERROR') { const v = safe(argsRaw[0]); return v instanceof Error ? safe(argsRaw[1]) : v; }
      if (fn === 'ISERROR') { const v = safe(argsRaw[0]); return v instanceof Error; }
      if (fn === 'NOT') { const v = safe(argsRaw[0]); if (v instanceof Error) return v; return !v; }
      if (fn === 'AND') { let res = true; for (const a of argsRaw) { const v = safe(a); if (v instanceof Error) return v; res = res && Boolean(v); } return res; }
      if (fn === 'ISFORMULA') return env.isFormula(argsRaw[0].trim());
      if (fn === 'ISNUMBER') { const v = safe(argsRaw[0]); return !(v instanceof Error) && typeof v === 'number' && isFinite(v); }
      if (fn === 'UPPER') { const v = safe(argsRaw[0]); return v instanceof Error ? v : String(v).toUpperCase(); }
      if (fn === 'TRIM') { const v = safe(argsRaw[0]); return v instanceof Error ? v : String(v).trim(); }
      if (fn === 'ABS') { const v = safe(argsRaw[0]); return v instanceof Error ? v : Math.abs(Number(v)); }
      if (fn === 'N') { const v = safe(argsRaw[0]); return v instanceof Error ? v : (typeof v === 'number' ? v : 0); }
      if (fn === 'NOW') return env.nowSerial;
      if (fn === 'ARRAYFORMULA') return safe(argsRaw[0]);
      if (fn === 'SUMPRODUCT') return env.sumproduct(argsRaw[0]);
      throw err;
    }
    if (tok === 'TRUE' || tok === 'FALSE') return tok === 'TRUE';
    return env.cell(tok);
  };
  const out = parseExpr();
  if (out instanceof Error) throw out;
  return out;
}

test('T03: Closing!I owns duplicate scan, Upload reuses I with ISFORMULA/IFERROR guard across edits, blank/error I, >500 rows, refund, repeat', () => {
  const paidDate = new Date('2026-11-10T17:00:00Z');
  const runStamp = Date.parse('2026-11-11T10:00:00Z');
  const rows = [
    ['KK-GA260001', paidDate, 0.5, 100000, '', 'Baru', '', '', '', 'ORDER-1', 'LUNAS', ''],
    ['KK-GA260002', paidDate, 0.5, 100000, '', 'Repeat', '', '', '', 'ORDER-DUP', 'LUNAS', ''],
    ['KK-GA260003', paidDate, 0.5, 100000, '', 'Repeat', '', '', '', ' order-dup ', 'LUNAS', ''],
    ['KK-GA260004', paidDate, 0.5, 100000, '', 'Repeat', '', '', '', 'ORD-REPEAT', 'LUNAS', ''],
    ['KK-GA260005', paidDate, 0.5, 100000, '', 'Baru', '', '', '', 'ORD-REFUND', 'REFUND', ''],
    ['KK-GA260006', paidDate, 0.5, 100000, '', 'Baru', '', '', '', '   ', 'LUNAS', ''],
  ];

  const counts = { 'ORDER-1': 1, 'ORDER-DUP': 2, 'ORD-REPEAT': 1, 'ORD-REFUND': 1 };
  const biz = rows.map(r => ctx.kkBusiness_(r, counts, runStamp));
  assert.equal(biz[3].valid, true);
  assert.equal(biz[4].valid, false);
  assert.equal(biz[5].valid, false);

  const built = rows.map((r, i) => {
    const n = i + 2;
    const attr = ctx.kkAttribution_(biz[i], biz[i].valid ? { ...match, reference_id: i + 1 } : null, settings, runStamp);
    const up = ctx.kkUploadRow_(r, n, biz[i], attr, settings, runStamp);
    assert.equal(up[1].includes('SUMPRODUCT'), false);
    const closingI = '=IF(AND(TRIM(J' + n + ')<>"",ARRAYFORMULA(SUMPRODUCT(--(UPPER(TRIM(J$2:J))=UPPER(TRIM(J' + n + ')))))>1),"Order ID duplikat","")';
    return { n, up, closingI };
  });

  const closingJ = { J2: 'ORDER-1', J3: 'ORDER-DUP', J4: ' order-dup ', J5: 'ORD-REPEAT', J6: 'ORD-REFUND', J7: '   ' };
  const overrideI = {};
  const makeEnv = (sheet = 'Upload') => ({
    nowSerial: (runStamp + 7 * 3600000) / 86400000 + 25569,
    isFormula(ref) {
      const col = ref.replace('Closing!', '');
      if (overrideI[col] && Object.prototype.hasOwnProperty.call(overrideI[col], 'isFormula')) return overrideI[col].isFormula;
      return col.startsWith('I');
    },
    sumproduct(expr) {
      const m = expr.match(/UPPER\(TRIM\(J\$2:J\)\)=UPPER\(TRIM\(J(\d+)\)\)/i);
      const target = String(closingJ['J' + m[1]] || '').trim().toUpperCase();
      return Object.values(closingJ).filter(v => String(v || '').trim().toUpperCase() === target).length;
    },
    cell(ref) {
      if (ref.startsWith('Pengaturan!')) {
        const map = { B2: settings.name, B3: settings.currency, B7: settings.ageDays, B8: settings.windowDays };
        return map[ref.slice(11)];
      }
      if (ref.startsWith('Closing!') || sheet === 'Closing') {
        const c = ref.replace('Closing!', '');
        if (c.startsWith('I')) {
          if (overrideI[c]) {
            if (overrideI[c].error) return Object.assign(new Error(overrideI[c].error), {});
            return overrideI[c].value;
          }
          const idx = Number(c.slice(1)) - 2;
          return evalSheetFormula(built[idx].closingI, makeEnv('Closing'));
        }
        const rowIdx = Number(c.slice(1)) - 2;
        const colIdx = c.charCodeAt(0) - 65;
        if (colIdx === 9) return closingJ['J' + (rowIdx + 2)] ?? '';
        const val = rows[rowIdx]?.[colIdx];
        if (val instanceof Date) {
          return colIdx === 2 ? 0.5 : (val.getTime() + 7 * 3600000) / 86400000 + 25569;
        }
        return val ?? '';
      }
      const rowIdx = Number(ref.slice(1)) - 2;
      const colIdx = ref.charCodeAt(0) - 65;
      const val = built[rowIdx].up[colIdx];
      if (typeof val === 'string' && val.startsWith('=')) return evalSheetFormula(val, makeEnv('Upload'));
      if (val instanceof Date) return (val.getTime() + 7 * 3600000) / 86400000 + 25569;
      return val;
    },
  });

  const evalReady = idx => evalSheetFormula(built[idx].up[0], makeEnv('Upload'));
  const evalReason = idx => evalSheetFormula(built[idx].up[1], makeEnv('Upload'));

  // Initial evaluated states
  assert.equal(evalReady(0), 'Ya'); // ORDER-1 unique
  assert.equal(evalReady(1), 'Tidak'); // ORDER-DUP
  assert.equal(evalReason(1), 'Order ID duplikat');
  assert.equal(evalReady(2), 'Tidak'); // ' order-dup ' (case/space duplicate)
  assert.equal(evalReady(3), 'Ya'); // ORD-REPEAT valid Repeat order
  assert.equal(evalReady(4), 'Tidak'); // REFUND not LUNAS
  assert.equal(evalReady(5), 'Tidak'); // whitespace-only ID stays blocked

  // Insert duplicate in row 550 (>500) matching ORDER-1 with lowercase + spaces
  closingJ.J550 = '  order-1 ';
  assert.equal(evalReady(0), 'Tidak');
  assert.equal(evalReason(0), 'Data berubah; rekonsiliasi ulang');
  delete closingJ.J550;
  assert.equal(evalReady(0), 'Ya');

  // Fix row 4 so row 3 (ORDER-DUP) becomes unique dynamically -> forces re-reconciliation
  closingJ.J4 = 'ORD-UNIQUE-NEW';
  assert.equal(evalReady(1), 'Tidak');
  assert.equal(evalReason(1), 'Data berubah; rekonsiliasi ulang');
  closingJ.J4 = ' order-dup ';

  // Blank I without formula (erased / kkOnEdit) -> NOT treated as unique ""
  overrideI.I2 = { isFormula: false, value: '' };
  assert.equal(evalReady(0), 'Tidak');
  assert.equal(evalReason(0), 'Data berubah; rekonsiliasi ulang');

  // Formula error (#REF!) in I -> safe failure, NEVER passes Ya or propagates #REF!
  overrideI.I2 = { isFormula: true, error: '#REF!' };
  assert.equal(evalReady(0), 'Tidak');
  assert.equal(evalReason(0), 'Data berubah; rekonsiliasi ulang');
});

test('T03: 550 Closing rows emit 550 Closing scans & 0 Upload scans; Closing flushed before Upload; failures keep Upload blocked', () => {
  const mkRows = n => Array.from({ length: n }, (_, i) => [
    'KK-GA260001', new Date('2026-11-10T17:00:00Z'), 0.5, 150000, '', 'Baru', '', '', '', `ORD-${i + 1}`, 'Lunas', '',
  ]);
  const writeLog = [];
  const makeReconcileSheets = (rows, failAt = '') => {
    const uploadRows = Array.from({ length: rows.length }, () => Array(16).fill(''));
    return {
      Closing: {
        rows: rows.map(r => r.slice()),
        hi: [],
        getLastRow() { return this.rows.length + 1; },
        getRange(r, c, nr, nc) {
          const self = this;
          return {
            getValues() { return self.rows.slice(r - 2, r - 2 + nr).map(x => x.slice(c - 1, c - 1 + nc)); },
            setValues(vals) {
              writeLog.push(`Closing!${c}:${nc}`);
              if (failAt === `Closing!${c}`) throw Error(`fail Closing!${c}`);
              if (c === 8) self.hi = vals;
            },
          };
        },
      },
      Upload: {
        rows: uploadRows, maxRows: rows.length + 10, maxCols: 16,
        getLastRow() { return this.rows.length + 1; },
        getMaxRows() { return this.maxRows; },
        getMaxColumns() { return this.maxCols; },
        insertRowsAfter(a, b) { this.maxRows += b; },
        getRange(r, c, nr, nc) {
          const self = this;
          return {
            copyTo() {},
            setNumberFormat() { return this; },
            clearContent() { self.rows = Array.from({ length: self.rows.length }, () => Array(16).fill('')); },
            setValues(vals) {
              writeLog.push(`Upload!${c}:${nc}`);
              if (failAt === 'Upload!full' && nc === 16) throw Error('fail Upload!full');
              for (let i = 0; i < vals.length; i++) for (let j = 0; j < vals[i].length; j++) {
                if (!self.rows[r - 2 + i]) self.rows[r - 2 + i] = Array(16).fill('');
                self.rows[r - 2 + i][c - 1 + j] = vals[i][j];
              }
            },
          };
        },
      },
      'Klik WA': { getLastRow: () => 2, getRange: () => ({ getValues: () => [[77]] }) },
      Pengaturan: { getRange: () => ({ getValues: () => [['Purchase'], ['IDR'], ['+07:00'], ['Ya'], [0.5], [90], [90]] }) },
    };
  };

  const origFetch = ctx.kkFetch_, origSS = ctx.SpreadsheetApp;
  let flushes = 0;
  ctx.kkFetch_ = (cfg, url, body) => ({ success: true, data: body.purchases.map(p => ({ key: p.key, status: 'matched', event_id: 10, reference_id: 77, gclid: 'g1', gbraid: '', wbraid: '', click_observed_at: '2026-11-11T04:00:00Z' })) });
  ctx.SpreadsheetApp = { CopyPasteType: { PASTE_FORMAT: 'format' }, flush() { writeLog.push('flush'); flushes++; } };
  try {
    const s550 = makeReconcileSheets(mkRows(550));
    ctx.kkReconcile_({ getSheetByName: n => s550[n] }, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', secret: 's'.repeat(32), verified: true }, Date.now());
    assert.equal(s550.Closing.hi.filter(r => /SUMPRODUCT/.test(r[1])).length, 550);
    assert.equal(s550.Upload.rows.slice(0, 550).filter(r => /SUMPRODUCT/.test(r[1])).length, 0);
    assert.deepEqual(writeLog, ['Upload!1:2', 'flush', 'Closing!8:2', 'Closing!12:1', 'flush', 'Upload!1:16', 'flush']);

    for (const failPoint of ['Closing!8', 'Closing!12', 'Upload!full']) {
      const sf = makeReconcileSheets(mkRows(5), failPoint);
      assert.throws(() => ctx.kkReconcile_({ getSheetByName: n => sf[n] }, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', secret: 's'.repeat(32), verified: true }, Date.now()));
      assert.equal(sf.Upload.rows.every(r => r[0] === 'Tidak'), true);
      assert.equal(sf.Upload.rows.some(r => String(r[0]).includes('Ya')), false);
    }

    // In-flight CS edit refuses Closing/Upload writes and keeps Upload blocked
    const sinf = makeReconcileSheets(mkRows(3));
    let getCount = 0;
    const origClosingGet = sinf.Closing.getRange.bind(sinf.Closing);
    sinf.Closing.getRange = (r, c, nr, nc) => {
      const handle = origClosingGet(r, c, nr, nc);
      return {
        ...handle,
        getValues() {
          const vals = handle.getValues();
          getCount++;
          if (getCount === 2) vals[0][9] = 'ORD-EDITED-MIDFLIGHT';
          return vals;
        },
      };
    };
    assert.throws(() => ctx.kkReconcile_({ getSheetByName: n => sinf[n] }, { url: 'https://example.test/wp-json/kk-offline/v1/handoffs', secret: 's'.repeat(32), verified: true }, Date.now()), /Closing berubah/);
    assert.equal(sinf.Upload.rows.every(r => r[0] === 'Tidak'), true);
    assert.equal(sinf.Closing.hi.length, 0);
  } finally {
    ctx.kkFetch_ = origFetch; ctx.SpreadsheetApp = origSS;
  }
});

test('R05b: Apps Script validates and builds pretty and ?rest_route= API URLs for /handoffs, /reconcile, and runDiagnostics', () => {
  const validUrls = [
    'https://kk-underwear.id/wp-json/kk-offline/v1/handoffs',
    'https://kk-underwear.id/pmnov/wp-json/kk-offline/v1/handoffs/',
    'https://kk-underwear.id/pmnov/?rest_route=/kk-offline/v1/handoffs',
    'https://kk-underwear.id/pmnov/index.php?rest_route=/kk-offline/v1/handoffs',
    'https://kk-underwear.id/?rest_route=/kk-offline/v1/handoffs',
  ];
  const badUrls = [
    'http://kk-underwear.id/pmnov/?rest_route=/kk-offline/v1/handoffs',
    'https://kk-underwear.id/pmnov/?rest_route=/wp/v2/posts',
    'https://kk-underwear.id/pmnov/?rest_route=/kk-offline/v1/handoffs&extra=1',
    'https://kk-underwear.id/../?rest_route=/kk-offline/v1/handoffs',
    'https://user:pass@kk-underwear.id/pmnov/wp-json/kk-offline/v1/handoffs',
  ];
  const origProps = ctx.PropertiesService, origFetch = ctx.kkFetch_, origBook = ctx.kkBook_, origLogger = ctx.Logger;
  try {
    for (const u of validUrls) {
      ctx.PropertiesService = {
        getScriptProperties: () => ({
          getProperty: k => ({ KK_SYNC_API_URL: u, KK_SYNC_API_SECRET: 's'.repeat(32), KK_SPREADSHEET_ID: 'sheet-id', KK_LAST_CHANGE_ID: '0', KK_IMPORT_RULES_VERIFIED: 'false' }[k] || ''),
        }),
      };
      const cfg = ctx.kkConfig_();
      const isQuery = u.includes('?rest_route=');
      assert.equal(ctx.kkEndpoint_(cfg.url, 'handoffs', 'after_change_id=5&limit=100').endsWith((isQuery ? '&' : '?') + 'after_change_id=5&limit=100'), true);
      assert.equal(ctx.kkEndpoint_(cfg.url, 'reconcile').endsWith('/kk-offline/v1/reconcile'), true);
    }
    for (const u of badUrls) {
      ctx.PropertiesService = {
        getScriptProperties: () => ({
          getProperty: k => ({ KK_SYNC_API_URL: u, KK_SYNC_API_SECRET: 's'.repeat(32), KK_SPREADSHEET_ID: 'sheet-id', KK_LAST_CHANGE_ID: '0' }[k] || ''),
        }),
      };
      assert.throws(() => ctx.kkConfig_(), /URL API HTTPS tidak valid/);
    }
    const fetched = [];
    ctx.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: k => ({ KK_SYNC_API_URL: 'https://kk-underwear.id/pmnov/?rest_route=/kk-offline/v1/handoffs', KK_SYNC_API_SECRET: 's'.repeat(32), KK_SPREADSHEET_ID: 'sheet-id', KK_LAST_CHANGE_ID: '7', KK_IMPORT_RULES_VERIFIED: 'false' }[k] || ''),
      }),
    };
    ctx.kkBook_ = () => ({ getSpreadsheetTimeZone: () => 'Asia/Jakarta' });
    ctx.Logger = { log() {} };
    ctx.kkFetch_ = (cfg, url) => { fetched.push(url); return { success: true, data: [], last_change_id: 7, has_more: false }; };
    const diag = ctx.runDiagnostics();
    assert.equal(diag.ok, true);
    assert.deepEqual(fetched, ['https://kk-underwear.id/pmnov/?rest_route=/kk-offline/v1/handoffs&after_change_id=7&limit=1']);
  } finally {
    ctx.PropertiesService = origProps; ctx.kkFetch_ = origFetch; ctx.kkBook_ = origBook; ctx.Logger = origLogger;
  }
});
