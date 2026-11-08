import { pool, testDbConnection, initDbTables, query } from "./config/db";
import app from "./app";
import { Server } from "http";

const PORT = 5098; // Cổng riêng để kiểm thử cron

async function runCronLiveTest() {
  console.log("=================================================");
  console.log("    BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG BƯỚC 3 (CRON WORKER) ");
  console.log("=================================================");

  const dbConnected = await testDbConnection();
  if (!dbConnected) {
    console.error("❌ Không thể kết nối PostgreSQL.");
    process.exit(1);
  }

  await initDbTables();

  let server: Server;
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`🟢 Test Server đang chạy tại http://localhost:${PORT}`);
      resolve();
    });
  });

  const baseUrl = `http://localhost:${PORT}/api`;

  try {
    // -----------------------------------------------------------------
    // TEST 1: Kiểm tra trạng thái Worker (/api/cron/status)
    // -----------------------------------------------------------------
    console.log("\n[TEST 1] Kiểm tra trạng thái Expiration Worker...");
    const statusRes = await fetch(`${baseUrl}/cron/status`);
    const statusData = await statusRes.json();
    console.log("-> Worker status:", statusData.data);
    if (!statusData.success) throw new Error("Get worker status failed");

    // -----------------------------------------------------------------
    // TEST 2: KỊCH BẢN QUÁ HẠN 10 PHÚT CHƯA CỌC
    // -----------------------------------------------------------------
    console.log("\n[TEST 2] Mô phỏng tài xế giữ ô nhưng QUÁ HẠN 10 PHÚT không trả cọc...");
    
    // Tìm 1 ô available
    const slot1Res = await query("SELECT id, code FROM slots WHERE parking_lot_id = 1 AND status = 'available' LIMIT 1;");
    let slot1 = slot1Res.rows[0];
    if (!slot1) {
      await query("UPDATE slots SET status = 'available' WHERE id = 1;");
      slot1 = { id: 1, code: "A-01" };
    }
    console.log(`-> Chọn ô: ID=${slot1.id}, Code=${slot1.code}`);

    // Giữ ô
    const holdRes = await fetch(`${baseUrl}/reservations/hold`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parking_lot_id: 1,
        slot_id: slot1.id,
        user_id: 3,
        estimated_hours: 2,
      }),
    });
    const holdData = await holdRes.json();
    const resId1 = holdData.data.reservation_id;
    console.log(`-> Đã giữ ô. Tạo đơn #${resId1}. Trạng thái ô trong DB hiện là 'holding' (VÀNG).`);

    // Kích hoạt mô phỏng quá hạn 10 phút
    console.log("-> Kích hoạt mô phỏng quá hạn 10 phút...");
    const simExpire1Res = await fetch(`${baseUrl}/cron/simulate-expire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservation_id: resId1, type: "hold" }),
    });
    const simExpire1Data = await simExpire1Res.json();
    console.log(`Status HTTP: ${simExpire1Res.status}`, simExpire1Data.success ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

    // Kiểm tra DB
    const checkRes1 = await query("SELECT status, cancel_reason FROM reservations WHERE id = $1;", [resId1]);
    const checkSlot1 = await query("SELECT status FROM slots WHERE id = $1;", [slot1.id]);
    const checkAudit1 = await query("SELECT action, note, created_at FROM audit_logs WHERE entity_id = $1 ORDER BY id DESC LIMIT 1;", [resId1]);

    console.log("-> Kết quả kiểm tra Database:");
    console.log(`   • Trạng thái đơn #${resId1}: '${checkRes1.rows[0]?.status}' (Lý do: "${checkRes1.rows[0]?.cancel_reason}")`);
    console.log(`   • Trạng thái ô ${slot1.code}: '${checkSlot1.rows[0]?.status}' (Mong đợi: 'available' - XANH)`);
    console.log(`   • Nhật ký audit_logs: [${checkAudit1.rows[0]?.action}] ${checkAudit1.rows[0]?.note}`);

    if (checkRes1.rows[0]?.status !== "cancelled" || checkSlot1.rows[0]?.status !== "available") {
      throw new Error("Kịch bản 1 thất bại!");
    }

    // -----------------------------------------------------------------
    // TEST 3: KỊCH BẢN QUÁ HẠN 20 PHÚT KHÔNG ĐẾN BÃI (MẤT CỌC)
    // -----------------------------------------------------------------
    console.log("\n[TEST 3] Mô phỏng tài xế đã trả cọc nhưng QUÁ HẠN 20 PHÚT không đến bãi...");

    // Giữ ô lại
    const hold2Res = await fetch(`${baseUrl}/reservations/hold`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parking_lot_id: 1,
        slot_id: slot1.id,
        user_id: 3,
        estimated_hours: 2,
      }),
    });
    const hold2Data = await hold2Res.json();
    const resId2 = hold2Data.data.reservation_id;

    // Trả cọc
    await fetch(`${baseUrl}/reservations/${resId2}/pay-deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "vnpay" }),
    });
    console.log(`-> Đã thanh toán cọc cho đơn #${resId2}. Trạng thái hiện tại: 'paid'.`);

    // Kích hoạt mô phỏng quá hạn 20 phút đến bãi
    console.log("-> Kích hoạt mô phỏng quá hạn 20 phút không đến bãi...");
    const simExpire2Res = await fetch(`${baseUrl}/cron/simulate-expire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservation_id: resId2, type: "arrival" }),
    });
    const simExpire2Data = await simExpire2Res.json();
    console.log(`Status HTTP: ${simExpire2Res.status}`, simExpire2Data.success ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");

    // Kiểm tra DB
    const checkRes2 = await query("SELECT status, cancel_reason, deposit_amount FROM reservations WHERE id = $1;", [resId2]);
    const checkSlot2 = await query("SELECT status FROM slots WHERE id = $1;", [slot1.id]);
    const checkAudit2 = await query("SELECT action, note, created_at FROM audit_logs WHERE entity_id = $1 ORDER BY id DESC LIMIT 1;", [resId2]);

    console.log("-> Kết quả kiểm tra Database:");
    console.log(`   • Trạng thái đơn #${resId2}: '${checkRes2.rows[0]?.status}' (Lý do: "${checkRes2.rows[0]?.cancel_reason}")`);
    console.log(`   • Tiền cọc bị phạt: ${Number(checkRes2.rows[0]?.deposit_amount).toLocaleString("vi-VN")}đ`);
    console.log(`   • Trạng thái ô ${slot1.code}: '${checkSlot2.rows[0]?.status}' (Mong đợi: 'available' - XANH)`);
    console.log(`   • Nhật ký audit_logs: [${checkAudit2.rows[0]?.action}] ${checkAudit2.rows[0]?.note}`);

    if (checkRes2.rows[0]?.status !== "forfeited" || checkSlot2.rows[0]?.status !== "available") {
      throw new Error("Kịch bản 2 thất bại!");
    }

    // -----------------------------------------------------------------
    // TEST 4: Kích hoạt trigger cleanup thủ công (/api/cron/trigger-cleanup)
    // -----------------------------------------------------------------
    console.log("\n[TEST 4] Kiểm tra trigger thủ công /api/cron/trigger-cleanup...");
    const cleanupRes = await fetch(`${baseUrl}/cron/trigger-cleanup`, { method: "POST" });
    const cleanupData = await cleanupRes.json();
    console.log(`Status HTTP: ${cleanupRes.status}`, cleanupData.success ? "✅ THÀNH CÔNG" : "❌ THẤT BẠI");
    console.log("-> Kết quả quét:", cleanupData.data);

    console.log("\n=================================================");
    console.log("🎉 BƯỚC 3 ĐÃ TEST PASS 100%! TẤT CẢ QUY TẮC ĐÃ CHUẨN!");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ Lỗi kiểm thử Bước 3:", error);
  } finally {
    server!.close();
    await pool.end();
  }
}

runCronLiveTest();
