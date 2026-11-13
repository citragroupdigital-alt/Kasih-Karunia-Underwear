<?php
defined('ABSPATH') || exit;

function kkg_settings() {
    return array_merge(array(
        'mode' => 'off', 'page_id' => 0, 'phone' => '62895339293140', 'address' => '',
        'message' => "Halo CS CV. Kasih Karunia, saya ingin meminta katalog dan informasi harga grosir pakaian dalam, kaos kaki, serta handuk.\n{reference}\nTerima kasih.",
        'consent_mode' => 'disabled', 'policy_version' => 'draft-1',
        'privacy_reviewed' => 0, 'claims_reviewed' => 0, 'assets_reviewed' => 0, 'release_reviewed' => 0,
        'retention_days' => 180, 'cleanup_enabled' => 0,
        'logo' => 0, 'hero' => 0, 'about' => 0,
        'category_0' => 0, 'category_1' => 0, 'category_2' => 0, 'category_3' => 0, 'category_4' => 0,
    ), (array) get_option('kkg_settings', array()));
}

function kkg_bundled_asset($key) {
    $map = array(
        'logo' => array('rel' => 'assets/logo-kk.webp', 'width' => 640, 'height' => 480),
        'hero' => array('rel' => 'assets/hero-kk.webp', 'width' => 1200, 'height' => 1200),
        'about' => array('rel' => 'assets/about-gudang-kk.webp', 'width' => 960, 'height' => 1192),
        'category_0' => array('rel' => 'assets/category-0-bra-wanita.webp', 'width' => 826, 'height' => 1026),
        'category_1' => array('rel' => 'assets/category-1-cd-pria.webp', 'width' => 826, 'height' => 1026),
        'category_2' => array('rel' => 'assets/category-2-cd-wanita.webp', 'width' => 826, 'height' => 1026),
        'category_3' => array('rel' => 'assets/category-3-kaos-kaki.webp', 'width' => 826, 'height' => 1026),
        'category_4' => array('rel' => 'assets/category-4-handuk.webp', 'width' => 826, 'height' => 1026),
    );
    if (!isset($map[$key])) { return null; }
    return file_exists(KKG_DIR . $map[$key]['rel']) ? $map[$key] : null;
}

function kkg_privacy_policy_blocker($s) {
    $pp_id = (int) get_option('wp_page_for_privacy_policy', 0);
    if ($pp_id > 0 && !empty($s['page_id']) && $pp_id === (int) $s['page_id']) {
        return 'Privacy Policy menunjuk ke halaman /grosir/ (harus halaman terpisah)';
    }
    if ($pp_id > 0 && function_exists('get_post_status')) {
        $status = (string) get_post_status($pp_id);
        if ($status !== 'publish') {
            return 'Privacy Policy masih berstatus ' . ($status !== '' ? $status : 'non-publish') . ' (publikasikan & tetapkan di Settings → Privacy setelah disetujui)';
        }
    }
    if (!get_privacy_policy_url()) {
        return 'Privacy Policy belum ditetapkan atau belum dipublikasikan di Settings → Privacy';
    }
    return '';
}

function kkg_release_blockers($s) {
    $errors = array();
    foreach (array('privacy_reviewed', 'claims_reviewed', 'assets_reviewed', 'release_reviewed') as $key) {
        if (empty($s[$key])) { $errors[] = $key; }
    }
    if (!preg_match('/^62\d{8,13}$/D', $s['phone'])) { $errors[] = 'Nomor CS resmi'; }
    if (!$s['page_id'] || get_post_field('post_name', $s['page_id']) !== 'grosir' ||
        !has_shortcode(get_post_field('post_content', $s['page_id']), 'kk_grosir')) { $errors[] = 'Halaman grosir + shortcode'; }
    if ($pp_blocker = kkg_privacy_policy_blocker($s)) { $errors[] = $pp_blocker; }
    if ($s['consent_mode'] === 'disabled') { $errors[] = 'Adapter CMP atau consent hasil audit'; }
    foreach (array('logo', 'hero', 'about', 'category_0', 'category_1', 'category_2', 'category_3', 'category_4') as $key) {
        if (kkg_bundled_asset($key)) { continue; }
        if (!wp_attachment_is_image($s[$key])) { $errors[] = 'Aset ' . $key; }
    }
    return $errors;
}

