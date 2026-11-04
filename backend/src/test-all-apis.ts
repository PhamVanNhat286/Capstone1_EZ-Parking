/**
 * EZ-Space Smart Parking - Comprehensive API Test Suite
 * Automated End-to-End Test for all 22+ API Endpoints
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

interface TestResult {
  name: string;
  method: string;
  endpoint: string;
  status: number;
  expectedStatus: number;
  durationMs: number;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function callApi(
  name: string,
  method: string,
  endpoint: string,
  expectedStatus: number,
  body?: any,
  token?: string
): Promise<{ status: number; data: any; passed: boolean }> {
  const start = Date.now();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const durationMs = Date.now() - start;
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    const passed = res.status === expectedStatus;
    results.push({
      name,
      method,
      endpoint,
      status: res.status,
      expectedStatus,
      durationMs,
      passed,
      error: passed ? undefined : `Expected ${expectedStatus}, got ${res.status}: ${JSON.stringify(data)}`,
      details: data,
    });

    return { status: res.status, data, passed };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      name,
      method,
      endpoint,
      status: 0,
      expectedStatus,
      durationMs,
      passed: false,
      error: err.message,
    });
    return { status: 0, data: null, passed: false };
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("       EZ-SPACE SMART PARKING - COMPREHENSIVE END-TO-END API TEST SUITE        ");
  console.log("================================================================================");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  let authToken = "";
  let testUserId = "";
  let vehicleId = "";
  let targetLotId = 1;
  let targetSlotId: any = null;
  let targetSlotCode = "";
  let reservationId: any = null;
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testEmail = `tester_${uniqueSuffix}@ezspace.vn`;
  const testPhone = `090${uniqueSuffix}`;

  // 1. HEALTH CHECK
  console.log(">>> [1/7] Testing System & Health APIs...");
  await callApi("Kiểm tra Health Check", "GET", "/health", 200);

  // 2. PARKING LOTS & SLOTS
  console.log("\n>>> [2/7] Testing Parking Lots & Slots APIs...");
  const lotsRes = await callApi("Lấy danh sách bãi đỗ xe", "GET", "/lots", 200);
  if (lotsRes.data?.data?.length > 0) {
    targetLotId = lotsRes.data.data[0].id;
  }
  await callApi("Lấy chi tiết bãi đỗ xe", "GET", `/lots/${targetLotId}`, 200);

  const slotsRes = await callApi("Lấy sơ đồ ô đỗ xe của bãi", "GET", `/lots/${targetLotId}/slots`, 200);
  if (slotsRes.data?.data?.length > 0) {
    const availableSlot = slotsRes.data.data.find((s: any) => s.status === "available") || slotsRes.data.data[0];
    targetSlotId = availableSlot.id;
    targetSlotCode = availableSlot.code;
  }

  // 3. AUTHENTICATION & USER PROFILE
  console.log("\n>>> [3/7] Testing Authentication & Profile APIs...");
  const regRes = await callApi(
    "Đăng ký tài khoản khách hàng mới",
    "POST",
    "/auth/register",
    201,
    {
      full_name: `Nguyễn Văn Test ${uniqueSuffix}`,
      email: testEmail,
      phone: testPhone,
      password: "password123",
      license_plate: `43A-${uniqueSuffix.slice(0, 3)}.${uniqueSuffix.slice(3)}`,
      vehicle_type: "SUV",
      vehicle_name: "Mazda CX-5 Test",
    }
  );

  if (regRes.data?.data?.token) {
    authToken = regRes.data.data.token;
    testUserId = regRes.data.data.user?.id;
  } else {
    // Fallback: Login
    const loginRes = await callApi(
      "Đăng nhập tài khoản kiểm thử",
      "POST",
      "/auth/login",
      200,
      { email: "customer@ezspace.vn", password: "password123" }
    );
    authToken = loginRes.data?.data?.token || "";
    testUserId = loginRes.data?.data?.user?.id || "3";
  }

  await callApi("Lấy thông tin hồ sơ tài xế (/me)", "GET", "/auth/me", 200, undefined, authToken);

  // 4. VEHICLES
  console.log("\n>>> [4/7] Testing Vehicles APIs...");
  const vehRes = await callApi("Lấy danh sách xe của tài xế", "GET", "/vehicles", 200, undefined, authToken);
  if (vehRes.data?.data?.length > 0) {
    vehicleId = vehRes.data.data[0].id;
  } else {
    const addVehRes = await callApi(
      "Thêm xe mới cho tài xế",
      "POST",
      "/vehicles",
      201,
      {
        license_plate: `43B-${uniqueSuffix.slice(0, 3)}.${uniqueSuffix.slice(3)}`,
        vehicle_type: "Sedan",
        vehicle_name: "Honda City Test",
        is_primary: true,
      },
      authToken
    );
    vehicleId = addVehRes.data?.data?.id || "1";
  }

  // 5. RESERVATIONS LIFECYCLE (Atomic Hold -> Pay Deposit -> Check Active -> Detail & QR)
  console.log("\n>>> [5/7] Testing Reservation Flow (Hold -> Pay -> QR)...");
  const holdRes = await callApi(
    "Giữ chỗ ô đỗ (Atomic Update chống trùng)",
    "POST",
    "/reservations/hold",
    201,
    {
      parking_lot_id: targetLotId,
      slot_id: targetSlotId,
      vehicle_id: vehicleId,
      estimated_hours: 2,
    },
    authToken
  );

  if (holdRes.data?.data?.reservation_id) {
    reservationId = holdRes.data.data.reservation_id;
  }

  await callApi("Lấy lượt giữ chỗ đang hoạt động", "GET", "/reservations/active", 200, undefined, authToken);

  if (reservationId) {
    await callApi(
      "Thanh toán tiền cọc giữ chỗ (VNPay Demo)",
      "POST",
      `/reservations/${reservationId}/pay-deposit`,
      200,
      { provider: "vnpay", transaction_ref: `TEST-TX-${Date.now()}` },
      authToken
    );

    await callApi(
      "Lấy chi tiết đơn đặt chỗ & mã QR vào bãi",
      "GET",
      `/reservations/${reservationId}`,
      200,
      undefined,
      authToken
    );
  }

  // 6. KIOSK GATE BARRIER (Scan-in -> Sessions -> Stats -> Scan-out)
  console.log("\n>>> [6/7] Testing Kiosk Barrier Operations (Check-in & Check-out)...");
  if (reservationId) {
    await callApi(
      "Kiosk: Quét mã QR tại cổng vào (Scan-In)",
      "POST",
      "/kiosk/scan-in",
      200,
      {
        ticket_code: `EZ-${reservationId}`,
        reservation_id: reservationId,
        parking_lot_id: targetLotId,
      },
      authToken
    );

    await callApi(
      "Kiosk: Lấy danh sách xe đang đỗ trong bãi",
      "GET",
      `/kiosk/sessions?parking_lot_id=${targetLotId}&status=active`,
      200,
      undefined,
      authToken
    );

    await callApi(
      "Kiosk: Lấy thống kê lượt xe ra/vào bãi",
      "GET",
      `/kiosk/stats?parking_lot_id=${targetLotId}`,
      200,
      undefined,
      authToken
    );

    await callApi(
      "Kiosk: Quét mã QR tại cổng ra & Giải phóng ô (Scan-Out)",
      "POST",
      "/kiosk/scan-out",
      200,
      {
        ticket_code: `EZ-${reservationId}`,
        reservation_id: reservationId,
        parking_lot_id: targetLotId,
        slot_code: targetSlotCode,
      },
      authToken
    );
  }

  // 7. CRON WORKER & CANCELLATION & HISTORY
  console.log("\n>>> [7/7] Testing Cron Worker, Cancellation & History...");
  // Test hold and manual release
  const holdForRelease = await callApi(
    "Giữ chỗ ô phụ để kiểm tra hủy",
    "POST",
    "/reservations/hold",
    201,
    {
      parking_lot_id: targetLotId,
      slot_id: targetSlotId,
      vehicle_id: vehicleId,
      estimated_hours: 1,
    },
    authToken
  );

  if (holdForRelease.data?.data?.reservation_id) {
    const relId = holdForRelease.data.data.reservation_id;
    await callApi(
      "Hủy giữ chỗ và trả lại ô trống (/release)",
      "POST",
      `/reservations/${relId}/release`,
      200,
      undefined,
      authToken
    );
  }

  await callApi("Kiểm tra trạng thái Cron Worker", "GET", "/cron/status", 200);
  await callApi("Kích hoạt dọn dẹp hết hạn tức thì (Manual Trigger)", "POST", "/cron/trigger-cleanup", 200);

  await callApi("Lấy danh sách tất cả lịch sử đặt chỗ", "GET", "/reservations?status=all", 200, undefined, authToken);
  await callApi("Lấy danh sách lịch sử đã hoàn thành", "GET", "/reservations?status=completed", 200, undefined, authToken);

  // SUMMARY REPORT
  console.log("\n================================================================================");
  console.log("                               KẾT QUẢ KIỂM THỬ API                             ");
  console.log("================================================================================");

  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    const mark = r.passed ? " [PASSED] " : " [FAILED] ";
    const methodPad = r.method.padEnd(5);
    const timePad = `${r.durationMs}ms`.padStart(6);
    console.log(`${mark} ${methodPad} ${r.endpoint.padEnd(45)} Status: ${r.status} (${timePad}) - ${r.name}`);
    if (r.passed) passedCount++;
    else {
      failedCount++;
      if (r.error) console.log(`        --> Lỗi: ${r.error}`);
    }
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`TỔNG CỘNG: ${results.length} API endpoints`);
  console.log(`THÀNH CÔNG: ${passedCount} / ${results.length} (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log(`THẤT BẠI:   ${failedCount} / ${results.length}`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test runner gặp lỗi ngoài ý muốn:", err);
  process.exit(1);
});
