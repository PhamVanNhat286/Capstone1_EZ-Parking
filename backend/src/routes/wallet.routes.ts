import { Router } from "express";
import { getWallet, withdraw, topup } from "../controllers/wallet.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Lấy số dư và lịch sử giao dịch ví
router.get("/", authenticateToken, getWallet);

// Rút tiền về tài khoản ngân hàng
router.post("/withdraw", authenticateToken, withdraw);

// Nạp tiền demo
router.post("/topup", authenticateToken, topup);

export default router;
