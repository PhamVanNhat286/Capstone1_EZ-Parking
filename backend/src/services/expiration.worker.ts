import { pool } from "../config/db";

export interface CleanupResult {
  cancelled_holds_count: number;
  cancelled_holds: Array<{ id: number; slot_id: number; user_id: number; parking_lot_id: number }>;
  forfeited_arrivals_count: number;
  forfeited_arrivals: Array<{ id: number; slot_id: number; user_id: number; parking_lot_id: number; deposit_amount: number }>;
  released_slots_count: number;
  released_slots: Array<{ id: number; code: string; parking_lot_id: number }>;
  executed_at: string;
}

let workerInterval: NodeJS.Timeout | null = null;
let lastRunTime: Date | null = null;
let lastRunStats: CleanupResult | null = null;
let totalRunsCount = 0;
let currentIntervalMs = 15000;

/**
 * Thực thi một chu kỳ quét và dọn dẹp các đơn / ô đỗ quá hạn
 * Hàm này có thể được gọi tự động theo chu kỳ (Cron) hoặc kích hoạt thủ công qua API
 */
export const executeCleanup = async (): Promise<CleanupResult> => {
  const client = await pool.connect();
  const startTime = new Date();

  try {
    await client.query("BEGIN");

    // 1. Quá hạn giữ chỗ 10 phút mà chưa thanh toán -> Cancel reservation
    const expiredHoldRes = await client.query(`
      UPDATE reservations
      SET status = 'cancelled', 
          cancel_reason = 'Quá hạn 10 phút thanh toán cọc', 
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE status = 'holding' AND hold_expires_at < NOW()
      RETURNING id, slot_id, user_id, parking_lot_id;
    `);

    // Ghi nhật ký audit_logs cho các đơn bị hủy
    for (const row of expiredHoldRes.rows) {
      await client.query(`
        INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, note)
        VALUES ($1, $2, 'AUTO_CANCEL_HOLD_EXPIRED', 'reservation', $3, 'Hệ thống tự hủy do quá hạn 10 phút chưa thanh toán cọc');
      `, [row.user_id, row.parking_lot_id, row.id]);
    }

    // 2. Quá hạn đến bãi 20 phút sau khi đã trả cọc -> Forfeit reservation (mất cọc)
    const expiredArrivalRes = await client.query(`
      UPDATE reservations
      SET status = 'forfeited', 
          cancel_reason = 'Quá hạn 20 phút không đến bãi (mất cọc)', 
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE status = 'paid' AND arrival_expires_at < NOW()
      RETURNING id, slot_id, user_id, parking_lot_id, deposit_amount;
    `);

    // Ghi nhật ký audit_logs cho các đơn bị phạt mất cọc
    for (const row of expiredArrivalRes.rows) {
      const depositText = row.deposit_amount ? ` (Khấu trừ cọc: ${Number(row.deposit_amount).toLocaleString("vi-VN")}đ)` : "";
      await client.query(`
        INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, note)
        VALUES ($1, $2, 'AUTO_FORFEIT_ARRIVAL_EXPIRED', 'reservation', $3, 'Quá hạn 20 phút không đến bãi' || $4::text);
      `, [row.user_id, row.parking_lot_id, row.id, depositText]);
    }

    // 3. Tự động trả các ô đỗ 'holding' bị hết hạn hoặc mồ côi về 'available'
    const releasedHoldingSlotsRes = await client.query(`
      UPDATE slots s
      SET status = 'available', updated_at = NOW()
      WHERE s.status = 'holding'
        AND NOT EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.slot_id = s.id
            AND r.status = 'holding'
            AND r.hold_expires_at > NOW()
        )
      RETURNING id, code, parking_lot_id;
    `);

    // 4. Tự động trả các ô đỗ của đơn 'paid' bị phạt mất cọc về 'available' (nếu xe chưa vào bãi)
    let releasedForfeitedSlots: any[] = [];
    if (expiredArrivalRes.rowCount && expiredArrivalRes.rowCount > 0) {
      const arrivalSlotIds = expiredArrivalRes.rows.map((r: any) => r.slot_id);
      const res = await client.query(`
        UPDATE slots
        SET status = 'available', updated_at = NOW()
        WHERE id = ANY($1::bigint[]) AND status IN ('holding', 'available')
        RETURNING id, code, parking_lot_id;
      `, [arrivalSlotIds]);
      releasedForfeitedSlots = res.rows;
    }

    await client.query("COMMIT");

    const allReleasedSlots = [...releasedHoldingSlotsRes.rows, ...releasedForfeitedSlots];
    const uniqueReleasedSlots = Array.from(new Map(allReleasedSlots.map(s => [s.id, s])).values());

    const result: CleanupResult = {
      cancelled_holds_count: expiredHoldRes.rowCount || 0,
      cancelled_holds: expiredHoldRes.rows,
      forfeited_arrivals_count: expiredArrivalRes.rowCount || 0,
      forfeited_arrivals: expiredArrivalRes.rows,
      released_slots_count: uniqueReleasedSlots.length,
      released_slots: uniqueReleasedSlots,
      executed_at: startTime.toISOString(),
    };

    lastRunTime = startTime;
    lastRunStats = result;
    totalRunsCount++;

    if (result.cancelled_holds_count > 0 || result.forfeited_arrivals_count > 0 || result.released_slots_count > 0) {
      console.log(
        `[Worker] 🔄 Đã dọn dẹp: Hủy ${result.cancelled_holds_count} đơn chưa cọc, Phạt ${result.forfeited_arrivals_count} đơn quá 20p, Giải phóng ${result.released_slots_count} ô đỗ.`
      );
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Worker] Lỗi khi thực thi chu kỳ dọn dẹp ô quá hạn:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Khởi động bộ quét nền theo chu kỳ
 */
export const startHoldExpirationWorker = (intervalMs = 15000): void => {
  if (workerInterval) return;

  currentIntervalMs = intervalMs;
  console.log(`[Worker] Started Hold & Reservation Expiration Worker (every ${intervalMs / 1000}s)...`);

  workerInterval = setInterval(async () => {
    try {
      await executeCleanup();
    } catch {}
  }, intervalMs);
};

/**
 * Dừng bộ quét nền
 */
export const stopHoldExpirationWorker = (): void => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[Worker] Stopped Expiration Worker.");
  }
};

/**
 * Lấy trạng thái hoạt động hiện tại của Worker
 */
export const getWorkerStatus = () => {
  return {
    is_running: workerInterval !== null,
    interval_seconds: currentIntervalMs / 1000,
    total_runs_count: totalRunsCount,
    last_run_time: lastRunTime,
    last_run_stats: lastRunStats,
  };
};
