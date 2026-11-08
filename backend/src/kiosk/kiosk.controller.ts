import { Request, Response } from "express";
import { pool, query } from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * Trích xuất ID đơn đặt chỗ từ chuỗi mã QR hoặc tham số đầu vào
 * Hỗ trợ các định dạng:
 * 1. Số nguyên: "12" -> 12
 * 2. Chuỗi vé EZ-Space: "EZPARKING-DEMO-TICKET|ID=12|LOT=1|SPOT=A-01|VEHICLE=43A-123.45" -> 12
 * 3. Chuỗi JSON: '{"reservation_id": 12}' -> 12
 */
export const extractReservationId = (rawInput?: string | number): number | null => {
  if (!rawInput) return null;
  const str = String(rawInput).trim();

  // Dạng số nguyên thuần túy
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // Dạng chuỗi vé có chứa ID=...
  const matchId = str.match(/ID=(\d+)/i);
  if (matchId && matchId[1]) {
    return parseInt(matchId[1], 10);
  }

  // Dạng JSON
  try {
    const parsed = JSON.parse(str);
    if (parsed.reservation_id || parsed.id) {
      return parseInt(parsed.reservation_id || parsed.id, 10);
    }
  } catch {}

  return null;
};

// ============================================================
// 1. POST /api/kiosk/scan-in - Quét QR xác nhận xe vào bãi
// ============================================================
export const scanIn = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { ticket_code, reservation_id, parking_lot_id } = req.body;
    const resId = extractReservationId(reservation_id || ticket_code);

    if (!resId) {
      res.status(400).json({
        success: false,
        code: "INVALID_TICKET_FORMAT",
        message: "Mã vé không hợp lệ hoặc không tìm thấy mã đơn đặt chỗ.",
      });
      return;
    }

    await client.query("BEGIN");

    // Lấy thông tin đơn đặt chỗ (kèm lock dòng để chống xử lý đồng thời)
    const resSql = `
      SELECT 
        r.id,
        r.user_id,
        r.parking_lot_id,
        r.slot_id,
        r.vehicle_id,
        r.status,
        r.arrival_expires_at,
        r.deposit_amount,
        r.hourly_rate,
        r.start_time,
        r.expected_end_time,
        s.code AS slot_code,
        s.slot_type,
        s.status AS slot_status,
        l.name AS lot_name,
        l.address AS lot_address,
        v.license_plate,
        v.vehicle_name,
        v.vehicle_type,
        u.full_name AS customer_name,
        u.phone AS customer_phone
      FROM reservations r
      JOIN slots s ON s.id = r.slot_id
      JOIN parking_lots l ON l.id = r.parking_lot_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      JOIN users u ON u.id = r.user_id
      WHERE r.id = $1
      FOR UPDATE OF r, s;
    `;
    const resResult = await client.query(resSql, [resId]);

    if (resResult.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({
        success: false,
        code: "RESERVATION_NOT_FOUND",
        message: `Không tìm thấy đơn đặt chỗ #${resId} trong hệ thống.`,
      });
      return;
    }

    const r = resResult.rows[0];

    // Kiểm tra đúng bãi xe trực cổng (nếu Kiosk gửi parking_lot_id lên)
    if (parking_lot_id && Number(r.parking_lot_id) !== Number(parking_lot_id)) {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        code: "WRONG_PARKING_LOT",
        message: `Vé này thuộc "${r.lot_name}", không hợp lệ tại bãi hiện tại!`,
      });
      return;
    }

    // Kiểm tra trạng thái đơn đặt chỗ
    if (r.status === "entered") {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        code: "ALREADY_CHECKED_IN",
        message: `Xe ${r.license_plate || ""} đã check-in vào bãi trước đó. Hiện đang đỗ tại ô ${r.slot_code}.`,
        data: {
          reservation_id: r.id,
          slot_code: r.slot_code,
          vehicle_plate: r.license_plate,
        },
      });
      return;
    }

    if (r.status === "completed") {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        code: "ALREADY_COMPLETED",
        message: "Đơn đặt chỗ này đã hoàn thành lượt đỗ trước đó.",
      });
      return;
    }

    if (r.status === "cancelled" || r.status === "forfeited") {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        code: "RESERVATION_EXPIRED_OR_CANCELLED",
        message: `Đơn đặt chỗ này đã bị hủy hoặc hết hạn (Trạng thái: ${r.status}). Không thể vào bãi.`,
      });
      return;
    }

    if (r.status === "holding") {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        code: "UNPAID_DEPOSIT",
        message: "Khách hàng chưa thanh toán tiền cọc giữ chỗ. Vui lòng thanh toán cọc trước khi vào bãi.",
      });
      return;
    }

    // Kiểm tra thời hạn đến bãi (arrival_expires_at - mặc định 20 phút)
    if (r.arrival_expires_at && new Date() > new Date(r.arrival_expires_at)) {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        code: "ARRIVAL_DEADLINE_EXPIRED",
        message: `Vé đã quá thời hạn đến bãi cho phép (${new Date(r.arrival_expires_at).toLocaleTimeString("vi-VN")}).`,
      });
      return;
    }

    // ================= XỬ LÝ HỢP LỆ =================
    const guardId = req.user?.id || 2; // Fallback Manager / Guard User ID 2

    // 1. Cập nhật trạng thái reservation sang 'entered'
    await client.query(`
      UPDATE reservations
      SET status = 'entered', updated_at = NOW()
      WHERE id = $1;
    `, [r.id]);

    // 2. Chuyển ô đỗ sang 'occupied' (Màu ĐỎ trên sơ đồ 2D)
    await client.query(`
      UPDATE slots
      SET status = 'occupied', updated_at = NOW()
      WHERE id = $1;
    `, [r.slot_id]);

    // 3. Cập nhật hoặc tạo vé QR sang 'used'
    await client.query(`
      INSERT INTO qr_tickets (reservation_id, token_hash, status, used_at, expires_at)
      VALUES ($1, $2, 'used', NOW(), NOW() + INTERVAL '1 day')
      ON CONFLICT (reservation_id)
      DO UPDATE SET status = 'used', used_at = NOW();
    `, [r.id, `TOKEN-${r.id}-${Date.now()}`]);

    // 4. Tạo phiên đỗ xe thực tế (parking_sessions)
    const sessionRes = await client.query(`
      INSERT INTO parking_sessions (reservation_id, check_in_at, checked_in_by, status)
      VALUES ($1, NOW(), $2, 'active')
      ON CONFLICT (reservation_id)
      DO UPDATE SET check_in_at = NOW(), checked_in_by = $2, status = 'active', updated_at = NOW()
      RETURNING id, check_in_at;
    `, [r.id, guardId]);

    await client.query("COMMIT");

    const checkInTime = sessionRes.rows[0]?.check_in_at || new Date();

    res.status(200).json({
      success: true,
      message: "Quét vé vào cổng thành công! Mời xe vào bãi.",
      data: {
        session_id: sessionRes.rows[0]?.id,
        reservation_id: r.id,
        slot_code: r.slot_code,
        slot_type: r.slot_type,
        lot_id: r.parking_lot_id,
        lot_name: r.lot_name,
        vehicle_plate: r.license_plate,
        vehicle_name: r.vehicle_name,
        vehicle_type: r.vehicle_type,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        deposit_amount: Number(r.deposit_amount),
        hourly_rate: Number(r.hourly_rate),
        check_in_at: checkInTime,
        status: "entered",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Kiosk] Lỗi khi quét vé vào bãi:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xử lý quét vé vào bãi.",
    });
  } finally {
    client.release();
  }
};

