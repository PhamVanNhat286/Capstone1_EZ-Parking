import { audit, err, q, safeFirst, withTx } from '../db/pool';
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
  const [providerEnumRows, gateway_stats, config] = await Promise.all([
    q<{ value: string }>(`SELECT unnest(enum_range(NULL::payment_provider))::text AS value`),
    q(`
      SELECT provider::text AS provider,
             COUNT(*)::int AS total_transactions,
             COUNT(*) FILTER (WHERE status = 'success')::int AS success_transactions,
             COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND payment_type IN ('deposit', 'final')), 0)::float8 AS total_amount,
             MAX(paid_at) AS last_paid_at
      FROM payments
      GROUP BY provider
      ORDER BY total_transactions DESC, provider
    `),
    loadCurrentConfig()
  ]);

  return {
    config,
    defaults: DEFAULT_PLATFORM_CONFIG,
    enums: {
      payment_providers: providerEnumRows.map(r => r.value)
    },
    gateway_stats,
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
