# EZ-Space Admin — Chạy một mình trong VS Code, bỏ login

## Nhanh nhất (Windows)

1. Giải nén, **File > Open Folder** chọn thư mục `ez-space-admin` bằng VS Code.
2. Trong XAMPP chỉ bật **MySQL** trên cổng **3307**. Không cần bật Apache, không copy vào `htdocs`.
3. Mở Terminal VS Code, chạy:

   ```powershell
   npm install
   npm run dev
   ```

4. Mở **http://127.0.0.1:8000/** -> dashboard ngay, KHÔNG LOGIN.

`npm install` không tải thư viện ngoài (dự án này không có npm dependencies). Node.js cần được cài để dùng npm. Dự án dùng PHP của `C:\xampp\php\php.exe` (hoặc PHP trong PATH), nên XAMPP chỉ cung cấp PHP và MySQL, không chứa mã nguồn app.

## MySQL thật

- Database: `ez_space` (15 bảng)
- Host: `127.0.0.1`; port: `3307`
- Mặc định dùng `root` và mật khẩu rỗng cho môi trường cá nhân XAMPP.
- Nếu root có mật khẩu, copy `.env.example` thành `.env.local`, nhập đúng `EZ_DB_USER`, `EZ_DB_PASS`.
- Khuyên dùng tài khoản `ez_local` riêng với quyền `SELECT, INSERT, UPDATE`; SQL mẫu trong `scripts/TAO_USER_LOCAL_TUY_CHON.sql` (đổi mật khẩu mạnh trước khi dùng).
- `npm run check-db` kiểm tra DB, 15 bảng, tài khoản admin đang hoạt động và in số lượng bản ghi. **Không tự import và không xóa dữ liệu hiện tại**.
- Giao diện lấy dữ liệu qua `api/index.php` bằng PHP PDO từ DB thật, tự làm mới 20 giây.

## Không đăng nhập — an toàn trong môi trường local

- Đã xóa `login.html`, `js/login.js`, nút Đăng xuất và kiểm tra phiên đăng nhập.
- Trang quản trị mở thẳng tại `/` hoặc `/index.html`.
- PHP server chỉ lắng nghe `127.0.0.1:8000`, router từ chối truy cập qua hostname/IP khác; API cũng chặn remote không phải localhost.
- Giữ CSRF token cho thao tác POST, không công khai mật khẩu database trong file chia sẻ.
- `admin` đang active trong DB **chỉ được dùng để ghi lịch sử thao tác**, không dùng để đăng nhập.
- **Không triển khai bản không-login lên hosting, LAN, VPS, port forwarding hoặc shared network.** Người có quyền truy cập máy tính anh có thể sửa dữ liệu.

## VS Code tasks

Terminal > Run Task > `EZ-Space: npm run dev (Mo Dashboard)`, hoặc trong Terminal chạy `npm run dev`.

## Nếu lỗi

- MySQL không bật: khởi động MySQL (XAMPP) và thử lại.
- Port khác 3307: sửa `.env.local`.
- MySQL root có mật khẩu: điền chính xác vào `.env.local`.
- Có cổng 8000 bị chiếm: đổi sang cổng khác bằng `EZ_HTTP_PORT=8001` trong terminal hoặc `.env.local` (Node script đọc từ môi trường).
- Nếu dữ liệu sai: xem kết quả `npm run check-db`; không re-import seed trên DB đang sử dụng.
