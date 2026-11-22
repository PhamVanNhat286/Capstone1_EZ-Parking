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
│   │   ├── routes/admin.routes.ts  # /api/admin & /api/health, session cookie & CSRF
│   │   ├── controllers/            # Truy vấn SQL tách theo 7 nghiệp vụ (15 bảng)
│   │   └── shared/                 # date-range.ts (UTC+7), revenue-math.ts (5%)
│   └── tests/                      # Unit & verification tests
├── frontend/                       # Next.js + React + Tailwind CSS + TypeScript
│   ├── next.config.ts              # Proxy /api/* -> http://127.0.0.1:8000/api/*
│   ├── tailwind.config.ts          # Cấu hình Tailwind CSS
│   ├── postcss.config.js           # Cấu hình PostCSS + Autoprefixer
│   └── src/
│       ├── app/                    # 7 trang App Router: /, /lots, /users, /revenue, /logs, /data, /settings
│       ├── context/                # AdminContext (auth, CSRF, summary, modal, toast)
│       ├── components/             # AdminShell, RangeFilter, ConfirmDialog, Modals, Tables
│       └── lib/                    # api, types, constants, format, date-range, csv, hooks
├── sql/                            # schema.sql (15 bảng) & seed.sql (tự nạp nếu DB trống)
└── scripts/run-all.cjs             # Chạy đồng thời Backend + Frontend
```

## 2. Cài đặt & Chạy

```powershell
cd admin
npm run install:all
npm test
npm run dev
```

- **Frontend (Next.js + React + Tailwind CSS)**: http://127.0.0.1:3001/
- **Backend (Node.js + Express)**: http://127.0.0.1:8000/api/admin (Health: `/api/health`)

Các lệnh khác: `npm run build`, `npm run start`, `npm run typecheck`, `npm run dev:backend`, `npm run dev:frontend`.

## 3. Doanh thu Admin (5%) & Lọc thời gian

- Admin nhận **5% tiền thực thu sau hoàn tiền** của mỗi lượt đặt ô (`cọc thành công + tất toán thành công − hoàn tiền`); chủ bãi nhận **95%** còn lại.
- Bộ lọc **Thời gian** tính trọn ngày kết thúc theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) và chỉ thay đổi kỳ đang xem khi bấm **Áp dụng** và tải dữ liệu thành công.
