# EZ-Space Partner

Ứng dụng Partner độc lập dùng **PostgreSQL thật qua backend của hệ thống**.
Schema chuẩn: [develop/database](https://github.com/PhamVanNhat286/Capstone1_EZ-Parking/tree/develop/database),
đã đối chiếu với commit `ef18ea8732d1938ec5a7a83408c1d2b5adfaf5db`.

## Cấu hình PostgreSQL

Dùng Node.js 24 và PostgreSQL đang chạy. Tại thư mục gốc repository:

```powershell
cd backend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Mở `backend/.env`, điền đúng `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME` và `JWT_SECRET` theo môi trường của nhóm. Mặc định database là `ez_space`.
Không commit `.env` hoặc gửi mật khẩu trong chat.

```powershell
npm run db:partner:check
```

Database mới, chưa có bảng: chạy `npm run db:partner:init` để tạo database và nạp
đúng `database/schema.sql` + `database/seed.sql`. Lệnh dừng nếu đã có bảng trong public,
không chạy lại seed trên database đang có dữ liệu.

Database đã có schema cũ: `npm run db:partner:sync` chỉ bổ sung provider `bank`
và kiểm tra lại bảng/trường/enum. Các dữ liệu đang sử dụng được giữ nguyên.
Nếu có trường còn thiếu, công cụ in danh sách để áp dụng migration của nhóm.

## Chạy trên VS Code

Terminal 1, trong `backend`:

```powershell
npm run dev
```

Terminal 2, từ thư mục gốc:

```powershell
cd partner-frontend
npm ci
npm run dev
```

Mở [Partner](http://localhost:3001/lots), đăng nhập tài khoản có role `manager`.
Nếu vừa khởi tạo database mới từ seed: `manager@ezspace.vn` / `password123`.
Tài khoản của database đang sử dụng giữ nguyên mật khẩu hiện có.

Partner gọi `/api/*` cùng origin; Next.js chuyển tiếp tới backend cổng 5000.
Có thể đổi `PARTNER_BACKEND_URL` trong `partner-frontend/.env.local` theo `.env.example`,
sau đó khởi động lại Next.js. Các cổng thanh toán và Partner cùng dùng pool PostgreSQL của backend.

## Dữ liệu và thao tác

- Các màn đọc một snapshot nhất quán từ PostgreSQL, giới hạn theo bãi được phân công.
- Đăng ký/sửa bãi, cấu hình ô, bảng giá, hồ sơ và hủy giữ chỗ chưa cọc được lưu qua API.
- Thay đổi được đọc lại sau khi lưu và tự làm mới mỗi 15 giây hoặc khi quay lại cửa sổ.
- Bản ghi đã được người khác sửa sẽ trả về xung đột thay vì ghi đè âm thầm.
- Mất backend/database sẽ hiển thị lỗi và thời điểm đồng bộ gần nhất; không thay bằng seed.
- Gate Kiosk đọc QR hoặc mã vé để tra cứu và xác nhận xe vào/ra. Hệ thống cập nhật phiên đỗ, trạng thái ô và nhật ký thao tác.
- Token QR, password hash, OTP và raw IPN không được gửi trong snapshot Partner.

| Đường dẫn | Nội dung |
| --- | --- |
| / và /dashboard | Ô đỗ, đặt chỗ, phiên đỗ, tiền thu thành công |
| /lots | Bãi được phân công; bấm tên bãi / Xem ô trống để lọc Sedan, SUV, EV |
| /layout | Mã, tọa độ, loại và trạng thái ô đỗ |
| /pricing | Quy tắc giá theo bãi, giờ và khoảng ngày hiệu lực |
| /sessions | Đặt chỗ và phiên đỗ thực tế |
| /kiosk | Tra cứu vé và phiên đỗ |
| /revenue | Theo ngày/tháng/năm, biểu đồ, tổng hợp, giao dịch và CSV |
| /audit | Nhật ký hệ thống, lịch sử quản lý và chi tiết trước/sau |
| /settings | Hồ sơ quản lý và các bãi được phân công |

Ô tiêu chuẩn `standard` → Sedan, ô lớn `large` → SUV, ô `ev_charging` → EV;
ô `disabled` hiển thị riêng là ô ưu tiên. Chỉ tính ô đang khai thác có trạng thái trống.
Sức chứa chưa tạo ô không được cộng vào danh sách vị trí còn trống.

Doanh thu lấy từ các giao dịch đã lưu: cọc/final thành công là tiền thu, refund thành công
là tiền hoàn. Không cộng lại tổng tiền đặt chỗ/phiên đỗ và không có mục chênh lệch thu hoàn.
Ngày báo cáo theo `paid_at` giờ Việt Nam; giao dịch chưa có ngày thanh toán dùng `created_at`
và có ghi chú. Provider gồm `vnpay`, `bank`, `momo`, `card` đúng SQL mới.

Báo cáo trích phí Admin 5% trên từng giao dịch thu thành công, làm tròn đến 2 chữ số
thập phân theo độ chính xác `payments.amount`. Phần Partner sau phí bằng tiền thu trừ
phí Admin; tiền hoàn vẫn được báo cáo riêng. Cách tính dùng chung cho thẻ tổng,
biểu đồ, bảng theo kỳ và CSV tổng hợp. Đây là số liệu tính từ giao dịch hiện có,
không tạo khoản thanh toán mới và không sửa `schema.sql` hay `seed.sql`.

## Kiểm tra

Trong `partner-frontend`: `npm test`, `npm run typecheck`, `npm run build`.
39 kiểm tra frontend gồm hợp đồng SQL, seed fixtures dành cho test, loại ô/xe, báo cáo và API client.
Seed fixture không được dùng làm dữ liệu vận hành trong trình duyệt.

Trong `backend`: `npm run build`, `npm run test:partner:unit`, `npm run test:partner`.
Bộ tích hợp cần kết nối PostgreSQL trong `.env`; mỗi lần chạy tạo một schema `partner_test_*`
riêng, dùng SQL chuẩn để kiểm tra API rồi xóa đúng schema đó. Không reset bảng ứng dụng hiện có.

Chi tiết: [IMPLEMENTATION.md](IMPLEMENTATION.md).