function kkg_sync_crypto_key() {
    $parts = array();
    foreach (array('AUTH_KEY', 'SECURE_AUTH_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_KEY') as $c) {
        if (defined($c) && is_string(constant($c))) {
            $v = constant($c);
            if (strlen($v) >= 16 && strpos($v, 'put your unique phrase here') === false) {
                $parts[] = $v;
            }
        }
    }
    // In real WordPress, refuse wp_salt() DB fallback so encryption key never sits beside ciphertext in wp_options.
    if (defined('WPINC') && count($parts) < 2) { return ''; }
    $material = count($parts) >= 2 ? implode('|', $parts) : (function_exists('wp_salt') ? wp_salt('auth') . '|' . wp_salt('secure_auth') : '');
    return strlen($material) >= 32 ? hash('sha256', 'kkg_sync_secret_v1|' . $material, true) : '';
}

function kkg_sync_crypto_available() {
    if (kkg_sync_crypto_key() === '') { return false; }
    $has_gcm = function_exists('openssl_encrypt') && function_exists('openssl_decrypt') &&
        function_exists('openssl_get_cipher_methods') && in_array('aes-256-gcm', openssl_get_cipher_methods(), true);
    return $has_gcm || (function_exists('sodium_crypto_secretbox') && function_exists('sodium_crypto_secretbox_open'));
}

function kkg_encrypt_secret($plain) {
    if (!is_string($plain) || preg_match('/^[!-~]{32,256}$/', $plain) !== 1) { return ''; }
    $key = kkg_sync_crypto_key();
    if ($key === '') { return ''; }
    if (function_exists('openssl_encrypt') && function_exists('openssl_get_cipher_methods') &&
        in_array('aes-256-gcm', openssl_get_cipher_methods(), true)) {
        $iv = random_bytes(12);
        $tag = '';
        $ct = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, 'kkg_sync_secret_v1', 16);
        return ($ct !== false && strlen($tag) === 16) ? 'v1:' . base64_encode($iv . $tag . $ct) : '';
    }
    if (function_exists('sodium_crypto_secretbox')) {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        return 's1:' . base64_encode($nonce . sodium_crypto_secretbox($plain, $nonce, $key));
    }
    return '';
}

function kkg_decrypt_secret($payload) {
    $key = kkg_sync_crypto_key();
    if ($key === '' || !is_string($payload)) { return ''; }
    if (strpos($payload, 'v1:') === 0 && function_exists('openssl_decrypt') &&
        function_exists('openssl_get_cipher_methods') && in_array('aes-256-gcm', openssl_get_cipher_methods(), true)) {
        $raw = base64_decode(substr($payload, 3), true);
        if (!is_string($raw) || strlen($raw) < 60) { return ''; }
        $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16), 'kkg_sync_secret_v1');
        return is_string($plain) && preg_match('/^[!-~]{32,256}$/', $plain) === 1 ? $plain : '';
    }
    if (strpos($payload, 's1:') === 0 && function_exists('sodium_crypto_secretbox_open')) {
        $raw = base64_decode(substr($payload, 3), true);
        $nlen = SODIUM_CRYPTO_SECRETBOX_NONCEBYTES;
        if (!is_string($raw) || strlen($raw) < $nlen + 32) { return ''; }
        try {
            $plain = sodium_crypto_secretbox_open(substr($raw, $nlen), substr($raw, 0, $nlen), $key);
            return is_string($plain) && preg_match('/^[!-~]{32,256}$/', $plain) === 1 ? $plain : '';
        } catch (Throwable $e) { return ''; }
    }
    return '';
}

function kkg_get_sync_secret() {
    if (defined('KKG_SYNC_SECRET') && is_string(KKG_SYNC_SECRET) && KKG_SYNC_SECRET !== '') {
        return strlen(KKG_SYNC_SECRET) >= 32 ? KKG_SYNC_SECRET : '';
    }
    $box = get_option('kkg_sync_secret_box', '');
    return is_string($box) && $box !== '' ? kkg_decrypt_secret($box) : '';
}