// ============================================================
// 2. POST /api/kiosk/scan-out - Quét QR xác nhận xe rời bãi & tính tiền
// ============================================================
export const scanOut = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { ticket_code, reservation_id, slot_code, parking_lot_id } = req.body;
    let resId = extractReservationId(reservation_id || ticket_code);

    await client.query("BEGIN");

    // Nếu không có ID đơn, cho phép tìm theo mã ô đỗ đang 'occupied' của bãi xe
    if (!resId && slot_code && parking_lot_id) {
      const findSlotRes = await client.query(`
        SELECT r.id 
        FROM reservations r
        JOIN slots s ON s.id = r.slot_id
        WHERE s.parking_lot_id = $1 AND s.code = $2 AND r.status = 'entered'
        ORDER BY r.id DESC LIMIT 1;
      `, [parking_lot_id, slot_code]);
      if (findSlotRes.rows.length > 0) {
        resId = Number(findSlotRes.rows[0].id);
      }
    }

    if (!resId) {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        code: "INVALID_IDENTIFIER",
        message: "Vui lòng cung cấp mã vé hoặc thông tin ô đỗ để xuất bãi.",
      });
      return;
    }

    // Lấy thông tin đơn đặt chỗ & session
    const resSql = `
      SELECT 
        r.id,
        r.user_id,
        r.parking_lot_id,
        r.slot_id,
        r.status,
        r.deposit_amount,
        r.hourly_rate,
        s.code AS slot_code,
        l.name AS lot_name,
        v.license_plate,
        v.vehicle_name,
        u.full_name AS customer_name,
        ps.id AS session_id,
        COALESCE(ps.check_in_at, r.updated_at, NOW() - INTERVAL '1 hour') AS check_in_at
      FROM reservations r
      JOIN slots s ON s.id = r.slot_id
      JOIN parking_lots l ON l.id = r.parking_lot_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      JOIN users u ON u.id = r.user_id
      LEFT JOIN parking_sessions ps ON ps.reservation_id = r.id
      WHERE r.id = $1
      FOR UPDATE OF r, s;
    `;
    const resResult = await client.query(resSql, [resId]);

    if (resResult.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn đặt chỗ #${resId}.`,
      });
      return;
    }

    const r = resResult.rows[0];

    if (r.status !== "entered") {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        message: `Đơn này hiện không ở trạng thái đang trong bãi (Trạng thái hiện tại: ${r.status}).`,
      });
      return;
    }

    // ================= TÍNH TOÁN THỜI GIAN & CHI PHÍ =================
    const checkInTime = new Date(r.check_in_at);
    const checkOutTime = new Date();
    const diffMs = Math.max(0, checkOutTime.getTime() - checkInTime.getTime());
    const totalMinutes = Math.max(1, Math.ceil(diffMs / (1000 * 60)));
    
    // Quy tắc tính giờ: làm tròn lên giờ tiếp theo (vd: 1h15p tính 2h)
    const billableHours = Math.max(1, Math.ceil(totalMinutes / 60));
    const hourlyRate = Number(r.hourly_rate || 20000);
    const totalParkingFee = billableHours * hourlyRate;
    const depositPaid = Number(r.deposit_amount || 50000);

    // Tính phần chênh lệch với tiền cọc đã trả
    const diffAmount = totalParkingFee - depositPaid;
    const additionalFee = Math.max(0, diffAmount);     // Cần thu thêm
    const refundFee = Math.max(0, -diffAmount);        // Hoàn lại cho khách

    const guardId = req.user?.id || 2;

    // 1. Giải phóng ô đỗ về 'available' (Màu XANH trên sơ đồ 2D)
    await client.query(`
      UPDATE slots
      SET status = 'available', updated_at = NOW()
      WHERE id = $1;
    `, [r.slot_id]);

    // 2. Chuyển trạng thái reservation sang 'completed'
    await client.query(`
      UPDATE reservations
      SET status = 'completed', total_amount = $1, updated_at = NOW()
      WHERE id = $2;
    `, [totalParkingFee, r.id]);

    // 3. Cập nhật parking_sessions
    if (r.session_id) {
      await client.query(`
        UPDATE parking_sessions
        SET check_out_at = NOW(), checked_out_by = $1, final_amount = $2, status = 'completed', updated_at = NOW()
        WHERE id = $3;
      `, [guardId, totalParkingFee, r.session_id]);
    }

    // 4. Ghi nhận giao dịch thanh toán cuối nếu có thu thêm
    if (additionalFee > 0) {
      await client.query(`
        INSERT INTO payments (reservation_id, provider, transaction_ref, payment_type, amount, status, paid_at)
        VALUES ($1, 'card', $2, 'final', $3, 'success', NOW());
      `, [r.id, `TX-FINAL-${r.id}-${Date.now()}`, additionalFee]);
    }

    await client.query("COMMIT");

    const hoursText = Math.floor(totalMinutes / 60);
    const minsText = totalMinutes % 60;
    const durationText = hoursText > 0 
      ? `${hoursText} giờ ${minsText > 0 ? `${minsText} phút` : ""}`.trim()
      : `${minsText} phút`;

    res.json({
      success: true,
      message: "Xe đã rời bãi thành công. Ô đỗ đã được giải phóng!",
      data: {
        reservation_id: r.id,
        slot_code: r.slot_code,
        lot_name: r.lot_name,
        vehicle_plate: r.license_plate,
        vehicle_name: r.vehicle_name,
        customer_name: r.customer_name,
        check_in_at: checkInTime,
        check_out_at: checkOutTime,
        duration_minutes: totalMinutes,
        duration_text: durationText,
        billable_hours: billableHours,
        hourly_rate: hourlyRate,
        deposit_amount: depositPaid,
        total_amount: totalParkingFee,
        additional_fee: additionalFee,
        refund_fee: refundFee,
        status: "completed",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Kiosk] Lỗi khi xử lý xe rời bãi:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xử lý xe rời bãi.",
    });
  } finally {
    client.release();
  }
};

