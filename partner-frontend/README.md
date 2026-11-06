# EZ-Space Partner

Ứng dụng giao diện Partner chạy độc lập với giao diện khách hàng trong thư mục `frontend`.

## Chạy trên VS Code

Mở Terminal tại thư mục gốc repository và chạy (đã kiểm tra với Node.js 24.14.1):

```powershell
cd partner-frontend
npm ci
npm run dev
```

Sau khi hiện `Ready`, mở **http://localhost:3001** để vào **Tổng quan bãi đỗ xe (frame 2)**. Không cần chạy frontend khách hàng hoặc backend.

Để xem lại **frame 1**, chọn **Bộ quy chuẩn** trên thanh bên, hoặc mở **http://localhost:3001/design-system**.

Để xem **frame 3**, chọn **Bãi đỗ xe** trên thanh bên, hoặc mở **http://localhost:3001/lots**.

Để xem **frame 4**, chọn **Sơ đồ ô đỗ** trên thanh bên, hoặc mở **http://localhost:3001/layout**.

Để xem **Dashboard Overview** mới, chọn **Tổng quan** trên thanh bên, hoặc mở **http://localhost:3001/dashboard**. Màn điều hành bãi trước đó vẫn có tại **http://localhost:3001/** và liên kết cuối Dashboard.

Để xem **Báo cáo doanh thu**, chọn **Báo cáo doanh thu** trên thanh bên hoặc mở **http://localhost:3001/revenue**. Trang này tái hiện frame Figma `7:6955`, kích thước desktop 1280 × 2120: menu 260 px, nội dung 972 px, 5 KPI, biểu đồ cột chồng/đường, hai thẻ phân tích và 4 tab giao dịch. Mặc định giữ nguyên nội dung mẫu Figma ngày 01–29/10/2026: 48.250.000đ, 412 lượt, 295 tiền cọc, 48 phí lố giờ và 21 cọc bị phạt. Bộ lọc ngày/loại xe, tìm kiếm, phân trang, chi tiết, CSV và In/Lưu PDF dùng dữ liệu mẫu riêng trong `src/lib/revenue-design-data.ts`; chưa liên kết số liệu vận hành hoặc backend. Các số liệu và đường biểu đồ ở trạng thái ban đầu dùng để đối chiếu thiết kế.

Để xem **Bảng giá độc lập**, chọn **Bảng giá** trên thanh bên, hoặc mở **http://localhost:3001/pricing**.

Để xem **Cài đặt tài khoản & Bảo mật**, chọn **Cài đặt** ở cuối menu hoặc mở **http://localhost:3001/settings**. Tab Hồ sơ cá nhân tái hiện frame Figma `7:9164`, kích thước 1280 × 1108, với thông tin liên hệ, ảnh JPG/PNG tối đa 2MB và 3 bãi mẫu được phân quyền. Email và vai trò là trường cố định; tên/điện thoại/ảnh được giữ khi chuyển tab trong trang Cài đặt, đặt lại khi tải lại hoặc rời trang. Tab Bảo mật được dựng cùng phong cách vì frame cung cấp chỉ thể hiện Hồ sơ cá nhân: biểu mẫu mật khẩu chỉ kiểm tra dữ liệu rồi xóa ô nhập; xác thực hai bước và kết thúc phiên đều là mô phỏng, không gửi/lưu thông tin xác thực và không thay đổi tài khoản thật.

Để xem **Lịch sử thao tác & Đối soát**, chọn **Lịch sử thao tác** trên thanh bên hoặc mở **http://localhost:3001/audit**. Trang tái hiện frame Figma `7:8525`, kích thước desktop 1280 × 1382, với 6 dòng mẫu chia theo ngày 29, 28 và 27/10/2026. Có chế độ bảng/dòng thời gian, tìm theo lý do/mã đơn, lọc thao tác/quản lý/ngày, chi tiết chỉ đọc và xuất CSV theo bộ lọc. Bảng cuộn ngang để xem lý do và nút Chi tiết; cũng có thể bấm thời gian để mở chi tiết. Các bộ đếm 68/15/18/5/10/8 và nhãn đối soát/SHA-256 là nội dung mẫu trong Figma; chưa có kết nối đối soát, xác minh chữ ký hoặc nhật ký bất biến từ backend.