function kkg_sync_secret_source() {
    if (defined('KKG_SYNC_SECRET') && is_string(KKG_SYNC_SECRET) && KKG_SYNC_SECRET !== '') {
        return strlen(KKG_SYNC_SECRET) >= 32 ? 'constant' : 'constant_weak';
    }
    $box = get_option('kkg_sync_secret_box', '');
    if (!is_string($box) || $box === '') { return 'none'; }
    return kkg_decrypt_secret($box) !== '' ? 'option' : 'option_unreadable';
}

function kkg_save_sync_secret_input($raw_secret, $clear = false) {
    if ($raw_secret === '' && !$clear) { return; }
    if (get_option('kkg_schema') === '1' && function_exists('kkg_rate_limit') && !kkg_rate_limit('admin_secret', 20)) {
        wp_die('Terlalu banyak percobaan pengaturan secret. Coba lagi sebentar.', '', array('response' => 429));
    }
    if ($clear && $raw_secret === '') {
        delete_option('kkg_sync_secret_box');
        delete_option('kkg_sync_secret_rotated_at');
        return;
    }
    if (!is_string($raw_secret) || preg_match('/^[!-~]{32,256}$/', $raw_secret) !== 1) {
        wp_die('Secret sync harus 32–256 karakter ASCII tanpa spasi atau baris baru.', '', array('response' => 400));
    }
    $box = kkg_encrypt_secret($raw_secret);
    if ($box === '') {
        wp_die('Enkripsi secret di server tidak tersedia. Pasang KKG_SYNC_SECRET melalui wp-config.php.', '', array('response' => 500));
    }
    update_option('kkg_sync_secret_box', $box, false);
    update_option('kkg_sync_secret_rotated_at', gmdate('Y-m-d H:i:s'), false);
}

function kkg_admin_menu() {
    add_options_page('KK Grosir', 'KK Grosir', 'manage_options', 'kk-grosir', 'kkg_admin_page');
}

function kkg_admin_assets($hook) {
    if ($hook !== 'settings_page_kk-grosir') { return; }
    wp_enqueue_media();
    wp_enqueue_style('kk-grosir-admin', KKG_URL . 'assets/admin.css', array(), KKG_VERSION);
    wp_enqueue_script('kk-grosir-admin', KKG_URL . 'assets/admin.js', array(), KKG_VERSION, true);
}

function kkg_save_settings() {
    if (!current_user_can('manage_options')) { wp_die('Tidak diizinkan.', '', array('response' => 403)); }
    check_admin_referer('kkg_settings');
    $s = kkg_settings();
    foreach (array('phone', 'address', 'message', 'policy_version') as $key) {
        $s[$key] = sanitize_textarea_field(wp_unslash($_POST[$key] ?? ''));
    }
    $s['phone'] = preg_replace('/\D/', '', $s['phone']);
    if ($s['phone'] && !preg_match('/^62\d{8,13}$/D', $s['phone'])) { wp_die('Nomor harus menggunakan format 62...'); }
    if (!$s['message'] || strpos($s['message'], '{reference}') === false || !$s['policy_version']) {
        wp_die('Template harus memuat {reference}; versi kebijakan wajib diisi.');
    }
    foreach (array('privacy_reviewed', 'claims_reviewed', 'assets_reviewed', 'release_reviewed', 'cleanup_enabled') as $key) {
        $s[$key] = isset($_POST[$key]) ? 1 : 0;
    }
    foreach (array('page_id', 'logo', 'hero', 'about', 'category_0', 'category_1', 'category_2', 'category_3', 'category_4') as $key) {
        $s[$key] = absint($_POST[$key] ?? 0);
    }
    $s['retention_days'] = max(1, min(180, absint($_POST['retention_days'] ?? 180)));
    $s['consent_mode'] = in_array($_POST['consent_mode'] ?? '', array('disabled', 'standalone', 'external'), true) ? $_POST['consent_mode'] : 'disabled';
    $s['mode'] = in_array($_POST['mode'] ?? '', array('off', 'staging', 'active'), true) ? $_POST['mode'] : 'off';
    $raw_secret = isset($_POST['sync_secret']) && is_string($_POST['sync_secret']) ? wp_unslash($_POST['sync_secret']) : '';
    kkg_save_sync_secret_input($raw_secret, !empty($_POST['clear_sync_secret']));
    if ($s['mode'] === 'active' && ($errors = kkg_release_blockers($s))) {
        wp_die('Aktif diblokir: ' . esc_html(implode(', ', $errors)));
    }
    update_option('kkg_settings', $s, false);
    wp_safe_redirect(admin_url('options-general.php?page=kk-grosir&saved=1'));
    exit;
}

