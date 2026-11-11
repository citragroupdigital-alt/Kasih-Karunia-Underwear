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

function kkg_release_blockers($s) {
    $errors = array();
    foreach (array('privacy_reviewed', 'claims_reviewed', 'assets_reviewed', 'release_reviewed') as $key) {
        if (empty($s[$key])) { $errors[] = $key; }
    }
    if (!preg_match('/^62\d{8,13}$/D', $s['phone'])) { $errors[] = 'Nomor CS resmi'; }
    if (!$s['page_id'] || get_post_field('post_name', $s['page_id']) !== 'grosir' ||
        !has_shortcode(get_post_field('post_content', $s['page_id']), 'kk_grosir')) { $errors[] = 'Halaman grosir + shortcode'; }
    if (!get_privacy_policy_url()) { $errors[] = 'Privacy Policy'; }
    if ($s['consent_mode'] === 'disabled') { $errors[] = 'Adapter CMP atau consent hasil audit'; }
    foreach (array('logo', 'hero', 'about', 'category_0', 'category_1', 'category_2', 'category_3', 'category_4') as $key) {
        if (kkg_bundled_asset($key)) { continue; }
        if (!wp_attachment_is_image($s[$key])) { $errors[] = 'Aset ' . $key; }
    }
    return $errors;
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
    echo '<p>Schema: <strong>' . esc_html(get_option('kkg_schema', 'belum dibuat')) .
        '</strong> · Sync terakhir (UTC): <strong>' . esc_html(get_option('kkg_last_sync', 'belum')) .
        '</strong> · Kesehatan: <strong>' . esc_html(get_option('kkg_health', 'OK')) . '</strong></p>';
    echo '<p>Secret diatur melalui konstanta <code>KKG_SYNC_SECRET</code> pada <code>wp-config.php</code>, minimal 32 karakter acak. Nilai secret tidak ditampilkan di sini.</p></div>';
    echo '<div class="kkg-admin-card"><h2>Kesiapan Go-Live (Mode Active)</h2>';
    if (!$blockers) {
        echo '<span class="kkg-admin-badge kkg-admin-badge-ok">Siap rilis (0 blocker)</span><p>Seluruh prasyarat rilis terpenuhi.</p>';
    } else {
        echo '<span class="kkg-admin-badge kkg-admin-badge-warn">' . count($blockers) . ' blocker tersisa</span><ul class="kkg-admin-blockers">';
        foreach ($blockers as $b) { echo '<li>' . esc_html($b) . '</li>'; }
        echo '</ul>';
    }
    echo '</div></div>';
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
    foreach (array('privacy_reviewed' => 'Audit privacy/CMP dan retensi disetujui', 'claims_reviewed' => 'Empat klaim USP terbukti dan disetujui',
        'assets_reviewed' => 'Foto asli, logo, dan nomor CS disetujui', 'release_reviewed' => 'QA, backup/restore, rollback dan rilis disetujui eksplisit',
        'cleanup_enabled' => 'Jalankan cleanup retensi yang disetujui') as $key => $label) {
        echo '<tr><th>' . esc_html($key) . '</th><td><label><input type="checkbox" name="' . esc_attr($key) . '" value="1" ' . checked($s[$key], 1, false) . '> ' . esc_html($label) . '</label></td></tr>';
    }
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
