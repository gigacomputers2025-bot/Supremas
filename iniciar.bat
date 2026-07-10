@echo off
title Supremas - Panel de Gestion
cd /d "%~dp0"

:MENU
cls
echo ===============================================
echo     SUPREMAS - Panel de Gestion Comercial
echo ===============================================
echo.
echo   [1]  Modo Desarrollo (frontend + backend)
echo   [2]  Modo Produccion (servidor unico :3001)
echo   [3]  Sembrar datos de prueba
echo   [4]  Deploy a Fly.io (nube)
echo   [5]  Salir
echo.
set /p mode="Seleccion [1-5]: "
if "%mode%"=="" set mode=1

if "%mode%"=="2" goto :PROD
if "%mode%"=="3" goto :SEED
if "%mode%"=="4" goto :FLYDEPLOY
if "%mode%"=="5" exit /b 0
goto :DEV

:DEV
cls
echo ===============================================
echo   MODO DESARROLLO
echo ===============================================
echo.

echo [1/4] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado. Descargalo de https://nodejs.org
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   Node %%v

echo [2/4] Instalando dependencias...
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo   Instalando backend...
    call npm install --silent
)
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo   Instalando frontend...
    call npm install --silent
)

echo [3/4] Iniciando backend (puerto 3001)...
cd /d "%~dp0backend"
start "Supremas Backend" cmd /k "title Backend :3001 && echo Backend corriendo en http://localhost:3001 && npm run dev"

timeout /t 3 /nobreak >nul

echo [4/4] Iniciando frontend (puerto 5173)...
cd /d "%~dp0frontend"
start "Supremas Frontend" cmd /k "title Frontend :5173 && echo Frontend corriendo en http://localhost:5173 && npm run dev"

timeout /t 2 /nobreak >nul
cls
echo ===============================================
echo   SUPREMAS - MODO DESARROLLO ACTIVO
echo ===============================================
echo.
echo   Frontend (HMR): http://localhost:5173
echo   Backend (API):  http://localhost:3001
echo.
echo   Los cambios en .jsx/.js se recargan solos
echo.
echo   Cierra las ventanas CMD para detener.
echo ===============================================
start http://localhost:5173
pause
exit /b 0

:PROD
cls
echo ===============================================
echo   MODO PRODUCCION
echo ===============================================
echo.

echo [1/4] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   Node %%v

echo [2/4] Instalando dependencias...
cd /d "%~dp0backend"
if not exist "node_modules" call npm install --silent
cd /d "%~dp0frontend"
if not exist "node_modules" call npm install --silent

echo [3/4] Compilando frontend...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Fallo la compilacion del frontend
    pause
    exit /b 1
)
echo   Frontend compilado correctamente.

echo [4/4] Iniciando servidor...
cd /d "%~dp0backend"
start "Supremas Server" cmd /k "title Supremas :3001 && echo. && echo =============================================== && echo   SUPREMAS CORRIENDO && echo =============================================== && echo. && echo   Abrir: http://localhost:3001 && echo. && echo   Backups automaticos cada 30 min. && echo =============================================== && npm run dev"

timeout /t 3 /nobreak >nul
cls
echo ===============================================
echo   SUPREMAS - MODO PRODUCCION ACTIVO
echo ===============================================
echo.
echo   Servidor: http://localhost:3001
echo.
echo   [SEGURIDAD]
echo   - Backup automatico al iniciar
echo   - Backup antes de cada modificacion critica
echo   - Backups programados cada 30 min
echo   - Auditoria de cambios habilitada
echo.
echo   Cierra la ventana CMD para detener.
echo ===============================================
start http://localhost:3001
pause
exit /b 0

:SEED
cls
echo ===============================================
echo   SEMBRAR DATOS DE PRUEBA
echo ===============================================
echo.
echo   Esto eliminara TODOS los datos existentes
echo   y los reemplazara con datos de prueba.
echo.
echo   [SEGURIDAD] Se creara un backup automatico
echo   antes de modificar cualquier dato.
echo.
set /p confirm="Confirmar? (s/n): "
if /i not "%confirm%"=="s" goto :MENU

echo.
echo [1/3] Iniciando servidor temporal...
cd /d "%~dp0backend"
if not exist "node_modules" call npm install --silent

start "Supremas Temp" cmd /k "title Supremas Seed && npm run dev"
timeout /t 5 /nobreak >nul

echo [2/3] Sembrando datos...
cd /d "%~dp0"
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3001/api/seed' -Method Post -TimeoutSec 30; Write-Host 'OK:' $r.message; Write-Host ('Productos: '+$r.stats.products+', Clientes: '+$r.stats.customers+', Pedidos: '+$r.stats.orders) } catch { Write-Host 'ERROR: ' $_ }"

echo [3/3] Deteniendo servidor...
taskkill /f /im node.exe >nul 2>&1

timeout /t 2 /nobreak >nul
cls
echo ===============================================
echo   DATOS DE PRUEBA CARGADOS EXITOSAMENTE
echo ===============================================
echo.
echo   43 productos en 8 categorias
echo   5 medios de pago / 5 canales de venta
echo   14 zonas de reparto / 30 clientes
echo   50 pedidos de prueba
echo.
echo   Selecciona modo Produccion (opcion 2)
echo   para iniciar con los datos nuevos.
echo.
pause
goto :MENU

:FLYDEPLOY
cls
echo ===============================================
echo   DEPLOY A FLY.IO
echo ===============================================
echo.
if not exist "fly-deploy.bat" (
    echo ERROR: No se encuentra fly-deploy.bat
    pause
    goto :MENU
)
echo   Se abrira el menu de deploy a Fly.io.
echo.
echo   Asegurate de tener:
echo   - Cuenta en fly.io
echo   - flyctl instalado (https://fly.io/docs/flyctl/install/)
echo   - Git instalado
echo.
pause
call fly-deploy.bat
echo.
pause
goto :MENU
