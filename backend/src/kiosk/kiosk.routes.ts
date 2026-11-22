import { Router } from "express";
import {
  scanIn,
  scanOut,
  getActiveSessions,
  getKioskStats,
} from "./kiosk.controller";
import { authenticateToken, type AuthRequest } from "../middlewares/auth.middleware";

const router = Router();
router.use(authenticateToken);
router.use((req: AuthRequest, res, next) => {
  if (req.user?.role !== "admin" && req.user?.role !== "manager") {
    res.status(403).json({ success: false, message: "Chỉ nhân viên bãi hoặc quản trị viên được quét vé." });
    return;
  }
  next();
});

// 1. Quét vé xe vào cổng
router.post("/scan-in", scanIn);

// 2. Quét vé xe xuất bãi & tính tiền
router.post("/scan-out", scanOut);

// 3. Danh sách các xe đang đỗ hoặc đang đến
router.get("/sessions", getActiveSessions);

// 4. Thống kê nhanh tình trạng bãi xe cho màn hình trạm gác
router.get("/stats", getKioskStats);

export default router;