function kkg_handle_erase() {
    if (!current_user_can('manage_options')) { wp_die('Tidak diizinkan.', '', array('response' => 403)); }
    check_admin_referer('kkg_erase');
    $code = strtoupper(trim(sanitize_text_field(wp_unslash($_POST['reference_code'] ?? ''))));
    if (!kkg_valid_reference($code)) { wp_die('Format Reference Code tidak valid.', '', array('response' => 400)); }
    $erased = kkg_erase_reference($code);
    wp_safe_redirect(admin_url('options-general.php?page=kk-grosir&erased=' . ($erased ? '1' : '0')));
    exit;
}

function kkg_admin_page() {
    if (!current_user_can('manage_options')) { return; }
    $s = kkg_settings();
    $blockers = kkg_release_blockers($s);
    echo '<div class="wrap"><h1>KK Grosir</h1><p>Default off. Staging hanya dapat dilihat admin. Jangan centang persetujuan sebelum audit terkait selesai.</p>';
    echo '<div class="kkg-admin-cards"><div class="kkg-admin-card"><h2>Status Integrasi</h2>';
    $source_labels = array(
        'constant' => 'Terpasang via wp-config.php (prioritas utama)',
        'constant_weak' => 'Konstanta wp-config.php < 32 karakter (API terkunci 401)',
        'option' => 'Tersimpan terenkripsi via WP Admin',
        'option_unreadable' => 'Data secret WP Admin tidak terbaca/rusak (API terkunci 401)',
        'none' => 'Belum terpasang (API privat terkunci 401)',
    );
    $secret_source = kkg_sync_secret_source();
    $rotated_at = (string) get_option('kkg_sync_secret_rotated_at', '');
    echo '<p>Schema: <strong>' . esc_html(get_option('kkg_schema', 'belum dibuat')) .
        '</strong> · Sync terakhir (UTC): <strong>' . esc_html(get_option('kkg_last_sync', 'belum')) .
        '</strong> · Kesehatan: <strong>' . esc_html(get_option('kkg_health', 'OK')) . '</strong></p>';
    echo '<p>Secret API: <strong>' . esc_html($source_labels[$secret_source] ?? 'Belum terpasang') . '</strong>' .
        ($rotated_at ? ' · Rotasi WP Admin (UTC): <strong>' . esc_html($rotated_at) . '</strong>' : '') .
        '. Nilai secret tidak pernah ditampilkan ulang.</p></div>';
    echo '<div class="kkg-admin-card"><h2>Kesiapan Go-Live (Mode Active)</h2>';
    if (!$blockers) {
        echo '<span class="kkg-admin-badge kkg-admin-badge-ok">Siap rilis (0 blocker)</span><p>Seluruh prasyarat rilis terpenuhi.</p>';
    } else {
        echo '<span class="kkg-admin-badge kkg-admin-badge-warn">' . count($blockers) . ' blocker tersisa</span><ul class="kkg-admin-blockers">';
        foreach ($blockers as $b) { echo '<li>' . esc_html($b) . '</li>'; }
        echo '</ul>';
    }
    echo '</div></div>';
    $warnings = array();
    if (!empty($s['privacy_reviewed']) && (kkg_privacy_policy_blocker($s) !== '' || $s['consent_mode'] === 'disabled')) {
        $warnings[] = 'privacy_reviewed dicentang, tetapi Privacy Policy terpublikasi atau mode consent teraudit belum siap. Kosongkan centang bila audit legal/CMP belum final.';
    }
    if (!empty($s['release_reviewed']) && $blockers) {
        $warnings[] = 'release_reviewed dicentang, tetapi blocker rilis lain masih terbuka. Pastikan QA staging, backup/restore, rollback, dan izin eksplisit pemilik benar-benar selesai.';
    }
    if (!empty($s['cleanup_enabled']) && empty($s['privacy_reviewed'])) {
        $warnings[] = 'cleanup_enabled aktif, tetapi jadwal WP-Cron kkg_cleanup tetap tidak menghapus data selama privacy_reviewed belum aktif.';
    }
    if ($warnings) {
        echo '<div class="kkg-admin-alert"><strong>Peringatan Status Approval (PRIV-01 / PRIV-05)</strong><ul>';
        foreach ($warnings as $w) { echo '<li>' . esc_html($w) . '</li>'; }
        echo '</ul></div>';
    }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="kkg_settings">';
    wp_nonce_field('kkg_settings');
    echo '<table class="form-table">';
    foreach (array('mode' => array('off', 'staging', 'active'), 'consent_mode' => array('disabled', 'standalone', 'external')) as $key => $choices) {
        echo '<tr><th><label for="kkg-' . esc_attr($key) . '">' . esc_html($key) . '</label></th><td><select id="kkg-' . esc_attr($key) . '" name="' . esc_attr($key) . '">';
        foreach ($choices as $choice) { echo '<option value="' . esc_attr($choice) . '" ' . selected($s[$key], $choice, false) . '>' . esc_html($choice) . '</option>'; }
        echo '</select></td></tr>';
    }
    $fields = array(
        'page_id' => array('ID halaman /grosir/', 'number'),
        'phone' => array('WhatsApp CS (62...)', 'tel'),
        'address' => array('Alamat toko & gudang Surabaya (untuk Schema JSON-LD)', 'textarea'),
        'message' => array('Pesan WA ({reference})', 'textarea'),
        'policy_version' => array('Versi kebijakan consent', 'text'),
        'retention_days' => array('Retensi DB, hari (maks. 180)', 'number'),
        'logo' => array('Logo (opsional override aset bundel)', 'media'),
        'hero' => array('Foto produk Hero (opsional override aset bundel; disarankan foto asli saat live)', 'media'),
        'about' => array('Foto profil perusahaan (opsional override aset bundel; disarankan foto asli saat live)', 'media'),
        'category_0' => array('Foto Bra Wanita (opsional override aset bundel)', 'media'),
        'category_1' => array('Foto Celana Dalam Pria (opsional override aset bundel)', 'media'),
        'category_2' => array('Foto Celana Dalam Wanita (opsional override aset bundel)', 'media'),
        'category_3' => array('Foto Kaos Kaki (opsional override aset bundel)', 'media'),
        'category_4' => array('Foto Handuk (opsional override aset bundel)', 'media'),
    );
    foreach ($fields as $key => $meta) {
        list($label, $type) = $meta;
        echo '<tr><th><label for="kkg-' . esc_attr($key) . '">' . esc_html($label) . '</label></th><td>';
        if ($type === 'textarea') {
            echo '<textarea rows="' . ($key === 'message' ? '4' : '2') . '" class="large-text" id="kkg-' . esc_attr($key) . '" name="' . esc_attr($key) . '">' . esc_textarea((string) $s[$key]) . '</textarea>';
        } elseif ($type === 'media') {
            $id = (int) $s[$key];
            $thumb = wp_attachment_is_image($id) ? wp_get_attachment_image($id, 'thumbnail') : (kkg_bundled_asset($key) ? 'Bundel' : 'Kosong');
            echo '<div class="kkg-media-field"><div class="kkg-media-preview">' . $thumb . '</div>';
            echo '<input type="number" min="0" class="small-text" id="kkg-' . esc_attr($key) . '" name="' . esc_attr($key) . '" value="' . esc_attr((string) $id) . '">';
            echo '<button type="button" class="button button-secondary" data-kkg-media-pick>Pilih Gambar</button>';
            echo '<button type="button" class="button" data-kkg-media-clear>Hapus</button></div>';
        } else {
            $attrs = $key === 'retention_days' ? ' min="1" max="180"' : ($type === 'number' ? ' min="0"' : '');
            echo '<input type="' . esc_attr($type) . '"' . $attrs . ' class="regular-text kkg-admin-input" id="kkg-' . esc_attr($key) . '" name="' . esc_attr($key) . '" value="' . esc_attr((string) $s[$key]) . '">';
        }
        echo '</td></tr>';
    }
    foreach (array(
        'privacy_reviewed' => array('Audit privacy/CMP dan retensi disetujui', 'Jangan centang sebelum halaman Privacy Policy terbit di Settings → Privacy dan audit CMP selesai.'),
        'claims_reviewed' => array('Empat klaim USP terbukti dan disetujui', 'Jangan centang sebelum empat klaim USP divalidasi pemilik.'),
        'assets_reviewed' => array('Foto asli, logo, dan nomor CS disetujui', 'Jangan centang sebelum aset final dan nomor CS resmi dikonfirmasi.'),
        'release_reviewed' => array('QA, backup/restore, rollback dan rilis disetujui eksplisit', 'Centang hanya setelah QA staging `pmnov`, Google Sheets, backup, rollback, dan persetujuan rilis pemilik selesai.'),
        'cleanup_enabled' => array('Jalankan cleanup retensi yang disetujui', 'Berjalan terjadwal melalui WP-Cron (kkg_cleanup) hanya bila privacy_reviewed juga aktif; bukan bukti cleanup sudah teruji.'),
    ) as $key => $meta) {
        echo '<tr><th>' . esc_html($key) . '</th><td><label><input type="checkbox" name="' . esc_attr($key) . '" value="1" ' . checked($s[$key], 1, false) . '> ' . esc_html($meta[0]) . '</label><p class="description">' . esc_html($meta[1]) . '</p></td></tr>';
    }
    echo '<tr><th><label for="kkg-sync-secret">Secret sync Apps Script (write-only)</label></th><td>';
    echo '<input type="password" id="kkg-sync-secret" name="sync_secret" value="" autocomplete="new-password" minlength="32" maxlength="256" class="regular-text kkg-admin-input" placeholder="Isi 32–256 karakter untuk set/rotasi">';
    echo '<p class="description">Prioritas: <code>KKG_SYNC_SECRET</code> di <code>wp-config.php</code> selalu diutamakan. Kosongkan jika tidak mengubah secret yang tersimpan. Disimpan terenkripsi (non-autoload) dengan key material dari salt <code>wp-config.php</code>.</p>';
    if (!kkg_sync_crypto_available()) {
        echo '<p class="description"><strong>Catatan server:</strong> Enkripsi PHP atau salt <code>wp-config.php</code> tidak memenuhi syarat; gunakan <code>KKG_SYNC_SECRET</code> di server.</p>';
    }
    if (get_option('kkg_sync_secret_box', '') !== '') {
        echo '<label><input type="checkbox" name="clear_sync_secret" value="1"> Hapus secret yang tersimpan di WP Admin</label>';
    }
    echo '</td></tr>';
    echo '</table>';
    submit_button();
    echo '</form></div>';
    if (get_option('kkg_schema') === '1') {
        global $wpdb;
        $events = kkg_table('events'); $refs = kkg_table('references');
        $count = (int) $wpdb->get_var("SELECT COUNT(*) FROM $events");
        $references = (int) $wpdb->get_var("SELECT COUNT(*) FROM $refs");
        echo '<div class="wrap"><h2>Riwayat handoff (admin)</h2><p>' . esc_html($references) . ' kode · ' . esc_html($count) . ' event tersimpan dalam masa retensi. Chat terkirim tidak dapat diverifikasi dari klik.</p>';
        $rows = $wpdb->get_results("SELECT e.id,r.reference_code,e.cta_context,e.handoff_at FROM $events e JOIN $refs r ON r.id=e.reference_id ORDER BY e.id DESC LIMIT 20", ARRAY_A);
        echo '<table class="widefat"><thead><tr><th>Event</th><th>Reference Code</th><th>CTA</th><th>Waktu UTC</th></tr></thead><tbody>';
        foreach ((array) $rows as $row) {
            echo '<tr>';
            foreach ($row as $value) { echo '<td>' . esc_html((string) $value) . '</td>'; }
            echo '</tr>';
        }
        echo '</tbody></table>';
        echo '<h3>Penghapusan data terverifikasi</h3><p>Menghapus riwayat event dan token browser untuk satu Reference Code tanpa membebaskan nomor urut. Jika kode sudah tersinkron ke Google Sheets, hapus/redaksi baris terkait di tab Klik WA secara manual sesuai prosedur.</p>';
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="kkg_erase">';
        wp_nonce_field('kkg_erase');
        echo '<label for="kkg-erase-code">Reference Code </label><input type="text" id="kkg-erase-code" name="reference_code" pattern="KK-GA[0-9]{6}" placeholder="KK-GA260001" required> ';
        submit_button('Hapus Riwayat Kode', 'secondary', 'submit', false);
        echo '</form></div>';
    }
}
