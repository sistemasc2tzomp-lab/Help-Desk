@echo off
TITLE Help Desk Tzompantepec - Full Stack Starter
COLOR 0B

echo =======================================================
echo     HELPDESK TZOMPANTEPEC - SISTEMA DE CONTROL
echo =======================================================
echo.

:: 1. Iniciar PocketBase en segundo plano
echo [1/2] Iniciando Nucleo de Datos (PocketBase)...
start "PocketBase Backend" /D "C:\Users\ROMERO\Desktop\pocketbase_0.36.8_windows_amd64" pocketbase.exe serve --http="127.0.0.1:8090"

:: Esperar un momento para asegurar que el backend suba
timeout /t 3 /nobreak > nul

:: 2. Iniciar el servidor de desarrollo de Vite
echo [2/2] Iniciando Interfaz de Usuario (Vite)...
cd /d "c:\Users\ROMERO\Desktop\HelpDeskTzomp"
start "Vite Frontend" npm run dev

echo.
echo -------------------------------------------------------
echo [!] TODO LISTO:
echo     - Backend: http://127.0.0.1:8090/_/
echo     - Frontend: http://localhost:5173
echo -------------------------------------------------------
echo.
echo Presiona cualquier tecla para cerrar este lanzador...
pause > nul
