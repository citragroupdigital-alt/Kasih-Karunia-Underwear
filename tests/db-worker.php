<?php
require __DIR__ . '/db-bootstrap.php';
$input = fixture_input($argv[1] ?? null);
if (isset($argv[2])) $input['request_id'] = $argv[2];
try { echo json_encode(kkg_handoff_store($input)); }
catch (Throwable $e) { fwrite(STDERR, $e->getMessage()); exit(1); }
