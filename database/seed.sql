-- =============================================================
-- EZ-Space Smart Parking - Seed Data (Du lieu mau)
-- PostgreSQL 16
-- Khop voi giao dien Frontend va kich ban kiem thu Capstone 1
-- =============================================================

-- Xoa sach du lieu cu truoc khi nap lai (theo thu tu rang buoc khoa ngoai)
TRUNCATE TABLE 
    audit_logs,
    manager_history,
    parking_sessions,
    qr_tickets,
    payments,
    reservations,
    pricing_rules,
    slots,
    parking_lot_managers,
    parking_lot_vehicle_types,
    parking_lots,
    vehicles,
    users
RESTART IDENTITY CASCADE;

-- =============================================================
-- 1. NGUOI DUNG (USERS)
-- Mat khau mac dinh cho tat ca tai khoan: password123 (bcrypt hash)
-- =============================================================
INSERT INTO users (id, full_name, email, phone, password_hash, role, status) VALUES
(1, 'Admin He Thong', 'admin@ezspace.vn', '0905000111', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'active'),
(2, 'Tran Van Quan Ly', 'manager@ezspace.vn', '0905987654', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager', 'active'),
(3, 'Nguyen Van A', 'customer@ezspace.vn', '0905123456', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'customer', 'active'),
(4, 'Le Thi B', 'lethib@gmail.com', '0905222333', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'customer', 'active');

-- Reset sequence cho bang users
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- =============================================================
-- 2. XE CUA KHACH HANG (VEHICLES)
-- Khop voi danh sach xe tren Frontend (app/xe-cua-toi)
-- =============================================================
INSERT INTO vehicles (id, user_id, license_plate, vehicle_name, vehicle_type, is_default) VALUES
(1, 3, '43A-123.45', 'Toyota Fortuner', 'SUV', true),
(2, 3, '43A-678.90', 'Honda Civic', 'Sedan', false),
(3, 3, '43E-999.88', 'VinFast VF8', 'EV', false),
(4, 4, '43A-555.66', 'Mazda CX-5', 'SUV', true);

SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles));

-- =============================================================
-- 3. BAI DO XE (PARKING_LOTS)
-- Khop voi danh sach bai tren Frontend (app/page.tsx, mock/lots.ts)
-- =============================================================
INSERT INTO parking_lots (id, name, address, latitude, longitude, description, open_time, close_time, capacity, status, approved_by, approved_at) VALUES
(1, 'Bai Hai Chau A', '15 Le Duan, Hai Chau, Da Nang', 16.0718000, 108.2222000, 'Bai do xe trung tam gan cau Song Han, co mai che va tram sac EV.', '00:00:00', '23:59:59', 80, 'active', 1, NOW()),
(2, 'Bai Cau Rong', 'Son Tra, Da Nang (Gan chan Cau Rong)', 16.0610000, 108.2270000, 'Bai do xe thuan tien ngam Cau Rong phun lua cuoi tuan.', '06:00:00', '23:00:00', 120, 'active', 1, NOW()),
(3, 'San bay Da Nang T1', 'San bay Quoc te Da Nang, Hai Chau', 16.0538000, 108.1995000, 'Bai do dai han gan ga quoc noi T1, an ninh 24/7.', '00:00:00', '23:59:59', 340, 'active', 1, NOW());

SELECT setval('parking_lots_id_seq', (SELECT MAX(id) FROM parking_lots));

-- Loai xe duoc phep vao tung bai
INSERT INTO parking_lot_vehicle_types (parking_lot_id, vehicle_type) VALUES
(1, 'Sedan'), (1, 'SUV'), (1, 'EV'),
(2, 'Sedan'), (2, 'SUV'),
(3, 'Sedan'), (3, 'SUV'), (3, 'EV');

-- Phan cong quan ly bai xe (User 2 quan ly Bai 1 va Bai 2)
INSERT INTO parking_lot_managers (parking_lot_id, manager_id) VALUES
(1, 2),
(2, 2);

-- =============================================================
-- 4. O DO XE (SLOTS)
-- Luoi ma tran 4x5 = 20 o cho Bai Hai Chau A de test so do 2D
-- =============================================================
INSERT INTO slots (parking_lot_id, code, row_index, col_index, slot_type, status, is_active) VALUES
-- Hang 0 (A01 -> A05)
(1, 'A-01', 0, 0, 'standard', 'available', true),
(1, 'A-02', 0, 1, 'standard', 'available', true),
(1, 'A-03', 0, 2, 'standard', 'holding', true),
(1, 'A-04', 0, 3, 'large', 'occupied', true),
(1, 'A-05', 0, 4, 'ev_charging', 'available', true),

