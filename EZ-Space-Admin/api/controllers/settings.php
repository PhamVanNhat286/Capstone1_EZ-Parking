<?php
// Handler settings: được gọi duy nhất bởi api/index.php sau xác thực localhost và CSRF.
if (!defined('EZ_API_ENTRY')) { http_response_code(404); exit; }
    if ($action==='settings' && $method==='GET') {
        $settings=rows($db,'SELECT setting_key,setting_value,updated_at FROM app_settings ORDER BY setting_key');
        reply(['items'=>$settings,'mysql'=>'Kết nối thành công','server_time'=>date('Y-m-d H:i:s')]);
    }
    if ($action==='settings' && $method==='POST') {
        $in=body();
        $v=[
            'hold_minutes'=>filter_var($in['hold_minutes']??null,FILTER_VALIDATE_INT),
            'no_show_minutes'=>filter_var($in['no_show_minutes']??null,FILTER_VALIDATE_INT),
            'commission_percent'=>filter_var($in['commission_percent']??null,FILTER_VALIDATE_INT),
            'maintenance'=>($in['maintenance']??false)?1:0,
        ];
        if ($v['hold_minutes']===false || $v['hold_minutes']<3 || $v['hold_minutes']>30 || $v['no_show_minutes']===false || $v['no_show_minutes']<5 || $v['no_show_minutes']>60 || $v['commission_percent']===false || $v['commission_percent']<0 || $v['commission_percent']>30) reply(['error'=>'Thông số cài đặt không nằm trong giới hạn.'],400);
        $db->beginTransaction();
        try {
            $old=rows($db,'SELECT setting_key,setting_value FROM app_settings FOR UPDATE');
            $q=$db->prepare('INSERT INTO app_settings(setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)');
            foreach($v as $key=>$val) $q->execute([$key,(string)$val]);
            audit($db,$actor,null,'SETTINGS_UPDATED','app_settings',0,$old,$v,'Cập nhật cấu hình platform');
            $db->commit();reply(['ok'=>true,'settings'=>$v]);
        }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
    }
