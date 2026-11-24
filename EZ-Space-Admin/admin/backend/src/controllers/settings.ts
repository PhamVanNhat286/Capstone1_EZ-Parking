import { audit, err, first, q, safeFirst, withTx } from '../db/pool';
import { getActor, pass } from './utils';

export interface PlatformConfig {
  hold_timeout_minutes: number;
  arrival_timeout_minutes: number;
  deposit_amount: number;
  commission_rate: number;
  vnpay_tmn_code: string;
  ipn_webhook_url: string;
  maintenance_mode: boolean;
}

const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  hold_timeout_minutes: 10,
  arrival_timeout_minutes: 20,
  deposit_amount: 50000,
  commission_rate: 5,
  vnpay_tmn_code: 'EZSPACE_VNPAY_SANDBOX_01',
  ipn_webhook_url: '/api/reservations/:id/pay-deposit (VNPay Sandbox IPN)',
  maintenance_mode: false
};

const SLOT_TYPE_LABELS: Record<string, string> = {
  standard: 'Tiêu chuẩn',
  ev_charging: 'Sạc EV',
  large: 'Xe lớn/SUV',
  disabled: 'Ưu tiên KT'
};

const PROVIDER_LABELS: Record<string, string> = {
  vnpay: 'VNPay Sandbox',
  momo: 'Ví MoMo',
  card: 'Thẻ quốc tế'
};

function sanitizeConfig(raw: Record<string, unknown> | null | undefined): PlatformConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PLATFORM_CONFIG };
  const hold = Number(raw.hold_timeout_minutes);
  const arrival = Number(raw.arrival_timeout_minutes);
  const deposit = Number(raw.deposit_amount);
  const commission = Number(raw.commission_rate);
  const tmn = typeof raw.vnpay_tmn_code === 'string' ? raw.vnpay_tmn_code.trim() : '';
  const ipn = typeof raw.ipn_webhook_url === 'string' ? raw.ipn_webhook_url.trim() : '';

  return {
    hold_timeout_minutes:
      Number.isInteger(hold) && hold >= 3 && hold <= 30
        ? hold
        : DEFAULT_PLATFORM_CONFIG.hold_timeout_minutes,
    arrival_timeout_minutes:
      Number.isInteger(arrival) && arrival >= 5 && arrival <= 60
        ? arrival
        : DEFAULT_PLATFORM_CONFIG.arrival_timeout_minutes,
    deposit_amount:
      Number.isInteger(deposit) && deposit >= 10000 && deposit <= 500000
        ? deposit
        : DEFAULT_PLATFORM_CONFIG.deposit_amount,
    commission_rate:
      Number.isFinite(commission) && commission >= 1 && commission <= 30
        ? Math.round(commission * 2) / 2
        : DEFAULT_PLATFORM_CONFIG.commission_rate,
    vnpay_tmn_code:
      tmn.length > 0 && tmn.length <= 64 ? tmn : DEFAULT_PLATFORM_CONFIG.vnpay_tmn_code,
    ipn_webhook_url:
      ipn.length > 0 && ipn.length <= 200 ? ipn : DEFAULT_PLATFORM_CONFIG.ipn_webhook_url,
    maintenance_mode:
      typeof raw.maintenance_mode === 'boolean'
        ? raw.maintenance_mode
        : DEFAULT_PLATFORM_CONFIG.maintenance_mode
  };
}

export async function loadCurrentConfig(): Promise<PlatformConfig> {
  const row = await safeFirst<{ new_value?: Record<string, unknown> }>(
    `SELECT new_value
     FROM audit_logs
     WHERE action = 'PLATFORM_SETTINGS_UPDATED'
       AND entity_type = 'platform_settings'
       AND entity_id = 1
     ORDER BY id DESC
     LIMIT 1`,
    [],
    {}
  );
  return sanitizeConfig(row.new_value);
}

