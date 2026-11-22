@echo off
set BUILDX_BAKE_ENTITLEMENTS_FS=0
echo ============================================================
echo   EZ-Space Smart Parking - Docker Manager
echo ============================================================

:menu
echo.
echo [1] Start all services (docker compose up)
echo [2] Start in background (docker compose up -d)
echo [3] Stop all services
echo [4] Rebuild and start
echo [5] View logs (all services)
echo [6] View backend logs
echo [7] View frontend logs
echo [8] View database logs
echo [9] Reset database (WARNING: deletes all data!)
echo [0] Exit
echo.

set /p choice="Chon: "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto start_bg
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto rebuild
if "%choice%"=="5" goto logs_all
if "%choice%"=="6" goto logs_backend
if "%choice%"=="7" goto logs_frontend
if "%choice%"=="8" goto logs_db
if "%choice%"=="9" goto reset_db
if "%choice%"=="0" goto end

:start
docker-compose up
goto menu

:start_bg
docker-compose up -d
echo.
echo Services dang chay background:
echo   - Frontend:  http://localhost:3000
echo   - Backend:   http://localhost:5000
echo   - Database:  localhost:5432
docker-compose ps
goto menu

:stop
docker-compose down
goto menu

:rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
goto menu

:logs_all
docker-compose logs -f
goto menu

:logs_backend
docker-compose logs -f backend
goto menu

:logs_frontend
docker-compose logs -f frontend
goto menu

:logs_db
docker-compose logs -f postgres
goto menu

:reset_db
set /p confirm="Ban chac chan muon xoa toan bo database? (yes/no): "
if "%confirm%"=="yes" (
    docker-compose down -v
    echo Database da duoc xoa!
    echo Chay lai voi: docker-compose up -d
) else (
    echo Da huy!
)
goto menu

:end
exit