-- Hang 1 (A06 -> A10)
(1, 'A-06', 1, 0, 'standard', 'available', true),
(1, 'A-07', 1, 1, 'large', 'available', true),
(1, 'A-08', 1, 2, 'standard', 'occupied', true),
(1, 'A-09', 1, 3, 'standard', 'available', true),
(1, 'A-10', 1, 4, 'ev_charging', 'occupied', true),

-- Hang 2 (B01 -> B05)
(1, 'B-01', 2, 0, 'standard', 'available', true),
(1, 'B-02', 2, 1, 'standard', 'available', true),
(1, 'B-03', 2, 2, 'large', 'available', true),
(1, 'B-04', 2, 3, 'standard', 'holding', true),
(1, 'B-05', 2, 4, 'ev_charging', 'available', true),

-- Hang 3 (B06 -> B10)
(1, 'B-06', 3, 0, 'disabled', 'available', true),
(1, 'B-07', 3, 1, 'standard', 'available', true),
(1, 'B-08', 3, 2, 'standard', 'available', true),
(1, 'B-09', 3, 3, 'large', 'occupied', true),
(1, 'B-10', 3, 4, 'standard', 'available', true);

-- Slots cho Bai Cau Rong
INSERT INTO slots (parking_lot_id, code, row_index, col_index, slot_type, status, is_active) VALUES
(2, 'CR-01', 0, 0, 'standard', 'available', true),
(2, 'CR-02', 0, 1, 'standard', 'available', true),
(2, 'CR-03', 0, 2, 'standard', 'available', true),
(2, 'CR-04', 0, 3, 'standard', 'available', true),
(2, 'CR-05', 0, 4, 'standard', 'available', true),
(2, 'CR-06', 1, 0, 'large', 'available', true),
(2, 'CR-07', 1, 1, 'large', 'available', true),
(2, 'CR-08', 1, 2, 'large', 'available', true),
(2, 'CR-09', 1, 3, 'large', 'available', true),
(2, 'CR-10', 1, 4, 'standard', 'occupied', true),
(2, 'CR-11', 2, 0, 'standard', 'occupied', true),
(2, 'CR-12', 2, 1, 'large', 'occupied', true),
(2, 'CR-13', 2, 2, 'standard', 'occupied', true),
(2, 'CR-14', 2, 3, 'standard', 'holding', true),
(2, 'CR-15', 2, 4, 'large', 'occupied', true);

-- Slots cho San bay Da Nang T1
INSERT INTO slots (parking_lot_id, code, row_index, col_index, slot_type, status, is_active) VALUES
(3, 'SB-01', 0, 0, 'standard', 'available', true),
(3, 'SB-02', 0, 1, 'standard', 'available', true),
(3, 'SB-03', 0, 2, 'standard', 'available', true),
(3, 'SB-04', 0, 3, 'standard', 'available', true),
(3, 'SB-05', 0, 4, 'standard', 'available', true),
(3, 'SB-06', 1, 0, 'large', 'available', true),
(3, 'SB-07', 1, 1, 'large', 'available', true),
(3, 'SB-08', 1, 2, 'large', 'available', true),
(3, 'SB-09', 1, 3, 'large', 'available', true),
(3, 'SB-10', 1, 4, 'standard', 'occupied', true),
(3, 'SB-11', 2, 0, 'ev_charging', 'available', true),
(3, 'SB-12', 2, 1, 'ev_charging', 'available', true),
(3, 'SB-13', 2, 2, 'standard', 'available', true),
(3, 'SB-14', 2, 3, 'standard', 'available', true),
(3, 'SB-15', 2, 4, 'large', 'occupied', true),
(3, 'SB-16', 3, 0, 'standard', 'available', true),
(3, 'SB-17', 3, 1, 'standard', 'available', true),
(3, 'SB-18', 3, 2, 'standard', 'available', true),
(3, 'SB-19', 3, 3, 'ev_charging', 'occupied', true),
(3, 'SB-20', 3, 4, 'standard', 'holding', true);

-- =============================================================
-- 5. BANG GIA THEO GIO (PRICING_RULES)
-- =============================================================
INSERT INTO pricing_rules (parking_lot_id, name, start_time, end_time, hourly_rate, surcharge, effective_from, effective_to) VALUES
(1, 'Gia tieu chuan ban ngay', '06:00:00', '18:00:00', 20000.00, 0.00, '2026-01-01', '2026-12-31'),
(1, 'Gio cao diem toi', '18:00:00', '22:00:00', 20000.00, 5000.00, '2026-01-01', '2026-12-31'),
(1, 'Gia qua dem', '22:00:00', '06:00:00', 15000.00, 0.00, '2026-01-01', '2026-12-31'),
(2, 'Gia dong hang ngay', '06:00:00', '23:00:00', 15000.00, 0.00, '2026-01-01', '2026-12-31'),
(3, 'Gia dai han san bay', '00:00:00', '23:59:59', 12000.00, 0.00, '2026-01-01', '2026-12-31');