Để xem **Đặt chỗ & Phiên đỗ**, chọn mục tương ứng trên thanh bên hoặc mở **http://localhost:3001/sessions**.

Để xem **Gate Kiosk**, chọn **Gate Kiosk** hoặc mở **http://localhost:3001/kiosk**. Dùng các nút tình huống (phím 1–7), hoặc nhập mã mẫu `EZ-8921` ở cổng vào, `EZ-8919` ở cổng ra. Xác nhận check-in/check-out cập nhật dữ liệu dùng chung; tải lại trang đặt lại dữ liệu mẫu. Camera chỉ bật khi bấm **Bật camera**, cần trình duyệt hỗ trợ BarcodeDetector; nếu không hỗ trợ thì nhập mã thủ công. Màn hình không điều khiển barie và không thực hiện thanh toán thật.

- Khách hàng: thư mục `frontend`, cổng **3000**.
- Partner: thư mục `partner-frontend`, cổng **3001**.
- Nhấn **Ctrl+C** trong terminal tương ứng để dừng ứng dụng đó.

## Kiểm tra

```powershell
npm run typecheck
npm test
npm run build
```

Để chạy bản production sau khi build: `npm start`.

## Phạm vi hiện tại

Màn điều hành tại `/` gồm Tổng quan, KPI, biểu đồ, chọn bãi, tìm kiếm/lọc/phân trang phiên đỗ, xuất CSV, hồ sơ kiểm duyệt minh họa và drawer chi tiết ô đỗ.

Nhận xe, trả xe, hủy đặt chỗ, bảo trì ô và đăng ký xe vãng lai dùng dữ liệu mẫu; KPI, bảng và ô đỗ cập nhật cùng nhau. Báo cáo CSV chỉ xuất các phiên mẫu trong ngày theo bộ lọc hiện tại. Dữ liệu được đặt lại khi tải lại trang hoặc bấm **Đặt lại dữ liệu mẫu**. Các thao tác không gọi API, không điều khiển cổng và không thu tiền thật.

Frame 3 gồm danh sách bãi theo bốn trạng thái, tìm kiếm/lọc, chế độ lưới/danh sách, hồ sơ chi tiết, đăng ký bãi mới, cấu hình sức chứa, gửi lại hồ sơ bị từ chối và tạm ngưng/kích hoạt lại bãi. Tổng quan và danh sách bãi dùng chung dữ liệu trong phiên: đổi tên/sức chứa cập nhật cả hai màn, không xóa xe đang đỗ hoặc giữ chỗ. Bãi tạm ngưng không nhận xe vãng lai mới. Bãi mới và hồ sơ gửi lại chỉ chuyển sang chờ duyệt.

Sơ đồ ô đỗ hỗ trợ chọn một/nhiều ô bằng Shift, chỉnh mã/loại xe/bảo trì, thêm hoặc xóa ô khỏi bản bố trí, chuyển tầng, kéo ô hoặc dùng phím mũi tên, nhân bản, tạo lưới tự động, đặt cổng và làn xe, hoàn tác/làm lại, phóng to/thu nhỏ và xác nhận lưu.

Bản nháp được giữ khi chuyển màn trong cùng phiên. **Lưu sơ đồ** áp dụng mã và trạng thái bảo trì vào dữ liệu dùng chung; **Xem trực tiếp** hiển thị bản đã lưu. Chế độ trực tiếp hiện dùng dữ liệu mẫu, chưa có kết nối thời gian thực với backend. Ô chưa định vị vẫn thuộc bãi; xóa khỏi sơ đồ không xóa lịch sử phiên đỗ. Ô có xe/giữ chỗ không thể đổi mã, đổi loại xe, khóa hoặc xóa. Snap to Grid bật/tắt các điểm hướng dẫn; vị trí ô luôn theo lưới cố định.

Frame Bảng giá là màn Partner độc lập, có hồ sơ giá theo bãi, giá theo giờ từng loại xe, phụ phí cao điểm, phí lố giờ, và mô phỏng hóa đơn. Dữ liệu chỉ được lưu trong phiên trình duyệt; không gọi backend hoặc thiết bị Barrier thật. Dùng **Lưu bảng giá** để lưu bản mẫu hiện tại.
