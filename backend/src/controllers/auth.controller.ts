import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendOtpEmail } from "../services/email.service";

const JWT_SECRET = process.env.JWT_SECRET || "ezspace_jwt_secret_capstone_2026";

// POST /api/auth/register - Đăng ký tài khoản mới
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, phone, password, role = "customer", license_plate, vehicle_type, vehicle_name, vehicles } = req.body;

    if (!full_name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Họ tên, email và mật khẩu là bắt buộc",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 8 ký tự",
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.trim().replace(/\s+/g, "") : null;
    const cleanName = full_name.trim();

    // Kiểm tra email đã tồn tại chưa (không phân biệt hoa thường)
    const existingUser = await query("SELECT id FROM users WHERE LOWER(email) = $1;", [cleanEmail]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: "Email này đã được sử dụng",
      });
      return;
    }

    // Kiểm tra số điện thoại (nếu có cung cấp)
    if (cleanPhone) {
      const existingPhone = await query("SELECT id FROM users WHERE phone = $1;", [cleanPhone]);
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
    const result = await query(insertSql, [cleanName, cleanEmail, cleanPhone, passwordHash, role]);
    const newUser = result.rows[0];

    // Tạo token JWT
    const token = jwt.sign(
      { id: Number(newUser.id), email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Nếu người dùng cung cấp thông tin xe khi đăng ký, lưu trực tiếp vào bảng vehicles (hỗ trợ nhiều xe)
    let initialVehicles: any[] = [];
    const vehiclesToInsert: Array<{ license_plate: string; vehicle_name?: string; vehicle_type?: string }> =
      Array.isArray(vehicles) && vehicles.length > 0
        ? vehicles
        : (license_plate && String(license_plate).trim() ? [{ license_plate, vehicle_name, vehicle_type }] : []);

    for (let i = 0; i < vehiclesToInsert.length; i++) {
      const v = vehiclesToInsert[i];
      if (!v || !v.license_plate || !String(v.license_plate).trim()) continue;
      const vPlate = String(v.license_plate).trim().toUpperCase();
      const vType = v.vehicle_type === "SUV" || v.vehicle_type === "EV" ? v.vehicle_type : "Sedan";
      const vName = v.vehicle_name && String(v.vehicle_name).trim()
        ? String(v.vehicle_name).trim()
        : (vType === "SUV" ? "SUV gầm cao" : vType === "EV" ? "Xe điện" : "Sedan cá nhân");
      const isDefault = i === 0;

      try {
        const vRes = await query(
          `INSERT INTO vehicles (user_id, license_plate, vehicle_name, vehicle_type, is_default)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (license_plate) DO UPDATE SET user_id = $1, vehicle_name = $3, vehicle_type = $4, is_default = $5
           RETURNING id, license_plate, vehicle_name, vehicle_type, is_default, created_at;`,
          [newUser.id, vPlate, vName, vType, isDefault]
        );
        if (vRes.rows[0]) initialVehicles.push(vRes.rows[0]);
      } catch (vErr) {
        console.warn("Không thể liên kết xe trong lúc đăng ký:", vErr);
      }
    }

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công",
      data: {
        user: newUser,
        token,
        vehicles: initialVehicles,
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

    const cleanAccount = email.trim();
    const cleanEmail = cleanAccount.toLowerCase();
    const cleanPhone = cleanAccount.replace(/\s+/g, "");

    // Tìm tài khoản theo email (không phân biệt chữ hoa thường) hoặc số điện thoại
    const userRes = await query(
      "SELECT * FROM users WHERE LOWER(email) = $1 OR phone = $2;",
      [cleanEmail, cleanPhone]
    );
    if (userRes.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Email / Số điện thoại hoặc mật khẩu không chính xác",
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

    // Lấy danh sách xe thực tế của người dùng từ database
    const vehiclesRes = await query(
      `SELECT id, license_plate, vehicle_name, vehicle_type, is_default, created_at, updated_at
       FROM vehicles 
       WHERE user_id = $1 
       ORDER BY id ASC;`,
      [user.id]
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
        vehicles: vehiclesRes.rows,
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

// PUT /api/auth/profile - Cập nhật thông tin tài khoản (Họ tên, email, số điện thoại)
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực" });
      return;
    }

    const { full_name, email, phone } = req.body;

    if (!full_name && !email && !phone) {
      res.status(400).json({
        success: false,
        message: "Không có thông tin nào cần cập nhật",
      });
      return;
    }

    const cleanName = full_name !== undefined ? full_name.trim() : null;
    const cleanEmail = email !== undefined ? email.trim().toLowerCase() : null;
    const cleanPhone = phone !== undefined ? phone.trim().replace(/\s+/g, "") : null;

    // Nếu có đổi email, kiểm tra trùng lặp với tài khoản khác
    if (cleanEmail) {
      const existingEmail = await query(
        "SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2;",
        [cleanEmail, req.user.id]
      );
      if (existingEmail.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: "Email này đã được sử dụng bởi tài khoản khác",
        });
        return;
      }
    }

    // Nếu có đổi số điện thoại, kiểm tra trùng lặp với tài khoản khác
    if (cleanPhone) {
      const existingPhone = await query(
        "SELECT id FROM users WHERE phone = $1 AND id != $2;",
        [cleanPhone, req.user.id]
      );
      if (existingPhone.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: "Số điện thoại này đã được sử dụng bởi tài khoản khác",
        });
        return;
      }
    }

    const updateSql = `
      UPDATE users
      SET full_name = COALESCE($1, full_name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, full_name, email, phone, role, status, updated_at;
    `;
    const result = await query(updateSql, [cleanName, cleanEmail, cleanPhone, req.user.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
      return;
    }

    const updatedUser = result.rows[0];

    res.json({
      success: true,
      message: "Cập nhật hồ sơ thành công",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật hồ sơ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật hồ sơ",
    });
  }
};

