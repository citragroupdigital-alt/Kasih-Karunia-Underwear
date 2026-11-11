<?php
require __DIR__ . '/db-bootstrap.php';
function verify($truth, $message) { if (!$truth) throw new RuntimeException($message); }
if (($argv[1] ?? '') === 'setup') {
    // This test database is dedicated and local. Do not point this harness at a real database.
    foreach (array('events','references','sequences','limits') as $t) $wpdb->query('DROP TABLE IF EXISTS '.kkg_table($t));
    kkg_install(); kkg_install();
    echo "test schema installed twice\n"; exit;
}
if (($argv[1] ?? '') === 'counts') {
    echo json_encode(array('references'=>(int)$wpdb->get_var('SELECT COUNT(*) FROM '.kkg_table('references')),
        'events'=>(int)$wpdb->get_var('SELECT COUNT(*) FROM '.kkg_table('events'))));exit;
}
$r = kkg_table('references'); $e = kkg_table('events'); $s = kkg_table('sequences');
$input = fixture_input(); $first = kkg_handoff_store($input);
$again = kkg_handoff_store($input);
verify($first['id'] === $again['id'], 'retry reference');
verify((int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $e WHERE reference_id=%d",$first['id'])) === 1, 'retry event');
$input['request_id'] = bin2hex(random_bytes(24));
$second = kkg_handoff_store($input);
verify($first['id'] === $second['id'] && $first['expires_at'] === $second['expires_at'], 'fixed expiry reuse');
$wpdb->query($wpdb->prepare("UPDATE $r SET expires_at=%s WHERE id=%d", kkg_utc(time()-1), $first['id']));
$input['request_id'] = bin2hex(random_bytes(24)); $third = kkg_handoff_store($input);
verify($third['id'] !== $first['id'], 'expired new code');
// Put first click before payment, then observe a different click after that payment.
$wpdb->query($wpdb->prepare("UPDATE $e SET handoff_at=%s,click_observed_at=%s WHERE reference_id=%d",
    kkg_utc(time()-120),kkg_utc(time()-120),$third['id']));
$input['request_id'] = bin2hex(random_bytes(24)); $input['click']['gclid']='later-click';
kkg_handoff_store($input);
$historical = kkg_lookup_store($third['reference_code'],kkg_utc(time()-60));
verify($historical['gclid'] === 'fixture-click', 'as-of excludes later click');
verify(kkg_lookup_store($third['reference_code'],kkg_utc(time()))['gclid']==='later-click','latest eligible click');
verify(kkg_lookup_store($third['reference_code'],kkg_utc(time()-300))['status']==='no_eligible_click','before any click');
$batch=kkg_sync_store(0,100);
verify($batch['success'] && count($batch['data']) > 0, 'sync batch');
for($i=1;$i<count($batch['data']);$i++) verify($batch['data'][$i]['change_id']>$batch['data'][$i-1]['change_id'],'ordered cursor');
$year=(int)(new DateTimeImmutable('now',new DateTimeZone('Asia/Jakarta')))->format('Y');
$wpdb->query($wpdb->prepare("UPDATE $s SET value=9998 WHERE year=%d",$year));
$last=kkg_handoff_store(fixture_input());verify(substr($last['reference_code'],-4)==='9999','last capacity');
$full=false;try{kkg_handoff_store(fixture_input());}catch(RuntimeException $x){$full=$x->getMessage()==='capacity';}
verify($full,'capacity stops');
verify((int)$wpdb->get_var($wpdb->prepare("SELECT value FROM $s WHERE year=%d",$year))===9999,'capacity no wrap');
// Repeat orders against the same Reference Code share eligible attribution.
$r1=kkg_lookup_store($third['reference_code'],kkg_utc(time()-50));
$r2=kkg_lookup_store($third['reference_code'],kkg_utc(time()));
verify($r1['status']==='matched' && $r2['status']==='matched' && $r1['reference_id']===$r2['reference_id'],'repeat order attribution');
// Administrative erasure removes events & token linkage while keeping code reserved.
verify(kkg_erase_reference($third['reference_code'])===true,'erasure succeeds');
verify(kkg_lookup_store($third['reference_code'],kkg_utc(time()))['status']==='no_eligible_click','erased code has no click history');
verify((int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $e WHERE reference_id=%d",$third['id']))===0,'erased events removed');
verify((int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $r WHERE id=%d AND token_hash=''",$third['id']))===1,'erased code reserved without token');
$GLOBALS['kkg_test_options']['kkg_settings']=array('mode'=>'staging','privacy_reviewed'=>1,'cleanup_enabled'=>1,'retention_days'=>180);
$wpdb->query($wpdb->prepare("UPDATE $e SET handoff_at=%s WHERE reference_id=%d",kkg_utc(time()-181*86400),$first['id']));
$wpdb->query($wpdb->prepare("UPDATE $r SET updated_at=%s WHERE id=%d",kkg_utc(time()-181*86400),$first['id']));
kkg_cleanup();
verify(kkg_lookup_store($first['reference_code'],kkg_utc(time()))['status']==='not_found','retention cleanup');
verify((int)$wpdb->get_var($wpdb->prepare("SELECT value FROM $s WHERE year=%d",$year))===9999,'cleanup preserves sequence');
$expiredCursor=false;try{kkg_sync_store(1,10);}catch(RuntimeException $x){$expiredCursor=$x->getMessage()==='cursor_expired';}
verify($expiredCursor,'cursor below retention floor rejected');
// Rate limit enforces threshold per IP/scope bucket.
$_SERVER['REMOTE_ADDR']='127.0.0.1';
verify(kkg_rate_limit('test_rl',2)===true && kkg_rate_limit('test_rl',2)===true && kkg_rate_limit('test_rl',2)===false,'rate limit enforces cap');
echo "Database scenarios passed: retry, reuse, expiry, chronology, cursor, capacity, repeat, erasure, retention, rate-limit\n";
