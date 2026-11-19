import { Response } from "express";
import { pool, query } from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";

const reservationId = (req: AuthRequest) => {
  const id = Number(String(req.params.id).replace(/^EZ-/i, ""));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const optionsSql = `
  SELECT s.id, s.code FROM slots s
  WHERE s.parking_lot_id=$1 AND s.slot_type=$2 AND s.id<>$3
    AND s.is_active=TRUE AND s.status='available'
    AND NOT EXISTS (
      SELECT 1 FROM reservations other
      WHERE other.slot_id=s.id AND other.status IN ('holding','paid','entered')
        AND (other.status<>'holding' OR other.hold_expires_at>NOW())
        AND other.start_time < $5::timestamptz
        AND other.expected_end_time > $4::timestamptz
    )
  ORDER BY s.code LIMIT 10`;

const loadReservation = (client: { query: (sql: string, args: unknown[]) => Promise<{ rows: any[] }> }, id: number, userId: number) =>
  client.query(`SELECT r.id, r.user_id, r.parking_lot_id, r.slot_id, r.start_time, r.expected_end_time,
    r.status, r.arrival_expires_at, r.deposit_amount, s.code AS slot_code, s.slot_type, s.status AS slot_status
    FROM reservations r JOIN slots s ON s.id=r.slot_id WHERE r.id=$1 AND r.user_id=$2 FOR UPDATE OF r`, [id, userId]);

const findOptions = (client: { query: (sql: string, args: unknown[]) => Promise<{ rows: any[] }> }, r: any) =>
  client.query(optionsSql, [r.parking_lot_id, r.slot_type, r.slot_id, r.start_time, r.expected_end_time]);

export const getRelocationOptions = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = reservationId(req);
  if (!id || !req.user?.id) { res.status(400).json({ success: false, message: "Vé không hợp lệ" }); return; }
  try {
    const found = await loadReservation({ query }, id, req.user.id);
    const r = found.rows[0];
    if (!r) { res.status(404).json({ success: false, message: "Không tìm thấy vé của bạn" }); return; }
    const needsMove = r.status === "paid" && r.slot_status === "occupied" && new Date(r.start_time).getTime() <= Date.now() && new Date(r.arrival_expires_at).getTime() > Date.now();
    const options = needsMove ? (await findOptions({ query }, r)).rows : [];
    res.json({ success: true, data: { needsMove, originalSlot: r.slot_code, options } });
  } catch (error) {
    console.error("Relocation options error:", error);
    res.status(500).json({ success: false, message: "Không lấy được ô thay thế" });
  }
};

export const switchReservationSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = reservationId(req);
  const nextSlotId = Number(req.body?.slot_id);
  if (!id || !req.user?.id || !Number.isSafeInteger(nextSlotId)) {
    res.status(400).json({ success: false, message: "Thông tin đổi ô không hợp lệ" }); return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await loadReservation(client, id, req.user.id);
    const r = found.rows[0];
    if (!r || r.status !== "paid" || new Date(r.start_time).getTime() > Date.now() || new Date(r.arrival_expires_at).getTime() <= Date.now()) {
      await client.query("ROLLBACK"); res.status(409).json({ success: false, message: "Vé không còn hiệu lực để đổi ô" }); return;
    }
    if (r.slot_status !== "occupied") {
      await client.query("ROLLBACK"); res.status(409).json({ success: false, message: "Ô đã đặt hiện đã trống; bạn có thể dùng ô ban đầu" }); return;
    }
    const slot = await client.query(`SELECT id, code, slot_type, status FROM slots
      WHERE id=$1 AND parking_lot_id=$2 AND is_active=TRUE FOR UPDATE`, [nextSlotId, r.parking_lot_id]);
    const chosen = slot.rows[0];
    if (!chosen || chosen.id === r.slot_id || chosen.slot_type !== r.slot_type || chosen.status !== "available") {
      await client.query("ROLLBACK"); res.status(409).json({ success: false, message: "Ô thay thế không còn phù hợp hoặc đã có xe" }); return;
    }
    const conflicts = await client.query(`SELECT 1 FROM reservations other WHERE other.slot_id=$1
      AND other.status IN ('holding','paid','entered')
      AND (other.status<>'holding' OR other.hold_expires_at>NOW())
      AND other.start_time < $3::timestamptz
      AND other.expected_end_time > $2::timestamptz LIMIT 1`,
      [nextSlotId, r.start_time, r.expected_end_time]);
    if (conflicts.rows.length) {
      await client.query("ROLLBACK"); res.status(409).json({ success: false, message: "Ô thay thế vừa được người khác đặt" }); return;
    }
    await client.query("UPDATE reservations SET slot_id=$1, updated_at=NOW() WHERE id=$2", [nextSlotId, id]);
    await client.query(`INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, note)
      VALUES ($1,$2,'RELOCATE_OCCUPIED_SLOT','reservation',$3,$4)`,
      [req.user.id, r.parking_lot_id, id, `Đổi ô ${r.slot_code} sang ${chosen.code} vì ô cũ còn xe`]);
    await client.query("COMMIT");
    res.json({ success: true, data: { slot_id: nextSlotId, slot_code: chosen.code }, message: `Đã chuyển vé sang ô ${chosen.code}` });
  } catch (error) {
    await client.query("ROLLBACK"); console.error("Relocation error:", error);
    res.status(500).json({ success: false, message: "Không đổi được ô" });
  } finally { client.release(); }
};

