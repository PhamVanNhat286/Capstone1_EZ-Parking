# EZ-Space Admin — Giao diện mới theo 6 mẫu HTML của anh

## Mục tiêu
- Giữ cùng thiết kế tham chiếu: EZ-Space Platform Core, sidebar 260px, Plus Jakarta Sans, màu xanh `#2563EB`, card KPI, danh sách và các khu vực nghiệp vụ.
- **Không sao chép các số liệu mẫu** (12.480 người dùng, 142 bãi, uptime 99,8%...). Tất cả KPI và bảng thực tế vẫn gọi `api/index.php` và database `ez_space`.
- Chỉ chạy cục bộ trên máy anh, không login, không Tailscale, không SSH.
- Không sửa schema/seed hoặc ghi đè dữ liệu MySQL hiện có.

## Cách chạy trong Visual Studio Code
1. Mở thư mục `ez-space-admin` trong VS Code (thư mục có `package.json`).
2. Trong XAMPP, bật **MySQL** tại cổng **3307**; không cần bật Apache.
3. Nếu chưa có, copy `.env.example` thành `.env.local`; cấu hình `EZ_DB_USER`, `EZ_DB_PASS` nếu khác mặc định.
4. Terminal chạy:

```powershell
npm install
npm run check-db
npm run dev
```
5. Truy cập **http://127.0.0.1:8000/**, không có màn đăng nhập.

## Thay đổi giao diện
- `index.html` (Tổng quan / Platform Overview)
- `lots.html` (Quản lý & Phê duyệt bãi đỗ)
- `users.html` (Quản lý người dùng FR-10)
- `revenue.html` (Global Revenue)
- `logs.html` (System Audit Logs)
- `settings.html` (Platform Settings)
- `data.html` (Dữ liệu nghiệp vụ, giữ tính năng bổ sung)
- `css/reference-theme.css`: phong cách chung; `css/pages/*.css`: CSS riêng từng trang; `js/pages/*.js`: giao diện từng trang; `js/actions/*.js`: hành động; `api/controllers/*.php`: truy vấn MySQL theo nghiệp vụ.

## Lưu ý quan trọng
- Bản mẫu cung cấp các chỉ số không có dữ liệu thật (trạng thái Redis, uptime VNPay, Tamper-Proof, đối soát đã chuyển khoản), nên app **không hiển thị chúng là đang hoạt động**. Các mục chưa tích hợp được ghi rõ.
- Các thao tác duyệt bãi, khóa tài khoản, thay đổi thông số **ghi trực tiếp vào MySQL**. Kiểm tra kỹ trước khi xác nhận.
- Server chỉ bind `127.0.0.1`; không dùng bản no-login này để public lên Internet hoặc LAN.
- Nếu database còn lỗi do import seed, giao diện sẽ báo lỗi kết nối thay vì hiển thị dữ liệu giả.
