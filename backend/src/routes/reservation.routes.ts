import { Router } from "express";
import {
  holdSpot,
  releaseSpot,
  cancelReservation,
  getActiveReservation,
  getMyReservations,
  getReservationById,
} from "../controllers/reservation.controller";
import { authenticateToken, optionalAuthenticateToken } from "../middlewares/auth.middleware";
import { getRelocationOptions, requestOccupiedSlotRefund, switchReservationSlot } from "../controllers/relocation.controller";

const router = Router();

// Lấy danh sách lịch sử đặt chỗ của tài xế
router.get("/", optionalAuthenticateToken, getMyReservations);

// Lấy lượt giữ chỗ đang hoạt động
router.get("/active", optionalAuthenticateToken, getActiveReservation);

// Lấy chi tiết đơn đặt chỗ & mã vé QR
router.get("/:id", optionalAuthenticateToken, getReservationById);

// Giữ chỗ (Atomic Update chống trùng)
router.post("/hold", optionalAuthenticateToken, holdSpot);

// Hủy giữ chỗ / giải phóng ô
router.post("/:id/release", optionalAuthenticateToken, releaseSpot);

// Hủy đặt chỗ (hoàn tiền cọc vào Ví EZ-Space nếu đã trả cọc)
router.post("/:id/cancel", optionalAuthenticateToken, cancelReservation);

router.get("/:id/relocation-options", authenticateToken, getRelocationOptions);
router.post("/:id/switch-slot", authenticateToken, switchReservationSlot);
router.post("/:id/refund-request", authenticateToken, requestOccupiedSlotRefund);

export default router;
