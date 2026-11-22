import { Router } from "express";
import {
  getMyBankAccounts,
  addBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
} from "../controllers/bank-account.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Tất cả các route quản lý tài khoản ngân hàng đều yêu cầu xác thực người dùng
router.use(authenticateToken);

router.get("/", getMyBankAccounts);
router.post("/", addBankAccount);
router.put("/:id", updateBankAccount);
router.delete("/:id", deleteBankAccount);
router.put("/:id/default", setDefaultBankAccount);

export default router;
