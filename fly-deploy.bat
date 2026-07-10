@echo off
title Supremas - Deploy a Fly.io
cd /d "%~dp0"

:MENU
cls
echo ===============================================
echo       SUPREMAS - Deploy a Fly.io
echo ===============================================
echo.
echo   [1]  Verificar requisitos
echo   [2]  Copiar archivos de deploy a la raiz
echo   [3]  Crear app en Fly.io (fly launch)
echo   [4]  Crear volumen persistente
echo   [5]  Hacer deploy
echo   [6]  Abrir la app en el navegador
echo   [7]  Ver logs
echo   [8]  Habilitar acceso publico (fly ips)
echo   [9]  Salir
echo.
set /p opt="Seleccion [1-9]: "
if "%opt%"=="" goto :MENU

if "%opt%"=="1" goto :CHECK
if "%opt%"=="2" goto :COPY
if "%opt%"=="3" goto :LAUNCH
if "%opt%"=="4" goto :VOLUME
if "%opt%"=="5" goto :DEPLOY
if "%opt%"=="6" goto :OPEN
if "%opt%"=="7" goto :LOGS
if "%opt%"=="8" goto :IPS
if "%opt%"=="9" exit /b

goto :MENU

:CHECK
cls
echo [1/9] Verificando requisitos...
echo.

where fly >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: flyctl no esta instalado.
    echo.
    echo Instalalo desde: https://fly.io/docs/flyctl/install/
    echo O ejecuta en PowerShell:
    echo   powershell -Command "iwr https://fly.io/install.ps1 -useb ^| iex"
    echo.
    pause
    goto :MENU
)
echo [OK] flyctl instalado

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] git no encontrado (no es obligatorio)
) else (
    echo [OK] git instalado
)

if exist "fly-deploy\Dockerfile" (
    echo [OK] Archivos de deploy encontrados en fly-deploy\
) else (
    echo ERROR: No se encuentra la carpeta fly-deploy\
)
echo.
pause
goto :MENU

:COPY
cls
echo [2/9] Copiando archivos de deploy a la raiz...
echo.
if exist "fly-deploy\Dockerfile" (
    copy /Y "fly-deploy\Dockerfile" "Dockerfile" >nul
    echo [OK] Dockerfile copiado
) else (
    echo ERROR: No existe fly-deploy\Dockerfile
)
if exist "fly-deploy\fly.toml" (
    copy /Y "fly-deploy\fly.toml" "fly.toml" >nul
    echo [OK] fly.toml copiado
) else (
    echo ERROR: No existe fly-deploy\fly.toml
)
if exist "fly-deploy\.dockerignore" (
    copy /Y "fly-deploy\.dockerignore" ".dockerignore" >nul
    echo [OK] .dockerignore copiado
)
echo.
echo Archivos listos en la raiz del proyecto.
echo.
pause
goto :MENU

:LAUNCH
cls
echo [3/9] Creando app en Fly.io...
echo.
echo NOTA: Esto pregunta el nombre de la app y la region.
echo Si ya creaste la app antes, salteate este paso.
echo.
echo Elegi "supremas" como nombre si esta disponible.
echo Region recomendada: gru (Buenos Aires) o iad (USA)
echo.
pause
fly launch --no-deploy
echo.
echo Si el comando fallo porque la app ya existe, continua con el paso 5.
echo.
pause
goto :MENU

:VOLUME
cls
echo [4/9] Creando volumen persistente...
echo.
echo Se creara un volumen de 1GB llamado "supremas_data".
echo Esto es GRATIS en Fly.io.
echo.
set /p region="Region [gru, iad, fra, ams]: "
if "%region%"=="" set region=gru
echo.
fly volumes create supremas_data --region %region% --size 1
echo.
echo Volumen creado. Los datos persistiran aunque la VM se reinicie.
echo.
pause
goto :MENU

:DEPLOY
cls
echo [5/9] Haciendo deploy a Fly.io...
echo.
echo Esto tarda 2-5 minutos en la primera vez.
echo La app se desplegara y quedara disponible en una URL.
echo.
pause
fly deploy
echo.
if %errorlevel% equ 0 (
    echo [OK] Deploy exitoso!
) else (
    echo [ERROR] El deploy fallo. Revisa los logs con opcion 7.
)
echo.
pause
goto :MENU

:OPEN
cls
echo [6/9] Abriendo la app en el navegador...
echo.
fly open
echo.
pause
goto :MENU

:LOGS
cls
echo [7/9] Mostrando logs de la app...
echo.
echo Presiona Ctrl+C para salir de los logs
echo.
pause
fly logs
echo.
pause
goto :MENU

:IPS
cls
echo [8/9] Verificando IPs publicas...
echo.
fly ips list
echo.
echo Para asignar IP dedicada (solo si la necesitas):
echo   fly ips allocate-v4
echo   fly ips allocate-v6
echo.
echo NOTA: El free tier incluye URL compartida *.fly.dev,
echo no necesitas IP dedicada para probar.
echo.
pause
goto :MENU
