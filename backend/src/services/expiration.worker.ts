import { pool } from "../config/db";

let workerInterval: NodeJS.Timeout | null = null;

export const startHoldExpirationWorker = (intervalMs = 15000): void => {
  if (workerInterval) return;

  console.log(`[Worker] Started Hold & Reservation Expiration Worker (every ${intervalMs / 1000}s)...`);

  workerInterval = setInterval(async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Quá hạn giữ chỗ 10 phút mà chưa thanh toán -> Cancel reservation
      const expiredHoldRes = await client.query(`
        UPDATE reservations
        SET status = 'cancelled', cancel_reason = 'Quá hạn 10 phút thanh toán cọc', updated_at = NOW()
        WHERE status = 'holding' AND hold_expires_at < NOW()
        RETURNING id, slot_id;
      `);

      // 2. Quá hạn đến bãi 20 phút sau khi đã trả cọc -> Forfeit reservation (mất cọc)
      const expiredArrivalRes = await client.query(`
        UPDATE reservations
        SET status = 'forfeited', cancel_reason = 'Quá hạn 20 phút không đến bãi (mất cọc)', updated_at = NOW()
        WHERE status = 'paid' AND arrival_expires_at < NOW()
        RETURNING id, slot_id;
      `);

      // 3. Tự động trả các ô đỗ 'holding' bị mồ côi hoặc vừa hết hạn về 'available'
      const releasedSlotsRes = await client.query(`
        UPDATE slots s
        SET status = 'available', updated_at = NOW()
        WHERE s.status = 'holding'
          AND NOT EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.slot_id = s.id
              AND r.status = 'holding'
              AND r.hold_expires_at > NOW()
          )
        RETURNING id, code;
      `);

      // 4. Tự động trả các ô đỗ của đơn 'paid' quá hạn về 'available' (nếu xe chưa vào bãi)
      if (expiredArrivalRes.rowCount && expiredArrivalRes.rowCount > 0) {
        const arrivalSlotIds = expiredArrivalRes.rows.map((r: any) => r.slot_id);
        await client.query(`
          UPDATE slots
          SET status = 'available', updated_at = NOW()
          WHERE id = ANY($1::bigint[]) AND status IN ('holding', 'available')
        `, [arrivalSlotIds]);
      }

      await client.query("COMMIT");

      const totalReleased = (releasedSlotsRes.rowCount || 0);
      if (totalReleased > 0) {
        console.log(`[Worker] 🔄 Tự động giải phóng ${totalReleased} ô đỗ hết hạn giữ chỗ:`, releasedSlotsRes.rows.map((s: any) => s.code).join(", "));
      }
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("[Worker] Lỗi khi quét hạn đặt chỗ:", error);
    } finally {
      client.release();
    }
  }, intervalMs);
};

export const stopHoldExpirationWorker = (): void => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[Worker] Stopped Expiration Worker.");
  }
};
