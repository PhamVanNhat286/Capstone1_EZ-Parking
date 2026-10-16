import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";

const JWT_SECRET = process.env.JWT_SECRET || "ezspace_jwt_secret_capstone_2026";

// POST /api/auth/register - Đăng ký tài khoản mới
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, phone, password, role = "customer" } = req.body;

    if (!full_name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Họ tên, email và mật khẩu là bắt buộc",
      });
      return;
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await query("SELECT id FROM users WHERE email = $1;", [email]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "Email này đã được sử dụng",
      });
      return;
    }

    // Kiểm tra số điện thoại (nếu có cung cấp)
    if (phone) {
      const existingPhone = await query("SELECT id FROM users WHERE phone = $1;", [phone]);
      if (existingPhone.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: "Số điện thoại này đã được sử dụng",
        });
        return;
      }
    }

    // Băm mật khẩu bằng bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Chèn vào database
    const insertSql = `
      INSERT INTO users (full_name, email, phone, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING id, full_name, email, phone, role, status, created_at;
    `;
    const result = await query(insertSql, [full_name, email, phone || null, passwordHash, role]);
    const newUser = result.rows[0];

    // Tạo token JWT
    const token = jwt.sign(
      { id: Number(newUser.id), email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công",
      data: {
        user: newUser,
        token,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng ký tài khoản",
    });
  }
};

// POST /api/auth/login - Đăng nhập bằng email và mật khẩu
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp email và mật khẩu",
      });
      return;
    }

    // Tìm tài khoản theo email
    const userRes = await query("SELECT * FROM users WHERE email = $1;", [email]);
    if (userRes.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
      return;
    }

    const user = userRes.rows[0];

    // Kiểm tra trạng thái tài khoản
    if (user.status !== "active") {
      res.status(403).json({
        success: false,
        message: `Tài khoản đã bị khóa hoặc không hoạt động (${user.status})`,
      });
      return;
    }

    // So sánh mật khẩu băm
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
      return;
    }

    // Tạo token JWT (hạn 7 ngày)
    const token = jwt.sign(
      { id: Number(user.id), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng nhập",
    });
  }
};

// GET /api/auth/me - Lấy thông tin cá nhân của người dùng đang đăng nhập
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực" });
      return;
    }

    // Lấy thông tin người dùng
    const userSql = `
      SELECT id, full_name, email, phone, role, status, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const userRes = await query(userSql, [req.user.id]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
      return;
    }

    // Lấy danh sách xe của người dùng
    const vehiclesRes = await query(
      `SELECT id, license_plate, vehicle_name, vehicle_type, is_default, created_at 
       FROM vehicles 
       WHERE user_id = $1 
       ORDER BY is_default DESC, id ASC;`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        user: userRes.rows[0],
        vehicles: vehiclesRes.rows,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin cá nhân:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin người dùng",
    });
  }
};
