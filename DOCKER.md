# 🚀 Hướng dẫn chạy EZ-Space bằng Docker

## Yêu cầu
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) đã được cài và đang chạy
- File `.env` đã được cấu hình (copy từ `.env.example`)

---

## ⚡ Chạy nhanh (3 lệnh)

```bash
# 1. Vào thư mục dự án
cd d:\EZ-Space-Smart-Parking

# 2. Copy file env (nếu chưa có)
copy .env.example .env

# 3. Build và chạy tất cả services
docker-compose up -d --build
```

Sau khi chạy xong, truy cập:
| Service | URL |
|---|---|
| 🌐 Frontend (Customer App) | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:5000 |
| 🗄️ Database (PostgreSQL) | localhost:5432 |
| 🔍 API Health Check | http://localhost:5000/api/health |

---

## 📋 Các lệnh thường dùng

```bash
# Xem trạng thái services
docker-compose ps

# Xem logs realtime
docker-compose logs -f

# Xem logs từng service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Dừng tất cả
docker-compose down

# Dừng và xóa data (database)
docker-compose down -v

# Rebuild sau khi thay đổi code
docker-compose up -d --build

# Rebuild riêng từng service
docker-compose build backend
docker-compose build frontend
docker-compose up -d backend   # restart sau rebuild
```

---

## 🏗️ Kiến trúc Docker

```
docker-compose.yml
├── 🗄️  postgres     (PostgreSQL 16)      → port 5432
├── ⚙️  backend      (Express + Node.js)   → port 5000
└── 🌐  frontend     (Next.js)             → port 3000
```

**Thứ tự khởi động:**
1. `postgres` → chờ healthy
2. `backend` → chờ postgres healthy
3. `frontend` → chờ backend healthy

Database tự động được khởi tạo từ:
- `database/schema.sql` → tạo tables
- `database/seed.sql` → insert dữ liệu mẫu

---

## 🔧 Cấu hình môi trường

Chỉnh sửa file `.env` ở thư mục gốc:

```env
# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ez_space

# Backend
PORT=5000
JWT_SECRET=your_secret_here

# Email (Gmail)
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx

# Frontend
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000

# Google Gemini AI
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
```

---

## 🐛 Xử lý lỗi thường gặp

### Port đã được dùng
```bash
# Kiểm tra port đang dùng
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :5432
```

### Database không kết nối được
```bash
# Chờ database ready rồi restart backend
docker-compose restart backend
```

### Reset hoàn toàn (xóa hết data)
```bash
docker-compose down -v
docker-compose up -d --build
```

### Xem lỗi chi tiết
```bash
docker-compose logs backend --tail=50
docker-compose logs frontend --tail=50
```
