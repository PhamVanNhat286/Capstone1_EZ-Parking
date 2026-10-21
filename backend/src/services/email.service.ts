import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ============================================================
// Cấu hình Nodemailer với Gmail SMTP
// Cần cài biến môi trường trong file .env của backend:
//   GMAIL_USER=your_email@gmail.com
//   GMAIL_APP_PASSWORD=your_app_password
// ============================================================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ============================================================
// Gửi email chứa mã OTP
// ============================================================
export const sendOtpEmail = async (
  toEmail: string,
  otpCode: string,
  purpose: string
): Promise<void> => {
  // Chọn tiêu đề và nội dung dựa trên mục đích
  const subjectMap: Record<string, string> = {
    FORGOT_PASSWORD: "🔐 Mã xác nhận đặt lại mật khẩu - EZ-Space",
    VERIFY_EMAIL:    "✅ Mã xác thực email - EZ-Space",
    REGISTER:        "🎉 Xác thực đăng ký tài khoản - EZ-Space",
  };

  const titleMap: Record<string, string> = {
    FORGOT_PASSWORD: "Yêu cầu đặt lại mật khẩu",
    VERIFY_EMAIL:    "Xác thực địa chỉ email",
    REGISTER:        "Chào mừng đến EZ-Space!",
  };

  const subject = subjectMap[purpose] ?? "Mã xác thực - EZ-Space";
  const title   = titleMap[purpose]   ?? "Mã xác thực";

  const html = `
  <!DOCTYPE html>
  <html lang="vi">
  <head><meta charset="UTF-8" /></head>
  <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1a73e8,#0d47a1);padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">
                  EZ-Space
                </h1>
                <p style="margin:6px 0 0;color:#c8d8f8;font-size:13px;">Smart Parking Management</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;">${title}</h2>
                <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
                  Chung toi nhan duoc yeu cau tu ban. Vui long dung ma OTP ben duoi de tiep tuc.
                  Ma co hieu luc trong <strong>5 phut</strong>.
                </p>

                <!-- OTP Box -->
                <div style="text-align:center;margin:24px 0;">
                  <div style="display:inline-block;background:#f0f4ff;border:2px dashed #1a73e8;border-radius:12px;padding:20px 48px;">
                    <p style="margin:0;font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;">Ma xac nhan</p>
                    <p style="margin:8px 0 0;font-size:40px;font-weight:800;color:#1a73e8;letter-spacing:10px;">
                      ${otpCode}
                    </p>
                  </div>
                </div>

                <p style="margin:24px 0 0;color:#888;font-size:12px;line-height:1.6;border-top:1px solid #eee;padding-top:20px;">
                  Luu y bao mat: Khong chia se ma nay voi bat ky ai, ke ca nhan vien EZ-Space.
                  Neu ban khong thuc hien yeu cau nay, hay bo qua email nay.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9f9f9;padding:20px 40px;text-align:center;">
                <p style="margin:0;color:#aaa;font-size:11px;">
                  2026 EZ-Space Smart Parking - Dai hoc Duy Tan - Capstone 1
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"EZ-Space Parking" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject,
    html,
  });
};
