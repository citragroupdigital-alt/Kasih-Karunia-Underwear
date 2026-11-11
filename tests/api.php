<?php
require __DIR__ . '/wp-shim.php';
define('KKG_SYNC_SECRET', str_repeat('x', 40));
class WP_Error {
    public $code; public $data;
    function __construct($code,$message,$data) {$this->code=$code;$this->data=$data;}
}
class WP_REST_Response { public $data; function __construct($data) {$this->data=$data;} }
class Request {
    private $headers; private $body; private $params;
    function __construct($headers=array(),$body=array(),$params=array()) {$this->headers=$headers;$this->body=$body;$this->params=$params;}
    function get_header($key) {return $this->headers[$key]??'';}
    function get_body() {return json_encode($this->body);}
    function get_json_params() {return $this->body;}
    function get_param($key) {return $this->params[$key]??null;}
}
function is_ssl(){return true;}
function wp_get_environment_type(){return 'staging';}
function wp_parse_url($url){return parse_url($url);}
function home_url(){return 'https://example.test';}
function kkg_rate_limit($scope,$limit){return true;}
function register_rest_route($ns,$route,$args){$GLOBALS['routes'][$route]=$args;}
require KKG_DIR . 'includes/api.php';
function demand($condition,$message){if(!$condition)throw new RuntimeException($message);}
$GLOBALS['kkg_test_options']['kkg_settings']=array('mode'=>'off');
demand(kkg_api_permission(new Request())->data['status']===503,'off blocks');
$GLOBALS['kkg_test_options']['kkg_settings']=array('mode'=>'staging');
demand(kkg_api_permission(new Request(),true)->data['status']===401,'private missing auth');
demand(kkg_api_permission(new Request(array('authorization'=>'Bearer wrong')),true)->data['status']===401,'wrong auth');
demand(kkg_api_permission(new Request(array('authorization'=>'Bearer '.KKG_SYNC_SECRET)),true)===true,'private authorized');
demand(kkg_api_permission(new Request(array('origin'=>'https://evil.test','content-type'=>'application/json')))->data['status']===403,'foreign origin');
demand(kkg_api_permission(new Request(array('origin'=>'https://example.test','content-type'=>'application/json')))===true,'same origin');
kkg_register_api();
$GLOBALS['kkg_test_options']['kkg_settings']=array('mode'=>'staging','phone'=>'');
$cb=$GLOBALS['routes']['/handoff']['callback'];
demand($cb(new Request())->data['status']===503,'missing phone blocks handoff');
$GLOBALS['kkg_test_options']['kkg_settings']=array('mode'=>'staging','phone'=>'6281234567890');
demand($cb(new Request(array(),array('cta_context'=>'invalid')))->data['status']===400,'invalid handoff input');
$cb=$GLOBALS['routes']['/handoffs']['callback'];
demand($cb(new Request(array(),array(),array('after_change_id'=>'-1')))->data['status']===400,'negative cursor');
demand($cb(new Request(array(),array(),array('limit'=>101)))->data['status']===400,'oversized batch');
$cb=$GLOBALS['routes']['/reconcile']['callback'];
demand($cb(new Request(array(),array('purchases'=>array(array('key'=>2,'reference_code'=>'KK-GA260001','paid_at'=>'2026-02-30T00:00:00Z')))))->data['status']===400,'invalid payment');
demand($cb(new Request(array(),array('purchases'=>array(array('key'=>1,'reference_code'=>'KK-GA260001','paid_at'=>'2026-11-11T04:00:00Z')))))->data['status']===400,'invalid row key');
demand($cb(new Request(array(),array('purchases'=>array(array('key'=>2,'reference_code'=>'KK-GA260001','paid_at'=>gmdate('Y-m-d\TH:i:s\Z',time()+3600))))))->data['status']===400,'future payment rejected');
demand($cb(new Request(array(),array('purchases'=>array_fill(0,101,array('key'=>2,'reference_code'=>'KK-GA260001','paid_at'=>'2026-11-11T04:00:00Z')))))->data['status']===400,'oversized reconcile batch');
echo "API: 15 permission/validation checks passed\n";
