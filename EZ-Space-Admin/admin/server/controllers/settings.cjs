'use strict';
const { q } = require('../db.cjs');

async function settings() {
  const pricing = await q(`
    SELECT pr.id, pr.parking_lot_id, l.name AS lot_name, pr.name,
           pr.start_time, pr.end_time, pr.hourly_rate, pr.surcharge,
           pr.effective_from, pr.effective_to
    FROM pricing_rules pr
    JOIN parking_lots l ON l.id = pr.parking_lot_id
    ORDER BY pr.parking_lot_id, pr.start_time
  `);

  const managers = await q(`
    SELECT m.id, m.parking_lot_id, l.name AS lot_name, l.status AS lot_status,
           u.id AS manager_id, u.full_name, u.email, u.phone, m.assigned_at
    FROM parking_lot_managers m
    JOIN parking_lots l ON l.id = m.parking_lot_id
    JOIN users u ON u.id = m.manager_id
    ORDER BY l.id, u.id
  `);

  const lot_vehicles = await q(`
    SELECT l.id AS parking_lot_id, l.name AS lot_name,
           STRING_AGG(v.vehicle_type::text, ', ' ORDER BY v.vehicle_type) AS vehicle_types
    FROM parking_lots l
    LEFT JOIN parking_lot_vehicle_types v ON v.parking_lot_id = l.id
    GROUP BY l.id, l.name
    ORDER BY l.id
  `);

  const rules = [
    { code: 'HOLD_TIMEOUT', name: 'Thời gian giữ chỗ thanh toán cọc', value: '10 phút', desc: 'Tự động hủy đơn giữ chỗ (holding) nếu chưa thanh toán tiền cọc đúng hạn (hold_expires_at).' },
    { code: 'ARRIVAL_TIMEOUT', name: 'Thời gian tối đa đến bãi sau khi cọc', value: '20 phút', desc: 'Quá hạn arrival_expires_at sau khi đã cọc (paid) mà chưa check-in QR sẽ chuyển sang No-show (forfeited).' },
    { code: 'OTP_TTL', name: 'Thời hạn hiệu lực mã OTP Email', value: '5 phút (tối đa 5 lần thử)', desc: 'Áp dụng cho FORGOT_PASSWORD, VERIFY_EMAIL và REGISTER trong bảng email_otps.' },
    { code: 'VEHICLE_TYPES', name: 'Phân loại phương tiện hỗ trợ', value: 'Sedan · SUV · EV', desc: 'Cấu hình loại xe được phép vào từng bãi trong parking_lot_vehicle_types.' },
    { code: 'SLOT_TYPES', name: 'Phân loại ô đỗ xe (2D Grid)', value: 'Tiêu chuẩn · Sạc EV · Xe lớn/SUV · Ưu tiên KT', desc: 'Hiển thị trực quan theo tọa độ (row_index, col_index) trên sơ đồ bãi xe.' },
    { code: 'PAYMENT_PROVIDERS', name: 'Phương thức thanh toán hỗ trợ', value: 'VNPay · MoMo · Thẻ (Card)', desc: 'Ghi nhận giao dịch đặt cọc (deposit), tất toán (final) và hoàn tiền (refund) kèm đối soát IPN.' }
  ];

  return {
    pricing,
    managers,
    lot_vehicles,
    rules,
    server_time: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
  };
}

module.exports = { settings };
