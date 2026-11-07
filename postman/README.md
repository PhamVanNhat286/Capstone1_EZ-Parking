# 🚀 Hướng Dẫn Kiểm Thử API EZ-Space Bằng Postman

Thư mục này chứa toàn bộ tài nguyên để kiểm thử **28 API endpoints** của dự án **EZ-Space Smart Parking** bằng Postman.

---

## 📁 1. Các file trong thư mục

- `EZ-Space.postman_collection.json`: Bộ sưu tập 28 API endpoints (Auth, Lots, Vehicles, Reservations, History, Kiosk Gate, System).
- `EZ-Space.postman_environment.json`: File môi trường cục bộ (`baseUrl`, `token`, `lotId`, `slotId`, `reservationId`, `vehicleId`).
- `generate-collection.js`: Script Node.js tự động tạo hoặc cập nhật lại Collection nếu có thay đổi trong tương lai.

---

## ⚡ 2. Các bước nhập và cấu hình Postman

### Bước 1: Khởi động Backend & Database
Đảm bảo PostgreSQL đang chạy và Backend Express đang lắng nghe ở cổng `5000`:
```bash
cd backend
npm run dev
```
> Kiểm tra nhanh trên trình duyệt hoặc Postman: `http://localhost:5000/api/health` trả về `{"status":"ok"}`.

### Bước 2: Import vào Postman
1. Mở ứng dụng **Postman**.
2. Nhấn nút **Import** (ở góc trên cùng bên trái).
3. Chọn kéo thả cả 2 file:
   - `postman/EZ-Space.postman_collection.json`
   - `postman/EZ-Space.postman_environment.json`
4. Ở góc trên cùng bên phải Postman, chuyển môi trường từ **No Environment** sang **EZ-Space Local**.

---

## 🔑 3. Luồng kiểm thử End-to-End tự động (Không cần gõ token thủ công)

1. **Bước 1 (Đăng nhập):** Chạy `1.1 Login` (với `customer@ezspace.vn` / `password123`). Script sẽ tự động lưu JWT token vào biến `{{token}}`.
2. **Bước 2 (Xem bãi & ô đỗ):** Chạy `2.1 Get All Lots` và `2.3 Get Lot Slots` để thấy các ô đỗ đang trống (màu xanh).
3. **Bước 3 (Giữ chỗ):** Chạy `4.4 Hold Spot` ➔ Ô đỗ chuyển sang trạng thái `holding` (vàng). Script tự động lưu `{{reservationId}}`.
4. **Bước 4 (Thanh toán cọc):** Chạy `4.5 Pay Deposit` ➔ Đơn chuyển sang `paid` và kích hoạt thời hạn đến bãi 20 phút.
5. **Bước 5 (Kiosk Soát vé vào bãi):** Chạy `5.1 Kiosk Scan-In` ➔ Đơn chuyển sang `entered`, ô đỗ trên sơ đồ 2D lập tức chuyển sang **ĐỎ (`occupied`)** và bắt đầu tính giờ đỗ!
6. **Bước 6 (Kiosk Soát vé xuất bãi):** Chạy `5.2 Kiosk Scan-Out` ➔ Hệ thống tự động tính số giờ đỗ thực tế, cấn trừ cọc, tính tiền thêm và ô đỗ lập tức trả lại màu **XANH (`available`)**!

---

## 🗺️ 4. Danh mục 28 API Endpoints

### 0. System & Health (2 APIs)
- `GET /` — Thông tin phiên bản API
- `GET /api/health` — Kiểm tra trạng thái server

### 1. Authentication (9 APIs)
- `POST /api/auth/login` — Đăng nhập
- `POST /api/auth/register` — Đăng ký tài khoản (kèm xe)
- `GET /api/auth/me` 🔒 — Xem thông tin cá nhân
- `PUT /api/auth/profile` 🔒 — Cập nhật hồ sơ
- `PUT /api/auth/change-password` 🔒 — Đổi mật khẩu
- `POST /api/auth/check-exists` — Kiểm tra trùng email/sđt
- `POST /api/auth/send-otp` — Gửi mã OTP qua Gmail
- `POST /api/auth/verify-otp` — Xác thực mã OTP
- `POST /api/auth/reset-password` — Đặt lại mật khẩu

### 2. Parking Lots (3 APIs)
- `GET /api/lots` — Danh sách bãi xe kèm số ô trống theo loại (Sedan, SUV, EV) & giá
- `GET /api/lots/:id` — Chi tiết 1 bãi xe & biểu phí
- `GET /api/lots/:id/slots` — Sơ đồ ma trận ô đỗ 2D của bãi

### 3. Vehicles (4 APIs)
- `GET /api/vehicles` 🔒 — Danh sách xe cá nhân
- `POST /api/vehicles` 🔒 — Thêm xe mới
- `PUT /api/vehicles/:id` 🔒 — Sửa thông tin xe
- `DELETE /api/vehicles/:id` 🔒 — Xóa xe

### 4. Reservations & History (6 APIs)
- `GET /api/reservations` 🔒 — Lịch sử tất cả các lần đặt chỗ (phục vụ `/lich-su`)
- `GET /api/reservations/:id` 🔒 — Chi tiết đơn đặt chỗ & chuỗi QR payload (phục vụ `/ve/[id]`)
- `GET /api/reservations/active` — Xem đơn đang hoạt động
- `POST /api/reservations/hold` — Giữ ô đỗ 10 phút (chống tranh chấp 409)
- `POST /api/reservations/:id/pay-deposit` — Trả cọc Sandbox & kích hoạt hạn đến bãi 20 phút
- `POST /api/reservations/:id/release` — Hủy giữ ô / giải phóng ô đỗ

### 5. Kiosk Gate - Trạm Soát Vé Cổng Bãi (4 APIs - Module mới trong `backend/src/kiosk/`)
- `POST /api/kiosk/scan-in` — Quét vé QR xe vào bãi: đổi ô sang **ĐỎ (`occupied`)**, ghi nhận giờ vào
- `POST /api/kiosk/scan-out` — Quét vé QR xe rời bãi: tính thời gian đỗ, tính tiền, đổi ô về **XANH (`available`)**
- `GET /api/kiosk/sessions` — Danh sách các xe đang đỗ trong bãi và các xe sắp đến
- `GET /api/kiosk/stats` — Thống kê nhanh số ô trống, ô đã đỗ, lưu lượng xe hôm nay tại bãi

### 6. Background Cron & Simulation (3 APIs - Dọn dẹp ô quá hạn 10p/20p)
- `GET /api/cron/status` — Kiểm tra trạng thái hoạt động của bộ quét ngầm
- `POST /api/cron/trigger-cleanup` — Kích hoạt quét dọn dẹp ô quá hạn ngay lập tức
- `POST /api/cron/simulate-expire` — Mô phỏng đơn quá hạn 10p hoặc 20p để biểu diễn trực quan trước hội đồng chấm điểm
