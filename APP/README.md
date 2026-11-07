# EZ-Space 🅿️

**Nền tảng tìm kiếm chỗ đỗ xe thông minh và tối ưu công suất bãi xe**
*A Smart Parking Space Search and Capacity Optimization Platform*

![Trạng thái](https://img.shields.io/badge/trạng_thái-đang_phát_triển-orange)
![Loại](https://img.shields.io/badge/đồ_án-Capstone_Project_1-blue)
![Frontend](https://img.shields.io/badge/frontend-Next.js_+_Tailwind_CSS-black)
![Backend](https://img.shields.io/badge/backend-Spring_Boot-6DB33F)

> Đồ án **Capstone Project 1 (CMU-SE 450)**, Khoa Quốc tế, Đại học Duy Tân.
> Nhóm **C1SE.78** • Thời gian thực hiện: 21/08/2026 – 06/12/2026 (15 tuần).

<!-- Thêm ảnh chụp giao diện vào docs/screenshots rồi bỏ comment các dòng dưới -->
<!--
<p align="center">
  <img src="docs/screenshots/kham-pha.png" width="200" />
  <img src="docs/screenshots/so-do-bai.png" width="200" />
  <img src="docs/screenshots/ve-qr.png" width="200" />
</p>
-->

---

## 📌 Giới thiệu

**EZ-Space** là nền tảng đặt chỗ đỗ xe và quản lý vận hành bãi xe theo mô hình **multi-tenant**, hoàn toàn bằng phần mềm. Hệ thống kết nối **tài xế** và **chủ bãi xe** trên cùng một nền tảng:

- **Tài xế** tìm bãi gần mình, xem sơ đồ ô đỗ 2D theo thời gian thực, đặt trước, trả cọc và nhận **mã QR** để vào/ra bãi.
- **Chủ bãi** quản lý nhiều bãi, dựng sơ đồ ô đỗ, thiết lập giá linh hoạt và theo dõi doanh thu, công suất trên một bảng điều khiển tập trung.

## 🎯 Vấn đề và giải pháp

| Vấn đề thực tế | Cách EZ-Space giải quyết |
| --- | --- |
| Không biết bãi còn chỗ hay không, phải chạy vòng tìm chỗ 15–30 phút | Hiển thị bãi và sơ đồ ô theo màu: 🟢 Trống • 🟡 Đang giữ • 🔴 Đã kín |
| Hai người cùng giành một ô | Khóa phân tán (Redis) kết hợp giao dịch cơ sở dữ liệu, giữ ô 10 phút khi thanh toán, trả lỗi `409 Conflict` khi tranh chấp |
| Đặt rồi không đến (no-show) | Tự hủy giữ chỗ sau 10 phút nếu chưa trả cọc; mất cọc nếu quá 20 phút không đến bãi |
| Soát vé thủ công gây ùn tắc cổng | Vé QR động, trình quét kiểm tra và cập nhật trạng thái ô |
| Chủ bãi khó theo dõi doanh thu nhiều bãi | Một bảng điều khiển cho cấu hình bãi, sơ đồ ô và báo cáo |

## ✨ Tính năng chính

### Tài xế (Customer)
- Đăng ký / đăng nhập, quản lý hồ sơ và xe (biển số, loại xe: Sedan, SUV, EV)
- Tìm bãi theo từ khóa, quận; lọc theo loại xe và chỗ trống
- Xem sơ đồ ô đỗ 2D, gợi ý ô phù hợp theo luật (rule-based)
- Giữ ô 10 phút, thanh toán cọc qua cổng **sandbox** (VNPay/MoMo)
- Vé QR, theo dõi đồng hồ đếm ngược, hủy đặt chỗ, xem lịch sử

### Quản lý bãi (Parking Manager)
- Cấu hình sức chứa, mã ô, loại ô; dựng sơ đồ bãi
- Thiết lập giá theo giờ và phụ thu giờ cao điểm
- Theo dõi công suất, lịch sử đặt chỗ, doanh thu
- Kiosk cổng: quét QR để xác nhận vào/ra (mô phỏng)

### Quản trị hệ thống (System Admin)
- Quản lý tài khoản người dùng
- Duyệt bãi xe mới đăng ký

### Mở rộng (ngoài lõi MVP)
- Trợ lý hội thoại tìm chỗ đỗ bằng ngôn ngữ tự nhiên. AI chỉ đóng vai trò giao diện hội thoại; dữ liệu và quyết định đặt chỗ vẫn do hệ thống luật xử lý, người dùng tự xác nhận.

## 🔄 Luồng đặt chỗ của khách hàng

```
Đăng nhập → Tìm bãi → Xem ô đỗ → Chọn giờ → Giữ chỗ → Thanh toán cọc → Vé QR
```

**Quy tắc nghiệp vụ** (cấu hình tập trung, có thể điều chỉnh):

- Giữ chỗ tạm thời: **10 phút** để hoàn tất thanh toán cọc
- Hạn đến bãi: **20 phút** kể từ khi trả cọc thành công, quá hạn thì ô được trả về và mất cọc
- Hủy trong thời gian ngắn sau khi trả cọc được hoàn cọc (giá trị mặc định dùng cho bản demo)

## 🏗️ Kiến trúc và công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện khách hàng và quản lý | Next.js (React), Tailwind CSS |
| Backend (REST API) | Java, Spring Boot |
| Cơ sở dữ liệu | PostgreSQL 16 |
| Bộ nhớ đệm, khóa phân tán, TTL giữ chỗ | Redis 7.x |
| Tác vụ nền (giải phóng giữ chỗ hết hạn) | Spring Scheduled Tasks (chu kỳ 30 giây) |
| Thanh toán | VNPay Sandbox (IPN webhook) |
| Đóng gói và triển khai | Docker, Docker Compose |
| Quản lý mã nguồn, CI | Git, GitHub, GitHub Actions |
| Thiết kế và kiểm thử API | Figma, OpenAPI, Postman |

**Yêu cầu phi chức năng tiêu biểu:** chống đặt trùng ô khi có tranh chấp đồng thời; thời gian phản hồi API trung bình dưới 500 ms; mật khẩu băm BCrypt, xác thực JWT, kiểm tra chữ ký HMAC-SHA256 cho callback thanh toán; giao diện responsive tối ưu cho di động.

## 📦 Phạm vi

**Trong phạm vi:** ứng dụng web responsive cho khách hàng; bảng điều khiển quản lý; kiến trúc multi-tenant; bộ lập lịch hết hạn giữ chỗ; tích hợp thanh toán sandbox; luồng xác minh QR.

**Ngoài phạm vi:** lắp đặt phần cứng (cảm biến, thanh chắn, camera nhận diện biển số); dịch vụ xe đưa đón; giao dịch ngân hàng thật. Mọi thanh toán đều chạy trên môi trường thử nghiệm, không trừ tiền thật.

## 🗓️ Lộ trình (Agile/Scrum, 5 sprint)

| Sprint | Thời gian | Nội dung |
| --- | --- | --- |
| 1. Khởi tạo và thiết kế | Tuần 1–3 | Phân tích yêu cầu, thiết kế ERD, prototype Figma, đặc tả OpenAPI |
| 2. Nền tảng và giao diện cơ bản | Tuần 4–6 | JWT, phân quyền (RBAC), CRUD bãi/ô, hiển thị sơ đồ 2D |
| 3. Engine đặt chỗ | Tuần 7–9 | Khóa chống đặt trùng, gợi ý ô theo xe, bộ lập lịch hết hạn 10/20 phút |
| 4. Thanh toán và kiosk | Tuần 10–12 | Thanh toán sandbox, vé QR, kiosk cổng, thống kê |
| 5. Kiểm thử và phát hành | Tuần 13–15 | Kiểm thử tích hợp và đồng thời, đóng gói Docker Compose, báo cáo cuối |

> Tiến độ chi tiết xem ở tab **Issues / Projects** của repository.

## 🚀 Chạy giao diện (frontend)

Yêu cầu: Node.js phiên bản LTS mới, npm.

```bash
# Cài đặt thư viện
npm install

# Chạy môi trường phát triển
npm run dev
```

Mở http://localhost:3000 trên trình duyệt. Giao diện thiết kế cho **di động**, khi mở bằng máy tính nên bật chế độ giả lập thiết bị (F12 → biểu tượng điện thoại) hoặc thu hẹp cửa sổ.

Hiện tại giao diện dùng **dữ liệu mẫu** và lớp API giả lập; backend Spring Boot sẽ được nối ở các sprint sau.

## 👥 Nhóm thực hiện

| Thành viên | Vai trò |
| --- | --- |
| Phạm Văn Nhật | Trưởng nhóm / Backend |
| Phạm Thuận Hoàng | Backend |
| Phạm Văn Huy | Frontend / DevOps |
| Phạm Trần Vũ Thái | Frontend / QA |

**Giảng viên hướng dẫn:** ThS. Phạm Thành Đạt, Khoa Quốc tế, Đại học Duy Tân.

## 🤖 Sử dụng AI trong quá trình thực hiện

Nhóm sử dụng công cụ AI hỗ trợ (ChatGPT, Google Antigravity) cho việc brainstorm kiến trúc, sinh mã mẫu, gỡ lỗi và soạn thảo tài liệu, theo đúng *Chính sách AI cho đồ án Capstone* của trường. Mọi nội dung do AI tạo đều được nhóm xem xét, chỉnh sửa và chịu trách nhiệm. Chi tiết xem trong tài liệu proposal.