// PUT /api/auth/change-password - Đổi mật khẩu
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực" });
      return;
    }

    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      res.status(400).json({
        success: false,
        message: "Vui lòng nhập mật khẩu cũ và mật khẩu mới",
      });
      return;
    }

    if (new_password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
      return;
    }

    // Lấy password_hash hiện tại
    const userRes = await query("SELECT password_hash FROM users WHERE id = $1;", [req.user.id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
      return;
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác",
      });
      return;
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2;", [
      newHash,
      req.user.id,
    ]);

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đổi mật khẩu",
    });
  }
};

// ============================================================
// POST /api/auth/send-otp
// Body: { email, purpose }  purpose: 'FORGOT_PASSWORD' | 'VERIFY_EMAIL'
// ============================================================
export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      res.status(400).json({ success: false, message: "Thiếu email hoặc mục đích" });
      return;
    }

    const validPurposes = ["FORGOT_PASSWORD", "VERIFY_EMAIL", "REGISTER"];
    if (!validPurposes.includes(purpose)) {
      res.status(400).json({ success: false, message: "Mục đích không hợp lệ" });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Nếu gửi OTP để đăng ký tài khoản, kiểm tra trước xem email đã tồn tại chưa
    if (purpose === "REGISTER") {
      const existingUser = await query("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1;", [cleanEmail]);
      if (existingUser.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.",
        });
        return;
      }
    }

    // Nếu gửi OTP để quên mật khẩu, kiểm tra trước xem email có tồn tại không
    if (purpose === "FORGOT_PASSWORD") {
      const existingUser = await query("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1;", [cleanEmail]);
      if (existingUser.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Email này chưa được đăng ký trong hệ thống EZ-Space.",
        });
        return;
      }
    }

    // Chặn spam: kiểm tra xem có OTP nào được gửi trong vòng 60 giây qua không
    const recentCheck = await query(
      `SELECT created_at FROM email_otps
       WHERE email = $1 AND purpose = $2
       AND created_at > (NOW() - INTERVAL '60 seconds')
       ORDER BY created_at DESC LIMIT 1;`,
      [cleanEmail, purpose]
    );

    if (recentCheck.rows.length > 0) {
      res.status(429).json({
        success: false,
        message: "Vui lòng đợi 60 giây trước khi yêu cầu mã mới",
      });
      return;
    }

    // Vô hiệu hóa tất cả OTP cũ chưa dùng của email này (cùng mục đích)
    await query(
      `UPDATE email_otps SET is_used = TRUE
       WHERE email = $1 AND purpose = $2 AND is_used = FALSE;`,
      [cleanEmail, purpose]
    );

    // Sinh mã OTP ngẫu nhiên 6 chữ số
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    // Lưu OTP mới vào DB với TTL 5 phút
    await query(
      `INSERT INTO email_otps (email, otp_code, purpose, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes');`,
      [cleanEmail, otpCode, purpose]
    );

    // Gửi email
    await sendOtpEmail(cleanEmail, otpCode, purpose);

    // Dọn rác: xóa các OTP hết hạn hoặc đã dùng (chạy ngầm, không await)
    query(`DELETE FROM email_otps WHERE expires_at < NOW() OR is_used = TRUE AND created_at < NOW() - INTERVAL '1 day';`).catch(() => {});

    res.json({
      success: true,
      message: `Mã OTP đã được gửi đến ${cleanEmail}. Mã có hiệu lực trong 5 phút.`,
    });
  } catch (error) {
    console.error("Lỗi gửi OTP:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi gửi mã OTP. Kiểm tra lại cấu hình Gmail.",
    });
  }
};

