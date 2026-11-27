# EZ-Space Admin Portal

Hệ thống Quản trị Nền tảng **EZ-Space Smart Parking** (Capstone 1 — Nhóm C1SE.78, Đại học Duy Tân):
- **Backend**: Node.js + Express + TypeScript + PostgreSQL
- **Frontend**: Next.js (App Router) + React + Tailwind CSS + TypeScript

## 1. Cấu trúc thư mục

```text
admin/
├── package.json                    # Script chạy đồng thời Backend & Frontend
├── backend/                        # Node.js + Express + TypeScript + PostgreSQL
│   ├── src/
│   │   ├── server.ts               # Khởi động server (127.0.0.1:8000)
│   │   ├── app.ts                  # Express, CORS, localhost guard & error handler
│   │   ├── config/env.ts           # Đọc .env / .env.local
│   │   ├── db/pool.ts              # PostgreSQL Pool, transaction, audit log & auto-seed
│   │   ├── routes/admin.routes.ts  # RESTful /api/admin/*, session login, SSO & CSRF
│   │   ├── controllers/            # Truy vấn SQL tách theo 6 nghiệp vụ
│   │   └── shared/                 # date-range.ts (UTC+7), revenue-math.ts (5%)
│   └── tests/                      # Unit & verification tests
├── frontend/                       # Next.js + React + Tailwind CSS + TypeScript
│   ├── next.config.ts              # Proxy /api/* -> http://127.0.0.1:8000/api/*
│   ├── tailwind.config.ts          # Cấu hình Tailwind CSS
│   ├── postcss.config.js           # Cấu hình PostCSS + Autoprefixer
│   └── src/
│       ├── app/                    # 6 trang quản trị: /, /lots, /users, /revenue, /logs, /settings
│       ├── context/                # AdminContext (auth, SSO, CSRF, summary, modal, toast)
│       ├── components/             # AdminShell, AdminSignIn, RangeFilter, ConfirmDialog, Modals, Tables
│       └── lib/                    # api, types, constants, format, date-range, csv, hooks
├── sql/                            # schema.sql (15 bảng) & seed.sql chuẩn của Admin (đồng bộ từ database/)
└── scripts/run-all.cjs             # Chạy đồng thời Backend + Frontend
```

## 2. Cài đặt & Chạy

```powershell
cd admin
npm run install:all
npm test
npm run dev
```

- **Frontend (Next.js + React + Tailwind CSS)**: http://localhost:3002/
- **Backend (Node.js + Express — RESTful API)**: http://127.0.0.1:8000/api/admin/* (Health: `/api/health`)

Các lệnh khác: `npm run build`, `npm run start`, `npm run typecheck`, `npm run dev:backend`, `npm run dev:frontend`.

## 3. Đồng bộ nghiệp vụ & API với App

- **Mức tiền cọc mẫu**: **50.000 ₫ / lượt** (khấu trừ vào tổng phí đỗ khi tất toán tại Kiosk).
- **Cổng thanh toán (Sandbox / Mô phỏng)**: `vnpay` (**VNPay Sandbox**, mặc định kèm IPN webhook), `momo` (**Ví MoMo**), `card` (**Thẻ quốc tế**) — không phát sinh giao dịch tiền thật.
- **Kiểu thiết kế API**: RESTful JSON (`/api/platform-config`, `/api/admin/auth`, `/api/admin/login`, `/api/admin/sso`, `/api/admin/logout`, `/api/admin/summary`, `/api/admin/dashboard`, `/api/admin/lots`, `/api/admin/lots/:id`, `PATCH /api/admin/lots/:id/status`, `/api/admin/users`, `/api/admin/users/:id`, `PATCH /api/admin/users/:id/status`, `/api/admin/revenue`, `/api/admin/logs`, `/api/admin/settings`).
- **Tài khoản Admin mặc định (`seed.sql`)**: Email `admin@ezspace.vn`, mật khẩu `password123`.
- **Doanh thu Admin (5%) & Lọc thời gian**: Admin nhận **5% tiền thực thu sau hoàn tiền** của mỗi lượt đặt ô (`cọc thành công + tất toán thành công − hoàn tiền`); chủ bãi nhận **95%** còn lại. Bộ lọc **Thời gian** tính trọn ngày kết thúc theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) và chỉ thay đổi kỳ đang xem khi bấm **Áp dụng** và tải dữ liệu thành công.
