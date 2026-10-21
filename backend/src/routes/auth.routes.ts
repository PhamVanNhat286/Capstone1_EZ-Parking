import { Router } from "express";
import { register, login, getMe, updateProfile, changePassword, sendOtp, verifyOtp, checkExists } from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);
router.put("/profile", authenticateToken, updateProfile);
router.put("/change-password", authenticateToken, changePassword);

// OTP & Validation routes (không cần đăng nhập)
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/check-exists", checkExists);

export default router;