export async function settings() {
  const [
    pricing,
    managers,
    lot_vehicles,
    dbInfoRow,
    providerEnumRows,
    vehicleEnumRows,
    slotEnumRows,
    gateway_stats,
    latestIpnRows,
    depositStatsRow,
    config
  ] = await Promise.all([
    q(`
      SELECT pr.id, pr.parking_lot_id, l.name AS lot_name, pr.name,
             pr.start_time, pr.end_time, pr.hourly_rate, pr.surcharge,
             pr.effective_from, pr.effective_to
      FROM pricing_rules pr
      JOIN parking_lots l ON l.id = pr.parking_lot_id
      ORDER BY pr.parking_lot_id, pr.start_time
    `),
    q(`
      SELECT m.id, m.parking_lot_id, l.name AS lot_name, l.status AS lot_status,
             u.id AS manager_id, u.full_name, u.email, u.phone, m.assigned_at
      FROM parking_lot_managers m
      JOIN parking_lots l ON l.id = m.parking_lot_id
      JOIN users u ON u.id = m.manager_id
      ORDER BY l.id, u.id
    `),
    q(`
      SELECT l.id AS parking_lot_id, l.name AS lot_name,
             STRING_AGG(v.vehicle_type::text, ', ' ORDER BY v.vehicle_type) AS vehicle_types
      FROM parking_lots l
      LEFT JOIN parking_lot_vehicle_types v ON v.parking_lot_id = l.id
      GROUP BY l.id, l.name
      ORDER BY l.id
    `),
    first<{ database_name: string; db_user: string; pg_version: string }>(`
      SELECT current_database() AS database_name,
             current_user AS db_user,
             split_part(version(), ' ', 1) || ' ' || split_part(version(), ' ', 2) AS pg_version
    `),
    q<{ value: string }>(`SELECT unnest(enum_range(NULL::payment_provider))::text AS value`),
    q<{ value: string }>(`SELECT unnest(enum_range(NULL::vehicle_type))::text AS value`),
    q<{ value: string }>(`SELECT unnest(enum_range(NULL::slot_type))::text AS value`),
    q(`
      SELECT provider::text AS provider,
             COUNT(*)::int AS total_transactions,
             COUNT(*) FILTER (WHERE status = 'success')::int AS success_transactions,
             COUNT(*) FILTER (WHERE raw_ipn_payload IS NOT NULL)::int AS ipn_records,
             COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type IN ('deposit', 'final')), 0)::float8 AS total_amount,
             MAX(paid_at) AS last_paid_at
      FROM payments
      GROUP BY provider
      ORDER BY total_transactions DESC, provider
    `),
    q(`
      SELECT id, reservation_id, provider::text AS provider, transaction_ref,
             response_code, raw_ipn_payload, ipn_received_at, paid_at
      FROM payments
      WHERE raw_ipn_payload IS NOT NULL
      ORDER BY id DESC
      LIMIT 1
    `),
    first<{
      total_reservations: number;
      min_deposit: number | null;
      max_deposit: number | null;
    }>(`
      SELECT COUNT(*)::int AS total_reservations,
             MIN(deposit_amount)::float8 AS min_deposit,
             MAX(deposit_amount)::float8 AS max_deposit
      FROM reservations
    `),
    loadCurrentConfig()
  ]);

  const payment_providers = providerEnumRows.map(r => r.value);
  const vehicle_types = vehicleEnumRows.map(r => r.value);
  const slot_types = slotEnumRows.map(r => r.value);
  const ownerShare = Math.round((100 - config.commission_rate) * 10) / 10;

  const rules = [
    {
      code: 'DEPOSIT_AMOUNT',
      name: 'Mức tiền cọc giữ chỗ',
      value: `${config.deposit_amount.toLocaleString('vi-VN')} ₫ / lượt`,
      desc: 'Khoản cọc tiêu chuẩn mỗi lượt đặt chỗ, khấu trừ trực tiếp khi tất toán.'
    },
    {
      code: 'HOLD_TIMEOUT',
      name: 'Thời gian giữ chỗ chờ cọc',
      value: `${config.hold_timeout_minutes} phút`,
      desc: 'Tự động hủy giữ chỗ nếu khách chưa hoàn tất thanh toán đúng hạn.'
    },
    {
      code: 'ARRIVAL_TIMEOUT',
      name: 'Thời gian tối đa đến bãi',
      value: `${config.arrival_timeout_minutes} phút`,
      desc: 'Tự động hủy đơn và thu cọc nếu khách không check-in đúng giờ hẹn.'
    },
    {
      code: 'PAYMENT_PROVIDERS',
      name: 'Cổng thanh toán hỗ trợ',
      value: payment_providers.map(p => PROVIDER_LABELS[p] || p).join(' · '),
      desc: 'Các phương thức thanh toán đặt cọc và tất toán phí đỗ xe.'
    },
    {
      code: 'COMMISSION_RATE',
      name: 'Tỷ lệ chiết khấu doanh thu',
      value: `${config.commission_rate}% Admin · ${ownerShare}% Chủ bãi`,
      desc: 'Tỷ lệ phân bổ doanh thu thực thu sau hoàn tiền giữa nền tảng và chủ bãi.'
    },
    {
      code: 'API_ARCHITECTURE',
      name: 'Chuẩn giao tiếp API',
      value: 'RESTful JSON API (/api/admin/*)',
      desc: 'Giao thức kết nối đồng bộ giữa cổng quản trị và dịch vụ hệ thống.'
    },
    {
      code: 'OTP_TTL',
      name: 'Hiệu lực mã xác thực OTP',
      value: '5 phút (tối đa 5 lần thử)',
      desc: 'Áp dụng cho xác thực tài khoản, email và khôi phục mật khẩu.'
    },
    {
      code: 'VEHICLE_TYPES',
      name: 'Loại phương tiện hỗ trợ',
      value: vehicle_types.join(' · '),
      desc: 'Các dòng xe được phép đăng ký và đặt lịch đỗ trên hệ thống.'
    },
    {
      code: 'SLOT_TYPES',
      name: 'Phân loại ô đỗ xe',
      value: slot_types.map(s => SLOT_TYPE_LABELS[s] || s).join(' · '),
      desc: 'Các nhóm vị trí đỗ hiển thị trực quan trên sơ đồ bãi xe 2D.'
    }
  ];

  return {
    config,
    defaults: DEFAULT_PLATFORM_CONFIG,
    db_info: dbInfoRow,
    enums: {
      payment_providers,
      vehicle_types,
      slot_types
    },
    gateway_stats,
    latest_ipn: latestIpnRows[0] || null,
    deposit_stats: depositStatsRow,
    pricing,
    managers,
    lot_vehicles,
    rules,
    server_time: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
  };
}

