# EZ-Space Admin - Tách theo chức năng (v2)

## Cấu trúc

- `index.html` / `js/pages/dashboard.js` / `css/pages/dashboard.css`: Tổng quan & bảng đơn gần nhất; sửa nhãn **Đã cọc**.
- `lots.html` / `js/pages/lots.js` / `js/actions/lot-detail.js`, `lot-status.js` / `api/controllers/lots.php`: Bãi đỗ, trạng thái, chi tiết ô.
- `users.html` / `js/pages/users.js` / `js/actions/user-status.js` / `api/controllers/users.php`: Người dùng.
- `revenue.html` / `js/pages/revenue.js` / `api/controllers/revenue.php`: Doanh thu.
- `logs.html` / `js/pages/logs.js` / `api/controllers/logs.php`: Nhật ký.
- `data.html` / `js/pages/records.js` / `api/controllers/records.php`: Dữ liệu nghiệp vụ.
- `settings.html` / `js/pages/settings.js` / `js/actions/settings-save.js` / `api/controllers/settings.php`: Cài đặt.
- `api/controllers/dashboard.php`: Các truy vấn dành riêng cho dashboard.
- `api/controllers/summary.php`: Chỉ số tổng quan được dùng chung.
- `js/core.js`: Hàm dùng chung, bộ lọc, định dạng, trạng thái giao diện.
- `js/app.js`: Tải dữ liệu, làm mới và điều phối tương tác.
- `js/actions/modal.js`, `export.js`: Xem chi tiết, xuất dữ liệu.
- `api/index.php`: Điểm vào API, kiểm tra localhost, CSRF, ánh xạ handler.
- `api/config.php`: Kết nối PDO, cấu hình cơ sở dữ liệu.
- `css/style.css`, `css/live.css`, `css/reference-theme.css`: CSS hệ thống dùng chung. `css/pages/dashboard.css`, `revenue.css`, `settings.css`: CSS dành riêng từng trang.
- `sql/`: Dữ liệu/schema tham chiếu. **Không import lại khi đã có ez_space đang sử dụng**.

## Sửa lỗi nhãn Đã cọc

Trước đây tên class `.brand` dùng chung cho sidebar và nhãn xanh, làm nhãn trạng thái `paid` vô tình thừa hưởng chiều cao 76-80px từ logo/sidebar. Đã giới hạn `.brand` dành cho header bằng `.sidebar .brand`, và tạo CSS riêng cho trạng thái trong bảng đặt chỗ. Không thay đổi trạng thái trong database (`paid`) hoặc giá trị tiền cọc theo đơn.

## Chạy trên máy cá nhân

1. Mở thư mục có `package.json` bằng VS Code.
2. Mở MySQL XAMPP tại `127.0.0.1:3307`, database `ez_space`.
3. Nếu có mật khẩu MySQL, cấu hình file `.env.local` (không commit lên Git).
4. Chạy `npm install`, `npm run check-db`, `npm run dev`.
5. Truy cập `http://127.0.0.1:8000/`.

Chỉ sử dụng trên máy local. Bản này **không có trang đăng nhập**, không được mở qua mạng LAN/Internet.
