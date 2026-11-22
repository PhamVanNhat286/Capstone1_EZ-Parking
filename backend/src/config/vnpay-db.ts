import { query } from "./db";

export const initVnpayTables = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS vnpay_payment_attempts (
        txn_ref VARCHAR(100) PRIMARY KEY,
        booking_id VARCHAR(64) NOT NULL,
        amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
        status VARCHAR(16) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'success', 'failed', 'late')),
        transaction_no VARCHAR(100),
        bank_code VARCHAR(30),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_vnpay_payment_booking ON vnpay_payment_attempts (booking_id);
    `);
    await query(`
      ALTER TABLE vnpay_payment_attempts DROP CONSTRAINT IF EXISTS vnpay_payment_attempts_status_check;
      ALTER TABLE vnpay_payment_attempts ADD CONSTRAINT vnpay_payment_attempts_status_check
        CHECK (status IN ('pending', 'success', 'failed', 'late'));
    `);
    console.log("[VNPay] Payment table initialized successfully.");
  } catch (error) {
    console.error("[VNPay] Error initializing payment table:", error);
  }
};
