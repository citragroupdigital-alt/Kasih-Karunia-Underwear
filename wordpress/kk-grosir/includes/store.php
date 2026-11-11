<?php
defined('ABSPATH') || exit;

function kkg_table($name) { global $wpdb; return $wpdb->prefix . 'kkg_' . $name; }
function kkg_sql($query) {
    global $wpdb;
    $result = $wpdb->query($query);
    if ($result === false) { throw new RuntimeException('database'); }
    return $result;
}
function kkg_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    $r = kkg_table('references'); $e = kkg_table('events'); $s = kkg_table('sequences'); $l = kkg_table('limits');
    dbDelta("CREATE TABLE $r (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        reference_code varchar(11) NOT NULL,
        token_hash char(64) NOT NULL DEFAULT '',
        issued_at datetime NOT NULL,
        expires_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY reference_code (reference_code),
        KEY token_expiry (token_hash,expires_at),
        KEY updated_at (updated_at)
    ) ENGINE=InnoDB $charset;");
    dbDelta("CREATE TABLE $e (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        reference_id bigint unsigned NOT NULL,
        request_hash char(64) NOT NULL,
        cta_context varchar(24) NOT NULL,
        handoff_at datetime NOT NULL,
        click_observed_at datetime DEFAULT NULL,
        gclid varchar(512) NOT NULL DEFAULT '',
        gbraid varchar(512) NOT NULL DEFAULT '',
        wbraid varchar(512) NOT NULL DEFAULT '',
        consent_state text NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY request_hash (request_hash),
        KEY reference_time (reference_id,handoff_at),
        KEY handoff_at (handoff_at)
    ) ENGINE=InnoDB $charset;");
    dbDelta("CREATE TABLE $s (
        year smallint unsigned NOT NULL,
        value int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY  (year)
    ) ENGINE=InnoDB $charset;");
    dbDelta("CREATE TABLE $l (
        bucket char(64) NOT NULL,
        expires_at datetime NOT NULL,
        hits int unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY  (bucket),
        KEY expires_at (expires_at)
    ) ENGINE=InnoDB $charset;");
    foreach (array($r, $e, $s, $l) as $table) {
        $engine = $wpdb->get_var($wpdb->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s', $table));
        if (strtoupper((string) $engine) !== 'INNODB') { wp_die('Migrasi KK gagal: semua tabel wajib InnoDB. Pulihkan backup sebelum melanjutkan.'); }
    }
    update_option('kkg_schema', '1', false);
    if (!wp_next_scheduled('kkg_cleanup')) { wp_schedule_event(time() + 3600, 'daily', 'kkg_cleanup'); }
}

function kkg_transaction($callback) {
    global $wpdb;
    $lock = 'kkg_' . substr(hash('sha256', DB_NAME . $wpdb->prefix), 0, 40);
    if ((int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s,5)', $lock)) !== 1) {
        throw new RuntimeException('busy');
    }
    try {
        kkg_sql('START TRANSACTION');
        $result = $callback();
        kkg_sql('COMMIT');
        return $result;
    } catch (Throwable $error) {
        $wpdb->query('ROLLBACK');
        throw $error;
    } finally {
        $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock));
    }
}

/** Administrative erasure for a verified request. Never called by the public API. */
function kkg_erase_reference($code) {
    global $wpdb;
    if (!current_user_can('manage_options') || !kkg_valid_reference($code)) {
        throw new InvalidArgumentException('not_authorized');
    }
    return kkg_transaction(function () use ($code, $wpdb) {
        $r = kkg_table('references'); $e = kkg_table('events');
        $id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $r WHERE reference_code=%s", $code));
        if (!$id) { return false; }
        kkg_sql($wpdb->prepare("DELETE FROM $e WHERE reference_id=%d", $id));
        // Keep the code reserved, but remove browser linkage. Closing lives in Sheets.
        kkg_sql($wpdb->prepare("UPDATE $r SET token_hash='',expires_at=%s WHERE id=%d", kkg_utc(time()), $id));
        return true;
    });
}

