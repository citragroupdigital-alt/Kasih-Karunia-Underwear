<?php
defined('ABSPATH') || exit;

/**
 * Resolve a safe relative WebP invoice asset inside KKG_DIR to its public URL.
 */
function kkg_invoice_asset_url($rel) {
    $rel = ltrim(str_replace('\\', '/', (string) $rel), '/');
    if ($rel === '' || strpos($rel, '..') !== false || !preg_match('/^assets\/invoices\/[a-z0-9][a-z0-9\-]*\.webp$/', $rel)) {
        return '';
    }
    $path = rtrim(KKG_DIR, '/\\') . '/' . $rel;
    if (!is_file($path)) {
        return '';
    }
    return rtrim(KKG_URL, '/') . '/' . $rel;
}

/**
 * Format an ISO calendar date (YYYY-MM-DD) into an Indonesian display label.
 */
function kkg_invoice_format_date($iso_date) {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string) $iso_date, $m)) {
        return '';
    }
    $year = (int) $m[1];
    $month = (int) $m[2];
    $day = (int) $m[3];
    if (!checkdate($month, $day, $year)) {
        return '';
    }
    $months = array(
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    );
    return $day . ' ' . $months[$month] . ' ' . $year;
}

/**
 * Sanitize and validate a single wholesale invoice proof record.
 * Records without a valid existing asset image or required metadata are rejected.
 */
function kkg_normalize_invoice($raw) {
    if (!is_array($raw)) {
        return null;
    }

    $id = preg_replace('/[^a-z0-9\-]/', '', strtolower((string) ($raw['id'] ?? '')));
    $title = trim((string) ($raw['title'] ?? '')) ?: 'Dokumentasi Transaksi Grosir';
    $date_iso = trim((string) ($raw['date'] ?? ''));
    $date_label = trim((string) ($raw['date_label'] ?? '')) ?: kkg_invoice_format_date($date_iso);
    $category = trim((string) ($raw['category'] ?? ''));

    $url = !empty($raw['url'])
        ? esc_url_raw((string) $raw['url'])
        : kkg_invoice_asset_url($raw['image'] ?? ($raw['rel'] ?? ''));

    if ($id === '' || $date_label === '' || $category === '' || $url === '') {
        return null;
    }

    $width = isset($raw['width']) ? (int) $raw['width'] : 1204;
    $height = isset($raw['height']) ? (int) $raw['height'] : 694;
    $alt = trim((string) ($raw['alt'] ?? ''));
    if ($alt === '') {
        $alt = sprintf('Faktur penjualan grosir KK Underwear tanggal %s kategori %s yang telah disensor', $date_label, $category);
    }

    return array(
        'id' => $id,
        'title' => $title,
        'date' => $date_iso,
        'date_label' => $date_label,
        'category' => $category,
        'url' => $url,
        'alt' => $alt,
        'width' => $width > 0 ? $width : 1204,
        'height' => $height > 0 ? $height : 694,
        'is_verified' => !empty($raw['is_verified']),
        'is_approved_for_publication' => !empty($raw['is_approved_for_publication']),
        'is_placeholder' => !empty($raw['is_placeholder']),
    );
}

/**
 * Approved wholesale invoice proof records (owner-approved redacted WebP assets).
 */
function kkg_invoices_data() {
    return array(
        array(
            'id' => 'invoice-01',
            'title' => 'Dokumentasi Transaksi Grosir',
            'date' => '2026-10-29',
            'category' => 'Celana Dalam, Bra & Kaos Kaki',
            'image' => 'assets/invoices/invoice-01.webp',
            'width' => 1204,
            'height' => 694,
            'alt' => 'Faktur penjualan grosir KK Underwear tanggal 29 Oktober 2026 untuk kategori celana dalam, bra, dan kaos kaki yang telah disensor',
            'is_verified' => true,
            'is_approved_for_publication' => true,
            'is_placeholder' => false,
        ),
        array(
            'id' => 'invoice-02',
            'title' => 'Dokumentasi Transaksi Grosir',
            'date' => '2026-10-22',
            'category' => 'Celana Dalam Grosir',
            'image' => 'assets/invoices/invoice-02.webp',
            'width' => 1204,
            'height' => 694,
            'alt' => 'Faktur penjualan grosir KK Underwear tanggal 22 Oktober 2026 untuk kategori celana dalam grosir yang telah disensor',
            'is_verified' => true,
            'is_approved_for_publication' => true,
            'is_placeholder' => false,
        ),
        array(
            'id' => 'invoice-03',
            'title' => 'Dokumentasi Transaksi Grosir',
            'date' => '2026-10-01',
            'category' => 'Bra & Celana Dalam Wanita',
            'image' => 'assets/invoices/invoice-03.webp',
            'width' => 1204,
            'height' => 748,
            'alt' => 'Faktur penjualan grosir KK Underwear tanggal 1 Oktober 2026 untuk kategori bra dan celana dalam wanita yang telah disensor',
            'is_verified' => true,
            'is_approved_for_publication' => true,
            'is_placeholder' => false,
        ),
    );
}

/**
 * Return verified and publication-approved invoice records for public rendering,
 * or verified redacted candidates only to manage_options admins in staging mode.
 */
function kkg_visible_invoices($s = null, $override_items = null) {
    $s = is_array($s) ? $s : kkg_settings();
    $raw_items = is_array($override_items) ? $override_items : kkg_invoices_data();
    if ($override_items === null && function_exists('apply_filters')) {
        $raw_items = (array) apply_filters('kkg_invoices_items', $raw_items, $s);
    }

    $normalized = array();
    foreach ($raw_items as $raw) {
        $item = kkg_normalize_invoice($raw);
        if ($item !== null) {
            $normalized[] = $item;
        }
    }

    $public = array_values(array_filter($normalized, static function ($item) {
        return empty($item['is_placeholder']) && !empty($item['is_verified']) && !empty($item['is_approved_for_publication']);
    }));

    if ($public) {
        return $public;
    }

    $is_staging_admin = ($s['mode'] ?? 'off') === 'staging' && current_user_can('manage_options');
    if (!$is_staging_admin) {
        return array();
    }

    return array_values(array_filter($normalized, static function ($item) {
        return empty($item['is_placeholder']) && !empty($item['is_verified']);
    }));
}