// ============================================================
// 3. GET /api/kiosk/sessions - Danh sách xe đang trong bãi / chuẩn bị đến
// ============================================================
export const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { parking_lot_id, status } = req.query;

    let filterSql = "WHERE 1=1";
    const params: any[] = [];

    if (parking_lot_id) {
      params.push(parking_lot_id);
      filterSql += ` AND r.parking_lot_id = $${params.length}`;
    }

    if (status === "entered") {
      filterSql += " AND r.status = 'entered'";
    } else if (status === "paid") {
      filterSql += " AND r.status = 'paid'";
    } else {
      filterSql += " AND r.status IN ('paid', 'entered')";
    }

    const sql = `
      SELECT 
        r.id AS reservation_id,
        r.parking_lot_id,
        l.name AS lot_name,
        r.slot_id,
        s.code AS slot_code,
        s.slot_type,
        v.license_plate,
        v.vehicle_name,
        v.vehicle_type,
        u.full_name AS customer_name,
        u.phone AS customer_phone,
        r.status,
        r.deposit_amount,
        r.hourly_rate,
        r.arrival_expires_at,
        ps.id AS session_id,
        ps.check_in_at,
        r.created_at
      FROM reservations r
      JOIN slots s ON s.id = r.slot_id
      JOIN parking_lots l ON l.id = r.parking_lot_id
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      JOIN users u ON u.id = r.user_id
      LEFT JOIN parking_sessions ps ON ps.reservation_id = r.id AND ps.status = 'active'
      ${filterSql}
      ORDER BY 
        CASE WHEN r.status = 'entered' THEN 1 ELSE 2 END,
        r.id DESC;
    `;

    const { rows } = await query(sql, params);
    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("[Kiosk] Lỗi khi lấy danh sách phiên đỗ xe:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách phiên đỗ xe.",
    });
  }
};

