import { Router } from "express";
import { pool, query } from "../config/db";
import { authenticateToken, AuthRequest } from "../middlewares/auth.middleware";

const router = Router();
router.use(authenticateToken);
router.use((req: AuthRequest, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Chỉ quản trị viên được đối soát hoàn cọc" });
  next();
});

router.get("/pending", async (_req, res) => {
  try {
    const found = await query(`SELECT p.id, p.reservation_id, p.amount, p.provider, p.created_at,
      r.parking_lot_id, l.name AS lot_name, s.code AS slot_code,
      u.full_name AS customer_name, u.email AS customer_email
      FROM payments p JOIN reservations r ON r.id=p.reservation_id
      JOIN parking_lots l ON l.id=r.parking_lot_id JOIN slots s ON s.id=r.slot_id
      JOIN users u ON u.id=r.user_id
      WHERE p.payment_type='refund' AND p.status='pending'
      ORDER BY p.created_at ASC LIMIT 100`);
    res.json({ success: true, data: found.rows });
  } catch (error) {
    console.error("Pending refunds error:", error);
    res.status(500).json({ success: false, message: "Không tải được danh sách hoàn cọc" });
  }
});

router.post("/:paymentId/confirm", async (req: AuthRequest, res) => {
  const paymentId = Number(req.params.paymentId);
  const reference = typeof req.body?.transfer_reference === "string" ? req.body.transfer_reference.trim() : "";
  if (!Number.isSafeInteger(paymentId) || paymentId <= 0 || reference.length < 4 || reference.length > 150 || req.body?.transferred !== true) {
    return res.status(400).json({ success: false, message: "Chỉ xác nhận sau khi đã chuyển tiền thật và nhập mã giao dịch" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(`SELECT p.id, p.reservation_id, p.status, p.amount, r.parking_lot_id, r.status AS reservation_status
      FROM payments p JOIN reservations r ON r.id=p.reservation_id
      WHERE p.id=$1 AND p.payment_type='refund' FOR UPDATE OF p, r`, [paymentId]);
    const item = found.rows[0];
    if (!item || item.status !== "pending" || item.reservation_status !== "cancelled") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Yêu cầu hoàn cọc không còn chờ xử lý" });
    }
    await client.query(`UPDATE payments SET status='refunded', transaction_ref=$1, paid_at=NOW(), updated_at=NOW()
      WHERE id=$2`, [reference, paymentId]);
    await client.query("UPDATE reservations SET status='refunded', updated_at=NOW() WHERE id=$1", [item.reservation_id]);
    await client.query(`INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, note)
      VALUES ($1,$2,'MANUAL_REFUND_CONFIRMED','reservation',$3,$4)`,
      [req.user!.id, item.parking_lot_id, item.reservation_id, `Đã xác nhận chuyển cọc ${item.amount}đ; mã giao dịch ${reference}`]);
    await client.query("COMMIT");
    res.json({ success: true, message: "Đã ghi nhận hoàn cọc sau khi chuyển tiền", data: { reservation_id: item.reservation_id } });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Confirm refund error:", error);
    res.status(500).json({ success: false, message: "Không ghi nhận được hoàn cọc" });
  } finally { client.release(); }
});

export default router;
