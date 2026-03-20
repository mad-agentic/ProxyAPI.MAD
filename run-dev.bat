@echo off
chcp 65001 > nul
title ProxyAPI.MAD - Dev

set ROOT=%~dp0
set BACKEND=%ROOT%proxyapi_core
set FRONTEND=%ROOT%frontend

echo.
echo  ╔══════════════════════════════════════╗
echo  ║       ProxyAPI.MAD - Dev Runner      ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check Go is installed
where go >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Go is not installed. Please install Go first.
    pause
    exit /b 1
)

:: Check Node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

:: Install frontend dependencies if node_modules does not exist
if not exist "%FRONTEND%\node_modules" (
    echo [1/3] Installing frontend dependencies...
    pushd "%FRONTEND%"
    call npm install
    popd
    echo.
)

echo [1/2] Starting Go backend (reads port from config.yaml, default http://localhost:8317) ...
start "ProxyAPI Backend" cmd /k "cd /d "%BACKEND%" && go run ./cmd/server"

:: Wait for backend to start
timeout /t 2 /nobreak > nul

echo [2/2] Starting frontend dev server at http://localhost:5173 ...
start "ProxyAPI Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo  ✓ Backend  → http://localhost:8317
echo  ✓ Frontend → http://localhost:5173
echo.
echo  Press any key to open browser...
pause > nul

start "" "http://localhost:8317"
