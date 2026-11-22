import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Helper query function
export const query = (text: string, params?: any[]) => pool.query(text, params);

export const testDbConnection = async () => {
  try {
    const res = await pool.query("SELECT current_database(), NOW() AS current_time;");
    console.log(`[Database] Connected to: ${res.rows[0].current_database} at ${res.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error("[Database] Connection error:", error);
    return false;
  }
};

export const initDbTables = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id          BIGSERIAL       PRIMARY KEY,
        email       VARCHAR(255)    NOT NULL,
        otp_code    VARCHAR(6)      NOT NULL,
        purpose     VARCHAR(50)     NOT NULL,
        attempts    INT             NOT NULL DEFAULT 0,
        is_used     BOOLEAN         NOT NULL DEFAULT FALSE,
        expires_at  TIMESTAMPTZ     NOT NULL,
        created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_otps_email_purpose ON email_otps (email, purpose);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

      -- Đảm bảo bảng parking_sessions và qr_tickets luôn tồn tại cho Kiosk
      CREATE TABLE IF NOT EXISTS parking_sessions (
        id              BIGSERIAL               PRIMARY KEY,
        reservation_id  BIGINT                  NOT NULL REFERENCES reservations(id),
        check_in_at     TIMESTAMPTZ,
        check_out_at    TIMESTAMPTZ,
        checked_in_by   BIGINT                  REFERENCES users(id),
        checked_out_by  BIGINT                  REFERENCES users(id),
        final_amount    DECIMAL(12,2),
        status          VARCHAR(30)             NOT NULL DEFAULT 'active',
        created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_session_reservation UNIQUE (reservation_id)
      );

      CREATE TABLE IF NOT EXISTS qr_tickets (
        id              BIGSERIAL           PRIMARY KEY,
        reservation_id  BIGINT              NOT NULL REFERENCES reservations(id),
        token_hash      VARCHAR(255)        NOT NULL,
        status          VARCHAR(30)         NOT NULL DEFAULT 'active',
        issued_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        used_at         TIMESTAMPTZ,
        expires_at      TIMESTAMPTZ         NOT NULL,
        created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_qr_reservation UNIQUE (reservation_id)
      );

      -- Đảm bảo bảng audit_logs luôn tồn tại để ghi nhật ký hệ thống
      CREATE TABLE IF NOT EXISTS audit_logs (
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

      -- Đảm bảo bảng chat_messages luôn tồn tại để đồng bộ lịch sử chat xuyên suốt thiết bị
      CREATE TABLE IF NOT EXISTS chat_messages (
        id              BIGSERIAL       PRIMARY KEY,
        user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role            VARCHAR(20)     NOT NULL,
        message         TEXT            NOT NULL,
        cards           JSONB           DEFAULT '[]'::jsonb,
        chips           JSONB           DEFAULT '[]'::jsonb,
        created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON chat_messages (user_id, created_at ASC);
    `);
    console.log("[Database] Core tables verified successfully.");
  } catch (error) {
    console.error("[Database] Error initializing tables:", error);
  }
};
