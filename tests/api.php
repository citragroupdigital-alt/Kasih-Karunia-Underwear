<?php
require __DIR__ . '/wp-shim.php';
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
function kkg_rate_limit($scope,$limit){return true;}
function register_rest_route($ns,$route,$args){$GLOBALS['routes'][$route]=$args;}
function wp_die($msg='',$title='',$args=array()){throw new RuntimeException('wp_die:'.($args['response']??500).':'.$msg);}
function wp_nonce_field($a=''){echo '<input type="hidden" name="_wpnonce" value="stub">';}
function admin_url($p=''){return 'https://example.test/wp-admin/'.$p;}
function selected($a,$b,$e=true){return '';}
function checked($a,$b,$e=true){return $a==$b?'checked':'';}
function esc_textarea($t){return esc_html($t);}
function submit_button($t='Save'){echo '<button>'.esc_html($t).'</button>';}
require KKG_DIR . 'includes/api.php';
function demand($condition,$message){if(!$condition)throw new RuntimeException($message);}
$GLOBALS['kkg_test_options']['kkg_settings']=array('mode'=>'staging');
demand(kkg_sync_crypto_available(),'OpenSSL or Sodium required for local WP-08 test');
demand(kkg_get_sync_secret()===''&&kkg_sync_secret_source()==='none','no secret initially');
demand(kkg_api_permission(new Request(),true)->data['status']===401,'no secret blocks 401');
try { kkg_save_sync_secret_input('short'); demand(false,'short secret should reject'); } catch (RuntimeException $e) { demand(strpos($e->getMessage(),'wp_die:400:')===0,'short secret fails 400'); }
try { kkg_save_sync_secret_input(str_repeat('a ',20)); demand(false,'space in secret should reject'); } catch (RuntimeException $e) { demand(strpos($e->getMessage(),'wp_die:400:')===0,'whitespace secret fails 400'); }
$adminSecret='AdmIn_Sync_Secret_Token_32_Chars_Minimum_987654321!';
kkg_save_sync_secret_input($adminSecret);
$storedBox=get_option('kkg_sync_secret_box','');
demand(is_string($storedBox)&&strpos($storedBox,'v1:')===0&&strpos($storedBox,$adminSecret)===false,'secret encrypted without plaintext');
demand($GLOBALS['kkg_test_autoloads']['kkg_sync_secret_box']===false,'encrypted secret is non-autoloaded');
demand(kkg_sync_secret_source()==='option'&&kkg_get_sync_secret()===$adminSecret,'admin secret active before constant');
demand(kkg_api_permission(new Request(array('authorization'=>'Bearer '.$adminSecret)),true)===true,'encrypted admin secret authorizes private API');
demand(kkg_api_permission(new Request(array('authorization'=>'Bearer wrong')),true)->data['status']===401,'wrong token fails 401 against admin secret');
ob_start(); kkg_admin_page(); $adminHtml=ob_get_clean();
demand(strpos($adminHtml,'Tersimpan terenkripsi via WP Admin')!==false&&strpos($adminHtml,$adminSecret)===false,'admin HTML shows status without exposing secret');
$GLOBALS['kkg_test_options']['kkg_sync_secret_box']=substr_replace($storedBox,'A',12,1);
demand(kkg_sync_secret_source()==='option_unreadable'&&kkg_get_sync_secret()==='','tampered ciphertext fails closed');
demand(kkg_api_permission(new Request(array('authorization'=>'Bearer '.$adminSecret)),true)->data['status']===401,'tampered secret box fails 401');
kkg_save_sync_secret_input('',true);
demand(kkg_sync_secret_source()==='none'&&get_option('kkg_sync_secret_box','')==='','clear removes stored secret');
kkg_save_sync_secret_input($adminSecret);
define('KKG_SYNC_SECRET', str_repeat('x', 40));
demand(kkg_sync_secret_source()==='constant'&&kkg_get_sync_secret()===KKG_SYNC_SECRET,'wp-config constant takes priority over encrypted option');
demand(kkg_api_permission(new Request(array('authorization'=>'Bearer '.$adminSecret)),true)->data['status']===401,'overridden admin secret no longer accepted');
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
echo "API: 28 permission/validation/secret checks passed\n";
