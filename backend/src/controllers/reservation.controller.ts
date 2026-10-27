import { Request, Response } from "express";
import { pool, query } from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";

const SLUG_TO_ID: Record<string, number> = {
  "hai-chau-a": 1,
  "cau-rong": 2,
  "san-bay-t1": 3,
};

const resolveLotId = (rawId: string | number | undefined): number => {
  const str = String(rawId || "").toLowerCase();
  if (SLUG_TO_ID[str]) return SLUG_TO_ID[str];
  const num = parseInt(str, 10);
  return isNaN(num) ? 1 : num;
};

// POST /api/reservations/hold - Giữ ô đỗ chống trùng đặt chỗ (Atomic Update)
export const holdSpot = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const {
      parking_lot_id,
      slot_id,
      vehicle_id,
      estimated_hours = 2,
      start_time,
      expected_end_time,
      hold_duration_minutes = 10, // Mặc định giữ 10 phút (có thể truyền nhỏ hơn để demo)
    } = req.body;

    const lotId = resolveLotId(parking_lot_id);
    const userId = req.user?.id || req.body.user_id || 3; // Fallback user 3 (Nguyen Van A)

    // Xác định slot ID chính xác (cho phép truyền cả id dạng số hoặc code ví dụ "A-01")
    let targetSlotId: number | null = null;
    let targetSlotCode: string = "";

    if (typeof slot_id === "number" || /^\d+$/.test(String(slot_id))) {
      targetSlotId = Number(slot_id);
    } else {
      const findSlotRes = await client.query(
        "SELECT id, code FROM slots WHERE parking_lot_id = $1 AND code = $2 LIMIT 1",
        [lotId, String(slot_id)]
      );
      if (findSlotRes.rows.length > 0) {
        targetSlotId = Number(findSlotRes.rows[0].id);
        targetSlotCode = findSlotRes.rows[0].code;
      }
    }

    if (!targetSlotId) {
      res.status(404).json({
        success: false,
        code: "SLOT_NOT_FOUND",
        message: "Không tìm thấy thông tin ô đỗ chỉ định.",
      });
      return;
    }

    // Bắt đầu Database Transaction
    await client.query("BEGIN");

    // 🔒 ATOMIC CONDITIONAL UPDATE:
    // Chỉ cập nhật trạng thái 'holding' NẾU VÀ CHỈ NẾU status hiện tại là 'available'.
    // Cơ chế row-level lock của PostgreSQL đảm bảo chỉ 1 request duy nhất thắng tranh chấp!
    const updateSlotSql = `
      UPDATE slots
      SET status = 'holding', updated_at = NOW()
      WHERE id = $1 AND parking_lot_id = $2 AND status = 'available' AND is_active = TRUE
      RETURNING id, code, slot_type;
    `;
    const slotUpdateRes = await client.query(updateSlotSql, [targetSlotId, lotId]);

    // Nếu rowCount === 0 -> Ô đỗ đã bị người khác giữ hoặc không khả dụng
    if (slotUpdateRes.rowCount === 0) {
      await client.query("ROLLBACK");

      const checkCurrent = await client.query(
        "SELECT code, status FROM slots WHERE id = $1 AND parking_lot_id = $2",
        [targetSlotId, lotId]
      );
      const currentStatus = checkCurrent.rows[0]?.status || "unknown";
      const code = checkCurrent.rows[0]?.code || slot_id;

      res.status(409).json({
        success: false,
        code: "SPOT_ALREADY_TAKEN",
        message: `Ô ${code} vừa có người khác giữ chỗ hoặc đã có xe đỗ (Trạng thái hiện tại: ${currentStatus}). Vui lòng chọn ô khác!`,
        data: { slot_id: targetSlotId, code, currentStatus },
      });
      return;
    }

    const updatedSlot = slotUpdateRes.rows[0];

    // Lấy giá theo giờ của bãi xe
    const priceRes = await client.query(
      "SELECT hourly_rate FROM pricing_rules WHERE parking_lot_id = $1 ORDER BY id ASC LIMIT 1",
      [lotId]
    );
    const hourlyRate = Number(priceRes.rows[0]?.hourly_rate || 20000);
    const depositAmount = 50000; // Tiền đặt cọc chuẩn 50.000đ

    // Xác định vehicle_id
    let finalVehicleId = vehicle_id;
    if (!finalVehicleId) {
      const vRes = await client.query(
        "SELECT id FROM vehicles WHERE user_id = $1 ORDER BY is_default DESC, id ASC LIMIT 1",
        [userId]
      );
      finalVehicleId = vRes.rows[0]?.id || 1;
    }

    // Tính thời gian hết hạn giữ chỗ (hold_expires_at)
    const holdSeconds = Math.max(10, Math.round(Number(hold_duration_minutes) * 60));
    const holdExpiresAt = new Date(Date.now() + holdSeconds * 1000);

    const sTime = start_time ? new Date(start_time) : new Date();
    const eTime = expected_end_time
      ? new Date(expected_end_time)
      : new Date(sTime.getTime() + Number(estimated_hours) * 3600 * 1000);

    // Hủy bỏ các đơn 'holding' cũ của chính user này trên cùng slot (nếu có)
    await client.query(
      "UPDATE reservations SET status = 'cancelled', cancel_reason = 'Thay thế bằng lượt giữ mới' WHERE user_id = $1 AND slot_id = $2 AND status = 'holding'",
      [userId, targetSlotId]
    );

    // Tạo bản ghi đặt chỗ trong bảng reservations
    const insertSql = `
      INSERT INTO reservations (
        user_id, parking_lot_id, slot_id, vehicle_id,
        start_time, expected_end_time, status,
        hold_expires_at, hourly_rate, deposit_amount
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, 'holding',
        $7, $8, $9
      )
      RETURNING id, start_time, expected_end_time, status, hold_expires_at, deposit_amount, created_at;
    `;

    const insertRes = await client.query(insertSql, [
      userId,
      lotId,
      targetSlotId,
      finalVehicleId,
      sTime,
      eTime,
      holdExpiresAt,
      hourlyRate,
      depositAmount,
    ]);

    // Ghi audit log
    await client.query(`
      INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, note)
      VALUES ($1, $2, 'HOLD_SPOT', 'reservation', $3, $4)
    `, [userId, lotId, insertRes.rows[0].id, `Giữ chỗ thành công ô ${updatedSlot.code}`]);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Giữ chỗ thành công! Vui lòng hoàn tất thanh toán cọc trước khi hết hạn.",
      data: {
        reservation_id: insertRes.rows[0].id,
        parking_lot_id: lotId,
        slot_id: targetSlotId,
        slot_code: updatedSlot.code,
        slot_type: updatedSlot.slot_type,
        status: "holding",
        hold_expires_at: insertRes.rows[0].hold_expires_at,
        deposit_amount: Number(insertRes.rows[0].deposit_amount),
        hourly_rate: hourlyRate,
        estimated_hours: Number(estimated_hours),
        start_time: insertRes.rows[0].start_time,
        expected_end_time: insertRes.rows[0].expected_end_time,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Lỗi khi giữ ô đỗ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xử lý giữ chỗ",
    });
  } finally {
    client.release();
  }
};

