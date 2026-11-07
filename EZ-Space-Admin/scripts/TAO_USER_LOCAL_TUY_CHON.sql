-- CHI CHAY QUA PHPMYADMIN (mysql root), TRUOC DO THAY MAT_KHAU_MANH_CUA_ANH.
-- Tai khoan rieng cho app tren CUNG MAY, khong dung chung tren mang.
CREATE USER IF NOT EXISTS 'ez_local'@'127.0.0.1' IDENTIFIED BY 'MAT_KHAU_MANH_CUA_ANH';
GRANT SELECT, INSERT, UPDATE ON `ez_space`.* TO 'ez_local'@'127.0.0.1';
-- Sau do thay EZ_DB_USER=ez_local va EZ_DB_PASS=... trong .env.local
