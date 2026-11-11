<?php
// Copy only the reviewed settings into wp-config.php on the target installation.
// Generate the real secret on the server; never commit it.
define('KKG_SYNC_SECRET', getenv('KKG_SYNC_SECRET') ?: '');
// Set WP_ENVIRONMENT_TYPE through your existing WordPress deployment configuration.
// Prefer staging with HTTPS. Only a local development host may use HTTP.
