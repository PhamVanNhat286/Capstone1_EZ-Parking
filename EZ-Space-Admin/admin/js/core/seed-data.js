/* =============================================================
   EZ-SPACE ADMIN - js/core/seed-data.js
   Dữ liệu chuẩn từ database/schema.sql & database/seed.sql của App
   Tự động đồng bộ và cung cấp dữ liệu cho Admin trên mọi môi trường
   ============================================================= */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.EZ_SEED_STORE = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STORAGE_KEY = 'ez_space_admin_seed_state_v2';

  function fmtVn(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return d.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  }

  function isoOffset(minutesOffset) {
    return fmtVn(new Date(Date.now() + minutesOffset * 60 * 1000));
  }

  function buildInitialDb() {
    const now0 = isoOffset(0);
    const minus4m = isoOffset(-4);
    const minus5m = isoOffset(-5);
    const plus5m = isoOffset(5);
    const plus8m = isoOffset(8);
    const plus15m = isoOffset(15);
    const plus2h = isoOffset(120);
    const plus3h = isoOffset(180);
    const minus1d = isoOffset(-1440);
    const minus1dPlus10m = isoOffset(-1430);
    const minus1dPlus20m = isoOffset(-1420);
    const minus22h = isoOffset(-1320);

    // 1. NGUOI DUNG (USERS) - seed.sql lines 28-33
    const users = [
      {
        id: 1,
        full_name: 'Admin He Thong',
        email: 'admin@ezspace.vn',
        phone: '0905000111',
        role: 'admin',
        status: 'active',
        avatar_url: null,
        created_at: minus1d,
        updated_at: now0
      },
      {
        id: 2,
        full_name: 'Tran Van Quan Ly',
        email: 'manager@ezspace.vn',
        phone: '0905987654',
        role: 'manager',
        status: 'active',
        avatar_url: null,
        created_at: minus1d,
        updated_at: now0
      },
      {
        id: 3,
        full_name: 'Nguyen Van A',
        email: 'customer@ezspace.vn',
        phone: '0905123456',
        role: 'customer',
        status: 'active',
        avatar_url: null,
        created_at: minus1d,
        updated_at: now0
      },
      {
        id: 4,
        full_name: 'Le Thi B',
        email: 'lethib@gmail.com',
        phone: '0905222333',
        role: 'customer',
        status: 'active',
        avatar_url: null,
        created_at: minus1d,
        updated_at: now0
      }
    ];

    // 2. XE CUA KHACH HANG (VEHICLES) - seed.sql lines 41-45
    const vehicles = [
      { id: 1, user_id: 3, license_plate: '43A-123.45', vehicle_name: 'Toyota Fortuner', vehicle_type: 'SUV', is_default: true, created_at: minus1d, updated_at: minus1d },
      { id: 2, user_id: 3, license_plate: '43A-678.90', vehicle_name: 'Honda Civic', vehicle_type: 'Sedan', is_default: false, created_at: minus1d, updated_at: minus1d },
      { id: 3, user_id: 3, license_plate: '43E-999.88', vehicle_name: 'VinFast VF8', vehicle_type: 'EV', is_default: false, created_at: minus1d, updated_at: minus1d },
      { id: 4, user_id: 4, license_plate: '43A-555.66', vehicle_name: 'Mazda CX-5', vehicle_type: 'SUV', is_default: true, created_at: minus1d, updated_at: minus1d }
    ];

    // 3. BAI DO XE (PARKING_LOTS) - seed.sql lines 53-56
    const parking_lots = [
      {
        id: 1,
        name: 'Bai Hai Chau A',
        address: '15 Le Duan, Hai Chau, Da Nang',
        latitude: 16.0718,
        longitude: 108.2222,
        description: 'Bai do xe trung tam gan cau Song Han, co mai che va tram sac EV.',
        open_time: '00:00:00',
        close_time: '23:59:59',
        capacity: 80,
        status: 'active',
        approved_by: 1,
        approved_at: now0,
        created_at: minus1d,
        updated_at: now0
      },
      {
        id: 2,
        name: 'Bai Cau Rong',
        address: 'Son Tra, Da Nang (Gan chan Cau Rong)',
        latitude: 16.061,
        longitude: 108.227,
        description: 'Bai do xe thuan tien ngam Cau Rong phun lua cuoi tuan.',
        open_time: '06:00:00',
        close_time: '23:00:00',
        capacity: 120,
        status: 'active',
        approved_by: 1,
        approved_at: now0,
        created_at: minus1d,
        updated_at: now0
      },
      {
        id: 3,
        name: 'San bay Da Nang T1',
        address: 'San bay Quoc te Da Nang, Hai Chau',
        latitude: 16.0538,
        longitude: 108.1995,
        description: 'Bai do dai han gan ga quoc noi T1, an ninh 24/7.',
        open_time: '00:00:00',
        close_time: '23:59:59',
        capacity: 340,
        status: 'active',
        approved_by: 1,
        approved_at: now0,
        created_at: minus1d,
        updated_at: now0
      }
    ];

    // Loai xe duoc phep vao tung bai - seed.sql lines 61-64
    const parking_lot_vehicle_types = [
      { id: 1, parking_lot_id: 1, vehicle_type: 'Sedan' },
      { id: 2, parking_lot_id: 1, vehicle_type: 'SUV' },
      { id: 3, parking_lot_id: 1, vehicle_type: 'EV' },
      { id: 4, parking_lot_id: 2, vehicle_type: 'Sedan' },
      { id: 5, parking_lot_id: 2, vehicle_type: 'SUV' },
      { id: 6, parking_lot_id: 3, vehicle_type: 'Sedan' },
      { id: 7, parking_lot_id: 3, vehicle_type: 'SUV' },
      { id: 8, parking_lot_id: 3, vehicle_type: 'EV' }
    ];

    // Phan cong quan ly bai xe - seed.sql lines 67-69
    const parking_lot_managers = [
      { id: 1, parking_lot_id: 1, manager_id: 2, assigned_at: minus1d },
      { id: 2, parking_lot_id: 2, manager_id: 2, assigned_at: minus1d }
    ];

    // 4. O DO XE (SLOTS) - seed.sql lines 75-143 (55 slots)
    const rawSlots = [
      // Bai Hai Chau A (20 slots)
      [1, 'A-01', 0, 0, 'standard', 'available', true],
      [1, 'A-02', 0, 1, 'standard', 'available', true],
      [1, 'A-03', 0, 2, 'standard', 'holding', true],
      [1, 'A-04', 0, 3, 'large', 'occupied', true],
      [1, 'A-05', 0, 4, 'ev_charging', 'available', true],
      [1, 'A-06', 1, 0, 'standard', 'available', true],
      [1, 'A-07', 1, 1, 'large', 'available', true],
      [1, 'A-08', 1, 2, 'standard', 'occupied', true],
      [1, 'A-09', 1, 3, 'standard', 'available', true],
      [1, 'A-10', 1, 4, 'ev_charging', 'occupied', true],
      [1, 'B-01', 2, 0, 'standard', 'available', true],
      [1, 'B-02', 2, 1, 'standard', 'available', true],
      [1, 'B-03', 2, 2, 'large', 'available', true],
      [1, 'B-04', 2, 3, 'standard', 'holding', true],
      [1, 'B-05', 2, 4, 'ev_charging', 'available', true],
      [1, 'B-06', 3, 0, 'disabled', 'available', true],
      [1, 'B-07', 3, 1, 'standard', 'available', true],
      [1, 'B-08', 3, 2, 'standard', 'available', true],
      [1, 'B-09', 3, 3, 'large', 'occupied', true],
      [1, 'B-10', 3, 4, 'standard', 'available', true],
      // Bai Cau Rong (15 slots)
      [2, 'CR-01', 0, 0, 'standard', 'available', true],
      [2, 'CR-02', 0, 1, 'standard', 'available', true],
      [2, 'CR-03', 0, 2, 'standard', 'available', true],
      [2, 'CR-04', 0, 3, 'standard', 'available', true],
      [2, 'CR-05', 0, 4, 'standard', 'available', true],
      [2, 'CR-06', 1, 0, 'large', 'available', true],
      [2, 'CR-07', 1, 1, 'large', 'available', true],
      [2, 'CR-08', 1, 2, 'large', 'available', true],
      [2, 'CR-09', 1, 3, 'large', 'available', true],
      [2, 'CR-10', 1, 4, 'standard', 'occupied', true],
      [2, 'CR-11', 2, 0, 'standard', 'occupied', true],
      [2, 'CR-12', 2, 1, 'large', 'occupied', true],
      [2, 'CR-13', 2, 2, 'standard', 'occupied', true],
      [2, 'CR-14', 2, 3, 'standard', 'holding', true],
      [2, 'CR-15', 2, 4, 'large', 'occupied', true],
      // San bay Da Nang T1 (20 slots)
      [3, 'SB-01', 0, 0, 'standard', 'available', true],
      [3, 'SB-02', 0, 1, 'standard', 'available', true],
      [3, 'SB-03', 0, 2, 'standard', 'available', true],
      [3, 'SB-04', 0, 3, 'standard', 'available', true],
      [3, 'SB-05', 0, 4, 'standard', 'available', true],
      [3, 'SB-06', 1, 0, 'large', 'available', true],
      [3, 'SB-07', 1, 1, 'large', 'available', true],
      [3, 'SB-08', 1, 2, 'large', 'available', true],
      [3, 'SB-09', 1, 3, 'large', 'available', true],
      [3, 'SB-10', 1, 4, 'standard', 'occupied', true],
      [3, 'SB-11', 2, 0, 'ev_charging', 'available', true],
      [3, 'SB-12', 2, 1, 'ev_charging', 'available', true],
      [3, 'SB-13', 2, 2, 'standard', 'available', true],
      [3, 'SB-14', 2, 3, 'standard', 'available', true],
      [3, 'SB-15', 2, 4, 'large', 'occupied', true],
      [3, 'SB-16', 3, 0, 'standard', 'available', true],
      [3, 'SB-17', 3, 1, 'standard', 'available', true],
      [3, 'SB-18', 3, 2, 'standard', 'available', true],
      [3, 'SB-19', 3, 3, 'ev_charging', 'occupied', true],
      [3, 'SB-20', 3, 4, 'standard', 'holding', true]
    ];

    const slots = rawSlots.map((r, idx) => ({
      id: idx + 1,
      parking_lot_id: r[0],
      code: r[1],
      row_index: r[2],
      col_index: r[3],
      slot_type: r[4],
      status: r[5],
      is_active: r[6],
      created_at: minus1d,
      updated_at: now0
    }));

    // 5. BANG GIA THEO GIO (PRICING_RULES) - seed.sql lines 148-153
    const pricing_rules = [
      { id: 1, parking_lot_id: 1, name: 'Gia tieu chuan ban ngay', start_time: '06:00:00', end_time: '18:00:00', hourly_rate: 20000, surcharge: 0, effective_from: '2026-01-01', effective_to: '2026-12-31', created_at: minus1d, updated_at: minus1d },
      { id: 2, parking_lot_id: 1, name: 'Gio cao diem toi', start_time: '18:00:00', end_time: '22:00:00', hourly_rate: 20000, surcharge: 5000, effective_from: '2026-01-01', effective_to: '2026-12-31', created_at: minus1d, updated_at: minus1d },
      { id: 3, parking_lot_id: 1, name: 'Gia qua dem', start_time: '22:00:00', end_time: '06:00:00', hourly_rate: 15000, surcharge: 0, effective_from: '2026-01-01', effective_to: '2026-12-31', created_at: minus1d, updated_at: minus1d },
      { id: 4, parking_lot_id: 2, name: 'Gia dong hang ngay', start_time: '06:00:00', end_time: '23:00:00', hourly_rate: 15000, surcharge: 0, effective_from: '2026-01-01', effective_to: '2026-12-31', created_at: minus1d, updated_at: minus1d },
      { id: 5, parking_lot_id: 3, name: 'Gia dai han san bay', start_time: '00:00:00', end_time: '23:59:59', hourly_rate: 12000, surcharge: 0, effective_from: '2026-01-01', effective_to: '2026-12-31', created_at: minus1d, updated_at: minus1d }
    ];

    // 6. DON DAT CHO MAU (RESERVATIONS) - seed.sql lines 160-218
    const reservations = [
      {
        id: 1,
        user_id: 3,
        parking_lot_id: 1,
        slot_id: 3,
        vehicle_id: 1,
        start_time: now0,
        expected_end_time: plus2h,
        status: 'holding',
        hold_expires_at: plus8m,
        arrival_expires_at: null,
        hourly_rate: 20000,
        deposit_amount: 20000,
        total_amount: null,
        cancelled_at: null,
        cancel_reason: null,
        created_at: now0,
        updated_at: now0
      },
      {
        id: 2,
        user_id: 3,
        parking_lot_id: 1,
        slot_id: 4,
        vehicle_id: 2,
        start_time: minus5m,
        expected_end_time: plus3h,
        status: 'paid',
        hold_expires_at: plus5m,
        arrival_expires_at: plus15m,
        hourly_rate: 20000,
        deposit_amount: 20000,
        total_amount: null,
        cancelled_at: null,
        cancel_reason: null,
        created_at: minus5m,
        updated_at: minus4m
      },
      {
        id: 3,
        user_id: 3,
        parking_lot_id: 1,
        slot_id: 1,
        vehicle_id: 1,
        start_time: minus1d,
        expected_end_time: minus22h,
        status: 'completed',
        hold_expires_at: minus1d,
        arrival_expires_at: minus1dPlus20m,
        hourly_rate: 20000,
        deposit_amount: 20000,
        total_amount: 40000,
        cancelled_at: null,
        cancel_reason: null,
        created_at: minus1d,
        updated_at: minus22h
      }
    ];

    // THANH TOAN (PAYMENTS) - seed.sql lines 186-223
    const payments = [
      {
        id: 1,
        reservation_id: 2,
        provider: 'vnpay',
        transaction_ref: 'VNP_TRANS_20261013001',
        payment_type: 'deposit',
        amount: 20000,
        status: 'success',
        response_code: '00',
        raw_ipn_payload: { vnp_ResponseCode: '00', vnp_TransactionNo: '14589230', vnp_BankCode: 'NCB', vnp_Amount: '2000000' },
        ipn_received_at: minus4m,
        paid_at: minus4m,
        created_at: minus4m,
        updated_at: minus4m
      },
      {
        id: 2,
        reservation_id: 3,
        provider: 'vnpay',
        transaction_ref: 'VNP_DEP_PREV01',
        payment_type: 'deposit',
        amount: 20000,
        status: 'success',
        response_code: '00',
        raw_ipn_payload: null,
        ipn_received_at: minus1d,
        paid_at: minus1d,
        created_at: minus1d,
        updated_at: minus1d
      },
      {
        id: 3,
        reservation_id: 3,
        provider: 'momo',
        transaction_ref: 'MOMO_FINAL_PREV01',
        payment_type: 'final',
        amount: 20000,
        status: 'success',
        response_code: '00',
        raw_ipn_payload: null,
        ipn_received_at: minus22h,
        paid_at: minus22h,
        created_at: minus22h,
        updated_at: minus22h
      }
    ];

    // VE QR (QR_TICKETS) - seed.sql lines 197-205
    const qr_tickets = [
      {
        id: 1,
        reservation_id: 2,
        token_hash: '662e84b14e0ef3133b60d0b8d72610c558d9170f2e1f1c7151f0a871be61a904',
        status: 'active',
        issued_at: minus4m,
        used_at: null,
        expires_at: plus15m,
        created_at: minus4m
      }
    ];

    // PHIEN DO XE THUC TE (PARKING_SESSIONS) - seed.sql lines 226-233
    const parking_sessions = [
      {
        id: 1,
        reservation_id: 3,
        check_in_at: minus1dPlus10m,
        check_out_at: minus22h,
        checked_in_by: 2,
        checked_out_by: 2,
        final_amount: 40000,
        status: 'completed',
        created_at: minus1dPlus10m,
        updated_at: minus22h
      }
    ];

    // 7. AUDIT LOGS MAU - seed.sql lines 240-242
    const audit_logs = [
      {
        id: 1,
        user_id: 1,
        parking_lot_id: 1,
        action: 'APPROVE_LOT',
        entity_type: 'parking_lots',
        entity_id: 1,
        old_value: { status: 'pending' },
        new_value: { status: 'active', approved_by: 1 },
        note: 'Admin duyet mo bai Hai Chau A',
        created_at: minus1d
      },
      {
        id: 2,
        user_id: 2,
        parking_lot_id: 1,
        action: 'UPDATE_SLOT',
        entity_type: 'slots',
        entity_id: 4,
        old_value: { code: 'A-04', status: 'available' },
        new_value: { code: 'A-04', status: 'occupied' },
        note: 'Quan ly danh dau o A-04 thanh occupied',
        created_at: minus4m
      }
    ];

    const manager_history = [];
    const email_otps = [];
    const chat_messages = [];

    return {
      users,
      vehicles,
      parking_lots,
      parking_lot_vehicle_types,
      parking_lot_managers,
      slots,
      pricing_rules,
      reservations,
      payments,
      qr_tickets,
      parking_sessions,
      audit_logs,
      manager_history,
      email_otps,
      chat_messages
    };
  }

  let db = buildInitialDb();

  function loadPersistedMutations() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.lotStatus && typeof saved.lotStatus === 'object') {
        for (const lot of db.parking_lots) {
          if (saved.lotStatus[lot.id]) lot.status = saved.lotStatus[lot.id];
        }
      }
      if (saved.userStatus && typeof saved.userStatus === 'object') {
        for (const u of db.users) {
          if (saved.userStatus[u.id]) u.status = saved.userStatus[u.id];
        }
      }
      if (Array.isArray(saved.extraLogs)) {
        for (const log of saved.extraLogs) {
          if (!db.audit_logs.some(x => x.id === log.id)) {
            db.audit_logs.push(log);
          }
        }
      }
    } catch (_) {}
  }

  function savePersistedMutations(extraLog) {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : { lotStatus: {}, userStatus: {}, extraLogs: [] };
      for (const lot of db.parking_lots) saved.lotStatus[lot.id] = lot.status;
      for (const u of db.users) saved.userStatus[u.id] = u.status;
      if (extraLog) saved.extraLogs.push(extraLog);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (_) {}
  }

  loadPersistedMutations();

  function getRangeBounds(kind = 'all') {
    const now = new Date();
    const vnTodayStr = fmtVn(now).slice(0, 10);
    let fromStr = '2000-01-01 00:00:00';
    if (kind === 'today') {
      fromStr = vnTodayStr + ' 00:00:00';
    } else if (kind === 'week') {
      fromStr = fmtVn(new Date(now.getTime() - 6 * 86400000)).slice(0, 10) + ' 00:00:00';
    } else if (kind === 'month') {
      fromStr = vnTodayStr.slice(0, 8) + '01 00:00:00';
    }
    const toStr = fmtVn(new Date(now.getTime() + 60000));
    return { from: fromStr, to: toStr };
  }

  function inRange(ts, range) {
    const s = String(ts || '');
    return s >= range.from && s <= range.to;
  }

  function summary() {
    const u = db.users;
    const l = db.parking_lots;
    const s = db.slots;
    const ps = db.parking_sessions;
    const qt = db.qr_tickets;
    const v = db.vehicles;
    const cm = db.chat_messages;

    return {
      users: {
        total: u.length,
        customers: u.filter(x => x.role === 'customer').length,
        managers: u.filter(x => x.role === 'manager').length,
        admins: u.filter(x => x.role === 'admin').length,
        active: u.filter(x => x.status === 'active').length,
        inactive: u.filter(x => x.status === 'inactive').length,
        banned: u.filter(x => x.status === 'banned').length
      },
      lots: {
        total: l.length,
        active: l.filter(x => x.status === 'active').length,
        pending: l.filter(x => x.status === 'pending').length,
        inactive: l.filter(x => x.status === 'inactive').length,
        rejected: l.filter(x => x.status === 'rejected').length,
        capacity: l.reduce((sum, x) => sum + Number(x.capacity || 0), 0)
      },
      slots: {
        total: s.length,
        available: s.filter(x => x.status === 'available' && x.is_active).length,
        holding: s.filter(x => x.status === 'holding' && x.is_active).length,
        occupied: s.filter(x => x.status === 'occupied' && x.is_active).length,
        unavailable: s.filter(x => x.status === 'unavailable' || !x.is_active).length,
        standard: s.filter(x => x.slot_type === 'standard').length,
        ev_charging: s.filter(x => x.slot_type === 'ev_charging').length,
        large: s.filter(x => x.slot_type === 'large').length,
        disabled: s.filter(x => x.slot_type === 'disabled').length
      },
      sessions: {
        total: ps.length,
        active: ps.filter(x => x.status === 'active').length,
        completed: ps.filter(x => x.status === 'completed').length,
        abandoned: ps.filter(x => x.status === 'abandoned').length
      },
      tickets: {
        total: qt.length,
        active: qt.filter(x => x.status === 'active').length,
        used: qt.filter(x => x.status === 'used').length,
        expired: qt.filter(x => x.status === 'expired').length,
        cancelled: qt.filter(x => x.status === 'cancelled').length
      },
      vehicles: {
        total: v.length,
        sedan: v.filter(x => x.vehicle_type === 'Sedan').length,
        suv: v.filter(x => x.vehicle_type === 'SUV').length,
        ev: v.filter(x => x.vehicle_type === 'EV').length
      },
      chat: {
        total: cm.length,
        user_msgs: cm.filter(x => x.role === 'user').length,
        ai_msgs: cm.filter(x => x.role === 'ai').length
      },
      server_time: fmtVn(new Date())
    };
  }

  function dashboard(params = {}) {
    const range = getRangeBounds(params.range || 'all');
    const resInRange = db.reservations.filter(r => inRange(r.created_at, range));
    const payInRange = db.payments.filter(p => inRange(p.paid_at, range));

    const books = {
      total: resInRange.length,
      holding: resInRange.filter(r => r.status === 'holding').length,
      paid: resInRange.filter(r => r.status === 'paid').length,
      entered: resInRange.filter(r => r.status === 'entered').length,
      completed: resInRange.filter(r => r.status === 'completed').length,
      cancelled: resInRange.filter(r => r.status === 'cancelled').length,
      forfeited: resInRange.filter(r => r.status === 'forfeited').length,
      refunded: resInRange.filter(r => r.status === 'refunded').length
    };

    const deposits = payInRange
      .filter(p => p.status === 'success' && p.payment_type === 'deposit')
      .reduce((s, p) => s + Number(p.amount), 0);
    const finals = payInRange
      .filter(p => p.status === 'success' && p.payment_type === 'final')
      .reduce((s, p) => s + Number(p.amount), 0);
    const refunds = payInRange
      .filter(p => p.payment_type === 'refund' && ['success', 'refunded'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount), 0);

    const payments = {
      transactions: payInRange.length,
      received: deposits + finals,
      deposits,
      finals,
      refunds,
      successful: payInRange.filter(p => p.status === 'success').length
    };

    const hourMap = new Map();
    for (const r of resInRange) {
      const hr = Number(String(r.created_at).slice(11, 13)) || 0;
      const key = `${hr}:${r.status}`;
      hourMap.set(key, { hour: hr, status: r.status, amount: (hourMap.get(key)?.amount || 0) + 1 });
    }
    const hourly = [...hourMap.values()].sort((a, b) => a.hour - b.hour);

    const recent = [...db.reservations]
      .sort((a, b) => b.id - a.id)
      .slice(0, 12)
      .map(r => {
        const u = db.users.find(x => x.id === r.user_id) || {};
        const l = db.parking_lots.find(x => x.id === r.parking_lot_id) || {};
        const s = db.slots.find(x => x.id === r.slot_id) || {};
        const v = db.vehicles.find(x => x.id === r.vehicle_id) || {};
        return {
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          start_time: r.start_time,
          expected_end_time: r.expected_end_time,
          deposit_amount: r.deposit_amount,
          total_amount: r.total_amount,
          lot_name: l.name,
          customer: u.full_name,
          slot_code: s.code,
          license_plate: v.license_plate,
          vehicle_type: v.vehicle_type
        };
      });

    const pending = db.parking_lots
      .filter(l => l.status === 'pending')
      .map(l => {
        const mgrs = db.parking_lot_managers
          .filter(m => m.parking_lot_id === l.id)
          .map(m => db.users.find(u => u.id === m.manager_id)?.full_name)
          .filter(Boolean)
          .join(', ');
        return {
          id: l.id,
          name: l.name,
          address: l.address,
          capacity: l.capacity,
          open_time: l.open_time,
          close_time: l.close_time,
          created_at: l.created_at,
          managers: mgrs
        };
      });

    const logs = [...db.audit_logs]
      .sort((a, b) => b.id - a.id)
      .slice(0, 8)
      .map(a => ({
        id: a.id,
        action: a.action,
        note: a.note,
        created_at: a.created_at,
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        actor: db.users.find(u => u.id === a.user_id)?.full_name || 'He thong',
        lot_name: db.parking_lots.find(l => l.id === a.parking_lot_id)?.name || null
      }));

    return { range, books, payments, hourly, recent, pending, logs };
  }

  function lots() {
    const order = { pending: 1, active: 2, inactive: 3, rejected: 4 };
    const items = [...db.parking_lots]
      .sort((a, b) => (order[a.status] || 5) - (order[b.status] || 5) || b.id - a.id)
      .map(l => {
        const lotSlots = db.slots.filter(s => s.parking_lot_id === l.id);
        const lotPrices = db.pricing_rules.filter(p => p.parking_lot_id === l.id).map(p => Number(p.hourly_rate));
        const mgrs = db.parking_lot_managers
          .filter(m => m.parking_lot_id === l.id)
          .map(m => {
            const u = db.users.find(x => x.id === m.manager_id);
            return u ? `${u.full_name} (${u.email})` : null;
          })
          .filter(Boolean)
          .join(', ');
        const vTypes = db.parking_lot_vehicle_types
          .filter(v => v.parking_lot_id === l.id)
          .map(v => v.vehicle_type)
          .join(', ');
        return {
          ...l,
          approver_name: db.users.find(u => u.id === l.approved_by)?.full_name || null,
          managers: mgrs || null,
          vehicle_types: vTypes || null,
          slot_total: lotSlots.length,
          slot_available: lotSlots.filter(s => s.status === 'available' && s.is_active).length,
          slot_occupied: lotSlots.filter(s => s.status === 'occupied' && s.is_active).length,
          slot_holding: lotSlots.filter(s => s.status === 'holding' && s.is_active).length,
          slot_unavailable: lotSlots.filter(s => s.status === 'unavailable' || !s.is_active).length,
          min_rate: lotPrices.length ? Math.min(...lotPrices) : null,
          max_rate: lotPrices.length ? Math.max(...lotPrices) : null,
          reservations: db.reservations.filter(r => r.parking_lot_id === l.id).length
        };
      });
    return { items };
  }

  function lot(params = {}) {
    const id = Number(params.id);
    const l = db.parking_lots.find(x => x.id === id);
    if (!l) throw Object.assign(new Error('Không tìm thấy bãi đỗ xe.'), { status: 404 });
    const resCounts = {};
    for (const r of db.reservations.filter(x => x.parking_lot_id === id)) {
      resCounts[r.status] = (resCounts[r.status] || 0) + 1;
    }
    return {
      lot: {
        ...l,
        approver_name: db.users.find(u => u.id === l.approved_by)?.full_name || null
      },
      slots: db.slots
        .filter(s => s.parking_lot_id === id)
        .sort((a, b) => a.row_index - b.row_index || a.col_index - b.col_index),
      pricing: db.pricing_rules.filter(p => p.parking_lot_id === id),
      managers: db.parking_lot_managers
        .filter(m => m.parking_lot_id === id)
        .map(m => {
          const u = db.users.find(x => x.id === m.manager_id) || {};
          return { id: u.id, full_name: u.full_name, email: u.email, phone: u.phone, assigned_at: m.assigned_at };
        }),
      vehicles: db.parking_lot_vehicle_types
        .filter(v => v.parking_lot_id === id)
        .map(v => ({ vehicle_type: v.vehicle_type })),
      reservations: Object.entries(resCounts).map(([status, amount]) => ({ status, amount }))
    };
  }

  function lotStatus(input = {}) {
    const id = Number(input.id);
    const to = String(input.status || '').trim();
    const reason = String(input.reason || '').trim();
    if (!['active', 'inactive', 'rejected', 'pending'].includes(to)) {
      throw new Error('Trạng thái bãi không hợp lệ.');
    }
    if (['rejected', 'inactive'].includes(to) && reason.length < 3) {
      throw new Error('Cần nhập lý do từ chối hoặc tạm ngừng (ít nhất 3 ký tự).');
    }
    const target = db.parking_lots.find(x => x.id === id);
    if (!target) throw Object.assign(new Error('Không tìm thấy bãi đỗ xe.'), { status: 404 });
    const old = { id: target.id, name: target.name, status: target.status, approved_by: target.approved_by, approved_at: target.approved_at };
    target.status = to;
    if (to === 'active') {
      target.approved_by = 1;
      target.approved_at = fmtVn(new Date());
    }
    target.updated_at = fmtVn(new Date());
    const actionCode = old.status === 'pending' && to === 'active' ? 'APPROVE_LOT' : 'LOT_STATUS_CHANGED';
    const newLog = {
      id: db.audit_logs.length + 1,
      user_id: 1,
      parking_lot_id: id,
      action: actionCode,
      entity_type: 'parking_lots',
      entity_id: id,
      old_value: old,
      new_value: { id: target.id, name: target.name, status: target.status, approved_by: target.approved_by, approved_at: target.approved_at },
      note: reason || (actionCode === 'APPROVE_LOT' ? `Admin duyet mo bai ${target.name}` : `Cap nhat trang thai bai ${target.name} sang ${to}`),
      created_at: fmtVn(new Date())
    };
    db.audit_logs.push(newLog);
    savePersistedMutations(newLog);
    return { ok: true, item: target };
  }

  function users() {
    const items = db.users.map(u => ({
      ...u,
      vehicles: db.vehicles.filter(v => v.user_id === u.id).length,
      reservations: db.reservations.filter(r => r.user_id === u.id).length,
      lots: db.parking_lot_managers.filter(m => m.manager_id === u.id).length
    }));
    return { items };
  }

  function user(params = {}) {
    const id = Number(params.id);
    const profile = db.users.find(u => u.id === id);
    if (!profile) throw Object.assign(new Error('Không tìm thấy người dùng.'), { status: 404 });
    return {
      user: profile,
      vehicles: db.vehicles.filter(v => v.user_id === id),
      lots: db.parking_lot_managers
        .filter(m => m.manager_id === id)
        .map(m => {
          const l = db.parking_lots.find(x => x.id === m.parking_lot_id) || {};
          return { id: l.id, name: l.name, address: l.address, status: l.status, capacity: l.capacity, assigned_at: m.assigned_at };
        }),
      reservations: db.reservations
        .filter(r => r.user_id === id)
        .sort((a, b) => b.id - a.id)
        .map(r => ({
          id: r.id,
          lot_name: db.parking_lots.find(l => l.id === r.parking_lot_id)?.name,
          slot_code: db.slots.find(s => s.id === r.slot_id)?.code,
          license_plate: db.vehicles.find(v => v.id === r.vehicle_id)?.license_plate,
          vehicle_type: db.vehicles.find(v => v.id === r.vehicle_id)?.vehicle_type,
          status: r.status,
          deposit_amount: r.deposit_amount,
          total_amount: r.total_amount,
          start_time: r.start_time,
          expected_end_time: r.expected_end_time,
          created_at: r.created_at
        })),
      chat_count: db.chat_messages.filter(c => c.user_id === id).length
    };
  }

  function userStatus(input = {}) {
    const id = Number(input.id);
    const to = String(input.status || '').trim();
    const reason = String(input.reason || '').trim();
    if (!['active', 'inactive', 'banned'].includes(to)) {
      throw new Error('Trạng thái tài khoản không hợp lệ.');
    }
    const target = db.users.find(u => u.id === id);
    if (!target) throw Object.assign(new Error('Không tìm thấy người dùng.'), { status: 404 });
    if (target.role === 'admin') throw Object.assign(new Error('Không cho phép thay đổi trạng thái quản trị viên.'), { status: 403 });
    const old = { id: target.id, full_name: target.full_name, role: target.role, status: target.status };
    target.status = to;
    target.updated_at = fmtVn(new Date());
    const newLog = {
      id: db.audit_logs.length + 1,
      user_id: 1,
      parking_lot_id: null,
      action: 'USER_STATUS_CHANGED',
      entity_type: 'users',
      entity_id: id,
      old_value: old,
      new_value: { id: target.id, full_name: target.full_name, role: target.role, status: target.status },
      note: reason || `Cap nhat trang thai tai khoan ${target.full_name} sang ${to}`,
      created_at: fmtVn(new Date())
    };
    db.audit_logs.push(newLog);
    savePersistedMutations(newLog);
    return { ok: true, item: target };
  }

  function revenue(params = {}) {
    const range = getRangeBounds(params.range || 'all');
    const payInRange = db.payments.filter(p => inRange(p.paid_at, range));

    const deposits = payInRange
      .filter(p => p.status === 'success' && p.payment_type === 'deposit')
      .reduce((s, p) => s + Number(p.amount), 0);
    const finals = payInRange
      .filter(p => p.status === 'success' && p.payment_type === 'final')
      .reduce((s, p) => s + Number(p.amount), 0);
    const refunds = payInRange
      .filter(p => p.payment_type === 'refund' && ['success', 'refunded'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount), 0);

    const totals = {
      transactions: payInRange.length,
      received: deposits + finals,
      deposits,
      finals,
      refunds,
      paid_deposits: payInRange.filter(p => p.status === 'success' && p.payment_type === 'deposit').length
    };

    const byLot = db.parking_lots
      .map(l => {
        const lotResIds = new Set(db.reservations.filter(r => r.parking_lot_id === l.id).map(r => r.id));
        const lotPays = payInRange.filter(p => lotResIds.has(p.reservation_id));
        const dep = lotPays.filter(p => p.status === 'success' && p.payment_type === 'deposit').reduce((s, p) => s + Number(p.amount), 0);
        const fin = lotPays.filter(p => p.status === 'success' && p.payment_type === 'final').reduce((s, p) => s + Number(p.amount), 0);
        const ref = lotPays.filter(p => p.payment_type === 'refund' && ['success', 'refunded'].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0);
        const bookedRes = new Set(lotPays.filter(p => p.status === 'success' && p.payment_type === 'deposit').map(p => p.reservation_id));
        const forfeited = lotPays
          .filter(p => {
            const r = db.reservations.find(x => x.id === p.reservation_id);
            return p.status === 'success' && p.payment_type === 'deposit' && r?.status === 'forfeited';
          })
          .reduce((s, p) => s + Number(p.amount), 0);
        return {
          id: l.id,
          name: l.name,
          status: l.status,
          bookings: bookedRes.size,
          deposits: dep,
          finals: fin,
          received: dep + fin,
          refunds: ref,
          forfeited_deposits: forfeited
        };
      })
      .sort((a, b) => b.received - a.received || a.id - b.id);

    const provMap = new Map();
    for (const p of payInRange) {
      const cur = provMap.get(p.provider) || { provider: p.provider, transactions: 0, received: 0 };
      cur.transactions += 1;
      if (p.status === 'success' && ['deposit', 'final'].includes(p.payment_type)) {
        cur.received += Number(p.amount);
      }
      provMap.set(p.provider, cur);
    }
    const byProvider = [...provMap.values()].sort((a, b) => b.received - a.received);

    const vehMap = new Map();
    for (const p of payInRange) {
      const r = db.reservations.find(x => x.id === p.reservation_id);
      const v = db.vehicles.find(x => x.id === r?.vehicle_id);
      if (!v) continue;
      const cur = vehMap.get(v.vehicle_type) || { vehicle_type: v.vehicle_type, received: 0, resSet: new Set() };
      if (p.status === 'success' && ['deposit', 'final'].includes(p.payment_type)) {
        cur.received += Number(p.amount);
      }
      cur.resSet.add(p.reservation_id);
      vehMap.set(v.vehicle_type, cur);
    }
    const byVehicle = [...vehMap.values()]
      .map(x => ({ vehicle_type: x.vehicle_type, received: x.received, bookings: x.resSet.size }))
      .sort((a, b) => b.received - a.received);

    const recent = [...payInRange]
      .sort((a, b) => String(b.paid_at).localeCompare(String(a.paid_at)) || b.id - a.id)
      .map(p => {
        const r = db.reservations.find(x => x.id === p.reservation_id) || {};
        const l = db.parking_lots.find(x => x.id === r.parking_lot_id) || {};
        const u = db.users.find(x => x.id === r.user_id) || {};
        const v = db.vehicles.find(x => x.id === r.vehicle_id) || {};
        return {
          ...p,
          lot_name: l.name,
          customer: u.full_name,
          license_plate: v.license_plate
        };
      });

    const dayMap = new Map();
    for (const p of payInRange) {
      const day = String(p.paid_at).slice(0, 10);
      const cur = dayMap.get(day) || { day, deposits: 0, finals: 0 };
      if (p.status === 'success' && p.payment_type === 'deposit') cur.deposits += Number(p.amount);
      if (p.status === 'success' && p.payment_type === 'final') cur.finals += Number(p.amount);
      dayMap.set(day, cur);
    }
    const byDay = [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day));

    return { range, totals, byLot, byProvider, byVehicle, recent, byDay, commission: null };
  }

  function logs() {
    const items = [...db.audit_logs]
      .sort((a, b) => b.id - a.id)
      .map(a => {
        const u = db.users.find(x => x.id === a.user_id) || {};
        const l = db.parking_lots.find(x => x.id === a.parking_lot_id) || {};
        return {
          ...a,
          actor: u.full_name || 'He thong',
          actor_email: u.email || '',
          actor_role: u.role || 'admin',
          lot_name: l.name || null
        };
      });

    const manager_history = [...db.manager_history]
      .sort((a, b) => b.id - a.id)
      .map(h => {
        const u = db.users.find(x => x.id === h.manager_id) || {};
        const l = db.parking_lots.find(x => x.id === h.parking_lot_id) || {};
        return {
          ...h,
          actor: u.full_name || 'Quan ly',
          actor_email: u.email || '',
          lot_name: l.name || null
        };
      });

    return { items, manager_history };
  }

  function records() {
    const reservations = [...db.reservations]
      .sort((a, b) => b.id - a.id)
      .map(r => {
        const u = db.users.find(x => x.id === r.user_id) || {};
        const l = db.parking_lots.find(x => x.id === r.parking_lot_id) || {};
        const s = db.slots.find(x => x.id === r.slot_id) || {};
        const v = db.vehicles.find(x => x.id === r.vehicle_id) || {};
        return {
          ...r,
          customer: u.full_name,
          lot_name: l.name,
          slot_code: s.code,
          license_plate: v.license_plate,
          vehicle_name: v.vehicle_name,
          vehicle_type: v.vehicle_type
        };
      });

    const vehicles = [...db.vehicles]
      .sort((a, b) => b.id - a.id)
      .map(v => {
        const u = db.users.find(x => x.id === v.user_id) || {};
        return {
          ...v,
          owner: u.full_name,
          owner_email: u.email
        };
      });

    const slots = [...db.slots].map(s => ({
      ...s,
      lot_name: db.parking_lots.find(l => l.id === s.parking_lot_id)?.name
    }));

    const payments = [...db.payments]
      .sort((a, b) => b.id - a.id)
      .map(p => {
        const r = db.reservations.find(x => x.id === p.reservation_id) || {};
        const u = db.users.find(x => x.id === r.user_id) || {};
        const l = db.parking_lots.find(x => x.id === r.parking_lot_id) || {};
        return {
          ...p,
          customer: u.full_name,
          lot_name: l.name
        };
      });

    const tickets = [...db.qr_tickets]
      .sort((a, b) => b.id - a.id)
      .map(qt => {
        const r = db.reservations.find(x => x.id === qt.reservation_id) || {};
        const u = db.users.find(x => x.id === r.user_id) || {};
        const l = db.parking_lots.find(x => x.id === r.parking_lot_id) || {};
        const s = db.slots.find(x => x.id === r.slot_id) || {};
        return {
          ...qt,
          customer: u.full_name,
          lot_name: l.name,
          slot_code: s.code
        };
      });

    const sessions = [...db.parking_sessions]
      .sort((a, b) => b.id - a.id)
      .map(ps => {
        const r = db.reservations.find(x => x.id === ps.reservation_id) || {};
        const u = db.users.find(x => x.id === r.user_id) || {};
        const l = db.parking_lots.find(x => x.id === r.parking_lot_id) || {};
        const s = db.slots.find(x => x.id === r.slot_id) || {};
        const v = db.vehicles.find(x => x.id === r.vehicle_id) || {};
        const uIn = db.users.find(x => x.id === ps.checked_in_by);
        const uOut = db.users.find(x => x.id === ps.checked_out_by);
        return {
          ...ps,
          customer: u.full_name,
          lot_name: l.name,
          slot_code: s.code,
          license_plate: v.license_plate,
          checked_in_by_name: uIn?.full_name || null,
          checked_out_by_name: uOut?.full_name || null
        };
      });

    const pricing = [...db.pricing_rules].map(pr => ({
      ...pr,
      lot_name: db.parking_lots.find(l => l.id === pr.parking_lot_id)?.name
    }));

    const chat_messages = [...db.chat_messages].map(cm => {
      const u = db.users.find(x => x.id === cm.user_id) || {};
      return {
        ...cm,
        user_name: u.full_name,
        user_email: u.email
      };
    });

    const otps = [...db.email_otps];
    const otp_stats = {
      total: otps.length,
      used: otps.filter(x => x.is_used).length,
      expired: 0
    };

    return {
      reservations,
      vehicles,
      slots,
      payments,
      tickets,
      sessions,
      pricing,
      chat_messages,
      otps,
      otp_stats
    };
  }

  function settings() {
    const pricing = db.pricing_rules.map(pr => ({
      ...pr,
      lot_name: db.parking_lots.find(l => l.id === pr.parking_lot_id)?.name
    }));

    const managers = db.parking_lot_managers.map(m => {
      const l = db.parking_lots.find(x => x.id === m.parking_lot_id) || {};
      const u = db.users.find(x => x.id === m.manager_id) || {};
      return {
        id: m.id,
        parking_lot_id: m.parking_lot_id,
        lot_name: l.name,
        lot_status: l.status,
        manager_id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        assigned_at: m.assigned_at
      };
    });

    const lot_vehicles = db.parking_lots.map(l => ({
      parking_lot_id: l.id,
      lot_name: l.name,
      vehicle_types: db.parking_lot_vehicle_types
        .filter(v => v.parking_lot_id === l.id)
        .map(v => v.vehicle_type)
        .sort()
        .join(', ')
    }));

    const rules = [
      { code: 'HOLD_TIMEOUT', name: 'Thời gian giữ chỗ thanh toán cọc', value: '10 phút', desc: 'Tự động hủy đơn giữ chỗ (holding) nếu chưa thanh toán tiền cọc đúng hạn (hold_expires_at).' },
      { code: 'ARRIVAL_TIMEOUT', name: 'Thời gian tối đa đến bãi sau khi cọc', value: '20 phút', desc: 'Quá hạn arrival_expires_at sau khi đã cọc (paid) mà chưa check-in QR sẽ chuyển sang No-show (forfeited).' },
      { code: 'OTP_TTL', name: 'Thời hạn hiệu lực mã OTP Email', value: '5 phút (tối đa 5 lần thử)', desc: 'Áp dụng cho FORGOT_PASSWORD, VERIFY_EMAIL và REGISTER trong bảng email_otps.' },
      { code: 'VEHICLE_TYPES', name: 'Phân loại phương tiện hỗ trợ', value: 'Sedan · SUV · EV', desc: 'Cấu hình loại xe được phép vào từng bãi trong parking_lot_vehicle_types.' },
      { code: 'SLOT_TYPES', name: 'Phân loại ô đỗ xe (2D Grid)', value: 'Tiêu chuẩn · Sạc EV · Xe lớn/SUV · Ưu tiên KT', desc: 'Hiển thị trực quan theo tọa độ (row_index, col_index) trên sơ đồ bãi xe.' },
      { code: 'PAYMENT_PROVIDERS', name: 'Phương thức thanh toán hỗ trợ', value: 'VNPay · MoMo · Thẻ (Card)', desc: 'Ghi nhận giao dịch đặt cọc (deposit), tất toán (final) và hoàn tiền (refund) kèm đối soát IPN.' }
    ];

    return {
      pricing,
      managers,
      lot_vehicles,
      rules,
      server_time: fmtVn(new Date())
    };
  }

  function handleRequest(action, method = 'GET', data = {}, params = {}) {
    if (action === 'auth') {
      const admin = db.users.find(u => u.role === 'admin') || db.users[0];
      return {
        authenticated: true,
        user: admin.full_name,
        email: admin.email,
        csrf: 'ez-seed-csrf'
      };
    }
    if (method === 'POST') {
      if (action === 'lot_status') return lotStatus(data);
      if (action === 'user_status') return userStatus(data);
      throw new Error('Chức năng này chưa được hỗ trợ.');
    }
    const readers = { summary, dashboard, lots, lot, users, user, revenue, logs, records, settings };
    if (!readers[action]) throw new Error('API không tồn tại.');
    return readers[action](params);
  }

  return {
    db,
    summary,
    dashboard,
    lots,
    lot,
    lotStatus,
    users,
    user,
    userStatus,
    revenue,
    logs,
    records,
    settings,
    handleRequest
  };
});

