@echo off
setlocal
cd /d "%~dp0"
title EZ-Space Admin Portal
where node >nul 2>&1
if errorlevel 1 (
  echo LOI: Chua cai Node.js. Cai Node.js LTS roi chay lai.
  pause
  exit /b 1
)
if not exist node_modules\pg\package.json (
  echo Dang cai thu vien Admin...
  call npm install
  if errorlevel 1 (
    echo LOI: Khong cai duoc thu vien. Kiem tra mang Internet.
    pause
    exit /b 1
  )
)
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000/"
call npm run dev
pause
