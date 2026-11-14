<?php defined('ABSPATH') || exit; ?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php ob_start(); try { wp_head(); } finally { $kkg_head_html = ob_get_clean(); } echo kkg_seo_sanitize_wp_head($kkg_head_html); ?>
</head>
<body <?php body_class('kkg-page'); ?>>
<?php wp_body_open(); ?>
<?php echo kkg_render(); ?>
<?php wp_footer(); ?>
</body>
</html>
