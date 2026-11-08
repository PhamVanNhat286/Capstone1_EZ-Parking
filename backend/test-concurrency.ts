/**
 * EZ-Space Smart Parking - Concurrency & Race Condition Verification Script
 * Kịch bản kiểm thử tranh chấp đồng thời trên ô đỗ
 *
 * Chạy lệnh: npx tsx test-concurrency.ts
 */

import { pool } from "./src/config/db";

const API_URL = "http://localhost:5000/api/reservations/hold";
const LOT_ID = 1;
const SLOT_ID = 1; // Ô A-01 của Bãi 1
const TOTAL_CONCURRENT_REQUESTS = 20;

async function resetSlotForTesting() {
  console.log(`[Setup] Đang chuẩn bị dữ liệu: Đưa ô đỗ id=${SLOT_ID} về trạng thái 'available'...`);
  await pool.query(
    "UPDATE reservations SET status = 'cancelled', cancel_reason = 'Dọn dẹp trước khi test' WHERE slot_id = $1 AND status IN ('holding', 'paid')",
    [SLOT_ID]
  );
  await pool.query(
    "UPDATE slots SET status = 'available', updated_at = NOW() WHERE id = $1",
    [SLOT_ID]
  );
}

// Cách 1: Test qua HTTP API Endpoint (nếu Backend đang chạy)
async function testViaHttp() {
  console.log(`\n🚀 [HTTP TEST] Bắn đồng loạt ${TOTAL_CONCURRENT_REQUESTS} HTTP requests tới ${API_URL}...`);

  const requests = Array.from({ length: TOTAL_CONCURRENT_REQUESTS }, (_, i) => {
    const userId = (i % 4) + 1;
    return fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parking_lot_id: LOT_ID,
        slot_id: SLOT_ID,
        user_id: userId,
        estimated_hours: 2,
        hold_duration_minutes: 10,
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        return { status: res.status, body, worker: `Client_${i + 1} (User ${userId})` };
      })
      .catch((err) => ({ status: 0, error: err.message, worker: `Client_${i + 1}` }));
  });

  const results = await Promise.all(requests);
  return results;
}

// Cách 2: Test trực tiếp tầng Database Atomic Update (chứng minh tính toàn vẹn của ACID)
async function testViaDbAtomic() {
  console.log(`\n⚙️ [DB ATOMIC TEST] Bắn đồng thời ${TOTAL_CONCURRENT_REQUESTS} giao dịch DB vào slots id=${SLOT_ID}...`);

  const tasks = Array.from({ length: TOTAL_CONCURRENT_REQUESTS }, async (_, i) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(`
        UPDATE slots
        SET status = 'holding', updated_at = NOW()
        WHERE id = $1 AND parking_lot_id = $2 AND status = 'available' AND is_active = TRUE
        RETURNING id, code;
      `, [SLOT_ID, LOT_ID]);

      if (res.rowCount === 1) {
        await client.query(`
          INSERT INTO reservations (user_id, parking_lot_id, slot_id, vehicle_id, start_time, expected_end_time, status, hold_expires_at, hourly_rate, deposit_amount)
          VALUES ($1, $2, $3, 1, NOW(), NOW() + INTERVAL '2 hours', 'holding', NOW() + INTERVAL '10 minutes', 20000, 50000)
        `, [(i % 4) + 1, LOT_ID, SLOT_ID]);
        await client.query("COMMIT");
        return { status: 201, worker: `Worker_${i + 1}` };
      } else {
        await client.query("ROLLBACK");
        return { status: 409, worker: `Worker_${i + 1}` };
      }
    } catch (err: any) {
      await client.query("ROLLBACK");
      return { status: 500, worker: `Worker_${i + 1}`, error: err.message };
    } finally {
      client.release();
    }
  });

  return await Promise.all(tasks);
}

async function main() {
  try {
    await resetSlotForTesting();

    // Thử kiểm tra xem backend HTTP server có đang bật không
    let useHttp = false;
    try {
      const ping = await fetch("http://localhost:5000/api/health", { signal: AbortSignal.timeout(1500) });
      if (ping.ok) useHttp = true;
    } catch {}

    let results;
    if (useHttp) {
      console.log("🟢 Đã kết nối được tới Backend (http://localhost:5000)");
      results = await testViaHttp();
    } else {
      console.log("🟡 Backend HTTP server chưa bật -> Chạy kiểm thử trực tiếp tầng Cơ sở dữ liệu PostgreSQL");
      results = await testViaDbAtomic();
    }

    const successList = results.filter((r) => r.status === 201);
    const conflictList = results.filter((r) => r.status === 409);
    const otherList = results.filter((r) => r.status !== 201 && r.status !== 409);

    console.log("\n=============================================================");
    console.log("            BÁO CÁO KẾT QUẢ KIỂM THỬ TRANH CHẤP ĐỒNG THỜI     ");
    console.log("=============================================================");
    console.log(`Tổng số yêu cầu đồng thời  : ${TOTAL_CONCURRENT_REQUESTS}`);
    console.log(`✅ Giữ chỗ thành công (HTTP 201): ${successList.length} (${successList[0]?.worker || "N/A"})`);
    console.log(`⛔ Bị chặn tranh chấp (HTTP 409): ${conflictList.length}`);
    if (otherList.length > 0) {
      console.log(`⚠️ Lỗi khác: ${otherList.length}`, otherList);
    }
    console.log("-------------------------------------------------------------");

    // Kiểm tra số lượng bản ghi thực tế trong database
    const dbCountRes = await pool.query(
      "SELECT COUNT(*) FROM reservations WHERE slot_id = $1 AND status = 'holding'",
      [SLOT_ID]
    );
    const actualHoldingCount = Number(dbCountRes.rows[0].count);
    console.log(`📊 Số đơn 'holding' thực tế trong DB: ${actualHoldingCount}`);

    if (successList.length === 1 && actualHoldingCount === 1) {
      console.log("🎉 KẾT LUẬN: CHỨNG MINH THÀNH CÔNG! Không thể xảy ra trùng lặp đặt chỗ!");
    } else {
      console.log("❌ KẾT LUẬN: THẤT BẠI - Phát hiện xung đột dữ liệu.");
    }
    console.log("=============================================================\n");
  } catch (error) {
    console.error("Lỗi khi chạy script kiểm thử:", error);
  } finally {
    await pool.end();
  }
}

main();
