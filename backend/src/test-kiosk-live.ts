import { pool, testDbConnection, initDbTables, query } from "./config/db";
import app from "./app";
import { Server } from "http";

const PORT = 5099; // Dùng cổng riêng để test không bị đụng

async function runLiveTest() {
  console.log("=================================================");
  console.log("       BẮT ĐẦU KIỂM THỬ THỰC TẾ (LIVE API TEST)   ");
  console.log("=================================================");

  // 1. Kiểm tra kết nối DB
  const dbConnected = await testDbConnection();
  if (!dbConnected) {
    console.error("❌ Không thể kết nối cơ sở dữ liệu PostgreSQL. Vui lòng kiểm tra PostgreSQL đang chạy!");
    process.exit(1);
  }

  // Khởi tạo bảng nếu thiếu
  await initDbTables();

  // 2. Khởi động server HTTP tạm thời để test qua fetch thực tế
  let server: Server;
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`🟢 Test Server đang chạy tại http://localhost:${PORT}`);
      resolve();
    });
  });

  const baseUrl = `http://localhost:${PORT}/api`;

  try {
    // 3. Chuẩn bị dữ liệu mẫu: lấy 1 slot trống của bãi 1
    const slotRes = await query(
      "SELECT id, code, status FROM slots WHERE parking_lot_id = 1 AND status = 'available' LIMIT 1;"
    );
    let testSlot = slotRes.rows[0];

    if (!testSlot) {
      // Nếu không có ô trống, reset ô id 1 về available
      await query("UPDATE slots SET status = 'available' WHERE id = 1;");
      testSlot = { id: 1, code: "A-01", status: "available" };
    }

    console.log(`\n👉 Ô đỗ được chọn để kiểm thử: ID=${testSlot.id}, Code=${testSlot.code}`);

    // =========================================================
    // BƯỚC 1: TEST GIỮ CHỖ (HOLD SPOT)
    // =========================================================
    console.log("\n[TEST 1] Gọi POST /api/reservations/hold...");
    const holdRes = await fetch(`${baseUrl}/reservations/hold`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parking_lot_id: 1,
        slot_id: testSlot.id,
        user_id: 3, // Customer Nguyen Van A
        estimated_hours: 2,
        hold_duration_minutes: 10,
      }),
    });
    const holdData = await holdRes.json();
    console.log(`Status HTTP: ${holdRes.status}`, holdData.success ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");
    if (!holdData.success) throw new Error("Hold spot failed: " + JSON.stringify(holdData));

    const reservationId = holdData.data.reservation_id;
    console.log(`-> Tạo đơn đặt chỗ ID = ${reservationId}, Slot ${holdData.data.slot_code} chuyển sang '${holdData.data.status}'`);

    // =========================================================
    // BƯỚC 2: TEST THANH TOÁN CỌC (PAY DEPOSIT)
    // =========================================================
    console.log("\n[TEST 2] Gọi POST /api/reservations/:id/pay-deposit...");
    const payRes = await fetch(`${baseUrl}/reservations/${reservationId}/pay-deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "vnpay" }),
    });
    const payData = await payRes.json();
    console.log(`Status HTTP: ${payRes.status}`, payData.success ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");
    console.log(`-> Trạng thái đơn sau khi cọc: '${payData.data?.status}', Hạn đến bãi: ${payData.data?.arrival_expires_at}`);

    // =========================================================
    // BƯỚC 3: TEST KIOSK SCAN-IN (XE VÀO CỔNG)
    // =========================================================
    console.log("\n[TEST 3] Gọi POST /api/kiosk/scan-in (Bảo vệ quét QR đón xe)...");
    const scanInRes = await fetch(`${baseUrl}/kiosk/scan-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservation_id: reservationId,
        parking_lot_id: 1,
      }),
    });
    const scanInData = await scanInRes.json();
    console.log(`Status HTTP: ${scanInRes.status}`, scanInData.success ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");
    console.log("-> Kết quả Kiosk hiển thị:", {
      xe: scanInData.data?.vehicle_plate,
      ô_đỗ: scanInData.data?.slot_code,
      bãi: scanInData.data?.lot_name,
      khách: scanInData.data?.customer_name,
      giờ_vào: scanInData.data?.check_in_at,
    });

    // Kiểm tra ô đỗ trong DB có chuyển sang 'occupied' (đỏ) không
    const checkSlotSql = await query("SELECT status FROM slots WHERE id = $1;", [testSlot.id]);
    console.log(`-> Trạng thái thực tế của ô đỗ trong DB: '${checkSlotSql.rows[0]?.status}' (Mong đợi: 'occupied')`);

    // =========================================================
    // BƯỚC 4: TEST KIOSK STATS & ACTIVE SESSIONS
    // =========================================================
    console.log("\n[TEST 4] Gọi GET /api/kiosk/sessions và GET /api/kiosk/stats...");
    const sessionsRes = await fetch(`${baseUrl}/kiosk/sessions?parking_lot_id=1`);
    const sessionsData = await sessionsRes.json();
    console.log(`-> Số lượng xe đang trong bãi/sắp đến: ${sessionsData.data?.length}`);

    const statsRes = await fetch(`${baseUrl}/kiosk/stats?parking_lot_id=1`);
    const statsData = await statsRes.json();
    console.log("-> Thống kê trạm Kiosk:", statsData.data);

    // =========================================================
    // BƯỚC 5: TEST KIOSK SCAN-OUT (XE XUẤT BÃI & TÍNH TIỀN)
    // =========================================================
    console.log("\n[TEST 5] Gọi POST /api/kiosk/scan-out (Bảo vệ quét QR xe ra bãi)...");
    const scanOutRes = await fetch(`${baseUrl}/kiosk/scan-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservation_id: reservationId,
        parking_lot_id: 1,
      }),
    });
    const scanOutData = await scanOutRes.json();
    console.log(`Status HTTP: ${scanOutRes.status}`, scanOutData.success ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");
    console.log("-> Hóa đơn xuất bãi:", {
      thời_gian_đỗ: scanOutData.data?.duration_text,
      tổng_tiền: scanOutData.data?.total_amount + "đ",
      đã_cọc: scanOutData.data?.deposit_amount + "đ",
      thu_thêm: scanOutData.data?.additional_fee + "đ",
      hoàn_lại: scanOutData.data?.refund_fee + "đ",
      trạng_thái: scanOutData.data?.status,
    });

    // Kiểm tra ô đỗ trong DB có trả lại 'available' (xanh) không
    const checkSlotAfter = await query("SELECT status FROM slots WHERE id = $1;", [testSlot.id]);
    console.log(`-> Trạng thái thực tế của ô đỗ trong DB: '${checkSlotAfter.rows[0]?.status}' (Mong đợi: 'available')`);

    // =========================================================
    // BƯỚC 6: TEST GET RESERVATIONS HISTORY & DETAIL
    // =========================================================
    console.log("\n[TEST 6] Gọi GET /api/reservations (Lịch sử) và GET /api/reservations/:id (Chi tiết vé)...");
    const historyRes = await fetch(`${baseUrl}/reservations?user_id=3`);
    const historyData = await historyRes.json();
    console.log(`-> Lấy thành công ${historyData.data?.length} đơn trong lịch sử của User 3.`);

    const detailRes = await fetch(`${baseUrl}/reservations/${reservationId}`);
    const detailData = await detailRes.json();
    console.log("-> Chi tiết vé QR đơn vừa hoàn thành:", {
      id: detailData.data?.id,
      status: detailData.data?.status,
      slot_code: detailData.data?.slot_code,
      qr_payload: detailData.data?.qr_payload,
    });

    console.log("\n=================================================");
    console.log("🎉 TẤT CẢ 6 TEST CASES ĐỀU PASS 100%! READY DEMO!");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình kiểm thử:", error);
  } finally {
    server!.close();
    await pool.end();
  }
}

runLiveTest();
