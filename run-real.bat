@echo off
chcp 65001 > nul
title ProxyAPI.MAD - Real Run (Backend Only)

set ROOT=%~dp0
set BACKEND=%ROOT%proxyapi_core

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   ProxyAPI.MAD - Real Run (Backend Only)    ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Check Go is installed
where go >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Go is not installed. Please install Go first.
    pause
    exit /b 1
)

echo [1/1] Starting Go backend (reads port from config.yaml, default http://localhost:8317) ...
start "ProxyAPI Backend" cmd /k "cd /d "%BACKEND%" && go run ./cmd/server"

:: Wait for backend to start
timeout /t 2 /nobreak > nul

echo.
echo  ✓ Backend  → http://localhost:8317
echo.
echo  Press any key to open browser...
pause > nul

start "" "http://localhost:8317"