function kkg_rate_limit($scope, $limit) {
    global $wpdb;
    $table = kkg_table('limits');
    // Never trust arbitrary X-Forwarded-For. Configure the trusted proxy at the server.
    $address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $hash = hash_hmac('sha256', $scope . '|' . $address . '|' . floor(time() / 60), wp_salt('auth'));
    $expires = kkg_utc(time() + 120);
    kkg_sql($wpdb->prepare("INSERT INTO $table (bucket,expires_at,hits) VALUES (%s,%s,1) ON DUPLICATE KEY UPDATE hits=hits+1", $hash, $expires));
    return (int) $wpdb->get_var($wpdb->prepare("SELECT hits FROM $table WHERE bucket=%s", $hash)) <= $limit;
}

function kkg_handoff_store($input) {
    global $wpdb;
    return kkg_transaction(function () use ($input, $wpdb) {
        $r = kkg_table('references'); $e = kkg_table('events'); $s = kkg_table('sequences');
        $now = time(); $utc = kkg_utc($now);
        $request_hash = hash_hmac('sha256', $input['request_id'] . '|' . $input['token'], wp_salt('auth'));
        $existing = $wpdb->get_row($wpdb->prepare("SELECT r.* FROM $e e JOIN $r r ON r.id=e.reference_id WHERE e.request_hash=%s", $request_hash), ARRAY_A);
        if ($existing) { $existing['id'] = (int) $existing['id']; return $existing; }
        $token_hash = $input['token'] ? hash_hmac('sha256', $input['token'], wp_salt('auth')) : '';
        $reference = $token_hash ? $wpdb->get_row($wpdb->prepare("SELECT * FROM $r WHERE token_hash=%s AND expires_at>%s ORDER BY id DESC LIMIT 1", $token_hash, $utc), ARRAY_A) : null;
        if (!$reference) {
            $year = (int) (new DateTimeImmutable('@' . $now))->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('Y');
            kkg_sql($wpdb->prepare("INSERT IGNORE INTO $s (year,value) VALUES (%d,0)", $year));
            $value = (int) $wpdb->get_var($wpdb->prepare("SELECT value FROM $s WHERE year=%d FOR UPDATE", $year)) + 1;
            $code = kkg_reference($now, $value);
            kkg_sql($wpdb->prepare("UPDATE $s SET value=%d WHERE year=%d", $value, $year));
            if ($value >= 9000) { update_option('kkg_health', 'Kapasitas kode tahun ini mendekati batas: ' . $value . '/9999', false); }
            $reference = array('reference_code' => $code, 'token_hash' => $token_hash,
                'issued_at' => $utc, 'expires_at' => kkg_utc($now + 86400), 'updated_at' => $utc);
            if ($wpdb->insert($r, $reference) === false) { throw new RuntimeException('database'); }
            $reference['id'] = (int) $wpdb->insert_id;
        }
        $reference['id'] = (int) $reference['id'];
        $previous = $wpdb->get_row($wpdb->prepare("SELECT * FROM $e WHERE reference_id=%d ORDER BY id DESC LIMIT 1", $reference['id']), ARRAY_A);
        $click = $input['click'];
        $has_click = implode('', $click) !== '';
        $observed = null;
        if ($has_click) {
            $same = $previous && $previous['gclid'] === $click['gclid'] && $previous['gbraid'] === $click['gbraid'] && $previous['wbraid'] === $click['wbraid'];
            $observed = $same ? $previous['click_observed_at'] : $utc;
        } elseif ($previous && $input['consent']['advertising']) {
            foreach ($click as $key => $unused) { $click[$key] = $previous[$key]; }
            $observed = $previous['click_observed_at'];
        }
        $event = array_merge($click, array('reference_id' => $reference['id'], 'request_hash' => $request_hash,
            'cta_context' => $input['cta_context'], 'handoff_at' => $utc,
            'click_observed_at' => $observed, 'consent_state' => wp_json_encode($input['consent'])));
        if ($wpdb->insert($e, $event) === false ||
            $wpdb->update($r, array('updated_at' => $utc), array('id' => $reference['id'])) === false) {
            throw new RuntimeException('database');
        }
        return $reference;
    });
}

