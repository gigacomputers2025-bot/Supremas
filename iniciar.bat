@echo off
title Supremas - Gestión
cd /d "%~dp0"

echo ========================================
echo   Supremas - Panel de Gestion
echo ========================================
echo.
echo Selecciona el modo:
echo   1 - Desarrollo (hot reload + HMR)
echo   2 - Produccion (build + servidor unico)
echo.
set /p mode="Modo [1/2]: "
if "%mode%"=="" set mode=1

if "%mode%"=="2" goto :prod
if "%mode%"=="1" goto :dev

:dev
echo.
echo [1/3] Iniciando backend (watch mode - auto-reload)...
cd /d "%~dp0backend"
start "Supremas Backend" cmd /k "title Backend :3001 && echo Backend http://localhost:3001 && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/3] Iniciando frontend (HMR - hot reload)...
cd /d "%~dp0frontend"
start "Supremas Frontend" cmd /k "title Frontend :5173 && echo Frontend http://localhost:5173 && npm run dev"

echo [3/3] Listo!
echo.
echo ========================================
echo   Frontend (HMR): http://localhost:5173
echo   Backend (API):  http://localhost:3001
echo   Edita los .jsx y .js -- se recargan solos
echo ========================================
timeout /t 2 /nobreak >nul
start http://localhost:5173
echo.
echo  Cierra las ventanas para detener.
pause
exit /b 0

:prod
echo [1/2] Compilando frontend...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Fallo la compilacion
    pause
    exit /b 1
)
echo Frontend compilado.
echo.
echo [2/2] Iniciando servidor unico...
cd /d "%~dp0backend"
start "Supremas" cmd /k "title Supremas :3001 && echo http://localhost:3001 && npm run dev"
timeout /t 2 /nobreak >nul
start http://localhost:3001
echo.
echo  Cierra la ventana para detener.
pause
