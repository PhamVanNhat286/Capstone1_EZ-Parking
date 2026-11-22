# EZ-Space Admin Portal

Hệ thống Quản trị Nền tảng **EZ-Space Smart Parking** (Đồ án Capstone 1 — Nhóm C1SE.78, Đại học Duy Tân), đồng bộ 100% với cấu trúc cơ sở dữ liệu `database/schema.sql` và `database/seed.sql`.

## 1. Cấu trúc phân tách thư mục & module ("Mục nào ra mục đó")

```text
admin/
├── pages/                      # Giao diện 7 trang HTML (phân tách riêng)
│   ├── index.html              # Mục 1: Tổng quan nền tảng (Platform Overview)
│   ├── lots.html               # Mục 2: Quản lý & Phê duyệt bãi đỗ (Lot Operations)
│   ├── users.html              # Mục 3: Quản lý người dùng hệ thống (User Management)
│   ├── revenue.html            # Mục 4: Báo cáo doanh thu tổng (Global Revenue)
│   ├── logs.html               # Mục 5: Nhật ký hệ thống & Đối soát (System Audit Logs)
│   ├── data.html               # Mục 6: Dữ liệu nghiệp vụ (Operational Data)
│   └── settings.html           # Mục 7: Cài đặt nền tảng (Platform Settings)
│
├── css/                        # Giao diện tách theo Core & từng Trang
│   ├── core/
│   │   ├── base.css            # Biến màu, reset, typography, hệ thống icon
│   │   ├── layout.css          # Bố cục Sidebar, Topbar, Container, Header, Footer
│   │   └── components.css      # Nút, Nhãn, Card, KPI, Bảng, Toolbar, Modal, Toast
│   └── pages/                  # CSS riêng biệt cho từng mục
│       ├── dashboard.css
│       ├── lots.css
│       ├── users.css
│       ├── revenue.css
│       ├── logs.css
│       ├── records.css
│       └── settings.css
│
├── js/                         # Logic Frontend tách theo Core, Trang & Hành động
│   ├── core/                   # Các module lõi dùng chung
│   │   ├── app.js              # Bộ điều phối tải dữ liệu & sự kiện
│   │   ├── core.js             # Trạng thái trang hiện tại
│   │   ├── icons.js            # Bộ biểu tượng SVG nội tuyến
│   │   ├── constants.js        # Ánh xạ đầy đủ các kiểu ENUM từ schema.sql
│   │   ├── format.js           # Định dạng số, tiền tệ, ngày giờ & DOM selector
│   │   ├── date-range.js       # Xử lý mốc thời gian theo múi giờ Việt Nam
│   │   ├── revenue-math.js     # Công thức tính doanh thu Admin 5% & Chủ bãi 95%
│   │   ├── seed-data.js        # Dữ liệu chuẩn từ schema.sql & seed.sql của App
│   │   ├── api.js              # Giao tiếp HTTP API & tự động đồng bộ dữ liệu
│   │   └── components.js       # Thành phần UI dùng chung (KPI, Table, Section, Filter)
│   ├── pages/                  # Giao diện hiển thị riêng của từng mục
│   │   ├── dashboard.js
│   │   ├── lots.js
│   │   ├── users.js
│   │   ├── revenue.js
│   │   ├── logs.js
│   │   ├── records.js
│   │   └── settings.js
│   └── actions/                # Xử lý tương tác & hộp thoại chi tiết
│       ├── modal.js            # Đóng/mở hộp thoại Modal & Xác nhận thao tác
│       ├── export.js           # Xuất báo cáo CSV theo từng mục
│       ├── lot-detail.js       # Xem chi tiết bãi đỗ & Sơ đồ ma trận 2D (row_index, col_index)
│       ├── lot-status.js       # Duyệt, từ chối, tạm ngừng, kích hoạt bãi đỗ
│       ├── user-detail.js      # Xem hồ sơ người dùng, xe cá nhân, bãi phụ trách & đơn đặt chỗ
│       ├── user-status.js      # Khóa, mở khóa, tạm ngưng tài khoản
│       └── log-detail.js       # Xem chi tiết JSON trước/sau (old_value / new_value)
│
├── server/                     # Backend Node.js + PostgreSQL
│   ├── index.cjs               # HTTP Server & định tuyến API / Static
│   ├── db.cjs                  # Kết nối PostgreSQL Pool, Transaction & Audit Log
│   ├── handlers.cjs            # Điều phối Readers / Writers
│   ├── config/
│   │   └── env.cjs             # Tự động đọc cấu hình từ Capstone1_EZ-Parking/backend/.env hoặc .env.local
│   ├── data/
│   │   └── seed-store.cjs      # Kho dữ liệu chuẩn từ schema.sql & seed.sql
│   └── controllers/            # Truy vấn SQL tách riêng theo từng mục nghiệp vụ
│       ├── utils.cjs
│       ├── dashboard.cjs
│       ├── lots.cjs
│       ├── users.cjs
│       ├── revenue.cjs
│       ├── logs.cjs
│       ├── records.cjs
│       └── settings.cjs
│
├── sql/                        # Cấu trúc & dữ liệu gốc từ App
│   ├── schema.sql              # Cấu trúc 15 bảng & 12 ENUM PostgreSQL 16
│   └── seed.sql                # Dữ liệu mẫu chuẩn của App
├── scripts/
│   ├── check-db.cjs            # Kiểm tra kết nối 15 bảng PostgreSQL
│   └── START_ADMIN.bat         # Khởi chạy nhanh Admin bằng 1 cú nhấp chuột
└── tests/
    ├── verify.cjs              # Kiểm thử tự động toàn bộ giao diện, SQL & dữ liệu
    ├── revenue.cjs             # Kiểm thử công thức doanh thu 5% & bộ lọc
    └── date-range.cjs          # Kiểm thử giới hạn thời gian & múi giờ Việt Nam
```

