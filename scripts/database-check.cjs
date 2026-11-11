const {spawn,spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const php=path.resolve('.tools/php/php.exe');
const base=['-d','extension_dir='+path.resolve('.tools/php/ext'),'-d','extension=mysqli'];
function run(file,args=[]) {
  const r=spawnSync(php,[...base,file,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;
}
function worker(args=[]) {
  return new Promise((resolve,reject)=>{
    const p=spawn(php,[...base,'tests/db-worker.php',...args]);
    let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
    p.on('error',reject);p.on('exit',code=>code===0?resolve(JSON.parse(out)):reject(Error(err)));
  });
}
(async()=>{
  console.log(run('tests/db-scenarios.php',['setup']).trim());
  const separate=await Promise.all(Array.from({length:12},()=>worker()));
  assert.equal(new Set(separate.map(r=>r.reference_code)).size,12);
  const token='b'.repeat(64);
  const same=await Promise.all(Array.from({length:8},()=>worker([token])));
  assert.equal(new Set(same.map(r=>r.reference_code)).size,1);
  const retry=await Promise.all(Array.from({length:6},()=>worker(['c'.repeat(64),'a'.repeat(48)])));
  assert.equal(new Set(retry.map(r=>r.reference_code)).size,1);
  const counts=JSON.parse(run('tests/db-scenarios.php',['counts']));
  assert.deepEqual(counts,{references:14,events:21});
  console.log(run('tests/db-scenarios.php').trim());
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/database-results.json',JSON.stringify({distinctVisitors:12,sameBrowserConcurrent:8,idempotentRetries:6,counts,scenarios:'passed'},null,2));
  console.log('Database concurrency checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
