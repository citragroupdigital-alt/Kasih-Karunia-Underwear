const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const php=process.env.KKG_PHP || path.resolve('.tools/php/php.exe');
const phpArgs=(!process.env.KKG_PHP && fs.existsSync(path.resolve('.tools/php/ext/php_openssl.dll')))
  ? ['-d','extension_dir='+path.resolve('.tools/php/ext'),'-d','extension=openssl'] : [];
test('PHP domain behavior',()=>{
  const r=spawnSync(php,[...phpArgs,'tests/domain.php'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);console.log(r.stdout.trim());
});
test('API permission and input validation',()=>{
  const r=spawnSync(php,[...phpArgs,'tests/api.php'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);console.log(r.stdout.trim());
});
test('all distributable PHP files pass native PHP syntax checks',()=>{
  const dir='wordpress/kk-grosir';
  for(const file of fs.readdirSync(dir,{recursive:true}).filter(f=>f.endsWith('.php'))) {
    const r=spawnSync(php,['-l',path.join(dir,file)],{encoding:'utf8'});
    assert.equal(r.status,0,r.stdout+r.stderr);
  }
});