function kkg_sync_store($cursor, $limit) {
    global $wpdb;
    $floor = (int) get_option('kkg_retention_cursor', 0);
    if ($cursor > 0 && $cursor < $floor) { throw new RuntimeException('cursor_expired'); }
    $r = kkg_table('references'); $e = kkg_table('events');
    $rows = $wpdb->get_results($wpdb->prepare("SELECT e.*,r.reference_code FROM $e e JOIN $r r ON r.id=e.reference_id WHERE e.id>%d ORDER BY e.id ASC LIMIT %d", $cursor, $limit + 1), ARRAY_A);
    if ($wpdb->last_error) { throw new RuntimeException('database'); }
    $more = count($rows) > $limit;
    $data = array();
    foreach (array_slice($rows, 0, $limit) as $row) {
        $data[] = array('change_id' => (int) $row['id'], 'id' => (int) $row['reference_id'],
            'reference_code' => $row['reference_code'], 'gclid' => $row['gclid'],
            'gbraid' => $row['gbraid'], 'wbraid' => $row['wbraid'],
            'created_at' => kkg_iso($row['click_observed_at'] ?: $row['handoff_at']),
            'handoff_at' => kkg_iso($row['handoff_at']), 'landing_page' => '/grosir/', 'wa_context' => $row['cta_context']);
        $cursor = (int) $row['id'];
    }
    update_option('kkg_last_sync', kkg_utc(time()), false);
    return array('success' => true, 'data' => $data, 'last_change_id' => $cursor, 'has_more' => $more);
}

function kkg_lookup_store($reference, $paid_at) {
    global $wpdb;
    $r = kkg_table('references'); $e = kkg_table('events');
    $id = $wpdb->get_var($wpdb->prepare("SELECT id FROM $r WHERE reference_code=%s", $reference));
    if ($wpdb->last_error) { throw new RuntimeException('database'); }
    if (!$id) { return array('status' => 'not_found'); }
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM $e WHERE reference_id=%d AND handoff_at<=%s AND click_observed_at<=%s AND (gclid<>'' OR gbraid<>'' OR wbraid<>'') ORDER BY click_observed_at DESC,id DESC LIMIT 1", $id, $paid_at, $paid_at), ARRAY_A);
    if ($wpdb->last_error) { throw new RuntimeException('database'); }
    if (!$row) { return array('status' => 'no_eligible_click'); }
    return array('status' => 'matched', 'event_id' => (int) $row['id'], 'reference_id' => (int) $id,
        'gclid' => $row['gclid'], 'gbraid' => $row['gbraid'], 'wbraid' => $row['wbraid'],
        'click_observed_at' => kkg_iso($row['click_observed_at']));
}

function kkg_cleanup() {
    global $wpdb;
    $settings = kkg_settings();
    $limits = kkg_table('limits');
    $wpdb->query($wpdb->prepare("DELETE FROM $limits WHERE expires_at<%s", kkg_utc(time())));
    if (!$settings['privacy_reviewed'] || !$settings['cleanup_enabled']) { return; }
    try {
        kkg_transaction(function () use ($wpdb, $settings) {
            $r = kkg_table('references'); $e = kkg_table('events'); $l = kkg_table('limits');
            $now = kkg_utc(time());
            $cutoff = kkg_utc(time() - $settings['retention_days'] * 86400);
            $last = (int) $wpdb->get_var($wpdb->prepare("SELECT MAX(id) FROM $e WHERE handoff_at<%s", $cutoff));
            kkg_sql($wpdb->prepare("DELETE FROM $e WHERE handoff_at<%s", $cutoff));
            kkg_sql($wpdb->prepare("UPDATE $r SET token_hash='' WHERE expires_at<%s AND token_hash<>''", $now));
            kkg_sql($wpdb->prepare("DELETE FROM $r WHERE updated_at<%s AND id NOT IN (SELECT reference_id FROM $e)", $cutoff));
            kkg_sql($wpdb->prepare("DELETE FROM $l WHERE expires_at<%s", $now));
            if ($last) { update_option('kkg_retention_cursor', max($last, (int) get_option('kkg_retention_cursor', 0)), false); }
        });
    } catch (Throwable $error) { update_option('kkg_health', 'Cleanup gagal; periksa database.', false); }
}