export async function updateSettings(input: Record<string, unknown>) {
  const hold = Number(input.hold_timeout_minutes);
  const arrival = Number(input.arrival_timeout_minutes);
  const deposit = Number(input.deposit_amount);
  const commission = Number(input.commission_rate);
  const tmn = pass(input.vnpay_tmn_code);
  const ipn = pass(input.ipn_webhook_url) || DEFAULT_PLATFORM_CONFIG.ipn_webhook_url;
  const maintenance = input.maintenance_mode;

  if (!Number.isInteger(hold) || hold < 3 || hold > 30) {
    err('Thời gian giữ chỗ chờ cọc phải là số nguyên từ 3 đến 30 phút.');
  }
  if (!Number.isInteger(arrival) || arrival < 5 || arrival > 60) {
    err('Giới hạn trễ hẹn (No-show) phải là số nguyên từ 5 đến 60 phút.');
  }
  if (!Number.isInteger(deposit) || deposit < 10000 || deposit > 500000) {
    err('Mức tiền cọc mẫu phải là số nguyên từ 10.000 đến 500.000 VNĐ.');
  }
  if (
    !Number.isFinite(commission) ||
    commission < 1 ||
    commission > 30 ||
    Math.round(commission * 2) !== commission * 2
  ) {
    err('Tỷ lệ hoa hồng phải từ 1% đến 30% (bước 0.5%).');
  }
  if (!tmn || tmn.length > 64) {
    err('Mã định danh Terminal ID (Sandbox) không được rỗng và tối đa 64 ký tự.');
  }
  if (typeof maintenance !== 'boolean') {
    err('Trạng thái chế độ bảo trì không hợp lệ.');
  }

  const nextConfig: PlatformConfig = {
    hold_timeout_minutes: hold,
    arrival_timeout_minutes: arrival,
    deposit_amount: deposit,
    commission_rate: commission,
    vnpay_tmn_code: tmn,
    ipn_webhook_url: ipn.slice(0, 200),
    maintenance_mode: maintenance
  };

  return withTx(async client => {
    const actor = await getActor(client);
    const prevRow = await client.query<{ new_value?: Record<string, unknown> }>(
      `SELECT new_value
       FROM audit_logs
       WHERE action = 'PLATFORM_SETTINGS_UPDATED'
         AND entity_type = 'platform_settings'
         AND entity_id = 1
       ORDER BY id DESC
       LIMIT 1`
    );
    const oldConfig = sanitizeConfig(prevRow.rows[0]?.new_value);

    const note = `Cập nhật cấu hình: giữ chỗ ${hold}p, No-show ${arrival}p, cọc ${deposit.toLocaleString('vi-VN')}đ, hoa hồng ${commission}%, bảo trì: ${maintenance ? 'BẬT' : 'TẮT'}`;
    await audit(
      client,
      actor,
      null,
      'PLATFORM_SETTINGS_UPDATED',
      'platform_settings',
      1,
      oldConfig,
      nextConfig,
      note
    );

    return { ok: true, config: nextConfig };
  });
}

export async function flushCache() {
  const syncedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

  await withTx(async client => {
    const actor = await getActor(client);
    await audit(
      client,
      actor,
      null,
      'CACHE_FLUSHED',
      'platform_settings',
      1,
      { cache_state: 'active' },
      { cache_state: 'flushed', synced_at: syncedAt },
      'Admin thực hiện làm mới & đồng bộ dữ liệu trực tiếp từ PostgreSQL'
    );
  });

  const freshConfig = await loadCurrentConfig();
  return { ok: true, flushed_at: syncedAt, config: freshConfig };
}
