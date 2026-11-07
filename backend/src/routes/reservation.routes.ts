import { Router } from "express";
import {
  holdSpot,
  releaseSpot,
  payDeposit,
  getActiveReservation,
  getMyReservations,
  getReservationById,
} from "../controllers/reservation.controller";
import { optionalAuthenticateToken } from "../middlewares/auth.middleware";

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

// Thanh toán cọc
router.post("/:id/pay-deposit", optionalAuthenticateToken, payDeposit);

export default router;
