import { Response } from "express";
import { pool, query } from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * Lấy thông tin số dư ví EZ-Space và lịch sử biến động số dư
 * GET /api/wallet
 */
export const getWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      return;
    }

    // Lấy số dư ví từ bảng users
    const userRes = await query("SELECT id, full_name, email, wallet_balance FROM users WHERE id = $1", [userId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
      return;
    }

    const balance = Number(userRes.rows[0].wallet_balance || 0);

    // Lấy 50 giao dịch gần nhất
    const txRes = await query(
      `SELECT id, amount, type, status, description, bank_name, account_number, account_name, created_at
       FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        balance,
        transactions: txRes.rows.map((row) => ({
          id: row.id,
          amount: Number(row.amount),
          type: row.type,
          status: row.status,
          description: row.description,
          bank_name: row.bank_name,
          account_number: row.account_number,
          account_name: row.account_name,
          created_at: row.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("[Wallet] Lỗi khi lấy thông tin ví:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi tải thông tin ví" });
  }
};

/**
 * Rút tiền từ ví EZ-Space về tài khoản ngân hàng đã liên kết
 * POST /api/wallet/withdraw
 */
export const withdraw = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      return;
    }

    const { amount, bank_name, account_number, account_name } = req.body;
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      res.status(400).json({ success: false, message: "Số tiền rút không hợp lệ" });
      return;
    }

    if (!bank_name || !account_number) {
      res.status(400).json({ success: false, message: "Vui lòng cung cấp đầy đủ thông tin tài khoản ngân hàng nhận tiền" });
      return;
    }

    await client.query("BEGIN");

    // Khóa dòng user để kiểm tra số dư
    const userRes = await client.query("SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
      return;
    }

    const currentBalance = Number(userRes.rows[0].wallet_balance || 0);
    if (currentBalance < withdrawAmount) {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        message: `Số dư ví không đủ để rút (Số dư hiện tại: ${currentBalance.toLocaleString("vi-VN")}đ, yêu cầu rút: ${withdrawAmount.toLocaleString("vi-VN")}đ)`,
      });
      return;
    }

    // Trừ số dư ví
    const newBalance = currentBalance - withdrawAmount;
    await client.query("UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2", [newBalance, userId]);

    // Ghi nhận biến động số dư ví
    const desc = `Rút tiền về ${bank_name} (${account_number})`;
    const txRes = await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, status, description, bank_name, account_number, account_name)
       VALUES ($1, $2, 'WITHDRAW', 'success', $3, $4, $5, $6)
       RETURNING id, amount, type, status, description, bank_name, account_number, account_name, created_at`,
      [userId, -withdrawAmount, desc, bank_name, account_number, account_name || ""]
    );

    // Ghi audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, note)
       VALUES ($1, 'WALLET_WITHDRAW', 'wallet_transaction', $2, $3)`,
      [userId, txRes.rows[0].id, `Rút ${withdrawAmount.toLocaleString("vi-VN")}đ về ${bank_name} - ${account_number}`]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Đã rút thành công ${withdrawAmount.toLocaleString("vi-VN")}đ về tài khoản ${bank_name} (${account_number})!`,
      data: {
        withdrawn_amount: withdrawAmount,
        remaining_balance: newBalance,
        transaction: txRes.rows[0],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Wallet] Lỗi khi rút tiền:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi xử lý rút tiền" });
  } finally {
    client.release();
  }
};

/**
 * Nạp tiền thử nghiệm vào ví EZ-Space (Dùng cho demo Sandbox)
 * POST /api/wallet/topup
 */
export const topup = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Yêu cầu đăng nhập" });
      return;
    }

    const { amount = 50000 } = req.body;
    const topupAmount = Number(amount);

    if (isNaN(topupAmount) || topupAmount <= 0) {
      res.status(400).json({ success: false, message: "Số tiền nạp không hợp lệ" });
      return;
    }

    await client.query("BEGIN");

    const userRes = await client.query("SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const currentBalance = Number(userRes.rows[0]?.wallet_balance || 0);
    const newBalance = currentBalance + topupAmount;

    await client.query("UPDATE users SET wallet_balance = $1, updated_at = NOW() WHERE id = $2", [newBalance, userId]);

    const txRes = await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, status, description)
       VALUES ($1, $2, 'TOPUP', 'success', $3)
       RETURNING *`,
      [userId, topupAmount, `Nạp tiền vào ví EZ-Space (+${topupAmount.toLocaleString("vi-VN")}đ)`]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Nạp thành công ${topupAmount.toLocaleString("vi-VN")}đ vào ví EZ-Space!`,
      data: {
        balance: newBalance,
        transaction: txRes.rows[0],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Wallet] Lỗi khi nạp tiền:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi nạp tiền" });
  } finally {
    client.release();
  }
};
