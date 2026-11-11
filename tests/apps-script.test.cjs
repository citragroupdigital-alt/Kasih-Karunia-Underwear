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
  assert.equal(out.length,16);assert.match(out[0],/NOW\(\)-M502/);assert.match(out[1],/Closing!J502="ORDER-1"/);
  assert.match(out[1],/UPPER\(TRIM\(Closing!J\$2:J\)\)/);
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
  assert.match(dupOut[1],/ARRAYFORMULA\(SUMPRODUCT\(.*\)\)>1/);
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
