import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import {
  getChatHistory,
  saveChatMessage,
  syncChatHistory,
  clearChatHistory,
} from "../controllers/chat.controller";

const router = Router();

// Toàn bộ các route dưới đây yêu cầu người dùng đã đăng nhập (JWT token)
router.get("/history", authenticateToken, getChatHistory);
router.post("/message", authenticateToken, saveChatMessage);
router.post("/sync", authenticateToken, syncChatHistory);
router.delete("/history", authenticateToken, clearChatHistory);

export default router;

