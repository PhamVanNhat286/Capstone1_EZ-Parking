EZ-Space Admin — giao diện theo 6 mẫu của anh

1. Giải nén ZIP, mở CHÍNH THƯ MỤC này (nơi có package.json) bằng VS Code.
2. Bật MySQL trên XAMPP, cổng 3307. KHÔNG cần Apache, KHÔNG copy vào htdocs.
3. Mở Terminal trong VS Code:
   npm install
   npm run check-db
   npm run dev
4. Mở http://127.0.0.1:8000/
5. Nếu kết nối MySQL dùng mật khẩu, đổi .env.example thành .env.local rồi sửa EZ_DB_USER và EZ_DB_PASS.

Giao diện dùng dữ liệu thật của MySQL ez_space. Không chạy seed khi database đã có dữ liệu.
Không login, không VPN/SSH/Tailscale; chạy cục bộ 127.0.0.1.
Đọc thêm HUONG-DAN-GIAO-DIEN.md.
