import { Router } from "express";
import {
  holdSpot,
  releaseSpot,
  getActiveReservation,
} from "../controllers/reservation.controller";
import { optionalAuthenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Lấy lượt giữ chỗ đang hoạt động
router.get("/active", optionalAuthenticateToken, getActiveReservation);

// Giữ chỗ (Atomic Update chống trùng)
router.post("/hold", optionalAuthenticateToken, holdSpot);

// Hủy giữ chỗ / giải phóng ô
router.post("/:id/release", optionalAuthenticateToken, releaseSpot);

export default router;