-- =============================================================
-- 6. DON DAT CHO MAU (RESERVATIONS), THANH TOAN & VE QR
-- =============================================================

-- 6.1 Don 1: Dang giu cho (holding - chua tra coc, con 8 phut nua het han)
INSERT INTO reservations (
    id, user_id, parking_lot_id, slot_id, vehicle_id, 
    start_time, expected_end_time, status, 
    hold_expires_at, arrival_expires_at, 
    hourly_rate, deposit_amount, total_amount, created_at
) VALUES (
    1, 3, 1, 3, 1, -- Nguyen Van A dat o A-03 (slot id 3), xe Toyota Fortuner
    NOW(), NOW() + INTERVAL '2 hours', 'holding',
    NOW() + INTERVAL '8 minutes', NULL,
    20000.00, 20000.00, NULL, NOW()
);

-- 6.2 Don 2: Da tra coc qua VNPay, dang cho den bai (paid, con 15 phut nua toi)
INSERT INTO reservations (
    id, user_id, parking_lot_id, slot_id, vehicle_id, 
    start_time, expected_end_time, status, 
    hold_expires_at, arrival_expires_at, 
    hourly_rate, deposit_amount, total_amount, created_at
) VALUES (
    2, 3, 1, 4, 2, -- Nguyen Van A dat o A-04 (slot id 4), xe Honda Civic
    NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '3 hours', 'paid',
    NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '15 minutes',
    20000.00, 20000.00, NULL, NOW() - INTERVAL '5 minutes'
);

-- Giao dich coc cua Don 2
INSERT INTO payments (
    reservation_id, provider, transaction_ref, payment_type, 
    amount, status, response_code, raw_ipn_payload, paid_at
) VALUES (
    2, 'vnpay', 'VNP_TRANS_20261013001', 'deposit',
    20000.00, 'success', '00', 
    '{"vnp_ResponseCode": "00", "vnp_TransactionNo": "14589230", "vnp_BankCode": "NCB", "vnp_Amount": "2000000"}'::jsonb,
    NOW() - INTERVAL '4 minutes'
);

-- Ve QR da phat hanh cho Don 2 de quet o Kiosk
INSERT INTO qr_tickets (
    reservation_id, token_hash, status, issued_at, expires_at
) VALUES (
    2, 
    encode(digest('EZSPACE_TICKET_RES_2_SECRET', 'sha256'), 'hex'),
    'active',
    NOW() - INTERVAL '4 minutes',
    NOW() + INTERVAL '15 minutes'
);

-- 6.3 Don 3: Luot do trong qua khu da hoan thanh (completed de test lich su)
INSERT INTO reservations (
    id, user_id, parking_lot_id, slot_id, vehicle_id, 
    start_time, expected_end_time, status, 
    hold_expires_at, arrival_expires_at, 
    hourly_rate, deposit_amount, total_amount, created_at
) VALUES (
    3, 3, 1, 1, 1,
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '22 hours', 'completed',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '20 minutes',
    20000.00, 20000.00, 40000.00, NOW() - INTERVAL '1 day'
);

-- Thanh toan coc va thanh toan sau cua Don 3
INSERT INTO payments (reservation_id, provider, transaction_ref, payment_type, amount, status, response_code, paid_at) VALUES 
(3, 'vnpay', 'VNP_DEP_PREV01', 'deposit', 20000.00, 'success', '00', NOW() - INTERVAL '1 day'),
(3, 'momo', 'MOMO_FINAL_PREV01', 'final', 20000.00, 'success', '00', NOW() - INTERVAL '22 hours');

-- Phien do xe thuc te cua Don 3
INSERT INTO parking_sessions (
    reservation_id, check_in_at, check_out_at, checked_in_by, checked_out_by, final_amount, status
) VALUES (
    3,
    NOW() - INTERVAL '1 day' + INTERVAL '10 minutes',
    NOW() - INTERVAL '22 hours',
    2, 2, 40000.00, 'completed'
);

SELECT setval('reservations_id_seq', (SELECT MAX(id) FROM reservations));

-- =============================================================
-- 7. AUDIT LOGS MAU (NHAT KY HOAT DONG)
-- =============================================================
INSERT INTO audit_logs (user_id, parking_lot_id, action, entity_type, entity_id, note) VALUES
(1, 1, 'APPROVE_LOT', 'parking_lots', 1, 'Admin duyet mo bai Hai Chau A'),
(2, 1, 'UPDATE_SLOT', 'slots', 4, 'Quan ly danh dau o A-04 thanh occupied');