// POST /api/reservations/:id/release - Khách hàng hủy giữ ô hoặc rời khỏi thanh toán
export const releaseSpot = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const reservationId = req.params.id;
    await client.query("BEGIN");

    // Lấy thông tin đơn đặt chỗ
    const resRes = await client.query(
      "SELECT id, slot_id, status FROM reservations WHERE id = $1 FOR UPDATE",
      [reservationId]
    );

    if (resRes.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ success: false, message: "Không tìm thấy đơn đặt chỗ" });
      return;
    }

    const reservation = resRes.rows[0];
    if (reservation.status === "holding") {
      // Hủy reservation
      await client.query(
        "UPDATE reservations SET status = 'cancelled', cancel_reason = 'Người dùng chủ động hủy', cancelled_at = NOW() WHERE id = $1",
        [reservationId]
      );
      // Trả lại trạng thái ô đỗ về available
      await client.query(
        "UPDATE slots SET status = 'available', updated_at = NOW() WHERE id = $1 AND status = 'holding'",
        [reservation.slot_id]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Đã hủy giữ chỗ và trả lại ô đỗ thành công" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Lỗi khi giải phóng ô đỗ:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi hủy giữ chỗ" });
  } finally {
    client.release();
  }
};

// POST /api/reservations/:id/pay-deposit - Xác nhận thanh toán cọc thành công
export const payDeposit = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const reservationId = req.params.id;
    const { provider = "vnpay", transaction_ref = `TX-${Date.now()}` } = req.body;

    await client.query("BEGIN");

    const resRes = await client.query(
      "SELECT id, slot_id, status, deposit_amount FROM reservations WHERE id = $1 FOR UPDATE",
      [reservationId]
    );

    if (resRes.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ success: false, message: "Không tìm thấy đơn đặt chỗ" });
      return;
    }

    const reservation = resRes.rows[0];
    if (reservation.status !== "holding") {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        message: `Đơn đặt chỗ không ở trạng thái chờ thanh toán (Hiện tại: ${reservation.status})`,
      });
      return;
    }

    // Thời gian cho phép đến bãi: 20 phút
    const arrivalExpiresAt = new Date(Date.now() + 20 * 60 * 1000);

    // Cập nhật reservation sang trạng thái 'paid'
    await client.query(`
      UPDATE reservations
      SET status = 'paid', arrival_expires_at = $1, updated_at = NOW()
      WHERE id = $2
    `, [arrivalExpiresAt, reservationId]);

    // Ghi nhận thanh toán cọc
    await client.query(`
      INSERT INTO payments (reservation_id, provider, transaction_ref, payment_type, amount, status, paid_at)
      VALUES ($1, $2, $3, 'deposit', $4, 'success', NOW())
    `, [reservationId, provider, transaction_ref, reservation.deposit_amount]);

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Thanh toán cọc thành công! Vé QR đã được cấp.",
      data: {
        reservation_id: reservation.id,
        status: "paid",
        arrival_expires_at: arrivalExpiresAt,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Lỗi khi thanh toán cọc:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi thanh toán cọc" });
  } finally {
    client.release();
  }
};

// GET /api/reservations/active - Lấy thông tin giữ chỗ đang hoạt động
export const getActiveReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.query.user_id || 3;
    const sql = `
      SELECT 
        r.id,
        r.parking_lot_id,
        l.name AS lot_name,
        l.address AS lot_address,
        r.slot_id,
        s.code AS slot_code,
        s.slot_type,
        r.vehicle_id,
        v.license_plate,
        v.vehicle_name,
        r.start_time,
        r.expected_end_time,
        r.status,
        r.hold_expires_at,
        r.arrival_expires_at,
        r.deposit_amount,
        r.hourly_rate
      FROM reservations r
      JOIN slots s ON s.id = r.slot_id
      JOIN parking_lots l ON l.id = r.parking_lot_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.user_id = $1 AND r.status IN ('holding', 'paid')
      ORDER BY r.id DESC
      LIMIT 1;
    `;
    const { rows } = await query(sql, [userId]);
    res.json({
      success: true,
      data: rows[0] || null,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin đặt chỗ:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
