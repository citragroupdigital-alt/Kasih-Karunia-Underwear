<?php
require __DIR__ . '/wp-shim.php';
define('DB_NAME', 'kkg_tests');
function wp_next_scheduled($hook) { return false; }
function wp_schedule_event($time, $frequency, $hook) { return true; }
function wp_die($message) { throw new RuntimeException($message); }
class KkgTestWpdb {
    public $prefix = 'test_';
    public $insert_id = 0;
    public $last_error = '';
    private $connection;
    function __construct() {
        mysqli_report(MYSQLI_REPORT_OFF);
        $this->connection = new mysqli('127.0.0.1', 'root', '', '', 33307);
        if ($this->connection->connect_error) throw new RuntimeException('Local test DB unavailable');
        $this->connection->query('CREATE DATABASE IF NOT EXISTS kkg_tests');
        $this->connection->select_db('kkg_tests');
        $this->connection->set_charset('utf8mb4');
    }
    function get_charset_collate() { return 'DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'; }
    function prepare($sql, ...$values) {
        $i = 0;
        return preg_replace_callback('/%[ds]/', function ($m) use (&$i, $values) {
            $v = $values[$i++];
            return $m[0] === '%d' ? (string)(int)$v : "'" . $this->connection->real_escape_string((string)$v) . "'";
        }, $sql);
    }
    function execute($sql) {
        $this->last_error = '';
        $result = $this->connection->query($sql);
        $this->last_error = $this->connection->error;
        $this->insert_id = $this->connection->insert_id;
        return $result;
    }
    function query($sql) { $r = $this->execute($sql); return $r === false ? false : $this->connection->affected_rows; }
    function get_row($sql, $type = null) { $r = $this->execute($sql); return $r instanceof mysqli_result ? $r->fetch_assoc() : null; }
    function get_results($sql, $type = null) { $r = $this->execute($sql); return $r instanceof mysqli_result ? $r->fetch_all(MYSQLI_ASSOC) : array(); }
    function get_var($sql) { $r = $this->execute($sql); if (!$r instanceof mysqli_result) return null; $row = $r->fetch_row(); return $row[0] ?? null; }
    function insert($table, $values) {
        $parts = array_map(function ($v) { return $v === null ? 'NULL' : $this->prepare('%s', $v); }, array_values($values));
        return $this->query('INSERT INTO '.$table.' ('.implode(',',array_keys($values)).') VALUES ('.implode(',',$parts).')');
    }
    function update($table, $values, $where) {
        $parts = array(); $conditions = array();
        foreach ($values as $k=>$v) $parts[] = $k.'='.$this->prepare('%s',$v);
        foreach ($where as $k=>$v) $conditions[] = $k.'='.$this->prepare('%s',$v);
        return $this->query('UPDATE '.$table.' SET '.implode(',',$parts).' WHERE '.implode(' AND ',$conditions));
    }
}
$wpdb = new KkgTestWpdb();
require KKG_DIR . 'includes/store.php';
function fixture_input($token = null) {
    return array('request_id'=>bin2hex(random_bytes(24)), 'token'=>$token ?? bin2hex(random_bytes(32)),
        'cta_context'=>'hero','click'=>array('gclid'=>'fixture-click','gbraid'=>'','wbraid'=>''),
        'consent'=>array('advertising'=>true,'storage'=>true,'version'=>'test'));
}