## 2. Hướng dẫn chạy

```powershell
cd admin
npm install
npm test
npm run dev
```

Mở trình duyệt tại: **http://127.0.0.1:8000/** (hoặc mở trực tiếp các file `.html` bằng VS Code Live Server).

## 3. Doanh thu Admin

- Admin nhận **5% tiền thực thu của mỗi lượt đặt ô giữ xe**; phần còn lại thuộc chủ bãi.
- Tiền thực thu = cọc thanh toán thành công + tiền tất toán thu thêm thành công − tiền hoàn thành công/đã hoàn. Không cộng thêm `reservations.total_amount` để tránh tính trùng tiền cọc.
- Ví dụ: một lượt đặt ô có cọc 20.000đ và tất toán thêm 20.000đ thì Admin nhận 2.000đ, chủ bãi nhận 38.000đ. Hoàn lại 10.000đ sẽ giảm doanh thu Admin 500đ.
- Giao dịch chờ xử lý/thất bại không tạo doanh thu. Cọc bị mất do no-show vẫn thuộc tiền thực thu. Khoản hoàn được ghi giảm vào kỳ hoàn tiền, nên doanh thu kỳ đó có thể âm.
- Quy tắc dùng chung tại `js/core/revenue-math.js`, áp dụng cho API PostgreSQL và dữ liệu mẫu. Báo cáo, tổng quan và CSV tách rõ tiền khách trả với phần doanh thu Admin.

Trang tổng quan và báo cáo dùng một thanh lọc **Thời gian** với các lựa chọn: Tất cả thời gian, Hôm nay, 7 ngày gần đây, Tháng này, Theo tháng, Theo năm và Khoảng ngày. Chỉ những ô phù hợp với lựa chọn hiện tại được hiển thị; tất cả dùng chung nút **Áp dụng**.

Theo năm chỉ cần nhập năm; Theo tháng chọn tháng và năm; Khoảng ngày chọn ngày bắt đầu/kết thúc (chọn cùng ngày để xem một ngày). Bộ lọc tính trọn ngày kết thúc theo giờ Việt Nam. Biểu đồ từng bãi, tổng doanh thu, đối soát và CSV dùng chung kỳ đã áp dụng. Nhãn **Thay đổi chưa áp dụng** giúp phân biệt giá trị đang nhập với dữ liệu đang xem; kỳ hiển thị chỉ đổi khi tải dữ liệu thành công.
