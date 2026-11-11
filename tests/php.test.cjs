const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const php=process.env.KKG_PHP || path.resolve('.tools/php/php.exe');
test('PHP domain behavior',()=>{
  const r=spawnSync(php,['tests/domain.php'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);console.log(r.stdout.trim());
});
test('API permission and input validation',()=>{
  const r=spawnSync(php,['tests/api.php'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);console.log(r.stdout.trim());
});
test('all distributable PHP files pass native PHP syntax checks',()=>{
  const dir='wordpress/kk-grosir';
  for(const file of fs.readdirSync(dir,{recursive:true}).filter(f=>f.endsWith('.php'))) {
    const r=spawnSync(php,['-l',path.join(dir,file)],{encoding:'utf8'});
    assert.equal(r.status,0,r.stdout+r.stderr);
  }
});
