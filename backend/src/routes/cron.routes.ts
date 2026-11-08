import { Router, Request, Response } from "express";
import { executeCleanup, getWorkerStatus } from "../services/expiration.worker";
import { query } from "../config/db";

const router = Router();

// 1. GET /api/cron/status - Kiểm tra trạng thái hoạt động của bộ quét ngầm
router.get("/status", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: getWorkerStatus(),
  });
});

// 2. POST /api/cron/trigger-cleanup - Kích hoạt quét dọn dẹp ngay lập tức (không cần chờ chu kỳ)
router.post("/trigger-cleanup", async (req: Request, res: Response) => {
  try {
    const result = await executeCleanup();
    res.json({
      success: true,
      message: "Đã kích hoạt quét dọn dẹp ô đỗ và đơn quá hạn thành công!",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi kích hoạt quét dọn dẹp",
      error: error.message,
    });
  }
});

// 3. POST /api/cron/simulate-expire - Tiện ích mô phỏng hết hạn tức thì phục vụ bảo vệ đồ án / demo
router.post("/simulate-expire", async (req: Request, res: Response) => {
  try {
    const { reservation_id, type = "hold" } = req.body;

    if (!reservation_id) {
      res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp reservation_id để mô phỏng hết hạn.",
      });
      return;
    }

    if (type === "hold") {
      // Giả lập đơn bị quá hạn 10 phút chưa thanh toán cọc
      await query(
        `UPDATE reservations 
         SET hold_expires_at = NOW() - INTERVAL '1 minute', updated_at = NOW() 
         WHERE id = $1 AND status = 'holding';`,
        [reservation_id]
      );
    } else if (type === "arrival") {
      // Giả lập đơn bị quá hạn 20 phút không đến bãi sau khi đã cọc
      await query(
        `UPDATE reservations 
         SET arrival_expires_at = NOW() - INTERVAL '1 minute', updated_at = NOW() 
         WHERE id = $1 AND status = 'paid';`,
        [reservation_id]
      );
    }

    // Kích hoạt dọn dẹp ngay lập tức
    const cleanupResult = await executeCleanup();

    // Lấy trạng thái mới nhất của đơn
    const updatedRes = await query("SELECT id, status, cancel_reason, slot_id FROM reservations WHERE id = $1;", [reservation_id]);

    res.json({
      success: true,
      message: `Đã mô phỏng hết hạn loại '${type}' cho đơn #${reservation_id} thành công!`,
      data: {
        reservation: updatedRes.rows[0],
        cleanup_summary: cleanupResult,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Lỗi mô phỏng hết hạn",
      error: error.message,
    });
  }
});

export default router;
