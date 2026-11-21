# EZ-Space Partner

Giao diện Partner độc lập, dùng **database/schema.sql trên develop** làm chuẩn.
Không áp dụng mô hình capacity-only trong Google Docs hoặc file SQL UUID gửi riêng.

## Chạy trên VS Code

Từ thư mục gốc repository, dùng Node.js 24:

```powershell
cd partner-frontend
npm ci
npm run dev
```

Mở http://localhost:3001/dashboard. Nếu cổng 3001 đã có ứng dụng chạy, mở ứng dụng
đó hoặc chạy cổng khác: `npx next dev --webpack --port 3003`.

## Nguồn dữ liệu và giới hạn

Đây là **bản xem thử frontend**, chưa đăng nhập hoặc kết nối PostgreSQL/API.
Không cần chạy backend để xem. Dữ liệu được sinh trực tiếp từ SQL seed và có thông báo
chế độ xem thử trên mọi màn nghiệp vụ. Manager mẫu là user 2, được phân công bãi 1 và 2.
Bãi 3 không được đưa vào các danh sách quản lý của tài khoản này.

Các thay đổi hồ sơ, bãi, ô, giá, hủy giữ chỗ, check-in/out chỉ tồn tại trong phiên.
Không có giao dịch tiền thật hoặc lệnh mở barie. Tải lại trang hoặc bấm Đặt lại
sẽ đọc lại dữ liệu mẫu. QR vé và QR thanh toán không được coi là cùng một loại.

`npm run db:generate` đọc schema và seed để tạo hợp đồng dữ liệu cùng bản xem thử;
script **không thực thi SQL**, không kết nối DB và không chạy TRUNCATE trong seed.
Lệnh này tự chạy trước dev, build, test và typecheck. Không sửa file generated bằng tay.
Password hash và raw IPN payload bị loại khỏi dữ liệu trình duyệt.

## Các màn

| Đường dẫn | Nội dung |
| --- | --- |
| / và /dashboard | Sức chứa khai báo, số ô thực tế, đặt chỗ, phiên và thanh toán |
| /lots | Bãi theo phân công; bấm tên bãi hoặc Xem ô trống để lọc vị trí theo Sedan/SUV/EV |
| /layout | Ô theo row_index/col_index, mã, loại ô, trạng thái và is_active |
| /pricing | Quy tắc giá chung theo bãi, khung giờ và ngày hiệu lực |
| /sessions | Hai danh sách riêng: reservations và parking_sessions |
| /kiosk | Tra cứu vé/phiên và mô phỏng chuyển trạng thái có kiểm tra điều kiện |
| /revenue | Báo cáo ngày/tháng/năm/khoảng ngày, biểu đồ, tổng hợp và giao dịch, xuất CSV |
| /audit | audit_logs, manager_history, chi tiết trước/sau, dòng thời gian |
| /settings | Hồ sơ quản lý và các bãi được phân công |

## Kiểm tra

```powershell
npm test
npm run typecheck
npm run build
```

Bộ kiểm tra có 33 bài cho SQL contract, dữ liệu seed, phân công quản lý,
ràng buộc ô, vị trí trống theo loại xe, giá, hủy giữ chỗ, cổng, báo cáo theo kỳ và CSV.

Trong **Bãi đỗ xe**, bấm tên bãi hoặc **Xem ô trống** để xem số lượng,
mã vị trí và hàng/cột. Có bộ lọc **Sedan**, **SUV**, **EV** và tìm theo mã ô.
Quy ước theo backend hiện tại: standard → Sedan, large → SUV,
ev_charging → EV; ô disabled được hiển thị riêng là ô ưu tiên.
Chỉ ô có is_active = true và status = available được tính là còn trống.
Các vị trí thuộc đúng bãi được bấm; sức chứa chưa tạo ô không được cộng vào.

Báo cáo doanh thu có các lựa chọn **Theo ngày**, **Theo tháng**, **Theo năm**
và **Khoảng ngày**. Ngày được tổng hợp theo giờ, tháng theo từng ngày,
năm theo 12 tháng. Tiền thu, tiền hoàn và số giao dịch hiển thị riêng;
không có mục chênh lệch thu/hoàn. Có CSV tổng hợp và CSV giao dịch theo bộ lọc.
Kỳ báo cáo lấy từ ngày thanh toán theo UTC+7; giao dịch chưa có paid_at dùng
ngày tạo và có ghi chú trong báo cáo.

**Lưu ý nguồn seed:** bãi 1 khai báo capacity 80 nhưng mới có 20 ô;
reservation 2 là paid trong khi ô A-04 là occupied. Bản xem thử giữ nguyên và
cảnh báo mâu thuẫn; không tự thêm 60 ô hay sửa trạng thái để làm đẹp số liệu.
Gate từ chối chuyển trạng thái khi dữ liệu không nhất quán.

Chi tiết ánh xạ: [IMPLEMENTATION.md](IMPLEMENTATION.md).
