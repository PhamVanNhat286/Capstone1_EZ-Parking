import { Router } from "express";
import {
  scanIn,
  scanOut,
  getActiveSessions,
  getKioskStats,
} from "./kiosk.controller";
import { optionalAuthenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// 1. Quét vé xe vào cổng
router.post("/scan-in", optionalAuthenticateToken, scanIn);

// 2. Quét vé xe xuất bãi & tính tiền
router.post("/scan-out", optionalAuthenticateToken, scanOut);

// 3. Danh sách các xe đang đỗ hoặc đang đến
router.get("/sessions", optionalAuthenticateToken, getActiveSessions);

// 4. Thống kê nhanh tình trạng bãi xe cho màn hình trạm gác
router.get("/stats", optionalAuthenticateToken, getKioskStats);

export default router;