export const requestOccupiedSlotRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = reservationId(req);
  if (!id || !req.user?.id) { res.status(400).json({ success: false, message: "Vé không hợp lệ" }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await loadReservation(client, id, req.user.id);
    const r = found.rows[0];
    if (!r || r.status !== "paid" || r.slot_status !== "occupied" || new Date(r.start_time).getTime() > Date.now() || new Date(r.arrival_expires_at).getTime() <= Date.now()) {
      await client.query("ROLLBACK"); res.status(409).json({ success: false, message: "Vé không đủ điều kiện yêu cầu hoàn cọc theo lỗi ô còn xe" }); return;
    }
    const options = await findOptions(client, r);
    if (options.rows.length) {
      await client.query("ROLLBACK"); res.status(409).json({ success: false, message: "Vẫn còn ô tương đương; vui lòng chọn ô thay thế" }); return;
    }
    const deposit = await client.query(`SELECT provider, amount FROM payments WHERE reservation_id=$1
      AND payment_type='deposit' AND status='success' ORDER BY id DESC LIMIT 1`, [id]);
    if (!deposit.rows[0]) {
      await client.query("ROLLBACK"); res.status(409).json({ success: false, message: "Chưa tìm thấy giao dịch cọc để đối soát hoàn tiền" }); return;
    }
    await client.query(`UPDATE reservations SET status='cancelled', cancel_reason='Ô còn xe; chờ hoàn cọc thủ công',
      cancelled_at=NOW(), updated_at=NOW() WHERE id=$1`, [id]);
    await client.query(`INSERT INTO payments (reservation_id, provider, transaction_ref, payment_type, amount, status)
      VALUES ($1,$2,$3,'refund',$4,'pending')`,
      [id, deposit.rows[0].provider, `REFUND-REQUEST-${id}`, deposit.rows[0].amount]);
    await client.query(`INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, note)
      VALUES ($1,$2,'REFUND_REQUEST_OCCUPIED_SLOT','reservation',$3,$4)`,
      [req.user.id, r.parking_lot_id, id, "Khách đến nhưng ô còn xe, không có ô tương đương; yêu cầu hoàn cọc chờ nhân viên xử lý"]);
    await client.query("COMMIT");
    res.json({ success: true, data: { status: "pending" }, message: "Đã ghi yêu cầu hoàn cọc. Nhân viên cần đối soát và chuyển tiền; tiền chưa được hoàn tự động." });
  } catch (error) {
    await client.query("ROLLBACK"); console.error("Refund request error:", error);
    res.status(500).json({ success: false, message: "Không gửi được yêu cầu hoàn cọc" });
  } finally { client.release(); }
};
