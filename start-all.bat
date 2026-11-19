@echo off
echo ============================================================
echo   EZ-Space Smart Parking - Khoi dong tat ca cac ung dung
echo ============================================================
echo.
echo Dang khoi dong:
echo   1. Backend API (Port 5000)
echo   2. Frontend Khach hang (Port 3000)
echo   3. Partner Frontend Chu bai (Port 3001)
echo.

start "EZ-Space Backend (5000)" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak > nul
start "EZ-Space Frontend (3000)" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak > nul
start "EZ-Space Partner Frontend (3001)" cmd /k "cd /d %~dp0partner-frontend && npm run dev"

echo.
echo ============================================================
echo   Backend API:       http://localhost:5000
echo   Frontend (Khach):  http://localhost:3000
echo   Partner (Chu bai): http://localhost:3001
echo ============================================================
echo.
pause
