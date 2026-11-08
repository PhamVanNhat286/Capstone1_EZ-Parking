# EZ-Space Admin Portal

Hệ thống Quản trị Nền tảng **EZ-Space Smart Parking** (Đồ án Capstone 1 — Nhóm C1SE.78, Đại học Duy Tân), đồng bộ 100% với cấu trúc cơ sở dữ liệu `database/schema.sql` và `database/seed.sql`.

## 1. Cấu trúc phân tách thư mục & module ("Mục nào ra mục đó")

```text
admin/
├── index.html                  # Mục 1: Tổng quan nền tảng (Platform Overview)
├── lots.html                   # Mục 2: Quản lý & Phê duyệt bãi đỗ (Lot Operations)
├── users.html                  # Mục 3: Quản lý người dùng hệ thống (User Management)
├── revenue.html                # Mục 4: Báo cáo doanh thu tổng (Global Revenue)
├── logs.html                   # Mục 5: Nhật ký hệ thống & Đối soát (System Audit Logs)
├── data.html                   # Mục 6: Dữ liệu nghiệp vụ (Operational Data)
├── settings.html               # Mục 7: Cài đặt nền tảng (Platform Settings)
├── START_ADMIN.bat             # Khởi chạy nhanh Admin bằng 1 cú nhấp chuột
│
├── css/                        # Giao diện tách theo nền tảng & từng trang
│   ├── base.css                # Biến màu, reset, typography, hệ thống icon
│   ├── layout.css              # Bố cục Sidebar, Topbar, Container, Header, Footer
│   ├── components.css          # Nút, Nhãn, Card, KPI, Bảng, Toolbar, Modal, Toast
│   ├── style.css               # File tổng hợp CSS nền tảng
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
│   ├── icons.js                # Bộ biểu tượng SVG nội tuyến
│   ├── core.js                 # Trạng thái trang hiện tại
│   ├── app.js                  # Bộ điều phối tải dữ liệu & sự kiện
│   ├── core/                   # Các module lõi dùng chung
│   │   ├── constants.js        # Ánh xạ đầy đủ các kiểu ENUM từ schema.sql
│   │   ├── format.js           # Định dạng số, tiền tệ, ngày giờ & DOM selector
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
│       ├── modal.js            # Đóng/mở hộp thoại Modal
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
│   └── check-db.cjs            # Kiểm tra kết nối 15 bảng PostgreSQL
└── tests/
    └── verify.cjs              # Kiểm thử tự động toàn bộ giao diện, SQL & dữ liệu
```

## 2. Hướng dẫn chạy

```powershell
cd admin
npm install
npm test
npm run dev
```

Mở trình duyệt tại: **http://127.0.0.1:8000/** (hoặc mở trực tiếp các file `.html` bằng VS Code Live Server).
