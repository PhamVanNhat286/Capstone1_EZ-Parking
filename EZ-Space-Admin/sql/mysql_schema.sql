-- EZ-Space Admin: MySQL 8 / MariaDB 10.4+ (XAMPP)
-- Chuyen tu schema PostgreSQL do anh cung cap; khong chay schema.sql goc tren XAMPP.
-- Khong xoa bang du lieu da co. Chi mysql_seed.sql (tuy chon) moi reset demo data.
CREATE DATABASE IF NOT EXISTS ez_space CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ez_space;
SET time_zone = '+07:00';
-- An toan cho database da ton tai: khong DROP/DELETE du lieu o buoc tao bang.


CREATE TABLE IF NOT EXISTS `users` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(100) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, phone VARCHAR(20) UNIQUE, password_hash VARCHAR(255) NOT NULL, role ENUM('customer','manager','admin') NOT NULL DEFAULT 'customer', status ENUM('active','inactive','banned') NOT NULL DEFAULT 'active', avatar_url TEXT, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vehicles` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, license_plate VARCHAR(20) NOT NULL UNIQUE, vehicle_name VARCHAR(100), vehicle_type ENUM('Sedan','SUV','EV') NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `parking_lots` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, address VARCHAR(255) NOT NULL, latitude DECIMAL(10,7), longitude DECIMAL(10,7), description TEXT, open_time TIME, close_time TIME, capacity INT NOT NULL DEFAULT 0, status ENUM('pending','active','inactive','rejected') NOT NULL DEFAULT 'pending', approved_by BIGINT UNSIGNED NULL, approved_at DATETIME, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `parking_lot_vehicle_types` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parking_lot_id BIGINT UNSIGNED NOT NULL, vehicle_type ENUM('Sedan','SUV','EV') NOT NULL,
    UNIQUE KEY uq_lot_vehicle_type (parking_lot_id,vehicle_type),
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `parking_lot_managers` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parking_lot_id BIGINT UNSIGNED NOT NULL, manager_id BIGINT UNSIGNED NOT NULL, assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lot_manager (parking_lot_id,manager_id),
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slots` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parking_lot_id BIGINT UNSIGNED NOT NULL, code VARCHAR(10) NOT NULL, row_index INT NOT NULL, col_index INT NOT NULL, slot_type ENUM('standard','ev_charging','large','disabled') NOT NULL DEFAULT 'standard', status ENUM('available','holding','occupied','unavailable') NOT NULL DEFAULT 'available', is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_slot_code (parking_lot_id, code),
    UNIQUE KEY uq_slot_grid (parking_lot_id,row_index,col_index),
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pricing_rules` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, parking_lot_id BIGINT UNSIGNED NOT NULL, name VARCHAR(100), start_time TIME, end_time TIME, hourly_rate DECIMAL(12,2) NOT NULL, surcharge DECIMAL(12,2) NOT NULL DEFAULT 0, effective_from DATE, effective_to DATE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reservations` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, parking_lot_id BIGINT UNSIGNED NOT NULL, slot_id BIGINT UNSIGNED NOT NULL, vehicle_id BIGINT UNSIGNED NOT NULL, start_time DATETIME NOT NULL, expected_end_time DATETIME NOT NULL, status ENUM('holding','paid','entered','completed','cancelled','forfeited','refunded') NOT NULL DEFAULT 'holding', hold_expires_at DATETIME NOT NULL, arrival_expires_at DATETIME, hourly_rate DECIMAL(12,2) NOT NULL, deposit_amount DECIMAL(12,2) NOT NULL, total_amount DECIMAL(12,2), cancelled_at DATETIME, cancel_reason VARCHAR(255), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_res_slot_status (slot_id,status),
    KEY idx_res_user (user_id),
    KEY idx_res_lot (parking_lot_id),
    KEY idx_res_hold (hold_expires_at,status),
    KEY idx_res_arrival (arrival_expires_at,status),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id),
    FOREIGN KEY (slot_id) REFERENCES slots(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_id BIGINT UNSIGNED NOT NULL, provider ENUM('vnpay','momo','card') NOT NULL, transaction_ref VARCHAR(255), payment_type ENUM('deposit','final','refund') NOT NULL, amount DECIMAL(12,2) NOT NULL, status ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending', response_code VARCHAR(20), raw_ipn_payload JSON, ipn_received_at DATETIME, paid_at DATETIME, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_payment_reservation (reservation_id),
    KEY idx_payment_status (status),
    KEY idx_payment_paid (paid_at),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `qr_tickets` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_id BIGINT UNSIGNED NOT NULL UNIQUE, token_hash VARCHAR(255) NOT NULL UNIQUE, status ENUM('active','used','expired','cancelled') NOT NULL DEFAULT 'active', issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, used_at DATETIME, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `parking_sessions` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reservation_id BIGINT UNSIGNED NOT NULL UNIQUE, check_in_at DATETIME, check_out_at DATETIME, checked_in_by BIGINT UNSIGNED, checked_out_by BIGINT UNSIGNED, final_amount DECIMAL(12,2), status ENUM('active','completed','abandoned') NOT NULL DEFAULT 'active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id),
    FOREIGN KEY (checked_in_by) REFERENCES users(id),
    FOREIGN KEY (checked_out_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED, parking_lot_id BIGINT UNSIGNED, action VARCHAR(100) NOT NULL, entity_type VARCHAR(100), entity_id BIGINT UNSIGNED, old_value JSON, new_value JSON, note VARCHAR(255), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_audit_user (user_id),
    KEY idx_audit_entity (entity_type,entity_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `manager_history` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, manager_id BIGINT UNSIGNED NOT NULL, parking_lot_id BIGINT UNSIGNED NOT NULL, action_type ENUM('lot_created','lot_updated','slot_updated','pricing_updated','reservation_cancelled','report_viewed') NOT NULL, old_value JSON, new_value JSON, note VARCHAR(255), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_history_lot (parking_lot_id),
    FOREIGN KEY (manager_id) REFERENCES users(id),
    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_otps` (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL, otp_code VARCHAR(6) NOT NULL, purpose VARCHAR(50) NOT NULL, attempts INT NOT NULL DEFAULT 0, is_used BOOLEAN NOT NULL DEFAULT FALSE, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_otp_email_purpose (email,purpose),
    KEY idx_otp_expires (expires_at,is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_settings` (
    setting_key VARCHAR(60) PRIMARY KEY, setting_value VARCHAR(200) NOT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO app_settings (setting_key,setting_value) VALUES
('hold_minutes','10'),('no_show_minutes','20'),('commission_percent','10'),('maintenance','0');
