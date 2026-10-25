
-- =============================================================
-- EZ-Space Smart Parking - Database Schema (PostgreSQL 16)
-- Do an Capstone 1 - Nhom C1SE.78, Dai hoc Duy Tan
-- =============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================
-- 1. ENUM Types
-- =============================================================

CREATE TYPE user_role AS ENUM (
    'customer',   -- Tai xe / Khach hang dat cho
    'manager',    -- Chu bai / Quan ly bai xe
    'admin'       -- Quan tri vien he thong
);


CREATE TYPE user_status AS ENUM (
    'active',
    'inactive',
    'banned'
);

CREATE TYPE vehicle_type AS ENUM (
    'Sedan',
    'SUV',
    'EV'
);

CREATE TYPE parking_lot_status AS ENUM (
    'pending',    -- Cho Admin duyet
    'active',     -- Dang hoat dong
    'inactive',   -- Tam ngung
    'rejected'    -- Bi tu choi
);

CREATE TYPE slot_status AS ENUM (
    'available',    -- Trong (xanh la)
    'holding',      -- Dang duoc giu cho thanh toan (vang)
    'occupied',     -- Da co xe do (do)
    'unavailable'   -- Khong su dung duoc
);

CREATE TYPE slot_type AS ENUM (
    'standard',     -- O tieu chuan
    'ev_charging',  -- Co tram sac xe dien
    'large',        -- Danh cho xe lon / SUV
    'disabled'      -- Uu tien nguoi khuyet tat
);

CREATE TYPE reservation_status AS ENUM (
    'holding',    -- Dang giu cho, cho thanh toan (10 phut)
    'paid',       -- Da tra coc, cho den bai (20 phut)
    'entered',    -- Da vao bai (quet QR)
    'completed',  -- Hoan thanh luot do
    'cancelled',  -- Khach tu huy
    'forfeited',  -- Het han / vi pham (mat coc)
    'refunded'    -- Da hoan coc
);

CREATE TYPE payment_provider AS ENUM (
    'vnpay',
    'momo',
    'card'
);

CREATE TYPE payment_type AS ENUM (
    'deposit',  -- Tien coc giu cho
    'final',    -- Thanh toan phan con lai khi roi bai
    'refund'    -- Hoan tien
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'success',
    'failed',
    'refunded'
);

CREATE TYPE qr_ticket_status AS ENUM (
    'active',     -- Ve con hieu luc
    'used',       -- Da dung de vao bai
    'expired',    -- Het han
    'cancelled'   -- Ve bi huy
);

CREATE TYPE parking_session_status AS ENUM (
    'active',     -- Xe dang trong bai
    'completed',  -- Xe da roi bai
    'abandoned'   -- Xe vao nhung khong ra dung cach
);

CREATE TYPE manager_action_type AS ENUM (
    'lot_created',
    'lot_updated',
    'slot_updated',
    'pricing_updated',
    'reservation_cancelled',
    'report_viewed'
);

-- =============================================================
-- 2. CORE TABLES
-- =============================================================

-- 2.1 Nguoi dung
CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    full_name       VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL DEFAULT 'customer',
    status          user_status     NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_phone UNIQUE (phone)
);

COMMENT ON TABLE  users IS 'Tai khoan nguoi dung: khach hang, quan ly bai va admin he thong.';

-- 2.2 Xe cua khach hang
CREATE TABLE vehicles (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_plate   VARCHAR(20)     NOT NULL,
    vehicle_name    VARCHAR(100),
    vehicle_type    vehicle_type    NOT NULL,
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_vehicles_plate UNIQUE (license_plate)
);

COMMENT ON TABLE  vehicles IS 'Danh sach xe ca nhan cua nguoi dung.';
COMMENT ON COLUMN vehicles.vehicle_name IS 'Ten xe hien thi (VD: Toyota Fortuner, Honda Civic).';
COMMENT ON COLUMN vehicles.is_default   IS 'Xe mac dinh duoc chon san khi dat cho.';

