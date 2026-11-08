@echo off
echo ============================================================
echo   EZ-Space Smart Parking - Local Dev Runner (Hot-Reload)
echo ============================================================
echo.
echo Dang khoi dong Backend va Frontend tren 2 terminal rieng biet...
echo.

start "EZ-Space Backend (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak > nul
start "EZ-Space Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo ============================================================
echo.
pause

