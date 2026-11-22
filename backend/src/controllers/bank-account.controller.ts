import { Response } from "express";
import { query } from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";

// GET /api/bank-accounts - Lấy danh sách tài khoản ngân hàng của user hiện tại
export const getMyBankAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const result = await query(
      `SELECT id, user_id, type, bank_name, account_number, account_name, branch, is_default, created_at, updated_at
       FROM user_bank_accounts 
       WHERE user_id = $1 
       ORDER BY is_default DESC, id DESC;`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách tài khoản ngân hàng:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách tài khoản ngân hàng",
    });
  }
};

// POST /api/bank-accounts - Thêm tài khoản ngân hàng mới
// RÀNG BUỘC NGHIỆP VỤ: Không cho phép trùng cặp (bank_name + account_number) trên toàn hệ thống. Tên chủ thẻ được phép trùng.
export const addBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const { type, bank_name, account_number, account_name, branch, is_default } = req.body;

    if (!bank_name || !bank_name.trim()) {
      res.status(400).json({ success: false, message: "Vui lòng chọn ngân hàng thụ hưởng" });
      return;
    }

    if (!account_number || !account_number.trim()) {
      res.status(400).json({ success: false, message: "Vui lòng nhập số tài khoản ngân hàng" });
      return;
    }

    if (!account_name || !account_name.trim()) {
      res.status(400).json({ success: false, message: "Vui lòng nhập tên chủ tài khoản" });
      return;
    }

    const cleanBank = bank_name.trim();
    const cleanNumber = account_number.replace(/\s+/g, "").trim();
    const cleanName = account_name.trim().toUpperCase();
    const cleanBranch = branch && branch.trim() ? branch.trim() : null;
    const cleanType = type || "banking";

    // 1. Kiểm tra trùng lặp trên TOÀN HỆ THỐNG theo cặp (bank_name + account_number)
    const existing = await query(
      `SELECT id, user_id, bank_name, account_number 
       FROM user_bank_accounts 
       WHERE LOWER(TRIM(bank_name)) = LOWER(TRIM($1)) 
         AND LOWER(TRIM(account_number)) = LOWER(TRIM($2));`,
      [cleanBank, cleanNumber]
    );

    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (Number(match.user_id) === Number(req.user.id)) {
        res.status(400).json({
          success: false,
          message: `Bạn đã liên kết tài khoản ngân hàng ${cleanBank} (STK: ${cleanNumber}) rồi.`,
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Tài khoản ngân hàng ${cleanBank} (STK: ${cleanNumber}) đã được liên kết với một tài khoản khác trong hệ thống. Mỗi tài khoản ngân hàng chỉ được liên kết với 1 tài khoản EZ-Space duy nhất.`,
        });
      }
      return;
    }

    // 2. Xử lý đặt làm mặc định
    const countRes = await query("SELECT COUNT(*) FROM user_bank_accounts WHERE user_id = $1;", [req.user.id]);
    const isFirst = Number(countRes.rows[0]?.count || 0) === 0;
    const shouldBeDefault = Boolean(is_default) || isFirst;

    if (shouldBeDefault) {
      await query("UPDATE user_bank_accounts SET is_default = FALSE WHERE user_id = $1;", [req.user.id]);
    }

    // 3. Chèn vào database
    const insertRes = await query(
      `INSERT INTO user_bank_accounts (user_id, type, bank_name, account_number, account_name, branch, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, type, bank_name, account_number, account_name, branch, is_default, created_at, updated_at;`,
      [req.user.id, cleanType, cleanBank, cleanNumber, cleanName, cleanBranch, shouldBeDefault]
    );

    res.status(201).json({
      success: true,
      message: "Liên kết tài khoản ngân hàng thành công",
      data: insertRes.rows[0],
    });
  } catch (error: any) {
    console.error("Lỗi thêm tài khoản ngân hàng:", error);
    // Bắt lỗi unique constraint từ Postgres nếu có race condition
    if (error.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Tài khoản ngân hàng này đã được liên kết với một tài khoản khác trong hệ thống.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi thêm tài khoản ngân hàng",
    });
  }
};

// PUT /api/bank-accounts/:id - Cập nhật tài khoản ngân hàng
export const updateBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const { id } = req.params;
    const { type, bank_name, account_number, account_name, branch, is_default } = req.body;

    const target = await query("SELECT id, user_id FROM user_bank_accounts WHERE id = $1 AND user_id = $2;", [
      id,
      req.user.id,
    ]);

    if (target.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy tài khoản ngân hàng để sửa" });
      return;
    }

    const cleanBank = bank_name ? bank_name.trim() : null;
    const cleanNumber = account_number ? account_number.replace(/\s+/g, "").trim() : null;
    const cleanName = account_name ? account_name.trim().toUpperCase() : null;
    const cleanBranch = branch !== undefined ? (branch ? branch.trim() : null) : undefined;
    const cleanType = type || undefined;

    // Kiểm tra trùng lặp nếu sửa bank_name hoặc account_number
    if (cleanBank && cleanNumber) {
      const existing = await query(
        `SELECT id, user_id FROM user_bank_accounts 
         WHERE LOWER(TRIM(bank_name)) = LOWER(TRIM($1)) 
           AND LOWER(TRIM(account_number)) = LOWER(TRIM($2))
           AND id != $3;`,
        [cleanBank, cleanNumber, id]
      );

      if (existing.rows.length > 0) {
        const match = existing.rows[0];
        if (Number(match.user_id) === Number(req.user.id)) {
          res.status(400).json({
            success: false,
            message: `Bạn đã có một tài khoản khác cùng ngân hàng ${cleanBank} và STK ${cleanNumber}.`,
          });
        } else {
          res.status(400).json({
            success: false,
            message: `Tài khoản ngân hàng ${cleanBank} (STK: ${cleanNumber}) đã được liên kết với một tài khoản khác trong hệ thống.`,
          });
        }
        return;
      }
    }

    if (is_default === true) {
      await query("UPDATE user_bank_accounts SET is_default = FALSE WHERE user_id = $1;", [req.user.id]);
    }

    const updateRes = await query(
      `UPDATE user_bank_accounts
       SET bank_name = COALESCE($1, bank_name),
           account_number = COALESCE($2, account_number),
           account_name = COALESCE($3, account_name),
           branch = COALESCE($4, branch),
           type = COALESCE($5, type),
           is_default = COALESCE($6, is_default),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING id, user_id, type, bank_name, account_number, account_name, branch, is_default, created_at, updated_at;`,
      [cleanBank, cleanNumber, cleanName, cleanBranch, cleanType, is_default, id, req.user.id]
    );

    res.json({
      success: true,
      message: "Cập nhật tài khoản ngân hàng thành công",
      data: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật tài khoản ngân hàng:", error);
    if (error.code === "23505") {
      res.status(400).json({
        success: false,
        message: "Tài khoản ngân hàng này đã được liên kết với một tài khoản khác trong hệ thống.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật tài khoản ngân hàng",
    });
  }
};

// DELETE /api/bank-accounts/:id - Xoá tài khoản ngân hàng
export const deleteBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const { id } = req.params;

    const delRes = await query(
      "DELETE FROM user_bank_accounts WHERE id = $1 AND user_id = $2 RETURNING is_default;",
      [id, req.user.id]
    );

    if (delRes.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy tài khoản ngân hàng để xoá" });
      return;
    }

    // Nếu tài khoản bị xoá là mặc định, gán tài khoản gần nhất còn lại làm mặc định
    if (delRes.rows[0].is_default) {
      await query(
        `UPDATE user_bank_accounts 
         SET is_default = TRUE 
         WHERE id = (SELECT id FROM user_bank_accounts WHERE user_id = $1 ORDER BY id DESC LIMIT 1);`,
        [req.user.id]
      );
    }

    res.json({
      success: true,
      message: "Đã xoá tài khoản ngân hàng thành công",
    });
  } catch (error) {
    console.error("Lỗi xoá tài khoản ngân hàng:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xoá tài khoản ngân hàng",
    });
  }
};

// PUT /api/bank-accounts/:id/default - Đặt làm tài khoản nhận tiền mặc định
export const setDefaultBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const { id } = req.params;

    const check = await query("SELECT id FROM user_bank_accounts WHERE id = $1 AND user_id = $2;", [id, req.user.id]);
    if (check.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy tài khoản ngân hàng" });
      return;
    }

    await query("UPDATE user_bank_accounts SET is_default = FALSE WHERE user_id = $1;", [req.user.id]);
    await query("UPDATE user_bank_accounts SET is_default = TRUE WHERE id = $1 AND user_id = $2;", [id, req.user.id]);

    res.json({
      success: true,
      message: "Đã đặt làm tài khoản mặc định thành công",
    });
  } catch (error) {
    console.error("Lỗi đặt tài khoản mặc định:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đặt tài khoản mặc định",
    });
  }
};
