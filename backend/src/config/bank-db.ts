import { query } from "./db";

export const initBankTables = async () => {
  await query("ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'bank'");
  await query(`
    CREATE TABLE IF NOT EXISTS bank_payment_attempts (
      attempt_id VARCHAR(24) PRIMARY KEY,
      booking_id VARCHAR(64) NOT NULL,
      transfer_code VARCHAR(20) NOT NULL UNIQUE,
      account_number VARCHAR(32) NOT NULL,
      bank_bin VARCHAR(6),
      bank_name VARCHAR(255),
      account_name VARCHAR(255),
      amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
      status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'success', 'late')),
      sepay_transaction_id VARCHAR(64) UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
      confirmed_at TIMESTAMPTZ
    );
    ALTER TABLE bank_payment_attempts ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(6);
    ALTER TABLE bank_payment_attempts ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
    ALTER TABLE bank_payment_attempts ADD COLUMN IF NOT EXISTS account_name VARCHAR(255);
    ALTER TABLE bank_payment_attempts ALTER COLUMN sepay_transaction_id TYPE VARCHAR(64) USING sepay_transaction_id::VARCHAR(64);
    CREATE INDEX IF NOT EXISTS idx_bank_payment_booking ON bank_payment_attempts (booking_id);
  `);
};
