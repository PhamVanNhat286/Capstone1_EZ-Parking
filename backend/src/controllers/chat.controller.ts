import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { query } from "../config/db";

/**
 * Lấy toàn bộ lịch sử trò chuyện AI của tài khoản người dùng
 * GET /api/chat/history
 */
export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      return;
    }

    const result = await query(
      `SELECT id, role, message, cards, chips, created_at 
       FROM chat_messages 
       WHERE user_id = $1 
       ORDER BY created_at ASC 
       LIMIT 200`,
      [userId]
    );

    const messages = result.rows.map((row: any) => ({
      id: String(row.id),
      role: row.role as "user" | "ai",
      text: row.message,
      cards: row.cards || [],
      chips: row.chips || [],
      timestamp: new Date(row.created_at).getTime(),
    }));

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("[ChatController] Lỗi khi lấy lịch sử chat:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tải lịch sử trò chuyện",
    });
  }
};

/**
 * Lưu 1 tin nhắn mới (user hoặc ai) vào cơ sở dữ liệu
 * POST /api/chat/message
 */
export const saveChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      return;
    }

    const { role, message, text, cards, chips } = req.body;
    const content = (message || text || "").trim();

    if (!role || (role !== "user" && role !== "ai")) {
      res.status(400).json({ success: false, message: "role không hợp lệ (phải là 'user' hoặc 'ai')" });
      return;
    }

    if (!content) {
      res.status(400).json({ success: false, message: "Nội dung tin nhắn không được để trống" });
      return;
    }

    const safeCards = Array.isArray(cards) ? JSON.stringify(cards) : JSON.stringify([]);
    const safeChips = Array.isArray(chips) ? JSON.stringify(chips) : JSON.stringify([]);

    const result = await query(
      `INSERT INTO chat_messages (user_id, role, message, cards, chips)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING id, role, message, cards, chips, created_at`,
      [userId, role, content, safeCards, safeChips]
    );

    const saved = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: String(saved.id),
        role: saved.role,
        text: saved.message,
        cards: saved.cards || [],
        chips: saved.chips || [],
        timestamp: new Date(saved.created_at).getTime(),
      },
    });
  } catch (error) {
    console.error("[ChatController] Lỗi khi lưu tin nhắn chat:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lưu tin nhắn",
    });
  }
};

/**
 * Đồng bộ danh sách tin nhắn (ví dụ từ guest local sau khi đăng nhập)
 * POST /api/chat/sync
 */
export const syncChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      return;
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.json({ success: true, count: 0, message: "Không có tin nhắn nào cần đồng bộ" });
      return;
    }

    let insertedCount = 0;
    for (const msg of messages) {
      const role = msg.role;
      const content = (msg.text || msg.message || "").trim();
      if ((role === "user" || role === "ai") && content) {
        const safeCards = Array.isArray(msg.cards) ? JSON.stringify(msg.cards) : JSON.stringify([]);
        const safeChips = Array.isArray(msg.chips) ? JSON.stringify(msg.chips) : JSON.stringify([]);
        const createdAt = msg.timestamp ? new Date(msg.timestamp) : new Date();

        await query(
          `INSERT INTO chat_messages (user_id, role, message, cards, chips, created_at)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
          [userId, role, content, safeCards, safeChips, createdAt]
        );
        insertedCount++;
      }
    }

    res.json({
      success: true,
      count: insertedCount,
      message: `Đã đồng bộ thành công ${insertedCount} tin nhắn vào tài khoản`,
    });
  } catch (error) {
    console.error("[ChatController] Lỗi khi đồng bộ tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi đồng bộ tin nhắn",
    });
  }
};

/**
 * Xóa toàn bộ lịch sử trò chuyện của tài khoản
 * DELETE /api/chat/history
 */
export const clearChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      return;
    }

    await query(`DELETE FROM chat_messages WHERE user_id = $1`, [userId]);

    res.json({
      success: true,
      message: "Đã xóa toàn bộ lịch sử trò chuyện AI của bạn thành công",
    });
  } catch (error) {
    console.error("[ChatController] Lỗi khi xóa lịch sử chat:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa lịch sử trò chuyện",
    });
  }
};