// ============================================================
// 4. GET /api/kiosk/stats - Thống kê nhanh tại trạm Kiosk
// ============================================================
export const getKioskStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const lotId = req.query.parking_lot_id || 1;

    const sql = `
      SELECT 
        COUNT(CASE WHEN status = 'available' THEN 1 END) AS available,
        COUNT(CASE WHEN status = 'holding' THEN 1 END) AS holding,
        COUNT(CASE WHEN status = 'occupied' THEN 1 END) AS occupied,
        COUNT(id) AS total_slots
      FROM slots
      WHERE parking_lot_id = $1 AND is_active = TRUE;
    `;
    const slotStats = await query(sql, [lotId]);

    const sessionSql = `
      SELECT 
        COUNT(CASE WHEN r.status = 'paid' THEN 1 END) AS awaiting_arrival,
        COUNT(CASE WHEN r.status = 'entered' THEN 1 END) AS currently_parked,
        COUNT(CASE WHEN r.status = 'completed' AND r.updated_at >= CURRENT_DATE THEN 1 END) AS completed_today
      FROM reservations r
      WHERE r.parking_lot_id = $1;
    `;
    const sessionStats = await query(sessionSql, [lotId]);

    res.json({
      success: true,
      data: {
        lot_id: Number(lotId),
        slots: {
          total: Number(slotStats.rows[0]?.total_slots || 0),
          available: Number(slotStats.rows[0]?.available || 0),
          holding: Number(slotStats.rows[0]?.holding || 0),
          occupied: Number(slotStats.rows[0]?.occupied || 0),
        },
        traffic: {
          awaiting_arrival: Number(sessionStats.rows[0]?.awaiting_arrival || 0),
          currently_parked: Number(sessionStats.rows[0]?.currently_parked || 0),
          completed_today: Number(sessionStats.rows[0]?.completed_today || 0),
        },
      },
    });
  } catch (error) {
    console.error("[Kiosk] Lỗi thống kê Kiosk:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