// ============================================================
// POST /api/auth/verify-otp
// Body: { email, otp_code, purpose }
// ============================================================
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp_code, purpose } = req.body;

    if (!email || !otp_code || !purpose) {
      res.status(400).json({ success: false, message: "Thiếu email, mã OTP hoặc mục đích" });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Tìm OTP hợp lệ mới nhất của email này
    const otpRes = await query(
      `SELECT id, otp_code, expires_at, attempts
       FROM email_otps
       WHERE email = $1 AND purpose = $2 AND is_used = FALSE
       ORDER BY created_at DESC LIMIT 1;`,
      [cleanEmail, purpose]
    );

    if (otpRes.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: "Không tìm thấy mã OTP. Vui lòng yêu cầu mã mới.",
      });
      return;
    }

    const otp = otpRes.rows[0];

    // Kiểm tra hết hạn
    if (new Date() > new Date(otp.expires_at)) {
      await query(`UPDATE email_otps SET is_used = TRUE WHERE id = $1;`, [otp.id]);
      res.status(400).json({
        success: false,
        message: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.",
      });
      return;
    }

    // Kiểm tra số lần nhập sai
    if (otp.attempts >= 5) {
      await query(`UPDATE email_otps SET is_used = TRUE WHERE id = $1;`, [otp.id]);
      res.status(400).json({
        success: false,
        message: "Mã OTP đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.",
      });
      return;
    }

    // Đối chiếu mã
    if (otp_code !== otp.otp_code) {
      // Tăng số lần thử sai
      await query(`UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1;`, [otp.id]);
      const remaining = 4 - otp.attempts; // attempts hiện tại chưa +1
      res.status(400).json({
        success: false,
        message: `Mã OTP không chính xác. Còn ${remaining} lần thử.`,
      });
      return;
    }

    // Mã đúng: đánh dấu đã dùng
    await query(`UPDATE email_otps SET is_used = TRUE WHERE id = $1;`, [otp.id]);

    res.json({
      success: true,
      message: "Xác thực OTP thành công",
    });
  } catch (error) {
    console.error("Lỗi xác thực OTP:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xác thực OTP",
    });
  }
};

// ============================================================
// POST /api/auth/check-exists
// Body: { email?: string, phone?: string }
// ============================================================
export const checkExists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp email hoặc số điện thoại để kiểm tra",
      });
      return;
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const existingEmail = await query("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1;", [cleanEmail]);
      if (existingEmail.rows.length > 0) {
        res.status(409).json({
          success: false,
          field: "email",
          message: "Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc dùng email khác.",
        });
        return;
      }
    }

    if (phone) {
      const cleanPhone = phone.trim().replace(/\s+/g, "");
      const existingPhone = await query("SELECT id FROM users WHERE phone = $1 LIMIT 1;", [cleanPhone]);
      if (existingPhone.rows.length > 0) {
        res.status(409).json({
          success: false,
          field: "phone",
          message: "Số điện thoại này đã được sử dụng bởi tài khoản khác.",
        });
        return;
      }
    }

    res.json({
      success: true,
      message: "Email và số điện thoại hợp lệ",
    });
  } catch (error) {
    console.error("Lỗi kiểm tra trùng lặp tài khoản:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra tài khoản",
    });
  }
};

// ============================================================
// POST /api/auth/reset-password
// Body: { email, new_password, otp_code? }
// ============================================================
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, new_password, otp_code } = req.body;

    if (!email || !new_password) {
      res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp email và mật khẩu mới",
      });
      return;
    }

    if (new_password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải từ 8 ký tự trở lên",
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Kiểm tra tài khoản người dùng có tồn tại không
    const userRes = await query("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1;", [cleanEmail]);
    if (userRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản với email này",
      });
      return;
    }

    // Kiểm tra đã có OTP FORGOT_PASSWORD hợp lệ hoặc đã verify trong vòng 15 phút
    const otpCheck = await query(
      `SELECT id FROM email_otps 
       WHERE email = $1 AND purpose = 'FORGOT_PASSWORD' 
       AND (
         (is_used = TRUE AND created_at > (NOW() - INTERVAL '15 minutes'))
         OR ($2::text IS NOT NULL AND otp_code = $2 AND expires_at > NOW())
       )
       LIMIT 1;`,
      [cleanEmail, otp_code || null]
    );

    if (otpCheck.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: "Yêu cầu đặt lại mật khẩu không hợp lệ hoặc mã OTP đã hết hạn. Vui lòng gửi lại mã mới.",
      });
      return;
    }

    // Hash mật khẩu mới bằng bcrypt
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    // Cập nhật mật khẩu trong database
    await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2;", [
      newHash,
      userRes.rows[0].id,
    ]);

    // Đánh dấu toàn bộ OTP FORGOT_PASSWORD cũ đã dùng
    await query("UPDATE email_otps SET is_used = TRUE WHERE email = $1 AND purpose = 'FORGOT_PASSWORD';", [cleanEmail]);

    res.json({
      success: true,
      message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.",
    });
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đặt lại mật khẩu",
    });
  }
};