-- 2.3 Bai do xe
CREATE TABLE parking_lots (
    id              BIGSERIAL           PRIMARY KEY,
    name            VARCHAR(150)        NOT NULL,
    address         VARCHAR(255)        NOT NULL,
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    description     TEXT,
    open_time       TIME,
    close_time      TIME,
    capacity        INT                 NOT NULL DEFAULT 0,
    status          parking_lot_status  NOT NULL DEFAULT 'pending',
    approved_by     BIGINT              REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  parking_lots IS 'Danh sach bai do xe trong he thong (multi-tenant).';
COMMENT ON COLUMN parking_lots.approved_by IS 'Admin duyet bai.';

-- 2.4 Loai xe duoc phep vao bai
CREATE TABLE parking_lot_vehicle_types (
    id              BIGSERIAL       PRIMARY KEY,
    parking_lot_id  BIGINT          NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    vehicle_type    vehicle_type    NOT NULL,

    CONSTRAINT uq_lot_vehicle_type UNIQUE (parking_lot_id, vehicle_type)
);

COMMENT ON TABLE parking_lot_vehicle_types IS 'Loai xe duoc phep do o tung bai.';

-- 2.5 Quan ly bai xe (nhieu manager - nhieu bai)
CREATE TABLE parking_lot_managers (
    id              BIGSERIAL       PRIMARY KEY,
    parking_lot_id  BIGINT          NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    manager_id      BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_lot_manager UNIQUE (parking_lot_id, manager_id)
);

-- 2.6 O do xe (Slots)
CREATE TABLE slots (
    id              BIGSERIAL       PRIMARY KEY,
    parking_lot_id  BIGINT          NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    code            VARCHAR(10)     NOT NULL,
    row_index       INT             NOT NULL,
    col_index       INT             NOT NULL,
    slot_type       slot_type       NOT NULL DEFAULT 'standard',
    status          slot_status     NOT NULL DEFAULT 'available',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_slot_code UNIQUE (parking_lot_id, code),
    CONSTRAINT uq_slot_grid UNIQUE (parking_lot_id, row_index, col_index)
);

COMMENT ON TABLE  slots IS 'Tung o do xe trong bai, co toa do (row, col) de render so do 2D.';
COMMENT ON COLUMN slots.code      IS 'Ma hien thi o do, VD: A-01, B-05.';
COMMENT ON COLUMN slots.row_index IS 'Hang trong luoi so do 2D (0-based).';
COMMENT ON COLUMN slots.col_index IS 'Cot trong luoi so do 2D (0-based).';

-- 2.7 Bang gia theo gio
CREATE TABLE pricing_rules (
    id              BIGSERIAL       PRIMARY KEY,
    parking_lot_id  BIGINT          NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
    name            VARCHAR(100),
    start_time      TIME,
    end_time        TIME,
    hourly_rate     DECIMAL(12,2)   NOT NULL,
    surcharge       DECIMAL(12,2)   NOT NULL DEFAULT 0,
    effective_from  DATE,
    effective_to    DATE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 3. BOOKING FLOW TABLES
-- =============================================================

-- 3.1 Don dat cho (Reservations)
CREATE TABLE reservations (
    id                  BIGSERIAL           PRIMARY KEY,
    user_id             BIGINT              NOT NULL REFERENCES users(id),
    parking_lot_id      BIGINT              NOT NULL REFERENCES parking_lots(id),
    slot_id             BIGINT              NOT NULL REFERENCES slots(id),
    vehicle_id          BIGINT              NOT NULL REFERENCES vehicles(id),
    start_time          TIMESTAMPTZ         NOT NULL,
    expected_end_time   TIMESTAMPTZ         NOT NULL,
    status              reservation_status  NOT NULL DEFAULT 'holding',
    hold_expires_at     TIMESTAMPTZ         NOT NULL,
    arrival_expires_at  TIMESTAMPTZ,
    hourly_rate         DECIMAL(12,2)       NOT NULL,
    deposit_amount      DECIMAL(12,2)       NOT NULL,
    total_amount        DECIMAL(12,2),
    cancelled_at        TIMESTAMPTZ,
    cancel_reason       VARCHAR(255),
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN reservations.hold_expires_at    IS 'Han thanh toan coc - tu dong huy sau 10 phut neu chua tra.';
COMMENT ON COLUMN reservations.arrival_expires_at IS 'Han den bai sau khi da tra coc - qua 20 phut thi mat coc.';

-- Performance indexes cho Booking Engine
CREATE INDEX idx_reservations_slot_status     ON reservations (slot_id, status);
CREATE INDEX idx_reservations_user            ON reservations (user_id);
CREATE INDEX idx_reservations_lot             ON reservations (parking_lot_id);
CREATE INDEX idx_reservations_hold_expires    ON reservations (hold_expires_at) WHERE status = 'holding';
CREATE INDEX idx_reservations_arrival_expires ON reservations (arrival_expires_at) WHERE status = 'paid';

-- 3.2 Thanh toan
CREATE TABLE payments (
    id              BIGSERIAL           PRIMARY KEY,
    reservation_id  BIGINT              NOT NULL REFERENCES reservations(id),
    provider        payment_provider    NOT NULL,
    transaction_ref VARCHAR(255),
    payment_type    payment_type        NOT NULL,
    amount          DECIMAL(12,2)       NOT NULL,
    status          payment_status      NOT NULL DEFAULT 'pending',
    response_code   VARCHAR(20),
    raw_ipn_payload JSONB,
    ipn_received_at TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN payments.raw_ipn_payload IS 'Luu nguyen payload IPN tu cong thanh toan de go loi va doi soat.';

CREATE INDEX idx_payments_reservation ON payments (reservation_id);
CREATE INDEX idx_payments_status      ON payments (status);

-- 3.3 Ve QR
CREATE TABLE qr_tickets (
    id              BIGSERIAL           PRIMARY KEY,
    reservation_id  BIGINT              NOT NULL REFERENCES reservations(id),
    token_hash      VARCHAR(255)        NOT NULL,
    status          qr_ticket_status    NOT NULL DEFAULT 'active',
    issued_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    used_at         TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ         NOT NULL,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_qr_reservation UNIQUE (reservation_id),
    CONSTRAINT uq_qr_token       UNIQUE (token_hash)
);

COMMENT ON COLUMN qr_tickets.token_hash IS 'Hash HMAC-SHA256 cua payload QR de chong gia mao khi quet.';

-- 3.4 Phien do xe thuc te
CREATE TABLE parking_sessions (
    id              BIGSERIAL               PRIMARY KEY,
    reservation_id  BIGINT                  NOT NULL REFERENCES reservations(id),
    check_in_at     TIMESTAMPTZ,
    check_out_at    TIMESTAMPTZ,
    checked_in_by   BIGINT                  REFERENCES users(id),
    checked_out_by  BIGINT                  REFERENCES users(id),
    final_amount    DECIMAL(12,2),
    status          parking_session_status  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_session_reservation UNIQUE (reservation_id)
);

-- =============================================================
-- 4. AUDIT / HISTORY TABLES
-- =============================================================

-- 4.1 Nhat ky he thong
CREATE TABLE audit_logs (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          REFERENCES users(id),
    parking_lot_id  BIGINT          REFERENCES parking_lots(id),
    action          VARCHAR(100)    NOT NULL,
    entity_type     VARCHAR(100),
    entity_id       BIGINT,
    old_value       JSONB,
    new_value       JSONB,
    note            VARCHAR(255),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user   ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);

-- 4.2 Lich su thao tac cua Manager tren bai
CREATE TABLE manager_history (
    id              BIGSERIAL               PRIMARY KEY,
    manager_id      BIGINT                  NOT NULL REFERENCES users(id),
    parking_lot_id  BIGINT                  NOT NULL REFERENCES parking_lots(id),
    action_type     manager_action_type     NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    note            VARCHAR(255),
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manager_history_lot ON manager_history (parking_lot_id);

-- =============================================================
-- 5. OTP VERIFICATION TABLE
-- =============================================================

-- 5.1 Bang luu ma OTP xac thuc email
CREATE TABLE email_otps (
    id          BIGSERIAL       PRIMARY KEY,
    email       VARCHAR(255)    NOT NULL,
    otp_code    VARCHAR(6)      NOT NULL,
    purpose     VARCHAR(50)     NOT NULL,   -- 'FORGOT_PASSWORD' | 'VERIFY_EMAIL' | 'REGISTER'
    attempts    INT             NOT NULL DEFAULT 0,
    is_used     BOOLEAN         NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMPTZ     NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  email_otps IS 'Luu tru ma OTP gui qua email. Thay the Redis bang PostgreSQL TTL thu cong.';
COMMENT ON COLUMN email_otps.purpose   IS 'Muc dich dung ma OTP: FORGOT_PASSWORD, VERIFY_EMAIL, REGISTER.';
COMMENT ON COLUMN email_otps.attempts  IS 'So lan nguoi dung nhap sai. Qua 5 lan se khoa ma nay.';
COMMENT ON COLUMN email_otps.expires_at IS 'Thoi diem het han (tao + 5 phut). Backend tu kiem tra.';

CREATE INDEX idx_email_otps_email_purpose ON email_otps (email, purpose);
CREATE INDEX idx_email_otps_expires       ON email_otps (expires_at) WHERE is_used = FALSE;

-- =============================================================
-- 6. AUTO updated_at TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users', 'vehicles', 'parking_lots', 'slots',
        'pricing_rules', 'reservations', 'payments', 'parking_sessions'
    ]
    LOOP
        EXECUTE FORMAT(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
            t, t
        );
    END LOOP;
END $$;
