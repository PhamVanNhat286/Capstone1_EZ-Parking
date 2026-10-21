import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "ez_space",
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
    `);
    console.log("[Database] Table 'email_otps' initialized successfully.");
  } catch (error) {
    console.error("[Database] Error initializing tables:", error);
  }
};
